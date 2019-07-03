import axios from "axios";

const sendNotification = (data: any) => {
    return axios.post('https://slack.com/api/chat.postMessage',
        {
            text: `Hi! I received a new open source contribution submission by ${data.username.S}!`,
            attachments: [
                {
                    fallback: 'fallback',
                    color: "#ffff00",
                    callback_id: `${data.id.S}-${data.sequence.N}`,
                    text: data.text.S,
                    fields: [
                        {
                            title: "Size",
                            value: data.size.S,
                            short: true
                        },
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
                            value: "accepted",
                            style: "primary"
                        },
                        {
                            name: "STATE",
                            text: "decline",
                            type: "button",
                            value: "declined",
                            style: "danger"
                        }
                    ]
                }

            ],
            channel: process.env.MANAGEMENT_CHANNEL
        },
        {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.SLACK_TOKEN}`
            }
        });
};

const sendResult = (data: any) => {
    return axios.post('https://slack.com/api/chat.postMessage',
        {
            text: `Your contribution got processed!`,
            attachments: [
                {
                    fallback: 'fallback',
                    color: (function(status) {
                        if(status === 'PENDING') {
                            return "#ffff00";
                        }
                        if(status === 'ACCEPTED') {
                            return "#36a64f";
                        }
                        if(status === 'DECLINED') {
                            return "#ff0000";
                        }
                    })(data.status.S),
                    callback_id: `${data.id.S}-${data.sequence.N}`,
                    text: data.text.S,
                    fields: [
                        {
                            title: "Size",
                            value: data.size.S,
                            short: true
                        },
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
                    ]
                }

            ],
            channel: data.privateChannel.S
        },
        {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.SLACK_TOKEN}`
            }
        });
};

export const handleStream = async (event: any) => {
    console.log(JSON.stringify(event, null, 2));

    if (event.Records[0].eventName === 'REMOVE' || event.Records[0].eventName === 'INSERT') {
        return Promise.resolve({message: 'OK'})
    }

    // const oldImage = event.Records[0].OldImage;
    const newImage = event.Records[0].dynamodb.NewImage;

    if (newImage.status.S === 'PENDING') {
        return sendNotification(newImage)
            .then(() => {
                console.log('Sent notification');
                return {message: 'OK'};
            })
            .catch((err) => {
                console.error('Error while sending notification');
                console.error(err);
                return {message: 'OK'}
            });
    }

    if (newImage.status.S === 'ACCEPTED' || newImage.status.S === 'DECLINED') {
        return sendResult(newImage)
            .then(() => {
                console.log('Sent result');
                return {message: 'OK'};
            })
            .catch((err) => {
                console.error('Error while sending result');
                console.error(err);
                return {message: 'OK'}
            });
    }


};
