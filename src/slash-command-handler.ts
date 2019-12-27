'use strict';

import { authLambdaEvent } from "./shared/slack-auth";
import { listContributions, getHelpMessage, postModalBlock, LambdaResponse } from "./shared/slack-interaction";
import {APIGatewayEvent} from "aws-lambda";
const { parse } = require('querystring');

interface SlackSlashCommandPayload {
    text: string;
    user_id: string;
    channel_id: string;
    trigger_id: string;
    channel: string;
    type: string;
}

/**
 * Slash command handler replies to slash commands in slack
 *
 * /ossi -> show help
 * /ossi list -> lists users contributions
 *
 * @param event
 */
export const handleSlashCommand = (event: APIGatewayEvent): Promise<LambdaResponse> => {
    if (!authLambdaEvent(event)) {
        return Promise.resolve({
            statusCode: 401,
            body: JSON.stringify({ message: 'Invalid signature' })
        });
    }
    const interaction: SlackSlashCommandPayload = parse(event.body);

    if (interaction.text === 'list') {
        return listContributions(interaction.user_id);
    }
    if (interaction.text.startsWith('new')) {
        return postModalBlock(interaction.trigger_id, interaction.text.replace("new", ""), interaction.channel_id);
    }

    return replyWithHelp();
};

/**
 * Replies with help text
 */
const replyWithHelp = (): Promise<LambdaResponse> => {
    return Promise.resolve({
        statusCode: 200,
        body: getHelpMessage()
    });
};

