/**
 * Winnowing k-gram fingerprints, per section 8: k = 5, window = 4.
 *
 * The source is normalised to a token stream first, so reformatting, renaming a
 * variable or reindenting does not change the fingerprint — which is the whole
 * point. What survives is the shape of the program.
 *
 * Only hashes are ever stored. The source that produced them stays in
 * `submissions`, readable by its author and the service role and nobody else.
 */

export const K_GRAM = 5;
export const WINDOW = 4;

/** Jaccard at or above this raises a flag for a human to look at. */
export const SIMILARITY_THRESHOLD = 0.82;

const KEYWORDS = new Set([
  "if", "else", "for", "while", "return", "function", "def", "class", "let", "const", "var",
  "int", "long", "float", "double", "string", "bool", "void", "fn", "func", "pub", "use",
  "import", "from", "package", "public", "static", "main", "print", "println", "printf",
  "cout", "cin", "std", "true", "false", "null", "none", "new", "break", "continue",
]);

/**
 * Collapses a program to its structural tokens. Identifiers and literals become
 * placeholders; keywords and operators are kept verbatim.
 */
export function tokenize(source: string): string[] {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/#[^\n]*/g, " ")
    .replace(/"""[\s\S]*?"""/g, ' "S" ')
    .replace(/'''[\s\S]*?'''/g, ' "S" ');

  const tokens: string[] = [];
  const pattern = /[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s\w]/g;

  for (const match of withoutComments.matchAll(pattern)) {
    const token = match[0];

    if (/^[A-Za-z_]/.test(token)) {
      tokens.push(KEYWORDS.has(token.toLowerCase()) ? token.toLowerCase() : "id");
    } else if (/^\d/.test(token)) {
      tokens.push("num");
    } else if (token.startsWith('"') || token.startsWith("'")) {
      tokens.push("str");
    } else {
      tokens.push(token);
    }
  }

  return tokens;
}

/** FNV-1a, 32-bit. Stays well inside the safe integer range for a bigint[]. */
function hashGram(gram: string): number {
  let hash = 2166136261;
  for (let i = 0; i < gram.length; i += 1) {
    hash ^= gram.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export type Fingerprint = { hashes: number[]; tokenCount: number };

export function fingerprint(source: string): Fingerprint {
  const tokens = tokenize(source);

  if (tokens.length < K_GRAM) {
    return { hashes: [], tokenCount: tokens.length };
  }

  const grams: number[] = [];
  for (let i = 0; i + K_GRAM <= tokens.length; i += 1) {
    grams.push(hashGram(tokens.slice(i, i + K_GRAM).join("\u0001")));
  }

  if (grams.length < WINDOW) {
    return { hashes: Array.from(new Set(grams)).sort((a, b) => a - b), tokenCount: tokens.length };
  }

  // Winnow: from each window pick the minimum hash, breaking ties to the right.
  // Picking consistently means two texts sharing a passage select the same
  // hashes from it, regardless of where the window boundaries happen to fall.
  const selected = new Set<number>();
  let lastIndex = -1;

  for (let i = 0; i + WINDOW <= grams.length; i += 1) {
    let minIndex = i;
    for (let j = i; j < i + WINDOW; j += 1) {
      const candidate = grams[j];
      const incumbent = grams[minIndex];
      if (candidate === undefined || incumbent === undefined) continue;
      if (candidate <= incumbent) minIndex = j;
    }

    if (minIndex !== lastIndex) {
      const value = grams[minIndex];
      if (value !== undefined) selected.add(value);
      lastIndex = minIndex;
    }
  }

  return { hashes: Array.from(selected).sort((a, b) => a - b), tokenCount: tokens.length };
}

/** Jaccard similarity of two fingerprint sets. */
export function jaccard(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;

  const setA = new Set(a);
  let intersection = 0;
  for (const value of new Set(b)) {
    if (setA.has(value)) intersection += 1;
  }

  const union = setA.size + new Set(b).size - intersection;
  return union === 0 ? 0 : intersection / union;
}
