
import { retryQueueClient } from "../util/queues";
import { apiPdvClient } from "../util/confidentialDataManager";
import { getConfigOrThrow } from "../util/config";
import { Envelope } from "nodemailer/lib/mime-node";
import { SentMessageInfo } from "nodemailer/lib/ses-transport";
import { Transporter } from "nodemailer";
import { addRetryQueueListener } from "../queues/RetryQueueListener";
import { QueueReceiveMessageResponse } from "@azure/storage-queue";
import * as puppeteer from "puppeteer";
import registerHelpers from "handlebars-helpers";
import { mockReq } from "../__mocks__/data_mock";

describe("retry queue", () => {

  const config = getConfigOrThrow();
    
  const SES_CONFIG = {
    accessKeyId: config.AWS_SES_ACCESS_KEY_ID,
    region: config.AWS_SES_REGION,
    secretAccessKey: config.AWS_SES_SECRET_ACCESS_KEY
  };

  const sentMessageMock = (a: number): SentMessageInfo => { return {
    /** an envelope object {from:‘address’, to:[‘address’]} */
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

  retryQueueClient.deleteMessage = mockDeleteMessage;

  it("sendMessageToRetryQueue", async () => {
    jest.useFakeTimers();
    const emailMockedFunction = jest.fn();
    registerHelpers();
    
    jest.spyOn(global, 'setInterval');

    const browser = await puppeteer.launch({
      args: ["--no-sandbox"],
      headless: true
    });

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
    const spyDecrypt = jest.spyOn(apiPdvClient, 'findPiiUsingGET').mockResolvedValue({_tag: "Right", right:{ status:200 , value: {pii: JSON.stringify(requestMock.body)}, headers: "" as any} });

    addRetryQueueListener(config,mailTrasporterMock,browser);

    expect(setInterval).toHaveBeenCalledTimes(1);
    expect(setInterval).toHaveBeenLastCalledWith(expect.any(Function), 1000);
    jest.advanceTimersByTime(1000);
    expect(mockReceiveMessages).toHaveBeenCalledTimes(1);

    console.log(mockedMailFunction.mock.calls.length);

    await browser?.close();
    jest.useRealTimers();
  });

  it("retry queue event listener catches errors", async () => {
    jest.useFakeTimers();
    const emailMockedFunction = jest.fn();
    registerHelpers();

    jest.spyOn(global, 'setInterval');

    const browser = await puppeteer.launch({
      args: ["--no-sandbox"],
      headless: true
    });

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
    const spyDecrypt = jest.spyOn(apiPdvClient, 'findPiiUsingGET').mockResolvedValue({_tag: "Right", right:{ status: 400 , value: { status: 400, title: ""}, headers: "" as any} });

    addRetryQueueListener(config, mailTrasporterMock, browser);

    expect(setInterval).toHaveBeenCalledTimes(1);
    expect(setInterval).toHaveBeenLastCalledWith(expect.any(Function), 1000);
    jest.advanceTimersByTime(1000);

    expect(mockReceiveMessages).toHaveBeenCalledTimes(1);

    await browser?.close();
    jest.useRealTimers();
  });
});