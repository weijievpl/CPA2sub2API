import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPastedInputItems,
  parsePastedJsonDocuments,
} from "./paste-input.mjs";

test("parsePastedJsonDocuments parses one expanded JSON object", () => {
  const result = parsePastedJsonDocuments(`
    {
      "type": "claude",
      "access_token": "token"
    }
  `);

  assert.equal(result.issues.length, 0);
  assert.deepEqual(result.documents, [
    {
      type: "claude",
      access_token: "token",
    },
  ]);
});

test("parsePastedJsonDocuments parses multiple expanded JSON documents", () => {
  const result = parsePastedJsonDocuments(`
    {
      "type": "codex",
      "access_token": "first"
    }

    {
      "type": "claude",
      "access_token": "second"
    }
  `);

  assert.equal(result.issues.length, 0);
  assert.deepEqual(result.documents, [
    {
      type: "codex",
      access_token: "first",
    },
    {
      type: "claude",
      access_token: "second",
    },
  ]);
});

test("parsePastedJsonDocuments parses JSONL style input", () => {
  const result = parsePastedJsonDocuments(`
{"type":"codex","access_token":"first"}
{"type":"claude","access_token":"second"}
  `);

  assert.equal(result.issues.length, 0);
  assert.deepEqual(result.documents, [
    {
      type: "codex",
      access_token: "first",
    },
    {
      type: "claude",
      access_token: "second",
    },
  ]);
});

test("parsePastedJsonDocuments ignores braces inside strings", () => {
  const result = parsePastedJsonDocuments(`
    {
      "type": "claude",
      "access_token": "token with } brace",
      "note": "escaped quote: \\" and { brace"
    }
    {
      "type": "gemini",
      "token": {
        "access_token": "second"
      }
    }
  `);

  assert.equal(result.issues.length, 0);
  assert.equal(result.documents.length, 2);
  assert.equal(result.documents[0].access_token, "token with } brace");
  assert.equal(result.documents[0].note, "escaped quote: \" and { brace");
});

test("parsePastedJsonDocuments keeps valid documents and reports trailing incomplete JSON", () => {
  const result = parsePastedJsonDocuments(`
    {"type":"claude","access_token":"ok"}
    {
      "type": "codex",
      "access_token": "unfinished"
  `);

  assert.deepEqual(result.documents, [
    {
      type: "claude",
      access_token: "ok",
    },
  ]);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].label, "粘贴内容 #2");
  assert.match(result.issues[0].reason, /JSON 不完整/);
});

test("buildPastedInputItems expands arrays in CPA to sub2api mode", () => {
  const items = buildPastedInputItems([
    [
      { type: "claude", access_token: "first" },
      { type: "claude", access_token: "second" },
    ],
  ], "cpaToSub2Api");

  assert.deepEqual(items, [
    {
      document: { type: "claude", access_token: "first" },
      sourceName: "粘贴内容 #1.1",
    },
    {
      document: { type: "claude", access_token: "second" },
      sourceName: "粘贴内容 #1.2",
    },
  ]);
});

test("buildPastedInputItems keeps arrays as one document in sub2api to CPA mode", () => {
  const accounts = [
    {
      platform: "anthropic",
      credentials: {
        access_token: "token",
      },
    },
  ];
  const items = buildPastedInputItems([accounts], "sub2apiToCpa");

  assert.deepEqual(items, [
    {
      document: accounts,
      sourceName: "粘贴内容 #1",
    },
  ]);
});
