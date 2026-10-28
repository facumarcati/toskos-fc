import test from "node:test";
import assert from "node:assert/strict";
import { addMatchMonthHeadings } from "../src/services/matchMonths.js";

test("month headings count the filtered list and preserve either date order", () => {
  const matches = [
    { _id: "oct2", date: "2026-10-23T03:00:00Z" },
    { _id: "oct1", date: "2026-10-02T03:00:00Z" },
    { _id: "sep", date: "2026-09-18T03:00:00Z" },
    { _id: "old", date: "2025-10-03T03:00:00Z" },
  ];
  for (const input of [matches, [...matches].reverse()]) {
    const result = addMatchMonthHeadings(input);
    assert.deepEqual(result.map((match) => match._id), input.map((match) => match._id));
    const headings = result.filter((match) => match.monthHeading).map((match) => match.monthHeading);
    assert.equal(headings.length, 3);
    assert.deepEqual(headings.find((heading) => heading.label === "octubre 2026"), { label: "octubre 2026", count: 2 });
  }
  assert.equal(addMatchMonthHeadings(matches.slice(0, 1))[0].monthHeading.count, 1);
  assert.equal(matches[0].monthHeading, undefined);
  assert.deepEqual(addMatchMonthHeadings([]), []);
});

test("month boundaries use the calendar in Argentina", () => {
  const result = addMatchMonthHeadings([
    { date: "2027-01-01T03:00:00Z" },
    { date: "2027-01-01T02:59:00Z" },
  ]);
  assert.equal(result[0].monthHeading.label, "enero 2027");
  assert.equal(result[1].monthHeading.label, "diciembre 2026");
});
