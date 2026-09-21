import type { SeedProblem } from "./types";

export const EXPERT_PROBLEMS: SeedProblem[] = [
  {
    slug: "min-cost-spanning-network",
    title: "Minimum Spanning Network",
    difficulty: "expert",
    topics: ["graphs", "mst", "dsu"],
    statement:
      "The first line contains `n` and `m`. Each of the next `m` lines contains `a b w`: a bidirectional cable of cost `w`.\n\nPrint the minimum total cost to connect every junction, or `-1` if the network cannot be fully connected.",
    constraints: "- `1 <= n <= 10^5`\n- `0 <= m <= 2*10^5`\n- `1 <= w <= 10^9`",
    timeLimitMs: 4000,
    reference:
      "import sys\nd=sys.stdin.read().split()\nn=int(d[0]);m=int(d[1])\nedges=[(int(d[4+3*i]),int(d[2+3*i]),int(d[3+3*i])) for i in range(m)]\nedges.sort()\np=list(range(n+1));sz=[1]*(n+1)\ndef find(x):\n    while p[x]!=x:\n        p[x]=p[p[x]];x=p[x]\n    return x\ntotal=0;used=0\nfor w,a,b in edges:\n    ra,rb=find(a),find(b)\n    if ra!=rb:\n        if sz[ra]<sz[rb]: ra,rb=rb,ra\n        p[rb]=ra;sz[ra]+=sz[rb];total+=w;used+=1\nprint(total if used==n-1 else -1)",
    testcases: [
      { input: "4 5\n1 2 1\n2 3 2\n3 4 3\n1 4 10\n1 3 4", expected: "6", isSample: true },
      { input: "3 1\n1 2 5", expected: "-1", isSample: true },
      { input: "1 0", expected: "0", isSample: false },
      { input: "5 7\n1 2 3\n1 3 1\n2 3 7\n3 4 2\n4 5 6\n2 5 8\n1 5 9", expected: "12", isSample: false },
    ],
  },
  {
    slug: "lca-queries",
    title: "Ancestor Queries",
    difficulty: "expert",
    topics: ["trees", "lca", "binary-lifting"],
    statement:
      "The first line contains `n` and `q`. The second line contains `n-1` integers: the parent of nodes `2..n` (the tree is rooted at `1`). Each of the next `q` lines contains `u v`.\n\nPrint the lowest common ancestor of each pair, one per line.",
    constraints: "- `1 <= n, q <= 2*10^5`",
    timeLimitMs: 5000,
    reference:
      "import sys\nfrom collections import deque\nd=sys.stdin.read().split()\nn=int(d[0]);q=int(d[1])\npar=[0]*(n+1)\nfor i in range(2,n+1): par[i]=int(d[2+i-2])\nchildren=[[] for _ in range(n+1)]\nfor i in range(2,n+1): children[par[i]].append(i)\ndepth=[0]*(n+1)\ndq=deque([1])\nwhile dq:\n    u=dq.popleft()\n    for v in children[u]:\n        depth[v]=depth[u]+1;dq.append(v)\nLOG=1\nwhile (1<<LOG)<=n: LOG+=1\nup=[[0]*(n+1) for _ in range(LOG)]\nup[0]=par[:]\nup[0][1]=1\nfor k in range(1,LOG):\n    for v in range(1,n+1): up[k][v]=up[k-1][up[k-1][v]]\nbase=2+n-1\nout=[]\nfor i in range(q):\n    u=int(d[base+2*i]);v=int(d[base+2*i+1])\n    if depth[u]<depth[v]: u,v=v,u\n    diff=depth[u]-depth[v]\n    for k in range(LOG):\n        if diff>>k&1: u=up[k][u]\n    if u==v:\n        out.append(str(u));continue\n    for k in range(LOG-1,-1,-1):\n        if up[k][u]!=up[k][v]: u=up[k][u];v=up[k][v]\n    out.append(str(up[0][u]))\nprint('\\n'.join(out))",
    testcases: [
      { input: "5 3\n1 1 2 2\n4 5\n4 3\n2 2", expected: "2\n1\n2", isSample: true },
      { input: "3 1\n1 1\n2 3", expected: "1", isSample: true },
      { input: "7 2\n1 1 2 2 3 3\n4 7\n6 7", expected: "1\n3", isSample: false },
      { input: "2 1\n1\n1 2", expected: "1", isSample: false },
    ],
  },
  {
    slug: "segment-tree-range-max",
    title: "Range Max with Updates",
    difficulty: "expert",
    topics: ["segment-tree", "data-structures"],
    statement:
      "The first line contains `n` and `q`. The second line contains `n` integers. Each of the next `q` lines is either `U i x` (set position `i` to `x`, 1-indexed) or `Q l r` (query the maximum on `[l, r]`).\n\nPrint the answer to each query, one per line.",
    constraints: "- `1 <= n, q <= 2*10^5`\n- `-10^9 <= values <= 10^9`",
    timeLimitMs: 5000,
    reference:
      "import sys\nd=sys.stdin.read().split()\nn=int(d[0]);q=int(d[1])\nsize=1\nwhile size<n: size*=2\nNEG=-(10**18)\ntree=[NEG]*(2*size)\nfor i in range(n): tree[size+i]=int(d[2+i])\nfor i in range(size-1,0,-1): tree[i]=max(tree[2*i],tree[2*i+1])\nidx=2+n;out=[]\nfor _ in range(q):\n    op=d[idx];a=int(d[idx+1]);b=int(d[idx+2]);idx+=3\n    if op=='U':\n        p=size+a-1;tree[p]=b;p//=2\n        while p: tree[p]=max(tree[2*p],tree[2*p+1]);p//=2\n    else:\n        l=size+a-1;r=size+b;best=NEG\n        while l<r:\n            if l&1: best=max(best,tree[l]);l+=1\n            if r&1: r-=1;best=max(best,tree[r])\n            l//=2;r//=2\n        out.append(str(best))\nprint('\\n'.join(out))",
    testcases: [
      { input: "5 3\n1 5 2 8 3\nQ 1 5\nU 4 0\nQ 1 5", expected: "8\n5", isSample: true },
      { input: "3 2\n-1 -2 -3\nQ 2 3\nQ 1 1", expected: "-2\n-1", isSample: true },
      { input: "4 4\n1 2 3 4\nQ 2 3\nU 1 100\nQ 1 2\nQ 3 4", expected: "3\n100\n4", isSample: false },
      { input: "1 2\n7\nQ 1 1\nU 1 -7", expected: "7", isSample: false },
    ],
  },
  {
    slug: "string-matching-count",
    title: "Pattern Occurrences",
    difficulty: "expert",
    topics: ["strings", "kmp"],
    statement:
      "Two lines: the text `t`, then the pattern `p`.\n\nPrint the number of occurrences of `p` in `t`. Occurrences may overlap.",
    constraints: "- `1 <= |p| <= |t| <= 10^6`\n- Both contain lowercase letters only.",
    timeLimitMs: 4000,
    reference:
      "import sys\nt,p=sys.stdin.read().split()\ns=p+'\\x00'+t\nf=[0]*len(s)\nfor i in range(1,len(s)):\n    j=f[i-1]\n    while j and s[i]!=s[j]: j=f[j-1]\n    if s[i]==s[j]: j+=1\n    f[i]=j\nprint(sum(1 for x in f if x==len(p)))",
    testcases: [
      { input: "ababab\nabab", expected: "2", isSample: true },
      { input: "aaaa\naa", expected: "3", isSample: true },
      { input: "codenation\nnation", expected: "1", isSample: false },
      { input: "abcabc\nxyz", expected: "0", isSample: false },
      { input: "aaaaa\na", expected: "5", isSample: false },
    ],
  },
  {
    slug: "matrix-exponentiation-fib",
    title: "Fast Recurrence",
    difficulty: "expert",
    topics: ["math", "matrix-exponentiation"],
    statement:
      "The line contains `n` and `m`.\n\nPrint `F(n) mod m`, where `F(0) = 0`, `F(1) = 1` and `F(k) = F(k-1) + F(k-2)`.",
    constraints: "- `0 <= n <= 10^18`\n- `1 <= m <= 10^9`",
    timeLimitMs: 3000,
    reference:
      "import sys\nn,m=map(int,sys.stdin.read().split())\ndef mul(a,b):\n    return [(a[0]*b[0]+a[1]*b[2])%m,(a[0]*b[1]+a[1]*b[3])%m,(a[2]*b[0]+a[3]*b[2])%m,(a[2]*b[1]+a[3]*b[3])%m]\nres=[1,0,0,1];base=[1,1,1,0];e=n\nwhile e:\n    if e&1: res=mul(res,base)\n    base=mul(base,base);e>>=1\nprint(res[1]%m)",
    testcases: [
      { input: "10 1000000007", expected: "55", isSample: true },
      { input: "0 7", expected: "0", isSample: true },
      { input: "1 2", expected: "1", isSample: false },
      { input: "90 1000000007", expected: "210345902", isSample: false },
      { input: "1000000000000000000 998244353", expected: "23849548", isSample: false },
    ],
  },
  {
    slug: "max-flow-small",
    title: "Pipeline Capacity",
    difficulty: "expert",
    topics: ["graphs", "max-flow"],
    statement:
      "The first line contains `n` and `m`. Each of the next `m` lines contains `a b c`: a directed pipe from `a` to `b` with capacity `c`.\n\nPrint the maximum flow from node `1` to node `n`.",
    constraints: "- `2 <= n <= 200`\n- `0 <= m <= 2000`\n- `1 <= c <= 10^6`",
    timeLimitMs: 5000,
    reference:
      "import sys\nfrom collections import deque\nd=sys.stdin.read().split()\nn=int(d[0]);m=int(d[1])\ncap=[[0]*(n+1) for _ in range(n+1)]\nadj=[[] for _ in range(n+1)]\nfor i in range(m):\n    a=int(d[2+3*i]);b=int(d[3+3*i]);c=int(d[4+3*i])\n    if cap[a][b]==0 and cap[b][a]==0:\n        adj[a].append(b);adj[b].append(a)\n    cap[a][b]+=c\nflow=0\nwhile True:\n    par=[0]*(n+1);par[1]=1\n    q=deque([1])\n    while q and not par[n]:\n        u=q.popleft()\n        for v in adj[u]:\n            if not par[v] and cap[u][v]>0:\n                par[v]=u;q.append(v)\n    if not par[n]: break\n    aug=float('inf');v=n\n    while v!=1:\n        aug=min(aug,cap[par[v]][v]);v=par[v]\n    v=n\n    while v!=1:\n        cap[par[v]][v]-=aug;cap[v][par[v]]+=aug;v=par[v]\n    flow+=aug\nprint(flow)",
    testcases: [
      { input: "4 5\n1 2 3\n1 3 2\n2 4 2\n3 4 3\n2 3 1", expected: "5", isSample: true },
      { input: "2 1\n1 2 7", expected: "7", isSample: true },
      { input: "3 2\n1 2 5\n2 3 3", expected: "3", isSample: false },
      { input: "4 2\n1 2 5\n3 4 5", expected: "0", isSample: false },
    ],
  },
  {
    slug: "digit-dp-count",
    title: "Digits Without Repeats",
    difficulty: "expert",
    topics: ["dp", "digit-dp", "math"],
    statement:
      "The line contains `n`.\n\nPrint how many integers in `[1, n]` have no two adjacent digits equal.",
    constraints: "- `1 <= n <= 10^18`",
    timeLimitMs: 4000,
    reference:
      "import sys\nfrom functools import lru_cache\nn=sys.stdin.read().strip()\ndigits=[int(c) for c in n]\nL=len(digits)\n@lru_cache(maxsize=None)\ndef go(pos,prev,tight,started):\n    if pos==L: return 1 if started else 0\n    total=0\n    hi=digits[pos] if tight else 9\n    for d in range(0,hi+1):\n        if started and d==prev: continue\n        total+=go(pos+1,d,tight and d==hi,started or d>0)\n    return total\nprint(go(0,-1,True,False))",
    testcases: [
      { input: "20", expected: "19", isSample: true },
      { input: "9", expected: "9", isSample: true },
      { input: "100", expected: "90", isSample: false },
      { input: "1000", expected: "819", isSample: false },
    ],
  },
  {
    slug: "convex-hull-area",
    title: "Territory Hull",
    difficulty: "expert",
    topics: ["geometry", "convex-hull"],
    statement:
      "The first line contains `n`. Each of the next `n` lines contains `x y`.\n\nPrint twice the area of the convex hull of the points, as an integer. Twice the area is always an integer for integer coordinates.",
    constraints: "- `1 <= n <= 10^5`\n- `-10^9 <= x, y <= 10^9`",
    timeLimitMs: 4000,
    reference:
      "import sys\nd=list(map(int,sys.stdin.read().split()))\nn=d[0]\npts=sorted(set((d[1+2*i],d[2+2*i]) for i in range(n)))\nif len(pts)<3:\n    print(0);sys.exit()\ndef cross(o,a,b): return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])\nlower=[]\nfor p in pts:\n    while len(lower)>=2 and cross(lower[-2],lower[-1],p)<=0: lower.pop()\n    lower.append(p)\nupper=[]\nfor p in reversed(pts):\n    while len(upper)>=2 and cross(upper[-2],upper[-1],p)<=0: upper.pop()\n    upper.append(p)\nhull=lower[:-1]+upper[:-1]\narea2=0\nfor i in range(len(hull)):\n    x1,y1=hull[i];x2,y2=hull[(i+1)%len(hull)]\n    area2+=x1*y2-x2*y1\nprint(abs(area2))",
    testcases: [
      { input: "4\n0 0\n4 0\n4 4\n0 4", expected: "32", isSample: true },
      { input: "3\n0 0\n1 0\n0 1", expected: "1", isSample: true },
      { input: "2\n0 0\n5 5", expected: "0", isSample: false },
      { input: "5\n0 0\n2 0\n2 2\n0 2\n1 1", expected: "8", isSample: false },
    ],
  },
  {
    slug: "bitmask-tour",
    title: "Shortest Tour",
    difficulty: "expert",
    topics: ["dp", "bitmask", "graphs"],
    statement:
      "The first line contains `n`. The next `n` lines each contain `n` integers: the cost matrix.\n\nStarting at city `0`, visit every city exactly once and return to `0`. Print the minimum total cost.",
    constraints: "- `2 <= n <= 15`\n- `0 <= cost <= 10^6`",
    timeLimitMs: 5000,
    reference:
      "import sys\nd=list(map(int,sys.stdin.read().split()))\nn=d[0]\nc=[d[1+i*n:1+(i+1)*n] for i in range(n)]\nINF=float('inf')\nfull=1<<n\ndp=[[INF]*n for _ in range(full)]\ndp[1][0]=0\nfor mask in range(full):\n    for u in range(n):\n        if dp[mask][u]==INF or not mask>>u&1: continue\n        for v in range(n):\n            if mask>>v&1: continue\n            nm=mask|1<<v\n            if dp[mask][u]+c[u][v]<dp[nm][v]: dp[nm][v]=dp[mask][u]+c[u][v]\nprint(min(dp[full-1][u]+c[u][0] for u in range(n)))",
    testcases: [
      { input: "3\n0 1 2\n1 0 3\n2 3 0", expected: "6", isSample: true },
      { input: "2\n0 5\n5 0", expected: "10", isSample: true },
      { input: "4\n0 10 15 20\n10 0 35 25\n15 35 0 30\n20 25 30 0", expected: "80", isSample: false },
    ],
  },
  {
    slug: "persistent-prefix-kth",
    title: "Kth Smallest in a Range",
    difficulty: "expert",
    topics: ["data-structures", "binary-search", "merge-sort"],
    statement:
      "The first line contains `n` and `q`. The second line contains `n` integers. Each of the next `q` lines contains `l r k` (1-indexed, inclusive).\n\nPrint the `k`-th smallest value in each range, one per line.",
    constraints: "- `1 <= n, q <= 2000`\n- `1 <= k <= r - l + 1`\n- `-10^9 <= a_i <= 10^9`",
    timeLimitMs: 5000,
    reference:
      "import sys\nd=sys.stdin.read().split()\nn=int(d[0]);q=int(d[1])\na=list(map(int,d[2:2+n]))\nout=[]\nfor i in range(q):\n    l=int(d[2+n+3*i]);r=int(d[3+n+3*i]);k=int(d[4+n+3*i])\n    out.append(str(sorted(a[l-1:r])[k-1]))\nprint('\\n'.join(out))",
    testcases: [
      { input: "5 2\n3 1 4 1 5\n1 5 1\n2 4 2", expected: "1\n1", isSample: true },
      { input: "3 1\n7 8 9\n1 3 3", expected: "9", isSample: true },
      { input: "4 3\n-1 -5 3 2\n1 4 1\n1 4 4\n2 3 2", expected: "-5\n3\n3", isSample: false },
    ],
  },
];
