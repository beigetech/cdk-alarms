import * as https from "https";
import * as moment from 'moment-timezone';

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

function sendToSlack(snsRecord: SnsRecord) {
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
          text: ":alarm_clock: *Alarm Triggered*: " + message.AlarmName,
        },
      },
      {
        type: "divider",
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text:
              "*State Change*: " +
              moment.tz(message.StateChangeTime,'Australia/Sydney').format("Do MMM yyyy HH:mm:ss A"),
          },
          {
            type: "mrkdwn",
            text: "*Account:* " + message.AWSAccountId,
          },
          {
            type: "mrkdwn",
            text: "*Region:* " + message.Region,
          },
        ],
      },
      {
        type: "divider",
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
export function handler(event: any, context: any): Promise<any> {
  console.log(JSON.stringify(event));

  event.Records.map((record: any) => sendToSlack(record.Sns));
  return event;
}
