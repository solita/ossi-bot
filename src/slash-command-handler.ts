'use strict';

import { authLambdaEvent} from "./slack-auth";
import {listContributions, replyWithHelp} from "./shared/slack-interaction";
const { parse } = require('querystring');

interface SlackSlashCommandPayload {
    text: string;
    user_id: string;
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
    if(!authLambdaEvent(event)) {
        return Promise.resolve({
            statusCode: 401,
            body: JSON.stringify({message: 'Invalid signature'})
        });
    }
    const interaction: SlackSlashCommandPayload = parse(event.body);

    if(interaction.text.startsWith('rollback')) {
        return Promise.resolve({
            statusCode: 200,
            body: JSON.stringify({
                statusCode: 200,
                text: 'Sorry, no rollbacks for you my friend!'
            })
        })
    }

    if(interaction.text === 'list') {
        return listContributions(interaction.user_id);
    }
    return replyWithHelp();
};

