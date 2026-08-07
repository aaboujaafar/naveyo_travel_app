/// <reference path="./node-shims.d.ts" />

import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type {
  ShareImportInput,
  ShareImportManifest,
  ShareImportRecord,
  ShareImportVault,
  SharePayload,
  SharePayloadKind,
} from "./types";

const manifestFileName = "manifest.json";

export const shareImportLimits = {
  maxImports: 100,
  maxPdfBytes: 25 * 1024 * 1024,
  maxImageBytes: 20 * 1024 * 1024,
  maxIcsBytes: 1 * 1024 * 1024,
  maxTextBytes: 256 * 1024,
  maxPages: 20,
} as const;

const sourceApps = ["mail", "safari", "photos", "travel-app"] as const;
const payloadKinds = ["pdf", "image", "text", "url", "ics"] as const;
const importStates = ["staged", "restored", "missing"] as const;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const isIsoDate = (value: unknown): value is string =>
  isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
const byteLength = (value: string) =>
  new TextEncoder().encode(value).byteLength;

function assertValidUrl(value: unknown): asserts value is string {
  if (!isNonEmptyString(value))
    throw new Error("Share URL must be a non-empty string");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Share URL must be a valid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error("Share URL must use HTTP or HTTPS");
}

function assertValidPayload(
  payload: unknown,
): asserts payload is ShareImportInput["payload"] {
  if (
    !isRecord(payload) ||
    !payloadKinds.includes(payload.kind as (typeof payloadKinds)[number])
  ) {
    throw new Error("Share payload kind is invalid");
  }
  switch (payload.kind) {
    case "pdf":
    case "image":
    case "ics":
      if (
        !isNonEmptyString(payload.tempUri) ||
        !isNonEmptyString(payload.fileName)
      )
        throw new Error(
          `${payload.kind} payload requires a source URI and file name`,
        );
      if (
        payload.pageCount !== undefined &&
        (typeof payload.pageCount !== "number" ||
          !Number.isInteger(payload.pageCount) ||
          payload.pageCount < 1 ||
          payload.pageCount > shareImportLimits.maxPages)
      ) {
        throw new Error(
          `Document page count must be between 1 and ${shareImportLimits.maxPages}`,
        );
      }
      if (payload.mimeType !== undefined && !isNonEmptyString(payload.mimeType))
        throw new Error("File MIME type must be a non-empty string");
      if (
        payload.kind === "pdf" &&
        payload.mimeType !== undefined &&
        payload.mimeType !== "application/pdf"
      )
        throw new Error("PDF payload MIME type must be application/pdf");
      if (
        payload.kind === "image" &&
        payload.mimeType !== undefined &&
        !["image/jpeg", "image/png"].includes(payload.mimeType)
      )
        throw new Error(
          "Image payload MIME type must be image/jpeg or image/png",
        );
      if (
        payload.kind === "ics" &&
        payload.mimeType !== undefined &&
        !["text/calendar", "application/ics"].includes(payload.mimeType)
      )
        throw new Error(
          "ICS payload MIME type must be text/calendar or application/ics",
        );
      return;
    case "text":
      if (!isNonEmptyString(payload.text))
        throw new Error("Text payload must be non-empty");
      if (byteLength(payload.text) > shareImportLimits.maxTextBytes)
        throw new Error("Text payload exceeds its size limit");
      return;
    case "url":
      assertValidUrl(payload.url);
      if (payload.title !== undefined && typeof payload.title !== "string")
        throw new Error("URL title must be a string");
      if (byteLength(payload.url) > shareImportLimits.maxTextBytes)
        throw new Error("URL payload exceeds its size limit");
  }
}

export function assertValidShareImportInput(
  input: unknown,
): asserts input is ShareImportInput {
  if (
    !isRecord(input) ||
    !sourceApps.includes(input.sourceApp as (typeof sourceApps)[number])
  )
    throw new Error("Share source app is invalid");
  if (!isIsoDate(input.receivedAt))
    throw new Error("Share receivedAt must be an ISO date");
  assertValidPayload(input.payload);
}

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const ensureDir = async (target: string) => {
  await mkdir(target, { recursive: true });
};

const safeFileName = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "payload";

const payloadExtension = (kind: SharePayloadKind, fileName?: string) => {
  if (kind === "text") return "txt";
  if (kind === "url") return "url";
  if (kind === "ics") return "ics";
  const extension = path.extname(fileName ?? "").replace(/^\./, "");
  return extension || (kind === "pdf" ? "pdf" : "img");
};

const serializePayload = async (targetPath: string, payload: SharePayload) => {
  switch (payload.kind) {
    case "pdf":
    case "image":
    case "ics":
      await copyFile(payload.tempUri, targetPath);
      return;
    case "text":
      await writeFile(targetPath, payload.text, "utf8");
      return;
    case "url":
      await writeFile(targetPath, `${payload.url}\n`, "utf8");
  }
};

const buildRecord = (manifest: ShareImportManifest): ShareImportRecord => ({
  id: manifest.id,
  sourceApp: manifest.sourceApp,
  payloadKind: manifest.payloadKind,
  state: manifest.state,
  createdAt: manifest.createdAt,
  persistedAt: manifest.persistedAt,
  payloadUri: manifest.payloadUri,
  metadata: manifest.metadata,
});

const validateManifest = (value: unknown): ShareImportManifest => {
  if (
    !isRecord(value) ||
    !isUuid(value.id) ||
    !sourceApps.includes(value.sourceApp as (typeof sourceApps)[number]) ||
    !payloadKinds.includes(
      value.payloadKind as (typeof payloadKinds)[number],
    ) ||
    !importStates.includes(value.state as (typeof importStates)[number]) ||
    !isIsoDate(value.createdAt) ||
    !isIsoDate(value.persistedAt) ||
    !isNonEmptyString(value.payloadUri) ||
    !isRecord(value.metadata)
  ) {
    throw new Error("Share import manifest is invalid");
  }
  const metadata = value.metadata;
  if (
    metadata.pageCount !== undefined &&
    (typeof metadata.pageCount !== "number" ||
      !Number.isInteger(metadata.pageCount) ||
      metadata.pageCount < 1 ||
      metadata.pageCount > shareImportLimits.maxPages)
  ) {
    throw new Error("Share import manifest page count is invalid");
  }
  return value as unknown as ShareImportManifest;
};

const readManifest = async (manifestPath: string, expectedId: string) => {
  const manifestJson = await readFile(manifestPath, "utf8");
  const manifest = validateManifest(JSON.parse(manifestJson) as unknown);
  if (manifest.id !== expectedId)
    throw new Error("Share import manifest ID does not match its directory");
  if (path.dirname(manifest.payloadUri) !== path.dirname(manifestPath))
    throw new Error(
      "Share import payload must remain inside its import directory",
    );
  return manifest;
};

const manifestPathFor = (rootDir: string, id: string) =>
  path.join(rootDir, "imports", id, manifestFileName);

export const createShareImportVault = (rootDir: string): ShareImportVault => ({
  async stage(input) {
    assertValidShareImportInput(input);
    const existingImports = await readdir(path.join(rootDir, "imports"), {
      withFileTypes: true,
    }).catch(() => []);
    if (
      existingImports.filter((entry) => entry.isDirectory()).length >=
      shareImportLimits.maxImports
    )
      throw new Error(
        `Share import limit of ${shareImportLimits.maxImports} imports reached`,
      );
    const id = randomUUID();
    const createdAt = input.receivedAt;
    const persistedAt = new Date().toISOString();
    const importDir = path.join(rootDir, "imports", id);
    await ensureDir(importDir);

    const payload = input.payload;
    const kind = payload.kind;
    const payloadFileName =
      kind === "pdf" || kind === "image" || kind === "ics"
        ? `${safeFileName(payload.fileName || "payload")}.${payloadExtension(kind, payload.fileName)}`
        : `payload.${payloadExtension(kind)}`;

    const payloadUri = path.join(importDir, payloadFileName);
    if (kind === "pdf" || kind === "image" || kind === "ics") {
      const sourceStat = await stat(payload.tempUri);
      if (!sourceStat.isFile())
        throw new Error("Share file source is not a regular file");
      const maxBytes =
        kind === "pdf"
          ? shareImportLimits.maxPdfBytes
          : kind === "image"
            ? shareImportLimits.maxImageBytes
            : shareImportLimits.maxIcsBytes;
      if (sourceStat.size > maxBytes)
        throw new Error(`${kind} payload exceeds its size limit`);
    }
    await serializePayload(payloadUri, payload);

    let metadata: ShareImportManifest["metadata"];
    switch (kind) {
      case "pdf":
      case "image":
      case "ics":
        metadata = {
          fileName: payload.fileName,
          mimeType: payload.mimeType,
          pageCount: payload.pageCount,
        };
        break;
      case "text":
        metadata = { text: payload.text };
        break;
      case "url":
        metadata = { title: payload.title, url: payload.url };
        break;
    }

    const manifest: ShareImportManifest = {
      id,
      sourceApp: input.sourceApp,
      payloadKind: kind,
      state: "staged",
      createdAt,
      persistedAt,
      payloadUri,
      metadata,
    };

    await writeFile(
      path.join(importDir, manifestFileName),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
    return buildRecord(manifest);
  },

  async resume(id) {
    try {
      if (!isUuid(id)) return null;
      const manifest = await readManifest(manifestPathFor(rootDir, id), id);
      await stat(manifest.payloadUri);
      return buildRecord({ ...manifest, state: "restored" });
    } catch {
      return null;
    }
  },

  async list() {
    const importsDir = path.join(rootDir, "imports");
    await ensureDir(importsDir);
    const entries = await readdir(importsDir, { withFileTypes: true });
    const records: ShareImportRecord[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(importsDir, entry.name, manifestFileName);
      try {
        const manifest = await readManifest(manifestPath, entry.name);
        records.push(buildRecord(manifest));
      } catch {
        continue;
      }
    }

    return records.sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt),
    );
  },
});

export const shareImportPaths = {
  manifestPathFor,
};
