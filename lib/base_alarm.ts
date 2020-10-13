import { Alarm, ComparisonOperator } from "@aws-cdk/aws-cloudwatch";
import { STATISTIC } from "./consts";
import { Construct, Duration } from "@aws-cdk/core";

export interface IBaseAlarm {
  setStatistic(statistic: STATISTIC): IBaseAlarm;
  setEvaluationPeriods(periods: number): IBaseAlarm;
  setThreshold(threshold: number): IBaseAlarm;
  setPeriod(duration: Duration): IBaseAlarm;
  setOp(op: ComparisonOperator): IBaseAlarm;
  setDescription(description: string): IBaseAlarm;
  build(): Alarm;
}

export class BaseAlarmBuilder implements IBaseAlarm {
  readonly scope: Construct;
  private threshold: number;
  private period: Duration;
  private op: ComparisonOperator;
  private alarmDescription: string;
  private evaluationPeriods: number;
  private statistic: STATISTIC;

  constructor(scope: Construct) {
    this.scope = scope;
    this.setPeriod(Duration.seconds(60));
    this.setEvaluationPeriods(1);
    this.setStatistic(STATISTIC.AVG);
  }

  setDescription(description: string): IBaseAlarm {
    this.alarmDescription = description;
    return this;
  }

  setEvaluationPeriods(periods: number): IBaseAlarm {
    this.evaluationPeriods = periods;
    return this;
  }

  setThreshold(threshold: number): IBaseAlarm {
    this.threshold = threshold;
    return this;
  }

  setStatistic(statistic: STATISTIC): IBaseAlarm {
    return this;
  }

  setPeriod(duration: Duration): IBaseAlarm {
    this.period = duration;
    return this;
  }

  setOp(op: ComparisonOperator): IBaseAlarm {
    this.op = op;
    return this;
  }

  build(): Alarm {
    throw "Not implemented";
  }

  protected getThreshold(): number {
    return this.threshold;
  }

  protected getPeriod(): Duration {
    return this.period;
  }

  protected getOp(): ComparisonOperator {
    return this.op;
  }

  protected getStatistic(): STATISTIC {
    return this.statistic;
  }

  protected getAlarmDescription(): string {
    return this.alarmDescription;
  }

  protected getEvaluationPeriods(): number {
    return this.evaluationPeriods;
  }
}
