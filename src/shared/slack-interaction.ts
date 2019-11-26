import { deleteEntry, getContributions } from "./dynamo";
import axios from "axios";
import * as moment from 'moment-timezone';
import { Config } from "./config";

export type LambdaResponse = {
    statusCode: number,
    body: string
}

export function postMessage(channel: string, message: string, attachments: any = []): Promise<any> {
    return axios.post('https://slack.com/api/chat.postMessage', {
        text: message,
        channel: channel,
        attachments: attachments
    }, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Config.get('SLACK_TOKEN')}`
        }
    }).then(() => ({ statusCode: 200 }));
}

export function postInstantMessage(user: string, message: string): Promise<any> {
    return axios.post('https://slack.com/api/im.open', {
        user: user
    }, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Config.get('SLACK_TOKEN')}`
        }
    }).then((result) => {
        return axios.post('https://slack.com/api/chat.postMessage', {
            text: message,
            channel: result.data.channel.id
        }, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Config.get('SLACK_TOKEN')}`
            }
        }).then(() => ({ statusCode: 200 }));
    });
}

export function postMessageBlocks(channel: string, message: string, blocks: any = []): Promise<any> {
    return axios.post('https://slack.com/api/chat.postMessage', {
        text: message,
        channel: channel,
        blocks: blocks
    }, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Config.get('SLACK_TOKEN')}`
        }
    }).then(() => ({ statusCode: 200 }));
}

export function postModalBlock(trigger: any, initial?: string, channel?: string): Promise<any> {
    const currMonthName = moment().format('MMMM');
    const prevMonthName = moment().subtract(1, "month").format('MMMM');
    // const currentDate = moment().format('YYYY-MM-DD-HH-')
    // const monthOptions = moment().isBetween(moment()
    const initInput = initial ? initial : '';
    return axios.post('https://slack.com/api/views.open', {
        trigger_id: trigger,
        //channel: channel,
        view: {
            type: "modal",
            callback_id: channel ? channel : '',
            title: {
                type: "plain_text",
                text: "OS Contribution",
                emoji: true
            },
            submit: {
                type: "plain_text",
                text: "Submit",
                emoji: true
            },
            close: {
                type: "plain_text",
                text: "Cancel",
                emoji: true
            },
            blocks: [
                {
                    type: "input",
                    block_id: "desc_input",
                    element: {
                        type: "plain_text_input",
                        action_id: "description",
                        placeholder: {
                            type: "plain_text",
                            text: "Description"
                        },
                        multiline: true,
                        min_length: 50,
                        initial_value: initInput
                    },

                    label: {
                        type: "plain_text",
                        text: "OS Description"
                    }
                },
                {
                    type: "divider"
                },
                {
                    type: "input",
                    block_id: "url_input",
                    element: {
                        type: "plain_text_input",
                        action_id: "url",
                        placeholder: {
                            type: "plain_text",
                            text: "OS contribution URL"
                        }
                    },
                    label: {
                        type: "plain_text",
                        text: "URL"
                    }
                },
                {
                    type: "divider"
                },
                {
                    type: "input",
                    block_id: "comp_month_input",
                    label: {
                        type: "plain_text",
                        text: "Pick compensation month"
                    },
                    element: {
                        type: "static_select",
                        action_id: "comp_month_val",
                        placeholder: {
                            type: "plain_text",
                            text: "Select compensation month",
                            emoji: true
                        },
                        options: [
                            {
                                text: {
                                    type: "plain_text",
                                    text: currMonthName,
                                    emoji: true
                                },
                                value: "current_month"
                            },
                            {
                                text: {
                                    type: "plain_text",
                                    text: prevMonthName,
                                    emoji: true
                                },
                                value: "prev_month"
                            },
                        ]
                    }
                },

                {
                    type: "divider"
                },
                {
                    type: "input",
                    block_id: "comp_lvl_input",
                    label: {
                        type: "plain_text",
                        text: "Pick compensation level"
                    },
                    element: {
                        type: "static_select",
                        action_id: "comp_lvl_val",
                        placeholder: {
                            type: "plain_text",
                            text: "Select compensation level",
                            emoji: true
                        },
                        options: [
                            {
                                text: {
                                    type: "plain_text",
                                    text: "No compensation",
                                    emoji: true
                                },
                                value: "NO_COMPENSATION"
                            },
                            {
                                text: {
                                    type: "plain_text",
                                    text: "Competence development hours",
                                    emoji: true
                                },
                                value: "COMPETENCE_DEVELOPMENT"
                            },
                            {
                                text: {
                                    type: "plain_text",
                                    text: ":white_check_mark: Small bonus - 50 € :moneybag:",
                                    emoji: true
                                },
                                value: "SMALL"
                            },
                            {
                                text: {
                                    type: "plain_text",
                                    text: ":white_check_mark: Medium bonus - 200 € :moneybag: :moneybag: :moneybag:"
                                },
                                value: "MEDIUM"
                            }
                        ]
                    }
                },

            ]
        }
    }, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Config.get('SLACK_TOKEN')}`
        }
    }).then(() => ({ statusCode: 200 }));
}
/**
 * Deletes given contribution from the dynamodb
 *
 * @param rollbackId
 */
export function rollbackContribution(rollbackId: string): Promise<LambdaResponse> {
    if (!rollbackId) {
        return Promise.resolve({
            statusCode: 200,
            body: JSON.stringify({
                "response_type": "ephemeral",
                "text": "Pass rollback id to delete entry"
            })
        });
    }
    const [id, seq] = rollbackId.split('-');
    return deleteEntry(id, seq)
        .then(() => {
            return Promise.resolve({
                statusCode: 200,
                body: JSON.stringify({
                    "response_type": "ephemeral",
                    "text": `OK, I deleted your contribution with ID: ${rollbackId}`
                })
            });
        })
}

/**
 * Lists users contributions.
 *
 * @param userId
 */
export function listContributions(userId: string): Promise<LambdaResponse> {
    return getContributions(userId).then((results) => {
        const response = {
            text: results.length === 0 ?
                'You do not have any contributions. Submit one by sending a private message to Ossitron-2000!' :
                'Here is the listing of your open source contribution submissions',
            attachments: results.map((item) => {
                return {
                    fallback: 'fallback',
                    color: (function (status) {
                        if (status === 'PENDING') {
                            return "#ffff00";
                        }
                        if (status === 'ACCEPTED') {
                            return "#36a64f";
                        }
                        if (status === 'DECLINED') {
                            return "#ff0000";
                        }
                    })(item.status),
                    text: item.text,
                    fields: [
                        {
                            title: "Size",
                            value: item.size,
                            short: true
                        },
                        {
                            title: "Status",
                            value: item.status,
                            short: true
                        },
                        {
                            title: "Submitted",
                            value: moment(item.timestamp).tz('Europe/Helsinki').format('D.M.YYYY HH:mm:ss'),
                            short: true
                        },
                    ]
                };
            })
        };
        return {
            statusCode: 200,
            body: JSON.stringify(response)
        };
    });
}

/**
 * Replies with help text
 */
export function replyWithHelp(): Promise<LambdaResponse> {
    // KLUDGE: environment should be mocked for tests, because Config is fail fast
    let version, environment;
    try {
        version = Config.get('VERSION');
        environment = Config.get('ENVIRONMENT');
    } catch (e) { }
    const helpMessage = [
        "*Hi there!*",
        "",
        "My name is Ossi (a.k.a Ossitron-2000) :robot_face:, and I'm here to record your Open Source Contributions. :gem:",
        "",
        /*
        "You can send me (Ossitron-2000) a *private message* which describes your contribution. Then I will ask, if you want to submit given contribution. " +
        "If you decide to submit, I will store the contribution to DynamoDB and notify my management channel about your contribution.",*/
        "First use slash command /ossi new and then fill the modal inputs. You can also type the description field after new-word",
        //"send me (Ossitron-2000) a private message which describes your contribution. Then I will ask, following two separate questions about given contribution:",
        "",
        " :black_circle: Description of the contribution",
        " :black_circle: URL of contribution",
        " :black_circle: Contribution month",
        " :black_circle: Contribution compensation from medium_200€/small_50€/no_compensation / competence_development_hours",
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
