import assert from "node:assert/strict";
import { mock, test } from "node:test";
import Match from "../src/models/match.model.js";
import Player from "../src/models/player.model.js";
import router from "../src/routes/records.route.js";

const handler = router.stack[0].route.stack[0].handle;

test("records group reads, retain MVP ties and fetch all MVP names in one query", async () => {
  const ids = ["000000000000000000000001", "000000000000000000000002"];
  const pipelines = [];
  let voteFilter;
  let nameFilter;
  let selectedVotes;
  let selectedNames;
  mock.method(Match, "aggregate", (pipeline) => {
    pipelines.push(pipeline);
    const facets = pipeline.at(-1).$facet;
    return Promise.resolve([
      Object.fromEntries(Object.keys(facets).map((key) => [key, []])),
    ]);
  });
  mock.method(Match, "find", (filter) => {
    voteFilter = filter;
    return {
      select(fields) {
        selectedVotes = fields;
        return this;
      },
      lean: async () => [
        { mvpVotes: ids.map((voted) => ({ voted })) },
        { mvpVotes: [{ voted: ids[0] }] },
        { mvpVotes: [] },
      ],
    };
  });
  mock.method(Player, "find", (filter) => {
    nameFilter = filter;
    return {
      select(fields) {
        selectedNames = fields;
        return this;
      },
      // A missing player retains the existing fallback name.
      lean: async () => [{ _id: ids[0], name: "Facu" }],
    };
  });

  try {
    let result;
    await handler({ query: { season: "2025" } }, {
      render(view, data) {
        assert.equal(view, "records");
        result = data;
      },
    });
    assert.equal(pipelines.length, 2);
    assert.equal(Match.find.mock.callCount(), 1);
    assert.equal(Player.find.mock.callCount(), 1);
    assert.equal(selectedVotes, "mvpVotes.voted");
    assert.equal(selectedNames, "name");
    assert.deepEqual(nameFilter, { _id: { $in: ids } });
    assert.deepEqual(result.topMVPs, [
      { name: "Facu", mvps: 2 },
      { name: "Desconocido", mvps: 1 },
    ]);
    assert.equal(result.selectedSeason, "2025");
    assert.deepEqual(voteFilter, {
      date: { $gte: new Date("2025-01-01"), $lt: new Date("2026-01-01") },
      matchType: { $ne: "friendly" },
    });
    for (const pipeline of pipelines) {
      assert.deepEqual(pipeline[0], { $match: voteFilter });
    }

    Match.find.mock.mockImplementation(() => ({
      select() { return this; },
      lean: async () => [],
    }));
    for (const season of [undefined, "all", "1900"]) {
      await handler({ query: season ? { season } : {} }, {
        render(view, data) {
          assert.deepEqual(data.topMVPs, []);
          assert.deepEqual(data.bestWinrate, []);
          assert.equal(data.selectedSeason, season || "2026");
        },
      });
    }
    assert.equal(Player.find.mock.callCount(), 1, "Skip names query without MVPs");
  } finally {
    mock.restoreAll();
  }
});
