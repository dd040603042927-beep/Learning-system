import { inflateRawSync, inflateSync } from "node:zlib";

const textDecoder = new TextDecoder("utf-8");

function decodeXmlEntities(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripDocxXml(xml) {
  return decodeXmlEntities(
    xml
      .replace(/<w:tab\/>/g, "\t")
      .replace(/<w:br\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

function parseZipEntries(buffer) {
  const entries = new Map();
  let offset = 0;
  while (offset < buffer.length - 30) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x04034b50) {
      offset += 1;
      continue;
    }

    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > buffer.length) break;

    const fileName = buffer.subarray(nameStart, nameStart + fileNameLength).toString("utf8");
    const data = buffer.subarray(dataStart, dataEnd);
    let content = null;
    if (method === 0) content = data;
    if (method === 8) content = inflateRawSync(data);
    if (content) entries.set(fileName, content);
    offset = dataEnd;
  }
  return entries;
}

export function extractDocxText(buffer) {
  const entries = parseZipEntries(buffer);
  const documentXml = entries.get("word/document.xml");
  if (!documentXml) {
    throw new Error("未找到 word/document.xml，无法解析 DOCX 正文。");
  }
  const text = stripDocxXml(textDecoder.decode(documentXml));
  if (!text) {
    throw new Error("DOCX 正文为空。");
  }
  return text;
}

function decodePdfLiteral(value) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function decodePdfHex(value) {
  const normalized = value.replace(/\s+/g, "");
  if (normalized.length < 2) return "";
  const bytes = Buffer.from(normalized.length % 2 === 0 ? normalized : `${normalized}0`, "hex");
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const chars = [];
    for (let index = 2; index + 1 < bytes.length; index += 2) {
      chars.push(String.fromCharCode(bytes.readUInt16BE(index)));
    }
    return chars.join("");
  }
  return bytes.toString("utf8");
}

function extractPdfTextOperators(source) {
  const parts = [];
  const literalPattern = /\((?:\\.|[^\\)])*\)\s*Tj/g;
  const arrayPattern = /\[(.*?)\]\s*TJ/gs;
  const hexPattern = /<([0-9a-fA-F\s]{4,})>\s*Tj/g;

  for (const match of source.matchAll(literalPattern)) {
    parts.push(decodePdfLiteral(match[0].replace(/\s*Tj$/, "").slice(1, -1)));
  }

  for (const match of source.matchAll(arrayPattern)) {
    const arrayBody = match[1];
    for (const literal of arrayBody.matchAll(/\((?:\\.|[^\\)])*\)/g)) {
      parts.push(decodePdfLiteral(literal[0].slice(1, -1)));
    }
    for (const hex of arrayBody.matchAll(/<([0-9a-fA-F\s]{4,})>/g)) {
      parts.push(decodePdfHex(hex[1]));
    }
  }

  for (const match of source.matchAll(hexPattern)) {
    parts.push(decodePdfHex(match[1]));
  }

  return parts
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part.length >= 2)
    .join("\n");
}

export function extractPdfText(buffer) {
  const raw = buffer.toString("latin1");
  const candidates = [raw];
  const streamPattern = /<<[\s\S]{0,500}?\/FlateDecode[\s\S]{0,500}?>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  for (const match of raw.matchAll(streamPattern)) {
    const streamBuffer = Buffer.from(match[1], "latin1");
    try {
      candidates.push(inflateSync(streamBuffer).toString("latin1"));
    } catch {
      try {
        candidates.push(inflateRawSync(streamBuffer).toString("latin1"));
      } catch {
        // Ignore non-text or unsupported compressed streams.
      }
    }
  }

  const text = candidates.map(extractPdfTextOperators).filter(Boolean).join("\n");
  if (!text.trim()) {
    throw new Error("未能从 PDF 中提取文本。扫描版 PDF 需要后续接入 OCR。");
  }
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

export function extractResourceText({ fileName = "", mimeType = "", base64 = "" }) {
  const buffer = Buffer.from(base64, "base64");
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".docx") || mimeType.includes("wordprocessingml")) {
    return extractDocxText(buffer);
  }
  if (lowerName.endsWith(".pdf") || mimeType === "application/pdf") {
    return extractPdfText(buffer);
  }
  return buffer.toString("utf8");
}
