import type { SeedTechNode } from "./types";

/**
 * Sixty nodes across five branches, four tiers deep.
 *
 * Research advances by *solving in the node's topics*, not by waiting on a
 * timer — `topics` is what links the tech tree back to the Arena, and
 * `solvesRequired` rises with tier.
 */

type Row = [slug: string, name: string, description: string, topics: string[]];

const BRANCHES: Array<{ branch: string; rows: Row[][] }> = [
  {
    branch: "algorithms",
    rows: [
      [
        ["linear-scan", "Linear Scan", "The first primitive: walk a sequence once and keep what matters.", ["arrays", "implementation"]],
        ["two-pointers", "Two Pointers", "Two indices walking a sequence turn many quadratic scans linear.", ["two-pointers", "arrays"]],
        ["sorting-foundations", "Sorting Foundations", "Order is the cheapest structure you can impose on data.", ["sorting", "arrays"]],
      ],
      [
        ["binary-search", "Binary Search", "Halve the space each step. The discipline is in the invariant.", ["binary-search"]],
        ["sliding-window", "Sliding Window", "Amortise a range query by moving its edges instead of rebuilding it.", ["sliding-window", "strings"]],
        ["greedy-exchange", "Greedy Exchange", "Prove a local choice is safe and the global one follows.", ["greedy", "intervals"]],
      ],
      [
        ["dynamic-programming", "Dynamic Programming", "Overlapping subproblems, solved once and remembered.", ["dp"]],
        ["knapsack-theory", "Knapsack Theory", "Bounded choice under a capacity constraint.", ["dp", "knapsack"]],
        ["divide-conquer", "Divide and Conquer", "Split, solve, merge — and account honestly for the merge.", ["sorting", "merge-sort"]],
      ],
      [
        ["bitmask-states", "Bitmask States", "When the state space is small, enumerate it exactly.", ["bitmask", "dp"]],
        ["digit-dp", "Digit DP", "Count over the decimal expansion rather than the value.", ["digit-dp", "dp"]],
        ["amortised-analysis", "Amortised Analysis", "Charge the expensive step to the cheap ones that earned it.", ["data-structures"]],
      ],
    ],
  },
  {
    branch: "graphs",
    rows: [
      [
        ["adjacency", "Adjacency", "A graph is a promise about which things touch.", ["graphs"]],
        ["breadth-first", "Breadth First", "Layer by layer. The first time you arrive is the shortest way.", ["bfs", "graphs"]],
        ["grid-traversal", "Grid Traversal", "Every grid is a graph wearing a costume.", ["grids", "bfs"]],
      ],
      [
        ["topological-order", "Topological Order", "A dependency graph either sorts or admits a cycle.", ["topological-sort", "graphs"]],
        ["disjoint-sets", "Disjoint Sets", "Union by size, path compression, near-constant answers.", ["dsu", "graphs"]],
        ["shortest-paths", "Shortest Paths", "Relax edges in the right order and the distances settle.", ["dijkstra", "graphs"]],
      ],
      [
        ["spanning-networks", "Spanning Networks", "The cheapest way to make everything reachable.", ["mst", "dsu"]],
        ["tree-ancestry", "Tree Ancestry", "Binary lifting turns ancestor queries logarithmic.", ["trees", "lca"]],
        ["flow-networks", "Flow Networks", "Capacity, augmenting paths, and the min-cut that bounds them.", ["max-flow", "graphs"]],
      ],
      [
        ["matching-theory", "Matching Theory", "Pair things optimally when both sides have preferences.", ["graphs", "max-flow"]],
        ["strong-components", "Strong Components", "Collapse mutual reachability and the graph becomes acyclic.", ["graphs"]],
        ["planarity", "Planarity", "Some networks can be drawn without a crossing. Most cannot.", ["graphs", "geometry"]],
      ],
    ],
  },
  {
    branch: "data",
    rows: [
      [
        ["hash-tables", "Hash Tables", "Trade memory for time and stop scanning.", ["hashing"]],
        ["prefix-aggregates", "Prefix Aggregates", "Precompute once, answer every range in constant time.", ["prefix-sums", "arrays"]],
        ["stacks-queues", "Stacks and Queues", "Order of arrival is itself a data structure.", ["deque", "implementation"]],
      ],
      [
        ["heaps", "Heaps", "Keep only the extreme you need, not the order you do not.", ["heaps"]],
        ["monotonic-structures", "Monotonic Structures", "Discard what can never win again.", ["deque", "sliding-window"]],
        ["balanced-trees", "Balanced Trees", "Ordered access that survives insertion.", ["data-structures"]],
      ],
      [
        ["segment-trees", "Segment Trees", "Range query and point update in the same logarithm.", ["segment-tree", "data-structures"]],
        ["fenwick-trees", "Fenwick Trees", "The same idea, half the memory, twice the subtlety.", ["data-structures", "prefix-sums"]],
        ["persistence", "Persistence", "Keep every version without paying for every copy.", ["data-structures"]],
      ],
      [
        ["succinct-structures", "Succinct Structures", "Information-theoretic space with usable access.", ["data-structures"]],
        ["sketching", "Sketching", "Answer approximately, in far less room than exactly.", ["hashing", "math"]],
        ["cache-obliviousness", "Cache Obliviousness", "Locality you get without naming the cache.", ["data-structures"]],
      ],
    ],
  },
  {
    branch: "strings",
    rows: [
      [
        ["character-counting", "Character Counting", "Frequency is the first thing a string tells you.", ["strings", "hashing"]],
        ["palindromes", "Palindromes", "Symmetry you can check from both ends inward.", ["strings", "two-pointers"]],
        ["tokenising", "Tokenising", "Split before you parse. Everything downstream depends on it.", ["strings", "implementation"]],
      ],
      [
        ["prefix-functions", "Prefix Functions", "The failure table that makes matching linear.", ["kmp", "strings"]],
        ["rolling-hashes", "Rolling Hashes", "A window's hash, updated rather than recomputed.", ["hashing", "strings"]],
        ["anagram-classes", "Anagram Classes", "Canonical forms turn equality into a lookup.", ["strings", "sorting"]],
      ],
      [
        ["suffix-structures", "Suffix Structures", "Every suffix, organised, answers most string questions.", ["strings", "data-structures"]],
        ["edit-distances", "Edit Distances", "How far apart two strings are, in operations.", ["dp", "strings"]],
        ["automata", "Automata", "Matching as a state machine you can run once.", ["strings", "kmp"]],
      ],
      [
        ["compression", "Compression", "Redundancy is structure you have not named yet.", ["strings", "math"]],
        ["aho-corasick", "Multi-pattern Matching", "Many needles, one pass through the haystack.", ["strings", "kmp"]],
        ["regex-engines", "Regex Engines", "Backtracking is a choice, not a requirement.", ["strings", "automata"]],
      ],
    ],
  },
  {
    branch: "systems",
    rows: [
      [
        ["io-discipline", "IO Discipline", "Reading input badly is the most common way to time out.", ["implementation"]],
        ["numeric-limits", "Numeric Limits", "Overflow is not an edge case. It is a certainty.", ["math", "implementation"]],
        ["complexity-budget", "Complexity Budget", "Know what fits in a second before you write it.", ["math"]],
      ],
      [
        ["modular-arithmetic", "Modular Arithmetic", "Arithmetic that stays inside the machine.", ["math", "number-theory"]],
        ["fast-exponentiation", "Fast Exponentiation", "Square and multiply. Logarithms everywhere.", ["math", "number-theory"]],
        ["randomisation", "Randomisation", "Expected time is a real guarantee if you state it.", ["math"]],
      ],
      [
        ["matrix-methods", "Matrix Methods", "Linear recurrences become exponentiation.", ["matrix-exponentiation", "math"]],
        ["computational-geometry", "Computational Geometry", "Orientation tests, and the precision they demand.", ["geometry"]],
        ["number-theory", "Number Theory", "Primes, inverses, and the structures they generate.", ["number-theory", "math"]],
      ],
      [
        ["parallel-decomposition", "Parallel Decomposition", "Independent work, found and kept independent.", ["implementation"]],
        ["profiling", "Profiling", "Measure before you optimise. Then measure again.", ["implementation"]],
        ["forge-metallurgy", "Forge Metallurgy", "The material science behind a crafted emissive palette.", ["math", "geometry"]],
      ],
    ],
  },
];

const TIER_COST = [
  { compute: 400, data: 80 },
  { compute: 1200, data: 260 },
  { compute: 3200, data: 700, alloy: 20 },
  { compute: 8000, data: 1800, alloy: 90 },
];

const TIER_SOLVES = [3, 6, 10, 16];

export const TECH_NODES: SeedTechNode[] = BRANCHES.flatMap(({ branch, rows }) =>
  rows.flatMap((tierRows, tierIndex) =>
    tierRows.map((row, index) => {
      const [slug, name, description, topics] = row;
      // Each node requires one node from the tier below, keeping the tree a
      // readable lattice rather than a hairball.
      const previous = rows[tierIndex - 1];
      const requires = previous
        ? [(previous[Math.min(index, previous.length - 1)] as Row)[0]]
        : [];

      return {
        slug,
        name,
        tier: tierIndex + 1,
        branch,
        description,
        cost: TIER_COST[tierIndex] ?? TIER_COST[0]!,
        requires,
        topics,
        solvesRequired: TIER_SOLVES[tierIndex] ?? 3,
        // Laid out on a 0–100 grid; the tree renders these absolutely.
        posX: 14 + index * 34,
        posY: 12 + tierIndex * 26,
      } satisfies SeedTechNode;
    }),
  ),
);
