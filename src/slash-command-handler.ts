'use strict';

import { authLambdaEvent} from "./slack-auth";
import {listContributions, replyWithHelp, rollbackContribution} from "./shared/slack-interaction";
const { parse } = require('querystring');

type SlackSlashCommandPayload = {
    text: string;
    user_id: string;
}
/**
 * Slash command handler replies to slash commands in slack
 *
 * /ossi -> shwo help
 * /ossi list -> lists users contributions
 * /ossi rollback -> deletes contribution
 *
 * @param event
 */
export const handleSlashCommand = (event: any) => {
    if(!authLambdaEvent(event)) {
        return Promise.resolve({
            statusCode: 401,
            body: JSON.stringify({message: 'Invalid signature'})
        });
    }
    const interaction: SlackSlashCommandPayload = parse(event.body);

    if(interaction.text.startsWith('rollback')) {
        const rollbackId = interaction.text.split(' ')[1];
        return rollbackContribution(rollbackId);
    }

    if(interaction.text === 'list') {
        return listContributions(interaction.user_id);
    }
    return replyWithHelp();
};

