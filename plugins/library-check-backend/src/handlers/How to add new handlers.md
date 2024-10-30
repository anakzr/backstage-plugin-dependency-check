# Adding new handlers

### 1. Create a type for the descriptor file you want at `types/index.ts` - use lowercase and omit the (.)

```typescript
// handlers/index.ts

export enum FileType {
  PackageJson = 'packagejson',
  RequirementsTxt = 'requirementstxt',
  ComposerJson = 'composerjson',
  CsProj = 'csproj',
  // new
  YourFileType = 'yourfiletype'
}
```

### 2. Create a specific handler for the file

Add new handlers for the descriptor file creating a new `YourFileTypeHandler.ts` file and implementing `FileHandle` interface;

Remember to export it at `/handlers/index.ts`;

```typescript
// handlers/YourFileTypeHandler.ts

import { Libraries, FileHandler } from './FileHandler';

export class YourFileTypeHandler implements FileHandler {
  read(fileContent: string): Libraries {
    // the reading logic for your file


    return libraries;
  }
}

```

### 3. Inject the handler on `handlers/DescriptorFileHandler` class

Connect the handler into the reader management logic;

```typescript
// handlers/DescriptorFileHandler.ts

import {
  PackageJsonHandler,
  RequirementsTxtHandler,
  ComposerJsonHandler,
  CsProjHandler,
  // new
  YourFileTypeHandler
} from './index';

export class DescriptorFileHandler {
  private handlers: Record<FileType, FileHandler>;

  constructor() {
    this.handlers = {
      [FileType.PackageJson]: new PackageJsonHandler(),
      [FileType.RequirementsTxt]: new RequirementsTxtHandler(),
      [FileType.ComposerJson]: new ComposerJsonHandler(),
      [FileType.CsProj]: new CsProjHandler(),
      // your new handler here
      [FileType.YourFileType]: new YourFileTypeHandler(),
    };
  }
```

### 4. Connect the reader with the scanner processor

[Optional]: create a new language representing the descriptor file - if the language doesn't exist yet;

```typescript
// types/index.ts
export type TLanguages = 'javascript' | 'python' | 'php' | 'csharp' | 'yournewlanguage';

```

At the processor file `processors/LibraryCheckProcessor.ts`, connect the handler:


```typescript
// processors/LibraryCheckProcessor.ts

 private async updateLibraryCheck(libraries: any, endpoint: string) {
    const librariesMap: T.LibraryMap = {};
    const LanguagesMap: Record<string, TLanguages> = {
      csproj: 'csharp',
      packagejson: 'javascript',
      requirementstxt: 'python',
      composerjson: 'php',
      // your new file and your new language (if not exists)
      yourfiletype: 'yournewlanguage'
    };
 }

```

### 5. Make the file searchable 

Register the glob pattern so the scanner can use the file handler to search for files

```typescript
// processors/LibraryCheckProcessor.ts
    const descriptorsGlobPatterns = [
      '**/package.json',
      '**/composer.json',
      '**/*.csproj',
      '**/requirements.txt',
      // your glob pattern
      '**/yourfiletype.etc'
    ];

```
