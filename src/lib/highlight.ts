/**
 * A small, dependency-free syntax highlighter.
 *
 * Shiki and Prism were both considered and rejected on size: this app already
 * fights for its bundle (react-icons alone cost 4s before optimizePackageImports,
 * and docx/exceljs/jszip are all dynamically imported to stay out of the initial
 * chunks). A highlighter that only has to cover the handful of languages the
 * tools actually emit fits in a few hundred bytes of regex.
 *
 * It is a tokenizer, not a parser. It will not resolve every ambiguity — a `/`
 * that starts a regex literal versus a division, say — but it is stable, never
 * throws, and degrades to plain text rather than mangling the code.
 */

export type TokenKind =
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "fn"
  | "prop"
  | "punct"
  | "plain";

export interface Token {
  text: string;
  kind: TokenKind;
}

const JS_WORDS = new Set([
  "const","let","var","function","return","if","else","for","while","do","break",
  "continue","new","class","extends","super","this","import","from","export",
  "default","async","await","try","catch","finally","throw","typeof","instanceof",
  "in","of","delete","void","yield","switch","case","interface","type","enum",
  "implements","public","private","protected","readonly","static","as","satisfies",
  "true","false","null","undefined","NaN",
]);

const PY_WORDS = new Set([
  "def","class","return","if","elif","else","for","while","break","continue",
  "import","from","as","try","except","finally","raise","with","lambda","yield",
  "global","nonlocal","pass","assert","del","and","or","not","is","in","async",
  "await","True","False","None","self",
]);

const SH_WORDS = new Set([
  "if","then","else","elif","fi","for","while","do","done","case","esac","in",
  "function","return","export","local","set","echo","cd","exit","source","curl",
  "npm","node","git","docker","sudo","apt","brew","mkdir","rm","cp","mv","cat",
]);

const SQL_WORDS = new Set([
  "select","from","where","insert","into","values","update","set","delete","create",
  "table","alter","drop","index","join","left","right","inner","outer","on","group",
  "by","order","having","limit","offset","as","and","or","not","null","primary","key",
  "foreign","references","distinct","union","all","case","when","then","end",
]);

const CSS_WORDS = new Set(["important", "media", "supports", "keyframes", "import", "root"]);

interface Spec {
  words: Set<string>;
  /** Line-comment opener. */
  line: string;
  block: boolean;
  /** Case-insensitive keyword matching (SQL). */
  fold?: boolean;
}

function specFor(lang: string): Spec {
  const l = lang.toLowerCase();
  if (/^(py|python)$/.test(l)) return { words: PY_WORDS, line: "#", block: false };
  if (/^(sh|bash|zsh|shell|console|terminal)$/.test(l))
    return { words: SH_WORDS, line: "#", block: false };
  if (/^(sql|postgres|postgresql|mysql|sqlite)$/.test(l))
    return { words: SQL_WORDS, line: "--", block: true, fold: true };
  if (/^(css|scss|less)$/.test(l)) return { words: CSS_WORDS, line: "//", block: true };
  if (/^(rb|ruby)$/.test(l)) return { words: PY_WORDS, line: "#", block: false };
  if (/^(yml|yaml|toml|ini|dockerfile|conf)$/.test(l))
    return { words: new Set(["true", "false", "null"]), line: "#", block: false };
  // json, js, ts, tsx, jsx, go, rust, java, c, and anything unrecognised
  return { words: JS_WORDS, line: "//", block: true };
}

/** Escapes a string for embedding in a RegExp. */
function esc(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Splits source into coloured tokens. Order inside the alternation matters:
 * comments and strings must win over everything else, or a `#` inside a quoted
 * string would swallow the rest of the line.
 */
export function highlight(code: string, lang: string): Token[] {
  const spec = specFor(lang);
  const line = esc(spec.line);

  const parts = [
    // comments
    spec.block ? `(${line}[^\\n]*|/\\*[\\s\\S]*?\\*/)` : `(${line}[^\\n]*)`,
    // strings, including python triple quotes and shell/JS templates
    `("""[\\s\\S]*?"""|'''[\\s\\S]*?'''|\`(?:\\\\.|[^\`\\\\])*\`|"(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*')`,
    // numbers
    `(\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b)`,
    // identifier immediately followed by "(" -> a call
    `([A-Za-z_$][\\w$-]*)(?=\\s*\\()`,
    // bare identifier
    `([A-Za-z_$@][\\w$-]*)`,
    // punctuation and operators
    `([{}()[\\];:,.<>=!+\\-*/%&|^~?]+)`,
  ];

  const re = new RegExp(parts.join("|"), "g");
  const out: Token[] = [];
  let last = 0;

  const push = (text: string, kind: TokenKind) => {
    if (text) out.push({ text, kind });
  };

  for (let m = re.exec(code); m; m = re.exec(code)) {
    if (m.index > last) push(code.slice(last, m.index), "plain");
    last = m.index + m[0].length;

    const [, comment, str, num, call, word, punct] = m;

    if (comment !== undefined) push(comment, "comment");
    else if (str !== undefined) {
      // In JSON and object literals a quoted key reads better as a property.
      const after = code.slice(last).match(/^\s*:/);
      push(str, after ? "prop" : "string");
    } else if (num !== undefined) push(num, "number");
    else if (call !== undefined) {
      const key = spec.fold ? call.toLowerCase() : call;
      push(call, spec.words.has(key) ? "keyword" : "fn");
    } else if (word !== undefined) {
      const key = spec.fold ? word.toLowerCase() : word;
      push(word, spec.words.has(key) ? "keyword" : "plain");
    } else if (punct !== undefined) push(punct, "punct");
  }

  if (last < code.length) push(code.slice(last), "plain");
  return out;
}

/** Token kind -> the CSS custom property that colours it. */
export const TOKEN_VAR: Record<TokenKind, string> = {
  comment: "var(--sx-comment)",
  string: "var(--sx-string)",
  number: "var(--sx-number)",
  keyword: "var(--sx-keyword)",
  fn: "var(--sx-fn)",
  prop: "var(--sx-prop)",
  punct: "var(--sx-punct)",
  plain: "var(--sx-plain)",
};
