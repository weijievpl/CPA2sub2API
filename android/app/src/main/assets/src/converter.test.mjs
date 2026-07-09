import assert from "node:assert/strict";
import test from "node:test";

import {
  convertCPARecord,
  convertSub2ApiDocument,
} from "./converter.mjs";

function jwt(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.`;
}

test("CPA Codex input accepts missing refresh_token", () => {
  const converted = convertCPARecord({
    type: "codex",
    access_token: jwt({
      exp: 4_102_444_800,
      "https://api.openai.com/profile": {
        email: "codex@example.com",
      },
    }),
    id_token: jwt({
      email: "codex@example.com",
    }),
  }, {
    now: new Date("2026-05-25T00:00:00.000Z"),
  });

  assert.equal(converted.account.credentials.refresh_token, undefined);
  assert.equal(converted.document.accounts[0].credentials.refresh_token, undefined);
});

test("sub2api OpenAI input emits blank CPA refresh_token when missing", () => {
  const result = convertSub2ApiDocument({
    accounts: [
      {
        name: "Codex Account",
        platform: "openai",
        type: "oauth",
        credentials: {
          access_token: jwt({
            exp: 4_102_444_800,
          }),
          id_token: jwt({
            email: "codex@example.com",
          }),
          email: "codex@example.com",
        },
      },
    ],
  }, {
    now: new Date("2026-05-25T00:00:00.000Z"),
  });

  assert.equal(result.skipped.length, 0);
  assert.equal(result.converted.length, 1);
  assert.equal(result.converted[0].document.refresh_token, "");
  assert.ok(Object.hasOwn(result.converted[0].document, "refresh_token"));
});
