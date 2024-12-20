import moment from 'moment';
import { AppConfig } from "./app-config";
import { Contribution, Status } from "./model";
import {
    DynamoDBDocumentClient,
    GetCommand,
    paginateQuery, PutCommand,
    QueryCommandOutput,
    UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
import {Paginator} from "@aws-sdk/types";
import {getUserInfo} from "../slack/slack-interaction";

const ddb = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(ddb);
const pagesToContributions = async (pages:  Paginator<QueryCommandOutput>) => {
    const results = [];
    for await (const page of pages) {
        if (page.Items !== undefined) {
            results.push(...page.Items.map(item => item as Contribution))
        }
    }
    return Promise.all(results);
}

export const getContributions = async (id: string): Promise<Contribution[]> => {

    try {
        const pages =  paginateQuery(
            {client: documentClient},
            {
                TableName: AppConfig.getEnvVar('CONTRIBUTIONS_TABLE'),
                ExpressionAttributeValues: {':id': id},
                KeyConditionExpression: 'id = :id',
            }
        );

        return pagesToContributions(pages);
    } catch (error) {
        console.error(error);
        return Promise.resolve([]);
    }

};

export const getContributionsForMonth = async (contributionMonth: string): Promise<Contribution[]> => {

    try {
        const pages = paginateQuery(
            {client: documentClient},
            {
                TableName: AppConfig.getEnvVar('CONTRIBUTIONS_TABLE'),
                IndexName: AppConfig.getEnvVar('MONTHLY_REPORT_GSI'),
                ExpressionAttributeValues: {':contributionMonth': contributionMonth},
                KeyConditionExpression: 'contributionMonth = :contributionMonth',
            }
        )
        return pagesToContributions(pages);
    } catch (error) {
        console.error(error);
        return Promise.resolve([]);
    }
};

export const getContribution = async (id: string, timestamp: string): Promise<Contribution> => {

    const getCommand = new GetCommand({
        TableName: AppConfig.getEnvVar('CONTRIBUTIONS_TABLE'),
        Key: {
            id,
            timestamp: parseInt(timestamp)
        }
    });
    return documentClient.send(getCommand).then(result => result.Item!! as Contribution)
};

export const updateState = async (id: string, timestamp: string, state: Status) => {

    const update = new UpdateCommand({
        TableName: AppConfig.getEnvVar('CONTRIBUTIONS_TABLE'),
        Key: {
            id,
            timestamp: parseInt(timestamp)
        },
        UpdateExpression: 'set #status = :status',
        ExpressionAttributeNames: {'#status': 'status'},
        ExpressionAttributeValues: {':status': state}
    })

    await documentClient.send(update);
    return
};

export const createNewContribution = async (contributionValues: Partial<Contribution>): Promise<string> => {
    const user = await getUserInfo(contributionValues.id!!).then((response) => { return response.user!!; });
    const timestamp = moment().valueOf();
    const params = new PutCommand( {
        TableName: AppConfig.getEnvVar('CONTRIBUTIONS_TABLE'),
        Item: {
            'id': contributionValues.id,
            'timestamp': timestamp,
            'text': contributionValues.text,
            'username': user?.real_name ? user.real_name :user.name,
            'status': 'PENDING',
            'size': contributionValues.size,
            'url': contributionValues.url,
            'contributionMonth': contributionValues.contributionMonth

        }
    });
    console.log(`Persisting new contribution ${contributionValues.id}-${timestamp}`);
    await documentClient.send(params)
    return `${contributionValues.id}-${timestamp}`;
};