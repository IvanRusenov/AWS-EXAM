import {APIGatewayProxyEvent} from "aws-lambda";
import {DynamoDBClient, PutItemCommand} from "@aws-sdk/client-dynamodb";
import {PublishCommand, SNSClient} from "@aws-sdk/client-sns";
const ddb = new DynamoDBClient();
const sns = new SNSClient();
const topicArn = process.env.TOPIC_ARN;

export const handler = async (event: APIGatewayProxyEvent) => {

    console.log(JSON.stringify(event));

    const {valid, value, description, buyer} = JSON.parse(event.body!);

    const body = JSON.parse(event.body || "{}");

    if (valid) {
        console.log("Valid JSON. Sending email.");

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
        const timestamp = Math.floor(Date.now() / 1000);
        // const ttl = timestamp + 1800;
        const ttl = timestamp + 60;

        await ddb.send(
            new PutItemCommand({
                TableName: process.env.TABLE_NAME,
                Item: {
                    PK: { S: `INVALID#${Date.now()}` },
                    SK: { S: "JSON" },
                    timestamp: { N: String(timestamp) },
                    ttl: { N: String(ttl) },
                    body: { S: JSON.stringify(body) },
                },
            })
        );

        return {
            statusCode: 400,
            body: "Invalid JSON. Stored for 1 mins."
            // body: "Invalid JSON. Stored for 30 mins."
        };


    }

}