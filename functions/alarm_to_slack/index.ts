import * as https from "https";

interface SnsRecord {
  Subject: string;
  Message: string;
}

interface SnsMessage {
  Region: string;
  AWSAccountId: string;
  AlarmName: string;
  StateChangeTime: string;
  NewStateReason: string;
}

async function sendToSlack(snsRecord: SnsRecord) {
  let message: SnsMessage = JSON.parse(snsRecord.Message);

  let data = JSON.stringify({
    channel: process.env.SLACK_CHANNELNAME,
    username: process.env.SLACK_USERNAME,
    text: snsRecord.Subject,
    icon_emoji: ":whale2:",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message.AlarmName,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message.StateChangeTime,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message.AWSAccountId,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message.Region,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message.NewStateReason,
        },
      },
    ],
  });

  let webhook_path = process.env.SLACK_WEBHOOKURL;

  let options = {
    hostname: "hooks.slack.com",
    method: "POST",
    port: 443,
    path: webhook_path,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  };

  let request = https.request(options, (resp: any) => {
    console.log("wrote alert to slack channel");
    console.log("response was:", resp.statusCode);
  });

  request.on("error", (error) => {
    console.log("failed to write alert");
    console.log(error);
  });

  request.write(data);
  request.end();
}

/**
 * Process CloudWatch alarms and send notifications to slack
 */
export async function handler(event: any, context: any): Promise<any> {
  console.log(JSON.stringify(event));
  return Promise.all(
    event.Records.map((record: any) => sendToSlack(record.Sns))
  );
}
