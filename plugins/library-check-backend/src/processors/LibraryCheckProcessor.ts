import { Entity } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import {
  ScmIntegrationRegistry,
  ScmIntegrations,
} from '@backstage/integration';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import { CatalogProcessor } from '@backstage/plugin-catalog-node';
import { merge } from 'lodash';
import { Logger } from 'winston';
import { DescriptorFileHandler } from '../handlers';
import { Library, TLanguages } from '../types';
import * as T from '../types';
import { LibraryCheckService } from '../service/LibraryCheckService';
import { FileToLanguageMap, RegistryConfig } from '../mappers/RegistryMapper';
import { DiscoveryService, UrlReaderService } from '@backstage/backend-plugin-api';

export class LibraryCheckProcessor implements CatalogProcessor {
  private readonly integrations: ScmIntegrationRegistry;
  private readonly logger: Logger;
  private readonly reader: UrlReaderService;
  private readonly descriptorHandler: DescriptorFileHandler;
  private readonly libraryCheckService: LibraryCheckService;
  private readonly discoveryService: DiscoveryService;

  static fromConfig(
    config: Config,
    options: {
      logger: Logger;
      discoveryService: DiscoveryService;
      reader: UrlReaderService;
    },
  ) {
    const integrations = ScmIntegrations.fromConfig(config);

    return new LibraryCheckProcessor({
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
    this.integrations = options.integrations;
    this.logger = options.logger;
    this.reader = options.reader;
    this.descriptorHandler = new DescriptorFileHandler();
    this.libraryCheckService = new LibraryCheckService();
  }

  getProcessorName(): string {
    return 'LibraryCheckProcessor';
  }

  async preProcessEntity(
    entity: Entity,
    location: LocationSpec,
  ): Promise<Entity> {
    if (!entity || entity.kind === 'Group' || entity.kind === 'User') {
      return entity;
    }

    const scmIntegration = this.integrations.byUrl(location.target);
    if (!scmIntegration) {
      return entity;
    }

    const sourceUrl = scmIntegration?.resolveUrl({
      url: '/',
      base: location.target,
    });

    if (!sourceUrl) {
      return entity;
    }

    // TODO: once all supported descriptors are available, move it to app-config
    const descriptorsGlobPatterns = [
      '**/package.json',
      '**/composer.json',
      '**/*.csproj',
      '**/requirements.txt',
      '**/pom.xml',
      '**/build.gradle',
    ];

    // Search for files and read them
    const result = await this.searchDescriptorFiles({
      sourceUrl,
      descriptorsGlobPatterns,
    });

    return merge(result, entity);
  }

  // Extract metadata attached and save it
  async postProcessEntity(entity: Entity): Promise<Entity> {
    if (this.shouldProcessEntity(entity)) {
      const librariesMap = this.extractLibrariesMap(entity);
      const endpoint = await this.discoveryService.getBaseUrl('library-check');

      const libraries = Object.values(librariesMap);

      try {
        this.libraryCheckService.saveLibraries(
          libraries,
          `${endpoint}/libraries`,
        );

        this.logger.info(
          'LibraryCheckProcessor: Saved entity metadata libraries on database',
        );
      } catch (error) {
        this.logger.error(
          'LibraryCheckProcessor: There was an error trying to persist the entity metadata libraries on database',
        );
      }
    }

    return entity;
  }

  private shouldProcessEntity(entity: Entity | null): boolean {
    return (
      !!entity &&
      entity.kind !== 'Group' &&
      entity.kind !== 'User' &&
      !!entity.metadata.libraries
    );
  }

  private async searchDescriptorFiles(
    params: T.SearchDescriptorFilesParams,
  ): Promise<T.SearchDescriptorFilesResult> {
    const results: T.LibraryCheckSearchResult[] = [];

    await Promise.all(
      params.descriptorsGlobPatterns.map(async searchPattern => {
        const url = `${params.sourceUrl}${searchPattern}`;

        try {
          const { files } = await this.reader.search(url);

          if (files.length !== 0) {

            const processedFiles = await Promise.all(
              //@ts-ignore
              files.map(async file => {
                try {
                  const bufferContent = await file.content();
                  const content = bufferContent.toString();

                  const libraries = this.descriptorHandler.handleDescriptorFile(
                    content,
                    searchPattern,
                  );

                  return { url: file.url, content: libraries };
                } catch (error) {
                  return { url: file.url, error };
                }
              }),
            );

            results.push({ result: processedFiles, query: searchPattern });

            this.logger.info(
              `LibraryCheckProcessor: Descriptor files found at ${url}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `LibraryCheckProcessor: Error searching for query ${url} | ${error}`,
          );
        }
      }),
    );

    return {
      metadata: {
        libraries: {
          descriptors: results,
        },
      },
    };
  }

  private extractLibrariesMap(entity: Entity): Record<string, Library> {
    const librariesMap: Record<string, Library> = {};
    const { libraries } = entity.metadata;
    const descriptors = (libraries as T.Descriptors)?.descriptors || [];

    descriptors.forEach((descriptor: any) => {
      const { result, query } = descriptor || {};

      result?.forEach((res: any) => {
        const { content } = res || {};
        const cleanedQuery = (query || '').replace(/[^a-zA-Z]/g, '');

        const language: TLanguages = FileToLanguageMap[
          cleanedQuery.toLowerCase()
        ] as TLanguages;

        Object.keys(content || {}).forEach(dep => {
          const depUnprefixed = dep.replace(/^(both:|core:|dev:)/, '');

          if (!RegistryConfig[depUnprefixed]) {
            librariesMap[depUnprefixed] = {
              name: depUnprefixed,
              language,
            };
          }
        });
      });
    });

    return librariesMap;
  }
}
