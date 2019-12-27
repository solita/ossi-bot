import { DynamoDB } from 'aws-sdk';
import axios from "axios";
import * as moment from 'moment';
import { Config } from "./config";
import { Contribution, Status } from "./model";

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

export const getContribution = (id: string, timestamp: string): Promise<Contribution> => {
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
    return ddb.query(params).promise()
        .then(results => results.Items[0] as Contribution);
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

export const createNewContribution = async (contributionValues: Partial<Contribution>): Promise<string> => {
    const userInfo = await axios.get(`https://slack.com/api/users.info?user=${contributionValues.id}`,
        {
            headers: {
                "Authorization": `Bearer ${Config.get('SLACK_TOKEN')}`
            }
        });
    const timestamp = moment().valueOf();
    const params = {
        TableName: Config.get('DYNAMO_TABLE'),
        Item: {
            'id': contributionValues.id,
            'timestamp': timestamp,
            'text': contributionValues.text,
            'username': userInfo.data.user.real_name,
            'status': 'PENDING',
            'size': contributionValues.size,
            'url': contributionValues.url,
            'contributionMonth': contributionValues.contributionMonth

        }
    };
    return ddb.put(params).promise().then(_ => `${contributionValues.id}-${timestamp}`);
};