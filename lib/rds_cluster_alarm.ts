import { Construct, Duration } from "@aws-cdk/core";
import { DatabaseCluster, CfnEventSubscription } from "@aws-cdk/aws-rds";
import { Topic } from "@aws-cdk/aws-sns";
import * as lambda from "@aws-cdk/aws-lambda";
import { SnsEventSource } from "@aws-cdk/aws-lambda-event-sources";
import { SlackWebhookProps } from "./slack_webhook";

import { Alarm, Metric, ComparisonOperator } from "@aws-cdk/aws-cloudwatch";
import { SnsAction } from "@aws-cdk/aws-cloudwatch-actions";

interface DatabaseClusterAlarmOptions {
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

interface DefaultDatabaseClusterAlarmOptions
  extends DatabaseClusterAlarmOptions {
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

const DEFAULT_ALARM_OPTIONS: DefaultDatabaseClusterAlarmOptions = {
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

export class DatabaseClusterAlarm {
  /**
   * Create DatabaseCluster alarms, with sensible defaults, can override defaults
   * @param {Construct} scope - a CDK stack to create assets in
   * @param {DatabaseCluster} cluster - database cluster
   * @param {DatabaseClusterAlarmOptions} options - override alarm configuration
   * */
  public static createClusterAlarms(
    scope: Construct,
    cluster: DatabaseCluster,
    options?: DatabaseClusterAlarmOptions
  ): void {
    let alarmOptions = options ? options : DEFAULT_ALARM_OPTIONS;
    alarmOptions = { ...DEFAULT_ALARM_OPTIONS, ...alarmOptions };
    const alarms: Alarm[] = [];

    if (alarmOptions.highCpuEnabled) {
      alarms.push(
        DatabaseClusterAlarm.createCpuAlarm(
          scope,
          cluster,
          alarmOptions.highCpuPct
        )
      );
    }

    if (alarmOptions.lowMemoryEnabled && alarmOptions.lowMemoryBytes) {
      alarms.push(
        DatabaseClusterAlarm.createFreeableMemoryAlarm(
          scope,
          cluster,
          alarmOptions.lowMemoryBytes
        )
      );
    }

    if (alarmOptions.readLatencyEnabled) {
      alarms.push(
        DatabaseClusterAlarm.createReadLatencyAlarm(
          scope,
          cluster,
          alarmOptions.readLatencySeconds
        )
      );
    }

    if (alarmOptions.writeLatencyEnabled) {
      alarms.push(
        DatabaseClusterAlarm.createWriteLatencyAlarm(
          scope,
          cluster,
          alarmOptions.writeLatencySeconds
        )
      );
    }

    if (alarmOptions.deadLockEnabled) {
      alarms.push(
        DatabaseClusterAlarm.createDeadlockAlarm(
          scope,
          cluster,
          alarmOptions.deadlockThreshold
        )
      );
    }

    if (alarmOptions.topic) {
      const snsTopic = alarmOptions.topic;
      alarms.forEach((alarm) => alarm.addAlarmAction(new SnsAction(snsTopic)));
    }
  }

  /**
   * Create a CPU Alarm, by default uses a 90% average threshold over a 60 second duration
   * @param {Construct} scope - a CDK Construct
   * @param {DatabaseCluster} cluster - a Database Cluster
   * @param {number} threshold - (percentage) of CPU Utilization
   **/
  static createCpuAlarm(
    scope: Construct,
    cluster: DatabaseCluster,
    threshold?: number
  ): Alarm {
    return new Alarm(scope, cluster.node.id + "HighCpuAlarm", {
      metric: new Metric({
        namespace: "AWS/RDS",
        metricName: "CPUUtilization",
        dimensions: {
          DBClusterIdentifier: cluster.clusterIdentifier,
        },
      }),
      threshold: threshold ? threshold : DEFAULT_ALARM_OPTIONS.highCpuPct,
      period: Duration.seconds(60),
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: "High CPU Utilization:" + cluster.clusterIdentifier,
      evaluationPeriods: 1,
    });
  }

  /**
   * Create a Write Latency Alarm, by default uses a 1 second average threshold over a 60 second duration
   * @param {Construct} scope - as CDK Construct
   * @param {DatabaseCluster} cluster - a DatabaseCluster
   * @param {number} threshold (second) write latency
   **/
  static createWriteLatencyAlarm(
    scope: Construct,
    cluster: DatabaseCluster,
    threshold?: number
  ): Alarm {
    return new Alarm(scope, cluster.node.id + "WriteLatencyAlarm", {
      metric: new Metric({
        namespace: "AWS/RDS",
        metricName: "WriteLatency",
        dimensions: {
          DBClusterIdentifier: cluster.clusterIdentifier,
        },
      }),
      threshold: threshold
        ? threshold
        : DEFAULT_ALARM_OPTIONS.writeLatencySeconds,
      period: Duration.seconds(60),
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription:
        "Write Latency excceded threshold for Resource:" +
        cluster.clusterIdentifier,
      evaluationPeriods: 1,
    });
  }

  /**
   * Create a Read Latency Alarm, by default uses a 1 second average threshold over a 60 second duration
   * @param {Construct} scope - as CDK Construct
   * @param {DatabaseCluster} cluster - a DatabaseCluster
   * @param {number} threshold (second) write latency
   **/
  static createReadLatencyAlarm(
    scope: Construct,
    cluster: DatabaseCluster,
    threshold?: number
  ): Alarm {
    return new Alarm(scope, cluster.node.id + "ReadLatencyAlarm", {
      metric: new Metric({
        namespace: "AWS/RDS",
        metricName: "ReadLatency",
        dimensions: {
          DBClusterIdentifier: cluster.clusterIdentifier,
        },
      }),
      threshold: threshold
        ? threshold
        : DEFAULT_ALARM_OPTIONS.readLatencySeconds,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      period: Duration.seconds(60),
      alarmDescription:
        "Read Latency excceded threshold for Resource:" +
        cluster.clusterIdentifier,
      evaluationPeriods: 1,
    });
  }

  /**
   * Create a Low Freeable Memory Alarm, average threshold over a 60 second duration
   * @param {Construct} scope - a CDK Construct
   * @param {DatabaseCluster} cluster - a DatabaseCluster
   * @param {number} threshold - memory in bytes that are freeable
   **/
  static createFreeableMemoryAlarm(
    scope: Construct,
    cluster: DatabaseCluster,
    threshold?: number
  ): Alarm {
    return new Alarm(scope, cluster.node.id + "LowFreeableMemory", {
      metric: new Metric({
        namespace: "AWS/RDS",
        metricName: "FreeableMemory",
        dimensions: {
          DBClusterIdentifier: cluster.clusterIdentifier,
        },
      }),
      threshold: threshold ? threshold : DEFAULT_ALARM_OPTIONS.lowMemoryBytes,
      period: Duration.seconds(60),
      comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
      alarmDescription:
        "Read Latency excceded threshold for Resource:" +
        cluster.clusterIdentifier,
      evaluationPeriods: 1,
    });
  }

  /**
   * Create a Deadlock Alarm, average threshold over a 60 second duration
   * @param {Construct} scope - a CDK Construct
   * @param {DatabaseCluster} cluster - a DatabaseCluster
   * @param {number} threshold - memory in bytes that are freeable
   **/
  static createDeadlockAlarm(
    scope: Construct,
    cluster: DatabaseCluster,
    threshold?: number
  ): Alarm {
    return new Alarm(scope, cluster.node.id + "Deadlocks", {
      metric: new Metric({
        namespace: "AWS/RDS",
        metricName: "Deadlocks",
        dimensions: {
          DBClusterIdentifier: cluster.clusterIdentifier,
        },
      }),
      threshold: threshold
        ? threshold
        : DEFAULT_ALARM_OPTIONS.deadlockThreshold,
      period: Duration.seconds(60),
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      alarmDescription:
        "Deadlock threshold for Resource:" + cluster.clusterIdentifier,
      evaluationPeriods: 1,
    });
  }

  /**
   * @param {Construct} scope - stack to create the resources in
   * @param {string} id - CDK identifier to form prefix
   * @param {DatabaseCluster} cluster - a Database Cluster
   * @param {SlackWebhookProps} slackWebHookProps - a Slack WebHook to write events to
   * @param {string[]} eventCategories - An array of RDS event categories of interest, these are detailed in the RDS documentation (https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.html#USER_Events.Messages)
   **/
  static createEventSubscription(
    scope: Construct,
    id: string,
    cluster: DatabaseCluster,
    topic: Topic,
    eventCategories?: string[]
  ): void {
    const subscribeEventCategories = eventCategories
      ? eventCategories
      : ["failover", "failure", "maintenance", "notification"];

    new CfnEventSubscription(scope, id + "EventSubscription", {
      snsTopicArn: topic.topicArn,
      sourceIds: [cluster.clusterIdentifier],
      eventCategories: subscribeEventCategories,
      sourceType: "db-cluster",
    });
  }
}
