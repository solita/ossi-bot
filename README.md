# Ossi BOT (a.k.a. Ossitron-2000)

Ossi is a slack bot for registering Open Source Contributions in Solita. Ossi offers slash commands, subscribes to events and interacts with interactive components.

1. Read the instructions in slack using slash command `/ossi`
2. Send a private message to Ossi bot user which describes contribution
3. Message will be posted to private channel for sanity check
4. If contribution is accepted, a confirmation is sent and public channel is notified about this contribution
5. If contribution is declined, only sender is notified

## Setting up the Slack app

Setting up the Slack application is the hardest part in deployment.

1. Create the Slack app at https://api.slack.com/apps/
2. Deploy this backend with correct Slack signing secret (you can get it from your apps configuration), and management and public channels
3. Create bot user for your app (such as @ossitron-2000)
4. Add slash command to your app. Such as `/ossi` and define your `../slash` endpoint as an endpoint. Something like `https://frvreimv.execute-api.eu-north-1.amazonaws.com/dev/slash`
5. Add interactive component handler to your app and route it to `../state`. Something like `https://frvreimv.execute-api.eu-north-1.amazonaws.com/dev/state`
6. Add event handler for your app and route it to `../event`. Something like `https://frvreimv.execute-api.eu-north-1.amazonaws.com/dev/event`. Event handlers are expected to respond to challenges, so if it doesn't get verified, you signing secret is probably incorrect.
7. Subscribe `message.im` events - **Important!** Subscribe to Bot Events, **NOT** to workspace events!!!
8. Install your app (this might require admin privileges depending on your Slack configuration)
9. Add Bot user to  management and public channels
10. Update your deployment with newly created bot user token (Oauth & permissions -> Bot User OAuth Access Token)
11. Test slash command
12. Test sending a private message to bot
13. Test declining contribution
14. Test accepting contribution


## Deploy to AWS

Repository contains `deploy.sh` script, which makes the deployment to an AWS account and also notifies Ossi management channel about the new deployment.

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

## Developing

You need `Node.js` and `yarn`.

Install deps

```
yarn
```

Run tests. Tests are pretty much WIP stuff..

```
yarn test
```

Run offline (doesn't make much sense currently though, but this
is meant for running integration tests, which do not work currently).

```
yarn serverless offline
```
