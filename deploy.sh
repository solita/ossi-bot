#! /bin/bash

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

GIT_HASH=`git rev-parse --short HEAD`
if [ -n "$(git status --porcelain)" ]; then
  GIT_HASH=$GIT_HASH"-dirty"
fi

echo "Deploying new version"

yarn serverless deploy

MESSAGE="Deployed new version. Git hash: $GIT_HASH"

curl -X POST --header "Content-Type: application/json; charset=utf-8" --header "Authorization: Bearer ${SLACK_TOKEN}" -d "{\"text\": \"$MESSAGE\", \"channel\": \"$MANAGEMENT_CHANNEL\"}" https://slack.com/api/chat.postMessage
echo ""
