import * as https from "https";

interface ECSChange {
  clusterName: string;
  lastStatus: string | undefined;
  desiredStatus: string | undefined;
  extra: string;
  eventType: ECS_EVENT_TYPE;
}

enum HandledDetailTypes {
  TASK_STATE_CHANGE = "ECS Task State Change",
  SERVICE_STATE_CHANGE = "ECS Service Action",
}

enum ECS_EVENT_TYPE {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

let ECS_SERVICE_EVENT_TYPES: Record<string, string> = {
  SERVICE_STEADY_STATE:
    "The service is healthy and at the desired number of tasks, thus reaching a steady state.",
  TASKSET_STEADY_STATE:
    "The task set is healthy and at the desired number of tasks, thus reaching a steady state.",
  CAPACITY_PROVIDER_STEADY_STATE:
    " A capacity provider associated with a service reaches a steady state.",
  SERVICE_DESIRED_COUNT_UPDATED:
    "When the service scheduler updates the computed desired count for a service or task set. This event is not sent when the desired count is manually updated by a user.",
  SERVICE_TASK_START_IMPAIRED:
    "The service is unable to consistently start tasks successfully.",
  SERVICE_DISCOVERY_INSTANCE_UNHEALTHY:
    "A service using service discovery contains an unhealthy task. The service scheduler detects that a task within a service registry is unhealthy.",
  SERVICE_DAEMON_PLACEMENT_CONSTRAINT_VIOLATED:
    "A task in a service using the DAEMON service scheduler strategy no longer meets the placement constraint strategy for the service.",
  ECS_OPERATION_THROTTLED:
    "The service scheduler has been throttled due to the Amazon ECS API throttle limits.",
  SERVICE_DISCOVERY_OPERATION_THROTTLED:
    "The service scheduler has been throttled due to the AWS Cloud Map API throttle limits. This can occur on services configured to use service discovery.",
  SERVICE_TASK_PLACEMENT_FAILURE:
    "The service scheduler is unable to place a task.",
  SERVICE_TASK_CONFIGURATION_FAILURE:
    "The service scheduler is unable to place a task due to a configuration error. The cause will be described in the reason field.",
};

function handle_task_state_change(event: any, context: any): ECSChange {
  let clusterName = event.detail.clusterArn;
  let containers: any[] = event.detail.containers;
  let desiredStatus = event.detail.desiredStatus;
  let lastStatus = event.detail.lastStatus;

  let containerStatuses = containers.map(
    (c) => "Container: " + c.name + " status: " + c.lastStatus
  );

  return {
    clusterName: clusterName,
    lastStatus: lastStatus,
    desiredStatus: desiredStatus,
    extra: containerStatuses.join("\n"),
    eventType:
      lastStatus == "STOPPED" ? ECS_EVENT_TYPE.ERROR : ECS_EVENT_TYPE.INFO,
  };
}

function handle_service_state_change(event: any, context: any): ECSChange {
  let eventType: ECS_EVENT_TYPE = event.detail.eventType;

  let extra =
    "Service: " +
    event.resources[0] +
    ", " +
    ECS_SERVICE_EVENT_TYPES[event.detail.eventName];

  return {
    clusterName: event.detail.clusterArn,
    lastStatus: undefined,
    desiredStatus: undefined,
    extra: extra,
    eventType: eventType,
  };
}

async function sendToSlack(ecsChangeEvent: ECSChange) {
  let desiredStatus = ecsChangeEvent.desiredStatus
    ? ecsChangeEvent.desiredStatus
    : "UNKNOWN";
  let lastStatus = ecsChangeEvent.lastStatus
    ? ecsChangeEvent.lastStatus
    : "UNKNOWN";

  let data = JSON.stringify({
    channel: process.env.SLACK_CHANNELNAME,
    username: process.env.SLACK_USERNAME,
    text: ecsChangeEvent.extra,
    icon_emoji: ":whale2:",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "ORCA: ECS " + ecsChangeEvent.eventType + " event",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Cluster*: `" + ecsChangeEvent.clusterName + "`",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Desired Status:* `" + desiredStatus + "`",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Last Status:* `" + lastStatus + "`",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "```" + ecsChangeEvent.extra + "```",
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
 * Process ECS events and send notifications to slack
 */
export async function handler(event: any, context: any): Promise<ECSChange> {
  let change: ECSChange;

  if (event["detail-type"] == HandledDetailTypes.TASK_STATE_CHANGE) {
    change = handle_task_state_change(event, context);
  } else if (event["detail-type"] == HandledDetailTypes.SERVICE_STATE_CHANGE) {
    change = handle_service_state_change(event, context);
  } else {
    return Promise.reject("unhandled ECS detail type");
  }

  await sendToSlack(change);

  return Promise.resolve(change);
}
