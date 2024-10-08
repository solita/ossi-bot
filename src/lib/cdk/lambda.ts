import {CommonStackProps} from "./stack";
import {SecurityGroup} from "aws-cdk-lib/aws-ec2";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {Duration, Stack} from "aws-cdk-lib";
import {LogGroup, RetentionDays} from "aws-cdk-lib/aws-logs";
import {Construct} from "constructs";

import * as Lambda from "aws-cdk-lib/aws-lambda";
import * as Name from "./name";
import {ManagedPolicy, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";

export interface NodeJsLambdaProps extends CommonStackProps {
    securityGroups: SecurityGroup[]
    role?: Role
    lambdaName: string
    entryPath: string
}

export const createNodeJsLambda = (scope: Construct, props: NodeJsLambdaProps): NodejsFunction => {
    return new NodejsFunction(scope, Name.lambda(props.lambdaName, props), {
        entry: props.entryPath,
        handler: "handler",
        runtime: Lambda.Runtime.NODEJS_20_X,
        functionName: Name.lambda(props.lambdaName, props),
        memorySize: 1024,
        timeout: Duration.minutes(2),
        logGroup: new LogGroup(scope, `${props.lambdaName}-log-group`, {
            logGroupName: Name.lambda(props.lambdaName, props),
            retention: RetentionDays.SIX_MONTHS,
        }),
        securityGroups: props.securityGroups,
        role: props.role
    })
}

export function createManagedLambdaRole(roleName: string, stack: Stack, props: CommonStackProps): Role {
    return new Role(stack, Name.role(roleName, props), {
        roleName: Name.role(roleName, props),
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')]
    })
}