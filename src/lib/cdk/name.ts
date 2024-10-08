import {CommonStackProps} from "./stack";
import camelcase from "camelcase";

export function api(apiName: string, props: CommonStackProps, common: boolean = false): string {
  return withBaseAndEnv(props, `${apiName}-api`, common)
}

export function table(tableName: string, props: CommonStackProps, common: boolean = false): string {
    return withBaseAndEnv(props, `${tableName}-table`, common)
}

export function bucket(bucketName: string, props: CommonStackProps, common: boolean = false): string {
  return withBaseAndEnv(props, bucketName, common)
}

export function apiKey(apiName: string, props: CommonStackProps, common: boolean = false): string {
  return withBaseAndEnv(props, `${apiName}-api-key`, common)
}

export function apiUsagePlan(apiName: string, props: CommonStackProps, common: boolean = false): string {
  return withBaseAndEnv(props, `${apiName}-api-usage-plan`, common)
}

export function securityGroup(name: string, props: CommonStackProps, common: boolean = false): string {
  return withBaseAndEnv(props, `${name}-security-group`, common)
}

export function stack(stackName: string, props: CommonStackProps, common: boolean = false): string {
  return withBaseAndEnv(props, `${stackName}-stack`, common)
}

export function domain(props: CommonStackProps, common: boolean = false): string {
  return withBaseAndEnv(props, `domain`, common)
}

export function role(roleName: string, props: CommonStackProps, common: boolean = false): string {
  return withBaseAndEnv(props, `${roleName}-role`, common)
}

export function lambda(lambdaName: string, props: CommonStackProps, common: boolean = false): string {
  return withBaseAndEnv(props, `${lambdaName}-lambda`, common)
}

export function logGroupSubscriptionFilterId(lambdaName: string, common: boolean = false): string {
  return `${lambdaName}-log-group-subscription-filter`
}

export function kafkaConsumerGroupId(name: string, props: CommonStackProps, common: boolean = false): string {
  return withBaseAndEnv(props, name).replaceAll('-','.')
}

export function onlyBaseAndEnv(props: CommonStackProps, common: boolean = false): string {
  return common ?  `${props.cdkAppPrefix}` : `${props.cdkAppPrefix}-${props.envName}`
}

export function withBaseAndEnv(props: CommonStackProps, name: string, common: boolean = false): string {
  return common ?  `${props.cdkAppPrefix}-${name}` : `${props.cdkAppPrefix}-${name}-${props.envName}`
}

export function exportKey(exportName: string, env: string = ""): string {
  const key = `${env}-${exportName}-export`;
  return camelcase(key)
}
