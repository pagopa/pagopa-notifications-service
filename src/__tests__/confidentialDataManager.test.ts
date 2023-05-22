import { mockReq } from "../__mocks__/data_mock";
import { apiPdvClient,decryptBody,encryptBody} from "../util/confidentialDataManager";
import * as E from "fp-ts/lib/Either";
import { NotificationEmailRequest } from "../generated/definitions/NotificationEmailRequest";
import { EmailString } from "@pagopa/ts-commons/lib/strings";

describe("confidential data manager tests", () => {
    const token = "2784acb0-56e3-494b-93cb-0f8ecf3b0b8d"
    const body = {
        to: "error@email.it" as EmailString,
        subject: "subjectTest",
        templateId: "success",
        parameters: mockReq
    } as NotificationEmailRequest;
      
it("decrypt OK from PDV", async () => {
   jest.spyOn(apiPdvClient, 'findPiiUsingGET').mockResolvedValue(E.right({ status:200 , value: {pii: JSON.stringify(body)}, headers: "" as any}));
   const result = await decryptBody(token)();
   expect(E.isRight(result)).toBe(true);
})

it("decrypt KO from PDV", async () => {
    jest.spyOn(apiPdvClient, 'findPiiUsingGET').mockResolvedValue(E.left([]));
    const result = await decryptBody(token)();
    expect(E.isRight(result)).toBe(false);
})

it("decrypt OK from PDV with ko http status", async () => {
    jest.spyOn(apiPdvClient, 'findPiiUsingGET').mockResolvedValue(E.right({ status: 403 , value: undefined, headers: "" as any}));
    const result = await decryptBody(token)();
    expect(E.isRight(result)).toBe(false);
})

it("encrypt OK from PDV", async () => {
    jest.spyOn(apiPdvClient, 'saveUsingPUT').mockResolvedValue(E.right({ status:200 , value: {token: token} , headers: "" as any}));
    const result = await encryptBody(JSON.stringify(body))();
    expect(E.isRight(result)).toBe(true);
})

it("encrypt KO from PDV", async () => {
    jest.spyOn(apiPdvClient, 'saveUsingPUT').mockResolvedValue(E.left([]));
    const result = await encryptBody(JSON.stringify(body))();
    expect(E.isRight(result)).toBe(false);
})

it("encrypt OK from PDV with ko http status", async () => {
    jest.spyOn(apiPdvClient, 'saveUsingPUT').mockResolvedValue(E.right({ status: 403 , value: undefined, headers: "" as any}));
    const result = await encryptBody(JSON.stringify(body))();
    expect(E.isRight(result)).toBe(false);
})
});