import { Construct, Duration } from "@aws-cdk/core";
import { Cluster, IBaseService } from "@aws-cdk/aws-ecs";
import { Topic } from "@aws-cdk/aws-sns";
import { SnsAction } from "@aws-cdk/aws-cloudwatch-actions";
import { STATISTIC } from "./consts";
import { Alarm, Metric, ComparisonOperator } from "@aws-cdk/aws-cloudwatch";
import { BaseAlarmBuilder } from "./base_alarm";

interface EcsAlarmOptions {
  highCpuEnabled?: boolean;
  highCpuPct?: number;
  cpuReservationEnabled?: boolean;
  cpuReservationThreshold?: number;
  memoryReservationEnabled?: boolean;
  memoryReservationThreshold?: number;
  highMemoryEnabled?: boolean;
  highMemoryThreshold?: number;
  gpuReservationEnabled?: boolean;
  gpuReservationThreshold?: number;
  topic?: Topic;
}

interface DefaultEcsAlarmOptions extends EcsAlarmOptions {
  highCpuEnabled: boolean;
  highCpuPct: number;
  cpuReservationEnabled: boolean;
  cpuReservationThreshold: number;
  memoryReservationEnabled: boolean;
  memoryReservationThreshold: number;
  highMemoryEnabled: boolean;
  highMemoryThreshold: number;
  gpuReservationEnabled: boolean;
  gpuReservationThreshold: number;
  topic?: Topic;
}

const NAMESPACE = "AWS/ECS";

const DEFAULT_ALARM_OPTIONS: DefaultEcsAlarmOptions = {
  highCpuEnabled: true,
  highCpuPct: 90,
  cpuReservationEnabled: false,
  cpuReservationThreshold: 10,
  memoryReservationEnabled: false,
  memoryReservationThreshold: 10,
  highMemoryEnabled: true,
  highMemoryThreshold: 90,
  gpuReservationThreshold: 10,
  gpuReservationEnabled: false,
};

export enum CLUSTER_METRIC {
  CPU_RESERVATION = "CPUReservation",
  CPU_UTILIZATION = "CPUUtilization",
  MEMORY_RESERVATION = "MemoryReservation",
  MEMORY_UTILIZATION = "MemoryUtilization",
  GPU_RESERVATION = "GPUReservation",
}

export class ClusterAlarm {
  /**
   * Create database instance alarms with sensible defaults
   * @param {Construct} scope - the stack to create assets in
   * @param {inst} inst - an ECS Cluster
   * @param {EcsAlarmOptions} options - options and overrides of alarm configuration
   */
  public static createClusterAlarms(
    scope: Construct,
    inst: Cluster,
    options?: EcsAlarmOptions
  ): void {
    let alarmOptions = options ? options : DEFAULT_ALARM_OPTIONS;
    alarmOptions = { ...DEFAULT_ALARM_OPTIONS, ...alarmOptions };
    const alarms: Alarm[] = [];

    if (alarmOptions.highCpuEnabled && inst.hasEc2Capacity) {
      alarms.push(this.createCpuAlarm(scope, inst, alarmOptions.highCpuPct));
    }

    if (alarmOptions.cpuReservationEnabled && inst.hasEc2Capacity) {
      alarms.push(
        this.createCpuReservationAlarm(
          scope,
          inst,
          alarmOptions.cpuReservationThreshold
        )
      );
    }

    if (alarmOptions.highMemoryEnabled && inst.hasEc2Capacity) {
      alarms.push(
        this.createHighMemoryAlarm(
          scope,
          inst,
          alarmOptions.highMemoryThreshold
        )
      );
    }

    if (alarmOptions.memoryReservationEnabled) {
      alarms.push(
        this.createMemoryReservationAlarm(
          scope,
          inst,
          alarmOptions.memoryReservationThreshold
        )
      );
    }

    if (alarmOptions.gpuReservationEnabled) {
      alarms.push(
        this.createGPUReservationAlarm(
          scope,
          inst,
          alarmOptions.gpuReservationThreshold
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
   * @param {Cluster} inst - an ECS Cluster
   * @param {number} threshold - (percentage) of CPU Utilization
   **/
  static createCpuAlarm(
    scope: Construct,
    inst: Cluster,
    threshold?: number
  ): Alarm {
    return new Alarm(scope, inst.node.id + "HighCpuAlarm", {
      metric: new Metric({
        namespace: NAMESPACE,
        metricName: CLUSTER_METRIC.CPU_UTILIZATION,
        dimensions: {
          CluserName: inst.clusterName,
        },
      }),
      threshold: threshold ? threshold : DEFAULT_ALARM_OPTIONS.highCpuPct,
      period: Duration.seconds(60),
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      alarmDescription: "High CPU Utilization: " + inst.clusterName,
      evaluationPeriods: 1,
    });
  }

  /**
   * Create a CPU reservation alarm, by default uses a 10 percent threshold over a one day duration
   * @param {Construct} scope - as CDK Construct
   * @param {Cluster} inst - an ECS Cluster
   * @param {number} threshold - (percent) CPU reservation
   **/
  static createCpuReservationAlarm(
    scope: Construct,
    inst: Cluster,
    threshold?: number
  ): Alarm {
    return new Alarm(scope, inst.node.id + "CPUReservationAlarm", {
      metric: new Metric({
        namespace: NAMESPACE,
        metricName: CLUSTER_METRIC.CPU_RESERVATION,
        dimensions: {
          ClusterName: inst.clusterName,
        },
      }),
      threshold: threshold
        ? threshold
        : DEFAULT_ALARM_OPTIONS.cpuReservationThreshold,
      period: Duration.days(1),
      comparisonOperator: ComparisonOperator.LESS_THAN_LOWER_THRESHOLD,
      alarmDescription:
        "CPU Reservation lower than threshold: " + inst.clusterName,
      evaluationPeriods: 1,
    });
  }

  /**
   * Create a High memory alarm, by default uses a 90 percent threshold over a 60 second duration
   * @param {Construct} scope - as CDK Construct
   * @param {Cluster} inst - an ECS Cluster
   * @param {number} threshold - (percent) CPU reservation
   **/
  static createHighMemoryAlarm(
    scope: Construct,
    inst: Cluster,
    threshold?: number
  ): Alarm {
    return new Alarm(scope, inst.node.id + "HighMemoryAlarm", {
      metric: new Metric({
        namespace: NAMESPACE,
        metricName: CLUSTER_METRIC.MEMORY_UTILIZATION,
        dimensions: {
          ClusterName: inst.clusterName,
        },
      }),
      threshold: threshold
        ? threshold
        : DEFAULT_ALARM_OPTIONS.highMemoryThreshold,
      period: Duration.seconds(60),
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      alarmDescription: "High Memory breached threshold: " + inst.clusterName,
      evaluationPeriods: 1,
    });
  }

  /**
   * Create a Memory reservation alarm, by default uses a 10 percent threshold over a one day duration
   * @param {Construct} scope - as CDK Construct
   * @param {Cluster} inst - an ECS Cluster
   * @param {number} threshold - (percent) CPU reservation
   **/
  static createMemoryReservationAlarm(
    scope: Construct,
    inst: Cluster,
    threshold?: number
  ): Alarm {
    return new AlarmBuilder(scope, inst, CLUSTER_METRIC.MEMORY_RESERVATION)
      .setDescription(
        "Memory Reservation breached threshold: " + inst.clusterName
      )
      .setStatistic(STATISTIC.AVG)
      .setThreshold(
        threshold ? threshold : DEFAULT_ALARM_OPTIONS.memoryReservationThreshold
      )
      .setPeriod(Duration.days(1))
      .setOp(ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD)
      .build();
  }

  /**
   * Create a GPU reservation alarm, by default uses a 10 percent threshold over a one day duration
   * @param {Construct} scope - as CDK Construct
   * @param {Cluster} inst - an ECS Cluster
   * @param {number} threshold - (percent) CPU reservation
   **/
  static createGPUReservationAlarm(
    scope: Construct,
    inst: Cluster,
    threshold?: number
  ): Alarm {
    return new AlarmBuilder(scope, inst, CLUSTER_METRIC.GPU_RESERVATION)
      .setDescription(
        "Memory Reservation breached threshold: " + inst.clusterName
      )
      .setStatistic(STATISTIC.AVG)
      .setThreshold(
        threshold ? threshold : DEFAULT_ALARM_OPTIONS.gpuReservationThreshold
      )
      .setPeriod(Duration.days(1))
      .setOp(ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD)
      .build();
  }
}

class AlarmBuilder extends BaseAlarmBuilder {
  private metric: CLUSTER_METRIC;
  private inst: Cluster;
  private service: IBaseService;

  constructor(scope: Construct, inst: Cluster, metric: CLUSTER_METRIC) {
    super(scope);
    this.inst = inst;
    this.metric = metric;

    super.setDescription("Alarm for Resource: " + this.inst.clusterName);
  }

  setService(service: IBaseService): AlarmBuilder {
    this.service = service;
    return this;
  }

  build(): Alarm {
    const dimensions: Record<string, string> = {
      ClusterName: this.inst.clusterName,
    };

    if (this.service) {
      dimensions["ServiceName"] = this.service.serviceName;
    }

    return new Alarm(this.scope, this.inst.node.id + this.metric, {
      metric: new Metric({
        namespace: NAMESPACE,
        metricName: this.metric,
        dimensions: dimensions,
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
