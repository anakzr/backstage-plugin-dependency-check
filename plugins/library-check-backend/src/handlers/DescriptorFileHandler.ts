import { PackageJsonHandler } from './PackageJsonHandler';
import { RequirementsTxtHandler } from './RequirementsTxtHandler';
import { ComposerJsonHandler } from './ComposerJsonHandler';
import { CsProjHandler } from './CsProjHandler';
import { FileType, FileHandler, Libraries } from '../types';
import { BuildGradleHandler } from './BuildGradleHandler';
import { PomXmlHandler } from './PomXmlHandler';
import { PyProjectTomlHandler } from './PyProjectTomlHandler';

export class DescriptorFileHandler {
  private handlers: Record<FileType, FileHandler>;

  constructor() {
    this.handlers = {
      [FileType.PackageJson]: new PackageJsonHandler(),
      [FileType.RequirementsTxt]: new RequirementsTxtHandler(),
      [FileType.ComposerJson]: new ComposerJsonHandler(),
      [FileType.CsProj]: new CsProjHandler(),
      [FileType.BuildGradle]: new BuildGradleHandler(),
      [FileType.PomXml]: new PomXmlHandler(),
      [FileType.PyProjectToml]: new PyProjectTomlHandler(),
    };
  }

  private getDescriptorFileType(pattern: string): FileType | undefined {
    const fileTypeKeys = Object.keys(FileType) as (keyof typeof FileType)[];

    const matchedKey = fileTypeKeys.find(key => {
      const normalized = pattern
        .replace(/[^\w\s]|_/g, '')
        .replace(/\s+/g, '')
        .replace(/\./g, '')
        .toUpperCase();
      const regex = new RegExp(`^${FileType[key]}$`, 'i');
      return regex.test(normalized);
    });

    return matchedKey ? FileType[matchedKey] : undefined;
  }

  handleDescriptorFile(fileContent: string, pattern: string): Libraries {
    const descriptorFile = this.getDescriptorFileType(pattern);

    if (descriptorFile === undefined) {
      console.error('Unsupported file type:', pattern);
      return {};
    }

    const handler = this.handlers[descriptorFile];

    if (!handler) {
      console.error(
        'No FileHandler found for the file searched:',
        descriptorFile,
      );
      return {};
    }

    return handler.read(fileContent);
  }
}
