import {App, DefaultStackSynthesizer} from "aws-cdk-lib";
import {CommonStackProps} from "../lib/cdk/stack";
import {CdkConfig} from "../lib/cdk/cdk-config";
import {StorageStack} from "../lib/cdk/stack/storage-stack";
import * as Name from "../lib/cdk/name";
import {BackendStack} from "../lib/cdk/stack/backend-stack";
import ossiBotConfig from "../ossi-bot-config"

const envConfig = ossiBotConfig[CdkConfig.ENVIRONMENT_NAME]

const app = new App({
    defaultStackSynthesizer: new DefaultStackSynthesizer({
        qualifier: CdkConfig.CDK_QUALIFIER,
        fileAssetsBucketName: CdkConfig.CDK_ASSETS_BUCKET_NAME,
        bootstrapStackVersionSsmParameter: CdkConfig.CDK_SSM_BOOTSTRAP_VERSION
    })
})

const commonStackProps: CommonStackProps = {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
    crossRegionReferences: true,
    cdkAppPrefix: CdkConfig.CDK_QUALIFIER,
    envName: CdkConfig.ENVIRONMENT_NAME,
}




const storageStack = new StorageStack(app, Name.stack("storage", commonStackProps),commonStackProps)

const ossiBotAppStack = new BackendStack(app, Name.stack("backend", commonStackProps), {
    ...commonStackProps,
    ...envConfig,
    reportBucket: storageStack.monthlyReportBucket,
    contributionsTable: storageStack.contributionsTable,
    monthlyReportGSI: storageStack.monthlyReportGSI,
    version: '0.0.1',
})

ossiBotAppStack.addDependency(storageStack)


