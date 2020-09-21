import * as https from "https";
const zlib = require("zlib");

function sendToSlack(message: string, log_stream: string, log_group: string) {
  let data = JSON.stringify({
    channel: process.env.SLACK_CHANNELNAME,
    username: process.env.SLACK_USERNAME,
    text: message,
    icon_emoji: ":whale2:",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "ORCA: Error encountered",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Log Group*: `" + log_group + "`",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Log Stream:* `" + log_stream + "`",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "```" + message + "```",
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

export function handler(event: any, context: any) {
  let payload = Buffer.from(event.awslogs.data, "base64");
  const events = JSON.parse(zlib.unzipSync(payload).toString());
  const logevents = events.logEvents;
  console.log(events);

  logevents.forEach((logevent: any) =>
    sendToSlack(logevent.message, events.logStream, events.logGroup)
  );
}
