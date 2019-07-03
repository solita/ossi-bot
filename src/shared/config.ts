export type ConfigKeys =
    'SLACK_SIGNING_SECRET' | // Slack signing secret used to verify incoming requests
    'SLACK_TOKEN' | // Slack token for posting messages back
    'MANAGEMENT_CHANNEL' // Management channel ID
    ;

export class Config {

    static get(key: ConfigKeys): string {
        const value = process.env[key];
        if(!value) {
            throw new Error(`Missing environment value ${key}`);
        }
        return value;
    }
}
