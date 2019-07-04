import {Config} from "./shared/config";
import {postMessage} from "./shared/slack-interaction";

const sendNotificationToManagementChannel = (data: any) => {
    return postMessage(
        Config.get('MANAGEMENT_CHANNEL'),
        `Hi! I received a new open source contribution submission by ${data.username.S}!`,
        [
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
                        title: "ID",
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
                        text: "Decline",
                        type: "button",
                        value: "declined",
                        style: "danger"
                    }
                ]
            }

        ]);
};

const sendResult = (data: any) => {
    return postMessage(
        data.privateChannel.S,
        `Your contribution got processed!`,
        [
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
                    }
                ]
            }
        ]);
};

const sendToPublicChannel = (data: any) => {
    return postMessage(
        Config.get("PUBLIC_CHANNEL"),
        `Hello hello! Here's a new contribution by ${data.username.S}!`,
        [
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
                    }
                ]
            }
        ]);
};

export const handleStream = async (event: any) => {
    console.log(JSON.stringify(event, null, 2));

    if (event.Records[0].eventName === 'REMOVE' || event.Records[0].eventName === 'INSERT') {
        return Promise.resolve({message: 'OK'})
    }

    // const oldImage = event.Records[0].OldImage;
    const newImage = event.Records[0].dynamodb.NewImage;

    if (newImage.status.S === 'PENDING') {
        return sendNotificationToManagementChannel(newImage)
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

    if (newImage.status.S === 'ACCEPTED') {
        return sendResult(newImage)
            .then(() => {
                return sendToPublicChannel(newImage);
            })
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
