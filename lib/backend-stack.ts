// lib/backend-stack.ts
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';

interface BackendStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.Vpc;
  rds: rds.DatabaseInstance;
  rdsConfig: {
    instanceType: string;
    allocatedStorage: number;
    storageType: rds.StorageType;
    userName: string;
    password: string;
    db_database: string;
  };
  rdsEndpoint: string;
  backendSecurityGroup: ec2.SecurityGroup;
  backendInstanceConfig: {
    instanceType: string;
    minCapacity: number;
    maxCapacity: number;
    desiredCapacity: number;
    app_port: number;
    keyName: string;
  };

}

export class BackendStack extends cdk.Stack {

  
  public readonly backendAutoScalingGroup: autoscaling.AutoScalingGroup;
  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

        // // Retrieve the RDS endpoint from the exported value
        // const rdsEndpoint = cdk.Fn.importValue(props.rds.dbInstanceEndpointAddress);
        // Define the user data shell script
        const userDataScript = `#!/bin/bash
        sudo yum update -y
        sudo yum install docker -y
        sudo service docker start
        touch /home/ec2-user/env.file
        echo "DB_HOST=${props.rdsEndpoint}" >> /home/ec2-user/env.file
        echo "DB_USER=${props.rdsConfig.userName}" >> /home/ec2-user/env.file
        echo "DB_NAME=${props.rdsConfig.db_database}" >> /home/ec2-user/env.file
        echo "DB_PASSWORD=${props.rdsConfig.password}" >> /home/ec2-user/env.file
        sudo docker pull sanjeevas/backend-node-app:latest
        sudo docker run --env-file /home/ec2-user/env.file -d -p ${props.backendInstanceConfig.app_port}:3000 sanjeevas/backend-node-app:latest
      `;

        // Create Auto Scaling Group for the backend instance
        this.backendAutoScalingGroup = new autoscaling.AutoScalingGroup(this, `${props.environment}-BackendAutoScalingGroup`, {
            vpc: props.vpc,
            instanceType: new ec2.InstanceType(props.backendInstanceConfig.instanceType),
            machineImage: new ec2.AmazonLinuxImage(),
            keyName: props.backendInstanceConfig.keyName,
            minCapacity: props.backendInstanceConfig.minCapacity,
            maxCapacity: props.backendInstanceConfig.maxCapacity,
            desiredCapacity: props.backendInstanceConfig.desiredCapacity,
            securityGroup: props.backendSecurityGroup,
            vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },            
            
          });
          
          this.backendAutoScalingGroup.addUserData(userDataScript);
          this.backendAutoScalingGroup.node.addDependency(props.vpc);
          this.backendAutoScalingGroup.node.addDependency(props.rds);

          
    
  }
}
