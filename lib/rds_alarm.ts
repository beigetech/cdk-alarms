import { Stack, Duration, CfnElement, Fn } from "@aws-cdk/core";
import {
  DatabaseCluster,
  DatabaseInstance,
  CfnEventSubscription,
} from "@aws-cdk/aws-rds";
import { Topic } from "@aws-cdk/aws-sns";
import * as lambda from "@aws-cdk/aws-lambda";
import { SnsEventSource } from "@aws-cdk/aws-lambda-event-sources";
import { SlackWebhookProps } from "./slack_webhook";

import {
  Alarm,
  Metric,
  DimensionHash,
  ComparisonOperator,
} from "@aws-cdk/aws-cloudwatch";

interface DBAlarmOptions {
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

const DEFAULT_ALARM_OPTIONS: DBAlarmOptions = {
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

let getRef = (scope: Stack, inst: DatabaseInstance | DatabaseCluster): any => {
  return {
    Ref: scope.getLogicalId(inst.node.defaultChild as CfnElement),
  };
};

let getDimensions = (
  inst: DatabaseInstance | DatabaseCluster,
  ref: Record<string, string>
): DimensionHash => {
  if (inst instanceof DatabaseInstance) {
    return {
      DBInstanceIdentifier: ref,
    };
  }

  return {
    DBClusterIdentifier: ref,
  };
};

export class DBAlarm {
  /**
   * Create DatabaseCluster alarms, with sensible defaults, can override defaults
   * @param {Construct} scope
   * @param {string} id
   * @param {DatabaseCluster} inst - database cluster
   * @param {DBAlarmOptions} options - override alarm configuration
   * */
  public static createClusterAlarms(
    scope: Stack,
    inst: DatabaseCluster,
    options?: DBAlarmOptions
  ) {
    let alarmOptions = options ? options : DEFAULT_ALARM_OPTIONS;

    if (alarmOptions.highCpuEnabled) {
      DBAlarm.createCpuAlarm(scope, inst, alarmOptions.highCpuPct);
    }

    if (alarmOptions.lowMemoryEnabled && alarmOptions.lowMemoryBytes) {
      DBAlarm.createFreeableMemoryAlarm(
        scope,
        inst,
        alarmOptions.lowMemoryBytes
      );
    }

    if (alarmOptions.readLatencyEnabled) {
      DBAlarm.createReadLatencyAlarm(
        scope,
        inst,
        alarmOptions.readLatencySeconds
      );
    }

    if (alarmOptions.writeLatencyEnabled) {
      DBAlarm.createWriteLatencyAlarm(
        scope,
        inst,
        alarmOptions.writeLatencySeconds
      );
    }

    if (alarmOptions.deadLockEnabled) {
      DBAlarm.createDeadlockAlarm(scope, inst, alarmOptions.deadlockThreshold);
    }
  }

  public static createInstanceAlarms(
    scope: Stack,
    inst: DatabaseInstance,
    options?: DBAlarmOptions
  ) {
    let alarmOptions = options ? options : DEFAULT_ALARM_OPTIONS;

    if (alarmOptions.highCpuEnabled) {
      DBAlarm.createCpuAlarm(scope, inst, alarmOptions.highCpuPct);
    }

    if (alarmOptions.lowMemoryEnabled && alarmOptions.lowMemoryBytes) {
      DBAlarm.createFreeableMemoryAlarm(
        scope,
        inst,
        alarmOptions.lowMemoryBytes
      );
    }

    if (alarmOptions.writeLatencyEnabled) {
      DBAlarm.createWriteLatencyAlarm(
        scope,
        inst,
        alarmOptions.writeLatencySeconds
      );
    }

    if (alarmOptions.readLatencyEnabled) {
      DBAlarm.createReadLatencyAlarm(
        scope,
        inst,
        alarmOptions.readLatencySeconds
      );
    }
  }

  /**
   * Create a CPU Alarm, by default uses a 90% average threshold over a 60 second duration
   * @param {Stack} scope - as CDK Stack
   * @param {string} id - an identifier to form a unique resource name
   * @param {number} threshold - (percentage) of CPU Utilization
   **/
  static createCpuAlarm(
    scope: Stack,
    inst: DatabaseInstance | DatabaseCluster,
    threshold: number
  ) {
    let ref = getRef(scope, inst);

    new Alarm(scope, ref.Ref + "HighCpuAlarm", {
      metric: new Metric({
        namespace: "AWS/RDS",
        metricName: "CPUUtilization",
        dimensions: getDimensions(inst, ref),
      }),
      threshold: threshold,
      period: Duration.seconds(60),
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: Fn.join("", ["High CPU Utilization:", Fn.ref(ref.Ref)]),
      evaluationPeriods: 1,
    });
  }

  /**
   * Create a Write Latency Alarm, by default uses a 1 second average threshold over a 60 second duration
   * @param {Stack} scope - as CDK Stack
   * @param {DatabaseCluster | DatabaseInstance} a DatabaseInstance or DatabaseCluster
   * @param {number} threshold (second) write latency
   **/
  static createWriteLatencyAlarm(
    scope: Stack,
    inst: DatabaseCluster | DatabaseInstance,
    threshold: number
  ) {
    let ref = getRef(scope, inst);

    new Alarm(scope, ref.Ref + "WriteLatencyAlarm", {
      metric: new Metric({
        namespace: "AWS/RDS",
        metricName: "WriteLatency",
        dimensions: getDimensions(inst, ref),
      }),
      threshold: threshold,
      period: Duration.seconds(60),
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: Fn.join("", [
        "Write Latency excceded threshold for Resource:",
        Fn.ref(ref.Ref),
      ]),
      evaluationPeriods: 1,
    });
  }

  /**
   * Create a Read Latency Alarm, by default uses a 1 second average threshold over a 60 second duration
   * @param {Stack} scope - as CDK Stack
   * @param {DatabaseCluster | DatabaseInstance} a DatabaseInstance or DatabaseCluster
   * @param {number} threshold (second) write latency
   **/
  static createReadLatencyAlarm(
    scope: Stack,
    inst: DatabaseCluster | DatabaseInstance,
    threshold: number
  ) {
    let ref = getRef(scope, inst);

    new Alarm(scope, ref.Ref + "ReadLatencyAlarm", {
      metric: new Metric({
        namespace: "AWS/RDS",
        metricName: "ReadLatency",
        dimensions: getDimensions(inst, ref),
      }),
      threshold: threshold,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      period: Duration.seconds(60),
      alarmDescription: Fn.join("", [
        "Read Latency excceded threshold for Resource:",
        Fn.ref(ref.Ref),
      ]),
      evaluationPeriods: 1,
    });
  }

  /**
   * Create a Low Freeable Memory Alarm, average threshold over a 60 second duration
   * @param {Stack} scope - a CDK Stack
   * @param {DatabaseCluster | DatabaseInstance} a DatabaseInstance or DatabaseCluster
   * @param {number} threshold - memory in bytes that are freeable
   **/
  static createFreeableMemoryAlarm(
    scope: Stack,
    inst: DatabaseCluster | DatabaseInstance,
    threshold: number
  ) {
    let ref = getRef(scope, inst);

    new Alarm(scope, ref.Ref + "LowFreeableMemory", {
      metric: new Metric({
        namespace: "AWS/RDS",
        metricName: "FreeableMemory",
        dimensions: getDimensions(inst, ref),
      }),
      threshold: threshold,
      period: Duration.seconds(60),
      comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
      alarmDescription: Fn.join("", [
        "Read Latency excceded threshold for Resource:",
        Fn.ref(ref.Ref),
      ]),
      evaluationPeriods: 1,
    });
  }

  /**
   * Create a Deadlock Alarm, average threshold over a 60 second duration
   * @param {Stack} scope - a CDK Stack
   * @param {DatabaseCluster} a DatabaseCluster
   * @param {number} threshold - memory in bytes that are freeable
   **/
  static createDeadlockAlarm(
    scope: Stack,
    inst: DatabaseCluster,
    threshold: number
  ) {
    let ref = getRef(scope, inst);

    new Alarm(scope, ref.Ref + "Deadlocks", {
      metric: new Metric({
        namespace: "AWS/RDS",
        metricName: "Deadlocks",
        dimensions: getDimensions(inst, ref),
      }),
      threshold: threshold,
      period: Duration.seconds(60),
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      alarmDescription: Fn.join("", [
        "Deadlock threshold for Resource:",
        Fn.ref(ref.Ref),
      ]),
      evaluationPeriods: 1,
    });
  }

  /**
   * @param {Stack} - scope stack to create the resources in
   * @param {string} - id CDK identifier to form prefix
   * @param {DatabaseCluster} - cluster an Aurora Database Cluster
   * @param {SlackWebhookProps} slackWebHookProps - a Slack WebHook to write events to
   * @param {string[]} eventCategories - An array of RDS event categories of interest, these are detailed in the RDS documentation (https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.html#USER_Events.Messages)
   **/
  static subcribeClusterEventsToSlack(
    scope: Stack,
    id: string,
    cluster: DatabaseCluster,
    slackWebHookProps: SlackWebhookProps,
    eventCategories?: string[]
  ) {
    let topic = new Topic(scope, id + "event-subscription-sns");

    let subscribeEventCategories = eventCategories
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

    let fn = new lambda.Function(scope, id + "event-processor", {
      code: lambda.Code.fromAsset("resources/rds_event_to_slack"),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_12_X,
      timeout: Duration.seconds(15),
      memorySize: 128,
      description: "Process RDS events for " + cluster.clusterIdentifier,
      environment: {
        SLACK_WEBHOOKURL: slackWebHookProps.url,
        SLACK_CHANNELNAME: slackWebHookProps.channel,
        SLACK_USERNAME: slackWebHookProps.username,
      },
    });

    fn.addEventSource(new SnsEventSource(topic));

    new CfnEventSubscription(scope, id + "event-subscription", {
      snsTopicArn: topic.topicArn,
      sourceIds: [cluster.clusterIdentifier],
      eventCategories: subscribeEventCategories,
    });
  }
}
