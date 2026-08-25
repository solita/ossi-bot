import {CfnOutput, RemovalPolicy, Stack} from "aws-cdk-lib";
import {AttributeType, BillingMode, ProjectionType, StreamViewType, Table} from "aws-cdk-lib/aws-dynamodb";
import {Construct} from "constructs";
import {Effect, PolicyStatement, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import { Bucket} from "aws-cdk-lib/aws-s3";
import {CommonStackProps} from "../stack";
import * as Name from "../name";
import { S3BucketOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import { AllowedMethods, CachePolicy, CfnDistribution, CfnOriginAccessControl, Distribution, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";

export class StorageStack extends Stack {
    public readonly contributionsTable: Table;
    public readonly monthlyReportBucket: Bucket;
    public readonly monthlyReportGSI: string = "monthlyReportGSI";
    public readonly cloudfrontUrl: string

    constructor(scope: Construct, stackName: string, props: CommonStackProps) {
        super(scope, stackName, props);

        this.monthlyReportBucket = new Bucket(this, Name.bucket("contribution-reports", props), {
            bucketName: Name.bucket("contribution-reports", props),
            removalPolicy: RemovalPolicy.RETAIN
        })

        const oac = new CfnOriginAccessControl(this, `OssiBotS3OAC-${props.envName}`, {
            originAccessControlConfig: {
                name: `OssiBotS3OAC-${props.envName}`,
                originAccessControlOriginType: "s3",
                signingBehavior: "always",
                signingProtocol: "sigv4",
                description: "Allow CloudFront to access S3 privately",
            },
        });

        const bucketOrigin = S3BucketOrigin.withOriginAccessControl(this.monthlyReportBucket);

        //CloudFront Distribution
        const distribution = new Distribution(this, `OssiBotCFDistribution-${props.envName}`, {
            defaultBehavior: {
                origin: bucketOrigin,
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
                cachePolicy: CachePolicy.CACHING_OPTIMIZED
            },
            defaultRootObject: "index.html",
            comment: "Private S3 distribution for Ossibot with signed URLs",
        });

        this.cloudfrontUrl = distribution.domainName

        // Attach OAC to the distribution origin manually (low-level)
        const cfnDistribution = distribution.node.defaultChild as CfnDistribution;
            cfnDistribution.addOverride(
            "Properties.DistributionConfig.Origins.0.OriginAccessControlId",
            oac.getAtt("Id")
        );

        //Restrict S3 bucket access to CloudFront only
        this.monthlyReportBucket.addToResourcePolicy(
            new PolicyStatement({
                actions: ["s3:GetObject"],
                resources: [this.monthlyReportBucket.arnForObjects("*")],
                principals: [new ServicePrincipal("cloudfront.amazonaws.com")],
                conditions: {
                    StringEquals: {
                        "AWS:SourceArn": `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
                    },
                },
            })
        );

        //Output useful values
        new CfnOutput(this, "BucketName", { value: this.monthlyReportBucket.bucketName });
        new CfnOutput(this, "CloudFrontDomain", { value: distribution.domainName });

        this.contributionsTable = new Table(this, Name.table("contributions", props), {
            tableName: Name.table("contributions", props),
            partitionKey: {name: "id", type: AttributeType.STRING},
            sortKey: {name: "timestamp", type: AttributeType.NUMBER},
            stream: StreamViewType.NEW_AND_OLD_IMAGES,
            billingMode: BillingMode.PAY_PER_REQUEST,
            pointInTimeRecoverySpecification: {
                pointInTimeRecoveryEnabled: false
            },
            removalPolicy: RemovalPolicy.RETAIN,
            deletionProtection: true
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
