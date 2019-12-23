import { getContributions } from "./dynamo";
import axios from "axios";
import * as moment from 'moment-timezone';
import { Config } from "./config";
import * as FormData from 'form-data';

export interface LambdaResponse {
    statusCode: number,
    body: string
}

export function postMessage(channel: string, message: string, attachments: any = []): Promise<any> {
    return axios.post('https://slack.com/api/chat.postMessage', {
        attachments,
        channel,
        text: message
    }, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Config.get('SLACK_TOKEN')}`
        }
    }).then(() => ({ statusCode: 200 }));
}

export function postInstantMessage(user: string, message: string, attachments: any = []): Promise<any> {
    return axios.post('https://slack.com/api/im.open', {
        user
    }, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Config.get('SLACK_TOKEN')}`
        }
    }).then((result) => {
        return postMessage(result.data.channel.id, message, attachments)
    });
}

export function postFile(channel: string, message: string, fileBuffer: Buffer, filename: string) {
    const formData = new FormData();
    formData.append('token', Config.get('SLACK_TOKEN'))
    formData.append('filename', filename);
    formData.append('file', fileBuffer, filename);
    formData.append('initial_comment', message);
    formData.append('channels', channel)

    return axios.post('	https://slack.com/api/files.upload', formData.getBuffer(), { headers: formData.getHeaders() })
    .then((result) => {
        console.log('File sent successfully')
    })
    .catch(error => {
        console.error(`Error sending file `, error)
    });
}


export function postModalBlock(trigger: any, initialMessage?: string, channel?: string): Promise<any> {
    const currentDayOfMonth = moment().date();

    // if daynumber => 3  then show only current month
    // if daynumber < 3 then show current and previous month
    const optionsBlock = [
        {
            text: {
                type: "plain_text",
                text: moment().format('MMMM'),
                emoji: true
            },
            value: moment().format('YYYY-MM')
        }
    ]
    if (currentDayOfMonth < 3) {
        optionsBlock.push(
            {
                text: {
                    type: "plain_text",
                    text: moment().subtract(1, "month").format('MMMM'),
                    emoji: true
                },
                value: moment().subtract(1, "month").format('YYYY-MM')
            })
    }
    const initInput = initialMessage ? initialMessage : '';

    return axios.post('https://slack.com/api/views.open', {
        trigger_id: trigger,
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
                        options: optionsBlock
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
 * Lists users contributions.
 *
 * @param userId
 */
export function listContributions(userId: string): Promise<LambdaResponse> {
    return getContributions(userId).then((results) => {
        const response = {
            text: results.length === 0 ?
                'You do not have any contributions. Submit one by using the slash-command /ossi new!' :
                'Here is the listing of your open source contribution submissions',
            attachments: results.map((item) => {
                return {
                    fallback: 'fallback',
                    color: ((status) => {
                        if(status === 'PENDING') {
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

export function slackMessageFromLines(lines: string[]): string {
  return lines.join('\n');
}

export function getHelpMessage(): string {
    const helpMessage = slackMessageFromLines([
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
        "If you have questions about the process contact Valtteri Valovirta. If I'm broken contact Juho Friman, Ville Virtanen or Olli Sorje.",
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
        `_Deployment_: ${Config.get('VERSION')} ${Config.get('ENVIRONMENT')}`
    ]);
    return helpMessage;
}
