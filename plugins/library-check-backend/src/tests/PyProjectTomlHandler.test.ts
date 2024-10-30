import { PyProjectTomlHandler } from '../handlers/PyProjectTomlHandler';

describe('PyProjectTomlHandler', () => {
  let pyProjectTomlHandler: PyProjectTomlHandler;

  beforeEach(() => {
    pyProjectTomlHandler = new PyProjectTomlHandler();
  });

  describe('read', () => {
    it('should return an empty object if file content is empty', () => {
      const fileContent = '';

      const result = pyProjectTomlHandler.read(fileContent);

      expect(result).toEqual({});
    });

    it('should parse file content and return libraries', () => {
      const fileContent = `
        [tool.poetry.dependencies]
        package1 = "1.0"
        package2 = "2.0"
      `;

      const result = pyProjectTomlHandler.read(fileContent);

      expect(result).toEqual({
        'core:package1': '1.0.0',
        'core:package2': '2.0.0',
      });
    });

    it('should ignore dependencies with wildcard versions', () => {
      const fileContent = `
        [tool.poetry.dependencies]
        package1 = "*"
        package2 = ">=2.0"
      `;

      const result = pyProjectTomlHandler.read(fileContent);

      expect(result).toEqual({
        'core:package2': '2.0.0',
      });
    });

    it('should ignore lines that do not match the package format', () => {
      const fileContent = `
        [tool.poetry.dependencies]
        package1 = "1.0"
        # not_a_package_version_line
        package2 = "2.0"
      `;

      const result = pyProjectTomlHandler.read(fileContent);

      expect(result).toEqual({
        'core:package1': '1.0.0',
        'core:package2': '2.0.0',
      });
    });

    it('should process dependencies under dependency groups', () => {
      const fileContent = `
        [tool.poetry.dependencies]
        package1 = "1.0"
        
        [tool.poetry.group.dev.dependencies]
        package2 = "2.0"
      `;

      const result = pyProjectTomlHandler.read(fileContent);

      expect(result).toEqual({
        'core:package1': '1.0.0',
        'dev:package2': '2.0.0',
      });
    });

    it('should log an error if parsing fails', () => {
      const fileContent = 'invalid-toml-content'; // Invalid TOML content

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = pyProjectTomlHandler.read(fileContent);

      expect(result).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error parsing pyproject.toml content:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });
});
