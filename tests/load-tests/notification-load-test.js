import http from 'k6/http';
import { check } from 'k6';

export let options = {
    stages: [
        { duration: __ENV.STAGE_0_DURATION, target: __ENV.STAGE_0_VU }, 
        { duration: __ENV.STAGE_1_DURATION, target: __ENV.STAGE_1_VU },
        { duration: __ENV.STAGE_2_DURATION, target: __ENV.STAGE_2_VU },
    ],
};


export function setup() {
    return {
    };
}

export default function () {
    const urlBasePath = __ENV.URL_BASE_PATH
    const bodyRequest =  {
      from: __ENV.TEST_MAIL_FROM,
      to: __ENV.TEST_MAIL_TO,
      templateId: "poc-1",
      pspName: "pspName",
      amount: 100,
      transactionId: true
    }

    const headersParams = {
        headers: {
            'Content-Type': 'application/json',
            'X-Client-Id': 'CLIENT_ECOMMERCE'
        },
    };

    // Send notification request
    const notificationRequestResponse = http.post(`${urlBasePath}/emails`, JSON.stringify(bodyRequest), headersParams);

    check(notificationRequestResponse, { 'notificationRequestResponse status is 200': (r) => r.status === 200 });

    if (notificationRequestResponse.status != 200) { // Log errors
        console.log("notificationRequestResponse: " + notificationRequestResponse.status);
        console.log(JSON.stringify(notificationRequestResponse.json()));
    }
}
