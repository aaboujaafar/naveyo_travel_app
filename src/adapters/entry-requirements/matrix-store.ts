import * as FileSystem from "expo-file-system/legacy";
import { MATRIX_SOURCE, parseMatrixCsv, type EntryMatrix } from "../../modules/entry-requirements/matrix";
import { BUNDLED_MATRIX } from "../../modules/entry-requirements/matrix-data";

const WEEK = 7 * 86_400_000;
const path = () => `${FileSystem.documentDirectory ?? ""}entry-requirements.json`;
let current: EntryMatrix | null = null;

/** The freshest matrix on the phone: a refreshed copy if any, else the one shipped with the app. */
export async function loadEntryMatrix(): Promise<EntryMatrix> {
  if (current) return current;
  current = BUNDLED_MATRIX;
  if (!FileSystem.documentDirectory) return current;
  try {
    const saved = JSON.parse(await FileSystem.readAsStringAsync(path())) as { matrix?: EntryMatrix };
    if (saved.matrix && saved.matrix.updatedOn > BUNDLED_MATRIX.updatedOn && saved.matrix.passports.length >= 150) current = saved.matrix;
  } catch {
    // No refreshed copy yet.
  }
  return current;
}

/**
 * At most once a week, and only with network: downloads the dataset again
 * when it changed since the copy in use. Failures keep the current copy.
 */
export async function refreshEntryMatrix(now = Date.now()): Promise<EntryMatrix> {
  const matrix = await loadEntryMatrix();
  if (!FileSystem.documentDirectory) return matrix;
  try {
    const saved = JSON.parse(await FileSystem.readAsStringAsync(path()).catch(() => "{}")) as { checkedAt?: number };
    if (saved.checkedAt && now - saved.checkedAt < WEEK) return matrix;
    const commits = (await (await fetch(MATRIX_SOURCE.commitsUrl)).json()) as { commit?: { committer?: { date?: string } } }[];
    const updatedOn = String(commits?.[0]?.commit?.committer?.date ?? "").slice(0, 10);
    let next = matrix;
    if (/^\d{4}-\d{2}-\d{2}$/.test(updatedOn) && updatedOn > matrix.updatedOn) {
      next = parseMatrixCsv(await (await fetch(MATRIX_SOURCE.csvUrl)).text(), updatedOn);
    }
    await FileSystem.writeAsStringAsync(path(), JSON.stringify({ checkedAt: now, matrix: next === BUNDLED_MATRIX ? undefined : next }));
    current = next;
    return next;
  } catch {
    return matrix;
  }
}
