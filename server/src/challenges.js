import { execute, resolveRuntime, getRuntimesList } from "./executor.js";

const MAX_CODE = 20000;

// ---------------------------------------------------------------- helpers

function strLit(s) {
  return (
    '"' +
    String(s)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t") +
    '"'
  );
}

function unicodeRaw(json) {
  return json.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function truncate(s, n) {
  return s.length > n ? s.slice(0, n) + "\n… (truncado)" : s;
}

function vType(v) {
  if (Array.isArray(v)) return "arr";
  if (typeof v === "number") return Number.isInteger(v) ? "int" : "double";
  if (typeof v === "string") return "str";
  if (typeof v === "boolean") return "bool";
  return "int";
}

function pyDump(v) {
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return strLit(v);
  if (Array.isArray(v)) return "[" + v.map(pyDump).join(", ") + "]";
  return "{" + Object.entries(v).map(([k, x]) => `${strLit(k)}: ${pyDump(x)}`).join(", ") + "}";
}

function rbDump(v) {
  if (v === null || v === undefined) return "nil";
  if (v === true) return "true";
  if (v === false) return "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return strLit(v);
  if (Array.isArray(v)) return "[" + v.map(rbDump).join(", ") + "]";
  return "{" + Object.entries(v).map(([k, x]) => `${strLit(k)} => ${rbDump(x)}`).join(", ") + "}";
}

function phpDump(v) {
  if (v === null || v === undefined) return "null";
  if (v === true) return "true";
  if (v === false) return "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return strLit(v);
  if (Array.isArray(v)) return "[" + v.map(phpDump).join(", ") + "]";
  return "[" + Object.entries(v).map(([k, x]) => `${strLit(k)} => ${phpDump(x)}`).join(", ") + "]";
}

// ---------------------------------------------------------------- compiled helpers

function cLit(v) {
  if (Array.isArray(v)) return `(long long[]){${v.map((n) => `${String(n)}LL`).join(", ")}}`;
  if (typeof v === "string") return strLit(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  return Number.isInteger(v) ? `${String(v)}LL` : String(v);
}

function cRet(v) {
  const t = vType(v);
  if (t === "str") return "const char*";
  if (t === "double") return "double";
  if (t === "bool") return "int";
  return "long long";
}

function cCallArgs(args) {
  return args
    .map((a) => {
      if (Array.isArray(a)) return `${cLit(a)}, ${a.length}LL`;
      return cLit(a);
    })
    .join(", ");
}

function cCmp(expected, gotVar) {
  const t = vType(expected);
  if (t === "str") return `(${gotVar} && strcmp(${gotVar}, ${strLit(String(expected))}) == 0)`;
  return `${gotVar} == ${cLit(expected)}`;
}

function cFail(expected, gotVar) {
  const t2 = vType(expected);
  if (t2 === "str") return `printf("__TEST__ FAIL input=%s got=%s\\n", __input, ${gotVar} ? ${gotVar} : "(null)");`;
  if (t2 === "double") return `printf("__TEST__ FAIL input=%s got=%f\\n", __input, ${gotVar});`;
  if (t2 === "bool") return `printf("__TEST__ FAIL input=%s got=%d\\n", __input, ${gotVar});`;
  return `printf("__TEST__ FAIL input=%s got=%lld\\n", __input, ${gotVar});`;
}

function javaLit(v) {
  if (Array.isArray(v)) return `new long[]{${v.map((n) => `${String(n)}L`).join(", ")}}`;
  if (typeof v === "string") return strLit(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return Number.isInteger(v) ? `${String(v)}L` : String(v);
}

function javaRet(v) {
  const t = vType(v);
  if (t === "str") return "String";
  if (t === "double") return "double";
  if (t === "bool") return "boolean";
  if (t === "arr") return "long[]";
  return "long";
}

function javaCmp(expected, gotVar) {
  const t = vType(expected);
  if (t === "str") return `java.util.Objects.equals(${gotVar}, ${strLit(String(expected))})`;
  if (t === "arr") return `java.util.Arrays.equals(${gotVar}, ${javaLit(expected)})`;
  if (t === "bool") return `${gotVar} == ${expected ? "true" : "false"}`;
  return `${gotVar} == ${javaLit(expected)}`;
}

function javaFail(expected, gotVar) {
  const t = vType(expected);
  if (t === "arr") return `System.out.println("__TEST__ FAIL input=" + __input + " got=" + java.util.Arrays.toString(${gotVar}));`;
  return `System.out.println("__TEST__ FAIL input=" + __input + " got=" + ${gotVar});`;
}

function csLit(v) {
  if (Array.isArray(v)) return `new long[] {${v.join(", ")}}`;
  if (typeof v === "string") return strLit(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return Number.isInteger(v) ? String(v) : String(v);
}

function csRet(v) {
  const t = vType(v);
  if (t === "str") return "string";
  if (t === "double") return "double";
  if (t === "bool") return "bool";
  if (t === "arr") return "long[]";
  return "long";
}

function csCmp(expected, gotVar) {
  const t = vType(expected);
  if (t === "str") return `${gotVar} == ${strLit(String(expected))}`;
  if (t === "arr") return `System.Linq.Enumerable.SequenceEqual(${gotVar}, ${csLit(expected)})`;
  if (t === "bool") return `${gotVar} == ${expected ? "true" : "false"}`;
  return `${gotVar} == ${csLit(expected)}`;
}

function csFail(expected, gotVar) {
  const t = vType(expected);
  if (t === "arr") return `Console.WriteLine("__TEST__ FAIL input=" + __input + " got=[" + string.Join(", ", ${gotVar}) + "]");`;
  return `Console.WriteLine("__TEST__ FAIL input=" + __input + " got=" + ${gotVar});`;
}

function goLit(v) {
  if (Array.isArray(v)) return `[]int{${v.join(", ")}}`;
  if (typeof v === "string") return strLit(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return Number.isInteger(v) ? String(v) : String(v);
}

function goRet(v) {
  const t = vType(v);
  if (t === "str") return "string";
  if (t === "double") return "float64";
  if (t === "bool") return "bool";
  if (t === "arr") return "[]int";
  return "int";
}

function goCmp(expected, gotVar) {
  return `reflect.DeepEqual(${gotVar}, ${goLit(expected)})`;
}

function rustLit(v) {
  if (Array.isArray(v)) return `vec![${v.map((n) => `${String(n)}i64`).join(", ")}]`;
  if (typeof v === "string") return `${strLit(v)}.to_string()`;
  if (typeof v === "boolean") return v ? "true" : "false";
  return Number.isInteger(v) ? `${String(v)}i64` : String(v);
}

function rustRet(v) {
  const t = vType(v);
  if (t === "str") return "String";
  if (t === "double") return "f64";
  if (t === "bool") return "bool";
  if (t === "arr") return "Vec<i64>";
  return "i64";
}

function rustCmp(expected, gotVar) {
  return `${gotVar} == ${rustLit(expected)}`;
}

function inputLit(args) {
  return strLit(unicodeRaw(JSON.stringify(args)));
}

// ---------------------------------------------------------------- builders

function buildBlocks(kind, tests) {
  return tests
    .map((t, i) => {
      const line = `__input_${i}`;
      return { i, t, line };
    })
    .map(({ i, t }) => {
      const input = inputLit(t.args);
      switch (kind) {
        case "c": {
          const ret = cRet(t.expected);
          const call = cCallArgs(t.args);
          return [
            `  { /* test ${i} */`,
            `    const char* __input = ${input};`,
            `    ${ret} __got = solution(${call});`,
            `    if (${cCmp(t.expected, "__got")}) { __passed++; printf("__TEST__ PASS\\n"); }`,
            `    else ${cFail(t.expected, "__got")}`,
            `  }`,
          ].join("\n");
        }
        case "java": {
          const ret = javaRet(t.expected);
          const call = t.args.map(javaLit).join(", ");
          return [
            `    { /* test ${i} */`,
            `      String __input = ${input};`,
            `      ${ret} __got = solution(${call});`,
            `      if (${javaCmp(t.expected, "__got")}) { __passed++; System.out.println("__TEST__ PASS"); }`,
            `      else ${javaFail(t.expected, "__got")}`,
            `    }`,
          ].join("\n");
        }
        case "cs": {
          const ret = csRet(t.expected);
          const call = t.args.map(csLit).join(", ");
          return [
            `    { /* test ${i} */`,
            `      string __input = ${input};`,
            `      ${ret} __got = solution(${call});`,
            `      if (${csCmp(t.expected, "__got")}) { __passed++; Console.WriteLine("__TEST__ PASS"); }`,
            `      else ${csFail(t.expected, "__got")}`,
            `    }`,
          ].join("\n");
        }
        case "go": {
          const call = t.args.map(goLit).join(", ");
          return [
            `    { /* test ${i} */`,
            `      __got := solution(${call})`,
            `      if (${goCmp(t.expected, "__got")}) { __passed++; fmt.Println("__TEST__ PASS") } else {`,
            `        fmt.Printf("__TEST__ FAIL input=%s got=%#v\\n", ${input}, __got)`,
            `      }`,
            `    }`,
          ].join("\n");
        }
        case "rust": {
          const call = t.args.map(rustLit).join(", ");
          return [
            `    { /* test ${i} */`,
            `      let __got = solution(${call});`,
            `      if (${rustCmp(t.expected, "__got")}) { __passed += 1; println!("__TEST__ PASS"); } else {`,
            `        println!("__TEST__ FAIL input={} got={:?}", ${input}, __got);`,
            `      }`,
            `    }`,
          ].join("\n");
        }
        default:
          return "";
      }
    });
}

const builders = {
  javascript(userCode, tests) {
    const lit = unicodeRaw(JSON.stringify(tests));
    return {
      fileName: "main.js",
      source: [
        userCode,
        "",
        "const __TESTS = " + lit + ";",
        "let __passed = 0;",
        "for (const __t of __TESTS) {",
        "  let __ok = false; let __got; let __err = null;",
        "  try { __got = solution(...__t.args); __ok = JSON.stringify(__got) === JSON.stringify(__t.expected); }",
        "  catch (e) { __err = String(e && e.stack ? e.stack : e); }",
        "  if (__ok) { __passed++; console.log('__TEST__ PASS'); }",
        "  else if (__err) console.log('__TEST__ ERROR ' + __err);",
        "  else console.log('__TEST__ FAIL input=' + JSON.stringify(__t.args) + ' got=' + JSON.stringify(__got));",
        "}",
        "console.log('__RESULT__ ' + __passed + '/' + __TESTS.length);",
      ].join("\n"),
    };
  },
  typescript(userCode, tests) {
    const r = builders.javascript(userCode, tests);
    r.fileName = "main.ts";
    r.source = "// @ts-nocheck\n" + r.source;
    return r;
  },
  python(userCode, tests) {
    return {
      fileName: "main.py",
      source: [
        "import json as __json",
        userCode,
        "",
        "def __eq(a, b):",
        "    if isinstance(a, list) and isinstance(b, list):",
        "        return len(a) == len(b) and all(__eq(x, y) for x, y in zip(a, b))",
        "    if isinstance(a, dict) and isinstance(b, dict):",
        "        return set(a.keys()) == set(b.keys()) and all(__eq(a[k], b[k]) for k in a)",
        "    return a == b",
        "",
        "__TESTS = " + pyDump(tests),
        "__passed = 0",
        "for __t in __TESTS:",
        "    try:",
        "        __got = solution(*__t['args'])",
        "        if __eq(__got, __t['expected']):",
        "            __passed += 1",
        '            print("__TEST__ PASS")',
        "        else:",
        '            print("__TEST__ FAIL input=" + __json.dumps(__t[\'args\']) + " got=" + repr(__got))',
        "    except Exception as __e:",
        '        print("__TEST__ ERROR " + repr(__e))',
        'print("__RESULT__ %d/%d" % (__passed, len(__TESTS)))',
      ].join("\n"),
    };
  },
  ruby(userCode, tests) {
    return {
      fileName: "main.rb",
      source: [
        'require "json"',
        userCode,
        "",
        "def __eq(a, b)",
        "  if a.is_a?(Array) && b.is_a?(Array)",
        "    a.length == b.length && a.each_index.all? { |i| __eq(a[i], b[i]) }",
        "  elsif a.is_a?(Hash) && b.is_a?(Hash)",
        "    a.keys.sort_by(&:to_s) == b.keys.sort_by(&:to_s) && a.keys.all? { |k| __eq(a[k], b[k]) }",
        "  else",
        "    a == b",
        "  end",
        "end",
        "",
        "__TESTS = " + rbDump(tests),
        "__passed = 0",
        "__TESTS.each do |__t|",
        "  begin",
        '    __got = solution(*__t["args"])',
        '    if __eq(__got, __t["expected"])',
        "      __passed += 1",
        '      puts "__TEST__ PASS"',
        "    else",
        '      puts "__TEST__ FAIL input=#{__t["args"].to_json} got=#{__got.to_json}"',
        "    end",
        "  rescue StandardError => __e",
        '    puts "__TEST__ ERROR #{__e.message}"',
        "  end",
        "end",
        'puts "__RESULT__ #{__passed}/#{__TESTS.length}"',
      ].join("\n"),
    };
  },
  php(userCode, tests) {
    return {
      fileName: "main.php",
      source: [
        "<?php",
        userCode,
        "",
        "$__TESTS = " + phpDump(tests) + ";",
        "$__passed = 0;",
        "foreach ($__TESTS as $__t) {",
        "  try {",
        "    $__got = call_user_func_array('solution', $__t['args']);",
        "    if ($__got === $__t['expected']) {",
        "      $__passed++;",
        '      echo "__TEST__ PASS\\n";',
        "    } else {",
        '      echo "__TEST__ FAIL input=" . json_encode($__t[\'args\']) . " got=" . json_encode($__got) . "\\n";',
        "    }",
        "  } catch (Throwable $__e) {",
        '    echo "__TEST__ ERROR " . $__e->getMessage() . "\\n";',
        "  }",
        "}",
        'echo "__RESULT__ $__passed/" . count($__TESTS) . "\\n";',
      ].join("\n"),
    };
  },
  c(userCode, tests) {
    const blocks = buildBlocks("c", tests);
    return {
      fileName: "main.c",
      source: [
        "#include <stdio.h>",
        "#include <string.h>",
        userCode,
        "int main(void) {",
        "  int __passed = 0;",
        ...blocks,
        `  printf("__RESULT__ %d/%d\\n", __passed, ${tests.length});`,
        "  return 0;",
        "}",
      ].join("\n"),
    };
  },
  csharp(userCode, tests) {
    const blocks = buildBlocks("cs", tests);
    return {
      fileName: "main.cs",
      source: [
        "using System;",
        "using System.Linq;",
        "public static class Program {",
        userCode,
        "  public static void Main() {",
        "    int __passed = 0;",
        ...blocks,
        `    Console.WriteLine("__RESULT__ " + __passed + "/${tests.length}");`,
        "  }",
        "}",
      ].join("\n"),
    };
  },
  java(userCode, tests) {
    const blocks = buildBlocks("java", tests);
    return {
      fileName: "Main.java",
      source: [
        "import java.util.*;",
        "public class Main {",
        userCode,
        "  public static void main(String[] args) {",
        "    int __passed = 0;",
        ...blocks,
        `    System.out.println("__RESULT__ " + __passed + "/${tests.length}");`,
        "  }",
        "}",
      ].join("\n"),
    };
  },
  go(userCode, tests) {
    const blocks = buildBlocks("go", tests);
    return {
      fileName: "main.go",
      source: [
        "package main",
        "",
        "import (",
        '    "fmt"',
        '    "reflect"',
        ")",
        userCode,
        "func main() {",
        "    __passed := 0",
        ...blocks,
        `    fmt.Printf("__RESULT__ %d/%d\\n", __passed, ${tests.length})`,
        "}",
      ].join("\n"),
    };
  },
  rust(userCode, tests) {
    const blocks = buildBlocks("rust", tests);
    return {
      fileName: "main.rs",
      source: [userCode, "fn main() {", "    let mut __passed = 0;", ...blocks, `    println!("__RESULT__ {}/{}", __passed, ${tests.length});`, "}"].join("\n"),
    };
  },
};

// ---------------------------------------------------------------- challenges

const starters = (map) => map;

export const CHALLENGES = [
  {
    id: "sum",
    title: "Soma de dois números",
    difficulty: "easy",
    xp: 30,
    summary: "Retorne a soma de dois inteiros.",
    description:
      "Implemente a função `solution(a, b)` que retorna a soma de `a` e `b`.\n\nExemplo: `solution(3, 4)` deve retornar `7`.",
    tests: [
      { args: [1, 2], expected: 3 },
      { args: [10, 20], expected: 30 },
      { args: [-5, 5], expected: 0 },
      { args: [0, 0], expected: 0 },
      { args: [7, 8], expected: 15 },
    ],
    starters: starters({
      javascript: "function solution(a, b) {\n  // some a + b\n  return 0;\n}",
      typescript: "function solution(a: number, b: number): number {\n  // some a + b\n  return 0;\n}",
      python: "def solution(a, b):\n    # some a + b\n    return 0",
      ruby: "def solution(a, b)\n  # some a + b\n  0\nend",
      php: "function solution(int $a, int $b) {\n  // some a + b\n  return 0;\n}",
      c: "long long solution(long long a, long long b) {\n  // some a + b\n  return 0;\n}",
      csharp: "static long solution(long a, long b) {\n  // some a + b\n  return 0;\n}",
      java: "static long solution(long a, long b) {\n  // some a + b\n  return 0;\n}",
      go: "func solution(a, b int) int {\n  // some a + b\n  return 0\n}",
      rust: "fn solution(a: i64, b: i64) -> i64 {\n  // some a + b\n  0\n}",
    }),
  },
  {
    id: "fizzbuzz",
    title: "FizzBuzz",
    difficulty: "easy",
    xp: 30,
    summary: "Retorne 'Fizz', 'Buzz' ou 'FizzBuzz'.",
    description:
      "Implemente `solution(n)`. Se `n` for divisível por 3 e por 5, retorne `\"FizzBuzz\"`; por 3 apenas, `\"Fizz\"`; por 5 apenas, `\"Buzz\"`; caso contrário, o número como texto.\n\nExemplo: `solution(15)` → `\"FizzBuzz\"`, `solution(7)` → `\"7\"`.",
    tests: [
      { args: [3], expected: "Fizz" },
      { args: [5], expected: "Buzz" },
      { args: [15], expected: "FizzBuzz" },
      { args: [7], expected: "7" },
      { args: [1], expected: "1" },
    ],
    starters: starters({
      javascript: "function solution(n) {\n  // implemente FizzBuzz\n  return \"\";\n}",
      typescript: "function solution(n: number): string {\n  // implemente FizzBuzz\n  return \"\";\n}",
      python: "def solution(n):\n    # implemente FizzBuzz\n    return \"\"",
      ruby: "def solution(n)\n  # implemente FizzBuzz\n  \"\"\nend",
      php: "function solution($n) {\n  // implemente FizzBuzz\n  return \"\";\n}",
      c: 'const char* solution(long long n) {\n  // retorne string literal (ex: "Fizz")\n  return "";\n}',
      csharp: "static string solution(long n) {\n  // implemente FizzBuzz\n  return \"\";\n}",
      java: "static String solution(long n) {\n  // implemente FizzBuzz\n  return \"\";\n}",
      go: "func solution(n int) string {\n  // implemente FizzBuzz\n  return \"\"\n}",
      rust: "fn solution(n: i64) -> String {\n  // implemente FizzBuzz\n  String::new()\n}",
    }),
  },
  {
    id: "is-palindrome",
    title: "Palíndromo",
    difficulty: "easy",
    xp: 30,
    summary: "Verifique se a string é um palíndromo.",
    description:
      "Implemente `solution(s)` que retorna `true` se a string `s` é um palíndromo (igual de trás pra frente), ignorando diferenças entre maiúsculas e minúsculas.\n\nExemplo: `solution(\"racecar\")` → `true`, `solution(\"hello\")` → `false`.",
    tests: [
      { args: ["racecar"], expected: true },
      { args: ["hello"], expected: false },
      { args: ["a"], expected: true },
      { args: ["abba"], expected: true },
      { args: ["banana"], expected: false },
    ],
    starters: starters({
      javascript: "function solution(s) {\n  // implemente o palíndromo\n  return false;\n}",
      typescript: "function solution(s: string): boolean {\n  // implemente o palíndromo\n  return false;\n}",
      python: "def solution(s):\n    # implemente o palíndromo\n    return False",
      ruby: "def solution(s)\n  # implemente o palíndromo\n  false\nend",
      php: "function solution($s) {\n  // implemente o palíndromo\n  return false;\n}",
      c: "int solution(const char* s) {\n  // implemente o palíndromo\n  return 0;\n}",
      csharp: "static bool solution(string s) {\n  // implemente o palíndromo\n  return false;\n}",
      java: "static boolean solution(String s) {\n  // implemente o palíndromo\n  return false;\n}",
      go: "func solution(s string) bool {\n  // implemente o palíndromo\n  return false\n}",
      rust: "fn solution(s: &str) -> bool {\n  // implemente o palíndromo\n  false\n}",
    }),
  },
  {
    id: "fibonacci",
    title: "Sequência de Fibonacci",
    difficulty: "medium",
    xp: 50,
    summary: "Retorne o enésimo termo de Fibonacci.",
    description:
      "Implemente `solution(n)` que retorna o enésimo termo de Fibonacci (1-indexado): `fib(1) = 1`, `fib(2) = 1`, `fib(3) = 2`, `fib(4) = 3`...\n\nExemplo: `solution(10)` → `55`.",
    tests: [
      { args: [1], expected: 1 },
      { args: [2], expected: 1 },
      { args: [5], expected: 5 },
      { args: [10], expected: 55 },
      { args: [15], expected: 610 },
    ],
    starters: starters({
      javascript: "function solution(n) {\n  // implemente Fibonacci\n  return 0;\n}",
      typescript: "function solution(n: number): number {\n  // implemente Fibonacci\n  return 0;\n}",
      python: "def solution(n):\n    # implemente Fibonacci\n    return 0",
      ruby: "def solution(n)\n  # implemente Fibonacci\n  0\nend",
      php: "function solution(int $n) {\n  // implemente Fibonacci\n  return 0;\n}",
      c: "long long solution(long long n) {\n  // implemente Fibonacci\n  return 0;\n}",
      csharp: "static long solution(long n) {\n  // implemente Fibonacci\n  return 0;\n}",
      java: "static long solution(long n) {\n  // implemente Fibonacci\n  return 0;\n}",
      go: "func solution(n int) int {\n  // implemente Fibonacci\n  return 0\n}",
      rust: "fn solution(n: i64) -> i64 {\n  // implemente Fibonacci\n  0\n}",
    }),
  },
  {
    id: "count-vowels",
    title: "Contar vogais",
    difficulty: "easy",
    xp: 30,
    summary: "Conte as vogais (a, e, i, o, u).",
    description:
      "Implemente `solution(s)` que retorna quantas vogais (`a`, `e`, `i`, `o`, `u`) existem em `s`, sem diferenciar maiúsculas de minúsculas.\n\nExemplo: `solution(\"hello\")` → `2`.",
    tests: [
      { args: ["hello"], expected: 2 },
      { args: ["aeiou"], expected: 5 },
      { args: ["xyz"], expected: 0 },
      { args: ["HELLO"], expected: 2 },
      { args: ["programacao"], expected: 5 },
    ],
    starters: starters({
      javascript: "function solution(s) {\n  // conte as vogais\n  return 0;\n}",
      typescript: "function solution(s: string): number {\n  // conte as vogais\n  return 0;\n}",
      python: "def solution(s):\n    # conte as vogais\n    return 0",
      ruby: "def solution(s)\n  # conte as vogais\n  0\nend",
      php: "function solution($s) {\n  // conte as vogais\n  return 0;\n}",
      c: "long long solution(const char* s) {\n  // conte as vogais\n  return 0;\n}",
      csharp: "static long solution(string s) {\n  // conte as vogais\n  return 0;\n}",
      java: "static long solution(String s) {\n  // conte as vogais\n  return 0;\n}",
      go: "func solution(s string) int {\n  // conte as vogais\n  return 0\n}",
      rust: "fn solution(s: &str) -> i64 {\n  // conte as vogais\n  0\n}",
    }),
  },
  {
    id: "max-of-array",
    title: "Maior elemento do array",
    difficulty: "medium",
    xp: 50,
    summary: "Retorne o maior valor do array.",
    description:
      "Implemente `solution(arr)` que retorna o maior valor presente no array (o array nunca é vazio).\n\nEm linguagens compiladas, assinaturas variam (ex.: em C, recebe o array e o tamanho `n`). Exemplo: `solution([3, 1, 4, 1, 5])` → `5`.",
    tests: [
      { args: [[1, 2, 3]], expected: 3 },
      { args: [[-5, -1, -9]], expected: -1 },
      { args: [[7]], expected: 7 },
      { args: [[3, 1, 4, 1, 5, 9, 2, 6]], expected: 9 },
      { args: [[10, 20, 30, 20, 10]], expected: 30 },
    ],
    starters: starters({
      javascript: "function solution(arr) {\n  // retorne o maior valor\n  return 0;\n}",
      typescript: "function solution(arr: number[]): number {\n  // retorne o maior valor\n  return 0;\n}",
      python: "def solution(arr):\n    # retorne o maior valor\n    return 0",
      ruby: "def solution(arr)\n  # retorne o maior valor\n  0\nend",
      php: "function solution(array $arr) {\n  // retorne o maior valor\n  return 0;\n}",
      c: "long long solution(long long* a, long long n) {\n  // retorne o maior valor\n  return a[0];\n}",
      csharp: "static long solution(long[] a) {\n  // retorne o maior valor\n  return a[0];\n}",
      java: "static long solution(long[] a) {\n  // retorne o maior valor\n  return a[0];\n}",
      go: "func solution(a []int) int {\n  // retorne o maior valor\n  return a[0]\n}",
      rust: "fn solution(a: Vec<i64>) -> i64 {\n  // retorne o maior valor\n  a[0]\n}",
    }),
  },
  {
    id: "is-prime",
    title: "Número primo",
    difficulty: "medium",
    xp: 50,
    summary: "Verifique se o número é primo.",
    description:
      "Implemente `solution(n)` que retorna `true` se `n` é primo (divisível apenas por 1 e por ele mesmo). Considere `n >= 2`.\n\nExemplo: `solution(17)` → `true`, `solution(9)` → `false`.",
    tests: [
      { args: [2], expected: true },
      { args: [3], expected: true },
      { args: [4], expected: false },
      { args: [9], expected: false },
      { args: [17], expected: true },
      { args: [20], expected: false },
    ],
    starters: starters({
      javascript: "function solution(n) {\n  // verifique se é primo\n  return false;\n}",
      typescript: "function solution(n: number): boolean {\n  // verifique se é primo\n  return false;\n}",
      python: "def solution(n):\n    # verifique se é primo\n    return False",
      ruby: "def solution(n)\n  # verifique se é primo\n  false\nend",
      php: "function solution(int $n) {\n  // verifique se é primo\n  return false;\n}",
      c: "int solution(long long n) {\n  // verifique se é primo\n  return 0;\n}",
      csharp: "static bool solution(long n) {\n  // verifique se é primo\n  return false;\n}",
      java: "static boolean solution(long n) {\n  // verifique se é primo\n  return false;\n}",
      go: "func solution(n int) bool {\n  // verifique se é primo\n  return false\n}",
      rust: "fn solution(n: i64) -> bool {\n  // verifique se é primo\n  false\n}",
    }),
  },
  {
    id: "reverse-string",
    title: "Inverter string",
    difficulty: "easy",
    xp: 30,
    summary: "Retorne a string invertida.",
    description:
      "Implemente `solution(s)` que retorna a string `s` invertida.\n\nEm C, retorne um ponteiro para uma área estática (ex.: um buffer `static` preenchido por você). Exemplo: `solution(\"hello\")` → `\"olleh\"`.",
    tests: [
      { args: ["abc"], expected: "cba" },
      { args: ["hello"], expected: "olleh" },
      { args: ["a"], expected: "a" },
      { args: [""], expected: "" },
      { args: ["banana"], expected: "ananab" },
    ],
    starters: starters({
      javascript: "function solution(s) {\n  // retorne a string invertida\n  return s;\n}",
      typescript: "function solution(s: string): string {\n  // retorne a string invertida\n  return s;\n}",
      python: "def solution(s):\n    # retorne a string invertida\n    return s",
      ruby: "def solution(s)\n  # retorne a string invertida\n  s\nend",
      php: "function solution($s) {\n  // retorne a string invertida\n  return $s;\n}",
      c: "const char* solution(const char* s) {\n  // use um buffer static e retorne-o\n  return s;\n}",
      csharp: "static string solution(string s) {\n  // retorne a string invertida\n  return s;\n}",
      java: "static String solution(String s) {\n  // retorne a string invertida\n  return s;\n}",
      go: "func solution(s string) string {\n  // retorne a string invertida\n  return s\n}",
      rust: "fn solution(s: &str) -> String {\n  // retorne a string invertida\n  s.to_string()\n}",
    }),
  },
];

// ---------------------------------------------------------------- runner

function parseRunOutput(stdout) {
  const tests = [];
  for (const line of stdout.split("\n")) {
    const tl = line.trim();
    if (!tl.startsWith("__TEST__")) continue;
    const rest = tl.slice(9).trim();
    if (rest.startsWith("PASS")) {
      tests.push({ passed: true });
    } else if (rest.startsWith("FAIL")) {
      const body = rest.slice(4).trim();
      const m = body.match(/^input=(.*?) got=(.*)$/);
      if (m) {
        let input = null;
        try {
          input = JSON.parse(m[1]);
        } catch {
          input = m[1];
        }
        tests.push({ passed: false, input, got: m[2] });
      } else {
        tests.push({ passed: false, input: null, got: body });
      }
    } else if (rest.startsWith("ERROR")) {
      tests.push({ passed: false, error: rest.slice(5).trim() });
    }
  }
  const passed = tests.filter((t) => t.passed).length;
  return { passed, total: tests.length, tests };
}

export async function listChallenges() {
  const avail = await availableLanguages();
  return CHALLENGES.map((c) => ({
    id: c.id,
    title: c.title,
    difficulty: c.difficulty,
    xp: c.xp,
    summary: c.summary,
    languages: Object.keys(c.starters).filter((l) => avail.has(l)),
  }));
}

let availCache = null;
let availAt = 0;

async function availableLanguages() {
  const now = Date.now();
  if (!availCache || now - availAt > 30_000) {
    const list = await getRuntimesList();
    availCache = new Set(list.map((r) => r.language));
    availAt = now;
  }
  return availCache;
}

export function getChallenge(id) {
  return CHALLENGES.find((c) => c.id === id) || null;
}

export async function challengeDetail(id) {
  const c = getChallenge(id);
  if (!c) return null;
  const avail = await availableLanguages();
  return {
    id: c.id,
    title: c.title,
    difficulty: c.difficulty,
    xp: c.xp,
    summary: c.summary,
    description: c.description,
    testsCount: c.tests.length,
    starters: c.starters,
    languages: Object.keys(c.starters).filter((l) => avail.has(l)),
  };
}

export async function runChallenge({ language, code, challenge }) {
  const builder = builders[language];
  if (!builder) throw new Error("Linguagem não suportada para desafios.");
  if (typeof code !== "string" || !code.trim()) throw new Error("Código vazio.");
  if (code.length > MAX_CODE) throw new Error(`Código muito longo (máx. ${MAX_CODE} caracteres).`);

  const rt = await resolveRuntime(language);
  if (!rt) throw new Error(`Runtime "${language}" indisponível no executor.`);

  const { source } = builder(code.trim(), challenge.tests);
  const data = await execute({
    ...rt,
    content: source,
    runTimeout: 6000,
    compileTimeout: 15000,
  });

  const compile = data.compile;
  if (compile && Number(compile.code) !== 0) {
    return {
      status: "compile_error",
      passed: 0,
      total: 0,
      tests: [],
      detail: truncate((compile.stderr || compile.output || "").trim(), 4000),
    };
  }

  const run = data.run || {};
  const stdout = run.stdout || "";
  const parsed = parseRunOutput(stdout);

  if (parsed.total === 0) {
    const stderr = (run.stderr || "").trim();
    const detail = truncate((stderr || stdout || "Sem saída.").trim(), 4000);
    if (Number(run.code) !== 0) {
      return { status: "runtime_error", passed: 0, total: 0, tests: [], detail };
    }
    return { status: "error", passed: 0, total: 0, tests: [], detail };
  }

  return { status: "ok", ...parsed };
}
