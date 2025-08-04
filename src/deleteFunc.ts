import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const sns = new SNSClient();
const topicArn = process.env.TOPIC_ARN!;

export async function handler(event:any) {

    console.log(event);

    for (const record of event.Records) {
        if (record.eventName === "REMOVE") {
            const old = record.dynamodb.OldImage;
            const originalTime = Number(old.timestamp.N);
            const now = Math.floor(Date.now() / 1000);
            const duration = now - originalTime;

            const msg = `Invalid JSON stayed in DynamoDB for ${duration} seconds.\n\nContent:\n${old.body.S}`;

            await sns.send(new PublishCommand({
                TopicArn: topicArn,
                Subject: "Invalid JSON Deleted",
                Message: msg,
            }));
        }
    }


}