import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const script = readFileSync(new URL("../src/public/js/matchEditorSafety.js", import.meta.url), "utf8");
const id = "9909fd0c-698b-421f-9420-85b87b98ed03";
const key = "toskos:match-draft:v1:admin:new";
const blank = { fields: { date: "", venue: "" }, players: [], goals: [] };
const populated = { fields: { date: "2026-11-02", venue: "Flow" }, players: [{ name: "Facu", team: "A", goals: "2" }], goals: [{ scorer: "Facu", ownGoal: "true" }] };

function setup(draft) {
  const storage = new Map(draft ? [[key, JSON.stringify(draft)]] : []);
  const timers = new Map();
  const intervals = new Map();
  const windowEvents = {};
  const requests = [];
  let nextTimer = 0;
  let current = structuredClone(blank);
  let result = { status: 500, body: { error: "No se pudo guardar." } };
  let redirected;
  const node = () => ({ hidden: true, dataset: {}, handlers: {}, addEventListener(type, fn) { this.handlers[type] = fn; } });
  const nodes = Object.fromEntries(["matchDraftStatus", "discardMatchDraft", "matchSaveFeedback", "matchSaveStatus", "matchSaveRecovery", "teamA", "teamB", "goal-timeline-list"].map((name) => [name, node()]));
  const submit = { textContent: "Guardar Partido" };
  const form = { ...node(), action: "https://example.test/matches", dataset: { draftOwner: "admin", draftId: "new" }, reportValidity: () => true,
    querySelector: () => submit, setAttribute() {}, removeAttribute() {},
  };
  nodes.matchEditorForm = form;
  vm.runInNewContext(script, {
    document: { readyState: "complete", getElementById: (name) => nodes[name], addEventListener() {} },
    window: {
      matchEditorData: { capture: () => structuredClone(current), restore: (_, snapshot) => { current = structuredClone(snapshot); } },
      location: { assign: (url) => { redirected = url; }, reload() {} }, addEventListener: (name, fn) => { windowEvents[name] = fn; },
    },
    localStorage: { getItem: (name) => storage.get(name) || null, setItem: (name, value) => storage.set(name, value), removeItem: (name) => storage.delete(name) },
    crypto: { randomUUID: () => id }, navigator: { onLine: true }, AbortController, URLSearchParams, Intl, Date, queueMicrotask,
    MutationObserver: class { observe() {} },
    FormData: class { *[Symbol.iterator]() { yield* Object.entries(current.fields); } },
    setTimeout: (fn, ms) => { const timer = ++nextTimer; timers.set(timer, { fn, ms }); return timer; }, clearTimeout: (timer) => timers.delete(timer),
    setInterval: (fn, ms) => { const timer = ++nextTimer; intervals.set(timer, { fn, ms }); return timer; }, clearInterval: (timer) => intervals.delete(timer),
    fetch: async (url, options = {}) => {
      requests.push({ url, options });
      if (url === "/api/keep-alive") return { status: 204 };
      return { ok: result.status < 300, status: result.status, headers: { get: () => "application/json" }, json: async () => result.body };
    },
  });
  return { storage, timers, intervals, windowEvents, requests, form, nodes,
    setSnapshot: (snapshot) => { current = structuredClone(snapshot); }, getSnapshot: () => current,
    setResult: (value) => { result = value; }, getRedirect: () => redirected,
  };
}

const flush = () => new Promise(setImmediate);

test("a draft restores all editor data and keep-alive stops when leaving the page", async () => {
  const app = setup({ version: 1, submissionId: id, snapshot: populated });
  await flush();
  assert.deepEqual(app.getSnapshot(), populated);
  assert.match(app.nodes.matchDraftStatus.textContent, /Borrador recuperado/);
  assert.equal(app.intervals.size, 1);
  assert.equal([...app.intervals.values()][0].ms, 300000);
  assert.equal(app.requests[0].url, "/api/keep-alive");
  app.windowEvents.pagehide();
  assert.equal(app.intervals.size, 0);
  assert(app.storage.has(key));
  app.windowEvents.pageshow({ persisted: true });
  await flush();
  assert.equal(app.intervals.size, 1);
});

test("a failed save keeps the draft and a confirmed retry removes it using the same submission ID", async () => {
  const app = setup();
  await flush();
  app.setSnapshot(populated);
  await app.form.handlers.submit({ preventDefault() {} });
  assert(app.storage.has(key));
  assert.equal(app.form.inert, false);
  assert.equal(app.nodes.matchSaveFeedback.dataset.error, "true");
  app.setResult({ status: 201, body: { ok: true, matchId: "saved-match", redirectUrl: "/matches" } });
  await app.form.handlers.submit({ preventDefault() {} });
  assert.equal(app.storage.has(key), false);
  assert.equal(app.getRedirect(), "/matches");
  const posts = app.requests.filter((request) => request.options.method === "POST");
  assert.equal(posts.length, 2);
  assert.equal(posts[0].options.body.get("submissionId"), posts[1].options.body.get("submissionId"));
  app.windowEvents.pagehide();
  assert.equal(app.storage.has(key), false);
});

test("an expired session offers login without losing data; discard resets only the draft", async () => {
  const app = setup();
  await flush();
  app.setSnapshot(populated);
  app.setResult({ status: 403, body: { loginRequired: true, error: "Volvé a iniciar sesión." } });
  await app.form.handlers.submit({ preventDefault() {} });
  assert(app.storage.has(key));
  assert.equal(app.nodes.matchSaveRecovery.href, "/login");
  assert.deepEqual(app.getSnapshot(), populated);
  app.nodes.discardMatchDraft.handlers.click();
  assert.equal(app.storage.has(key), false);
  assert.deepEqual(app.getSnapshot(), blank);
});
