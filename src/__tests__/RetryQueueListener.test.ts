
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

describe("error queue",() => {

    var logger: Logger;

    var config = {
      AI_ENABLED: false,
      AI_INSTRUMENTATION_KEY: "key",
      AI_SAMPLING_PERCENTAGE: 0,
      AWS_SES_ACCESS_KEY_ID: "aws_access_key",
      AWS_SES_REGION: "aws_region",
      AWS_SES_SECRET_ACCESS_KEY: "aws_secret",
      CLIENT_ECOMMERCE: {TEMPLATE_IDS: ["fake template"]} as configuration.NotificationsServiceClientConfig,
      CLIENT_ECOMMERCE_TEST: {TEMPLATE_IDS: ["fake template test"]} as configuration.NotificationsServiceClientConfig,
      CLIENT_PAYMENT_MANAGER: {TEMPLATE_IDS: ["fake template payment manager"]} as configuration.NotificationsServiceClientConfig,
      ERROR_QUEUE_NAME: "error q name",
      INITIAL_RETRY_TIMEOUT_SECONDS: 10,
      MAX_RETRY_ATTEMPTS: 3,
      PORT: 3240,
      RETRY_QUEUE_NAME: "retry q name",
      STORAGE_CONNECTION_STRING: "storageconnection"
    } as configuration.IConfig;
    
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

      const requestMock = 
       {
        header: (s: string) => "CLIENT_ECOMMERCE",
        body: {
         to: "error@email.it",
         subject: "subjectTest",
         templateId: "success",
         parameters: mockReq},
         lang: {language: "IT" }
       } as any;

      var browser: Browser;

    it("sendMessageToRetryQueue", async () => {
      const emailMockedFunction = jest.fn();
     /* const EmailsControllers = require('../controllers/EmailsControllers');
      EmailsControllers.mockImplementation(() => {
        return {
          sendEMail: emailMockedFunction,
        };
      });*/
        //const spyReceiveMessages = jest.spyOn(retryQueueClient,'receiveMessages');
        registerHelpers();
        
        jest.useFakeTimers();
        jest.spyOn(global, 'setInterval');

        browser = await puppeteer.launch({
          args: ["--no-sandbox"],
          headless: true
        });
        
        retryQueueClient.createIfNotExists = jest.fn().mockResolvedValue({});
        console.log(JSON.stringify(requestMock));
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
        jest.advanceTimersToNextTimer();
        //jest.runOnlyPendingTimers();
        expect(mockReceiveMessages.mock.calls.length).toBe(1);
        //await expect(spySendMail).resolves.toBeCalledTimes(3);
        //await expect(mockedMailFunction.mock.calls).resolves.toBeCalledTimes(3);
        //expect(mockDeleteMessage.mock.calls.length).toBe(3);
        //expect(mockedMailFunction.mock.calls.length).toBe(3);
    });
});