#!/usr/bin/env bash

SOURCE_DIR=$1
TARGET_TABLET=$2
PROFILE=$3
mkdir temp
cp -r $SOURCE_DIR temp/

#Combine all files into one and split into 25 batches (AWS CLI limit)
cat temp/*.json > temp/combined
rm temp/*.json
split -l 25 temp/combined temp/
rm temp/combined


# DynamoDB exports items one per line, so we need to wrap each line in a PutRequest object and then wrap all of them in a request object
for file in temp/*; do
  echo "Transforming $file"
  cat $file | sed -e 's/^/{"PutRequest":/' | sed -e 's/$/},/' | sed -e '$s/,$//' | sed -e '1s/^/{"'$TARGET_TABLET'":[/' | sed -e '$s/$/]}/' > "$file".json
  rm "$file"
done

for request in temp/*; do
  echo "Importing file $request"
  aws dynamodb batch-write-item --request-items file://"$request" --profile "$PROFILE" --no-cli-pager
  rm "$request"
done