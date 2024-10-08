import {authLambdaEvent} from "../slack/slack-auth";
import {
    listContributions,
    getHelpMessage,
    openCreateContributionModal,
    LambdaResponse
} from "../slack/slack-interaction";
import {APIGatewayEvent} from "aws-lambda";
import {parse} from 'querystring';
import {InvokeCommand, LambdaClient} from "@aws-sdk/client-lambda";
import {AppConfig} from "../model/app-config";

interface SlackSlashCommandPayload {
    channel: string;
    channel_id: string;
    text: string;
    trigger_id: string;
    type: string;
    user_id: string;
}

/**
 * Slash command handler replies to slash commands in slack
 *
 * /ossi -> show help
 * /ossi list -> lists users contributions
 *
 * @param event
 */
export const handler = async (event: APIGatewayEvent): Promise<LambdaResponse> => {
    if (!await authLambdaEvent(event)) {
        return Promise.resolve({
            statusCode: 401,
            body: JSON.stringify({message: 'Invalid signature'})
        });
    }

    const interaction: SlackSlashCommandPayload = parse(event.body!!) as unknown as SlackSlashCommandPayload;

    if (interaction.text === 'list') {
        console.log('list contributions');
        return listContributions(interaction.user_id);
    }
    if (interaction.text.startsWith('new')) {
        console.log('new contribution');
        return await openCreateContributionModal(interaction.trigger_id, interaction.text.replace("new", ""), interaction.channel_id);
    }

    if (interaction.text.startsWith('report')) {
        const month = interaction.text.split(' ')[1]

        console.log('Triggering monthly report');
        const lambdaClient = new LambdaClient({region: process.env.AWS_REGION});

        // Creating report may take longer than Slack's 3s timeout, so we return 200 OK immediately
        await lambdaClient.send(new InvokeCommand({
            FunctionName: AppConfig.getEnvVar('MONTHLY_REPORT_LAMBDA_NAME'),
            Payload: JSON.stringify({descriptor: 'Monthly report ${month}', month: month}),
            InvocationType: 'Event'
        }));

        console.log('responding OK to slack');
        return Promise.resolve({
            statusCode: 200
        });
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

