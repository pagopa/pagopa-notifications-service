import { sendMail } from "../EmailsControllers";
import { getConfigOrThrow } from "../../util/config";
import { Envelope } from "nodemailer/lib/mime-node";
import { SentMessageInfo } from "nodemailer/lib/ses-transport";
import { Transporter, createTransport } from "nodemailer";
import { SES, SendRawEmailCommand } from "@aws-sdk/client-ses";
import registerHelpers from "handlebars-helpers";
import { mockReq } from "../../__mocks__/data_mock";
  
var config = getConfigOrThrow();

const sentMessage = {
  /** an envelope object {from:‘address’, to:[‘address’]} */
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