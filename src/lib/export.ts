"use client";

/** Client-side file exports. Libraries are imported lazily so they stay out of
 *  the initial bundle. */

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Word                                                                */
/* ------------------------------------------------------------------ */

/** Converts the markdown subset the model emits into a real .docx. */
export async function downloadDocx(markdown: string, filename = "document.docx") {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [];
  const lines = markdown.split("\n");
  let inCode = false;
  let codeBuffer: string[] = [];

  const flushCode = () => {
    if (!codeBuffer.length) return;
    for (const c of codeBuffer) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: c || " ", font: "Consolas", size: 20 })],
          shading: { fill: "F2F2F2" },
          spacing: { before: 0, after: 0 },
        }),
      );
    }
    codeBuffer = [];
  };

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      if (inCode) flushCode();
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = [
        HeadingLevel.HEADING_1,
        HeadingLevel.HEADING_2,
        HeadingLevel.HEADING_3,
        HeadingLevel.HEADING_4,
      ][h[1].length - 1];
      children.push(
        new Paragraph({ text: h[2].replace(/\*\*/g, ""), heading: level }),
      );
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      children.push(
        new Paragraph({ text: bullet[1].replace(/\*\*/g, ""), bullet: { level: 0 } }),
      );
      continue;
    }

    const numbered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (numbered) {
      children.push(
        new Paragraph({
          text: numbered[1].replace(/\*\*/g, ""),
          numbering: { reference: "nx-numbering", level: 0 },
        }),
      );
      continue;
    }

    if (!line.trim()) {
      children.push(new Paragraph({ text: "" }));
      continue;
    }

    // Bold runs within a paragraph.
    const runs: InstanceType<typeof TextRun>[] = [];
    for (const part of line.split(/(\*\*[^*]+\*\*)/)) {
      if (!part) continue;
      runs.push(
        part.startsWith("**")
          ? new TextRun({ text: part.slice(2, -2), bold: true })
          : new TextRun({ text: part }),
      );
    }
    children.push(new Paragraph({ children: runs }));
  }

  flushCode();

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "nx-numbering",
          levels: [{ level: 0, format: "decimal", text: "%1.", alignment: "start" }],
        },
      ],
    },
    sections: [{ children }],
  });

  save(await Packer.toBlob(doc), filename);
}

export function downloadMarkdown(text: string, filename = "document.md") {
  save(new Blob([text], { type: "text/markdown;charset=utf-8" }), filename);
}

/* ------------------------------------------------------------------ */
/* Spreadsheet                                                         */
/* ------------------------------------------------------------------ */

export async function downloadXlsx(
  rows: string[][],
  filename = "sheet.xlsx",
  sheetName = "Sheet1",
) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);

  rows.forEach((r, i) => {
    // Numbers become real numeric cells so Excel can sum them.
    const row = ws.addRow(
      r.map((cell) => {
        const clean = cell.replace(/,/g, "").trim();
        return clean !== "" && !Number.isNaN(Number(clean)) ? Number(clean) : cell;
      }),
    );
    if (i === 0) {
      row.font = { bold: true };
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEFEFEF" },
      };
    }
  });

  ws.columns.forEach((col) => {
    let width = 12;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      width = Math.max(width, String(cell.value ?? "").length + 4);
    });
    col.width = Math.min(width, 48);
  });

  const buf = await wb.xlsx.writeBuffer();
  save(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

export function downloadCsv(rows: string[][], filename = "sheet.csv") {
  const csv = rows
    .map((r) =>
      r
        .map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c))
        .join(","),
    )
    .join("\n");
  save(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

/** Pulls the first markdown table out of model output into a row matrix. */
export function parseMarkdownTable(text: string): string[][] {
  const lines = text.split("\n");
  const rows: string[][] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      if (rows.length) break; // table ended
      continue;
    }
    if (/^\|[\s:|-]+\|$/.test(trimmed)) continue; // separator row

    rows.push(
      trimmed
        .slice(1, trimmed.endsWith("|") ? -1 : undefined)
        // Unescaped pipes only. A cell containing a pipe is written `\|` in
        // markdown — by toMarkdownTable, and by models often enough — and
        // splitting on it regardless shifted every later cell in that row one
        // column to the left.
        .split(/(?<!\\)\|/)
        .map((c) => c.trim().replace(/\*\*/g, "").replace(/\\\|/g, "|")),
    );
  }

  return rows;
}

/**
 * A row matrix back into a markdown table — the inverse of
 * parseMarkdownTable.
 *
 * Needed so a follow-up ("add a column for margin") can be given the grid as
 * it stands rather than as the model first wrote it; without it, every edit
 * made since would be silently reverted by the next request.
 *
 * Pipes inside a cell are escaped, since an unescaped one would be read back
 * as a column break and shift the rest of the row along by one.
 */
export function toMarkdownTable(rows: string[][]): string {
  if (!rows.length) return "";

  const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const cell = (v: string | undefined) => (v ?? "").replace(/\|/g, "\\|").trim();
  const line = (r: string[]) =>
    `| ${Array.from({ length: width }, (_, i) => cell(r[i])).join(" | ")} |`;

  return [
    line(rows[0]),
    `| ${Array.from({ length: width }, () => "---").join(" | ")} |`,
    ...rows.slice(1).map(line),
  ].join("\n");
}
