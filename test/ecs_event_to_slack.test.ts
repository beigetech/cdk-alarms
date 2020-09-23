import * as unit from "../functions/ecs_event_to_slack/index";
import * as fs from "fs";
import * as https from "https";
import { RequestOptions, IncomingMessage, ClientRequest } from "http";
import { URL } from "url";
jest.mock("https");

test("ECS Task State Change INFO", () => {
  let mockTaskChangeEvent = JSON.parse(
    fs.readFileSync("test_resources/ecs_task_change_info.json", "utf8")
  );
  let mockContext = {};
  assertSlackMessageBody({});

  return unit.handler(mockTaskChangeEvent, mockContext).then((result) => {
    expect(result).toEqual({
      clusterName: "arn:aws:ecs:us-west-2:111122223333:cluster/FargateCluster",
      desiredStatus: "RUNNING",
      lastStatus: "RUNNING",
      extra: "Container: FargateApp status: RUNNING",
      eventType: "INFO",
    });
  });
});

test("ECS Task State Change ERROR", () => {
  let mockTaskChangeEvent = JSON.parse(
    fs.readFileSync("test_resources/ecs_task_change_error.json", "utf8")
  );

  let mockContext = {};
  assertSlackMessageBody({});

  return unit.handler(mockTaskChangeEvent, mockContext).then((result) => {
    expect(result).toEqual({
      clusterName: "arn:aws:ecs:us-west-2:111122223333:cluster/FargateCluster",
      desiredStatus: "RUNNING",
      lastStatus: "STOPPED",
      extra: "Container: FargateApp status: RUNNING",
      eventType: "ERROR",
    });
  });
});

test("ECS Service State Change INFO", () => {
  let mockTaskChangeEvent = JSON.parse(
    fs.readFileSync("test_resources/ecs_service_change_info.json", "utf8")
  );

  let mockContext = {};
  assertSlackMessageBody({});

  return unit.handler(mockTaskChangeEvent, mockContext).then((result) => {
    expect(result).toEqual({
      clusterName: "arn:aws:ecs:us-west-2:111122223333:cluster/default",
      desiredStatus: undefined,
      lastStatus: undefined,
      extra:
        "Service: arn:aws:ecs:us-west-2:111122223333:service/default/servicetest, The service is healthy and at the desired number of tasks, thus reaching a steady state.",
      eventType: "INFO",
    });
  });
});

function assertSlackMessageBody(obj: {}) {
  jest.spyOn(https, "request").mockImplementation(
    (
      url: string | URL,
      options: RequestOptions,
      callback?: (res: IncomingMessage) => void
    ): ClientRequest => {
      return <ClientRequest>{
        on: (kind: string, event: any): any => {
          if (kind == "error") {
            return "An error occurred";
          }
        },
        end: () => {},
        write: (body: any): void => {},
      };
    }
  );
}
