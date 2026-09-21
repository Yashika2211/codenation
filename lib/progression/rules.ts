/**
 * The badge rule engine.
 *
 * `badges.rule` is a JSON predicate evaluated against a metric snapshot. Keeping
 * it as data rather than code means adding a badge is a row, and the same
 * predicate can be explained to a player verbatim.
 *
 * Evaluated inside the mint transaction for the affected user — simpler than a
 * trigger plus pg_notify plus a route handler, and correct for the same reason.
 */

export type Comparison = ">=" | ">" | "<=" | "<" | "==";

export type Condition = {
  metric: string;
  op: Comparison;
  value: number;
};

export type Rule =
  | { all: Array<Condition | Rule> }
  | { any: Array<Condition | Rule> }
  | { not: Condition | Rule }
  | Condition;

/**
 * Everything a rule may read. Missing keys read as 0, so a rule referring to a
 * topic nobody has touched is false rather than an error.
 */
export type MetricSnapshot = Record<string, number>;

function isCondition(rule: Rule): rule is Condition {
  return typeof (rule as Condition).metric === "string";
}

function compare(actual: number, op: Comparison, expected: number): boolean {
  switch (op) {
    case ">=":
      return actual >= expected;
    case ">":
      return actual > expected;
    case "<=":
      return actual <= expected;
    case "<":
      return actual < expected;
    case "==":
      return actual === expected;
  }
}

export function evaluate(rule: Rule, snapshot: MetricSnapshot): boolean {
  if (isCondition(rule)) {
    return compare(snapshot[rule.metric] ?? 0, rule.op, rule.value);
  }

  if ("all" in rule) {
    return rule.all.every((child) => evaluate(child, snapshot));
  }

  if ("any" in rule) {
    return rule.any.some((child) => evaluate(child, snapshot));
  }

  return !evaluate(rule.not, snapshot);
}

/** Parses an untrusted `rule` column into something safe to evaluate. */
export function parseRule(value: unknown): Rule | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;

  if (typeof candidate.metric === "string") {
    const op = candidate.op;
    const target = candidate.value;
    if (typeof target !== "number") return null;
    if (op !== ">=" && op !== ">" && op !== "<=" && op !== "<" && op !== "==") return null;
    return { metric: candidate.metric, op, value: target };
  }

  for (const key of ["all", "any"] as const) {
    const children = candidate[key];
    if (Array.isArray(children)) {
      const parsed = children.map(parseRule);
      if (parsed.some((child) => child === null)) return null;
      return key === "all"
        ? { all: parsed as Rule[] }
        : { any: parsed as Rule[] };
    }
  }

  if ("not" in candidate) {
    const inner = parseRule(candidate.not);
    return inner ? { not: inner } : null;
  }

  return null;
}

/** Human-readable form, so a locked badge can explain itself. */
export function describeRule(rule: Rule): string {
  if (isCondition(rule)) {
    return `${humanMetric(rule.metric)} ${rule.op} ${rule.value.toLocaleString("en-US")}`;
  }
  if ("all" in rule) return rule.all.map(describeRule).join(" and ");
  if ("any" in rule) return rule.any.map(describeRule).join(" or ");
  return `not (${describeRule(rule.not)})`;
}

function humanMetric(metric: string): string {
  const parts = metric.split(".");
  if (parts[0] === "solves" && parts[1] === "topic") return `${parts[2]} solves`;
  if (parts[0] === "solves" && parts[1] === "difficulty") return `${parts[2]} solves`;
  if (metric === "solves.total") return "problems solved";
  if (metric === "rep.total") return "reputation";
  if (metric === "arena.rating") return "arena rating";
  if (metric === "arena.wins") return "duels won";
  if (metric === "streak.days") return "active days";
  if (metric === "buildings.complete") return "buildings standing";
  if (metric === "items.forged") return "items forged";
  if (metric === "nations.founded") return "nations founded";
  return metric;
}
