import test from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { extractDocxText, extractPdfText } from "../server/resource_extract.mjs";

function makeLocalZipEntry(fileName, content) {
  const name = Buffer.from(fileName, "utf8");
  const compressed = deflateRawSync(Buffer.from(content, "utf8"));
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(8, 8);
  header.writeUInt32LE(0, 10);
  header.writeUInt32LE(0, 14);
  header.writeUInt32LE(compressed.length, 18);
  header.writeUInt32LE(Buffer.byteLength(content), 22);
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28);
  return Buffer.concat([header, name, compressed]);
}

test("resource extract: docx text is extracted from word/document.xml", () => {
  const documentXml =
    '<?xml version="1.0" encoding="UTF-8"?><w:document><w:body><w:p><w:r><w:t>第一段</w:t></w:r></w:p><w:p><w:r><w:t>第二段 &amp; 重点</w:t></w:r></w:p></w:body></w:document>';
  const docx = makeLocalZipEntry("word/document.xml", documentXml);
  const text = extractDocxText(docx);
  assert.match(text, /第一段/);
  assert.match(text, /第二段 & 重点/);
});

test("resource extract: text pdf operators are extracted", () => {
  const pdf = Buffer.from("%PDF-1.4\nBT\n(TCP handshake text) Tj\n[(SYN) 120 (ACK)] TJ\nET", "latin1");
  const text = extractPdfText(pdf);
  assert.match(text, /TCP handshake text/);
  assert.match(text, /SYN/);
  assert.match(text, /ACK/);
});
