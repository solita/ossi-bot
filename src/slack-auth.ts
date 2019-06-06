import * as CryptoJS from 'crypto-js';

export const calculateSignature = (secret: string, payload: string): string => {
    return `v0=${CryptoJS.HmacSHA256(payload, secret).toString(CryptoJS.enc.Hex)}`;
};

export const verifySignature = (expected: string, secret: string, payload: string): boolean => {
    return expected === calculateSignature(secret, payload);
};

export const getSecret = () => {
    return process.env.SLACK_SIGNING_SECRET;
};