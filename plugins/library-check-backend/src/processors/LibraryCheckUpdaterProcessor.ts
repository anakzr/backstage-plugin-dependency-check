import { Entity } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import {
  ScmIntegrationRegistry,
  ScmIntegrations,
} from '@backstage/integration';
import { CatalogProcessor } from '@backstage/plugin-catalog-node';
import { Logger } from 'winston';
import * as T from '../types';
import { LibraryCheckService } from '../service/LibraryCheckService';
import {DiscoveryService, UrlReaderService} from '@backstage/backend-plugin-api';
import { semverImpact, versionToObj } from '../utils/semver';
import { LibraryUpdateRecord } from '../types';

export class LibraryCheckUpdaterProcessor implements CatalogProcessor {
  private readonly logger: Logger;
  private readonly libraryCheckService: LibraryCheckService;
  private readonly discoveryService: DiscoveryService;

  static fromConfig(
    config: Config,
    options: {
      logger: Logger;
      reader: UrlReaderService;
      discoveryService: DiscoveryService;
    },
  ) {
    const integrations = ScmIntegrations.fromConfig(config);

    return new LibraryCheckUpdaterProcessor({
      ...options,
      integrations,
    });
  }

  constructor(options: {
    integrations: ScmIntegrationRegistry;
    logger: Logger;
    reader: UrlReaderService;
    discoveryService: DiscoveryService;
  }) {
    this.discoveryService = options.discoveryService;
    this.logger = options.logger;
    this.libraryCheckService = new LibraryCheckService();
  }

  getProcessorName(): string {
    return 'LibraryCheckUpdaterProcessor';
  }

  async postProcessEntity(entity: Entity): Promise<Entity> {
    if (this.shouldProcessEntity(entity)) {
      const { libraries } = entity.metadata;
      const baseUrl = await this.discoveryService.getBaseUrl('library-check');

      await this.processLibraries(baseUrl, entity, libraries as T.Descriptors);

      this.logger.info(
        'LibraryCheckUpdaterProcessor: Post processed entity libraries changes',
      );
    }
    return entity;
  }

  private shouldProcessEntity(entity: Entity | null): boolean {
    return (
      !!entity &&
      entity.kind !== 'Group' &&
      entity.kind !== 'User' &&
      !!entity.metadata.libraries &&
      !(entity.metadata.name && entity.metadata.name.startsWith('generated'))
    );
  }

  // This should get the registry latest_version saved on the libraries table
  // (to not fetch directly on official registries) - cause the Provider should do it based on the schedule
  // and calc the impact for each library processed
  // Then create a new log entry on the records_update table.
  private async processLibraries(
    baseUrl: string,
    entity: Entity,
    descriptorFiles: T.Descriptors,
  ) {
    const depsNames: string[] = [];
    const entityLibraries: any = [];
    const { descriptors } = descriptorFiles;

    for (const descriptor of descriptors) {
      for (const resultItem of descriptor.result) {
        if (resultItem.content) {
          for (const key of Object.keys(resultItem.content)) {
            const cleanedDepName = key.replace(/^(core|dev|both):/, '');
            const version = resultItem.content[key];
            const libraryPath = resultItem.url;

            const libraryItem = {
              depName: cleanedDepName,
              depVersion: version,
              depPath: libraryPath,
            };

            entityLibraries.push(libraryItem);
            depsNames.push(cleanedDepName);
          }
        }
      }
    }

    const uniqueEntityDeps = depsNames.filter((value, index, self) => {
      return self.indexOf(value) === index;
    });

    const depsWithRegistryData =
      await this.libraryCheckService.getLibrariesData(
        baseUrl,
        uniqueEntityDeps,
      );

    const librariesToSave: LibraryUpdateRecord[] = entityLibraries.map(
      (lib: any) => {
        const matchedDep = depsWithRegistryData.find(
          library => library.name === lib.depName,
        );

        const next = versionToObj(matchedDep?.latest_version);
        const current = versionToObj(lib.depVersion);
        const impact = semverImpact(next, current);

        return {
          type_of_update: impact ?? 'unknown',
          update_date: new Date().toISOString(),
          current_entity_version:
            lib.depVersion.replace(/[~^>=]|[A-Za-z]/g, '') ?? '',
          entity_id: entity.metadata.name,
          registry_version:
            matchedDep?.latest_version?.replace(/[~^>=]|[A-Za-z]/g, '') ?? '',
          library_name: matchedDep?.name,
          language: matchedDep?.language,
          library_path: lib.depPath,
        };
      },
    );

    try {
      await this.libraryCheckService.saveLibraryUpdateRegistry(
        baseUrl,
        librariesToSave,
      );
    } catch (error) {
      this.logger.error(
        `LibraryCheckUpdaterProcessor: Error trying to update libraries data from registries on database`,
      );
    }
  }
}
