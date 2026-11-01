// lib-nyandak.js — helpers, palette, cover recipe R4 (dari design-system.md)
const {
  Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  TableLayoutType,
} = require("docx");
const fs = require("fs");

// ── Palet GO-1 (Graphite Orange — proposal/PRD) + token tabel ──
const GO1 = {
  bg: "1A2330", accent: "D4875A",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078" },
  table: { headerBg: "D4875A", headerText: "FFFFFF", accentLine: "D4875A", innerLine: "DDD0C8", surface: "F8F0EB" },
};
// Warna teks bab (heading) — primary gelap; body hitam murni (Profile A)
const INK = { primary: "2C3E50", secondary: "607080", body: "000000", accent: "D4875A" };

// ── Border constants (wajib untuk cover) ──
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

// ── safeText (wajib per common-rules) ──
function safeText(value, placeholder) {
  if (value === undefined || value === null || value === "" || String(value) === "NaN" || String(value) === "undefined") {
    return placeholder || "\u3010Mohon diisi\u3011";
  }
  return String(value);
}

// ── calcTitleLayout (Latin-aware via estimateTextWidth) ──
function estimateTextWidth(text, pt) {
  let width = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    const isCJK = (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x3000 && code <= 0x303f) || (code >= 0xff00 && code <= 0xffef) || (code >= 0x2e80 && code <= 0x2eff);
    width += isCJK ? pt * 20 : pt * 11;
  }
  return width;
}
function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([..."\uFF0C\u3002\u3001\uFF1B\uFF1A\uFF01\uFF1F", ..."-_\u2014\u2013\u00B7/", ..." \t"]);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) {
        if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
      }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) {
    const last = lines.pop();
    lines[lines.length - 1] += last;
  }
  return lines;
}
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  // lebar rata-rata per karakter Latin: pt*11 twips
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / (pt * 11));
  let titlePt = preferredPt, lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3 && lines.every(l => estimateTextWidth(l, titlePt) <= maxWidthTwips)) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    lines = splitTitleLines(title, charsPerLine(minPt));
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}
const emptyPara = () => new Paragraph({ children: [] });

// ── Recipe R4: Top Color Block (proposal / plan / PRD) ──
function buildCoverR4(config) {
  const P = config.palette;
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR;

  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 26);
  const titleSize = titlePt * 2;

  const titleBlockHeight = titleLines.length * (titlePt * 23 + 200);
  const englishLabelH = config.englishLabel ? (9 * 23 + 500) : 0;
  const subtitleH = config.subtitle ? (12 * 23 + 200) : 0;
  const upperContentH = englishLabelH + titleBlockHeight + subtitleH;
  const UPPER_MIN = 7500;
  const UPPER_H = Math.max(UPPER_MIN, upperContentH + 1500 + 800);
  const DIVIDER_H = 60;

  const contentEstimate = englishLabelH + titleBlockHeight + subtitleH;
  const spacerIntrinsic = 280;
  const topSpacing = Math.max(UPPER_H - contentEstimate - spacerIntrinsic - 800, 400);

  const upperBlock = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: UPPER_H, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: P.bg }, borders: noBorders,
        verticalAlign: "top",
        margins: { left: padL, right: padR },
        children: [
          new Paragraph({ spacing: { before: topSpacing } }),
          config.englishLabel ? new Paragraph({
            spacing: { after: 500 },
            children: [new TextRun({ text: config.englishLabel.split("").join(" "),
              size: 18, color: P.accent, font: { ascii: "Calibri" }, characterSpacing: 60 })],
          }) : null,
          ...titleLines.map((line, i) => new Paragraph({
            spacing: { after: i < titleLines.length - 1 ? 100 : 200, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
            children: [new TextRun({ text: line, size: titleSize, bold: true,
              color: P.titleColor, font: { eastAsia: "SimHei", ascii: "Arial" } })],
          })),
          config.subtitle ? new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: config.subtitle, size: 24, color: P.subtitleColor,
              font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
          }) : null,
        ].filter(Boolean),
      })],
    })],
  });

  const divider = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: DIVIDER_H, rule: "exact" },
      children: [new TableCell({ borders: noBorders,
        shading: { type: ShadingType.CLEAR, fill: P.accent }, children: [emptyPara()] })],
    })],
  });

  const lowerContent = [
    new Paragraph({ spacing: { before: 800 } }),
    ...(config.metaLines || []).map(line => new Paragraph({
      indent: { left: padL }, spacing: { after: 100 },
      children: [new TextRun({ text: safeText(line), size: 28, color: P.metaColor,
        font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
    })),
    new Paragraph({ spacing: { before: 2000 } }),
    new Paragraph({
      indent: { left: padL },
      children: [
        new TextRun({ text: config.footerLeft || "", size: 22, color: "909090" }),
        new TextRun({ text: "          " }),
        new TextRun({ text: config.footerRight || "", size: 22, color: "909090" }),
      ],
    }),
  ];

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: "FFFFFF" }, borders: noBorders,
        verticalAlign: "top",
        children: [upperBlock, divider, ...lowerContent],
      })],
    })],
  })];
}

// ── Ukuran PNG dari header IHDR (tanpa dependensi) ──
function pngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// ── Builder konten ──
function h1(num, text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    keepNext: true,
    spacing: { before: 360, after: 200, line: 312 },
    children: [new TextRun({ text: `${num}. ${text}`, bold: true, size: 32, color: INK.primary,
      font: { ascii: "Times New Roman", eastAsia: "SimHei" } })],
  });
}
function h2(num, text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    keepNext: true,
    spacing: { before: 260, after: 130, line: 312 },
    children: [new TextRun({ text: `${num} ${text}`, bold: true, size: 28, color: INK.primary,
      font: { ascii: "Times New Roman", eastAsia: "SimHei" } })],
  });
}
function body(text, opts = {}) {
  const runs = Array.isArray(text) ? text : [new TextRun({ text, size: 24, color: INK.body,
    font: { ascii: "Times New Roman", eastAsia: "SimSun" } })];
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: opts.after !== undefined ? opts.after : 140, line: 312 },
    keepNext: !!opts.keepNext,
    children: runs,
  });
}
function run(text, o = {}) {
  return new TextRun({ text, size: o.size || 24, bold: !!o.bold, italics: !!o.i,
    color: o.color || INK.body, font: { ascii: o.font || "Times New Roman", eastAsia: "SimSun" } });
}

// Tabel gaya Horizontal-Only (bisnis) dengan token GO-1
let tableCounter = 0;
function tableCaption(text) {
  tableCounter += 1;
  return new Paragraph({
    keepNext: true,
    spacing: { before: 200, after: 90, line: 312 },
    children: [new TextRun({ text: `Tabel ${tableCounter}: ${text}`, bold: true, size: 21,
      color: INK.primary, font: { ascii: "Times New Roman", eastAsia: "SimHei" } })],
  });
}
function dataTable(headers, rows, widths) {
  const T = GO1.table;
  const headerRow = new TableRow({
    tableHeader: true, cantSplit: true,
    children: headers.map((text, i) => new TableCell({
      children: [new Paragraph({ spacing: { line: 276 }, children: [new TextRun({ text, bold: true, size: 21,
        color: T.headerText, font: { ascii: "Times New Roman", eastAsia: "SimHei" } })] })],
      shading: { type: ShadingType.CLEAR, fill: T.headerBg },
      margins: { top: 70, bottom: 70, left: 120, right: 120 },
      width: { size: widths[i], type: WidthType.PERCENTAGE },
    })),
  });
  const dataRows = rows.map((cells, r) => new TableRow({
    cantSplit: true,
    children: cells.map((cell, i) => {
      const paras = (Array.isArray(cell) ? cell : [cell]).map(txt => new Paragraph({
        spacing: { line: 276 },
        children: [new TextRun({ text: safeText(txt), size: 21, color: INK.body,
          bold: i === 0 && cells.length > 2,
          font: { ascii: "Times New Roman", eastAsia: "SimSun" } })],
      }));
      return new TableCell({
        children: paras,
        shading: r % 2 === 0 ? { type: ShadingType.CLEAR, fill: T.surface } : { type: ShadingType.CLEAR, fill: "FFFFFF" },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        width: { size: widths[i], type: WidthType.PERCENTAGE },
      });
    }),
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: T.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: T.accentLine },
      left: NB, right: NB,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: T.innerLine },
      insideVertical: NB,
    },
    rows: [headerRow, ...dataRows],
  });
}

// Gambar + caption
let figCounter = 0;
function figure(imgPath, displayWidth, captionText) {
  const buf = fs.readFileSync(imgPath);
  const dim = pngSize(buf);
  const displayHeight = Math.round(displayWidth * (dim.height / dim.width));
  figCounter += 1;
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      keepNext: true,
      spacing: { before: 160, after: 60 },
      children: [new ImageRun({ data: buf, type: "png",
        transformation: { width: displayWidth, height: displayHeight } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200, line: 276 },
      children: [new TextRun({ text: `Gambar ${figCounter}: ${captionText}`, size: 21, color: INK.secondary,
        italics: true, font: { ascii: "Times New Roman", eastAsia: "SimSun" } })],
    }),
  ];
}

module.exports = { GO1, INK, NB, noBorders, allNoBorders, safeText, calcTitleLayout,
  buildCoverR4, pngSize, h1, h2, body, run, tableCaption, dataTable, figure, emptyPara };
