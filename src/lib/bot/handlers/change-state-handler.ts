import { authLambdaEvent } from "../slack/slack-auth";
import {updateState, getContribution, createNewContribution} from "../model/contribution";
import {APIGatewayEvent} from "aws-lambda";
import {
    contributionFields,
    contributionColor, LambdaResponse
} from "../slack/slack-interaction";
import {parse} from 'querystring';

/**
 * Change state handler is a handler for slack interactive components.
 *
 * This changes states of the contributions from the forms posted to slack.
 *
 * @param event
 */
export const handler = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
    if (!await authLambdaEvent(event)) {
        return Promise.resolve({
            statusCode: 401,
            body: 'Invalid signature'
        })
    }
    const interaction = JSON.parse(parse(event.body!!).payload as string);

    // Adding new contribution, send notification to user
    if (interaction.type === 'view_submission') {
        console.log('Adding new contribution');
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
        console.log(`Accepted contribution ${id}-${timestamp}`);
        return getContribution(id, timestamp).then(async item => {
            try {
                await updateState(id, timestamp, 'ACCEPTED');
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
                };
            } catch(err) {
                console.error(err);
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: 'This contribution was deleted. No message was sent to contributor.'
                    })
                };
            }
        });

    }
    if (interaction.actions[0].value === 'declined') {
        console.log(`Declined contribution ${id}-${timestamp}`);

        return getContribution(id, timestamp).then(async item => {
            try {
                const _ = await updateState(id, timestamp, 'DECLINED');
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
                };
            } catch(err) {
                console.error(err);
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        text: 'This contribution was deleted. No message was sent to contributor.'
                    })
                };
            }
        });
    }
    return Promise.resolve({
        statusCode: 200,
        body: JSON.stringify({
            text: 'I received something I don\'t understand!'
        })
    });
};
