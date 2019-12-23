import {Config} from "./shared/config";
import {Contribution} from "./shared/model";
import {postMessage, postInstantMessage, contributionFields} from "./shared/slack-interaction";

const sendNotificationToManagementChannel = (contribution: Contribution) => {
    console.log(`Sending notification to management channel ${Config.get('MANAGEMENT_CHANNEL')} for ${contribution.id}-${contribution.timestamp}`);
    return postMessage(
        Config.get('MANAGEMENT_CHANNEL'),
        `Hi! I received a new open source contribution submission by ${contribution.username}!`,
        [
            {
                fallback: 'fallback',
                color: "#ffff00",
                callback_id: `${contribution.id}-${contribution.timestamp}`,
                text: contribution.text,
                fields: contributionFields(contribution),
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

const sendResult = (contribution: Contribution) => {
    console.log(`Sending notification with instant message for ${contribution.id}-${contribution.timestamp}`);
    return postInstantMessage(
        contribution.id,
        `Your contribution got processed!`,
        [
            {
                fallback: 'fallback',
                color: ((status) => {
                    if(status === 'PENDING') {
                        return "#ffff00";
                    }
                    if(status === 'ACCEPTED') {
                        return "#36a64f";
                    }
                    if(status === 'DECLINED') {
                        return "#ff0000";
                    }
                })(contribution.status),
                callback_id: `${contribution.id}-${contribution.timestamp}`,
                text: contribution.text,
                fields: contributionFields(contribution)
            }
        ]);
};

const sendToPublicChannel = (contribution: Contribution) => {
    console.log(`Sending notification to public channel ${Config.get("PUBLIC_CHANNEL")} for ${contribution.id}-${contribution.timestamp}`);
    return postMessage(
        Config.get("PUBLIC_CHANNEL"),
        `Hello hello! Here's a new contribution by ${contribution.username}!`,
        [
            {
                fallback: 'fallback',
                color: ((status) => {
                    if(status === 'PENDING') {
                        return "#ffff00";
                    }
                    if(status === 'ACCEPTED') {
                        return "#36a64f";
                    }
                    if(status === 'DECLINED') {
                        return "#ff0000";
                    }
                })(contribution.status),
                callback_id: `${contribution.id}-${contribution.timestamp}`,
                text: contribution.text,
                fields: contributionFields(contribution)
            }
        ]);
};

/**
 * Dynamo DB stream returns records in "dynamo typed" format. This maps record to Contribution
 */
const dynamoRecordToContribution = (dynamoRecord: any): Contribution => {
  return {
    id: dynamoRecord.id.S,
    timestamp: parseInt(dynamoRecord.timestamp.N),
    username: dynamoRecord.username.S,
    size: dynamoRecord.size.S,
    status: dynamoRecord.status.S,
    text: dynamoRecord.text.S,
    url: dynamoRecord.url.S,
    contributionMonth: dynamoRecord.contributionMonth.S
  };
}

export const handleStream = async (event: any) => {
    // Don't do anything, if event is item removal or insert
    if (event.Records[0].eventName === 'REMOVE' || event.Records[0].eventName === 'INSERT') {
        console.log(`Received ${event.Records[0].eventName} event. No work.`);
        return Promise.resolve({message: 'OK'})
    }

    const newImage = dynamoRecordToContribution(event.Records[0].dynamodb.NewImage);

    if (newImage.status === 'PENDING') {
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

    if (newImage.status === 'ACCEPTED') {
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

    if (newImage.status === 'DECLINED') {
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
