import { Construct, Duration } from "@aws-cdk/core";
import { DatabaseInstance, CfnEventSubscription } from "@aws-cdk/aws-rds";
import { Topic } from "@aws-cdk/aws-sns";
import { SnsAction } from "@aws-cdk/aws-cloudwatch-actions";

import { Alarm, Metric, ComparisonOperator } from "@aws-cdk/aws-cloudwatch";
import { BaseAlarmBuilder } from "./base_alarm";

const NAMESPACE = "AWS/RDS";

export enum RDS_METRIC {
  BINLOG_USAGE = "BinLogDiskUsage",
  BURST_BALANCE = "BurstBalance",
  CPU_UTILIZATION = "CPUUtilization",
  CPU_CREDIT_USAGE = "CPUCreditUsage",
  CPU_CREDIT_BALANCE = "CPUCreditBalance",
  DATABASE_CONNECTIONS = "DatabaseConnections",
  DISK_QUEUE_DEPTH = "DiskQueueDepth",
  FAILED_SQLSERVER_AGENT_JOBS_COUNT = "FailedSQLServerAgentJobsCount",
  FREEABLE_MEMORY = "FreeableMemory",
  FREE_STORAGE_SPACE = "FreeStorageSpace",
  MAXIMUM_USED_TRANSACTIONIDS = "MaximumUsedTransactionIDs",
  NETWORK_RECEIVE_THROUGHPUT = "NetworkReceiveThroughput",
  NETWORK_TRANSMIT_THROUGHPUT = "NetworkTransmitThroughput",
  OLDEST_REPLICATION_SLOTLAG = "OldestReplicationSlotLag",
  READ_IOPS = "ReadIOPS",
  READ_LATENCY = "ReadLatency",
  READ_THROUGHPUT = "ReadThroughput",
  REPLICA_LAG = "ReplicaLag",
  REPLICATION_SLOT_DISKUSAGE = "ReplicationSlotDiskUsage",
  SWAP_USAGE = "SwapUsage",
  TRANSACTION_LOGS_DISKUSAGE = "TransactionLogsDiskUsage",
  TRANSACTION_LOGS_GENERATION = "TransactionLogsGeneration",
  WRITE_IOPS = "WriteIOPS",
  WRITE_LATENCY = "WriteLatency",
  WRITE_THROUGHPUT = "WriteThroughput",
}

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
      alarms.push(this.createCpuAlarm(scope, inst, alarmOptions.highCpuPct));
    }

    if (alarmOptions.lowMemoryEnabled && alarmOptions.lowMemoryBytes) {
      alarms.push(
        this.createFreeableMemoryAlarm(scope, inst, alarmOptions.lowMemoryBytes)
      );
    }

    if (alarmOptions.writeLatencyEnabled) {
      alarms.push(
        this.createWriteLatencyAlarm(
          scope,
          inst,
          alarmOptions.writeLatencySeconds
        )
      );
    }

    if (alarmOptions.readLatencyEnabled) {
      alarms.push(
        this.createReadLatencyAlarm(
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
   * Create an AlarmBuilder, uses the DatabaseInstance as a dimension
   * @param {Construct} scope - as CDK Construct
   * @param {DatabaseInstance} inst - a DatabaseInstance
   * @returns {AlarmBuilder}
   **/
  static createAlarm(
    scope: Construct,
    inst: DatabaseInstance,
    metric: RDS_METRIC
  ): AlarmBuilder {
    return new AlarmBuilder(scope, inst, metric);
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
    return new AlarmBuilder(scope, inst, RDS_METRIC.CPU_UTILIZATION)
      .setDescription("High CPU Utilization: " + inst.instanceIdentifier)
      .setThreshold(threshold ? threshold : DEFAULT_ALARM_OPTIONS.highCpuPct)
      .setOp(ComparisonOperator.GREATER_THAN_THRESHOLD)
      .build();
  }

  /**
   * Create a Write Latency Alarm, by default uses a 1 second average threshold over a 60 second duration
   * @param {Construct} scope - as CDK Construct
   * @param {DatabaseInstance} inst - a DatabaseInstance or DatabaseCluster
   * @param {number} threshold - (second) write latency
   * @returns {Alarm}
   **/
  static createWriteLatencyAlarm(
    scope: Construct,
    inst: DatabaseInstance,
    threshold?: number
  ): Alarm {
    return new AlarmBuilder(scope, inst, RDS_METRIC.WRITE_LATENCY)
      .setDescription("Write Latency exceeded: " + inst.instanceIdentifier)
      .setThreshold(
        threshold ? threshold : DEFAULT_ALARM_OPTIONS.writeLatencySeconds
      )
      .setOp(ComparisonOperator.GREATER_THAN_THRESHOLD)
      .build();
  }

  /**
   * Create a Read Latency Alarm, by default uses a 1 second average threshold over a 60 second duration
   * @param {Construct} scope - as CDK Construct
   * @param {DatabaseInstance} inst - a DatabaseInstance
   * @param {number} threshold - (second) write latency
   * @returns {Alarm}
   **/
  static createReadLatencyAlarm(
    scope: Construct,
    inst: DatabaseInstance,
    threshold?: number
  ): Alarm {
    return new AlarmBuilder(scope, inst, RDS_METRIC.READ_LATENCY)
      .setDescription(
        "Read Latency excceded threshold for Resource: " +
          inst.instanceIdentifier
      )
      .setThreshold(
        threshold ? threshold : DEFAULT_ALARM_OPTIONS.readLatencySeconds
      )
      .setOp(ComparisonOperator.GREATER_THAN_THRESHOLD)
      .build();
  }

  /**
   * Create a Low Freeable Memory Alarm, average threshold over a 60 second duration
   * @param {Construct} scope - a CDK Construct
   * @param {DatabaseInstance} inst - a DatabaseInstance
   * @param {number} threshold - memory in bytes that are freeable
   * @returns {Alarm}
   **/
  static createFreeableMemoryAlarm(
    scope: Construct,
    inst: DatabaseInstance,
    threshold?: number
  ): Alarm {
    return new AlarmBuilder(scope, inst, RDS_METRIC.FREEABLE_MEMORY)
      .setDescription(
        "Low Freeable memory for Resource:" + inst.instanceIdentifier
      )
      .setThreshold(
        threshold ? threshold : DEFAULT_ALARM_OPTIONS.readLatencySeconds
      )
      .setOp(ComparisonOperator.LESS_THAN_THRESHOLD)
      .build();
  }

  /**
   * @param {Construct} scope - stack to create the resources in
   * @param {string} id - CDK identifier to form prefix
   * @param {DatabaseInstance} inst - a Database Instance
   * @param {Topic} topic - an SNS topic to write events to
   * @param {string[]} eventCategories - An array of RDS event categories of interest, these are detailed in the RDS documentation (https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.html#USER_Events.Messages)
   **/
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
      sourceType: "db-instance",
    });
  }
}

class AlarmBuilder extends BaseAlarmBuilder {
  readonly inst: DatabaseInstance;
  private metric: RDS_METRIC;

  constructor(scope: Construct, inst: DatabaseInstance, metric: RDS_METRIC) {
    super(scope);
    this.metric = metric;
    this.inst = inst;
  }

  build(): Alarm {
    return new Alarm(this.scope, this.inst.node.id + this.metric, {
      metric: new Metric({
        namespace: NAMESPACE,
        metricName: this.metric,
        dimensions: {
          DBInstanceIdentifier: this.inst.instanceIdentifier,
        },
        statistic: this.getStatistic(),
      }),
      threshold: this.getThreshold(),
      period: this.getPeriod(),
      comparisonOperator: this.getOp(),
      alarmDescription: this.getAlarmDescription(),
      evaluationPeriods: this.getEvaluationPeriods(),
    });
  }
}
