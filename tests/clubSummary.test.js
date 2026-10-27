import assert from "node:assert/strict";
import { test } from "node:test";
import { createClubSummaryService } from "../src/services/clubSummary.service.js";

function fixtureModel() {
  const calls = { latest: [], rankings: [] };
  const model = {
    calls,
    latest: { _id: "match-1", date: new Date("2026-10-23"), teamA: 8, teamB: 6 },
    findOne(filter) {
      calls.latest.push(filter);
      return {
        sort(order) { assert.deepEqual(order, { date: -1, _id: -1 }); return this; },
        select(fields) { assert.equal(fields, "date teamA teamB matchType"); return this; },
        lean: async () => model.latest,
      };
    },
    async aggregate(pipeline) {
      calls.rankings.push(pipeline);
      return [{ scorers: [{ _id: "a", name: "Ana", value: 32 }], assists: [] }];
    },
  };
  return model;
}

test("club summary shares two reads between requests, expires and invalidates after changes", async () => {
  const model = fixtureModel();
  let date = new Date("2026-10-27T12:00:00Z");
  const service = createClubSummaryService({ model, now: () => date });
  const [first, concurrent] = await Promise.all([service.getSummary(), service.getSummary()]);
  assert.deepEqual(first, concurrent);
  assert.equal(first.season, 2026);
  assert.equal(first.seasonEndISO, "2027-01-01T03:00:00.000Z");
  assert.equal(first.latestMatch.teamA, 8);
  assert.equal(first.scorers[0].value, 32);
  assert.equal(model.calls.latest.length, 1);
  assert.equal(model.calls.rankings.length, 1);
  await service.getSummary();
  assert.equal(model.calls.rankings.length, 1, "Navigation uses cached data");
  date = new Date(date.getTime() + 60_001);
  await service.getSummary();
  assert.equal(model.calls.rankings.length, 2);
  model.latest = null;
  service.invalidate();
  assert.equal((await service.getSummary()).latestMatch, null);
  assert.equal(model.calls.rankings.length, 3);

  const pipeline = model.calls.rankings[0];
  assert.deepEqual(pipeline[0].$match, {
    date: { $gte: new Date("2026-01-01"), $lt: new Date("2027-01-01") },
    matchType: { $ne: "friendly" },
  });
  assert.ok(pipeline.some((stage) => stage.$match?.["playerInfo.guest"]?.$ne === true));
  assert.ok(pipeline.some((stage) => stage.$match?.["playerInfo.name"]?.$ne === "E/C"));
  const { scorers, assists } = pipeline.at(-1).$facet;
  assert.deepEqual(scorers[0].$sort, { goals: -1, assists: -1, matches: 1, name: 1 });
  assert.deepEqual(assists[0].$sort, { assists: -1, goals: -1, matches: 1, name: 1 });
  assert.equal(scorers[1].$limit, 3);
  assert.equal(assists[1].$limit, 3);
});

test("club summary uses Buenos Aires season at year rollover and recovers after a failed read", async () => {
  const model = fixtureModel();
  let date = new Date("2027-01-01T02:59:59Z");
  const service = createClubSummaryService({ model, now: () => date });
  assert.equal((await service.getSummary()).season, 2026);
  date = new Date("2027-01-01T03:00:00Z");
  assert.equal((await service.getSummary()).season, 2027);
  assert.equal(model.calls.rankings.length, 2);
  service.invalidate();
  const successfulAggregate = model.aggregate;
  model.aggregate = async () => { throw new Error("Unavailable"); };
  await assert.rejects(service.getSummary(), /Unavailable/);
  model.aggregate = successfulAggregate;
  assert.equal((await service.getSummary()).season, 2027);
});
