import * as EmailsController from "../EmailsControllers";
process.env = {
  PORT: "3030",
  CLIENT_ECOMMERCE_TEST: "{\"TEMPLATE_IDS\":[\"success\"]}",
  STORAGE_CONNECTION_STRING: "AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;DefaultEndpointsProtocol=http;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;",
  RETRY_QUEUE_NAME:"retry-queue",
  ERROR_QUEUE_NAME:"error-queue",
  INITIAL_RETRY_TIMEOUT_SECONDS:"120",
  MAX_RETRY_ATTEMPTS:"3",
  AI_INSTRUMENTATION_KEY:"test",
  AI_SAMPLING_PERCENTAGE:"30",
  AI_ENABLED:"false",
  AWS_SES_ACCESS_KEY_ID:"test-access-key",
  AWS_SES_REGION:"test-region",
  AWS_SES_SECRET_ACCESS_KEY:"test-secret-key"
};
import { Logger } from "winston";
import * as configuration from "../../util/config";
import { Browser } from "puppeteer";
import { Envelope } from "nodemailer/lib/mime-node";
import * as SESTransport from "nodemailer/lib/ses-transport";
import { Transporter } from "nodemailer";
import * as nodemailer from "nodemailer";
import * as AWS from "aws-sdk";
import * as puppeteer from "puppeteer";
import * as registerHelpers from "handlebars-helpers";
import { SendNotificationEmailT } from "../../generated/definitions/requestTypes";
import { AsControllerFunction } from "../../util/types";
import { IResponseSuccessAccepted } from "@pagopa/ts-commons/lib/responses";
  

const transactionMock = {
  id: "F57E2F8E-25FF-4183-AB7B-4A5EC1A96644",
  timestamp: "2020-07-10 15:00:00.000",
  amount:"300,00",
  psp: { "name": "Nexi","fee": { "amount": "2,00"}},
  rrn: "1234567890",
  paymentMethod: {name:"Visa *1234",logo:"https://...",accountHolder:"Marzia Roccaraso",extraFee: false},
  authCode: "9999999999"
};
const cartMock = {
    items: [
      {
        refNumber: {
          type: "codiceAvviso",
          value: "123456789012345678"
        },
        debtor: {
          fullName: "Giuseppe Bianchi",
          taxCode: "BNCGSP70A12F205X"
        },
        payee: {
          name: "Comune di Controguerra",
          taxCode: "82001760675"
        },
        subject: "TARI 2022",
        amount: "150,00"
      }
    ],
    amountPartial: "300,00"
};
const userMock = {
  data: {
    firstName: "Marzia",
    lastName: "Roccaraso",
    taxCode: "RCCMRZ88A52C409A"
  },
  email: "email@test.it"
};
const mockReq = {
  transaction: transactionMock,
  user:userMock,
  cart: cartMock,
  email: "test@test.it",
  noticeCode: "noticeCodeTest",
  amount: 100
};

var config = {
  AI_ENABLED: false,
  AI_INSTRUMENTATION_KEY: "key",
  AI_SAMPLING_PERCENTAGE: 0,
  AWS_SES_ACCESS_KEY_ID: "aws_access_key",
  AWS_SES_REGION: "aws_region",
  AWS_SES_SECRET_ACCESS_KEY: "aws_secret",
  CLIENT_ECOMMERCE: {TEMPLATE_IDS: ["success","ko"]} as configuration.NotificationsServiceClientConfig,
  CLIENT_ECOMMERCE_TEST: {TEMPLATE_IDS: ["success","ko","poc-1","poc-2"]} as configuration.NotificationsServiceClientConfig,
  CLIENT_PAYMENT_MANAGER: {TEMPLATE_IDS: ["success","ko"]} as configuration.NotificationsServiceClientConfig,
  ERROR_QUEUE_NAME: "error q name",
  INITIAL_RETRY_TIMEOUT_SECONDS: 10,
  MAX_RETRY_ATTEMPTS: 3,
  PORT: 3240,
  RETRY_QUEUE_NAME: "retry q name",
  STORAGE_CONNECTION_STRING: "storageconnection"
} as configuration.IConfig;

const sentMessage = {
  /** an envelope object {from:‘address’, to:[‘address’]} */
  envelope: {from: "testFrom", to: ["testTo"]} as Envelope,
  /** the Message-ID header value. This value is derived from the response of SES API, so it differs from the Message-ID values used in logging. */
  messageId: "messageId",
  response: "response",
  accepted: ["acceptedMail"],
  rejected: ["rejectedMail"],
  pending: ["pendingMail"]
} as SESTransport.SentMessageInfo 

const SES_CONFIG = {
accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
region: process.env.AWS_SES_REGION,
secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY
};

const mailTrasporter: Transporter = nodemailer.createTransport({
SES: new AWS.SES(SES_CONFIG)
});

describe("mail controller", () => {


describe('test send mail', () => {
  var browser: Browser;

  beforeAll(async () => {
    registerHelpers();
    browser = await puppeteer.launch({
      args: ["--no-sandbox"],
      headless: true
    });
  });

  afterAll(async () => {
    await browser?.close();
  });

  afterEach(async () => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
  });

  it("should return IResponseErrorValidation", async () => {
    var req = {
      body: "testBody"
    } as any;

    const handler = EmailsController.sendMail(config, mailTrasporter, browser);

    const responseErrorValidation = await handler(req);

    expect(responseErrorValidation.kind).toBe("IResponseErrorValidation");
  });

  it("should return Invalid X-Client-Id", async () => {

    const handler = EmailsController.sendMail(config, mailTrasporter, browser);

    var req2 = 
       {
        header: (s: string) => "test",
        body: {
         to: "to@email.it",
         subject: "subjectTest",
         templateId: "success",
         parameters: {}},
         lang: {language: "IT" }
       } as any;

    const responseErrorValidation2 = await handler(req2);

    expect(responseErrorValidation2.kind).toBe("IResponseErrorValidation");
    
    expect(responseErrorValidation2.detail).toMatch("Invalid X-Client-Id");
  });

  it("should return Invalid Template", async () => {

    var reqOk = 
       {
        header: (s: string) => "CLIENT_ECOMMERCE_TEST",
        body: {
         to: "to@email.it",
         subject: "subjectTest",
         templateId: "no-success",
         parameters: mockReq},
         lang: {language: "IT" }
       } as any;

    const mailTrasporterMock = {
      sendMail: jest.fn(() => {return sentMessage;})
    } as unknown as Transporter<SESTransport.SentMessageInfo>;

    const handler = EmailsController.sendMail(config, mailTrasporterMock, browser);

    const responseSuccessValidation = await handler(reqOk);

    expect(responseSuccessValidation.kind).toBe("IResponseErrorValidation");
    expect(responseSuccessValidation.detail).toBe("Error: Invalid Template");
  });

  it("should return Missing X-Client-Id", async () => {

    var reqOk = 
       {
        header: (s: string) => null,
        body: {
         to: "to@email.it",
         subject: "subjectTest",
         templateId: "success",
         parameters: mockReq},
         lang: {language: "IT" }
       } as any;

    const mailTrasporterMock = {
      sendMail: jest.fn(() => {return sentMessage;})
    } as unknown as Transporter<SESTransport.SentMessageInfo>;

    const handler = EmailsController.sendMail(config, mailTrasporterMock, browser);

    const responseSuccessValidation = await handler(reqOk);

    expect(responseSuccessValidation.kind).toBe("IResponseErrorValidation");
    expect(responseSuccessValidation.detail).toBe("Invalid X-Client-Id: Missing X-Client-Id header");
  });

  xit("should return ResponseSuccessAccepted mock", async () => {

    var reqOk = 
       {
        header: (s: string) => "CLIENT_ECOMMERCE_TEST",
        body: {
         to: "to@email.it",
         subject: "subjectTest",
         templateId: "success",
         parameters: mockReq},
         lang: {language: "IT" }
       } as any;

    const mailTrasporterMock = {
      sendMail: jest.fn(() => {return null;})
    } as unknown as Transporter<SESTransport.SentMessageInfo>;

    const handler = EmailsController.sendMail(config, mailTrasporterMock, browser);

    const responseSuccessValidation = await handler(reqOk);

    expect(responseSuccessValidation.kind).toBe("IResponseSuccessAccepted");
  });

  it("should return ok no mock", async () => {

    var reqOk = 
       {
        header: (s: string) => "CLIENT_ECOMMERCE",
        body: {
         to: "to@email.it",
         subject: "subjectTest",
         templateId: "success",
         parameters: mockReq},
         lang: {language: "IT" }
       } as any;

    const mailTrasporterMock = {
      sendMail: jest.fn(() => {return sentMessage;})
    } as unknown as Transporter<SESTransport.SentMessageInfo>;

    const handler = EmailsController.sendMail(config, mailTrasporterMock, browser);

    const responseErrorValidation = await handler(reqOk);

    expect(responseErrorValidation.kind).toBe("IResponseSuccessJson");
  });

  xit("should cacth error and return none", async () => {
    var reqOk = 
       {
        header: (s: string) => "CLIENT_ECOMMERCE",
        body: {
         to: "error@email.it",
         subject: "subjectTest",
         templateId: "success",
         parameters: mockReq},
         lang: {language: "IT" }
       } as any;

       const sentMessageMock = {
        /** an envelope object {from:‘address’, to:[‘address’]} */
        envelope: {from: "testFrom", to: ["testTo"]} as Envelope,
        /** the Message-ID header value. This value is derived from the response of SES API, so it differs from the Message-ID values used in logging. */
        messageId: "sentMessageId",
        response: "response",
        accepted: ["acceptedMail"],
        rejected: ["rejectedMail"],
        pending: ["pendingMail"]
      } as SESTransport.SentMessageInfo 

    const mailTrasporterMock = {
      sendMail: jest.fn().mockRejectedValue(new Error())
    } as unknown as Transporter<SESTransport.SentMessageInfo>;

    const handler = EmailsController.sendMail(config, mailTrasporterMock, browser);

    const response = await handler(reqOk);

    expect(response.kind).toBe("IResponseSuccessJson");
  });

});

describe("test template", () => {

  var browser: Browser;
  
  afterEach(async () => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });
  
  beforeAll(async () => {
    registerHelpers();
    browser = await puppeteer.launch({
      args: ["--no-sandbox"],
      headless: true
    });
  });

  beforeEach(async () => {
  });

  afterAll(async () => {
    await browser?.close();
  });

  it("should return responseSuccessValidation mock template poc-1", async () => {

    var reqOk = 
       {
        header: (s: string) => "CLIENT_ECOMMERCE_TEST",
        body: {
         to: "to@email.it",
         subject: "subjectTest",
         templateId: "poc-1",
         parameters: mockReq},
         lang: {language: "IT" }
       } as any;

    const mailTrasporterMock = {
      sendMail: jest.fn(() => {return sentMessage;})
    } as unknown as Transporter<SESTransport.SentMessageInfo>;

    const handler = EmailsController.sendMail(config, mailTrasporterMock, browser);

    const responseSuccessValidation = await handler(reqOk);

    expect(responseSuccessValidation.kind).toBe("IResponseSuccessJson");
  });

  it("should return responseSuccessValidation mock template poc-2", async () => {

    var reqOk = 
       {
        header: (s: string) => "CLIENT_ECOMMERCE_TEST",
        body: {
         to: "to@email.it",
         subject: "subjectTest",
         templateId: "poc-2",
         parameters: mockReq},
         lang: {language: "IT" }
       } as any;

    const mailTrasporterMock = {
      sendMail: jest.fn(() => {return sentMessage;})
    } as unknown as Transporter<SESTransport.SentMessageInfo>;

    const handler = EmailsController.sendMail(config, mailTrasporterMock, browser);

    const responseSuccessValidation = await handler(reqOk);

    expect(responseSuccessValidation.kind).toBe("IResponseSuccessJson");
  });

  it("should return responseSuccessValidation mock template success", async () => {

    var reqOk = 
       {
        header: (s: string) => "CLIENT_ECOMMERCE_TEST",
        body: {
         to: "to@email.it",
         subject: "subjectTest",
         templateId: "success",
         parameters: mockReq},
         lang: {language: "IT" }
       } as any;

    const mailTrasporterMock = {
      sendMail: jest.fn(() => {return sentMessage;})
    } as unknown as Transporter<SESTransport.SentMessageInfo>;

    const handler = EmailsController.sendMail(config, mailTrasporterMock, browser);

    const responseSuccessValidation = await handler(reqOk);

    expect(responseSuccessValidation.kind).toBe("IResponseSuccessJson");
  });

  it("should return responseSuccessValidation mock template ko", async () => {

    var reqOk = 
       {
        header: (s: string) => "CLIENT_ECOMMERCE_TEST",
        body: {
         to: "to@email.it",
         subject: "subjectTest",
         templateId: "ko",
         parameters: mockReq},
         lang: {language: "IT" }
       } as any;

    const mailTrasporterMock = {
      sendMail: jest.fn(() => {return sentMessage;})
    } as unknown as Transporter<SESTransport.SentMessageInfo>;

    const handler = EmailsController.sendMail(config, mailTrasporterMock, browser);

    const responseSuccessValidation = await handler(reqOk);

    expect(responseSuccessValidation.kind).toBe("IResponseSuccessJson");
  });


})

});