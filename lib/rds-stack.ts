// lib/backend-stack.ts
import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';

interface RDSStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.Vpc;
  backendSecurityGroup: ec2.SecurityGroup;
  rdsConfig: {
    instanceType: string;
    allocatedStorage: number;
    storageType: rds.StorageType;
    userName: string;
    password: string;
    db_database: string;
  };
}

export class RDSStack extends cdk.Stack {
    public readonly rdsInstance: rds.DatabaseInstance;
    public readonly rdsEndpoint: string;
 
    constructor(scope: Construct, id: string, props: RDSStackProps) {
        super(scope, id, props);

    // Templated secret with username and password fields
    const templatedSecret = new secretsmanager.Secret(this, 'TemplatedSecret', {
        generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: props.rdsConfig.userName }),
        generateStringKey: props.rdsConfig.password,
        excludeCharacters: '/@"',
        },
    });        

        // Create RDS MySQL instance
        this.rdsInstance = new rds.DatabaseInstance(this, `${props.environment}-RDSInstance`, {
        engine: rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.VER_8_0 }),
        instanceType: ec2.InstanceType.of(
            ec2.InstanceClass.BURSTABLE2,
            ec2.InstanceSize.MICRO
        ),
        credentials: {
            username: props.rdsConfig.userName,
            password: templatedSecret.secretValueFromJson(props.rdsConfig.password)
          },        

        databaseName: props.rdsConfig.db_database,
        vpc: props.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        // vpcPlacement: { subnetType: ec2.SubnetType.PRIVATE },
        allocatedStorage: props.rdsConfig.allocatedStorage,
        storageType: props.rdsConfig.storageType,
        deletionProtection: false, // Set to true to enable deletion protection
        removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production
        });
        this.rdsInstance.node.addDependency(props.vpc);

        this.rdsInstance.connections.allowFrom(props.backendSecurityGroup, ec2.Port.tcp(3360), 'Allow access on port 3360 from the backend instance');

        // Store RDS endpoint in the public variable
        this.rdsEndpoint = this.rdsInstance.dbInstanceEndpointAddress;        
        // Output RDS endpoint for reference
        new cdk.CfnOutput(this, 'RdsEndpoint', {
            value: this.rdsInstance.dbInstanceEndpointAddress,
        });
    
  }
}
