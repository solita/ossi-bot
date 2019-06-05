'use strict';

export const help = (event: any) => {
    return Promise.resolve({
        statusCode: 200,
        body: JSON.stringify({
            "response_type": "ephemeral",
            "text": "Hello, my name is OSSI and I record Open Source Contributions you have made."
        })
    });
};

