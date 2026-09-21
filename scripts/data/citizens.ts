/**
 * Twenty-five synthetic citizens.
 *
 * Section 11 is the rule here: every one of these is inserted with
 * `is_seed = true`, excluded from the landing page's citizen count, and marked
 * visibly on their own profile. They exist so the world is not empty on day
 * one — not to inflate a number.
 */

export type SeedCitizen = {
  handle: string;
  displayName: string;
  bio: string;
  countryCode: string;
  /** Target reputation. The seeder mints it through the ledger, never by patch. */
  reputation: number;
  arenaRating: number;
  /** Topics this citizen is strong in, shaping their radar and solve history. */
  strengths: string[];
};

export const CITIZENS: SeedCitizen[] = [
  { handle: "ada-nullptr", displayName: "Ada Nullptr", bio: "Writes the invariant before the loop.", countryCode: "GB", reputation: 11200, arenaRating: 2140, strengths: ["dp", "math"] },
  { handle: "grace-shiftleft", displayName: "Grace Shiftleft", bio: "Compilers, and the arguments about them.", countryCode: "US", reputation: 9400, arenaRating: 2050, strengths: ["strings", "kmp"] },
  { handle: "hoare-partition", displayName: "Hoare Partition", bio: "Sorting is a solved problem. The constants are not.", countryCode: "GB", reputation: 8100, arenaRating: 1980, strengths: ["sorting", "arrays"] },
  { handle: "dijkstra-relax", displayName: "Dijkstra Relax", bio: "Every grid is a graph wearing a costume.", countryCode: "NL", reputation: 7600, arenaRating: 1935, strengths: ["graphs", "dijkstra"] },
  { handle: "knuth-omega", displayName: "Knuth Omega", bio: "Premature optimisation, and the other ninety-seven percent.", countryCode: "US", reputation: 6900, arenaRating: 1890, strengths: ["math", "number-theory"] },
  { handle: "fenwick-tree", displayName: "Fenwick Tree", bio: "Half the memory, twice the subtlety.", countryCode: "AU", reputation: 6100, arenaRating: 1845, strengths: ["data-structures", "prefix-sums"] },
  { handle: "kadane-max", displayName: "Kadane Max", bio: "One pass, one running best.", countryCode: "IN", reputation: 5400, arenaRating: 1810, strengths: ["dp", "arrays"] },
  { handle: "tarjan-scc", displayName: "Tarjan SCC", bio: "Collapse the cycles and the graph behaves.", countryCode: "CA", reputation: 5050, arenaRating: 1782, strengths: ["graphs"] },
  { handle: "lamport-clock", displayName: "Lamport Clock", bio: "Ordering events that never met.", countryCode: "US", reputation: 4700, arenaRating: 1760, strengths: ["implementation", "math"] },
  { handle: "hopper-debug", displayName: "Hopper Debug", bio: "Found the moth. Kept the moth.", countryCode: "US", reputation: 4300, arenaRating: 1735, strengths: ["implementation"] },
  { handle: "euler-phi", displayName: "Euler Phi", bio: "Totients, and where they quietly show up.", countryCode: "CH", reputation: 3950, arenaRating: 1700, strengths: ["number-theory", "math"] },
  { handle: "floyd-cycle", displayName: "Floyd Cycle", bio: "Two pointers, different speeds.", countryCode: "US", reputation: 3600, arenaRating: 1672, strengths: ["two-pointers", "arrays"] },
  { handle: "huffman-code", displayName: "Huffman Code", bio: "Redundancy is structure you have not named.", countryCode: "US", reputation: 3200, arenaRating: 1640, strengths: ["greedy", "strings"] },
  { handle: "rabin-hash", displayName: "Rabin Hash", bio: "Rolling windows, and the collisions you accept.", countryCode: "IL", reputation: 2900, arenaRating: 1610, strengths: ["hashing", "strings"] },
  { handle: "kruskal-edge", displayName: "Kruskal Edge", bio: "Sort the edges and trust the union-find.", countryCode: "US", reputation: 2650, arenaRating: 1588, strengths: ["mst", "dsu"] },
  { handle: "bellman-relax", displayName: "Bellman Relax", bio: "Negative weights are a feature, not a bug.", countryCode: "US", reputation: 2400, arenaRating: 1560, strengths: ["graphs"] },
  { handle: "manacher-pal", displayName: "Manacher Pal", bio: "Every palindrome, in linear time.", countryCode: "FR", reputation: 2100, arenaRating: 1530, strengths: ["strings", "palindromes"] },
  { handle: "mo-algorithm", displayName: "Mo Algorithm", bio: "Reorder the queries and the answers get cheap.", countryCode: "IN", reputation: 1850, arenaRating: 1505, strengths: ["data-structures", "sorting"] },
  { handle: "sieve-atkin", displayName: "Sieve Atkin", bio: "Primes, found by elimination.", countryCode: "DE", reputation: 1600, arenaRating: 1478, strengths: ["number-theory", "math"] },
  { handle: "trie-prefix", displayName: "Trie Prefix", bio: "Shared beginnings, stored once.", countryCode: "JP", reputation: 1350, arenaRating: 1450, strengths: ["strings", "data-structures"] },
  { handle: "deque-window", displayName: "Deque Window", bio: "Discard what can never win again.", countryCode: "KR", reputation: 1100, arenaRating: 1420, strengths: ["sliding-window", "deque"] },
  { handle: "bitset-mask", displayName: "Bitset Mask", bio: "Sixty-four answers per word.", countryCode: "PL", reputation: 850, arenaRating: 1390, strengths: ["bitmask", "dp"] },
  { handle: "segment-lazy", displayName: "Segment Lazy", bio: "Push the update down only when asked.", countryCode: "BR", reputation: 600, arenaRating: 1350, strengths: ["segment-tree", "data-structures"] },
  { handle: "heap-sift", displayName: "Heap Sift", bio: "Only the extreme you need.", countryCode: "NG", reputation: 380, arenaRating: 1300, strengths: ["heaps"] },
  { handle: "linear-probe", displayName: "Linear Probe", bio: "Newly arrived. Reading the charter first.", countryCode: "SG", reputation: 150, arenaRating: 1240, strengths: ["hashing", "implementation"] },
];

export type SeedNation = {
  slug: string;
  name: string;
  founderHandle: string;
  doctrine: string;
  accent: string;
  tier: number;
  prestige: number;
  countryCode: string;
};

/** Founded by the seeded citizens who cleared 2,500 reputation. */
export const NATIONS: SeedNation[] = [
  { slug: "invariant", name: "Invariant", founderHandle: "ada-nullptr", doctrine: "Prove it before you ship it.", accent: "flux", tier: 5, prestige: 14200, countryCode: "GB" },
  { slug: "the-compiler-states", name: "The Compiler States", founderHandle: "grace-shiftleft", doctrine: "Every abstraction pays rent.", accent: "ion", tier: 4, prestige: 11800, countryCode: "US" },
  { slug: "partition", name: "Partition", founderHandle: "hoare-partition", doctrine: "Split the problem, not the team.", accent: "plasma", tier: 4, prestige: 9600, countryCode: "GB" },
  { slug: "relaxation", name: "Relaxation", founderHandle: "dijkstra-relax", doctrine: "Shortest path, not fastest guess.", accent: "signal", tier: 3, prestige: 7400, countryCode: "NL" },
  { slug: "literate", name: "Literate", founderHandle: "knuth-omega", doctrine: "Programs are written for people to read.", accent: "amber", tier: 3, prestige: 6200, countryCode: "US" },
  { slug: "prefix-union", name: "Prefix Union", founderHandle: "fenwick-tree", doctrine: "Aggregate once, answer forever.", accent: "flux", tier: 3, prestige: 4900, countryCode: "AU" },
  { slug: "running-best", name: "Running Best", founderHandle: "kadane-max", doctrine: "Keep only what improves the answer.", accent: "ion", tier: 2, prestige: 3600, countryCode: "IN" },
  { slug: "strong-component", name: "Strong Component", founderHandle: "tarjan-scc", doctrine: "Mutual reachability is the only real bond.", accent: "plasma", tier: 2, prestige: 2800, countryCode: "CA" },
];
