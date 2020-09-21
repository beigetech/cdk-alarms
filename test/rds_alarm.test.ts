import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Stack } from "@aws-cdk/core";
import {
  DatabaseCluster,
  DatabaseClusterEngine,
  DatabaseInstance,
  DatabaseInstanceEngine,
} from "@aws-cdk/aws-rds";
import {
  Vpc,
  InstanceType,
  InstanceSize,
  InstanceClass,
} from "@aws-cdk/aws-ec2";
import { DBAlarm } from "../lib/rds_alarm";

test("Should generate default alarms for RDS Cluster", () => {
  let stack = new Stack();

  let cluster = new DatabaseCluster(stack, "test-cluster", {
    engine: DatabaseClusterEngine.AURORA_MYSQL,
    masterUser: {
      username: "admin",
    },
    instanceProps: {
      vpc: new Vpc(stack, "test-vpc"),
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
    },
  });

  DBAlarm.createClusterAlarms(stack, cluster);

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "CPUUtilization",
    Threshold: 90,
    Namespace: "AWS/RDS",
    Period: 60,
    Statistic: "Average",
  });

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "FreeableMemory",
    Threshold: 100 * 1024 * 1024,
    Namespace: "AWS/RDS",
    Period: 60,
    Statistic: "Average",
  });

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "Deadlocks",
    Threshold: 1,
    Namespace: "AWS/RDS",
    Period: 60,
    Statistic: "Average",
  });
});

test("Should generate default alarms for RDS Instance", () => {
  let stack = new Stack();
  let inst = new DatabaseInstance(stack, "test-instance", {
    engine: DatabaseInstanceEngine.MYSQL,
    vpc: new Vpc(stack, "test-vpc"),
    masterUsername: "admin",
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
  });

  DBAlarm.createInstanceAlarms(stack, inst);

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "CPUUtilization",
    Threshold: 90,
    Namespace: "AWS/RDS",
    Period: 60,
    Statistic: "Average",
  });

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "FreeableMemory",
    Threshold: 100 * 1024 * 1024,
    Namespace: "AWS/RDS",
    Period: 60,
    Statistic: "Average",
  });
});
