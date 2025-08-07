import {PublishCommand, SNSClient} from "@aws-sdk/client-sns";
import {DeleteItemCommand, DynamoDBClient} from "@aws-sdk/client-dynamodb";

const sns = new SNSClient();
const ddb = new DynamoDBClient();

export const handler = async (event: any) => {

    const createdAt = event.createdAt;
    const now = Math.floor(Date.now() / 1000);
    const duration = now - createdAt;

    await ddb.send(new DeleteItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
            PK: {
                S: event.PK
            }
        }
    }));

    const msg = `Invalid JSON stayed in DynamoDB for ${duration} seconds!`;

    await sns.send(new PublishCommand({
        TopicArn: process.env.TOPIC_ARN,
        Subject: "Invalid JSON Deleted",
        Message: msg
    }));

}