import * as fs from "fs";
import * as Handlebars from "handlebars";
import { createTemplateCache, ITemplateCache } from "../../src/util/templateCache";
import { logger } from "../../src/util/logger";

type MockedFunction<T extends (...args: any[]) => any> = jest.Mock<ReturnType<T>, Parameters<T>>;

// Mock loggers
jest.mock("../../src/util/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

// Mock handlebars
jest.mock("handlebars", () => ({
  compile: jest.fn()
}));

// Mock fs
jest.mock("fs", () => ({
  promises: {
    readFile: jest.fn()
  }
}));

// Get typed mocks
const mockedReadFile = fs.promises.readFile as MockedFunction<typeof fs.promises.readFile>;
const mockedCompile = Handlebars.compile as MockedFunction<typeof Handlebars.compile>;

describe("templateCache", () => {
  const mockTemplateId = "test-template";
  const mockTextContent = "This is a text template for {{ name }}";
  const mockHtmlContent = "<div>This is an HTML template for {{ name }}</div>";
  const mockCompiledTextTemplate = jest.fn((data) => `Text for ${data.name}`);
  const mockCompiledHtmlTemplate = jest.fn((data) => `<div>HTML for ${data.name}</div>`);
  
  let templateCache: ITemplateCache;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup read file mock
    mockedReadFile.mockImplementation((path: any) => {
      if (typeof path === 'string') {
        if (path.includes(".txt")) {
          return Promise.resolve(mockTextContent);
        }
        if (path.includes(".html")) {
          return Promise.resolve(mockHtmlContent);
        }
      }
      return Promise.reject(new Error("File not found"));
    });
    
    mockedCompile.mockImplementation((source: any) => {
      if (source === mockTextContent) {
        return mockCompiledTextTemplate;
      }
      if (source === mockHtmlContent) {
        return mockCompiledHtmlTemplate;
      }
      return jest.fn();
    });
    
    // Create a fresh template cache for each test
    templateCache = createTemplateCache();
  });

  describe("getTemplates", () => {
    it("should compile and cache templates on first request", async () => {
      const result = await templateCache.getTemplates(mockTemplateId);

      expect(mockedReadFile).toHaveBeenCalledTimes(2);
      expect(mockedReadFile).toHaveBeenCalledWith(
        `./dist/src/templates/${mockTemplateId}/${mockTemplateId}.template.txt`,
        "utf-8"
      );
      expect(mockedReadFile).toHaveBeenCalledWith(
        `./dist/src/templates/${mockTemplateId}/${mockTemplateId}.template.html`,
        "utf-8"
      );
      
      expect(mockedCompile).toHaveBeenCalledTimes(2);
      expect(mockedCompile).toHaveBeenCalledWith(mockTextContent);
      expect(mockedCompile).toHaveBeenCalledWith(mockHtmlContent);
      
      expect(result).toEqual({
        textTemplate: mockCompiledTextTemplate,
        htmlTemplate: mockCompiledHtmlTemplate
      });
    });

    it("should return cached templates on subsequent requests", async () => {
      // First call to cache the templates
      await templateCache.getTemplates(mockTemplateId);
      
      // Reset mocks to verify they're not called again
      jest.clearAllMocks();
      
      // Execute second call
      const result = await templateCache.getTemplates(mockTemplateId);
      
      // Verify
      expect(mockedReadFile).not.toHaveBeenCalled();
      expect(mockedCompile).not.toHaveBeenCalled();
      
      expect(result).toEqual({
        textTemplate: mockCompiledTextTemplate,
        htmlTemplate: mockCompiledHtmlTemplate
      });
    });

    it("should handle file read errors properly", async () => {
      // Setup mock to throw an error
      mockedReadFile.mockRejectedValueOnce(new Error("File read error"));
      
      await expect(templateCache.getTemplates(mockTemplateId)).rejects.toThrow("File read error");
      
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Error reading or compiling templates"));
    });

    it("should handle template compilation errors", async () => {
      // Setup mock to throw an error during compilation
      mockedCompile.mockImplementationOnce(() => {
        throw new Error("Compilation error");
      });
      
      await expect(templateCache.getTemplates(mockTemplateId)).rejects.toThrow("Compilation error");

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Error reading or compiling templates"));
    });
  });

  describe("clearCache", () => {
    it("should clear all cached templates", async () => {
      // First cache some templates
      await templateCache.getTemplates(mockTemplateId);
      
      // Mock a second template
      const anotherTemplateId = "another-template";
      mockedReadFile.mockImplementation((path: any) => {
        if (typeof path === 'string') {
          if (path.includes(anotherTemplateId) && path.includes(".txt")) {
            return Promise.resolve("Another text template");
          }
          if (path.includes(anotherTemplateId) && path.includes(".html")) {
            return Promise.resolve("Another HTML template");
          }
          if (path.includes(mockTemplateId) && path.includes(".txt")) {
            return Promise.resolve(mockTextContent);
          }
          if (path.includes(mockTemplateId) && path.includes(".html")) {
            return Promise.resolve(mockHtmlContent);
          }
        }
        return Promise.reject(new Error("File not found"));
      });
      
      await templateCache.getTemplates(anotherTemplateId);
      
      // Verify cache size
      expect(templateCache.getCacheSize()).toBe(2);
      
      // Clear cache
      templateCache.clearCache();
      
      // Verify cache is empty
      expect(templateCache.getCacheSize()).toBe(0);
      expect(logger.info).toHaveBeenCalledWith("Template cache cleared");
      
      // Verify templates are recompiled after clearing
      jest.clearAllMocks();
      await templateCache.getTemplates(mockTemplateId);
      expect(mockedReadFile).toHaveBeenCalledTimes(2);
      expect(mockedCompile).toHaveBeenCalledTimes(2);
    });
  });

  describe("getCacheSize", () => {
    it("should return the correct number of cached templates", async () => {
      // Initially empty
      expect(templateCache.getCacheSize()).toBe(0);
      
      // Cache one template
      await templateCache.getTemplates(mockTemplateId);
      expect(templateCache.getCacheSize()).toBe(1);
      
      // Mock a second template
      const anotherTemplateId = "another-template";
      mockedReadFile.mockImplementation((path: any) => {
        if (typeof path === 'string') {
          if (path.includes(anotherTemplateId) && path.includes(".txt")) {
            return Promise.resolve("Another text template");
          }
          if (path.includes(anotherTemplateId) && path.includes(".html")) {
            return Promise.resolve("Another HTML template");
          }
          if (path.includes(mockTemplateId) && path.includes(".txt")) {
            return Promise.resolve(mockTextContent);
          }
          if (path.includes(mockTemplateId) && path.includes(".html")) {
            return Promise.resolve(mockHtmlContent);
          }
        }
        return Promise.reject(new Error("File not found"));
      });
      
      // Cache another template
      await templateCache.getTemplates(anotherTemplateId);
      expect(templateCache.getCacheSize()).toBe(2);
      
      // Clear and verify
      templateCache.clearCache();
      expect(templateCache.getCacheSize()).toBe(0);
    });
  });

  describe("template rendering", () => {
    it("should correctly render templates with provided data", async () => {
      // Get the templates
      const templates = await templateCache.getTemplates(mockTemplateId);
      
      // Test data
      const testData = { name: "Test PagoPA" };
      
      // Render templates
      const textResult = templates.textTemplate(testData);
      const htmlResult = templates.htmlTemplate(testData);
      
      // Verify rendering
      expect(mockCompiledTextTemplate).toHaveBeenCalledWith(testData);
      expect(mockCompiledHtmlTemplate).toHaveBeenCalledWith(testData);
      expect(textResult).toBe("Text for Test PagoPA");
      expect(htmlResult).toBe("<div>HTML for Test PagoPA</div>");
    });
  });
});