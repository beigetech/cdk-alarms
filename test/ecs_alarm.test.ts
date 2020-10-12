import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Stack, CfnElement, Duration } from "@aws-cdk/core";
import { Cluster } from "@aws-cdk/aws-ecs";
import {
  Vpc,
  InstanceType,
  InstanceSize,
  InstanceClass,
} from "@aws-cdk/aws-ec2";
import { ClusterAlarm } from "../lib/ecs_alarm";

test("Should create no alarms for ECS Cluster", () => {
  const stack = new Stack();
  const inst = new Cluster(stack, "test-cluster", {});

  ClusterAlarm.createClusterAlarms(stack, inst, {
    highCpuEnabled: false,
    highMemoryEnabled: false,
  });

  expect(stack).not.toHaveResourceLike("AWS::CloudWatch::Alarm", {});
});

test("Should create default alarms for ECS Cluster when EC2 Launch Type", () => {
  const stack = new Stack();
  const inst = new Cluster(stack, "test-cluster", {
    capacity: {
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
    },
  });

  ClusterAlarm.createClusterAlarms(stack, inst, {});

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "CPUUtilization",
    Threshold: 90,
    Namespace: "AWS/ECS",
    Period: 60,
    Statistic: "Average",
  });
});

test("Should create default alarms for ECS Cluster Reservation Alarm", () => {
  const stack = new Stack();
  const inst = new Cluster(stack, "test-cluster", {
    capacity: {
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
    },
  });

  ClusterAlarm.createClusterAlarms(stack, inst, {
    cpuReservationEnabled: true,
  });

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "CPUReservation",
    Threshold: 10,
    Namespace: "AWS/ECS",
    Period: Duration.days(1).toSeconds(),
    Statistic: "Average",
  });
});

test("Should create all ECS Cluster Alarms", () => {
  const stack = new Stack();
  const inst = new Cluster(stack, "test-cluster", {
    capacity: {
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
    },
  });

  ClusterAlarm.createClusterAlarms(stack, inst, {
    cpuReservationEnabled: true,
    highCpuEnabled: true,
    memoryReservationEnabled: true,
    highMemoryEnabled: true,
    gpuReservationEnabled: true,
  });

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "CPUReservation",
    Threshold: 10,
    Namespace: "AWS/ECS",
    Period: Duration.days(1).toSeconds(),
    Statistic: "Average",
  });

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "CPUUtilization",
    Threshold: 90,
    Namespace: "AWS/ECS",
    Period: 60,
    Statistic: "Average",
  });

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "MemoryReservation",
    Threshold: 10,
    Namespace: "AWS/ECS",
    Period: Duration.days(1).toSeconds(),
    Statistic: "Average",
  });

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "MemoryUtilization",
    Threshold: 90,
    Namespace: "AWS/ECS",
    Period: 60,
    Statistic: "Average",
  });

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "GPUReservation",
    Threshold: 10,
    Namespace: "AWS/ECS",
    Period: Duration.days(1).toSeconds(),
    Statistic: "Average",
  });
});
