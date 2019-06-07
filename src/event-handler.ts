'use strict';

import {authLambdaEvent} from "./slack-auth";
import axios from 'axios';
import {writeContribution} from './dynamo';


export const handleEvent = (event: any) => {
    if (!authLambdaEvent(event)) {
        return Promise.resolve({
            statusCode: 401,
            body: JSON.stringify({message: 'Invalid signature'})
        })
    }
    const body = JSON.parse(event.body);
    console.log(JSON.stringify(body));
    if (body.challenge) {
        return Promise.resolve(
            {
                statusCode: 200,
                body: JSON.stringify({challenge: body.challenge})
            });
    }

    return new Promise(resolve => {
        if (body.event.subtype === 'bot_message' || body.event.text.length < 2) {
            return Promise.resolve({statusCode: 200});
        }
        if (body.event.text) {
            writeContribution(body.event.user, body.event.text).then((eventId) => {
                return axios.post('https://slack.com/api/chat.postMessage',
                    {
                        text: `Hi there! I received a contribution from you?`,
                        attachments: [
                            {
                                text: `${body.event.text}...`,
                                fallback: "Something went wrong",
                                callback_id: eventId,
                                color: "#3AA3E3",
                                attachment_type: "default",
                                actions: [
                                    {
                                        name: "STATE",
                                        text: "Nah, don't send this",
                                        type: "button",
                                        value: "cancel"
                                    },
                                    {
                                        name: "STATE",
                                        text: "Large $$$",
                                        type: "button",
                                        value: "large"
                                    },
                                    {
                                        name: "STATE",
                                        text: "Medium $$$",
                                        type: "button",
                                        value: "medium"
                                    },
                                    {
                                        name: "STATE",
                                        text: "No $$$",
                                        type: "button",
                                        value: "no"
                                    }
                                ]
                            }
                        ],

                        channel: body.event.channel
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${process.env.SLACK_TOKEN}`
                        }
                    });
            })
                .then(r => resolve({statusCode: 200}))
        } else {
            resolve({
                statusCode: 200
            });
        }
    });


    return Promise.resolve({
        statusCode: 200
    });
};
