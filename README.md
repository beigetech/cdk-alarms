## @beigetech/cdk-alarms: Alarms for AWS Resources

[![npm version](https://badge.fury.io/js/%40beigetech%2Fcdk-alarms.svg)](https://badge.fury.io/js/%40beigetech%2Fcdk-alarms)

Create CloudWatch alarms and event notifications for AWS resources, supported constructs:

 - DatabaseInstance
 - DatabaseCluster

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

DatabaseAlarm.createClusterAlarms(stack, cluster);
```

*Generate individual alarms:*

```ts 
DatabaseAlarm.createCpuAlarm(stack, cluster);
```
