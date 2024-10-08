import {Construct} from "constructs";
import {LambdaIntegration, RestApi} from "aws-cdk-lib/aws-apigateway";
import {Stack} from "aws-cdk-lib";
import * as Name from "../name";
import {CommonStackProps} from "../stack";
import {createManagedLambdaRole, createNodeJsLambda} from "../lambda";
import path from "node:path";
import {Table} from "aws-cdk-lib/aws-dynamodb";
import {addReadWriteAccessToTable} from "./storage-stack";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {Secret} from "aws-cdk-lib/aws-secretsmanager";
import {DynamoEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import {StartingPosition} from "aws-cdk-lib/aws-lambda";
import {Rule, Schedule} from "aws-cdk-lib/aws-events";
import {addLambdaPermission, LambdaFunction} from "aws-cdk-lib/aws-events-targets";
import {Bucket} from "aws-cdk-lib/aws-s3";

const handlers = '../../bot/handlers/';

export interface BackendStackProps extends CommonStackProps {
    readonly reportBucket: Bucket
    readonly contributionsTable: Table
    readonly monthlyReportGSI: string
    readonly version: string
    readonly slack: {
        readonly signingSecretSecretArn: string
        readonly appAuthTokenSecretArn: string
        readonly publicChannelWebhook: string
        readonly managementChannelWebhook: string
    }
}

export class BackendStack extends Stack {
    constructor(scope: Construct, id: string, props: BackendStackProps) {
        super(scope, id, props);

        const slashCommandHandlerLambda = createNodeJsLambda(this, {
            ...props,
            lambdaName: "slash-handler",
            entryPath: path.join(__dirname, `${handlers}/slash-command-handler.ts`),
            securityGroups: [],
            role: createLambdaRole("slash-handler", this, props)
        })
        addEnvironmentVariables(slashCommandHandlerLambda, props)

        const changeStateHandlerLambda = createNodeJsLambda(this, {
            ...props,
            lambdaName: "change-state-handler",
            entryPath: path.join(__dirname, `${handlers}/change-state-handler.ts`),
            securityGroups: [],
            role: createLambdaRole("change-state-handler", this, props)
        })
        addEnvironmentVariables(changeStateHandlerLambda, props)

        const monthlyReportHandlerLambda = createNodeJsLambda(this, {
            ...props,
            lambdaName: "monthly-report-handler",
            entryPath: path.join(__dirname, `${handlers}/report-handler-s3.ts`),
            securityGroups: [],
            role: createLambdaRole("monthly-report-handler", this, props)
        })
        addEnvironmentVariables(monthlyReportHandlerLambda, props)
        monthlyReportHandlerLambda.grantInvoke(slashCommandHandlerLambda.role!!)

        const monthlyReportJob = new Rule(this, 'ossi-bot-monthly-report-job', {
            schedule: Schedule.cron({minute: '0', hour: '6', day: '3'}),
            enabled: true,
            targets: [
                new LambdaFunction(monthlyReportHandlerLambda,{
                retryAttempts: 1
                })
            ]
        })
        addLambdaPermission(monthlyReportJob, monthlyReportHandlerLambda)
        slashCommandHandlerLambda.addEnvironment("MONTHLY_REPORT_LAMBDA_NAME", monthlyReportHandlerLambda.functionName)

        const statusChangesHandlerLambda = createNodeJsLambda(this, {
            ...props,
            lambdaName: "status-changes-handler",
            entryPath: path.join(__dirname, `${handlers}/status-changes-handler.ts`),
            securityGroups: [],
            role: createLambdaRole("status-changes-handler", this, props)
        })
        addEnvironmentVariables(statusChangesHandlerLambda, props)

        statusChangesHandlerLambda.addEventSource(new DynamoEventSource(props.contributionsTable, {
            startingPosition: StartingPosition.TRIM_HORIZON,
            batchSize: 1
        }))
        props.contributionsTable.grantStreamRead(statusChangesHandlerLambda)



        const apiGateway = new RestApi(this, Name.api("backend", props), {
            restApiName: Name.api("backend", props),
            deployOptions: {
                stageName: props.envName,
                cachingEnabled: false,
            }
        });

        apiGateway.root.addResource("slash").addMethod("POST", new LambdaIntegration(slashCommandHandlerLambda))
        apiGateway.root.addResource("change-state").addMethod("POST", new LambdaIntegration(changeStateHandlerLambda))

    }
}

const createLambdaRole = (lambdaName: string, stack: Stack, props: BackendStackProps) => {
    const lambdaRole = createManagedLambdaRole(`${lambdaName}-lambda`, stack, props)

    addReadWriteAccessToTable(lambdaRole, props.contributionsTable.tableArn)
    props.reportBucket.grantReadWrite(lambdaRole)

    const slackSigningSecret = Secret.fromSecretCompleteArn(stack, `${lambdaName}-slack-signing-secret`, props.slack.signingSecretSecretArn)
    const slackAppAuthToken = Secret.fromSecretCompleteArn(stack, `${lambdaName}-slack-app-auth-token`, props.slack.appAuthTokenSecretArn)

    slackSigningSecret.grantRead(lambdaRole)
    slackAppAuthToken.grantRead(lambdaRole)

    return lambdaRole
}

const addEnvironmentVariables = (lambda: NodejsFunction, props: BackendStackProps) => {
    lambda.addEnvironment("SLACK_SIGNING_SECRET_SECRET_ARN", props.slack.signingSecretSecretArn)
    lambda.addEnvironment("SLACK_APP_AUTH_TOKEN_SECRET_ARN", props.slack.appAuthTokenSecretArn)
    lambda.addEnvironment("CONTRIBUTIONS_TABLE", props.contributionsTable.tableName)
    lambda.addEnvironment("MONTHLY_REPORT_GSI", props.monthlyReportGSI)
    lambda.addEnvironment("MONTHLY_REPORT_BUCKET", props.reportBucket.bucketName)
    lambda.addEnvironment("VERSION", props.version)
    lambda.addEnvironment("PUBLIC_CHANNEL_ID", props.slack.publicChannelWebhook)
    lambda.addEnvironment("MANAGEMENT_CHANNEL_ID", props.slack.managementChannelWebhook)
    lambda.addEnvironment("ENVIRONMENT", props.envName)
}