#!/bin/bash
# npm install
npm run build
cdk synth --app="node dist/bin/main.js dev"
# node dist/bin/main.js dev
 # npm run deploy -- --app="node dist/bin/main.js dev"
 npm run deploy -- --app="node dist/bin/main.js dev" --env=dev

# npm run destroy -- dev
