'use strict';

import { authLambdaEvent } from "./shared/slack-auth";
import {updateState, getContribution, createNewContribution} from "./shared/dynamo";
import {APIGatewayEvent} from "aws-lambda";
import {
    contributionFields,
    contributionColor, LambdaResponse
} from "./shared/slack-interaction";
const { parse } = require('querystring');

/**
 * Change state handler is a handler for slack interactive components.
 *
 * This changes states of the contributions from the forms posted to slack.
 *
 * @param event
 */
export const changeState = (event: APIGatewayEvent): Promise<LambdaResponse> => {
    if (!authLambdaEvent(event)) {
        return Promise.resolve({
            statusCode: 401,
            body: 'Invalid signature'
        })
    }
    const interaction = JSON.parse(parse(event.body).payload);

    // Adding new contribution, send notification to user
    if (interaction.type === 'view_submission') {

        const desc = interaction.view.state.values.desc_input.description.value;
        const url = interaction.view.state.values.url_input.url.value;
        const month = interaction.view.state.values.comp_month_input.comp_month_val.selected_option.value;
        const level = interaction.view.state.values.comp_lvl_input.comp_lvl_val.selected_option.value;

        return createNewContribution({
            url,
            id: interaction.user.id,
            text: desc,
            contributionMonth: month,
            size: level
        }).then(() => ({ statusCode: 200 }))
    }

    // These commands are accept/decline from management channel
    const [id, timestamp] = interaction.callback_id.split('-');

    if (interaction.actions[0].value === 'accepted') {
        return getContribution(id, timestamp).then(item => {
            return updateState(id, timestamp, 'ACCEPTED')
                .then(_ => {
                    item.status = 'ACCEPTED';
                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            attachments: [
                                {
                                    color: contributionColor(item),
                                    pretext: "Accepted contribution",
                                    author_name: item.username,
                                    text: item.text,
                                    fields: contributionFields(item)
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
                    item.status = 'DECLINED';
                    return {
                        statusCode: 200,
                        body: JSON.stringify({
                            attachments: [
                                {
                                    color: contributionColor(item),
                                    pretext: "Declined contribution",
                                    author_name: item.username,
                                    text: item.text,
                                    fields: contributionFields(item)
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
