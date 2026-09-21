import type { SeedProblem } from "./types";

export const EASY_PROBLEMS: SeedProblem[] = [
  {
    slug: "sum-of-a-line",
    title: "Sum of a Line",
    difficulty: "easy",
    topics: ["math", "implementation"],
    statement:
      "You are given `n` integers on a single line.\n\nPrint their sum.",
    constraints: "- `1 <= n <= 100000`\n- `-10^9 <= a_i <= 10^9`",
    reference: "import sys\nd=sys.stdin.read().split()\nprint(sum(map(int,d)))",
    testcases: [
      { input: "1 2 3", expected: "6", isSample: true },
      { input: "-5 5", expected: "0", isSample: true },
      { input: "42", expected: "42", isSample: false },
      { input: "1000000000 1000000000 1000000000", expected: "3000000000", isSample: false },
      { input: "-1 -2 -3 -4 -5", expected: "-15", isSample: false },
    ],
  },
  {
    slug: "reverse-the-words",
    title: "Reverse the Words",
    difficulty: "easy",
    topics: ["strings", "implementation"],
    statement:
      "Given a line of whitespace-separated words, print them in reverse order, separated by single spaces.",
    constraints: "- The line contains at most `10^5` characters.\n- Words contain no whitespace.",
    reference: "import sys\nprint(' '.join(sys.stdin.read().split()[::-1]))",
    testcases: [
      { input: "the quick brown fox", expected: "fox brown quick the", isSample: true },
      { input: "one", expected: "one", isSample: true },
      { input: "a b c d e", expected: "e d c b a", isSample: false },
      { input: "ship code found a nation", expected: "nation a found code ship", isSample: false },
    ],
  },
  {
    slug: "count-vowels",
    title: "Count Vowels",
    difficulty: "easy",
    topics: ["strings"],
    statement:
      "Given a lowercase string `s`, print how many of its characters are vowels (`a`, `e`, `i`, `o`, `u`).",
    constraints: "- `1 <= |s| <= 10^5`\n- `s` contains only lowercase letters.",
    reference: "import sys\ns=sys.stdin.read().strip()\nprint(sum(1 for c in s if c in 'aeiou'))",
    testcases: [
      { input: "codenation", expected: "5", isSample: true },
      { input: "rhythm", expected: "0", isSample: true },
      { input: "aeiou", expected: "5", isSample: false },
      { input: "supabase", expected: "4", isSample: false },
    ],
  },
  {
    slug: "fizz-ladder",
    title: "Fizz Ladder",
    difficulty: "easy",
    topics: ["implementation", "math"],
    statement:
      "Given `n`, print the integers from `1` to `n`, one per line, replacing multiples of 3 with `Fizz`, multiples of 5 with `Buzz`, and multiples of both with `FizzBuzz`.",
    constraints: "- `1 <= n <= 10^5`",
    reference:
      "import sys\nn=int(sys.stdin.read())\nout=[]\nfor i in range(1,n+1):\n    s=''\n    if i%3==0: s+='Fizz'\n    if i%5==0: s+='Buzz'\n    out.append(s or str(i))\nprint('\\n'.join(out))",
    testcases: [
      { input: "5", expected: "1\n2\nFizz\n4\nBuzz", isSample: true },
      { input: "15", expected: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz", isSample: true },
      { input: "1", expected: "1", isSample: false },
      { input: "3", expected: "1\n2\nFizz", isSample: false },
    ],
  },
  {
    slug: "second-largest",
    title: "Second Largest",
    difficulty: "easy",
    topics: ["arrays", "implementation"],
    statement:
      "Given `n` integers, print the second largest **distinct** value.\n\nIf fewer than two distinct values exist, print `NONE`.",
    constraints: "- `1 <= n <= 2*10^5`\n- `-10^9 <= a_i <= 10^9`",
    reference:
      "import sys\nd=sorted(set(map(int,sys.stdin.read().split())),reverse=True)\nprint(d[1] if len(d)>1 else 'NONE')",
    testcases: [
      { input: "4 1 7 3", expected: "4", isSample: true },
      { input: "5 5 5", expected: "NONE", isSample: true },
      { input: "9", expected: "NONE", isSample: false },
      { input: "-1 -2 -3", expected: "-2", isSample: false },
      { input: "10 10 9 8", expected: "9", isSample: false },
    ],
  },
  {
    slug: "palindrome-check",
    title: "Palindrome Check",
    difficulty: "easy",
    topics: ["strings", "two-pointers"],
    statement:
      "Given a string `s`, print `YES` if it reads the same forwards and backwards, otherwise `NO`.",
    constraints: "- `1 <= |s| <= 10^5`\n- `s` contains only lowercase letters.",
    reference: "import sys\ns=sys.stdin.read().strip()\nprint('YES' if s==s[::-1] else 'NO')",
    testcases: [
      { input: "racecar", expected: "YES", isSample: true },
      { input: "codenation", expected: "NO", isSample: true },
      { input: "a", expected: "YES", isSample: false },
      { input: "abba", expected: "YES", isSample: false },
    ],
  },
  {
    slug: "running-maximum",
    title: "Running Maximum",
    difficulty: "easy",
    topics: ["arrays", "prefix-sums"],
    statement:
      "Given `n` integers, print the running maximum after each element, separated by single spaces.",
    constraints: "- `1 <= n <= 2*10^5`\n- `-10^9 <= a_i <= 10^9`",
    reference:
      "import sys\nd=list(map(int,sys.stdin.read().split()))\nout=[];m=-10**18\nfor x in d:\n    m=max(m,x);out.append(str(m))\nprint(' '.join(out))",
    testcases: [
      { input: "1 3 2 5 4", expected: "1 3 3 5 5", isSample: true },
      { input: "5 4 3", expected: "5 5 5", isSample: true },
      { input: "-3 -1 -7", expected: "-3 -1 -1", isSample: false },
      { input: "7", expected: "7", isSample: false },
    ],
  },
  {
    slug: "digit-sum-chain",
    title: "Digit Sum Chain",
    difficulty: "easy",
    topics: ["math", "implementation"],
    statement:
      "Given a non-negative integer `n`, repeatedly replace it with the sum of its digits until a single digit remains. Print that digit.",
    constraints: "- `0 <= n <= 10^18`",
    reference:
      "import sys\nn=sys.stdin.read().strip()\nwhile len(n)>1:\n    n=str(sum(int(c) for c in n))\nprint(n)",
    testcases: [
      { input: "38", expected: "2", isSample: true },
      { input: "0", expected: "0", isSample: true },
      { input: "999999999", expected: "9", isSample: false },
      { input: "12345", expected: "6", isSample: false },
    ],
  },
  {
    slug: "unique-letters",
    title: "Unique Letters",
    difficulty: "easy",
    topics: ["strings", "hashing"],
    statement:
      "Given a lowercase string `s`, print the number of distinct characters it contains.",
    constraints: "- `1 <= |s| <= 10^5`",
    reference: "import sys\nprint(len(set(sys.stdin.read().strip())))",
    testcases: [
      { input: "abracadabra", expected: "5", isSample: true },
      { input: "aaaa", expected: "1", isSample: true },
      { input: "codenation", expected: "8", isSample: false },
      { input: "abcdefghijklmnopqrstuvwxyz", expected: "26", isSample: false },
    ],
  },
  {
    slug: "temperature-swing",
    title: "Temperature Swing",
    difficulty: "easy",
    topics: ["arrays", "implementation"],
    statement:
      "Given `n` integers representing daily readings, print the largest absolute difference between any two consecutive readings.\n\nIf `n` is 1, print `0`.",
    constraints: "- `1 <= n <= 2*10^5`\n- `-10^9 <= a_i <= 10^9`",
    reference:
      "import sys\nd=list(map(int,sys.stdin.read().split()))\nprint(max((abs(d[i]-d[i-1]) for i in range(1,len(d))),default=0))",
    testcases: [
      { input: "1 5 2 9", expected: "7", isSample: true },
      { input: "4", expected: "0", isSample: true },
      { input: "-10 10", expected: "20", isSample: false },
      { input: "3 3 3 3", expected: "0", isSample: false },
    ],
  },
];
