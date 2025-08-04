import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {LambdaIntegration, RestApi} from "aws-cdk-lib/aws-apigateway";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {Runtime, StartingPosition} from "aws-cdk-lib/aws-lambda";
import {Subscription, SubscriptionProtocol, Topic} from "aws-cdk-lib/aws-sns";
import {AttributeType, BillingMode, StreamViewType, Table} from "aws-cdk-lib/aws-dynamodb";
import {DynamoEventSource} from "aws-cdk-lib/aws-lambda-event-sources";
import * as path from "node:path";

export class AwsRegularExamStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const topic = new Topic(this, "topic");

        new Subscription(this, "subscription", {
            topic: topic,
            protocol: SubscriptionProtocol.EMAIL,
            endpoint: "i_rusenov@abv.bg"
        });

        const table = new Table(this, "order", {
            partitionKey: {
                name: "PK",
                type: AttributeType.STRING
            },
            sortKey: {
                name: "SK",
                type: AttributeType.STRING
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
            timeToLiveAttribute: "ttl",
            stream: StreamViewType.NEW_AND_OLD_IMAGES,
        });

        const func1 = new NodejsFunction(this, "func1", {
            handler: "handler",
            runtime: Runtime.NODEJS_20_X,
            entry: path.join(__dirname, "../src/func1.ts"),
            environment: {
                // permissions: [topic],
                TABLE_NAME: table.tableName,
                TOPIC_ARN: topic.topicArn,
            }
        });

        topic.grantPublish(func1);
        table.grantReadWriteData(func1)

        const deleteFunc = new NodejsFunction(this, "deleteFunc", {
            handler: "lambdas/deleteFunc.handler",
            runtime: Runtime.NODEJS_20_X,
            entry: path.join(__dirname, "../src/deleteFunc.ts"),

            environment: {
                TABLE_NAME: table.tableName,
                TOPIC_ARN: topic.topicArn,
            },

        });

        table.grantReadWriteData(deleteFunc);
        topic.grantPublish(deleteFunc);

        deleteFunc.addEventSource(new DynamoEventSource(table, {
            startingPosition: StartingPosition.TRIM_HORIZON,
        }));

        const api = new RestApi(this, "api");
        const resource = api.root.addResource("order");
        resource.addMethod("POST", new LambdaIntegration(func1, {proxy: true}));

    }
}
