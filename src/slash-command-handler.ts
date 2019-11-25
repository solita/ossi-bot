'use strict';

import { authLambdaEvent } from "./slack-auth";
import { listContributions, replyWithHelp, postModalBlock, postMessage } from "./shared/slack-interaction";
const { parse } = require('querystring');

type SlackSlashCommandPayload = {
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
 * /ossi rollback -> deletes contribution
 *
 * @param event
 */
export const handleSlashCommand = (event: any) => {
    if (!authLambdaEvent(event)) {
        return Promise.resolve({
            statusCode: 401,
            body: JSON.stringify({ message: 'Invalid signature' })
        });
    }
    const interaction: SlackSlashCommandPayload = parse(event.body);

    if (interaction.text.startsWith('rollback')) {
        return Promise.resolve({
            statusCode: 200,
            body: JSON.stringify({
                statusCode: 200,
                text: 'Sorry, no rollbacks for you my friend!'
            })
        })
    }

    if (interaction.text === 'list') {
        return listContributions(interaction.user_id);
    }
    if (interaction.text.startsWith('new')) {
        return postModalBlock(interaction.trigger_id, interaction.text.replace("new", ""), interaction.channel_id);
    }

    return replyWithHelp();
};

