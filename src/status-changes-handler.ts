import axios from "axios";

const sendNotification = (data: any) => {
    return axios.post('https://slack.com/api/chat.postMessage',
        {
            text: `Hi there! I received a new open source contribution submission by ${data.username.S}!`,
            attachments: [
                {
                    fallback: 'fallback',
                    color: "#36a64f",
                    callback_id: `${data.id.S}-${data.sequence.N}`,
                    text: data.text.S,
                    fields: [
                        {
                            title: "Status",
                            value: data.status.S,
                            short: true
                        },
                        {
                            title: "Rollback ID",
                            value: `${data.id.S}-${data.sequence.N}`,
                            short: true
                        }
                    ],
                    actions: [
                        {
                            name: "STATE",
                            text: "Accept",
                            type: "button",
                            value: "accepted"
                        },
                        {
                            name: "STATE",
                            text: "decline",
                            type: "button",
                            value: "declined"
                        }
                    ]
                }

            ],
            channel: "#random"
        },
        {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.SLACK_TOKEN}`
            }
        });
};

export const handleStream = async (event: any) => {

    const payloads = [] as any[];
    event.Records.forEach((item: any) => {
        if(item.dynamodb.OldImage && item.dynamodb.NewImage && item.dynamodb.OldImage.status.S === 'PENDING' && item.dynamodb.OldImage.status.S !== item.dynamodb.NewImage.status.S) {
            payloads.push(item.dynamodb.NewImage);
        }

    });

    console.log(JSON.stringify(payloads));

    return Promise.all(payloads.map(sendNotification)).then((s) => {
        console.log(`Sent ${s.length} notifications`);
        return {
            invocation: s.length
        };
    });
};
