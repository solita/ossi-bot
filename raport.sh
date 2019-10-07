#! /bin/bash

aws dynamodb scan --table-name ossi-contributions-table |node report.js
