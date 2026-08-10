import AdmZip from "adm-zip";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export interface ExportFile {
  relPath: string;
  text: string;
}

export interface ExportJson {
  relPath: string;
  data: unknown;
}

/** Yield text files whose path contains `hint` and matches one of `exts`,
 *  from a .zip archive or a directory tree. */
export function readExportText(root: string, hint: string, exts: string[]): ExportFile[] {
  const out: ExportFile[] = [];
  const matches = (p: string): boolean => {
    const low = p.toLowerCase();
    return low.includes(hint) && exts.some((e) => low.endsWith(e));
  };
  const stat = statSync(root);

  if (stat.isFile() && root.toLowerCase().endsWith(".zip")) {
    const zip = new AdmZip(root);
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory || !matches(entry.entryName)) continue;
      out.push({ relPath: entry.entryName, text: entry.getData().toString("utf8") });
    }
    return out;
  }

  if (stat.isDirectory()) {
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        const s = statSync(p);
        if (s.isDirectory()) walk(p);
        else if (matches(p)) out.push({ relPath: relative(root, p), text: readFileSync(p, "utf8") });
      }
    };
    walk(root);
    return out;
  }

  throw new Error(`${root} is neither a .zip file nor a directory`);
}

/** As readExportText, but JSON-parsed; unparseable files are skipped. */
export function readExportJson(root: string, hint: string): ExportJson[] {
  const out: ExportJson[] = [];
  for (const { relPath, text } of readExportText(root, hint, [".json"])) {
    try {
      out.push({ relPath, data: JSON.parse(text) });
    } catch {
      continue;
    }
  }
  return out;
}
