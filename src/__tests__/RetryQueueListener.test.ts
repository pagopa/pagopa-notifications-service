
import { errorQueueClient, retryQueueClient } from "../util/queues";
import { Logger } from "winston";
import * as configuration from "../util/config";
import { Browser } from "puppeteer";
import { Envelope } from "nodemailer/lib/mime-node";
import * as SESTransport from "nodemailer/lib/ses-transport";
import { Transporter } from "nodemailer";
import { addRetryQueueListener } from "../queues/RetryQueueListener";
import { QueueClient, QueueReceiveMessageResponse } from "@azure/storage-queue";
import * as puppeteer from "puppeteer";
import * as registerHelpers from "handlebars-helpers";
import { mockReq } from "../__mocks__/data_mock";

describe("error queue",() => {

    var config = configuration.getConfigOrThrow();
    
    const SES_CONFIG = {
      accessKeyId: config.AWS_SES_ACCESS_KEY_ID,
      region: config.AWS_SES_REGION,
      secretAccessKey: config.AWS_SES_SECRET_ACCESS_KEY
    };

    const sentMessageMock = (a: number): SESTransport.SentMessageInfo => { return {
      /** an envelope object {from:‘address’, to:[‘address’]} */
      envelope: {from: "testFrom", to: ["testTo"]} as Envelope,
      /** the Message-ID header value. This value is derived from the response of SES API, so it differs from the Message-ID values used in logging. */
      messageId: ("sentMessageId "+a),
      response: "response",
      accepted: ["acceptedMail"],
      rejected: ["rejectedMail"],
      pending: ["pendingMail"]
    } as SESTransport.SentMessageInfo};

    const requestMock = 
      {
      header: (s: string) => "CLIENT_ECOMMERCE_TEST",
      body: {
        to: "error@email.it",
        subject: "subjectTest",
        templateId: "success",
        parameters: mockReq},
        lang: {language: "IT" }
      } as any;

    var browser: Browser;

    it("sendMessageToRetryQueue", async () => {
      jest.useFakeTimers();
      const emailMockedFunction = jest.fn();
      registerHelpers();
      
      jest.spyOn(global, 'setInterval');

      browser = await puppeteer.launch({
        args: ["--no-sandbox"],
        headless: true
      });
      
      retryQueueClient.createIfNotExists = jest.fn().mockResolvedValue({});
      
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

      const mockDeleteMessage = jest.fn().mockResolvedValueOnce("1").mockResolvedValueOnce("2").mockResolvedValueOnce("3");
      retryQueueClient.deleteMessage = mockDeleteMessage;

      const mockedMailFunction = jest.fn().mockResolvedValueOnce(sentMessageMock(1)).mockResolvedValueOnce(sentMessageMock(3)).mockResolvedValueOnce(sentMessageMock(3));
      const mailTrasporterMock = {
        sendMail: mockedMailFunction
      } as unknown as Transporter<SESTransport.SentMessageInfo>;
      const spySendMail = jest.spyOn(mailTrasporterMock,'sendMail');
      retryQueueClient.createIfNotExists();
      addRetryQueueListener(config,mailTrasporterMock,browser);

      expect(setInterval).toHaveBeenCalledTimes(1);
      expect(setInterval).toHaveBeenLastCalledWith(expect.any(Function), 1000);
      jest.advanceTimersByTime(1000);
      expect(mockReceiveMessages.mock.calls.length).toBe(1);
      //jest.clearAllTimers();
      await browser?.close();
      jest.useRealTimers();
    });
});