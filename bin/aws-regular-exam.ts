import * as cdk from 'aws-cdk-lib';
import { AwsRegularExamStack } from '../lib/aws-regular-exam-stack';

const app = new cdk.App();
new AwsRegularExamStack(app, 'AwsRegularExamStack', {
    env: {
        region: "eu-central-1"
    }
});