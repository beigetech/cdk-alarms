import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Stack, CfnElement } from "@aws-cdk/core";
import { DatabaseInstance, DatabaseInstanceEngine } from "@aws-cdk/aws-rds";
import {
  Vpc,
  InstanceType,
  InstanceSize,
  InstanceClass,
} from "@aws-cdk/aws-ec2";
import { DatabaseAlarm } from "../lib/rds_alarm";
import { Topic } from "@aws-cdk/aws-sns";

test("Should create no alarms for RDS Instance", () => {
  let stack = new Stack();
  let inst = new DatabaseInstance(stack, "test-instance", {
    engine: DatabaseInstanceEngine.MYSQL,
    vpc: new Vpc(stack, "test-vpc"),
    masterUsername: "admin",
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
  });

  DatabaseAlarm.createInstanceAlarms(stack, inst, {
    highCpuEnabled: false,
    lowMemoryEnabled: false,
    deadLockEnabled: false,
    writeLatencyEnabled: false,
    readLatencyEnabled: false,
  });

  expect(stack).not.toHaveResourceLike("AWS::CloudWatch::Alarm", {});
});

test("Should generate default alarms for RDS Instance", () => {
  let stack = new Stack();
  let inst = new DatabaseInstance(stack, "test-instance", {
    engine: DatabaseInstanceEngine.MYSQL,
    vpc: new Vpc(stack, "test-vpc"),
    masterUsername: "admin",
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
  });

  DatabaseAlarm.createInstanceAlarms(stack, inst);

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

test("Should generate default alarms for RDS Instance, and subcribe to topic", () => {
  let stack = new Stack();
  let inst = new DatabaseInstance(stack, "test-instance", {
    engine: DatabaseInstanceEngine.MYSQL,
    vpc: new Vpc(stack, "test-vpc"),
    masterUsername: "admin",
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
  });

  DatabaseAlarm.createInstanceAlarms(stack, inst, {
    topic: new Topic(stack, "AlarmTopic"),
  });

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

test("Should generate custom event subscription for RDS Instance", () => {
  let stack = new Stack();
  let inst = new DatabaseInstance(stack, "test-instance", {
    engine: DatabaseInstanceEngine.MYSQL,
    vpc: new Vpc(stack, "test-vpc"),
    masterUsername: "admin",
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
  });

  DatabaseAlarm.subcribeEventsToSlack(
    stack,
    "rds-events",
    inst,
    {
      username: "Alarm Bot",
      url: "/slack/webhook",
      channel: "#alerts",
    },
    ["availability"]
  );

  expect(stack).toHaveResourceLike("AWS::RDS::EventSubscription", {
    EventCategories: ["availability"],
    SourceIds: [
      {
        Ref: stack.getLogicalId(inst.node.defaultChild as CfnElement),
      },
    ],
  });
});

test("Should generate default event subscription for RDS Instance", () => {
  let stack = new Stack();
  let inst = new DatabaseInstance(stack, "test-instance", {
    engine: DatabaseInstanceEngine.MYSQL,
    vpc: new Vpc(stack, "test-vpc"),
    masterUsername: "admin",
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
  });

  DatabaseAlarm.subcribeEventsToSlack(stack, "rds-events", inst, {
    username: "Alarm Bot",
    url: "/slack/webhook",
    channel: "#alerts",
  });

  expect(stack).toHaveResourceLike("AWS::RDS::EventSubscription", {
    EventCategories: [
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
    ],
    SourceIds: [
      {
        Ref: stack.getLogicalId(inst.node.defaultChild as CfnElement),
      },
    ],
  });
});

test("Should create CPU alarm with default", () => {
  let stack = new Stack();
  let inst = new DatabaseInstance(stack, "test-instance", {
    engine: DatabaseInstanceEngine.MYSQL,
    vpc: new Vpc(stack, "test-vpc"),
    masterUsername: "admin",
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
  });

  DatabaseAlarm.createCpuAlarm(stack, inst);

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "CPUUtilization",
    Threshold: 90,
    Namespace: "AWS/RDS",
    Period: 60,
    Statistic: "Average",
  });
});

test("Should create low memory alarm with default", () => {
  let stack = new Stack();
  let inst = new DatabaseInstance(stack, "test-instance", {
    engine: DatabaseInstanceEngine.MYSQL,
    vpc: new Vpc(stack, "test-vpc"),
    masterUsername: "admin",
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
  });

  DatabaseAlarm.createFreeableMemoryAlarm(stack, inst);

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "FreeableMemory",
    Namespace: "AWS/RDS",
    Period: 60,
    Statistic: "Average",
  });
});

test("Should create write latency alarm with default", () => {
  let stack = new Stack();
  let inst = new DatabaseInstance(stack, "test-instance", {
    engine: DatabaseInstanceEngine.MYSQL,
    vpc: new Vpc(stack, "test-vpc"),
    masterUsername: "admin",
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
  });

  DatabaseAlarm.createWriteLatencyAlarm(stack, inst);

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "WriteLatency",
    Namespace: "AWS/RDS",
    Period: 60,
    Statistic: "Average",
  });
});

test("Should create read latency alarm with default", () => {
  let stack = new Stack();
  let inst = new DatabaseInstance(stack, "test-instance", {
    engine: DatabaseInstanceEngine.MYSQL,
    vpc: new Vpc(stack, "test-vpc"),
    masterUsername: "admin",
    instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
  });

  DatabaseAlarm.createReadLatencyAlarm(stack, inst);

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "ReadLatency",
    Namespace: "AWS/RDS",
    Period: 60,
    Statistic: "Average",
  });
});
