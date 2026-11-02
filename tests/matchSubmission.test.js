import test from "node:test";
import assert from "node:assert/strict";
import { parseMatchSubmission, createMatchOnce } from "../src/services/matchSubmission.js";

const body = {
  submissionId: "9909fd0c-698b-421f-9420-85b87b98ed03", date: "2026-11-02", venue: "Flow",
  players: { 0: { name: "Facu", team: "A", goals: "2", assists: "1" }, 3: { name: "Manu", team: "B", goals: "1", assists: "0" } },
  goalTimeline: { 0: { scorer: "Facu", ownGoal: "false" }, 1: { scorer: "Manu", ownGoal: "true" } },
};

test("submission fingerprints survive rebuilt row indexes but detect changed stats and goal order", () => {
  const submission = parseMatchSubmission(body);
  const rebuilt = { ...body, players: { 0: body.players[3], 1: body.players[0] } };
  assert.equal(parseMatchSubmission(rebuilt).hash, submission.hash);
  assert.notEqual(parseMatchSubmission({ ...body, venue: "Otra cancha" }).hash, submission.hash);
  assert.notEqual(parseMatchSubmission({ ...body, goalTimeline: { 0: body.goalTimeline[1], 1: body.goalTimeline[0] } }).hash, submission.hash);
  assert.equal(parseMatchSubmission({}), null);
  assert.throws(() => parseMatchSubmission({ submissionId: "invalid" }), { status: 400 });
});

test("a repeated save acknowledges the original match without creating players or a second match", async () => {
  const submission = parseMatchSubmission(body);
  let stored;
  let builds = 0;
  const model = {
    init: async () => {}, findOne: async () => stored,
    create: async (data) => (stored = { ...data, _id: "match" }),
  };
  const build = async () => { builds++; return { venue: "Flow" }; };
  assert.equal((await createMatchOnce(model, submission, build)).created, true);
  const retry = await createMatchOnce(model, submission, build);
  assert.equal(retry.created, false);
  assert.equal(retry.match._id, "match");
  assert.equal(builds, 1);
  await assert.rejects(createMatchOnce(model, parseMatchSubmission({ ...body, venue: "Changed" }), build), { status: 409, matchId: "match" });
});

test("the unique index resolves simultaneous retries to a single saved match", async () => {
  const submission = parseMatchSubmission(body);
  let reads = 0;
  const original = { _id: "same-match", submissionHash: submission.hash };
  const model = {
    init: async () => {}, findOne: async () => ++reads === 1 ? null : original,
    create: async () => { throw Object.assign(new Error("duplicate"), { code: 11000 }); },
  };
  const result = await createMatchOnce(model, submission, async () => ({}));
  assert.equal(result.created, false);
  assert.equal(result.match._id, "same-match");
});
