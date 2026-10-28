import test from "node:test";
import assert from "node:assert/strict";
import { getMatchVoteSummary } from "../src/services/mvp.service.js";

test("MVP summaries include all tied leaders and count each player's votes", () => {
  const match = { mvpVotes: [
    { voter: "a", voted: "manu" },
    { voter: "b", voted: "facu" },
  ] };
  assert.deepEqual(getMatchVoteSummary(match), {
    voteCountByPlayer: { manu: 1, facu: 1 }, mvpPlayers: ["manu", "facu"],
  });
  match.mvpVotes.push({ voter: "c", voted: "manu" });
  assert.deepEqual(getMatchVoteSummary(match), {
    voteCountByPlayer: { manu: 2, facu: 1 }, mvpPlayers: ["manu"],
  });
  match.mvpVotes[0].voted = "facu";
  assert.deepEqual(getMatchVoteSummary(match), {
    voteCountByPlayer: { facu: 2, manu: 1 }, mvpPlayers: ["facu"],
  });
});

test("a match without votes has no MVP", () => {
  assert.deepEqual(getMatchVoteSummary({}), { voteCountByPlayer: {}, mvpPlayers: [] });
});
