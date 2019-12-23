'use strict';

import { authLambdaEvent } from "./slack-auth";
import { updateState, updateSize, getContribution, writeContribution } from "./shared/dynamo";
import { Config } from "./shared/config";

import { postInstantMessage } from "./shared/slack-interaction";
const { parse } = require('querystring');
const sizeConstants = {
    large: 'Marked this contribution to be a large one (this is currently not supported)',
    medium: `Marked your contribution to be medium. I will get back to you, when your contribution gets processed. All accepted contributions are posted to ${Config.get("PUBLIC_CHANNEL")}.`,
    small: `Marked your contribution to be small. I will get back to you, when your contribution gets processed.  All accepted contributions are posted to ${Config.get("PUBLIC_CHANNEL")}.`,
    no_compensation: `Marked your contribution to be no compensation. Even though you did not request for compensation, I'll shoot you a message, when your contribution gets processed. All accepted contributions are posted to ${Config.get("PUBLIC_CHANNEL")}.`,
    competence_development: `Good to know that you use competence development hours for Open Source work. You don't get compensation when using competence development hours for OSS work, but I'll shoot you a message, when your contribution gets processed. All accepted contributions are posted to ${Config.get("PUBLIC_CHANNEL")}.`
}
/**
 * Change state handler is a handler for slack interactive components.
 *
 * This changes states of the contributions from the forms posted to slack.
 *
 * @param event
 */
export const changeState = (event: any) => {
    if (!authLambdaEvent(event)) {
        return Promise.resolve({
            statusCode: 401,
            body: 'Invalid signature'
        })
    }
    const interaction = JSON.parse(parse(event.body).payload);

    if (interaction.type === 'view_submission') {

        const desc = interaction.view.state.values.desc_input.description.value;
        const url = interaction.view.state.values.url_input.url.value;
        const month = interaction.view.state.values.comp_month_input.comp_month_val.selected_option.value;
        const level = interaction.view.state.values.comp_lvl_input.comp_lvl_val.selected_option.value;

        return writeContribution(interaction.user.id, desc, url, month).then((eventId) => {
            const [contributionId, contributionTimestamp] = eventId.split('-');
            const levelText = level === 'LARGE' ? sizeConstants.large : level === 'MEDIUM' ? sizeConstants.medium : level === 'SMALL' ? sizeConstants.small : level === 'COMPETENCE_DEVELOPMENT' ? sizeConstants.competence_development : sizeConstants.no_compensation;
            return updateSize(contributionId, contributionTimestamp, level)
                .then(() => {
                    return postInstantMessage(interaction.user.id, levelText);
                });
        });
    }
    const [id, timestamp] = interaction.callback_id.split('-');
    
    if (interaction.actions[0].value === 'large') {
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
    if (interaction.actions[0].value === 'medium') {
        return updateSize(id, timestamp, 'MEDIUM')
            .then(_ => {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: `Marked your contribution to be medium. I will get back to you, when your contribution gets processed. All accepted contributions are posted to ${Config.get("PUBLIC_CHANNEL")}.`
                    })
                }
            });
    }
    if (interaction.actions[0].value === 'small') {
        return updateSize(id, timestamp, 'SMALL')
            .then(_ => {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: `Marked your contribution to be small. I will get back to you, when your contribution gets processed.  All accepted contributions are posted to ${Config.get("PUBLIC_CHANNEL")}.`
                    })
                }
            });
    }
    if (interaction.actions[0].value === 'no_compensation') {
        return updateSize(id, timestamp, 'NO_COMPENSATION')
            .then(_ => {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: `Marked your contribution to be no compensation. Even though you did not request for compensation, I'll shoot you a message, when your contribution gets processed. All accepted contributions are posted to ${Config.get("PUBLIC_CHANNEL")}.`
                    })
                }
            });
    }
    if (interaction.actions[0].value === 'competence_development') {
        return updateSize(id, timestamp, 'COMPETENCE_DEVELOPMENT')
            .then(_ => {
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: `Good to know that you use competence development hours for Open Source work. You don't get compensation when using competence development hours for OSS work, but I'll shoot you a message, when your contribution gets processed. All accepted contributions are posted to ${Config.get("PUBLIC_CHANNEL")}.`
                    })
                }
            });
    }
    if (interaction.actions[0].value === 'accepted') {
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
                            text: 'This contribution was deleted. No message was sent to contributor.'
                        })
                    }
                });
        });

    }
    if (interaction.actions[0].value === 'declined') {
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
                            text: 'This contribution was deleted. No message was sent to contributor.'
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

