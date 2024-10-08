import {GetSecretValueCommand, SecretsManagerClient} from "@aws-sdk/client-secrets-manager";

const secretsManagerClient = new SecretsManagerClient({});


export const AppConfig = {
    secretCache: new Map<string, Promise<string>>(),

    getEnvVar: (key: AppEnvVarKeys): string => {
        const value = process.env[key];
        if (!value) {
            throw new Error(`Missing environment value ${key}`);
        }
        return value;
    },

    getEnvVarSecret: async (key: AppEnvVarKeys): Promise<string> => {
        const secretArn = process.env[key];
        if (secretArn != undefined && AppConfig.secretCache.has(secretArn)) {
            return AppConfig.secretCache.get(secretArn)!!;
        }


        if (!secretArn) {
            throw new Error(`Missing environment value ${key}`);
        }

        const secret = await secretsManagerClient.send(new GetSecretValueCommand({
            SecretId: secretArn
        }))

        const secretValueString = secret.SecretString;

        if (!secretValueString) {
            throw new Error(`Secret ${secretArn} is not a string`);
        }
        AppConfig.secretCache.set(secretArn, Promise.resolve(secretValueString));
        return secretValueString;

    }
}

export type AppEnvVarKeys =
    'SLACK_SIGNING_SECRET_SECRET_ARN' | // Slack signing secret used to verify incoming requests
    'SLACK_APP_AUTH_TOKEN_SECRET_ARN' | // Slack token for posting messages back
    'MANAGEMENT_CHANNEL_ID' | // Management channel ID
    'PUBLIC_CHANNEL_ID' | // Public channel to send accepted contributions
    'VERSION' | // version of the deployment
    'ENVIRONMENT' | // environment of the deployment
    'CONTRIBUTIONS_TABLE' | // dynamo db table name in environment
    'MONTHLY_REPORT_GSI' | // dynamo db global secondary index name in environment
    'MONTHLY_REPORT_BUCKET' | // S3 bucket name for monthly reports
    'MONTHLY_REPORT_LAMBDA_NAME' // Lambda function name for monthly reports
    ;