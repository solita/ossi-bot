'use strict';

import { authLambdaEvent} from "./slack-auth";
import { deleteEntry, getContributions } from "./dynamo";
const { parse } = require('querystring');

export const handleSlashCommand = (event: any) => {
    if(!authLambdaEvent(event)) {
        return Promise.resolve({
            statusCode: 401,
            body: JSON.stringify({message: 'Invalid signature'})
        });
    }
    const interaction = parse(event.body);

    if(interaction.text.startsWith('rollback')) {
        const idstring = interaction.text.split(' ')[1];
        if(!idstring) {
            return Promise.resolve({
                statusCode: 200,
                body: JSON.stringify({
                    "response_type": "ephemeral",
                    "text": "Pass rollback id to delete entry"
                })
            });
        }
        const [id, seq] = idstring.split('-');
        return deleteEntry(id, seq)
            .then(_ => {
                return Promise.resolve({
                    statusCode: 200,
                    body: JSON.stringify({
                        "response_type": "ephemeral",
                        "text": `OK, deleted ${idstring}`
                    })
                });
            })
    }

    if(interaction.text === 'list') {
        return getContributions(interaction.user_id).then((results) => {
            const response = {
                text: results.Items.length === 0 ?
                    'You do not have any submissions. Submit one by sending an IM to OSSI Bot!' :
                    'Here is the listing of your open source contribution submissions',
                attachments: results.Items.map((item) => {
                    return {
                        fallback: 'fallback',
                        color: "#36a64f",
                        text: item.text,
                        fields: [
                            {
                                title: "Status",
                                value: item.status,
                                short: true
                            },
                            {
                                title: "Rollback ID",
                                value: `${item.id}-${item.sequence}`,
                                short: true
                            }
                        ]
                    };
                })
            };
            return {
                statusCode: 200,
                body: JSON.stringify(response)
            };
        });
    }
    return Promise.resolve({
        statusCode: 200,
        body: JSON.stringify({
            "response_type": "ephemeral",
            "text": "Hello, my name is OSSI and I record Open Source Contributions you have made. Real deployment would include good instructions and such here."
        })
    });
};

