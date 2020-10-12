import { Construct, Duration } from "@aws-cdk/core";
import { DatabaseCluster, CfnEventSubscription } from "@aws-cdk/aws-rds";
import { Topic } from "@aws-cdk/aws-sns";
import { Alarm, Metric, ComparisonOperator } from "@aws-cdk/aws-cloudwatch";
import { SnsAction } from "@aws-cdk/aws-cloudwatch-actions";
import { BaseAlarmBuilder } from "./base_alarm";

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

export enum AURORA_METRIC {
  AURORA_GLOBAL_DB_REPLICATED_WRITEIO = "AuroraGlobalDBReplicatedWriteIO",
  AURORA_GLOBAL_DBDATA_TRANSFER_BYTES = "AuroraGlobalDBDataTransferBytes",
  AURORA_GLOBAL_DB_REPLICATIONLAG = "AuroraGlobalDBReplicationLag",
  AURORA_VOLUME_BYTES_LEFTTOTAL = "AuroraVolumeBytesLeftTotal",
  BACKTRACK_CHANGE_RECORDS_CREATIONRATE = "BacktrackChangeRecordsCreationRate",
  BACKTRACK_CHANGE_RECORDS_STORED = "BacktrackChangeRecordsStored",
  BACKUP_RETENTION_PERIOD_STORAGE_USED = "BackupRetentionPeriodStorageUsed",
  SNAPSHOT_STORAGE_USED = "SnapshotStorageUsed",
  TOTAL_BACKUP_STORAGE_BILLED = "TotalBackupStorageBilled",
  VOLUME_BYTES_USED = "VolumeBytesUsed",
  VOLUME_READ_IOPS = "VolumeReadIOPs",
  VOLUME_WRITE_IOPS = "VolumeWriteIOPs",
  ABORTED_CLIENTS = "AbortedClients",
  ACTIVE_TRANSACTIONS = "ActiveTransactions",
  AURORA_BINLOG_REPLICA_LAG = "AuroraBinlogReplicaLag",
  AURORA_REPLICA_LAG = "AuroraReplicaLag",
  AURORA_REPLICA_LAG_MAXIMUM = "AuroraReplicaLagMaximum",
  AURORA_REPLICA_LAG_MINIMUM = "AuroraReplicaLagMinimum",
  BACKTRACK_WINDOW_ACTUAL = "BacktrackWindowActual",
  BACKTRACK_WINDOW_ALERT = "BacktrackWindowAlert",
  BINLOG_DISK_USAGE = "BinLogDiskUsage",
  BLOCKED_TRANSACTIONS = "BlockedTransactions",
  BUFFER_CACHE_HITRATIO = "BufferCacheHitRatio",
  COMMIT_LATENCY = "CommitLatency",
  COMMIT_THROUGHPUT = "CommitThroughput",
  CPU_CREDITBALANCE = "CPUCreditBalance",
  CPU_CREDITUSAGE = "CPUCreditUsage",
  CPU_UTILIZATION = "CPUUtilization",
  DATABASE_CONNECTIONS = "DatabaseConnections",
  DDLLATENCY = "DDLLatency",
  DDLTHROUGHPUT = "DDLThroughput",
  DEADLOCKS = "Deadlocks",
  DELETE_LATENCY = "DeleteLatency",
  DELETE_THROUGHPUT = "DeleteThroughput",
  DISK_QUEUE_DEPTH = "DiskQueueDepth",
  DML_LATENCY = "DMLLatency",
  DML_THROUGHPUT = "DMLThroughput",
  ENGINE_UPTIME = "EngineUptime",
  FREEABLE_MEMORY = "FreeableMemory",
  FREE_LOCAL_STORAGE = "FreeLocalStorage",
  INSERT_LATENCY = "InsertLatency",
  INSERT_THROUGHPUT = "InsertThroughput",
  LOGIN_FAILURES = "LoginFailures",
  MAXIMUM_USED_TRANSACTIONIDS = "MaximumUsedTransactionIDs",
  NETWORK_RECEIVE_THROUGHPUT = "NetworkReceiveThroughput",
  NETWORK_THROUGHPUT = "NetworkThroughput",
  NETWORK_TRANSMIT_THROUGHPUT = "NetworkTransmitThroughput",
  NUM_BINARY_LOGFILES = "NumBinaryLogFiles",
  QUERIES = "Queries",
  RDS_TO_AURORA_POSTGRESQL_REPLICALAG = "RDSToAuroraPostgreSQLReplicaLag",
  READ_IOPS = "ReadIOPS",
  READ_LATENCY = "ReadLatency",
  READ_THROUGHPUT = "ReadThroughput",
  RESULTSET_CACHE_HITRATIO = "ResultSetCacheHitRatio",
  ROLLBACK_SEGMENT_HISTORY_LISTLENGTH = "RollbackSegmentHistoryListLength",
  ROW_LOCKTIME = "RowLockTime",
  SELECT_LATENCY = "SelectLatency",
  SELECT_THROUGHPUT = "SelectThroughput",
  SUM_BINARY_LOGSIZE = "SumBinaryLogSize",
  SWAP_USAGE = "SwapUsage",
  TRANSACTION_LOGS_DISKUSAGE = "TransactionLogsDiskUsage",
  UPDATE_LATENCY = "UpdateLatency",
  UPDATE_THROUGHPUT = "UpdateThroughput",
  WRITE_IOPS = "WriteIOPS",
  WRITE_LATENCY = "WriteLatency",
  WRITE_THROUGHPUT = "WriteThroughput",
}

const NAMESPACE = "AWS/RDS";

export class DatabaseClusterAlarm {
  /**
   * Create DatabaseCluster alarms, with sensible defaults, can override defaults
   * @param {Construct} scope - a CDK stack to create assets in
   * @param {DatabaseCluster} cluster - database cluster
   * @param {DatabaseClusterAlarmOptions} options - override alarm configuration
   * @returns {Alarm}
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
      alarms.push(this.createCpuAlarm(scope, cluster, alarmOptions.highCpuPct));
    }

    if (alarmOptions.lowMemoryEnabled && alarmOptions.lowMemoryBytes) {
      alarms.push(
        this.createFreeableMemoryAlarm(
          scope,
          cluster,
          alarmOptions.lowMemoryBytes
        )
      );
    }

    if (alarmOptions.readLatencyEnabled) {
      alarms.push(
        this.createReadLatencyAlarm(
          scope,
          cluster,
          alarmOptions.readLatencySeconds
        )
      );
    }

    if (alarmOptions.writeLatencyEnabled) {
      alarms.push(
        this.createWriteLatencyAlarm(
          scope,
          cluster,
          alarmOptions.writeLatencySeconds
        )
      );
    }

    if (alarmOptions.deadLockEnabled) {
      alarms.push(
        this.createDeadlockAlarm(scope, cluster, alarmOptions.deadlockThreshold)
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
   * @returns {Alarm}
   **/
  static createCpuAlarm(
    scope: Construct,
    cluster: DatabaseCluster,
    threshold?: number
  ): Alarm {
    return new AlarmBuilder(scope, cluster, AURORA_METRIC.CPU_UTILIZATION)
      .setOp(ComparisonOperator.GREATER_THAN_THRESHOLD)
      .setDescription("High CPU Utilization:" + cluster.clusterIdentifier)
      .setThreshold(threshold ? threshold : DEFAULT_ALARM_OPTIONS.highCpuPct)
      .build();
  }

  /**
   * Create a Write Latency Alarm, by default uses a 1 second average threshold over a 60 second duration
   * @param {Construct} scope - as CDK Construct
   * @param {DatabaseCluster} cluster - a DatabaseCluster
   * @param {number} threshold (second) write latency
   * @returns {Alarm}
   **/
  static createWriteLatencyAlarm(
    scope: Construct,
    cluster: DatabaseCluster,
    threshold?: number
  ): Alarm {
    return new AlarmBuilder(scope, cluster, AURORA_METRIC.WRITE_LATENCY)
      .setOp(ComparisonOperator.GREATER_THAN_THRESHOLD)
      .setDescription(
        "Write Latency excceded threshold for Resource:" +
          cluster.clusterIdentifier
      )
      .setThreshold(
        threshold ? threshold : DEFAULT_ALARM_OPTIONS.writeLatencySeconds
      )
      .build();
  }

  /**
   * Create a Read Latency Alarm, by default uses a 1 second average threshold over a 60 second duration
   * @param {Construct} scope - as CDK Construct
   * @param {DatabaseCluster} cluster - a DatabaseCluster
   * @param {number} threshold (second) write latency
   * @returns {Alarm}
   **/
  static createReadLatencyAlarm(
    scope: Construct,
    cluster: DatabaseCluster,
    threshold?: number
  ): Alarm {
    return new AlarmBuilder(scope, cluster, AURORA_METRIC.READ_LATENCY)
      .setThreshold(
        threshold ? threshold : DEFAULT_ALARM_OPTIONS.readLatencySeconds
      )
      .setOp(ComparisonOperator.GREATER_THAN_THRESHOLD)
      .setDescription(
        "Read Latency excceded threshold for Resource:" +
          cluster.clusterIdentifier
      )
      .build();
  }

  /**
   * Create a Low Freeable Memory Alarm, average threshold over a 60 second duration
   * @param {Construct} scope - a CDK Construct
   * @param {DatabaseCluster} cluster - a DatabaseCluster
   * @param {number} threshold - memory in bytes that are freeable
   * @returns {Alarm}
   **/
  static createFreeableMemoryAlarm(
    scope: Construct,
    cluster: DatabaseCluster,
    threshold?: number
  ): Alarm {
    return new AlarmBuilder(scope, cluster, AURORA_METRIC.FREEABLE_MEMORY)
      .setThreshold(
        threshold ? threshold : DEFAULT_ALARM_OPTIONS.lowMemoryBytes
      )
      .setOp(ComparisonOperator.LESS_THAN_THRESHOLD)
      .setDescription(
        "Freeable memory breached threshold for Resource:" +
          cluster.clusterIdentifier
      )
      .build();
  }

  /**
   * Create a Deadlock Alarm, average threshold over a 60 second duration
   * @param {Construct} scope - a CDK Construct
   * @param {DatabaseCluster} cluster - a DatabaseCluster
   * @param {number} threshold - memory in bytes that are freeable
   * @returns {Alarm}
   **/
  static createDeadlockAlarm(
    scope: Construct,
    cluster: DatabaseCluster,
    threshold?: number
  ): Alarm {
    return new AlarmBuilder(scope, cluster, AURORA_METRIC.DEADLOCKS)
      .setThreshold(
        threshold ? threshold : DEFAULT_ALARM_OPTIONS.deadlockThreshold
      )
      .setOp(ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD)
      .setDescription(
        "Deadlock threshold for Resource:" + cluster.clusterIdentifier
      )
      .build();
  }

  /**
   * @param {Construct} scope - stack to create the resources in
   * @param {string} id - CDK identifier to form prefix
   * @param {DatabaseCluster} cluster - a Database Cluster
   * @param {Topic} topic - an SNS topic to write events to
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

class AlarmBuilder extends BaseAlarmBuilder {
  readonly inst: DatabaseCluster;
  private metric: AURORA_METRIC;

  constructor(scope: Construct, inst: DatabaseCluster, metric: AURORA_METRIC) {
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
          DBClusterIdentifier: this.inst.clusterIdentifier,
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
