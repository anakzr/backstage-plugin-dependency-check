export interface Library {
  name: string;
  language: TLanguages;
  id?: string;
  description?: string;
  latest_version?: string;
  latest_version_date?: string;
  created_at?: string;
  modified_at?: string;
  homepage_url?: string;
  next_version?: string;
  repository?: string;
  bugs_url?: string;
  engines?: string;
  registry_last_check?: string;
}

export type Libraries = {
  [key: string]: string;
};

export type LibraryMap = {
  [key: string]: Library;
};

export type LibraryCheckSearchResultItem = {
  url: string;
  content?: Libraries;
  error?: any;
};

export type LibraryCheckSearchResult = {
  result: LibraryCheckSearchResultItem[];
  query: string;
};

export type Descriptors = {
  descriptors: LibraryCheckSearchResult[];
};

export type SearchDescriptorFilesParams = {
  sourceUrl: string;
  descriptorsGlobPatterns: string[];
};

export type SearchDescriptorFilesResult = {
  metadata: {
    libraries: Descriptors;
  };
};

export type TLanguages = 'javascript' | 'python' | 'php' | 'csharp' | 'java';

export interface LibraryUpdateRecord {
  id?: string;
  type_of_update?: 'breaking' | 'minor' | 'patch' | 'unknown' | 'up-to-date';
  library_name: string;
  update_date?: string;
  current_entity_version: string;
  entity_id: string;
  language?: string;
  library_path: string;
  registry_version?: string;
}

export type FileHandler = {
  read(fileContent: string): Libraries;
  readAsync?(fileContent: string): Promise<string>;
};

export enum FileType {
  PackageJson = 'packagejson',
  RequirementsTxt = 'requirementstxt',
  ComposerJson = 'composerjson',
  CsProj = 'csproj',
  PomXml = 'pomxml',
  BuildGradle = 'buildgradle',
  PyProjectToml = 'pyprojecttoml',
}

export type Registry = {
  [key: string]: {
    name: string;
    language: string;
    url: string;
  };
};

export type RegistryLanguageMap = {
  [key: string]: string;
};

export type DistributionType = {
  language?: string;
  item: string;
  breaking: number;
  minor: number;
  patch: number;
  unknown: number;
};

export type RecordsCountResponse = {
  total: string | number;
};
