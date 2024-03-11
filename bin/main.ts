// bin/main.ts
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack';
import { RDSStack } from '../lib/rds-stack';
import { BackendStack } from '../lib/backend-stack';
import { FrontendStack } from '../lib/frontend-stack';

const app = new cdk.App();

// Load parameters from the file
const parameters = require('../parameters.json');



// Get the environment from the command line or use a default value
const environment = process.argv[2] || 'dev';

    // Get the environment-specific configuration
    const config = parameters[environment];

console.log(`Creating VPC stack for environment: ${environment}`);

// Check if vpcConfig is defined and log its value
if (config.vpc) {
  console.log(`Max AZs for VPC: ${config.vpc.maxAzs}`);
} else {
  console.log('VPC configuration is undefined.');
}

// Create VPC stack
const vpcStack = new VpcStack(app, `${environment}-VpcAppStack`, {
  environment,
  vpcConfig: config.vpc,
  tags: config.tags
});

const rdsStack = new RDSStack(app, `${environment}-RDSAppStack`, {
  environment,
  vpc: vpcStack.customVpc,
  backendSecurityGroup: vpcStack.backendSecurityGroup,
  rdsConfig: config.rds,
  tags: config.tags
});

// Create Backend stack

new BackendStack(app, `${environment}-BackendAppStack`, {
  environment,
  vpc: vpcStack.customVpc,
  rds: rdsStack.rdsInstance,
  rdsConfig: config.rds,
  rdsEndpoint: rdsStack.rdsEndpoint,
  backendSecurityGroup: vpcStack.backendSecurityGroup,
  backendInstanceConfig: config.backendInstance,
  tags: config.tags
});


// Create Frontend stack
new FrontendStack(app, `${environment}-FrontendAppStack`, {
  environment,
  vpc: vpcStack.customVpc,
  frontendSecurityGroup: vpcStack.frontendSecurityGroup,
  // backendAutoScalingGroup: backendStack.backendAutoScalingGroup,
  albConfig: config.alb,
  frontendInstanceConfig: config.frontendInstance,
});

app.synth();
