import * as unit from "../functions/log_event_to_slack/index";
import * as https from "https";
import { RequestOptions, IncomingMessage, ClientRequest } from "http";
import { URL } from "url";
import * as zlib from "zlib";
jest.mock("https");

test("Log error event to slack", () => {
  let event = {
    logEvents: [
      {
        logStream: "abc",
        logGroup: "abc",
        message: "An error occurred",
      },
    ],
  };
  let compressedMessage = zlib.gzipSync(Buffer.from(JSON.stringify(event)));

  let preparedEvent = {
    awslogs: {
      data: compressedMessage.toString("base64"),
    },
  };

  let mockContext = {};
  assertSlackMessageBody({});

  let result = unit.handler(preparedEvent, mockContext);
  expect(result).toEqual(event.logEvents);
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
