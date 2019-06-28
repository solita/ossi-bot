# Ossi BOT

Ossi is a slack bot for registering Open Source Contributions in Solita.

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

Run offline (doesn't make much sense currently though, but this
is meant for running integration tests, which do not work currently).

```
yarn serverless offline
```

## Deploy

Make sure, you have a `SLACK_SIGNING_SECRET` environment variable set when deploying. Deployment passes
this value to Lambda environment for authorizing Slack requests.

```
yarn serverless deploy
```

```
yarn serverless remove
```

## Install to Slack

1. Create SLACK app https://api.slack.com/apps/
2. Create bot user
3. Create management channel to your workspace
5. Add Ossi bot to management channel!
4. Add Management channel to env
4. Pass slack signing secret and  to deployment env
5. Add slash command to slash endpoint
5. Install app to workspace
6. Pass Bot User OAuth Access Token to deployment env
7. Update lambdas with correct env
8. Create event subscription for event endpoint
9. Verify the endpoint
10. Create interactive components endpoint to state handler
10. Add message.iam event subscription and reinstall app
