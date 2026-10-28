export function getMatchMVP(match) {
  if (!match.mvpVotes || match.mvpVotes.length === 0) {
    return [];
  }

  const counter = [];

  for (const vote of match.mvpVotes) {
    const voteId = vote.voted.toString();

    counter[voteId] = (counter[voteId] || 0) + 1;
  }

  const maxVotes = Math.max(...Object.values(counter));

  return Object.entries(counter)
    .filter(([_, votes]) => votes === maxVotes)
    .map(([playerId]) => playerId);
}

export function getMatchVoteSummary(match) {
  const voteCountByPlayer = {};
  for (const vote of match.mvpVotes || []) {
    const id = vote.voted.toString();
    voteCountByPlayer[id] = (voteCountByPlayer[id] || 0) + 1;
  }
  return { voteCountByPlayer, mvpPlayers: getMatchMVP(match) };
}
