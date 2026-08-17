"use client";

import { useMemo, useState } from "react";
import {
  FiDownload,
  FiRotateCcw,
  FiAlertCircle,
  FiPlus,
  FiLoader,
} from "react-icons/fi";
import { Bot } from "@/components/agents/bot";
import {
  downloadCsv,
  downloadXlsx,
  parseMarkdownTable,
} from "@/lib/export";
import { Ico } from "@/components/ui/ico";
import { Composer } from "@/components/chat/composer";
import { strip, type Attachment } from "@/lib/attachments";
import { Recents } from "@/components/ui/recents";
import type { Recent } from "@/lib/recents";
import { useRouter } from "next/navigation";
import { useSaved } from "@/lib/use-saved";
import { Cell } from "@/components/sheets/cell";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "A 12-month SaaS revenue forecast",
  "A sprint capacity planner for six engineers",
  "A cloud cost breakdown by service",
];

/** Anything the model wrote outside the table — usually the formula list. */
function notesFrom(raw: string) {
  return raw
    .split("\n")
    .filter((l) => !l.trim().startsWith("|"))
    .join("\n")
    .trim();
}

function columnLabel(i: number) {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

export function SpreadsheetView({
  recents = [],
  recentsLabel = "Recents",
  restored = null,
}: {
  recents?: Recent[];
  recentsLabel?: string;
  restored?: { id: string; title: string; output: string } | null;
}) {
  const router = useRouter();
  const { save, reset } = useSaved("sheets", restored?.id ?? null);
  const [prompt, setPrompt] = useState(restored?.title ?? "");
  // The saved artefact is the raw markdown table, re-parsed on open — storing
  // the grid itself would freeze it in whatever shape the parser had that day.
  const [rows, setRows] = useState<string[][]>(() =>
    restored?.output ? parseMarkdownTable(restored.output) : [],
  );
  const [notes, setNotes] = useState(() => notesFrom(restored?.output ?? ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);

  const cols = useMemo(
    () => rows.reduce((m, r) => Math.max(m, r.length), 0),
    [rows],
  );

  /**
   * Which columns hold labels rather than prose or figures — assignees,
   * statuses, owners, categories. Those render as coloured pills.
   *
   * The test is behavioural, not name-based: short values that repeat across
   * rows and are not numbers or dates. A column of unique sentences is prose;
   * a column of five names used twelve times is a category.
   */
  const tagCols = useMemo(() => {
    const body = rows.slice(1);
    const out = new Set<number>();
    if (body.length < 3) return out;

    for (let c = 0; c < cols; c++) {
      const vals = body.map((r) => (r[c] ?? "").trim()).filter(Boolean);
      if (vals.length < Math.max(3, body.length * 0.6)) continue;
      const tooLong = vals.some((v) => v.length > 24);
      const numeric = vals.filter((v) => /^[\d$£€,.\-+%\s/]+$/.test(v)).length;
      const dateish = vals.filter((v) =>
        /^\d{1,4}[-/ ]|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(v),
      ).length;
      if (tooLong) continue;
      if (numeric > vals.length * 0.4) continue;
      if (dateish > vals.length * 0.4) continue;

      const unique = new Set(vals.map((v) => v.toLowerCase())).size;
      // repeats are what make it a category rather than a list of one-offs
      if (unique <= Math.max(2, Math.ceil(vals.length * 0.6))) out.add(c);
    }
    return out;
  }, [rows, cols]);

  async function run(text: string, attachments?: Attachment[]) {
    if (!text.trim()) return;
    setPrompt(text);
    setBusy(true);
    setError(null);
    setRows([]);
    setNotes("");

    try {
      const res = await fetch("/api/tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "sheets",
          prompt: text,
          attachments: strip(attachments),
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Failed (${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setRows(parseMarkdownTable(acc));
      }

      const table = parseMarkdownTable(acc);
      setRows(table);
      // Anything after the table is formula/explanation text.
      setNotes(notesFrom(acc));

      if (table.length === 0) {
        setError("The model did not return a table. Try rephrasing.");
      }
      void save(
        [
          { role: "user", text },
          { role: "model", text: acc },
        ],
        text,
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function edit(r: number, c: number, value: string) {
    setRows((prev) => {
      const next = prev.map((row) => [...row]);
      while (next[r].length <= c) next[r].push("");
      next[r][c] = value;
      return next;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, Array.from({ length: cols || 1 }, () => "")]);
  }

  /* ---------------- idle ---------------- */

  if (!prompt) {
    return (
      <div className="nx-in mx-auto flex min-h-screen max-w-[760px] flex-col justify-center px-5 py-16">
        <div className="mb-7 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[16px] bg-positive/15 text-positive">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
            </svg>
          </span>
          <h1 className="text-[27px] font-semibold text-ink">Spreadsheets</h1>
          <p className="mt-1.5 text-[14.5px] text-ink-3">
            A real grid you can edit, then export to Excel.
          </p>
        </div>

        <Composer onSend={run} placeholder="Build a spreadsheet for…" autoFocus />

        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {EXAMPLES.map((e, i) => (
            <button
              key={e}
              onClick={() => run(e)}
              className="chip group nx-in"
              style={{ animationDelay: `${80 + i * 50}ms`, animationFillMode: "backwards" }}
            >
              {e}
            </button>
          ))}
        </div>

        <Recents className="mt-10" label={recentsLabel} items={recents} onPick={run} />
      </div>
    );
  }

  /* ---------------- grid ---------------- */

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 lg:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] uppercase tracking-[0.08em] text-ink-4">Spreadsheets</p>
          <h1 className="truncate text-[15px] font-medium text-ink">{prompt}</h1>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => downloadXlsx(rows, "cairn-sheet.xlsx")}
            disabled={!rows.length}
            className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-40"
          >
            <Ico icon={FiDownload} motion="lift" size={13} /> Excel
          </button>
          <button
            onClick={() => downloadCsv(rows, "cairn-sheet.csv")}
            disabled={!rows.length}
            className="chip group !px-3 !py-1.5 !text-[12.5px] disabled:opacity-40"
          >
            <Ico icon={FiDownload} motion="lift" size={13} /> CSV
          </button>
          <button
            onClick={() => {
              setPrompt("");
              setRows([]);
              setNotes("");
              setError(null);
              reset();
            }}
            className="chip group !px-3 !py-1.5 !text-[12.5px]"
          >
            <Ico icon={FiRotateCcw} motion="spin" size={13} /> New
          </button>
        </div>
      </header>

      {busy && rows.length === 0 ? (
        <div className="flex items-center gap-3.5 px-6 py-6">
          <Bot size={38} accent="#34d399" state="working" />
          <span className="nx-dots text-[14px] text-ink-2">Building the table</span>
        </div>
      ) : null}

      {error ? (
        <div className="mx-5 mt-4 flex items-start gap-2.5 rounded-[12px] border border-critical/30 bg-critical/10 px-4 py-3">
          <Ico icon={FiAlertCircle} motion="pop" size={15} className="mt-0.5 shrink-0 text-critical" />
          <div>
            <p className="text-[13.5px] text-ink-2">{error}</p>
            <button
              onClick={() => run(prompt)}
              className="mt-1.5 text-[12.5px] text-critical hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="flex-1 overflow-auto p-5">
          <div className="panel inline-block min-w-full overflow-hidden !p-0">
            <table className="border-collapse font-sans text-[13px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 w-12 border-b border-r border-line bg-sunk px-2 py-2 text-[11px] font-medium text-ink-4" />
                  {Array.from({ length: cols }, (_, c) => (
                    <th
                      key={c}
                      className="min-w-[150px] border-b border-line bg-sunk px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-ink-4"
                    >
                      {/* The model's own header row is the useful label; the
                          A/B/C spreadsheet letters are the fallback. */}
                      {rows[0]?.[c]?.trim() || columnLabel(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, i) => {
                  const r = i + 1;
                  return (
                    <tr key={r} className="group/row transition-colors hover:bg-hover/60">
                      <td className="sticky left-0 z-10 border-b border-r border-line bg-rail px-2 py-[7px] text-center text-[11px] tabular-nums text-ink-4 group-hover/row:text-ink-3">
                        {r}
                      </td>
                      {Array.from({ length: cols }, (_, c) => {
                        const active = selected?.r === r && selected?.c === c;
                        return (
                          <td
                            key={c}
                            className={cn(
                              "relative border-b border-line p-0",
                              active &&
                                "z-10 outline outline-2 -outline-offset-1 outline-accent",
                            )}
                          >
                            <Cell
                              value={row[c] ?? ""}
                              header={false}
                              tag={tagCols.has(c)}
                              active={active}
                              label={`${rows[0]?.[c] ?? columnLabel(c)}, row ${r}`}
                              onChange={(v) => edit(r, c, v)}
                              onFocus={() => setSelected({ r, c })}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            onClick={addRow}
            className="mt-2.5 flex items-center gap-1.5 rounded-[8px] border border-dashed border-line-strong px-3 py-1.5 text-[12.5px] text-ink-3 hover:text-ink"
          >
            <Ico icon={FiPlus} motion="open" size={13} /> Add row
          </button>

          {notes ? (
            <div className="mt-6 max-w-[680px] rounded-[12px] border border-line bg-rail p-4">
              <p className="mb-2 text-[11.5px] uppercase tracking-[0.08em] text-ink-4">
                Formulas & notes
              </p>
              <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-ink-2">
                {notes}
              </pre>
            </div>
          ) : null}

          <p className="mt-4 text-[12px] text-ink-4">
            {rows.length} rows · {cols} columns · cells are editable, and edits are
            included in the export.
          </p>
        </div>
      ) : null}

      {busy && rows.length > 0 ? (
        <div className="flex items-center gap-2 px-5 pb-4">
          <Ico icon={FiLoader} motion="spin" size={13} className="animate-spin text-ink-3" />
          <span className="text-[12.5px] text-ink-3">Still filling rows…</span>
        </div>
      ) : null}
    </div>
  );
}
