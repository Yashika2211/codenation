import type { SeedProblem } from "./types";

export const MEDIUM_PROBLEMS: SeedProblem[] = [
  {
    slug: "two-sum-indices",
    title: "Two Sum Indices",
    difficulty: "medium",
    topics: ["hashing", "arrays"],
    statement:
      "The first line contains `n` and `target`. The second line contains `n` integers.\n\nPrint the 1-based indices `i j` (`i < j`) of the first pair, in order of `j`, whose values sum to `target`. Print `-1` if no pair exists.",
    constraints: "- `2 <= n <= 2*10^5`\n- `-10^9 <= a_i, target <= 10^9`",
    reference:
      "import sys\nd=sys.stdin.read().split()\nn=int(d[0]);t=int(d[1])\na=list(map(int,d[2:2+n]))\nseen={}\nfor j,x in enumerate(a):\n    if t-x in seen:\n        print(seen[t-x]+1,j+1);sys.exit()\n    if x not in seen: seen[x]=j\nprint(-1)",
    testcases: [
      { input: "4 9\n2 7 11 15", expected: "1 2", isSample: true },
      { input: "3 100\n1 2 3", expected: "-1", isSample: true },
      { input: "5 0\n-3 1 3 2 -1", expected: "1 3", isSample: false },
      { input: "2 4\n2 2", expected: "1 2", isSample: false },
      { input: "6 10\n5 1 9 5 2 8", expected: "2 3", isSample: false },
    ],
  },
  {
    slug: "longest-unique-window",
    title: "Longest Unique Window",
    difficulty: "medium",
    topics: ["strings", "two-pointers", "sliding-window"],
    statement:
      "Given a string `s`, print the length of its longest contiguous substring containing no repeated character.",
    constraints: "- `1 <= |s| <= 2*10^5`\n- `s` contains lowercase letters only.",
    reference:
      "import sys\ns=sys.stdin.read().strip()\nlast={};best=0;start=0\nfor i,c in enumerate(s):\n    if c in last and last[c]>=start: start=last[c]+1\n    last[c]=i;best=max(best,i-start+1)\nprint(best)",
    testcases: [
      { input: "abcabcbb", expected: "3", isSample: true },
      { input: "bbbbb", expected: "1", isSample: true },
      { input: "pwwkew", expected: "3", isSample: false },
      { input: "codenation", expected: "8", isSample: false },
      { input: "abcdefg", expected: "7", isSample: false },
    ],
  },
  {
    slug: "binary-search-floor",
    title: "Binary Search Floor",
    difficulty: "medium",
    topics: ["binary-search", "arrays"],
    statement:
      "The first line contains `n` and `q`. The second line contains `n` integers in non-decreasing order. The third line contains `q` queries.\n\nFor each query `x`, print the largest array value that is `<= x`, or `NONE` if there is none. Print one answer per line.",
    constraints: "- `1 <= n, q <= 2*10^5`\n- `-10^9 <= a_i, x <= 10^9`",
    reference:
      "import sys,bisect\nd=sys.stdin.read().split()\nn=int(d[0]);q=int(d[1])\na=list(map(int,d[2:2+n]))\nqs=list(map(int,d[2+n:2+n+q]))\nout=[]\nfor x in qs:\n    i=bisect.bisect_right(a,x)\n    out.append(str(a[i-1]) if i>0 else 'NONE')\nprint('\\n'.join(out))",
    testcases: [
      { input: "5 3\n1 3 5 7 9\n4 9 0", expected: "3\n9\nNONE", isSample: true },
      { input: "3 2\n2 4 6\n5 1", expected: "4\nNONE", isSample: true },
      { input: "4 1\n-5 -3 -1 0\n-2", expected: "-3", isSample: false },
      { input: "1 2\n10\n10 11", expected: "10\n10", isSample: false },
    ],
  },
  {
    slug: "island-count",
    title: "Island Count",
    difficulty: "medium",
    topics: ["graphs", "bfs", "grids"],
    statement:
      "The first line contains `r` and `c`. The next `r` lines each contain a string of `c` characters, `#` for land and `.` for water.\n\nPrint the number of connected land regions, using 4-directional adjacency.",
    constraints: "- `1 <= r, c <= 500`",
    reference:
      "import sys\nfrom collections import deque\nd=sys.stdin.read().split()\nr=int(d[0]);c=int(d[1])\ng=[list(row) for row in d[2:2+r]]\nseen=[[False]*c for _ in range(r)]\ncount=0\nfor i in range(r):\n    for j in range(c):\n        if g[i][j]=='#' and not seen[i][j]:\n            count+=1;q=deque([(i,j)]);seen[i][j]=True\n            while q:\n                y,x=q.popleft()\n                for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):\n                    ny,nx=y+dy,x+dx\n                    if 0<=ny<r and 0<=nx<c and g[ny][nx]=='#' and not seen[ny][nx]:\n                        seen[ny][nx]=True;q.append((ny,nx))\nprint(count)",
    testcases: [
      { input: "3 3\n#.#\n...\n#.#", expected: "4", isSample: true },
      { input: "2 2\n##\n##", expected: "1", isSample: true },
      { input: "3 4\n....\n....\n....", expected: "0", isSample: false },
      { input: "4 4\n#..#\n.##.\n.##.\n#..#", expected: "5", isSample: false },
    ],
  },
  {
    slug: "coin-change-min",
    title: "Minimum Coins",
    difficulty: "medium",
    topics: ["dp", "greedy"],
    statement:
      "The first line contains `n` and `amount`. The second line contains `n` distinct coin denominations.\n\nPrint the fewest coins that sum to exactly `amount`, or `-1` if it cannot be done. Each denomination may be used any number of times.",
    constraints: "- `1 <= n <= 50`\n- `1 <= amount <= 20000`\n- `1 <= coin <= 20000`",
    reference:
      "import sys\nd=sys.stdin.read().split()\nn=int(d[0]);amt=int(d[1])\ncoins=list(map(int,d[2:2+n]))\nINF=float('inf')\ndp=[0]+[INF]*amt\nfor i in range(1,amt+1):\n    for c in coins:\n        if c<=i and dp[i-c]+1<dp[i]: dp[i]=dp[i-c]+1\nprint(dp[amt] if dp[amt]!=INF else -1)",
    testcases: [
      { input: "3 11\n1 2 5", expected: "3", isSample: true },
      { input: "1 3\n2", expected: "-1", isSample: true },
      { input: "4 27\n1 5 10 25", expected: "3", isSample: false },
      { input: "2 6\n3 4", expected: "2", isSample: false },
      { input: "3 100\n1 7 13", expected: "10", isSample: false },
    ],
  },
  {
    slug: "anagram-groups",
    title: "Anagram Groups",
    difficulty: "medium",
    topics: ["hashing", "strings", "sorting"],
    statement:
      "The first line contains `n`. The next `n` lines each contain one lowercase word.\n\nPrint the number of groups when words are grouped by being anagrams of one another.",
    constraints: "- `1 <= n <= 10^5`\n- Total length of all words `<= 10^6`",
    reference:
      "import sys\nd=sys.stdin.read().split()\nn=int(d[0])\nwords=d[1:1+n]\nprint(len({''.join(sorted(w)) for w in words}))",
    testcases: [
      { input: "4\neat\ntea\ntan\nnat", expected: "2", isSample: true },
      { input: "3\nabc\ndef\nghi", expected: "3", isSample: true },
      { input: "1\nsolo", expected: "1", isSample: false },
      { input: "5\nlisten\nsilent\nenlist\ngoogle\ngogole", expected: "2", isSample: false },
    ],
  },
  {
    slug: "kth-smallest-pair-sum",
    title: "Kth Smallest Pair Sum",
    difficulty: "medium",
    topics: ["heaps", "sorting", "arrays"],
    statement:
      "The first line contains `n` and `k`. The second line contains `n` integers.\n\nConsider every unordered pair of distinct indices and its sum. Print the `k`-th smallest such sum (1-indexed).",
    constraints: "- `2 <= n <= 1000`\n- `1 <= k <= n*(n-1)/2`\n- `-10^6 <= a_i <= 10^6`",
    reference:
      "import sys\nd=sys.stdin.read().split()\nn=int(d[0]);k=int(d[1])\na=sorted(map(int,d[2:2+n]))\nsums=[]\nfor i in range(n):\n    for j in range(i+1,n):\n        sums.append(a[i]+a[j])\nsums.sort()\nprint(sums[k-1])",
    testcases: [
      { input: "4 3\n1 2 3 4", expected: "5", isSample: true },
      { input: "3 1\n5 1 3", expected: "4", isSample: true },
      { input: "4 6\n1 2 3 4", expected: "7", isSample: false },
      { input: "5 5\n-2 0 3 1 4", expected: "2", isSample: false },
    ],
  },
  {
    slug: "matrix-spiral",
    title: "Matrix Spiral",
    difficulty: "medium",
    topics: ["implementation", "grids"],
    statement:
      "The first line contains `r` and `c`. The next `r` lines each contain `c` integers.\n\nPrint the matrix read in clockwise spiral order starting at the top-left, separated by single spaces.",
    constraints: "- `1 <= r, c <= 500`\n- `-10^9 <= a_ij <= 10^9`",
    reference:
      "import sys\nd=list(map(int,sys.stdin.read().split()))\nr,c=d[0],d[1]\nm=[d[2+i*c:2+(i+1)*c] for i in range(r)]\nout=[];top,bot,left,right=0,r-1,0,c-1\nwhile top<=bot and left<=right:\n    for j in range(left,right+1): out.append(m[top][j])\n    top+=1\n    for i in range(top,bot+1): out.append(m[i][right])\n    right-=1\n    if top<=bot:\n        for j in range(right,left-1,-1): out.append(m[bot][j])\n        bot-=1\n    if left<=right:\n        for i in range(bot,top-1,-1): out.append(m[i][left])\n        left+=1\nprint(' '.join(map(str,out)))",
    testcases: [
      { input: "3 3\n1 2 3\n4 5 6\n7 8 9", expected: "1 2 3 6 9 8 7 4 5", isSample: true },
      { input: "1 4\n1 2 3 4", expected: "1 2 3 4", isSample: true },
      { input: "4 1\n1\n2\n3\n4", expected: "1 2 3 4", isSample: false },
      { input: "2 3\n1 2 3\n4 5 6", expected: "1 2 3 6 5 4", isSample: false },
    ],
  },
  {
    slug: "topological-order-count",
    title: "Valid Build Order",
    difficulty: "medium",
    topics: ["graphs", "topological-sort"],
    statement:
      "The first line contains `n` and `m`: the number of modules and dependency edges. Each of the next `m` lines contains `a b`, meaning module `a` must be built before module `b`.\n\nPrint `YES` if a valid build order exists, otherwise `NO`.",
    constraints: "- `1 <= n <= 2*10^5`\n- `0 <= m <= 2*10^5`\n- Modules are numbered `1..n`.",
    reference:
      "import sys\nfrom collections import deque\nd=sys.stdin.read().split()\nn=int(d[0]);m=int(d[1])\nadj=[[] for _ in range(n+1)];deg=[0]*(n+1)\nfor i in range(m):\n    a=int(d[2+2*i]);b=int(d[3+2*i])\n    adj[a].append(b);deg[b]+=1\nq=deque(i for i in range(1,n+1) if deg[i]==0)\nseen=0\nwhile q:\n    u=q.popleft();seen+=1\n    for v in adj[u]:\n        deg[v]-=1\n        if deg[v]==0: q.append(v)\nprint('YES' if seen==n else 'NO')",
    testcases: [
      { input: "3 2\n1 2\n2 3", expected: "YES", isSample: true },
      { input: "2 2\n1 2\n2 1", expected: "NO", isSample: true },
      { input: "4 0", expected: "YES", isSample: false },
      { input: "3 3\n1 2\n2 3\n3 1", expected: "NO", isSample: false },
    ],
  },
  {
    slug: "range-sum-queries",
    title: "Range Sum Queries",
    difficulty: "medium",
    topics: ["prefix-sums", "arrays"],
    statement:
      "The first line contains `n` and `q`. The second line contains `n` integers. Each of the next `q` lines contains `l r` (1-indexed, inclusive).\n\nPrint the sum of each range, one per line.",
    constraints: "- `1 <= n, q <= 2*10^5`\n- `-10^9 <= a_i <= 10^9`\n- `1 <= l <= r <= n`",
    reference:
      "import sys\nd=sys.stdin.read().split()\nn=int(d[0]);q=int(d[1])\na=list(map(int,d[2:2+n]))\npre=[0]*(n+1)\nfor i,x in enumerate(a): pre[i+1]=pre[i]+x\nout=[]\nfor i in range(q):\n    l=int(d[2+n+2*i]);r=int(d[3+n+2*i])\n    out.append(str(pre[r]-pre[l-1]))\nprint('\\n'.join(out))",
    testcases: [
      { input: "5 2\n1 2 3 4 5\n1 3\n2 5", expected: "6\n14", isSample: true },
      { input: "3 1\n-1 -2 -3\n1 3", expected: "-6", isSample: true },
      { input: "4 3\n10 20 30 40\n1 1\n4 4\n1 4", expected: "10\n40\n100", isSample: false },
    ],
  },
];
