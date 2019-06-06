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

TBW