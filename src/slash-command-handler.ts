'use strict';

import { authLambdaEvent } from "./slack-auth";
import { listContributions, LambdaResponse, postModalBlock } from "./shared/slack-interaction";
const { parse } = require('querystring');
import { Config } from "./shared/config";

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

/**
 * Replies with help text
 */
const replyWithHelp = (): Promise<LambdaResponse> => {
    // KLUDGE: environment should be mocked for tests, because Config is fail fast
    let version;
    let environment;

    try {
      version = Config.get('VERSION');
      environment = Config.get('ENVIRONMENT');
    } catch (e) {
        console.error("Something went wrong with fetching config", e);
    }

    const helpMessage = [
        "*Hi there!*",
        "",
        "My name is Ossi (a.k.a Ossitron-2000) :robot_face:, and I'm here to record your Open Source Contributions. :gem:",
        "",
        "First use slash command /ossi new and then fill the modal inputs. You can also type the description field after new-word",
        "",
        " * Description of the contribution",
        " * URL of contribution",
        " * Contribution month",
        " * Contribution compensation from medium_200€/small_50€/no_compensation / competence_development_hours",
        "",
        "If you decide to submit, I will store the contribution to DynamoDB and notify my management channel for sanity check your contribution.",
        "",
        "When your contribution gets processed, I will notify you back.", ,
        "",
        "If you have questions about the process contact Valtteri Valovirta. If I'm broken contact Juho Friman.",
        "",
        "I have additional features under this slash command. My slash commands are all _ephemeral_ which means only you see the results. So feel free to shoot slash commands at any channel.",
        "",
        "`help` shows this help",
        "`list` lists your submitted contributions",
        "`new #description_here#`  subscribe new contribution",
        "",
        "I'm deployed into :aws-super-hero: AWS Cloud to `eu-north-1` region to Solita Sandbox account. I'm built of Node.js, Typescript, Serverless, Api Gateway, Lambda and DynamoDB.",
        "",
        "_Information about the policy_: https://intra.solita.fi/pages/viewpage.action?pageId=76514684",
        "_My source code_: https://github.com/solita/ossi-bot",
        `_Deployment_: ${version} ${environment}`
    ].join('\n');
    return Promise.resolve({
        statusCode: 200,
        body: helpMessage
    })
}

