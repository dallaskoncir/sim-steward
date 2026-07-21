import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "./route";

function postRequest(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("streams a well-formed SSE response for a valid request", async () => {
  const response = await POST(
    postRequest({
      messages: [{ id: "1", role: "user", parts: [{ type: "text", text: "divebomb at turn 1" }] }],
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/event-stream");

  const body = await response.text();
  // SSE framing: every event is a "data: <json>\n\n" line, closed with [DONE].
  // The mock text streams as one JSON delta chunk per word, so check for a
  // representative fragment rather than the reassembled sentence.
  assert.match(body, /^data: /m);
  assert.match(body, /data: \[DONE\]/);
  assert.match(body, /"delta":"This"/);
  assert.match(body, /"delta":" placeholder"/);
});

test("rejects a request whose body isn't valid JSON", async () => {
  const response = await POST(postRequest("not json"));

  assert.equal(response.status, 400);
});

test("rejects a request without a messages array", async () => {
  const response = await POST(postRequest({}));

  assert.equal(response.status, 400);
});
