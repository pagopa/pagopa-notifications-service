import { retryQueueClient } from "../util/queues";
import { apiPdvClient, encryptBody } from "../util/confidentialDataManager";
import { getConfigOrThrow } from "../util/config";
import { Envelope } from "nodemailer/lib/mime-node";
import { SentMessageInfo } from "nodemailer/lib/ses-transport";
import { Transporter } from "nodemailer";
import { addRetryQueueListener } from "../queues/RetryQueueListener";
import { QueueReceiveMessageResponse } from "@azure/storage-queue";
import registerHelpers from "handlebars-helpers";
import { mockReq } from "../__mocks__/data_mock";
import * as fs from "fs";
import * as O from "fp-ts/lib/Option";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { sendMessageToErrorQueue } from "../queues/ErrorQueue";
import { sendEmail, writeMessageIntoQueue } from "../controllers/EmailsControllers";
import { logger } from "../util/logger";
import { Type } from "io-ts";

// Mock dependencies for retry tests
jest.mock("../queues/ErrorQueue", () => ({
  sendMessageToErrorQueue: jest.fn().mockResolvedValue({})
}));

jest.mock("../util/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

// Properly mock the confidentialDataManager module
jest.mock("../util/confidentialDataManager", () => {
  const original = jest.requireActual("../util/confidentialDataManager");
  return {
    ...original,
    encryptBody: jest.fn().mockImplementation(() => TE.right("encrypted-body")),
    apiPdvClient: {
      ...original.apiPdvClient,
      findPiiUsingGET: jest.fn().mockResolvedValue({
        _tag: "Right", 
        right: { 
          status: 200, 
          value: { pii: JSON.stringify({ to: "test@example.com", subject: "Test", templateId: "test", parameters: {} }) }, 
          headers: {} 
        }
      })
    }
  };
});

describe("retry queue", () => {

  const config = getConfigOrThrow();
    
  const SES_CONFIG = {
    credentials: {
      accessKeyId: config.AWS_SES_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SES_SECRET_ACCESS_KEY
    },
    region: config.AWS_SES_REGION
  };

  const sentMessageMock = (a: number): SentMessageInfo => { return {
    /** an envelope object {from:'address', to:['address']} */
    envelope: {from: "testFrom", to: ["testTo"]} as Envelope,
    /** the Message-ID header value. This value is derived from the response of SES API, so it differs from the Message-ID values used in logging. */
    messageId: ("sentMessageId "+a),
    response: "response",
    accepted: ["acceptedMail"],
    rejected: ["rejectedMail"],
    pending: ["pendingMail"]
  } as SentMessageInfo};

  const requestMock =  {
    header: (s: string) => "CLIENT_ECOMMERCE_TEST",
    body: {
      to: "error@email.it",
      subject: "subjectTest",
      templateId: "success",
      parameters: mockReq},
    lang: {language: "IT" }
  } as any;

  const mockDeleteMessage = jest.fn((messageId, popReceipt, options) => {
    return Promise.resolve(messageId);
  });

  const mockLoadTemplate = (path: any) => {
    const pathStr = typeof path === 'string' 
      ? path 
      : path instanceof URL 
        ? path.toString() 
        : path instanceof Buffer 
          ? path.toString() 
          : path.toString();
    
    if (pathStr.includes('.template.txt')) {
      return Promise.resolve('Text template');
    } else if (pathStr.includes('.template.html')) {
      return Promise.resolve('<html>HTML template</html>');
    }
    return Promise.reject(new Error(`File not found: ${pathStr}`));
  }

  retryQueueClient.deleteMessage = mockDeleteMessage;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock retryQueueClient.sendMessage if not already mocked
    retryQueueClient.sendMessage = jest.fn().mockResolvedValue({});
  });

  it("sendMessageToRetryQueue", async () => {
    jest.spyOn(fs.promises, 'readFile').mockImplementation(mockLoadTemplate);

    jest.useFakeTimers();
    const emailMockedFunction = jest.fn();
    registerHelpers();
    
    jest.spyOn(global, 'setInterval');

    retryQueueClient.createIfNotExists = jest.fn().mockResolvedValue({});

    const mockedMailFunction = jest.fn().mockResolvedValueOnce(sentMessageMock(1)).mockResolvedValueOnce(sentMessageMock(3)).mockResolvedValueOnce(sentMessageMock(3));
    const mailTrasporterMock = {
      sendMail: mockedMailFunction
    } as unknown as Transporter<SentMessageInfo>;

    const mockReceiveMessages = jest.fn().mockResolvedValueOnce({receivedMessageItems: 
      [{
        messageId: "1",
        popReceipt: "1PR",
        messageText: JSON.stringify(requestMock)
      },
      {
        messageId: "2",
        popReceipt: "2PR",
        messageText: JSON.stringify(requestMock)
      },
      {
        messageId: "3",
        popReceipt: "3PR",
        messageText: JSON.stringify(requestMock)
      },
    ]} as QueueReceiveMessageResponse);

    retryQueueClient.receiveMessages = mockReceiveMessages;

    const spySendMail = jest.spyOn(mailTrasporterMock,'sendMail');
    retryQueueClient.createIfNotExists();
    
    addRetryQueueListener(config,mailTrasporterMock);

    expect(setInterval).toHaveBeenCalledTimes(1);
    expect(setInterval).toHaveBeenLastCalledWith(expect.any(Function), 1000);
    jest.advanceTimersByTime(1000);
    expect(mockReceiveMessages).toHaveBeenCalledTimes(1);

    console.log(mockedMailFunction.mock.calls.length);

    jest.useRealTimers();
  });

  it("retry queue event listener catches errors", async () => {
    jest.useFakeTimers();
    const emailMockedFunction = jest.fn();
    registerHelpers();

    jest.spyOn(global, 'setInterval');

    retryQueueClient.createIfNotExists = jest.fn().mockResolvedValue({});

    const mockReceiveMessages = jest.fn().mockResolvedValueOnce({receivedMessageItems: 
      [{
        messageId: "1",
        popReceipt: "1PR",
        messageText: JSON.stringify(requestMock)
      }
    ]} as QueueReceiveMessageResponse);

    retryQueueClient.receiveMessages = mockReceiveMessages;

    const mockedMailFunction = jest.fn().mockResolvedValueOnce(sentMessageMock(1));
    const mailTrasporterMock = {
      sendMail: mockedMailFunction
    } as unknown as Transporter<SentMessageInfo>;
    const spySendMail = jest.spyOn(mailTrasporterMock,'sendMail');
    retryQueueClient.createIfNotExists();
    
    addRetryQueueListener(config, mailTrasporterMock);

    expect(setInterval).toHaveBeenCalledTimes(1);
    expect(setInterval).toHaveBeenLastCalledWith(expect.any(Function), 1000);
    jest.advanceTimersByTime(1000);

    expect(mockReceiveMessages).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  // New tests for retry mechanism
  describe("Email Retry Mechanism Tests", () => {
    describe("writeMessageIntoQueue", () => {
      const mockConfig = {
        MAX_RETRY_ATTEMPTS: 3,
        INITIAL_RETRY_TIMEOUT_SECONDS: 60
      };

      it("should enqueue message with correct retry count when retryCount > 0", () => {
        const bodyEncrypted = "encrypted-body";
        const clientId = "test-client";
        const retryCount = 2;

        writeMessageIntoQueue(bodyEncrypted, clientId, retryCount, mockConfig as any);

        expect(logger.info).toHaveBeenCalledWith(
          `Enqueueing failed message with retryCount ${retryCount}`
        );
        expect(retryQueueClient.sendMessage).toHaveBeenCalledWith(
          JSON.stringify({
            clientId,
            bodyEncrypted,
            retryCount
          }),
          {
            visibilityTimeout: 
              2 ** (mockConfig.MAX_RETRY_ATTEMPTS - retryCount) * 
              mockConfig.INITIAL_RETRY_TIMEOUT_SECONDS
          }
        );
        expect(sendMessageToErrorQueue).not.toHaveBeenCalled();
      });

      it("should send message to error queue when retryCount is 0", () => {
        const bodyEncrypted = "encrypted-body";
        const clientId = "test-client";
        const retryCount = 0;

        writeMessageIntoQueue(bodyEncrypted, clientId, retryCount, mockConfig as any);

        expect(logger.error).toHaveBeenCalledWith(
          "Message failed too many times, adding to error queue"
        );
        expect(sendMessageToErrorQueue).toHaveBeenCalledWith(bodyEncrypted, clientId);
        expect(retryQueueClient.sendMessage).not.toHaveBeenCalled();
      });

      it("should calculate correct visibility timeout based on retry count", () => {
        const bodyEncrypted = "encrypted-body";
        const clientId = "test-client";
        
        // Test with different retry counts
        [3, 2, 1].forEach(retryCount => {
          jest.clearAllMocks();
          
          writeMessageIntoQueue(bodyEncrypted, clientId, retryCount, mockConfig as any);
          
          const expectedTimeout = 
            2 ** (mockConfig.MAX_RETRY_ATTEMPTS - retryCount) * 
            mockConfig.INITIAL_RETRY_TIMEOUT_SECONDS;
          
          expect(retryQueueClient.sendMessage).toHaveBeenCalledWith(
            expect.any(String),
            { visibilityTimeout: expectedTimeout }
          );
        });
      });
    });

    describe("sendEmail retry mechanism", () => {
      // Mock dependencies for sendEmail tests
      const mockMailTransporter: Partial<Transporter<SentMessageInfo>> = {
        sendMail: jest.fn()
      };
      
      const mockConfig = {
        ECOMMERCE_NOTIFICATIONS_SENDER: "test@example.com",
        MAX_RETRY_ATTEMPTS: 3,
        INITIAL_RETRY_TIMEOUT_SECONDS: 60,
        PAGOPA_MAIL_LOGO_URI: "https://example.com/logo.png"
      };
      
      const mockTemplateCache = {
        getTemplates: jest.fn().mockResolvedValue({
          htmlTemplate: (params: any) => `<p>Test HTML with ${JSON.stringify(params)}</p>`,
          textTemplate: (params: any) => `Test text with ${JSON.stringify(params)}</p>`,
        })
      };
      
      // Create a mock Type object that satisfies the io-ts Type interface
      const mockSchema = {
        default: {
          decode: jest.fn().mockImplementation(params => E.right(params)),
        }
      };
      
      const mockParams = {
        "X-Client-Id": "TEST_CLIENT",
        body: {
          templateId: "test-template",
          to: "recipient@example.com",
          subject: "Test Subject",
          parameters: { name: "Test User" }
        }
      } as any;

      it("should handle AWS SES error and retry with encrypted body", async () => {
        // Mock sendMail to throw an error
        (mockMailTransporter.sendMail as jest.Mock).mockRejectedValueOnce(
          new Error("AWS SES Error")
        );
        
        await sendEmail(
          mockParams,
          mockSchema as any,
          mockMailTransporter as any,
          mockConfig as any,
          mockConfig.MAX_RETRY_ATTEMPTS,
          mockTemplateCache as any
        );
        
        // Verify error was logged
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining("Error while trying to send email to AWS SES")
        );
        
        // Verify message was queued with correct parameters
        expect(retryQueueClient.sendMessage).toHaveBeenCalled();
        
        // Check that the first argument to sendMessage contains the client ID
        const sendMessageArgs = (retryQueueClient.sendMessage as jest.Mock).mock.calls[0][0];
        expect(sendMessageArgs).toContain(mockParams["X-Client-Id"]);
      });

      it("should return ResponseSuccessAccepted when email sending fails and is queued for retry", async () => {
        // Mock sendMail to throw an error
        (mockMailTransporter.sendMail as jest.Mock).mockRejectedValueOnce(
          new Error("AWS SES Error")
        );
        
        const result = await sendEmail(
          mockParams,
          mockSchema as any,
          mockMailTransporter as any,
          mockConfig as any,
          mockConfig.MAX_RETRY_ATTEMPTS,
          mockTemplateCache as any
        );
        
        // Should return accepted response
        expect(result.kind).toBe("IResponseSuccessAccepted");
      });
    });
  });
});