'use strict';

import { authLambdaEvent} from "./slack-auth";
import {deleteEntry, updateState, updateSize, getContribution} from "./shared/dynamo";
const { parse } = require('querystring');

export const changeState = (event: any) => {
    if(!authLambdaEvent(event)) {
        return Promise.resolve({
            statusCode: 401,
            body: 'Invalid signature'
        })
    }
    const interaction = JSON.parse(parse(event.body).payload);
    const [id, seq] = interaction.callback_id.split('-');
    if(interaction.actions[0].value === 'cancel') {
        return deleteEntry(id, seq)
            .then(_ => {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: 'Ok - I deleted your submitted text. Feel free to send a new one.'
                    })
                }
            });
    }
    if(interaction.actions[0].value === 'large') {
        return updateSize(id, seq, 'LARGE')
            .then(_ => {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: 'Marked this contribution to be a large one (this is currently not supported)'
                    })
                }
            });
    }
    if(interaction.actions[0].value === 'medium') {
        return updateSize(id, seq, 'MEDIUM')
            .then(_ => {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: "Marked your contribution to be medium. I will get back to you, when your contribution gets processed."
                    })
                }
            });
    }
    if(interaction.actions[0].value === 'small') {
        return updateSize(id, seq, 'SMALL')
            .then(_ => {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: "Marked your contribution to be small. I will get back to you, when your contribution gets processed."
                    })
                }
            });
    }
    if(interaction.actions[0].value === 'no') {
        return updateSize(id, seq, 'NO')
            .then(_ => {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: 'Good to know, that you are up to something. Ossitron-2000 appreciates.'
                    })
                }
            });
    }
    if(interaction.actions[0].value === 'accepted') {
        return getContribution(id, seq).then(item => {
            return updateState(id, seq, 'ACCEPTED')
                .then(_ => {
                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            attachments: [
                                {
                                    color: "#36a64f",
                                    pretext: "Accepted contribution",
                                    author_name: item.username,
                                    text: item.text,
                                    fields: [
                                        {
                                            title: "Size",
                                            value: item.size,
                                            short: true
                                        },
                                        {
                                            title: "Status",
                                            value: 'ACCEPTED',
                                            short: true
                                        }
                                    ]
                                }
                            ]
                        })
                    }
                });
        });

    }
    if(interaction.actions[0].value === 'declined') {
        return getContribution(id, seq).then(item => {
            return updateState(id, seq, 'DECLINED')
                .then(_ => {
                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            attachments: [
                                {
                                    color: "#ff0000",
                                    pretext: "Declined contribution",
                                    author_name: item.username,
                                    text: item.text,
                                    fields: [
                                        {
                                            title: "Size",
                                            value: item.size,
                                            short: true
                                        },
                                        {
                                            title: "Status",
                                            value: 'DECLINED',
                                            short: true
                                        }
                                    ]
                                }
                            ]
                        })
                    }
                });
        });
    }
    return Promise.resolve({
        statusCode: 200,
        body: JSON.stringify({
            text: 'I received something I don\'t understands!'
        })
    });
};

