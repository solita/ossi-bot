import CryptoJS from 'crypto-js';
import {APIGatewayEvent} from "aws-lambda";
import {AppConfig} from "../model/app-config";

export const calculateSignature = (secret: string, payload: string): string => {
    return `v0=${CryptoJS.HmacSHA256(payload, secret).toString(CryptoJS.enc.Hex)}`;
};

export const verifySignature = (expected: string, secret: string, payload: string): boolean => {
    return expected === calculateSignature(secret, payload);
};

export const getSecret = async () : Promise<string> => {
    return await AppConfig.getEnvVarSecret('SLACK_SIGNING_SECRET_SECRET_ARN');
};

export const authLambdaEvent = async (event: APIGatewayEvent): Promise<boolean> => {
    const signSecret = await getSecret();
    return verifySignature(
        event.headers['X-Slack-Signature']!!,
        signSecret!!,
        `v0:${event.headers['X-Slack-Request-Timestamp']}:${event.body}`);
};
