import { Construct, Duration } from "@aws-cdk/core";
import { DatabaseInstance, CfnEventSubscription } from "@aws-cdk/aws-rds";
import { Topic } from "@aws-cdk/aws-sns";
import * as lambda from "@aws-cdk/aws-lambda";
import { SnsEventSource } from "@aws-cdk/aws-lambda-event-sources";
import { SlackWebhookProps } from "./slack_webhook";
import { SnsAction } from "@aws-cdk/aws-cloudwatch-actions";

import { Alarm, Metric, ComparisonOperator } from "@aws-cdk/aws-cloudwatch";

interface DatabaseAlarmOptions {
  highCpuEnabled?: boolean;
  highCpuPct?: number;
  lowMemoryEnabled?: boolean;
  lowMemoryBytes?: number;
  readLatencyEnabled?: boolean;
  readLatencySeconds?: number;
  writeLatencyEnabled?: boolean;
  writeLatencySeconds?: number;
  deadLockEnabled?: boolean;
  deadlockThreshold?: number;
  topic?: Topic;
}

interface DefaultDatabaseAlarmOptions extends DatabaseAlarmOptions {
  highCpuEnabled: boolean;
  highCpuPct: number;
  lowMemoryEnabled: boolean;
  lowMemoryBytes: number;
  readLatencyEnabled: boolean;
  readLatencySeconds: number;
  writeLatencyEnabled: boolean;
  writeLatencySeconds: number;
  deadLockEnabled: boolean;
  deadlockThreshold: number;
}

const DEFAULT_ALARM_OPTIONS: DefaultDatabaseAlarmOptions = {
  writeLatencySeconds: 1,
  writeLatencyEnabled: true,
  readLatencySeconds: 1,
  readLatencyEnabled: true,
  lowMemoryBytes: 100 * 1024 * 1024,
  lowMemoryEnabled: true,
  highCpuPct: 90,
  highCpuEnabled: true,
  deadLockEnabled: true,
  deadlockThreshold: 1,
};

export class DatabaseAlarm {
  /**
   * Create database instance alarms with sensible defaults
   * @param {Construct} scope - the stack to create assets in
   * @param {inst} inst - a DatabaseInstance
   * @param {DatabaseAlarmOptions} options - options and overrides of alarm configuration
   */
  public static createInstanceAlarms(
    scope: Construct,
    inst: DatabaseInstance,
    options?: DatabaseAlarmOptions
  ): void {
    let alarmOptions = options ? options : DEFAULT_ALARM_OPTIONS;
    alarmOptions = { ...DEFAULT_ALARM_OPTIONS, ...alarmOptions };
    const alarms: Alarm[] = [];

    if (alarmOptions.highCpuEnabled) {
      alarms.push(
        DatabaseAlarm.createCpuAlarm(scope, inst, alarmOptions.highCpuPct)
      );
    }

    if (alarmOptions.lowMemoryEnabled && alarmOptions.lowMemoryBytes) {
      alarms.push(
        DatabaseAlarm.createFreeableMemoryAlarm(
          scope,
          inst,
          alarmOptions.lowMemoryBytes
        )
      );
    }

    if (alarmOptions.writeLatencyEnabled) {
      alarms.push(
        DatabaseAlarm.createWriteLatencyAlarm(
          scope,
          inst,
          alarmOptions.writeLatencySeconds
        )
      );
    }

    if (alarmOptions.readLatencyEnabled) {
      alarms.push(
        DatabaseAlarm.createReadLatencyAlarm(
          scope,
          inst,
          alarmOptions.readLatencySeconds
        )
      );
    }

    if (alarmOptions.topic) {
      const snsTopic = alarmOptions.topic;
      alarms.forEach((alarm) => {
        alarm.addAlarmAction(new SnsAction(snsTopic));
      });
    }
  }

  /**
   * Create a CPU Alarm, by default uses a 90% average threshold over a 60 second duration
   * @param {Construct} scope - as CDK Construct
   * @param {DatabaseInstance} inst - a DatabaseInstance
   * @param {number} threshold - (percentage) of CPU Utilization
   **/
  static createCpuAlarm(
    scope: Construct,
    inst: DatabaseInstance,
    threshold?: number
  ): Alarm {
    return new Alarm(scope, inst.node.id + "HighCpuAlarm", {
      metric: new Metric({
        namespace: "AWS/RDS",
        metricName: "CPUUtilization",
        dimensions: {
          DBInstanceIdentifier: inst.instanceIdentifier,
        },
      }),
      threshold: threshold ? threshold : DEFAULT_ALARM_OPTIONS.highCpuPct,
      period: Duration.seconds(60),
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: "High CPU Utilization: " + inst.instanceIdentifier,
      evaluationPeriods: 1,
    });
  }

  /**
   * Create a Write Latency Alarm, by default uses a 1 second average threshold over a 60 second duration
   * @param {Construct} scope - as CDK Construct
   * @param {DatabaseInstance} inst - a DatabaseInstance or DatabaseCluster
   * @param {number} threshold - (second) write latency
   **/
  static createWriteLatencyAlarm(
    scope: Construct,
    inst: DatabaseInstance,
    threshold?: number
  ): Alarm {
    return new Alarm(scope, inst.node.id + "WriteLatencyAlarm", {
      metric: new Metric({
        namespace: "AWS/RDS",
        metricName: "WriteLatency",
        dimensions: {
          DBInstanceIdentifier: inst.instanceIdentifier,
        },
      }),
      threshold: threshold
        ? threshold
        : DEFAULT_ALARM_OPTIONS.writeLatencySeconds,
      period: Duration.seconds(60),
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription:
        "Write Latency excceded threshold for Resource:" +
        inst.instanceIdentifier,
      evaluationPeriods: 1,
    });
  }

  /**
   * Create a Read Latency Alarm, by default uses a 1 second average threshold over a 60 second duration
   * @param {Construct} scope - as CDK Construct
   * @param {DatabaseInstance} inst - a DatabaseInstance
   * @param {number} threshold - (second) write latency
   **/
  static createReadLatencyAlarm(
    scope: Construct,
    inst: DatabaseInstance,
    threshold?: number
  ): Alarm {
    return new Alarm(scope, inst.node.id + "ReadLatencyAlarm", {
      metric: new Metric({
        namespace: "AWS/RDS",
        metricName: "ReadLatency",
        dimensions: {
          DBInstanceIdentifier: inst.instanceIdentifier,
        },
      }),
      threshold: threshold
        ? threshold
        : DEFAULT_ALARM_OPTIONS.readLatencySeconds,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      period: Duration.seconds(60),
      alarmDescription:
        "Read Latency excceded threshold for Resource: " +
        inst.instanceIdentifier,
      evaluationPeriods: 1,
    });
  }

  /**
   * Create a Low Freeable Memory Alarm, average threshold over a 60 second duration
   * @param {Construct} scope - a CDK Construct
   * @param {DatabaseInstance} inst - a DatabaseInstance
   * @param {number} threshold - memory in bytes that are freeable
   **/
  static createFreeableMemoryAlarm(
    scope: Construct,
    inst: DatabaseInstance,
    threshold?: number
  ): Alarm {
    return new Alarm(scope, inst.node.id + "LowFreeableMemory", {
      metric: new Metric({
        namespace: "AWS/RDS",
        metricName: "FreeableMemory",
        dimensions: {
          DBInstanceIdentifier: inst.instanceIdentifier,
        },
      }),
      threshold: threshold ? threshold : DEFAULT_ALARM_OPTIONS.lowMemoryBytes,
      period: Duration.seconds(60),
      comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
      alarmDescription:
        "Read Latency excceded threshold for Resource: " +
        inst.instanceIdentifier,
      evaluationPeriods: 1,
    });
  }

  /**
   * @param {Construct} scope - stack to create the resources in
   * @param {string} id - CDK identifier to form prefix
   * @param {DatabaseInstance} inst - a Database Instance
   * @param {SlackWebhookProps} slackWebHookProps - a Slack WebHook to write events to
   * @param {string[]} eventCategories - An array of RDS event categories of interest, these are detailed in the RDS documentation (https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.html#USER_Events.Messages)
   **/
  static subcribeEventsToSlack(
    scope: Construct,
    id: string,
    inst: DatabaseInstance,
    slackWebHookProps: SlackWebhookProps,
    eventCategories?: string[]
  ): void {
    const topic = new Topic(scope, id + "EventSubscriptionSns");

    const fn = new lambda.Function(scope, id + "EventProcessor", {
      code: lambda.Code.fromAsset("functions/rds_event_to_slack"),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_12_X,
      timeout: Duration.seconds(15),
      memorySize: 128,
      description: "Process RDS events for",
      environment: {
        SLACK_WEBHOOKURL: slackWebHookProps.url,
        SLACK_CHANNELNAME: slackWebHookProps.channel,
        SLACK_USERNAME: slackWebHookProps.username,
      },
    });

    fn.addEventSource(new SnsEventSource(topic));

    DatabaseAlarm.createEventSubscription(
      scope,
      id,
      inst,
      topic,
      eventCategories
    );
  }

  static createEventSubscription(
    scope: Construct,
    id: string,
    inst: DatabaseInstance,
    topic: Topic,
    eventCategories?: string[]
  ): void {
    const subscribeEventCategories = eventCategories
      ? eventCategories
      : [
          "availability",
          "backup",
          "configuration change",
          "creation",
          "deletion",
          "failover",
          "failure",
          "low storage",
          "read replica",
          "recovery",
        ];

    new CfnEventSubscription(scope, id + "EventSubscription", {
      snsTopicArn: topic.topicArn,
      sourceIds: [inst.instanceIdentifier],
      eventCategories: subscribeEventCategories,
    });
  }
}
