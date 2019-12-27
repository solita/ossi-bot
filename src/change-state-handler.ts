'use strict';

import { authLambdaEvent } from "./shared/slack-auth";
import { updateState, updateSize, getContribution, writeContribution } from "./shared/dynamo";
import { Config } from "./shared/config";
import {APIGatewayEvent} from "aws-lambda";
import {
    postInstantMessage,
    slackMessageFromLines,
    contributionFields,
    contributionColor
} from "./shared/slack-interaction";
const { parse } = require('querystring');

const sizeConstants = {
    large: slackMessageFromLines([
      "*You terrible hacker*",
      "",
      "LARGE contributions are not supported :police_car:"
    ]),
    medium: slackMessageFromLines([
      "*Hi!*",
      "",
      "I received a medium sized contribution from you. Ossi loves to process these :heart:",
      "I will get back to you, when your contribution gets processed.",
      "",
      `All accepted contributions are posted to ${Config.get("PUBLIC_CHANNEL")}.`
    ]),
    small: slackMessageFromLines([
      "*Hi!*",
      "",
      "I received a small sized contribution from you :heart: :diamond:",
      "I will get back to you, when your contribution gets processed.",
      "",
      `All accepted contributions are posted to ${Config.get("PUBLIC_CHANNEL")}.`
    ]),
    no_compensation: slackMessageFromLines([
      "*Hi!*",
      "",
      "I received a no compensation contribution from you. It's good to share knowledge about your open source work.",
      "Eventhough you did not request compensation, I will get back to you, when your contribution gets processed, because I want to spread knowledge about your work.",
      "",
      `All accepted contributions are posted to ${Config.get("PUBLIC_CHANNEL")}.`
    ]),
    competence_development: slackMessageFromLines([
      "*Hi!*",
      "",
      "Good to know that you use competence development hours for Open Source work.",
      "You don't get compensation when using competence development hours for OSS work, but I'll shoot you a message, when your contribution gets processed.",
      "",
      `All accepted contributions are posted to ${Config.get("PUBLIC_CHANNEL")}.`
    ]),
}
/**
 * Change state handler is a handler for slack interactive components.
 *
 * This changes states of the contributions from the forms posted to slack.
 *
 * @param event
 */
export const changeState = (event: APIGatewayEvent) => {
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

        return writeContribution(interaction.user.id, desc, url, month).then((eventId) => {
            const [contributionId, contributionTimestamp] = eventId.split('-');
            const levelText = level === 'LARGE' ? sizeConstants.large : level === 'MEDIUM' ? sizeConstants.medium : level === 'SMALL' ? sizeConstants.small : level === 'COMPETENCE_DEVELOPMENT' ? sizeConstants.competence_development : sizeConstants.no_compensation;
            return updateSize(contributionId, contributionTimestamp, level)
                .then(() => {
                    return postInstantMessage(interaction.user.id, levelText);
                });
        });
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
