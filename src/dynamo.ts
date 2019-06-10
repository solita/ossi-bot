import { DynamoDB } from 'aws-sdk';
import axios from "axios";

const ddb = new DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

export const getContributions = (id: string) => {
    var params = {
        TableName: 'os-contributions',
        ExpressionAttributeValues: {
            ':id': id
        },
        KeyConditionExpression: 'id = :id',
    };
    return ddb.query(params).promise();
};

export const deleteEntry = (id: string, seq: string) => {
    var params = {
        TableName: 'os-contributions',
        Key: {
            id: id,
            sequence: parseInt(seq)
        }
    };
    return ddb.delete(params).promise();
};

export const updateState = (id: string, seq: string,
                            state: 'PENDING' | 'LARGE' | 'MEDIUM' | 'NO' |
                                'ACCEPTED' | 'DECLINED') => {
    var params = {
        TableName: 'os-contributions',
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

export const getNewSequenceId = (id: string): Promise<any> => {
    var params = {
        TableName: 'os-contributions',
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
                "Authorization": `Bearer ${process.env.SLACK_TOKEN}`
            }
        });

    var params = {
        TableName: 'os-contributions',
        Item: {
            'id' : id,
            'sequence' : seqId,
            'text' : text,
            'username': userInfo.data.user.real_name,
            'status': 'PENDING',
            'privateChannel': privateChannel
        }
    };
    return ddb.put(params).promise().then(_ => `${id}-${seqId}`);
};