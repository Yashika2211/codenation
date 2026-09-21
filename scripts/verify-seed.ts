import { spawnSync } from "node:child_process";
import { ALL_PROBLEMS } from "./data/problems";
import { normalizeOutput } from "../lib/judge/grade";

/**
 * Runs every seeded problem's reference solution against every one of its test
 * cases, locally, with the same line-wise comparison the judge uses.
 *
 * A seeded problem with a wrong `expected` is worse than no problem at all: it
 * is unsolvable, and the player has no way to know the fault is not theirs.
 * This gate runs in CI.
 */

type Failure = { slug: string; index: number; expected: string; actual: string; stderr: string };

function run(source: string, stdin: string): { stdout: string; stderr: string; code: number } {
  const result = spawnSync("python3", ["-c", source], {
    input: stdin,
    encoding: "utf8",
    timeout: 10_000,
    maxBuffer: 16 * 1024 * 1024,
  });

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    code: result.status ?? 1,
  };
}

function main(): void {
  const failures: Failure[] = [];
  let cases = 0;

  const slugs = new Set<string>();
  for (const problem of ALL_PROBLEMS) {
    if (slugs.has(problem.slug)) {
      console.error(`Duplicate slug: ${problem.slug}`);
      process.exitCode = 1;
    }
    slugs.add(problem.slug);

    if (!problem.testcases.some((t) => t.isSample)) {
      console.error(`${problem.slug}: no sample case — the Run button would do nothing`);
      process.exitCode = 1;
    }

    problem.testcases.forEach((testcase, index) => {
      cases += 1;
      const result = run(problem.reference, testcase.input);

      const actual = normalizeOutput(result.stdout).join("\n");
      const expected = normalizeOutput(testcase.expected).join("\n");

      if (result.code !== 0 || actual !== expected) {
        failures.push({
          slug: problem.slug,
          index,
          expected,
          actual,
          stderr: result.stderr.slice(0, 400),
        });
      }
    });
  }

  console.log(`Checked ${ALL_PROBLEMS.length} problems, ${cases} cases.`);

  if (failures.length === 0) {
    console.log("All reference solutions agree with their expected output.");
    return;
  }

  for (const failure of failures) {
    console.error(`\n✗ ${failure.slug} case ${failure.index}`);
    console.error(`  expected: ${JSON.stringify(failure.expected)}`);
    console.error(`  actual:   ${JSON.stringify(failure.actual)}`);
    if (failure.stderr) console.error(`  stderr:   ${failure.stderr}`);
  }

  console.error(`\n${failures.length} case(s) failed.`);
  process.exitCode = 1;
}

main();
