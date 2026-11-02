import { createHash } from "node:crypto";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseMatchSubmission(body) {
  if (!body.submissionId) return null; // Preserve ordinary HTML form submissions.
  if (!uuidPattern.test(body.submissionId)) {
    throw Object.assign(new Error("El identificador de envío no es válido."), { status: 400 });
  }
  const fields = (record, keys) => Object.fromEntries(keys.map((key) => [key, String(record[key] ?? "")]));
  const payload = {
    ...fields(body, ["date", "venue", "teamA", "teamB", "youtubeUrl", "youtubeHlUrl", "matchType"]),
    players: Object.values(body.players || {}).map((player) => fields(player, ["name", "team", "goals", "assists", "isOwnGoal", "guest"]))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    goalTimeline: Object.values(body.goalTimeline || {}).map((goal) => fields(goal, ["scorer", "assist", "ownGoal"])),
  };
  return {
    id: body.submissionId.toLowerCase(),
    hash: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
  };
}

export async function createMatchOnce(model, submission, build) {
  function existingResult(match) {
    if (match.submissionHash !== submission.hash) {
      throw Object.assign(new Error("Este partido ya se guardó, pero el borrador tiene cambios posteriores. Revisá el partido guardado antes de continuar."), {
        status: 409, matchId: match._id.toString(),
      });
    }
    return { match, created: false };
  }
  if (submission) {
    // The unique partial index is also the guard against simultaneous retries.
    await model.init();
    const existing = await model.findOne({ submissionId: submission.id });
    if (existing) return existingResult(existing);
  }
  const data = await build();
  try {
    const match = await model.create({
      ...data,
      ...(submission ? { submissionId: submission.id, submissionHash: submission.hash } : {}),
    });
    return { match, created: true };
  } catch (error) {
    if (submission && error.code === 11000) {
      const existing = await model.findOne({ submissionId: submission.id });
      if (existing) return existingResult(existing);
    }
    throw error;
  }
}
