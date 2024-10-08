import {Contribution, Size, Status} from "../model/model";
import {
    postMessage,
    postInstantMessage,
    contributionFields,
    contributionColor,
    craftReceiveConfirmation
} from "../slack/slack-interaction";
import {AttributeValue, DynamoDBStreamEvent} from "aws-lambda";
import {AppConfig} from "../model/app-config";

const sendNotificationToManagementChannel = async (contribution: Contribution) => {
    console.log(`Sending notification to management channel ${AppConfig.getEnvVar('MANAGEMENT_CHANNEL_ID')} for contribution ${contribution.id}-${contribution.timestamp}`);
    return postMessage(
        AppConfig.getEnvVar('MANAGEMENT_CHANNEL_ID'),
        `Hi! I received a new open source contribution submission by ${contribution.username}!`,
        [
            {
                fallback: 'fallback',
                color: contributionColor(contribution),
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

const sendReceiveConfirmation = async (contribution: Contribution) => {
    console.log(`Sending receive confirmation to contributor with instant message for ${contribution.id}-${contribution.timestamp}, status ${contribution.status}`);
    return postInstantMessage(
        contribution.id,
        craftReceiveConfirmation(contribution),
        );
};

const sendResult = async (contribution: Contribution) => {
    console.log(`Sending process status to contributor with instant message for ${contribution.id}-${contribution.timestamp}, status ${contribution.status}`);
    return postInstantMessage(
        contribution.id,
        `Your contribution got processed!`,
        [
            {
                fallback: 'fallback',
                color: contributionColor(contribution),
                callback_id: `${contribution.id}-${contribution.timestamp}`,
                text: contribution.text,
                fields: contributionFields(contribution)
            }
        ]);
};

const sendToPublicChannel = async (contribution: Contribution) => {
    console.log(`Publishing contribution to public channel ${AppConfig.getEnvVar('PUBLIC_CHANNEL_ID')} for ${contribution.id}-${contribution.timestamp}`);
    return postMessage(
       AppConfig.getEnvVar('PUBLIC_CHANNEL_ID'),
        `Hello hello! Here's a new contribution by ${contribution.username}!`,
        [
            {
                fallback: 'fallback',
                color: contributionColor(contribution),
                callback_id: `${contribution.id}-${contribution.timestamp}`,
                text: contribution.text,
                fields: contributionFields(contribution)
            }
        ]);
};

/**
 * Dynamo DB stream returns records in "dynamo typed" format. This maps record to Contribution
 */
const dynamoRecordToContribution = (dyRecord: { [key: string]: AttributeValue }): Contribution => {
    return {
        id: dyRecord.id.S!!,
        timestamp: parseInt(dyRecord.timestamp.N!!),
        username: dyRecord.username.S!!,
        size: dyRecord.size.S as Size,
        status: dyRecord.status.S as Status,
        text: dyRecord.text.S!!,
        url: dyRecord.url.S,
        contributionMonth: dyRecord.contributionMonth.S
    };
};

export const handler = async (event: DynamoDBStreamEvent): Promise<{ message?: string, status?: string }> => {
    // Don't do anything, if event is item removal or insert
    if (event.Records[0].eventName === 'REMOVE') {
        console.log(`Received ${event.Records[0].eventName} event. No work.`);
        return Promise.resolve({status: 'OK', message: 'NO_WORK'});
    }

    let newImage: Contribution
    try {
        newImage = dynamoRecordToContribution(event.Records[0].dynamodb!!.NewImage!!);
    } catch (err) {
        console.error('Error while parsing dynamo record');
        console.error(err);
        return {status: 'FAIL', message: 'Failed to parse dynamo record'}
    }


    // TODO: error handling, what if posting a slack message fails
    // now, if posting fails, stream is marked as processed. This should fail the lambda
    // and event would get processed maximumRetryAttempts times.

    if (event.Records[0].eventName === 'INSERT' && newImage.status === 'PENDING') {

        try {
            await sendNotificationToManagementChannel(newImage)
            await sendReceiveConfirmation(newImage)
        } catch (err) {
            console.error('Error while sending notification');
            console.error(err);
            // This will mark lambda as success though
            return {status: 'FAIL', message: 'Notified management channel failure'}
        }

        return {status: 'OK', message: 'Notified management channel'};
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
                return {status: 'FAIL', message: 'Handled accepted message failure'}
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
    return Promise.resolve({status: 'OK', message: 'NO_WORK'});
};
