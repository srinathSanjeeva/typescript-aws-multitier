// lib/frontend-stack.ts
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';

interface FrontendStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.Vpc;
  frontendSecurityGroup: ec2.SecurityGroup;
  albConfig: {
    internetFacing: boolean;
    listenerPort: number;
    backendListenerPort: number;
  };
  frontendInstanceConfig: {
    instanceType: string;
    minCapacity: number;
    maxCapacity: number;
    desiredCapacity: number;
    keyName: string;
  };
  backendAutoScalingGroup: autoscaling.AutoScalingGroup;
}

export class FrontendStack extends cdk.Stack {

  public readonly frontendAutoScalingGroup: autoscaling.AutoScalingGroup;
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

            // Define the user data shell script
            const userDataScript = `#!/bin/bash            
            sudo yum update -y
            sudo yum install docker -y
          `;

        // Create Auto Scaling Group for the frontend instance
        this.frontendAutoScalingGroup = new autoscaling.AutoScalingGroup(this, `${props.environment}-FrontendAutoScalingGroup`, {
          vpc: props.vpc,
          instanceType: new ec2.InstanceType(props.frontendInstanceConfig.instanceType),
          machineImage: new ec2.AmazonLinuxImage(),
          keyName: props.frontendInstanceConfig.keyName,
          minCapacity: props.frontendInstanceConfig.minCapacity,
          maxCapacity: props.frontendInstanceConfig.maxCapacity,
          desiredCapacity: props.frontendInstanceConfig.desiredCapacity,
          securityGroup: props.frontendSecurityGroup,
          vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
        });

        this.frontendAutoScalingGroup.addUserData(userDataScript);
        this.frontendAutoScalingGroup.addSecurityGroup(props.frontendSecurityGroup);
        this.frontendAutoScalingGroup.node.addDependency(props.vpc);        
        this.frontendAutoScalingGroup.node.addDependency(props.backendAutoScalingGroup);

    // Create Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(
      this,
      `${props.environment}-ALB`,
      {
        vpc: props.vpc,
        internetFacing: props.albConfig.internetFacing,
      }
    );

    // Create a listener and target group for the ALB
    const frontendListener = alb.addListener('Listener', {
      port: props.albConfig.listenerPort,
    });

    // Create a target group
    const frontendTargetGroup = new elbv2.ApplicationTargetGroup(
      this,
      'frontendTargetGroup',
      {
        vpc: props.vpc,
        port: props.albConfig.listenerPort
      }
    );

    // Attach the target group to the listener
    frontendListener.addTargetGroups('frontendTargetGroup', {
      targetGroups: [frontendTargetGroup],
    });

    // Add backendAutoScalingGroup as a target to the target group
    const backendListener = alb.addListener('BackendListener', {
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: props.albConfig.backendListenerPort,
    });

    // Create Target Groups
    const backendTargetGroup = new elbv2.ApplicationTargetGroup(this, 'BackendTargetGroup', {
      protocol: elbv2.ApplicationProtocol.HTTP,
      port: props.albConfig.backendListenerPort,
      vpc: props.vpc,
      targets: [],
    });    

    // Attach the target group to the listener
    backendListener.addTargetGroups('backendTargetGroup', {
      targetGroups: [backendTargetGroup],
    });

    alb.node.addDependency(props.vpc);
    alb.node.addDependency(this.frontendAutoScalingGroup);
    alb.node.addDependency(props.backendAutoScalingGroup);
    // alb.node.addDependency(props.backendAutoScalingGroup);

    // Output the DNS name of the ALB for testing purposes
    new cdk.CfnOutput(this, 'ALBDNSName', {
      value: alb.loadBalancerDnsName,
    });
  }
}
