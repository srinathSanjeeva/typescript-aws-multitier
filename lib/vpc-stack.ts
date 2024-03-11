// lib/vpc-stack.ts
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

interface VpcStackProps extends cdk.StackProps {
  environment: string;
  vpcConfig: {
    maxAzs: number;
  };
}

export class VpcStack extends cdk.Stack {
  // Define a public property to hold the VPC instance
  public readonly customVpc: ec2.Vpc;
  public readonly backendSecurityGroup: ec2.SecurityGroup;
  public readonly frontendSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: VpcStackProps) {
    super(scope, id, props);

    // Create VPC and assign it to the public property
    const vpc = new ec2.Vpc(this, `${props.environment}-VPC`, {
      maxAzs: props.vpcConfig.maxAzs,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'PrivateSubnet',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });
    this.customVpc = vpc;

    // Define security group for backend instance
    this.backendSecurityGroup = new ec2.SecurityGroup(this, `${props.environment}-BackendSecurityGroup`, {
      vpc,
      description: 'Security group for the backend instance',
      allowAllOutbound: true   // Allow all outbound traffic
    });
    this.backendSecurityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(3000), 'Allow access on port 3000 from within the VPC');
    this.backendSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow access from ssh access from anywhere, for testing purposes only');
    // backendSecurityGroup.addIngressRule(ec2.Peer.ipv4(vpc.vpcCidrBlock), ec2.Port.tcp(3360), 'Allow access on port 3360 from the RDS database instance');

    // Define security group for front-end instance
    this.frontendSecurityGroup = new ec2.SecurityGroup(this, `${props.environment}-FrontendSecurityGroup`, {
      vpc,
      description: 'Security group for the front-end instance',
      allowAllOutbound: true   // Allow all outbound traffic
    });
    this.frontendSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow inbound HTTP traffic from anywhere');
    // this.frontendSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow inbound HTTPS traffic from anywhere');
    this.frontendSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow access from ssh access from anywhere, for testing purposes only');

    // Output the VPC ID
    new cdk.CfnOutput(this, 'VPCId', { value: vpc.vpcId });    
  }
}
