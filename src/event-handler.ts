'use strict';

import {authLambdaEvent} from "./slack-auth";
import {writeContribution} from './shared/dynamo';
import {postMessage} from "./shared/slack-interaction";

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
            body: JSON.stringify({message: 'Invalid signature'})
        })
    }
    const body = JSON.parse(event.body);

    if (body.challenge) {
        console.info('Challenge request received');
        return Promise.resolve(
            {
                statusCode: 200,
                body: JSON.stringify({challenge: body.challenge})
            });
    }

    if (body.event.subtype === 'bot_message') {
        console.info('Bot message, nothing to do');
        return Promise.resolve({statusCode: 200});
    }

    if(!body.event.text) {
        console.info('Message without text');
        console.info(JSON.stringify(body, null, 2));
        return Promise.resolve({statusCode: 200});
    }

    if (body.event.text.length < 50) {
        return postMessage(body.event.channel,
            'Hmm, that seems bit short description of your Open Source Contribution. Could you elaborate?');
    } 
        return writeContribution(body.event.user, body.event.text, body.event.channel).then((eventId) => {
            return postMessage(body.event.channel,
                'Do you want me to submit this one?',
                [
                    {
                        text: `${body.event.text}`,
                        fallback: "Something went wrong",
                        callback_id: eventId,
                        color: "#3AA3E3",
                        attachment_type: "default",
                        actions: [
                            {
                                name: "STATE",
                                text: "Don't send this",
                                type: "button",
                                value: "cancel",
                                style: "danger"
                            },
                            {
                                name: "STATE",
                                text: "Medium bonus - 200 € :moneybag: :moneybag: :moneybag:",
                                type: "button",
                                value: "medium",
                                style: "primary"
                            },
                            {
                                name: "STATE",
                                text: "Small bonus - 50 € :moneybag:",
                                type: "button",
                                value: "small",
                                style: "primary"
                            },
                            {
                                name: "STATE",
                                text: "No compensation",
                                type: "button",
                                value: "no_compensation",
                                style: "primary"
                            },
                            {
                                name: "STATE",
                                text: "Competence development hours",
                                type: "button",
                                value: "competence_development",
                                style: "primary"
                            }
                        ]
                    }
                ]
            )
        });
    
};
