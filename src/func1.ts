import {APIGatewayProxyEvent} from "aws-lambda";
import {DynamoDBClient, PutItemCommand} from "@aws-sdk/client-dynamodb";
import {PublishCommand, SNSClient} from "@aws-sdk/client-sns";
import {CreateScheduleCommand, SchedulerClient} from "@aws-sdk/client-scheduler";
import {randomUUID} from "node:crypto";

const ddb = new DynamoDBClient();
const sns = new SNSClient();
const schedulerClient = new SchedulerClient();

export const handler = async (event: APIGatewayProxyEvent) => {

    console.log(JSON.stringify(event));

    const topicArn = process.env.TOPIC_ARN;
    const {valid, value, description, buyer} = JSON.parse(event.body!);
    const body = JSON.parse(event.body || "{}");

    if (valid) {

        await sns.send(new PublishCommand({
            TopicArn: topicArn,
            Subject: "Valid JSON Received",
            Message: JSON.stringify(body, null, 2),
        }));

        return {
            statusCode: 200,
            body: "Valid JSON sent via SNS.",
        };

    } else {

        const timestamp = Math.floor(Date.now() / 1000) + 60;
        // const executeAt = (timestamp + 60); //1min
        // const executeAt = new Date (timestamp + 1800).toISOString(); //30min
        const after60sec = Date.now() + 60 * 1000;
        // Изчисли времето за 60 секунди напред
        const delayInMs = 60 * 1000;
        const futureDate = new Date(Date.now() + delayInMs);

// AWS Scheduler не приема милисекунди -> зануляваме ги
        futureDate.setMilliseconds(0);

// Превръщаме във валиден ISO формат (без милисекунди)
        const executeAt = futureDate.toISOString();

        const itemId = randomUUID();

        await ddb.send(
            new PutItemCommand({
                TableName: process.env.TABLE_NAME,
                Item: {
                    PK: { S: itemId },
                    SK: { S: "JSON" },
                    createdAt: { N: String(timestamp) },
                    body: { S: JSON.stringify(body) },
                },
            })
        );

        await schedulerClient.send(new CreateScheduleCommand({
            Name: `schedulerDeleteItem`,
            FlexibleTimeWindow: {
                Mode: "OFF"
            },
            ScheduleExpression: `at(${executeAt})`,
            Target: {
                Arn: process.env.DELETE_FUNC_ARN,
                Input: JSON.stringify({ PK: itemId, createdAt: timestamp }),
                RoleArn: process.env.ROLE_ADMIN_ARN,
                }
        }));

        return {
            statusCode: 400,
            // body: "Invalid JSON. Stored for 30 mins. Deletion scheduled!"
            body: "Invalid JSON. Stored for 1 mins. Deletion scheduled!"
        };

    }

}