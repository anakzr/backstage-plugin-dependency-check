import { Library, Registry, RegistryLanguageMap } from '../types';

export interface RegistryMapper {
  fetch(library: string, registry: string): Promise<any>;
  map(fileContent: string): Library;
}

export const RegistryConfig: Registry = {
  npm: {
    name: 'npm',
    language: 'javascript',
    url: 'https://registry.npmjs.org',
  },

  packagist: {
    name: 'packagist',
    language: 'php',
    url: 'https://packagist.org',
  },

  pypi: { name: 'pypi', language: 'python', url: 'https://pypi.org' },

  nuget: {
    name: 'nuget',
    language: 'csharp',
    url: 'https://api.nuget.org/v3/registration3',
  },

  maven: {
    name: 'maven',
    language: 'java',
    url: 'https://search.maven.org/solrsearch/select',
  },
};

export const LanguageToRegistryMap: RegistryLanguageMap = {
  javascript: 'npm',
  php: 'packagist',
  python: 'pypi',
  csharp: 'nuget',
  java: 'maven',
};

export const FileToLanguageMap: RegistryLanguageMap = {
  composerjson: 'php',
  packagejson: 'javascript',
  csproj: 'csharp',
  requirementstxt: 'python',
  pomxml: 'java',
  buildgradle: 'java',
  pyprojecttoml: 'python',
};
