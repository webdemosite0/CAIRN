"use client";

/**
 * Writes a real .pptx by hand.
 *
 * A presentation is an OOXML package — a zip of XML parts — and jszip is
 * already a dependency, so building it directly avoids pulling in a large
 * slide library for what is ultimately title-and-bullets layout. Everything
 * here is the minimum PowerPoint, Keynote and Google Slides all accept: a
 * theme, one master, one layout, and a part per slide.
 *
 * Sizes are in EMU (914400 per inch); the deck is 16:9 at 13.333 x 7.5in.
 */

import type { Slide } from "@/lib/slides";

const W = 12192000;
const H = 6858000;

/** XML text escaping. Ampersand first, or it double-escapes the others. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Control characters are not legal in XML 1.0 and make the file unopenable.
    .replace(CTRL, "");
}

/** XML 1.0 forbids these; tab, LF and CR are the only legal control chars. */
const CTRL = new RegExp("[\u0000-\u0008\u000B\u000C\u000E-\u001F]", "g");

const DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS_P =
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

function contentTypes(count: number): string {
  const slides = Array.from(
    { length: count },
    (_, i) =>
      `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
  ).join("");
  return `${DECL}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slides}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
}

const ROOT_RELS = `${DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;

function presentation(count: number): string {
  // Slides take rId2.., leaving rId1 for the master and the last for the theme.
  const ids = Array.from(
    { length: count },
    (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`,
  ).join("");
  return `${DECL}<p:presentation ${NS_P} saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${ids}</p:sldIdLst><p:sldSz cx="${W}" cy="${H}"/><p:notesSz cx="${H}" cy="${W}"/></p:presentation>`;
}

function presentationRels(count: number): string {
  const slides = Array.from(
    { length: count },
    (_, i) =>
      `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`,
  ).join("");
  return `${DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${slides}<Relationship Id="rId${count + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/></Relationships>`;
}

/** One accent-on-dark theme. PowerPoint requires all twelve colour slots. */
function theme(): string {
  const font = (tag: string, face: string) =>
    `<a:${tag}><a:latin typeface="${face}"/><a:ea typeface=""/><a:cs typeface=""/></a:${tag}>`;
  const fill =
    '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
  const line = `<a:ln w="9525" cap="flat" cmpd="sng" algn="ctr">${fill}<a:prstDash val="solid"/></a:ln>`;
  return `${DECL}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Trove"><a:themeElements><a:clrScheme name="Trove"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="0B1020"/></a:dk2><a:lt2><a:srgbClr val="F4F6FB"/></a:lt2><a:accent1><a:srgbClr val="3868EB"/></a:accent1><a:accent2><a:srgbClr val="6048E8"/></a:accent2><a:accent3><a:srgbClr val="1C96EB"/></a:accent3><a:accent4><a:srgbClr val="7DCFFF"/></a:accent4><a:accent5><a:srgbClr val="A78BFA"/></a:accent5><a:accent6><a:srgbClr val="34D399"/></a:accent6><a:hlink><a:srgbClr val="3868EB"/></a:hlink><a:folHlink><a:srgbClr val="6048E8"/></a:folHlink></a:clrScheme><a:fontScheme name="Trove">${font("majorFont", "Segoe UI Semibold")}${font("minorFont", "Segoe UI")}</a:fontScheme><a:fmtScheme name="Trove"><a:fillStyleLst>${fill}${fill}${fill}</a:fillStyleLst><a:lnStyleLst>${line}${line}${line}</a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst>${fill}${fill}${fill}</a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`;
}

const EMPTY_SPTREE =
  '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>';

function slideMaster(): string {
  return `${DECL}<p:sldMaster ${NS_P}>${EMPTY_SPTREE}<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`;
}

const MASTER_RELS = `${DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`;

function slideLayout(): string {
  return `${DECL}<p:sldLayout ${NS_P} type="blank" preserve="1">${EMPTY_SPTREE}</p:sldLayout>`;
}

const LAYOUT_RELS = `${DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`;

const SLIDE_RELS = `${DECL}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`;

/** A text box. `size` is points; DrawingML wants hundredths. */
function textBox(
  id: number,
  name: string,
  x: number,
  y: number,
  cx: number,
  cy: number,
  paras: string,
): string {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0"><a:normAutofit/></a:bodyPr><a:lstStyle/>${paras}</p:txBody></p:sp>`;
}

function para(
  text: string,
  size: number,
  color: string,
  opts: { bold?: boolean; bullet?: boolean; spaceBefore?: number } = {},
): string {
  const marker = opts.bullet
    ? `<a:buClr><a:srgbClr val="3868EB"/></a:buClr><a:buChar char="●"/>`
    : "<a:buNone/>";
  const indent = opts.bullet ? ' marL="342900" indent="-342900"' : "";
  const before = opts.spaceBefore
    ? `<a:spcBef><a:spcPts val="${Math.round(opts.spaceBefore * 100)}"/></a:spcBef>`
    : "";
  return `<a:p><a:pPr${indent}>${before}<a:lnSpc><a:spcPct val="115000"/></a:lnSpc>${marker}</a:pPr><a:r><a:rPr lang="en-US" sz="${Math.round(size * 100)}" b="${opts.bold ? 1 : 0}" dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Segoe UI"/></a:rPr><a:t>${esc(text)}</a:t></a:r></a:p>`;
}

function slideXml(s: Slide, index: number, total: number): string {
  const M = 838200; // 0.92in margin
  const shapes: string[] = [];
  let id = 2;

  // A thin accent rule above the title, so an exported slide still looks
  // designed rather than like a plain text dump.
  shapes.push(
    `<p:sp><p:nvSpPr><p:cNvPr id="${id++}" name="Rule"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${M}" y="${Math.round(H * 0.17)}"/><a:ext cx="640080" cy="45720"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="3868EB"/></a:solidFill></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>`,
  );

  const titleOnly = !s.bullets.length;
  shapes.push(
    textBox(
      id++,
      "Title",
      M,
      Math.round(H * 0.23),
      W - M * 2,
      Math.round(H * (titleOnly ? 0.4 : 0.22)),
      para(s.title || `Slide ${index + 1}`, titleOnly ? 44 : 34, "0B1020", {
        bold: true,
      }),
    ),
  );

  if (s.bullets.length) {
    shapes.push(
      textBox(
        id++,
        "Body",
        M,
        Math.round(H * 0.42),
        W - M * 2,
        Math.round(H * 0.44),
        s.bullets
          .map((b) => para(b, 19, "3C4257", { bullet: true, spaceBefore: 9 }))
          .join(""),
      ),
    );
  }

  // Slide number, bottom right.
  shapes.push(
    textBox(
      id++,
      "Number",
      W - M - 914400,
      H - Math.round(H * 0.11),
      914400,
      274320,
      `<a:p><a:pPr algn="r"><a:buNone/></a:pPr><a:r><a:rPr lang="en-US" sz="1100" dirty="0"><a:solidFill><a:srgbClr val="8A90A0"/></a:solidFill><a:latin typeface="Segoe UI"/></a:rPr><a:t>${index + 1} / ${total}</a:t></a:r></a:p>`,
    ),
  );

  return `${DECL}<p:sld ${NS_P}><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shapes.join("")}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

function docProps(title: string, count: number) {
  const core = `${DECL}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(title)}</dc:title><dc:creator>Trove</dc:creator><cp:lastModifiedBy>Trove</cp:lastModifiedBy></cp:coreProperties>`;
  const app = `${DECL}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Trove</Application><Slides>${count}</Slides></Properties>`;
  return { core, app };
}

/** Builds the package. Exported separately so it can be tested without a DOM. */
export async function buildPptx(slides: Slide[], title: string): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const n = slides.length;

  zip.file("[Content_Types].xml", contentTypes(n));
  zip.file("_rels/.rels", ROOT_RELS);

  const { core, app } = docProps(title, n);
  zip.file("docProps/core.xml", core);
  zip.file("docProps/app.xml", app);

  zip.file("ppt/presentation.xml", presentation(n));
  zip.file("ppt/_rels/presentation.xml.rels", presentationRels(n));
  zip.file("ppt/theme/theme1.xml", theme());
  zip.file("ppt/slideMasters/slideMaster1.xml", slideMaster());
  zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", MASTER_RELS);
  zip.file("ppt/slideLayouts/slideLayout1.xml", slideLayout());
  zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels", LAYOUT_RELS);

  slides.forEach((s, i) => {
    zip.file(`ppt/slides/slide${i + 1}.xml`, slideXml(s, i, n));
    zip.file(`ppt/slides/_rels/slide${i + 1}.xml.rels`, SLIDE_RELS);
  });

  return zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    compression: "DEFLATE",
  });
}

export async function downloadPptx(
  slides: Slide[],
  filename = "deck.pptx",
  title = "Deck",
) {
  if (!slides.length) return;
  const blob = await buildPptx(slides, title);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
