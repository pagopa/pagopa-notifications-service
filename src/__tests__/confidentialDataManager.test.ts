import { pipe } from "fp-ts/lib/function";
import { mockReq } from "../__mocks__/data_mock";
import { apiPdvClient,decryptBody,encryptBody} from "../util/confidentialDataManager";
import * as TE from "fp-ts/lib/TaskEither";
import * as E from "fp-ts/lib/Either";

describe("confidential data manager tests", () => {
    const token = "2784acb0-56e3-494b-93cb-0f8ecf3b0b8d"
    const requestMock =  {
        header: (s: string) => "CLIENT_ECOMMERCE_TEST",
        body: {
          to: "error@email.it",
          subject: "subjectTest",
          templateId: "success",
          parameters: mockReq},
        lang: {language: "IT" }
      } as any;
      
it("decrypt OK from PDV", async () => {
   jest.spyOn(apiPdvClient, 'findPiiUsingGET').mockResolvedValue({_tag: "Right", right:{ status:200 , value: {pii: JSON.stringify(requestMock.body)}, headers: "" as any} });
   const result = await decryptBody(token)();
   expect(E.isRight(result)).toBe(true);
})

it("decrypt KO from PDV", async () => {
    jest.spyOn(apiPdvClient, 'findPiiUsingGET').mockResolvedValue(E.left([]));
    const result = await decryptBody(token)();
    expect(E.isRight(result)).toBe(false);
})

it("decrypt OK from PDV with ko http status", async () => {
    jest.spyOn(apiPdvClient, 'findPiiUsingGET').mockResolvedValue({_tag: "Right", right:{ status: 403 , value: undefined, headers: "" as any} });
    const result = await decryptBody(token)();
    expect(E.isRight(result)).toBe(false);
})

it("encrypt OK from PDV", async () => {
    jest.spyOn(apiPdvClient, 'saveUsingPUT').mockResolvedValue({_tag: "Right", right:{ status: 200 , value: {token: token}, headers: "" as any} });
    const result = await encryptBody(requestMock.body)();
    expect(E.isRight(result)).toBe(true);
})

it("encrypt KO from PDV", async () => {
    jest.spyOn(apiPdvClient, 'saveUsingPUT').mockResolvedValue({_tag:"Left", left: "" as any });
    const result = await encryptBody(requestMock.body)();
    expect(E.isRight(result)).toBe(false);
})

it("encrypt OK from PDV with ko http status", async () => {
    jest.spyOn(apiPdvClient, 'saveUsingPUT').mockResolvedValue({_tag: "Right", right:{ status: 403 , value: undefined, headers: "" as any} });
    const result = await encryptBody(requestMock.body)();
    expect(E.isRight(result)).toBe(false);
})
});