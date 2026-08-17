/** Shared attachment rules — used by both the composer and the API route. */

export interface Attachment {
  name: string;
  mimeType: string;
  size: number;
  /** base64 for binary the model can read, plain text for text files. */
  data: string;
  kind: "image" | "pdf" | "text" | "other";
  /** Object URL for image thumbnails. Client-only, never sent. */
  preview?: string;
}

/** Gemini accepts these inline. */
const IMAGE = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"];
const PDF = "application/pdf";

/** Extensions we can safely read as text even when the browser reports octet-stream. */
const TEXT_EXT =
  /\.(txt|md|markdown|csv|tsv|json|jsonc|ya?ml|toml|ini|env|log|html?|css|scss|less|jsx?|tsx?|mjs|cjs|py|rb|go|rs|java|kt|swift|c|h|cpp|hpp|cs|php|sh|bash|zsh|sql|graphql|xml|svg)$/i;

export const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_TOTAL_BYTES = 16 * 1024 * 1024;
export const MAX_FILES = 6;

export function classify(file: File): Attachment["kind"] {
  if (IMAGE.includes(file.type)) return "image";
  if (file.type === PDF) return "pdf";
  if (file.type.startsWith("text/") || TEXT_EXT.test(file.name)) return "text";
  return "other";
}

export function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Reads a File into the shape the API expects. Throws with a usable message. */
export async function readAttachment(file: File): Promise<Attachment> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `${file.name} is ${humanSize(file.size)} — the limit is ${humanSize(MAX_FILE_BYTES)}.`,
    );
  }

  const kind = classify(file);

  if (kind === "text") {
    const text = await file.text();
    return {
      name: file.name,
      mimeType: file.type || "text/plain",
      size: file.size,
      data: text,
      kind,
    };
  }

  if (kind === "image" || kind === "pdf") {
    const buf = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return {
      name: file.name,
      mimeType: file.type,
      size: file.size,
      data: btoa(binary),
      kind,
      preview: kind === "image" ? URL.createObjectURL(file) : undefined,
    };
  }

  // Anything else: keep the metadata so the model knows it exists, but be
  // honest that the contents were not read.
  return {
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    data: "",
    kind: "other",
  };
}

/**
 * Drops the client-only object URL before sending. `preview` is a blob: URL
 * that means nothing on the server, and shipping it just wastes bytes.
 */
export function strip(attachments?: Attachment[]) {
  if (!attachments?.length) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return attachments.map(({ preview, ...rest }) => rest);
}

/** Turns attachments into Gemini parts. */
export function toParts(attachments: Attachment[]) {
  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [];

  for (const a of attachments) {
    if (a.kind === "image" || a.kind === "pdf") {
      parts.push({ inlineData: { mimeType: a.mimeType, data: a.data } });
      parts.push({ text: `[attached file: ${a.name}]` });
    } else if (a.kind === "text") {
      parts.push({
        text: `[attached file: ${a.name}]\n\`\`\`\n${a.data.slice(0, 200_000)}\n\`\`\``,
      });
    } else {
      parts.push({
        text: `[attached file: ${a.name} (${a.mimeType}, ${humanSize(
          a.size,
        )}) — this format cannot be read, so do not guess at its contents]`,
      });
    }
  }

  return parts;
}
