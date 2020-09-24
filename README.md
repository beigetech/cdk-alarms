[![coverage report](https://gitlab.com/beige/ops/cdk-alarms/badges/master/coverage.svg)](https://gitlab.com/beige/ops/cdk-alarms/-/commits/master)

## @beige/cdk-alarms: Alarms for AWS Resources

Create CloudWatch alarms and event notifications for AWS resources, supported constructs:

 - DatabaseInstance
 - DatabaseCluster

Example:

```
Import {DatabaseAlarms} from '@beige/cdk-alarms';

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

DatabaseAlarm.createClusterAlarms(stack, cluster);
```
