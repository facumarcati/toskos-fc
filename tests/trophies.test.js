import assert from "node:assert/strict";
import { mock, test } from "node:test";
import Match from "../src/models/match.model.js";
import { getPodiumsForSeason, getTrophyLeaderboard, getTitlesByPlayer } from "../src/services/titles.service.js";
import router from "../src/routes/trophies.routes.js";

const tiedRanking = [
  { _id: "a", name: "Ana", value: 10, assists: 3, matches: 5 },
  { _id: "b", name: "Beto", value: 10, assists: 3, matches: 5 },
  { _id: "c", name: "Cami", value: 8, assists: 5, matches: 5 },
  { _id: "d", name: "Dani", value: 8, assists: 3, matches: 5 },
  { _id: "e", name: "Ema", value: 7, assists: 3, matches: 5 },
];

function rankings(rows = tiedRanking) {
  return [{ scorers: rows, assists: rows, matchesPlayed: rows, wins: rows }];
}

test("stats titles reuse one season query while retaining ties and medal counts", async () => {
  mock.method(Match, "aggregate", async () => rankings());
  try {
    const titles = await getTitlesByPlayer("2025");
    assert.equal(Match.aggregate.mock.callCount(), 1);
    assert.deepEqual(titles, { a: 4, b: 4, c: 4, d: 4 });
    assert.equal(titles.e, undefined);
    assert.deepEqual(await getTitlesByPlayer("2021"), {});
    assert.equal(Match.aggregate.mock.callCount(), 1);
    const all = await getTitlesByPlayer("all");
    const seasons = new Date() >= new Date("2027-01-01") ? 3 : 2;
    assert.equal(Match.aggregate.mock.callCount(), 1 + seasons);
    assert.equal(all.a, 4 * seasons);
  } finally {
    mock.restoreAll();
  }
});

test("one season query shares totals, retaining dense podium positions and tiebreakers", async () => {
  let pipeline;
  mock.method(Match, "aggregate", async (stages) => {
    pipeline = stages;
    return rankings();
  });
  try {
    const categories = await getPodiumsForSeason(2025);
    assert.equal(Match.aggregate.mock.callCount(), 1);
    assert.equal(pipeline.filter((stage) => stage.$lookup).length, 1);
    assert.equal(pipeline.filter((stage) => stage.$group).length, 1);
    assert.deepEqual(pipeline[0].$match, {
      date: { $gte: new Date("2025-01-01"), $lt: new Date("2026-01-01") },
      matchType: { $ne: "friendly" },
    });
    assert.ok(pipeline.some((stage) => stage.$match?.["playerInfo.guest"]?.$ne === true));
    assert.ok(pipeline.some((stage) => stage.$match?.["playerInfo.name"]?.$ne === "E/C"));
    const facets = pipeline.at(-1).$facet;
    assert.deepEqual(facets.scorers.at(-1).$sort, { value: -1, assists: -1, matches: 1 });
    assert.deepEqual(facets.assists.at(-1).$sort, { value: -1, goals: -1, matches: 1 });
    assert.deepEqual(facets.matchesPlayed.at(-1).$sort, { value: -1, wins: -1, goals: -1, assists: -1 });
    assert.deepEqual(facets.wins.at(-1).$sort, { value: -1, matches: 1, goals: -1, assists: -1 });
    for (const category of categories) {
      assert.deepEqual(category.podium.map((player) => player.position), [1, 1, 2, 3]);
      assert.deepEqual(category.podium.map((player) => player.playerId), ["a", "b", "c", "d"]);
    }
    Match.aggregate.mock.mockImplementation(async () => rankings([]));
    const empty = await getPodiumsForSeason(1900);
    assert.equal(empty.length, 4);
    assert.ok(empty.every((category) => category.podium.length === 0));
  } finally {
    mock.restoreAll();
  }
});

test("trophies page reuses season podiums for leaderboard with and without current year", async () => {
  const currentYear = new Date().getFullYear();
  const handler = router.stack[0].route.stack[0].handle;
  const calls = [];
  mock.method(Match, "aggregate", async (pipeline) => {
    calls.push(pipeline[0].$match.date.$gte.getUTCFullYear());
    return rankings();
  });
  try {
    for (const includeCurrent of ["0", "1"]) {
      calls.length = 0;
      let rendered;
      await handler({ query: { includeCurrent } }, {
        render(view, data) { assert.equal(view, "trophies"); rendered = data; },
      });
      const leaderboardYears = [];
      for (let year = 2024; year <= currentYear; year++) {
        if (includeCurrent === "1" || year !== currentYear) leaderboardYears.push(year);
      }
      const expectedYears = new Set([2026, 2025, 2024, ...leaderboardYears]);
      assert.equal(calls.length, expectedYears.size, "Load each season only once");
      assert.deepEqual(new Set(calls), expectedYears);
      assert.equal(rendered.seasons.length, 3);
      assert.equal(rendered.seasons.filter((season) => season.isSelected).length, 1);
      assert.equal(rendered.selectedSeason, 2026);
      const steps = rendered.seasons[0].categories[0].steps;
      assert.deepEqual(steps.map((step) => step.position), [2, 1, 3]);
      assert.equal(steps[1].isShared, true);
      assert.deepEqual(steps[1].players.map((player) => player.playerId), ["a", "b"]);
      assert.equal(steps[1].players[0].profileUrl, "/players/a?season=2026");
      assert.equal(rendered.includeCurrentSeason, includeCurrent === "1");
      assert.equal(rendered.leaderboard.length, 4);
      assert.ok(rendered.leaderboard.every((player) => player.titles === 4 * leaderboardYears.length));
    }
    for (const [requested, expected] of [["2025", 2025], ["invalid", 2026]]) {
      await handler({ query: { season: requested } }, {
        render(view, data) {
          assert.equal(data.selectedSeason, expected);
          assert.equal(data.seasons.find((season) => season.isSelected).season, expected);
        },
      });
    }
    calls.length = 0;
    await getTrophyLeaderboard({ includeCurrentSeason: true });
    assert.equal(calls.length, currentYear - 2024 + 1);
    assert.equal(new Set(calls).size, calls.length);
  } finally {
    mock.restoreAll();
  }
});
