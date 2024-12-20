

export enum CdkEnvironment {
    DEV = 'dev',
    PROD = 'prod'
}

const validateEnvironment = (env: string | undefined): CdkEnvironment => {
    if (env === CdkEnvironment.DEV) {
        return CdkEnvironment.DEV;
    }
    if (env === CdkEnvironment.PROD) {
        return CdkEnvironment.PROD
    }
    throw Error(`Invalid environment name [${env}]. Set the name with APP_ENV.`);
};


export class CdkConfig {
    static readonly CDK_QUALIFIER: string = 'ossi-bot';
    static readonly CDK_ASSETS_BUCKET_NAME: string = `${CdkConfig.CDK_QUALIFIER}-bootstrap-assets`;
    static readonly CDK_SSM_BOOTSTRAP_VERSION: string = `/cdk-bootstrap/${CdkConfig.CDK_QUALIFIER}/version`;
    static readonly CDK_TOOLKIT_STACK_NAME: string = `${CdkConfig.CDK_QUALIFIER}-cdk-toolkit-stack`;
    static readonly ENVIRONMENT_NAME: CdkEnvironment = validateEnvironment(process.env.APP_ENV);
}


