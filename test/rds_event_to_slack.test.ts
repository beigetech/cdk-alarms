import * as unit from "../functions/rds_event_to_slack/index";
import * as fs from "fs";
import * as https from "https";
import { RequestOptions, IncomingMessage, ClientRequest } from "http";
import { URL } from "url";
jest.mock("https");

test("RDS Instance State Event", () => {
  let mockTaskChangeEvent = JSON.parse(
    fs.readFileSync("test_resources/rds_instance_change_info.json", "utf8")
  );
  let mockContext = {};
  assertSlackMessageBody({});

  return unit.handler(mockTaskChangeEvent, mockContext).then((result) => {
    expect(result).toEqual({
      dbInstanceIdentifier:
        "arn:aws:rds:us-east-1:123456789012:db:my-db-instance",
      message: "A Multi-AZ failover has completed.",
      eventType: "failover",
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
