import type { SeedProblem } from "./types";

export const HARD_PROBLEMS: SeedProblem[] = [
  {
    slug: "shortest-path-grid",
    title: "Shortest Path in a Grid",
    difficulty: "hard",
    topics: ["graphs", "bfs", "grids"],
    statement:
      "The first line contains `r` and `c`. The next `r` lines give the grid: `.` is open, `#` is a wall, `S` is the start and `E` is the exit.\n\nPrint the fewest 4-directional steps from `S` to `E`, or `-1` if the exit is unreachable.",
    constraints: "- `1 <= r, c <= 1000`\n- Exactly one `S` and one `E`.",
    timeLimitMs: 3000,
    reference:
      "import sys\nfrom collections import deque\nd=sys.stdin.read().split()\nr=int(d[0]);c=int(d[1])\ng=d[2:2+r]\nfor i in range(r):\n    for j in range(c):\n        if g[i][j]=='S': s=(i,j)\n        if g[i][j]=='E': e=(i,j)\ndist=[[-1]*c for _ in range(r)]\nq=deque([s]);dist[s[0]][s[1]]=0\nwhile q:\n    y,x=q.popleft()\n    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):\n        ny,nx=y+dy,x+dx\n        if 0<=ny<r and 0<=nx<c and g[ny][nx]!='#' and dist[ny][nx]<0:\n            dist[ny][nx]=dist[y][x]+1;q.append((ny,nx))\nprint(dist[e[0]][e[1]])",
    testcases: [
      { input: "3 3\nS..\n.#.\n..E", expected: "4", isSample: true },
      { input: "3 3\nS#E\n###\n...", expected: "-1", isSample: true },
      { input: "1 5\nS...E", expected: "4", isSample: false },
      { input: "4 4\nS...\n###.\n....\n...E", expected: "6", isSample: false },
      { input: "2 2\nSE\n..", expected: "1", isSample: false },
    ],
  },
  {
    slug: "longest-increasing-subsequence",
    title: "Longest Increasing Subsequence",
    difficulty: "hard",
    topics: ["dp", "binary-search"],
    statement:
      "Given `n` integers, print the length of the longest strictly increasing subsequence.",
    constraints: "- `1 <= n <= 2*10^5`\n- `-10^9 <= a_i <= 10^9`",
    timeLimitMs: 3000,
    reference:
      "import sys,bisect\nd=list(map(int,sys.stdin.read().split()))\ntails=[]\nfor x in d:\n    i=bisect.bisect_left(tails,x)\n    if i==len(tails): tails.append(x)\n    else: tails[i]=x\nprint(len(tails))",
    testcases: [
      { input: "10 9 2 5 3 7 101 18", expected: "4", isSample: true },
      { input: "7 7 7 7", expected: "1", isSample: true },
      { input: "1 2 3 4 5", expected: "5", isSample: false },
      { input: "5 4 3 2 1", expected: "1", isSample: false },
      { input: "3 1 4 1 5 9 2 6 5 3 5", expected: "4", isSample: false },
    ],
  },
  {
    slug: "dijkstra-toll-roads",
    title: "Toll Roads",
    difficulty: "hard",
    topics: ["graphs", "dijkstra", "heaps"],
    statement:
      "The first line contains `n` and `m`. Each of the next `m` lines contains `a b w`: a bidirectional road between junctions `a` and `b` costing `w`.\n\nPrint the minimum total cost from junction `1` to junction `n`, or `-1` if unreachable.",
    constraints: "- `1 <= n <= 10^5`\n- `0 <= m <= 2*10^5`\n- `1 <= w <= 10^9`",
    timeLimitMs: 3000,
    reference:
      "import sys,heapq\nd=sys.stdin.read().split()\nn=int(d[0]);m=int(d[1])\nadj=[[] for _ in range(n+1)]\nfor i in range(m):\n    a=int(d[2+3*i]);b=int(d[3+3*i]);w=int(d[4+3*i])\n    adj[a].append((b,w));adj[b].append((a,w))\nINF=float('inf')\ndist=[INF]*(n+1);dist[1]=0\npq=[(0,1)]\nwhile pq:\n    dcur,u=heapq.heappop(pq)\n    if dcur>dist[u]: continue\n    for v,w in adj[u]:\n        if dcur+w<dist[v]:\n            dist[v]=dcur+w;heapq.heappush(pq,(dist[v],v))\nprint(dist[n] if dist[n]!=INF else -1)",
    testcases: [
      { input: "4 4\n1 2 1\n2 4 5\n1 3 2\n3 4 2", expected: "4", isSample: true },
      { input: "3 1\n1 2 5", expected: "-1", isSample: true },
      { input: "1 0", expected: "0", isSample: false },
      { input: "5 6\n1 2 2\n2 3 2\n3 5 2\n1 4 10\n4 5 1\n2 5 100", expected: "6", isSample: false },
    ],
  },
  {
    slug: "edit-distance",
    title: "Edit Distance",
    difficulty: "hard",
    topics: ["dp", "strings"],
    statement:
      "Two lines each contain one lowercase word.\n\nPrint the minimum number of single-character insertions, deletions or substitutions that turn the first word into the second.",
    constraints: "- `1 <= |a|, |b| <= 2000`",
    timeLimitMs: 4000,
    reference:
      "import sys\na,b=sys.stdin.read().split()\nprev=list(range(len(b)+1))\nfor i in range(1,len(a)+1):\n    cur=[i]+[0]*len(b)\n    for j in range(1,len(b)+1):\n        cur[j]=prev[j-1] if a[i-1]==b[j-1] else 1+min(prev[j-1],prev[j],cur[j-1])\n    prev=cur\nprint(prev[len(b)])",
    testcases: [
      { input: "horse\nros", expected: "3", isSample: true },
      { input: "intention\nexecution", expected: "5", isSample: true },
      { input: "abc\nabc", expected: "0", isSample: false },
      { input: "a\nbbbb", expected: "4", isSample: false },
      { input: "codenation\ncoordination", expected: "3", isSample: false },
    ],
  },
  {
    slug: "union-find-clusters",
    title: "Network Clusters",
    difficulty: "hard",
    topics: ["dsu", "graphs"],
    statement:
      "The first line contains `n` and `m`. Each of the next `m` lines contains `a b`, a bidirectional link.\n\nPrint two numbers: the number of connected components, and the size of the largest one.",
    constraints: "- `1 <= n <= 2*10^5`\n- `0 <= m <= 2*10^5`",
    timeLimitMs: 3000,
    reference:
      "import sys\nsys.setrecursionlimit(300000)\nd=sys.stdin.read().split()\nn=int(d[0]);m=int(d[1])\np=list(range(n+1));sz=[1]*(n+1)\ndef find(x):\n    while p[x]!=x:\n        p[x]=p[p[x]];x=p[x]\n    return x\nfor i in range(m):\n    a=find(int(d[2+2*i]));b=find(int(d[3+2*i]))\n    if a!=b:\n        if sz[a]<sz[b]: a,b=b,a\n        p[b]=a;sz[a]+=sz[b]\nroots={find(i) for i in range(1,n+1)}\nprint(len(roots), max(sz[r] for r in roots))",
    testcases: [
      { input: "5 3\n1 2\n2 3\n4 5", expected: "2 3", isSample: true },
      { input: "4 0", expected: "4 1", isSample: true },
      { input: "6 5\n1 2\n2 3\n3 4\n4 5\n5 6", expected: "1 6", isSample: false },
      { input: "3 3\n1 2\n2 3\n1 3", expected: "1 3", isSample: false },
    ],
  },
  {
    slug: "max-subarray-circular",
    title: "Circular Maximum Subarray",
    difficulty: "hard",
    topics: ["dp", "arrays", "kadane"],
    statement:
      "Given `n` integers arranged in a circle, print the maximum sum of a non-empty contiguous subarray. The subarray may wrap around the end.",
    constraints: "- `1 <= n <= 2*10^5`\n- `-10^9 <= a_i <= 10^9`",
    timeLimitMs: 3000,
    reference:
      "import sys\na=list(map(int,sys.stdin.read().split()))\ndef kadane(v):\n    best=cur=v[0]\n    for x in v[1:]:\n        cur=max(x,cur+x);best=max(best,cur)\n    return best\nbest=kadane(a)\ntotal=sum(a)\nworst=kadane([-x for x in a])\nwrap=total+worst\nprint(best if best<0 else max(best,wrap))",
    testcases: [
      { input: "1 -2 3 -2", expected: "3", isSample: true },
      { input: "5 -3 5", expected: "10", isSample: true },
      { input: "-3 -2 -3", expected: "-2", isSample: false },
      { input: "3 -1 2 -1", expected: "4", isSample: false },
      { input: "-2 4 -5 4 -5 9 4", expected: "15", isSample: false },
    ],
  },
  {
    slug: "sliding-window-maximum",
    title: "Sliding Window Maximum",
    difficulty: "hard",
    topics: ["sliding-window", "deque", "arrays"],
    statement:
      "The first line contains `n` and `k`. The second line contains `n` integers.\n\nPrint the maximum of every window of `k` consecutive elements, separated by single spaces.",
    constraints: "- `1 <= k <= n <= 2*10^5`\n- `-10^9 <= a_i <= 10^9`",
    timeLimitMs: 3000,
    reference:
      "import sys\nfrom collections import deque\nd=sys.stdin.read().split()\nn=int(d[0]);k=int(d[1])\na=list(map(int,d[2:2+n]))\nq=deque();out=[]\nfor i,x in enumerate(a):\n    while q and a[q[-1]]<=x: q.pop()\n    q.append(i)\n    if q[0]<=i-k: q.popleft()\n    if i>=k-1: out.append(str(a[q[0]]))\nprint(' '.join(out))",
    testcases: [
      { input: "8 3\n1 3 -1 -3 5 3 6 7", expected: "3 3 5 5 6 7", isSample: true },
      { input: "4 1\n9 2 7 4", expected: "9 2 7 4", isSample: true },
      { input: "5 5\n1 2 3 4 5", expected: "5", isSample: false },
      { input: "6 2\n-1 -3 -5 -2 -8 -4", expected: "-1 -3 -2 -2 -4", isSample: false },
    ],
  },
  {
    slug: "knapsack-capacity",
    title: "Bounded Knapsack",
    difficulty: "hard",
    topics: ["dp", "knapsack"],
    statement:
      "The first line contains `n` and `W`. Each of the next `n` lines contains `w v`: an item's weight and value. Each item may be taken at most once.\n\nPrint the maximum total value with total weight at most `W`.",
    constraints: "- `1 <= n <= 200`\n- `1 <= W <= 20000`\n- `1 <= w, v <= 10^6`",
    timeLimitMs: 4000,
    reference:
      "import sys\nd=list(map(int,sys.stdin.read().split()))\nn,W=d[0],d[1]\ndp=[0]*(W+1)\nfor i in range(n):\n    w=d[2+2*i];v=d[3+2*i]\n    for cap in range(W,w-1,-1):\n        if dp[cap-w]+v>dp[cap]: dp[cap]=dp[cap-w]+v\nprint(dp[W])",
    testcases: [
      { input: "3 5\n2 3\n3 4\n4 5", expected: "7", isSample: true },
      { input: "1 1\n5 100", expected: "0", isSample: true },
      { input: "4 10\n5 10\n4 40\n6 30\n3 50", expected: "90", isSample: false },
      { input: "2 7\n3 4\n4 5", expected: "9", isSample: false },
    ],
  },
  {
    slug: "interval-merge-count",
    title: "Merge Intervals",
    difficulty: "hard",
    topics: ["sorting", "greedy", "intervals"],
    statement:
      "The first line contains `n`. Each of the next `n` lines contains `l r`, a closed interval.\n\nPrint the number of intervals remaining after merging every pair that overlaps or touches, then the total length covered, separated by a space.",
    constraints: "- `1 <= n <= 2*10^5`\n- `-10^9 <= l <= r <= 10^9`",
    timeLimitMs: 3000,
    reference:
      "import sys\nd=list(map(int,sys.stdin.read().split()))\nn=d[0]\nivs=sorted((d[1+2*i],d[2+2*i]) for i in range(n))\nmerged=[]\nfor l,r in ivs:\n    if merged and l<=merged[-1][1]:\n        merged[-1][1]=max(merged[-1][1],r)\n    else:\n        merged.append([l,r])\nprint(len(merged), sum(r-l for l,r in merged))",
    testcases: [
      { input: "4\n1 3\n2 6\n8 10\n15 18", expected: "3 10", isSample: true },
      { input: "2\n1 4\n4 5", expected: "1 4", isSample: true },
      { input: "3\n1 2\n5 6\n9 10", expected: "3 3", isSample: false },
      { input: "1\n-5 5", expected: "1 10", isSample: false },
    ],
  },
  {
    slug: "modular-power-sum",
    title: "Modular Power Sum",
    difficulty: "hard",
    topics: ["math", "number-theory"],
    statement:
      "The first line contains `n`, `k` and `m`.\n\nPrint `(1^k + 2^k + ... + n^k) mod m`.",
    constraints: "- `1 <= n <= 10^6`\n- `0 <= k <= 10^9`\n- `1 <= m <= 10^9`",
    timeLimitMs: 4000,
    reference:
      "import sys\nn,k,m=map(int,sys.stdin.read().split())\ntotal=0\nfor i in range(1,n+1):\n    total=(total+pow(i,k,m))%m\nprint(total%m)",
    testcases: [
      { input: "3 2 1000", expected: "14", isSample: true },
      { input: "5 1 7", expected: "1", isSample: true },
      { input: "4 0 100", expected: "4", isSample: false },
      { input: "10 3 1000000007", expected: "3025", isSample: false },
      { input: "1 1000000000 13", expected: "1", isSample: false },
    ],
  },
];
