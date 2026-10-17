import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";
import { badRequest } from "./errors.js";

/**
 * Image upload validation:
 *  - magic-byte sniffing (never trust the client's declared mimetype)
 *  - hard size limit (multer also enforces this)
 *  - fully random generated filename — user input never touches disk names
 */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const SIGNATURES: Array<{ ext: string; test: (b: Buffer) => boolean }> = [
  { ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", test: (b) => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) },
  { ext: "gif", test: (b) => b.subarray(0, 3).toString("ascii") === "GIF" },
  { ext: "webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

export function sniffImageExtension(buf: Buffer): string {
  for (const sig of SIGNATURES) if (sig.test(buf)) return sig.ext;
  throw badRequest("UNSUPPORTED_FILE_TYPE", "Only JPG, PNG, GIF or WebP images are allowed");
}

export function validateUploadSize(buf: Buffer) {
  if (buf.length === 0) throw badRequest("EMPTY_FILE", "The uploaded file is empty");
  if (buf.length > MAX_UPLOAD_BYTES) throw badRequest("FILE_TOO_LARGE", "Images must be 5 MB or smaller");
}

/** Returns an absolute path like <UPLOAD_DIR>/20261016/a1b2c3d4e5.png */
export function safeUploadPath(buf: Buffer): { absolute: string; publicUrl: string } {
  const ext = sniffImageExtension(buf);
  const dayDir = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const name = `${randomBytes(10).toString("hex")}.${ext}`;
  const dir = path.resolve(env.UPLOAD_DIR, dayDir);
  mkdirSync(dir, { recursive: true });
  return { absolute: path.join(dir, name), publicUrl: `/uploads/${dayDir}/${name}` };
}
