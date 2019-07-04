'use strict';

import { authLambdaEvent} from "./slack-auth";
import {deleteEntry, updateState, updateSize, getContribution} from "./shared/dynamo";
const { parse } = require('querystring');

/**
 * Change state handler is a handler for slack interactive components.
 *
 * This changes states of the contributions from the forms posted to slack.
 *
 * @param event
 */
export const changeState = (event: any) => {
    if(!authLambdaEvent(event)) {
        return Promise.resolve({
            statusCode: 401,
            body: 'Invalid signature'
        })
    }
    const interaction = JSON.parse(parse(event.body).payload);
    const [id, timestamp] = interaction.callback_id.split('-');
    if(interaction.actions[0].value === 'cancel') {
        return deleteEntry(id, timestamp)
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
        return updateSize(id, timestamp, 'LARGE')
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
        return updateSize(id, timestamp, 'MEDIUM')
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
        return updateSize(id, timestamp, 'SMALL')
            .then(_ => {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: "Marked your contribution to be small. I will get back to you, when your contribution gets processed."
                    })
                }
            });
    }
    if(interaction.actions[0].value === 'competence_development') {
        return updateSize(id, timestamp, 'COMPETENCE_DEVELOPMENT')
            .then(_ => {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: 'Good to know that you use competence development hours for Open Source work.'
                    })
                }
            });
    }
    if(interaction.actions[0].value === 'accepted') {
        return getContribution(id, timestamp).then(item => {
            return updateState(id, timestamp, 'ACCEPTED')
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
                })
                .catch(() => {
                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            text: 'This contribution was deleted. This means that contributor has called rollback for the contribution. No message was sent to contributor.'
                        })
                    }
                });
        });

    }
    if(interaction.actions[0].value === 'declined') {
        return getContribution(id, timestamp).then(item => {
            return updateState(id, timestamp, 'DECLINED')
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
                })
                .catch(() => {
                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            text: 'This contribution was deleted. This means that contributor has called rollback for the contribution. No message was sent to contributor.'
                        })
                    }
                });
        });
    }
    return Promise.resolve({
        statusCode: 200,
        body: JSON.stringify({
            text: 'I received something I don\'t understand!'
        })
    });
};

