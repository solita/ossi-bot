# Ossi BOT (a.k.a. Ossitron-2000)

Ossi is a slack bot for registering Open Source Contributions in Solita. Ossi offers slash commands, subscribes to events and interacts with interactive components.

1. Read the instructions in slack using slash command `/ossi`
2. Use slash command `/ossi new` and then fill the modal inputs. You can also type the description field after new-word.
3. Message will be posted to private channel for sanity check
4. If contribution is accepted, a confirmation is sent and public channel is notified about this contribution
5. If contribution is declined, only sender is notified

## Setting up the Slack app

Setting up the Slack application is the hardest part in deployment.

1. Create the Slack app at https://api.slack.com/apps/
2. Create bot user for your app (such as @ossitron-2000)
3. Deploy this backend with correct Slack signing secret (you can get it from your apps configuration), and management and public channels
4. Add slash command to your app. Such as `/ossi` and define your `../slash` endpoint as an endpoint. Something like `https://frvreimv.execute-api.eu-north-1.amazonaws.com/dev/slash`
5. Add interactive component handler to your app and route it to `../state`. Something like `https://frvreimv.execute-api.eu-north-1.amazonaws.com/dev/state`
6. Add event handler for your app and route it to `../event`. Something like `https://frvreimv.execute-api.eu-north-1.amazonaws.com/dev/event`. Event handlers are expected to respond to challenges, so if it doesn't get verified, you signing secret is probably incorrect.
7. Subscribe `message.im` events - **Important!** Subscribe to Bot Events, **NOT** to workspace events!!! (Note: this is not required anymore, but we keep it here to inform about the new UI)
8. Install your app (this might require admin privileges depending on your Slack configuration)
9. Add Bot user to management and public channels
10. Update your deployment with newly created bot user token (Oauth & permissions -> Bot User OAuth Access Token)
11. Test slash command
12. Test creating contribution with `/ossi new`
13. Test declining contribution
14. Test accepting contribution

## DynamoDB Model

Contributions are stored to AWS DynamoDB using partition key `userId` and sort key `timestamp`. On top of keys, a row contains the following data:

* size - size marker of the contribution
* text - submitted contribution text
* name - name of the contributor resolved via Slack API
* status
* url - URL of the contribution
* contributionMonth - The contribution month in YYYY-MM-format

**Statuses**

| Status          | Explanation                                                                    |
| --------------- | ------------------------------------------------------------------------------ |
| PENDING         | New entry. Pending sanity check from management channel                        |
| ACCEPTED        | Accepted contribution                                                          |
| DECLINED        | Declined contribution - only used for bogus and invalid submissions            |

**Status Changes and Corresponding Stream Actions**

DynamoDB stream invokes notifications as following:

**INSERT** PENDING: send confirmation to submitter and notify management channel for sanity check

**UPDATE** PENDING -> ACCEPTED: send notification to submitter and publish contribution to pulib channel

**UPDATE** PENDING -> DECLINED: send notification to submitter

**REMOVE** events do nothing

This means that if you need for some reason ton modify entry directly in dynamoDB, modifications do not trigger notification.

## Super Elite EXCEL Report Generator

`monthly-report-handler.ts` constains a lambda, which generates `.xsls` spreadsheet about contributions and posts spreadsheet to management channel. 
It is scheduled to run automatically monthly, but it can be invoked also directly if needed. 

By default, it lists all contributions last month, but it can
also be invoked with event payload such as:

```json
{
  "descriptor": "2019-11"
}
```

Which would generate report for given month. Note that this is a new feature and old contributions don't have that data persisted in GSI. 
If needed, it can be calculated from timestamp, but it has not been done yet.

## Deploy to AWS

Repository contains `deploy.sh` script, which makes the deployment to an AWS account and also notifies Ossi management channel about the new deployment. Use this for deploying.

If you need to run `serverless` commands, such as `serverless info` or `serverless remove`, you can invoke `yarn serverless [PARAMS]`. Note that you need to pass `--stage dev|prod` and just bogus `--version foo`, because there are no defaults currently for options.

Because deployment needs secrets, you have to set up couple of environment variables, which describes the deployed configuration.

Serverless framework (aws-sdk for node.js to be more exact) does not support reading AWS credentials from `~/.aws`, so you need to pass
`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and `AWS_SESSION_TOKEN` (if using adfs) to the environment as well.

Deployment of Ossi requires following variables:

* **SLACK_SIGNING_SECRET** You slack apps signing secret
* **SLACK_TOKEN** Bot user token for messaging back to slack
* **MANAGEMENT_CHANNEL** channel id, where the notifications are sent, i.e `#ossi-management`
* **PUBLIC_CHANNEL** channel id, where accepted contributions are sent, i.e `#solita-open-source`

I personally like to use a bash script such as:

```
#! /bin/bash

AWS_ACCESS_KEY_ID=*** \
 AWS_SECRET_ACCESS_KEY=*** \
 AWS_DEFAULT_REGION=eu-north-1 \
 SLACK_SIGNING_SECRET=*** \
 SLACK_TOKEN=xoxb-*** \
 MANAGEMENT_CHANNEL="#ossi-management" \
 PUBLIC_CHANNEL="#general" \
 PS1="ossi-dev > " bash
```

Which opens a cool shell for me to interact with the deployment script.

Developer should have two environments with proper environment keys: one for `dev` and another for `prod`. Dev environment should be hooked
to development slack instance and naturally production to production slack instance.

## Developing

You need `Node.js` and `yarn`.

Install deps

```
yarn
```

Run tests

```
yarn test
```

Because `serverless-typescript-plugin` hides root causes of typescript errors, use `yarn tsc` to compile code in case of
weird errors. It usually shows the root cause.

## Ideas and Whatnot

* Integration tests would be cool, using dockerized local dynamoDB
* It would be great to have more variance with Ossi interaction, it has some randomity, like saying "hi", "howdy" or "hi there"
* Generating public site from the data would be cool
* CI/CD should be done