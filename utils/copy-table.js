var copy = require('copy-dynamodb-table').copy

/*
This script can be used to copy dynamodb data from table to another.

Run with node (no typescript) `node utils/copy-table.js`

It can also be used to copy data between accounts, more from documentation:
https://www.npmjs.com/package/copy-dynamodb-table
*/

var globalAWSConfig = { // AWS Configuration object http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_DEFAULT_REGION
}

copy({
    config: globalAWSConfig,
    source: {
      tableName: 'ossi-contributions-table', // required
    },
    destination: {
      tableName: 'ossi-contributions-table-prod', // required
    },
    log: true, // default false
    create : false // create destination table if not exist
  },
  function (err, result) {
    if (err) {
      console.log(err)
    }
    console.log(result)
  })
