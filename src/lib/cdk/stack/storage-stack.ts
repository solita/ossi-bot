import {RemovalPolicy, Stack, StackProps} from "aws-cdk-lib";
import {AttributeType, BillingMode, ProjectionType, StreamViewType, Table} from "aws-cdk-lib/aws-dynamodb";
import {Construct} from "constructs";
import {Effect, PolicyStatement, Role} from "aws-cdk-lib/aws-iam";
import {Bucket} from "aws-cdk-lib/aws-s3";
import {CommonStackProps} from "../stack";
import * as Name from "../name";

export class StorageStack extends Stack {
    public readonly contributionsTable: Table;
    public readonly monthlyReportBucket: Bucket;
    public readonly monthlyReportGSI: string = "monthlyReportGSI";

    constructor(scope: Construct, stackName: string, props: CommonStackProps) {
        super(scope, stackName, props);

        this.monthlyReportBucket = new Bucket(this, Name.bucket("contribution-reports", props), {
            bucketName: Name.bucket("contribution-reports", props),
            removalPolicy: RemovalPolicy.RETAIN
        })

        this.contributionsTable = new Table(this, Name.table("contributions", props), {
            tableName: Name.table("contributions", props),
            partitionKey: {name: "id", type: AttributeType.STRING},
            sortKey: {name: "timestamp", type: AttributeType.NUMBER},
            stream: StreamViewType.NEW_AND_OLD_IMAGES,
            billingMode: BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: false,
            removalPolicy: RemovalPolicy.RETAIN,
        });

        this.contributionsTable.addGlobalSecondaryIndex({
            indexName: this.monthlyReportGSI,
            partitionKey: {name: 'contributionMonth', type: AttributeType.STRING},
            projectionType: ProjectionType.ALL,
        });
    }

}

export const addReadWriteAccessToTable = (role: Role, tableArn: string): void => {
    role.addToPolicy(
        new PolicyStatement({
            actions: ['dynamodb:Query','dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:DescribeTable'],
            effect: Effect.ALLOW,
            resources: [
                `${tableArn}`,
                `${tableArn}/*`,
            ],
        })
    );
}

export const addReadAccessToTable = (role: Role, tableArn: string): void => {
    role.addToPolicy(
        new PolicyStatement({
            actions: ['dynamodb:GetItem', 'dynamodb:DescribeTable', "dynamodb:Get*", "dynamodb:Query", "dynamodb:Scan"],
            effect: Effect.ALLOW,
            resources: [tableArn],
        })
    );
};
