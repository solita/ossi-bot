import { DynamoDB } from 'aws-sdk';
import axios from "axios";
import {Config} from "./config";

const ddb = new DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

export const getContributions = (id: string) => {
    var params = {
        TableName: 'ossi-contributions',
        ExpressionAttributeValues: {
            ':id': id
        },
        KeyConditionExpression: 'id = :id',
    };
    return ddb.query(params).promise();
};

export const getContribution = (id: string, seq: string) => {
    var params = {
        TableName: 'ossi-contributions',
        ExpressionAttributeValues: {
            ':id': id,
            ':sequence': parseInt(seq)
        },
        ExpressionAttributeNames: {
            '#id': 'id',
            '#sequence': 'sequence'
        },
        KeyConditionExpression: '#id = :id and #sequence = :sequence',
    };
    return ddb.query(params).promise().then(results => results.Items[0]);
};

export const deleteEntry = (id: string, seq: string) => {
    var params = {
        TableName: 'ossi-contributions',
        Key: {
            id: id,
            sequence: parseInt(seq)
        }
    };
    return ddb.delete(params).promise();
};

export const updateState = (id: string, seq: string,
                            state: 'INITIAL' | 'PENDING' | 'ACCEPTED' | 'DECLINED') => {
    var params = {
        TableName: 'ossi-contributions',
        Key: {
            id: id,
            sequence: parseInt(seq)
        },
        ExpressionAttributeNames: {'#status' : 'status'},
        UpdateExpression: 'set #status = :status',
        ExpressionAttributeValues: {
            ':status': state
        }
    };
    return ddb.update(params).promise();
};

export const updateSize = (id: string, seq: string,
                               size: 'LARGE' | 'MEDIUM' | 'SMALL' | 'NO' ) => {
    var params = {
        TableName: 'ossi-contributions',
        Key: {
            id: id,
            sequence: parseInt(seq)
        },
        ExpressionAttributeNames: {'#size' : 'size', '#status': 'status'},
        UpdateExpression: 'set #size = :size, #status = :status',
        ExpressionAttributeValues: {
            ':size': size,
            ':status': 'PENDING'
        }
    };
    return ddb.update(params).promise();
};

export const getNewSequenceId = (id: string): Promise<any> => {
    var params = {
        TableName: 'ossi-contributions',
        ExpressionAttributeValues: {
            ':id': id
        },
        KeyConditionExpression: 'id = :id',
        ScanIndexForward: false,
        Limit: 1
    };
    return ddb.query(params).promise().then((results: any) => {
        if(results.Items.length === 0) {
            return 1;
        }
        return results.Items[0].sequence + 1;
    });
};

export const writeContribution = async (id: string, text: string, privateChannel: string): Promise<any> => {
    const seqId = await getNewSequenceId(id);
    const userInfo = await axios.get(`https://slack.com/api/users.info?user=${id}`,
        {
            headers: {
                "Authorization": `Bearer ${Config.get('SLACK_TOKEN')}`
            }
        });

    var params = {
        TableName: 'ossi-contributions',
        Item: {
            'id' : id,
            'sequence' : seqId,
            'text' : text,
            'username': userInfo.data.user.real_name,
            'status': 'INITIAL',
            'size': 'UNKNOWN',
            'privateChannel': privateChannel
        }
    };
    return ddb.put(params).promise().then(_ => `${id}-${seqId}`);
};
