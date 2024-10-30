import { FileHandler, Libraries } from '../types';
import { validateSemverNotation } from '../utils/semver';
import * as toml from 'toml';

export class PyProjectTomlHandler implements FileHandler {
  read(fileContent: string): Libraries {
    if (!fileContent.trim()) {
      return {};
    }

    const libraries: Libraries = {};

    try {
      const parsed = toml.parse(fileContent);

      // Process main dependencies under [tool.poetry.dependencies]
      const mainDependencies = parsed.tool?.poetry?.dependencies;
      this.addDependencies(mainDependencies, 'core', libraries);

      // Process old-style dev dependencies under [tool.poetry.dev-dependencies]
      const devDependenciesOldStyle = parsed.tool?.poetry?.['dev-dependencies'];
      this.addDependencies(devDependenciesOldStyle, 'dev', libraries);

      // Process other dependency groups under [tool.poetry.group.<group_name>.dependencies]
      const groups = parsed.tool?.poetry?.group;
      if (groups && typeof groups === 'object') {
        for (const [groupName, groupValue] of Object.entries(groups)) {
          const groupDependencies = groupValue?.dependencies;
          if (groupDependencies) {
            this.addDependencies(groupDependencies, groupName, libraries);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing pyproject.toml content:', error);
    }

    return libraries;
  }

  // Function to process dependency information
  private addDependencies(dependencies: any, type: string, libraries: Libraries) {
    if (dependencies && typeof dependencies === 'object') {
      for (const [packageName, packageVersion] of Object.entries(dependencies)) {
        const formattedPackageName = `${type}:${packageName.replace(/\s/g, '')}`;

        // Skip dependencies without a valid version, including wildcard version
        if (typeof packageVersion === 'string' && packageVersion !== '*') {
          const validatedVersion = validateSemverNotation(packageVersion);
          if (validatedVersion !== undefined) {
            libraries[formattedPackageName] = validatedVersion;
          }
        } else {
          console.warn(`Ignoring package without specific version for "${packageName}":`, packageVersion);
        }
      }
    }
  }
}
