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
                    'You do not have any submissions. Submit one by sending a private message to Ossitron-2000!' :
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
    const helpMessage = [
        "*Hi there!*",
        "My name is Ossi :robot_face:, and I'm here to record your Open Source Contributions.",
        "",
        "You can send me a *private message* which describes your contribution. Then I will ask you, if you want to submit given contribution. " +
        "If you decide to submit, I will store the contribution to DynamoDB and notify my management channel about new contribution.",
        "When your contribution gets processed, I will notify you back.",
        "",
        "I have additional features under this slash command",
        "",
        "`list` lists your submitted contibutions",
        "`rollback ROLLBACK_ID` removes your contribution with given rollback id (don't use this unless you exactly know, what you are doing)",
        "",
        "_Information about the policy_: https://intra.solita.fi/pages/viewpage.action?pageId=76514684",
        "_My source code_: https://github.com/solita/ossi-bot _(not yet published)_"
    ].join('\n');
    return Promise.resolve({
        statusCode: 200,
        body: JSON.stringify({
            "response_type": "ephemeral",
            "text": helpMessage
        })
    });
};

