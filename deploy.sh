#! /bin/bash

set -e

if [[ -z "${SLACK_SIGNING_SECRET}" ]]; then
    echo "No Slack Signing Secret in env"
    exit 1
fi

if [[ -z "${SLACK_TOKEN}" ]]; then
    echo "No Slack token in env"
    exit 1
fi

if [[ -z "${MANAGEMENT_CHANNEL}" ]]; then
    echo "No Management channel in env"
    exit 1
fi

if [[ -z "${PUBLIC_CHANNEL}" ]]; then
    echo "No Public channel in env"
    exit 1
fi

if [[ -z $1 ]]; then
  echo "Pass dev/prod as an argument"
  exit 1
fi

ENV=$1

if [[ $ENV != 'dev' && $ENV != 'prod' ]]; then
  echo "Pass environment dev|prod"
  exit 1
fi

GIT_HASH=`git rev-parse --short HEAD`
if [ -n "$(git status --porcelain)" ]; then
  GIT_HASH=$GIT_HASH"-dirty"
fi

echo "Deploying new version to $ENV"

yarn serverless deploy --stage $ENV

MESSAGE="Deployed new version to ENV=$ENV. Git hash: $GIT_HASH"

curl -X POST --header "Content-Type: application/json; charset=utf-8" --header "Authorization: Bearer ${SLACK_TOKEN}" -d "{\"text\": \"$MESSAGE\", \"channel\": \"$MANAGEMENT_CHANNEL\"}" https://slack.com/api/chat.postMessage
echo ""
