import {Construct} from "constructs";
import {Tags} from "aws-cdk-lib";
import {CommonStackProps} from "./stack";

export function addCommonTags(construct: Construct, commonStackProps: CommonStackProps) {
    Tags.of(construct).add("Owner", "Juho Friman");
    Tags.of(construct).add("Dudate", "011219")
}