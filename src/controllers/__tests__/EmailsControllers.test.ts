import { sendMail } from "../EmailsControllers";
import { getConfigOrThrow } from "../../util/config";
import { Envelope } from "nodemailer/lib/mime-node";
import { SentMessageInfo } from "nodemailer/lib/ses-transport";
import { Transporter, createTransport } from "nodemailer";
import { SES, SendRawEmailCommand } from "@aws-sdk/client-ses";
import registerHelpers from "handlebars-helpers";
import { mockReq } from "../../__mocks__/data_mock";
import * as fs from "fs";
import { logger } from "../../util/logger";
import * as templateCacheModule from "../../util/templateCache";
  
var config = getConfigOrThrow();

const sentMessage = {
  /** an envelope object {from:'address', to:['address']} */
  envelope: {from: "testFrom", to: ["testTo"]} as Envelope,
  /** the Message-ID header value. This value is derived from the response of SES API, so it differs from the Message-ID values used in logging. */
  messageId: "messageId",
  response: "response",
  accepted: ["acceptedMail"],
  rejected: ["rejectedMail"],
  pending: ["pendingMail"]
} as SentMessageInfo 

const SES_CONFIG = {
  credentials: {
    accessKeyId: config.AWS_SES_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SES_SECRET_ACCESS_KEY
  },
  region: config.AWS_SES_REGION
};

const getMailTransporter = () =>  createTransport({
  SES: {
    aws: { SendRawEmailCommand },
    ses: new SES(SES_CONFIG)
  }
});

const getMailTransporterMock = () => { return {
  sendMail: jest.fn(() => {return sentMessage;})
} as unknown as Transporter<SentMessageInfo>};

describe("mail controller", () => {

  describe('test send mail', () => {

    beforeAll(async () => {
      registerHelpers();
    });

    afterEach(async () => {
      jest.useRealTimers();
      jest.resetAllMocks();
      jest.restoreAllMocks();
    });

    beforeEach(async () => {
      jest.useFakeTimers();
      // Create mock template functions
      const mockTextTemplate = jest.fn((data) => `Text template with ${JSON.stringify(data)}`);
      const mockHtmlTemplate = jest.fn((data) => `<html>HTML template with ${JSON.stringify(data)}</html>`);
      
      // Mock the getTemplates function to return our mock templates
      const mockGetTemplates = jest.fn().mockResolvedValue({
        textTemplate: mockTextTemplate,
        htmlTemplate: mockHtmlTemplate
      });
      
      // Create a mock template cache object
      const mockTemplateCache = {
        getTemplates: mockGetTemplates,
        clearCache: jest.fn(),
        getCacheSize: jest.fn(() => 0)
      };
      
      // Replace the createTemplateCache function
      jest.spyOn(templateCacheModule, 'createTemplateCache').mockImplementation(() => mockTemplateCache);
      jest.spyOn(global, 'setInterval');
    });

    it("should return IResponseErrorValidation", async () => {
      const request = {
        body: "testBody"
      } as any;

      const handler = sendMail(config, getMailTransporter());

      const responseErrorValidation = await handler(request);

      expect(responseErrorValidation.kind).toBe("IResponseErrorValidation");
    });

    it("should return Invalid X-Client-Id", async () => {

      const handler = sendMail(config, getMailTransporter());

      const responseErrorValidation2 = await handler(getReq("success","test"));

      expect(responseErrorValidation2.kind).toBe("IResponseErrorValidation");
      
      expect(responseErrorValidation2.detail).toMatch("Invalid X-Client-Id");
    });

    it("should return Invalid Template", async () => {
      const handler = sendMail(config, getMailTransporterMock());

      const responseSuccessValidation = await handler(getReq("no-success", "CLIENT_ECOMMERCE_TEST"));

      expect(responseSuccessValidation.kind).toBe("IResponseErrorValidation");
      expect(responseSuccessValidation.detail).toBe("Error: Invalid Template");
    });

    it("should return Missing X-Client-Id", async () => {

      const handler = sendMail(config, getMailTransporterMock());

      const responseSuccessValidation = await handler(getReq("success", undefined));

      expect(responseSuccessValidation.kind).toBe("IResponseErrorValidation");
      expect(responseSuccessValidation.detail).toBe("Invalid X-Client-Id: Missing X-Client-Id header");
    });

    xit("should return ResponseSuccessAccepted mock", async () => {
      const mailTrasporterMock = {
        sendMail: jest.fn(() => {return null;})
      } as unknown as Transporter<SentMessageInfo>;

      const handler = sendMail(config, mailTrasporterMock);

      const responseSuccessValidation = await handler(getReq("success","CLIENT_ECOMMERCE_TEST"));

      expect(responseSuccessValidation.kind).toBe("IResponseSuccessAccepted");
    });

    it("should return ok no mock", async () => {

      const handler = sendMail(config, getMailTransporterMock());

      const responseErrorValidation = await handler(getReq("success","CLIENT_ECOMMERCE"));

      expect(responseErrorValidation.kind).toBe("IResponseSuccessJson");
    });

    xit("should catch error and return none", async () => {

      const sentMessageMock = {
      /** an envelope object {from:‘address’, to:[‘address’]} */
      envelope: {from: "testFrom", to: ["testTo"]} as Envelope,
      /** the Message-ID header value. This value is derived from the response of SES API, so it differs from the Message-ID values used in logging. */
      messageId: "sentMessageId",
      response: "response",
      accepted: ["acceptedMail"],
      rejected: ["rejectedMail"],
      pending: ["pendingMail"]
    } as SentMessageInfo 

    const mockSendMail = jest.fn().mockImplementation(() => {
      Promise.reject(sentMessageMock);
    });

    const mailTrasporterMock = {
      sendMail: mockSendMail
    } as unknown as Transporter<SentMessageInfo>;

    const handler = sendMail(config, mailTrasporterMock);

    const response = await handler(getReq("success","CLIENT_ECOMMERCE"));
    expect(mockSendMail).toThrowError();
    expect(response.kind).toBe("IResponseSuccessJson");
  });

});

// template-reated errors section.
// Moved to a new describe block to optimize mocking
describe("template error handling", () => {
  beforeAll(async () => {
    registerHelpers();
  });

  afterEach(async () => {
    jest.useRealTimers();
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setInterval');
  });
  
  it("should return ResponseErrorValidation when template files cannot be read", async () => {
    // Mock the createTemplateCache function to return a cache that throws an error
    const errorMock = new Error("File not found");
    const mockTemplateCache = {
      getTemplates: jest.fn().mockRejectedValue(errorMock),
      clearCache: jest.fn(),
      getCacheSize: jest.fn(() => 0),
    };

    // Spy on the createTemplateCache function and replace its implementation
    jest.spyOn(templateCacheModule, "createTemplateCache").mockReturnValue(mockTemplateCache);

      // Mock the logger to verify error logging
      const loggerErrorMock = jest.spyOn(logger, "error").mockImplementation(jest.fn());

      const { sendMail } = require("../EmailsControllers");
    
      // Create a valid request with proper client ID and template ID
      const request = getReq("success", "CLIENT_ECOMMERCE");

      const handler = sendMail(config, getMailTransporterMock());
      
      const response = await handler(request);
    
      expect(response.kind).toBe("IResponseErrorValidation");
      
      // Type guard to check if response is IResponseErrorValidation
      if (response.kind === "IResponseErrorValidation") {
        expect(response.detail).toBe("Template Error: Failed to load templates");
      }
    
    
      // Verify that logger.error was called with the correct error message
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error reading templates: Error: File not found")
      );

      // Restore mocks after test
      jest.restoreAllMocks();
    });
});

describe("test template", () => {
  
  beforeAll(async () => {
    registerHelpers();
  });

  afterEach(async () => {
    jest.useRealTimers();
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setInterval');
  });

  it("should return responseSuccessValidation mock template success", async () => {
    const handler = sendMail(config, getMailTransporterMock());

    const responseSuccessValidation = await handler(getReq("success","CLIENT_ECOMMERCE_TEST"));

    expect(responseSuccessValidation.kind).toBe("IResponseSuccessJson");
  });

  it("should return responseSuccessValidation mock template ko", async () => {
    const handler = sendMail(config, getMailTransporterMock());

    const responseSuccessValidation = await handler(getReq("ko","CLIENT_ECOMMERCE_TEST"));

    expect(responseSuccessValidation.kind).toBe("IResponseSuccessJson");
  });

})

});

const getReq = (templateId: string, header: string | undefined) => {
  return {
    header: (s: string) => header,
    body: {
      to: "to@email.it",
      subject: "subjectTest",
      templateId: templateId,
      parameters: mockReq},
      lang: {language: "IT" }
  } as any;
}