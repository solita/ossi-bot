# Ossi BOT (a.k.a. Ossitron-2000)

Ossi is a slack bot for registering Open Source Contributions in Solita. Ossi offers slash commands, subscribes to events and interacts with interactive components.

1. Use slash command `/ossi new` and then fill the modal inputs. You can also type the description field after new-word.
2. Message will be posted to management  channel for sanity check
3. If contribution is accepted, a confirmation is sent and public channel is notified about this contribution
4. If contribution is declined, only sender is notified

## Slash Commands
* `/ossi new` - Create a new contribution
* `/ossi list` - List all contributions
* `/ossi report YYYY-MM` - Generate a report for a given month and post it to management channel

## Installation

### Initial Slack App setup

1. Create a new Slack App at https://api.slack.com/apps
2. Setup required permissions for the app `OAuth & Permissions > Scopes `
   1. chat:write
   2. commands
   3. im:write
   4. incoming-webhook
   5. users:read
3. Install the app to your workspace and after installation, copy following information
   1. `Signing Secret` from `Basic Information`
   2. `Bot User OAuth Access Token` from `OAuth & Permissions` 
4. Add the app to your workspace via `Incoming Webhooks` and copy the webhook URL (management and public channels)

### Backend setup
1. Add ``Signing Secret`` and ``Bot User OAuth Access Token`` to Secret Manager as plain texts
2. Rename `src/ossi-bot-config.ts.template` to `src/ossi-bot-config.ts`
   1. Public channel id
   2. Management channel id
   3. Slack Signing and Bot User OAuth Access Token secret arns from Secret Manager
3. Run `npm run bootstrap -- --profile <your profile> ` but if you use other bootstrap resources, you have to configure them manually in `src/cdk/cdk-config.ts`
4. Run `npm run cdk deploy "*" --profile <your profile>` to deploy the backend
5. Copy backend endpoint url from AWS Console > API Gateway > <your api> > Settings e.g. `https://frvreimv.execute-api.eu-north-1.amazonaws.com/dev`

### Finalizing Slack App setup
1. In Slash Commands, create a new command `/ossi` and point it to the backend endpoint `https://frvreimv.execute-api.eu-north-1.amazonaws.com/dev/slash`
2. In Interactive Components, create a new handler and point it to the backend endpoint `https://frvreimv.execute-api.eu-north-1.amazonaws.com/dev/change-state`
3. Reinstall the app to your workspace to apply the changes


# Architecture

## Workflow

1. User submits a new contribution via slash command
   1. Slack modal is opened for user to fill in the details
   2. User submits the contribution and Slack sends a form payload to backend (changes-state-handler)
   3. Backend stores the contribution to DynamoDB with status PENDING
   4. status-changes-handler is triggered by DynamoDB stream and sends a message to management channel for sanity check
2. Management channel receives the message and decides to accept or decline the contribution
   1. change-state-handler receives the message and updates the contribution status in DynamoDB according to the decision
      1. If accepted, status is updated to ACCEPTED
      2. If declined, status is updated to DECLINED
3. Changes in status trigger notifications to the submitter and public channel
   1. If ACCEPTED, submitter is notified and contribution is posted to public channel
   2. If DECLINED, submitter is notified
   

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

`report-handler-s3.ts` constains a lambda, which generates `.xsls` spreadsheet about contributions and posts spreadsheet to management channel. 
It is scheduled to run automatically monthly, but it can be invoked also directly if needed via slash command `/ossi-bot report YYYY-MM`.

Due security policy changes, posting files to slack is not possible anymore, so the report is stored to S3 and presigned link is posted to management channel that expires in seven days. 

## Ideas and Whatnot

* Integration tests would be cool, using dockerized local dynamoDB
* It would be great to have more variance with Ossi interaction, it has some randomity, like saying "hi", "howdy" or "hi there"
* Generating public site from the data would be cool
* CI/CD should be done