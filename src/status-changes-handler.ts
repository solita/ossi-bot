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
    console.log(`Publishing contribution to public channel ${Config.get('PUBLIC_CHANNEL')} for ${contribution.id}-${contribution.timestamp}`);
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
};

export const handleStream = async (event: any): Promise<{ message?: string, status?: string }> => {
    // Don't do anything, if event is item removal or insert
    if (event.Records[0].eventName === 'REMOVE' || event.Records[0].eventName === 'INSERT') {
        console.log(`Received ${event.Records[0].eventName} event. No work.`);
        return Promise.resolve({status: 'OK', message: 'NO_WORK'})
    }

    const newImage = dynamoRecordToContribution(event.Records[0].dynamodb.NewImage);

    // TODO: error handling, what if posting a slack message fails
    // now, if posting fails, stream is marked as processed. This should fail the lambda
    // and event would get processed maximumRetryAttempts times.

    if (newImage.status === 'PENDING') {
        return sendNotificationToManagementChannel(newImage)
            .then(() => {
                return { status: 'OK', message: 'Notified management channel' };
            })
            .catch((err) => {
                console.error('Error while sending notification');
                console.error(err);
                // This will mark lambda as success though
                return { status: 'FAIL', message: 'Notified management channel failure' }
            });
    }

    if (newImage.status === 'ACCEPTED') {
        return sendResult(newImage)
            .then(() => {
                return sendToPublicChannel(newImage);
            })
            .then(() => {
                return {status: 'OK', message: 'Handled accepted message'};
            })
            .catch((err) => {
                console.error('Error while sending result');
                console.error(err);
                // This will mark lambda as success though
                return {status: 'FAIL', message: 'Handled accepted message failure' }
            });
    }

    if (newImage.status === 'DECLINED') {
        return sendResult(newImage)
            .then(() => {
                return {status: 'OK', message: 'Notified submitter about declination'};
            })
            .catch((err) => {
                console.error('Error while sending result');
                console.error(err);
                // This will mark lambda as success though
                return {status: 'FAIL', message: 'Notified submitter about declination failure'}
            });
    }
};
