import * as fs from "fs";
import * as Handlebars from "handlebars";
import { logger } from "./logger";

export interface ITemplateCache {
  readonly getTemplates: (
    templateId: string
  ) => Promise<{
    readonly textTemplate: Handlebars.TemplateDelegate;
    readonly htmlTemplate: Handlebars.TemplateDelegate;
  }>;
  readonly clearCache: () => void;
  readonly getCacheSize: () => number;
}

// Template cache factory function
export const createTemplateCache = (): ITemplateCache => {
  // Private cache object inside closure
  const templateCache: Record<
    string,
    {
      readonly textTemplate: Handlebars.TemplateDelegate;
      readonly htmlTemplate: Handlebars.TemplateDelegate;
    }
  > = {};

  return {
    /**
     * Clears the template cache
     */
    clearCache: (): void => {
      // Create a new array of keys to avoid modifying during iteration
      const keys = Object.keys(templateCache);
      // Use forEach with immutable approach
      keys.forEach(key => {
        // eslint-disable-next-line fp/no-delete, functional/immutable-data
        delete templateCache[key];
      });
      logger.info("Template cache cleared");
    },

    /**
     * Gets the current size of the template cache
     */
    getCacheSize: (): number => Object.keys(templateCache).length,

    /**
     * Gets or compiles templates for a given templateId
     *
     * @param templateId The ID of the template to get/compile
     * @returns Promise with compiled text and HTML templates
     */
    getTemplates: async (
      templateId: string
    ): Promise<{
      readonly textTemplate: Handlebars.TemplateDelegate;
      readonly htmlTemplate: Handlebars.TemplateDelegate;
    }> => {
      // Return from cache if available
      if (templateCache[templateId]) {
        logger.info(`Using cached template for ${templateId}`);
        return templateCache[templateId];
      }

      logger.info(`Compiling template for ${templateId}`);

      try {
        // Read templates asynchronously
        const [textTemplateRaw, htmlTemplateRaw] = await Promise.all([
          fs.promises.readFile(
            `./dist/src/templates/${templateId}/${templateId}.template.txt`,
            "utf-8"
          ),
          fs.promises.readFile(
            `./dist/src/templates/${templateId}/${templateId}.template.html`,
            "utf-8"
          )
        ]);

        // Compile templates
        const textTemplate = Handlebars.compile(textTemplateRaw);
        const htmlTemplate = Handlebars.compile(htmlTemplateRaw);

        // Cache the compiled templates - using an immutable approach
        const newTemplate = {
          htmlTemplate,
          textTemplate
        };

        // eslint-disable-next-line functional/immutable-data
        templateCache[templateId] = newTemplate;

        return newTemplate;
      } catch (error) {
        logger.error(`Error reading or compiling templates: ${error}`);
        throw error;
      }
    }
  };
};
