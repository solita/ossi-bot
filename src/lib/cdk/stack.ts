import {StackProps} from "aws-cdk-lib";

export interface CommonStackProps extends StackProps {
    readonly cdkAppPrefix: string
    readonly envName: string
}

