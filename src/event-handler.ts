'use strict';

import { authLambdaEvent } from "./slack-auth";
import { replyWithHelp } from "./shared/slack-interaction";

/**
 * Event handler listens to private conversations between solitan and Ossi.
 *
 * This is the handler, that registers new contributions.
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

    if (!body.event.text) {
        console.info('Message without text');
        console.info(JSON.stringify(body, null, 2));
        return Promise.resolve({ statusCode: 200 });
    }
    return replyWithHelp();
};
