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

let getRef = (scope: Stack, inst: DatabaseInstance | DatabaseCluster): any => {
  return {
    Ref: scope.getLogicalId(inst.node.defaultChild as CfnElement),
  };
};

/**
 * Extend options with defaults
 * @param {DatabaseAlarmOptions} a - The options to extend
 * @param {DefaultDatabaseAlarmOptions} b - The options to use to extend a
 **/
let extend = (a: DatabaseAlarmOptions, b: DefaultDatabaseAlarmOptions) => {
  Object.keys(b).forEach((k) => {
    if (!Object.prototype.hasOwnProperty.call(a, k)) {
      (a as any)[k] = (b as any)[k];
    }
  });
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

export class DatabaseAlarm {
  /**
   * Create DatabaseCluster alarms, with sensible defaults, can override defaults
   * @param {Construct} scope
   * @param {string} id
   * @param {DatabaseCluster} inst - database cluster
   * @param {DatabaseAlarmOptions} options - override alarm configuration
   * */
  public static createClusterAlarms(
    scope: Stack,
    inst: DatabaseCluster,
    options?: DatabaseAlarmOptions
  ) {
    let alarmOptions = options ? options : DEFAULT_ALARM_OPTIONS;
    extend(alarmOptions, DEFAULT_ALARM_OPTIONS);

    if (alarmOptions.highCpuEnabled) {
      DatabaseAlarm.createCpuAlarm(scope, inst, alarmOptions.highCpuPct);
    }

    if (alarmOptions.lowMemoryEnabled && alarmOptions.lowMemoryBytes) {
      DatabaseAlarm.createFreeableMemoryAlarm(
        scope,
        inst,
        alarmOptions.lowMemoryBytes
      );
    }

    if (alarmOptions.readLatencyEnabled) {
      DatabaseAlarm.createReadLatencyAlarm(
        scope,
        inst,
        alarmOptions.readLatencySeconds
      );
    }

    if (alarmOptions.writeLatencyEnabled) {
      DatabaseAlarm.createWriteLatencyAlarm(
        scope,
        inst,
        alarmOptions.writeLatencySeconds
      );
    }

    if (alarmOptions.deadLockEnabled) {
      DatabaseAlarm.createDeadlockAlarm(
        scope,
        inst,
        alarmOptions.deadlockThreshold
      );
    }
  }

  public static createInstanceAlarms(
    scope: Stack,
    inst: DatabaseInstance,
    options?: DatabaseAlarmOptions
  ) {
    let alarmOptions = options ? options : DEFAULT_ALARM_OPTIONS;
    extend(alarmOptions, DEFAULT_ALARM_OPTIONS);

    if (alarmOptions.highCpuEnabled) {
      DatabaseAlarm.createCpuAlarm(scope, inst, alarmOptions.highCpuPct);
    }

    if (alarmOptions.lowMemoryEnabled && alarmOptions.lowMemoryBytes) {
      DatabaseAlarm.createFreeableMemoryAlarm(
        scope,
        inst,
        alarmOptions.lowMemoryBytes
      );
    }

    if (alarmOptions.writeLatencyEnabled) {
      DatabaseAlarm.createWriteLatencyAlarm(
        scope,
        inst,
        alarmOptions.writeLatencySeconds
      );
    }

    if (alarmOptions.readLatencyEnabled) {
      DatabaseAlarm.createReadLatencyAlarm(
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
    threshold?: number
  ) {
    let ref = getRef(scope, inst);

    new Alarm(scope, ref.Ref + "HighCpuAlarm", {
      metric: new Metric({
        namespace: "AWS/RDS",
        metricName: "CPUUtilization",
        dimensions: getDimensions(inst, ref),
      }),
      threshold: threshold ? threshold : DEFAULT_ALARM_OPTIONS.highCpuPct,
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
    threshold?: number
  ) {
    let ref = getRef(scope, inst);

    new Alarm(scope, ref.Ref + "WriteLatencyAlarm", {
      metric: new Metric({
        namespace: "AWS/RDS",
        metricName: "WriteLatency",
        dimensions: getDimensions(inst, ref),
      }),
      threshold: threshold
        ? threshold
        : DEFAULT_ALARM_OPTIONS.writeLatencySeconds,
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
    threshold?: number
  ) {
    let ref = getRef(scope, inst);

    new Alarm(scope, ref.Ref + "ReadLatencyAlarm", {
      metric: new Metric({
        namespace: "AWS/RDS",
        metricName: "ReadLatency",
        dimensions: getDimensions(inst, ref),
      }),
      threshold: threshold
        ? threshold
        : DEFAULT_ALARM_OPTIONS.readLatencySeconds,
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
    threshold?: number
  ) {
    let ref = getRef(scope, inst);

    new Alarm(scope, ref.Ref + "LowFreeableMemory", {
      metric: new Metric({
        namespace: "AWS/RDS",
        metricName: "FreeableMemory",
        dimensions: getDimensions(inst, ref),
      }),
      threshold: threshold ? threshold : DEFAULT_ALARM_OPTIONS.lowMemoryBytes,
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
    threshold?: number
  ) {
    let ref = getRef(scope, inst);

    new Alarm(scope, ref.Ref + "Deadlocks", {
      metric: new Metric({
        namespace: "AWS/RDS",
        metricName: "Deadlocks",
        dimensions: getDimensions(inst, ref),
      }),
      threshold: threshold
        ? threshold
        : DEFAULT_ALARM_OPTIONS.deadlockThreshold,
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
   * @param {DatabaseInstance | DatabaseCluster} - inst a Database Instance
   * @param {SlackWebhookProps} - slackWebHookProps a Slack WebHook to write events to
   * @param {string[]} eventCategories - An array of RDS event categories of interest, these are detailed in the RDS documentation (https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.html#USER_Events.Messages)
   **/
  static subcribeEventsToSlack(
    scope: Stack,
    id: string,
    inst: DatabaseInstance | DatabaseCluster,
    slackWebHookProps: SlackWebhookProps,
    eventCategories?: string[]
  ) {
    let topic = new Topic(scope, id + "EventSubscriptionSns");

    let fn = new lambda.Function(scope, id + "EventProcessor", {
      code: lambda.Code.fromAsset("resources/rds_event_to_slack"),
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
    scope: Stack,
    id: string,
    inst: DatabaseInstance | DatabaseCluster,
    topic: Topic,
    eventCategories?: string[]
  ) {
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

    new CfnEventSubscription(scope, id + "EventSubscription", {
      snsTopicArn: topic.topicArn,
      sourceIds: [
        Fn.ref(scope.getLogicalId(inst.node.defaultChild as CfnElement)),
      ],
      eventCategories: subscribeEventCategories,
    });
  }
}
