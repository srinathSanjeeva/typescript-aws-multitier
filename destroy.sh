#!/bin/bash
echo "About to destroy all of the resources created as part of CDK deploy."
npm run destroy --  --app="node dist/bin/main.js dev" --env=dev
