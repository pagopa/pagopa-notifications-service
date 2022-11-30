import * as EmailsController from "../EmailsControllers";
import * as configuration from "../../util/config";
import { Browser } from "puppeteer";
import { Envelope } from "nodemailer/lib/mime-node";
import * as SESTransport from "nodemailer/lib/ses-transport";
import { Transporter } from "nodemailer";
import * as nodemailer from "nodemailer";
import * as AWS from "aws-sdk";
import * as puppeteer from "puppeteer";
import * as registerHelpers from "handlebars-helpers";
import { mockReq } from "../../__mocks__/data_mock";
  
var config = configuration.getConfigOrThrow();

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

const getMailTransporter = () =>  nodemailer.createTransport({
  SES: new AWS.SES(SES_CONFIG)
});

const getMailTransporterMock = () => { return {
  sendMail: jest.fn(() => {return sentMessage;})
} as unknown as Transporter<SESTransport.SentMessageInfo>};

describe("mail controller", () => {


describe('test send mail', () => {
  var browser: Browser;

  beforeAll(async () => {
    registerHelpers();
  });

  afterAll(async () => {
   
  });

  afterEach(async () => {
    jest.useRealTimers();
    jest.resetAllMocks();
    jest.restoreAllMocks();
    await browser?.close();
  });

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setInterval');
    browser = await puppeteer.launch({
      args: ["--no-sandbox"],
      headless: true
    });
  });

  it("should return IResponseErrorValidation", async () => {
    var req = {
      body: "testBody"
    } as any;

    const handler = EmailsController.sendMail(config, getMailTransporter(), browser);

    const responseErrorValidation = await handler(req);

    expect(responseErrorValidation.kind).toBe("IResponseErrorValidation");
  });

  it("should return Invalid X-Client-Id", async () => {

    const handler = EmailsController.sendMail(config, getMailTransporter(), browser);

    const responseErrorValidation2 = await handler(getReq("success","test"));

    expect(responseErrorValidation2.kind).toBe("IResponseErrorValidation");
    
    expect(responseErrorValidation2.detail).toMatch("Invalid X-Client-Id");
  });

  it("should return Invalid Template", async () => {
    const handler = EmailsController.sendMail(config, getMailTransporterMock(), browser);

    const responseSuccessValidation = await handler(getReq("no-success", "CLIENT_ECOMMERCE_TEST"));

    expect(responseSuccessValidation.kind).toBe("IResponseErrorValidation");
    expect(responseSuccessValidation.detail).toBe("Error: Invalid Template");
  });

  it("should return Missing X-Client-Id", async () => {

    const handler = EmailsController.sendMail(config, getMailTransporterMock(), browser);

    const responseSuccessValidation = await handler(getReq("success", undefined));

    expect(responseSuccessValidation.kind).toBe("IResponseErrorValidation");
    expect(responseSuccessValidation.detail).toBe("Invalid X-Client-Id: Missing X-Client-Id header");
  });

  xit("should return ResponseSuccessAccepted mock", async () => {
    const mailTrasporterMock = {
      sendMail: jest.fn(() => {return null;})
    } as unknown as Transporter<SESTransport.SentMessageInfo>;

    const handler = EmailsController.sendMail(config, mailTrasporterMock, browser);

    const responseSuccessValidation = await handler(getReq("success","CLIENT_ECOMMERCE_TEST"));

    expect(responseSuccessValidation.kind).toBe("IResponseSuccessAccepted");
  });

  it("should return ok no mock", async () => {

    const handler = EmailsController.sendMail(config, getMailTransporterMock(), browser);

    const responseErrorValidation = await handler(getReq("success","CLIENT_ECOMMERCE"));

    expect(responseErrorValidation.kind).toBe("IResponseSuccessJson");
  });

  xit("should cacth error and return none", async () => {

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

      const mockSendMail = jest.fn().mockImplementation(() => {
        Promise.reject(sentMessageMock);
      });

    const mailTrasporterMock = {
      sendMail: mockSendMail
    } as unknown as Transporter<SESTransport.SentMessageInfo>;

    const handler = EmailsController.sendMail(config, mailTrasporterMock, browser);

    const response = await handler(getReq("success","CLIENT_ECOMMERCE"));
    expect(mockSendMail).toThrowError();
    expect(response.kind).toBe("IResponseSuccessJson");
  });

});

describe("test template", () => {

  var browser: Browser;
  
  beforeAll(async () => {
    registerHelpers();
  });

  afterEach(async () => {
    await browser?.close();
    jest.useRealTimers();
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.spyOn(global, 'setInterval');
    browser = await puppeteer.launch({
      args: ["--no-sandbox"],
      headless: true
    });
  });

  afterAll(async () => {
  });

  it("should return responseSuccessValidation mock template success", async () => {
    const handler = EmailsController.sendMail(config, getMailTransporterMock(), browser);

    const responseSuccessValidation = await handler(getReq("success","CLIENT_ECOMMERCE_TEST"));

    expect(responseSuccessValidation.kind).toBe("IResponseSuccessJson");
  });

  it("should return responseSuccessValidation mock template ko", async () => {
    const handler = EmailsController.sendMail(config, getMailTransporterMock(), browser);

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