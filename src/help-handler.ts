'use strict';

import { verifySignature, getSecret } from "./slack-auth";

export const help = (event: any) => {
    if(!verifySignature(
        event.headers['X-Slack-Signature'],
        getSecret(),
        `v0:${event.headers['X-Slack-Request-Timestamp']}:${event.body}`)) {
        return Promise.resolve({
            statusCode: 401,
            body: 'Invalid signature'
        })
    }
    return Promise.resolve({
        statusCode: 200,
        body: JSON.stringify({
            "response_type": "ephemeral",
            "text": "Hello, my name is OSSI and I record Open Source Contributions you have made."
        })
    });
};

