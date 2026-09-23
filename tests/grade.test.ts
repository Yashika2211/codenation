import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeOutput,
  outputMatches,
  verdictFor,
  statusFor,
  summarize,
  type CaseResult,
} from "../lib/judge/grade";
import type { RunOutput } from "../lib/judge/runner";

/**
 * Grading.
 *
 * The forgiving parts matter as much as the strict ones: a correct solution
 * must not fail on a trailing newline, and a wrong one must not pass because
 * the comparison was too loose.
 */

function run(overrides: Partial<RunOutput> = {}): RunOutput {
  return {
    stdout: "",
    stderr: "",
    exitCode: 0,
    runtimeMs: 10,
    memoryKb: 1024,
    verdict: "ok",
    ...overrides,
  };
}

function caseResult(overrides: Partial<CaseResult> = {}): CaseResult {
  return {
    testcaseId: "t",
    ordinal: 0,
    verdict: "passed",
    runtimeMs: 10,
    memoryKb: 1024,
    ...overrides,
  };
}

test("trailing newlines and trailing blank lines are ignored", () => {
  assert.ok(outputMatches("42\n", "42"));
  assert.ok(outputMatches("42", "42\n"));
  assert.ok(outputMatches("42\n\n\n", "42"));
  assert.ok(outputMatches("1\n2\n", "1\n2\n\n"));
});

test("trailing whitespace on a line is ignored", () => {
  assert.ok(outputMatches("hello   ", "hello"));
  assert.ok(outputMatches("1 2 3  \n4 5  ", "1 2 3\n4 5"));
});

test("windows line endings compare equal to unix", () => {
  assert.ok(outputMatches("a\r\nb\r\n", "a\nb"));
});

test("interior blank lines are significant", () => {
  assert.ok(!outputMatches("a\n\nb", "a\nb"));
});

test("leading whitespace is significant", () => {
  assert.ok(!outputMatches("  42", "42"));
});

test("a different value never passes", () => {
  assert.ok(!outputMatches("41", "42"));
  assert.ok(!outputMatches("42 43", "42"));
  assert.ok(!outputMatches("", "42"));
});

test("empty output matches empty expectation", () => {
  assert.ok(outputMatches("", ""));
  assert.ok(outputMatches("\n\n", ""));
});

test("normalizeOutput drops trailing blanks but keeps interior ones", () => {
  assert.deepEqual(normalizeOutput("a\n\nb\n\n\n"), ["a", "", "b"]);
});

test("a timeout is a time limit, not a wrong answer", () => {
  assert.equal(verdictFor(run({ verdict: "timeout", stdout: "42" }), "42"), "tle");
});

test("a runtime or compile error beats output comparison", () => {
  assert.equal(verdictFor(run({ verdict: "runtime_error", stdout: "42" }), "42"), "error");
  assert.equal(verdictFor(run({ verdict: "compile_error" }), ""), "error");
});

test("a clean run is graded on its output", () => {
  assert.equal(verdictFor(run({ stdout: "42\n" }), "42"), "passed");
  assert.equal(verdictFor(run({ stdout: "41" }), "42"), "failed");
});

test("the submission status reports the first real failure, not the last", () => {
  assert.equal(
    statusFor([caseResult(), caseResult({ ordinal: 1, verdict: "tle" }), caseResult({ ordinal: 2, verdict: "failed" })]),
    "tle",
  );
  assert.equal(
    statusFor([caseResult(), caseResult({ ordinal: 1, verdict: "failed" })]),
    "wrong_answer",
  );
});

test("accepted requires every case to pass", () => {
  assert.equal(statusFor([caseResult(), caseResult({ ordinal: 1 })]), "accepted");
  assert.equal(
    statusFor([caseResult(), caseResult({ ordinal: 1, verdict: "failed" })]),
    "wrong_answer",
  );
});

test("a submission with no cases is an error, never an accept", () => {
  assert.equal(statusFor([]), "error");
});

test("summarize reports the worst case, not the average", () => {
  const totals = summarize([
    caseResult({ runtimeMs: 10, memoryKb: 100 }),
    caseResult({ ordinal: 1, runtimeMs: 900, memoryKb: 8000 }),
    caseResult({ ordinal: 2, verdict: "failed", runtimeMs: 50, memoryKb: 200 }),
  ]);

  assert.equal(totals.passed, 2);
  assert.equal(totals.total, 3);
  assert.equal(totals.runtimeMs, 900, "a limit is about the worst case");
  assert.equal(totals.memoryKb, 8000);
});

test("summarize handles a backend that reports no memory", () => {
  const totals = summarize([caseResult({ memoryKb: null }), caseResult({ ordinal: 1, memoryKb: null })]);
  assert.equal(totals.memoryKb, null);
});
