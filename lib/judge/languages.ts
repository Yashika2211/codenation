/**
 * The language catalogue. `runtime` and `version` are what the judge backend
 * receives; everything else drives the editor and the UI.
 */

export type LanguageId = "python" | "javascript" | "typescript" | "rust" | "go" | "cpp" | "java";

export type LanguageSpec = {
  id: LanguageId;
  label: string;
  /** Piston runtime name. */
  runtime: string;
  version: string;
  /** Piston needs a filename with the right extension to pick a compiler. */
  filename: string;
  /** Judge0 numeric language id, for the alternate backend. */
  judge0Id: number;
  /** Shown in an empty editor. Reads stdin, because every problem does. */
  starter: string;
  /** Compiled languages get more headroom than the problem's own limit. */
  compileFactor: number;
};

export const LANGUAGES: readonly LanguageSpec[] = [
  {
    id: "python",
    label: "Python",
    runtime: "python",
    version: "3.10.0",
    filename: "main.py",
    judge0Id: 71,
    compileFactor: 1,
    starter: `import sys

def main() -> None:
    data = sys.stdin.read().split()
    # Your solution here.
    print(len(data))

main()
`,
  },
  {
    id: "javascript",
    label: "JavaScript",
    runtime: "javascript",
    version: "18.15.0",
    filename: "main.js",
    judge0Id: 93,
    compileFactor: 1,
    starter: `const data = require("fs").readFileSync(0, "utf8").trim().split(/\\s+/);

// Your solution here.
console.log(data.length);
`,
  },
  {
    id: "typescript",
    label: "TypeScript",
    runtime: "typescript",
    version: "5.0.3",
    filename: "main.ts",
    judge0Id: 74,
    compileFactor: 2,
    starter: `import * as fs from "fs";

const data: string[] = fs.readFileSync(0, "utf8").trim().split(/\\s+/);

// Your solution here.
console.log(data.length);
`,
  },
  {
    id: "rust",
    label: "Rust",
    runtime: "rust",
    version: "1.68.2",
    filename: "main.rs",
    judge0Id: 73,
    compileFactor: 3,
    starter: `use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let data: Vec<&str> = input.split_whitespace().collect();

    // Your solution here.
    println!("{}", data.len());
}
`,
  },
  {
    id: "go",
    label: "Go",
    runtime: "go",
    version: "1.16.2",
    filename: "main.go",
    judge0Id: 60,
    compileFactor: 3,
    starter: `package main

import (
	"bufio"
	"fmt"
	"os"
)

func main() {
	reader := bufio.NewReader(os.Stdin)
	writer := bufio.NewWriter(os.Stdout)
	defer writer.Flush()

	var n int
	fmt.Fscan(reader, &n)

	// Your solution here.
	fmt.Fprintln(writer, n)
}
`,
  },
  {
    id: "cpp",
    label: "C++",
    runtime: "c++",
    version: "10.2.0",
    filename: "main.cpp",
    judge0Id: 54,
    compileFactor: 3,
    starter: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    if (!(cin >> n)) return 0;

    // Your solution here.
    cout << n << "\\n";
    return 0;
}
`,
  },
  {
    id: "java",
    label: "Java",
    runtime: "java",
    version: "15.0.2",
    filename: "Main.java",
    judge0Id: 62,
    compileFactor: 3,
    starter: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder out = new StringBuilder();

        // Your solution here.
        String line = br.readLine();
        out.append(line == null ? "" : line.trim()).append('\\n');

        System.out.print(out);
    }
}
`,
  },
] as const;

const BY_ID = new Map(LANGUAGES.map((l) => [l.id, l]));

export function getLanguage(id: string): LanguageSpec | null {
  return BY_ID.get(id as LanguageId) ?? null;
}

export function isLanguageId(id: string): id is LanguageId {
  return BY_ID.has(id as LanguageId);
}

export const DEFAULT_LANGUAGE: LanguageId = "python";
