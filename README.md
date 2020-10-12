## @beigetech/cdk-alarms: Alarms for AWS Resources

[![npm version](https://badge.fury.io/js/%40beigetech%2Fcdk-alarms.svg)](https://badge.fury.io/js/%40beigetech%2Fcdk-alarms)

Create CloudWatch alarms and event notifications for AWS resources, supported constructs:

 - [DatabaseInstance](#database-instance)
 - [DatabaseCluster](#database-cluster)

#### Database Instance

Either create alarms for the instance all at once, individually or use the builder for full control.

```ts
let stack = new Stack();
let inst = new DatabaseInstance(stack, "test-cluster", {});
```

*Generate alarms for instance:*

```ts
Import {DatabaseAlarms} from '@beigetech/cdk-alarms';
DatabaseAlarm.createInstanceAlarms(stack, cluster);
```

*Generate individual alarms:*

```ts 
DatabaserAlarm.createCpuAlarm(stack, cluster);
```

*Or use a builder for custom alarms*

```ts
DatabaseAlarm.createAlarm(stack, cluster)
   .setMetric(CLUSTER_METRIC.CPU_UTILISATION)
   .setThreshold(90)
   .setOp(ComparisoOperator.GREATER_THAN_THRESHOLD)
   .build()
```

#### Database Cluster 
You can either create alarms for an instance of a cluster all at once, optionally overriding the threshold values or using the defaults.

```ts
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
```

*Generate alarms for instance:*

```ts
Import {DatabaseAlarms} from '@beigetech/cdk-alarms';
DatabaseClusterAlarm.createClusterAlarms(stack, cluster);
```

*Generate individual alarms:*

```ts 
DatabaseClusterAlarm.createCpuAlarm(stack, cluster);
```

*Or use a builder for custom alarms*

```ts
DatabaseClusterAlarm.createAlarm(stack, cluster)
   .setMetric(CLUSTER_METRIC.CPU_UTILISATION)
   .setThreshold(90)
   .setOp(ComparisoOperator.GREATER_THAN_THRESHOLD)
   .build()
```
