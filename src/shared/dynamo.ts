import { DynamoDB } from 'aws-sdk';
import axios from "axios";
import * as moment from 'moment';
import { Config } from "./config";
import { Contribution, Status, Size } from "./model";

const ddb = new DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

export const getContributions = (id: string): Promise<Contribution[]> => {
    const params = {
        TableName: Config.get('DYNAMO_TABLE'),
        ExpressionAttributeValues: {
            ':id': id
        },
        KeyConditionExpression: 'id = :id',
    };
    return ddb.query(params).promise()
        .then((dynamoResult) => dynamoResult.Items.map(item => item as Contribution));
};

export const getContributionsForMonth = (contributionMonth: string): Promise<Contribution[]> => {
    const params = {
        TableName: Config.get('DYNAMO_TABLE'),
        IndexName: Config.get('DYNAMO_GSI'),
        ExpressionAttributeValues: {
            ':contributionMonth': contributionMonth
        },
        KeyConditionExpression: 'contributionMonth = :contributionMonth',
    };
    return ddb.query(params).promise()
        .then((dynamoResult) => dynamoResult.Items.map(item => item as Contribution));
};

export const getContribution = (id: string, timestamp: string) => {
    const params = {
        TableName: Config.get('DYNAMO_TABLE'),
        ExpressionAttributeValues: {
            ':id': id,
            ':timestamp': parseInt(timestamp)
        },
        ExpressionAttributeNames: {
            '#id': 'id',
            '#timestamp': 'timestamp'
        },
        KeyConditionExpression: '#id = :id and #timestamp = :timestamp',
    };
    return ddb.query(params).promise().then(results => results.Items[0]);
};

export const deleteEntry = (id: string, timestamp: string) => {
    const params = {
        TableName: Config.get('DYNAMO_TABLE'),
        Key: {
            id,
            timestamp: parseInt(timestamp)
        }
    };
    return ddb.delete(params).promise();
};

export const updateState = (id: string, timestamp: string, state: Status) => {
    const params = {
        TableName: Config.get('DYNAMO_TABLE'),
        Key: {
            id,
            timestamp: parseInt(timestamp)
        },
        ExpressionAttributeNames: { '#status': 'status' },
        UpdateExpression: 'set #status = :status',
        ExpressionAttributeValues: {
            ':status': state
        }
    };
    return ddb.update(params).promise();
};

export const updateSize = (id: string, timestamp: string, size: Size ) => {
    const params = {
        TableName: Config.get('DYNAMO_TABLE'),
        Key: {
            id,
            timestamp: parseInt(timestamp)
        },
        ExpressionAttributeNames: { '#size': 'size', '#status': 'status' },
        UpdateExpression: 'set #size = :size, #status = :status',
        ExpressionAttributeValues: {
            ':size': size,
            ':status': 'PENDING'
        }
    };
    return ddb.update(params).promise();
};


export const writeContribution = async (id: string, text: string, privateChannel: string, url: string, compMonth: string): Promise<any> => {
    const userInfo = await axios.get(`https://slack.com/api/users.info?user=${id}`,
        {
            headers: {
                "Authorization": `Bearer ${Config.get('SLACK_TOKEN')}`
            }
        });
    const timestamp = moment().valueOf();
    const params = {
        TableName: Config.get('DYNAMO_TABLE'),
        Item: {
            'id': id,
            'timestamp': timestamp,
            'text': text,
            'username': userInfo.data.user.real_name,
            'status': 'INITIAL',
            'size': 'UNKNOWN',
            'privateChannel': privateChannel,
            'url': url,
            'contributionMonth': compMonth

        }
    };
    return ddb.put(params).promise().then(_ => `${id}-${timestamp}`);
};
