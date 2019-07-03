import * as CryptoJS from 'crypto-js';
import {Config} from "./shared/config";

export const calculateSignature = (secret: string, payload: string): string => {
    return `v0=${CryptoJS.HmacSHA256(payload, secret).toString(CryptoJS.enc.Hex)}`;
};

export const verifySignature = (expected: string, secret: string, payload: string): boolean => {
    return expected === calculateSignature(secret, payload);
};

export const getSecret = () => {
    return Config.get("SLACK_SIGNING_SECRET");
};

export const authLambdaEvent = (event: any): boolean => {
    return verifySignature(
        event.headers['X-Slack-Signature'],
        getSecret(),
        `v0:${event.headers['X-Slack-Request-Timestamp']}:${event.body}`);
};
