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

    if (body.event.subtype === 'bot_message') {
        console.log('Bot message, nothing to do');
        return Promise.resolve({statusCode: 200});
    }

    return new Promise(resolve => {

        if (body.event.text) {
            if (body.event.text.length < 50) {
                axios.post('https://slack.com/api/chat.postMessage', {
                    text: 'Hmm, that seems bit short description of your Open Source Contribution. Could you elaborate?',
                    channel: body.event.channel
                }, {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${process.env.SLACK_TOKEN}`
                    }
                }).then(r => resolve({statusCode: 200}));
            } else {
                writeContribution(body.event.user, body.event.text, body.event.channel).then((eventId) => {
                    return axios.post('https://slack.com/api/chat.postMessage',
                        {
                            text: `Hi there! Did I received a contribution from you? Do you want me to submit this one?`,
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
                                            text: "Don't send this",
                                            type: "button",
                                            value: "cancel",
                                            style: "danger"
                                        },
                                        {
                                            name: "STATE",
                                            text: "Medium bonus - 200 €",
                                            type: "button",
                                            value: "medium",
                                            style: "primary"
                                        },
                                        {
                                            name: "STATE",
                                            text: "Small bonus - 50 €",
                                            type: "button",
                                            value: "small",
                                            style: "primary"
                                        },
                                        {
                                            name: "STATE",
                                            text: "No €, just wanted to let you know",
                                            type: "button",
                                            value: "no",
                                            style: "primary"
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
                }).catch(err => {
                    return axios.post('https://slack.com/api/chat.postMessage',
                        {
                            text: `Sorry. Something is not right. :scream_cat:`,
                            channel: body.event.channel
                        },
                        {
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${process.env.SLACK_TOKEN}`
                            }
                        });
                }).then(r => resolve({statusCode: 200}))
            }
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
