import * as https from "https";

interface RDSChange {
  dbInstanceIdentifier: string;
  message: string;
  eventType: string;
}

enum HandledDetailTypes {
  INSTANCE_EVENT = "RDS DB Instance Event",
}

function handle_instance_state_change(event: any, context: any): RDSChange {
  return {
    dbInstanceIdentifier: event.detail.SourceArn,
    message: event.detail.Message,
    eventType: event.detail.EventCategories.join(","),
  };
}

function sendToSlack(rdsChangeEvent: RDSChange): RDSChange {
  let data = JSON.stringify({
    channel: process.env.SLACK_CHANNELNAME,
    username: process.env.SLACK_USERNAME,
    text: rdsChangeEvent.message,
    icon_emoji: ":whale2:",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "RDS " + rdsChangeEvent.eventType + " event",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*RDS Instance*: `" + rdsChangeEvent.dbInstanceIdentifier + "`",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "```" + rdsChangeEvent.message + "```",
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

  return rdsChangeEvent;
}

/**
 * Process ECS events and send notifications to slack
 */
export function handler(event: any, context: any): RDSChange {
  let change: RDSChange;

  if (event["detail-type"] == HandledDetailTypes.INSTANCE_EVENT) {
    change = handle_instance_state_change(event, context);
  } else {
    throw "unhandled RDS detail type or uninteresting event";
  }

  return sendToSlack(change);
}
