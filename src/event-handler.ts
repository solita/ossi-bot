'use strict';

import { authLambdaEvent } from "./slack-auth";
import { postMessage, slackMessageFromLines } from "./shared/slack-interaction";

/**
 * Event handler listens to private conversations between solitan and Ossi.
 *
 * @param event
 */
export const handleEvent = (event: any) => {
    if (!authLambdaEvent(event)) {
        return Promise.resolve({
            statusCode: 401,
            body: JSON.stringify({ message: 'Invalid signature' })
        })
    }
    const body = JSON.parse(event.body);

    if (body.challenge) {
        console.info('Challenge request received');
        return Promise.resolve(
            {
                statusCode: 200,
                body: JSON.stringify({ challenge: body.challenge })
            });
    }

    if (body.event.subtype === 'bot_message') {
        console.info('Bot message, nothing to do');
        return Promise.resolve({ statusCode: 200 });
    }

    // As of december 2019, we don't talk directly to Ossi anymore
    // Just return a help message, that informs user to use `/ossi new`
    const botResponse = slackMessageFromLines([
        "*I have been improved!*",
        "",
        "I dont anymore read your contributions from direct messages.",
        "Instead, plese use `/ossi new` command in any channel. This command opens a neat modal for you to create contribution.",
        "",
        "Have fun!"
    ]);

    return postMessage(body.event.channel, botResponse);
};
