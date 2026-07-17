import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CATALOG_FILE = "dictionaries.json";
const MODES = ["DRAW", "EXPLAIN", "ACT"];
const LEVELS = ["3", "4", "5"];
const STOP_WORDS = new Set([
  "в",
  "во",
  "на",
  "с",
  "со",
  "у",
  "к",
  "ко",
  "по",
  "за",
  "из",
  "для",
  "от",
  "до",
  "над",
  "под",
  "при",
  "без",
  "через",
  "между",
  "и",
  "или",
  "о",
  "об",
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
}

function normalizeCard(card) {
  return String(card).trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

function wordsOf(card) {
  return normalizeCard(card)
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter(Boolean);
}

function wordCount(card) {
  return wordsOf(card).length;
}

function patternOf(card) {
  return wordsOf(card)
    .map((word, index) => (STOP_WORDS.has(word) ? word : index === 0 ? "X" : "Y"))
    .join(" ");
}

function headOf(card) {
  const words = wordsOf(card);
  const content = words.filter((word) => !STOP_WORDS.has(word));
  return content[content.length - 1] || words[words.length - 1] || "";
}

function pushMap(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function getDictionaryFiles(catalog) {
  return catalog
    .filter((entry) => entry.file && entry.file.endsWith(".json"))
    .filter((entry) => fs.existsSync(path.join(ROOT, entry.file)));
}

function auditDictionary(entry) {
  const data = readJson(entry.file);
  const rows = [];
  const allCards = [];
  const missingBuckets = [];
  const longCards = [];
  const internalMap = new Map();
  const headMap = new Map();
  const patternMap = new Map();

  for (const mode of MODES) {
    for (const level of LEVELS) {
      const bucket = data[mode]?.[level];
      if (!Array.isArray(bucket)) {
        missingBuckets.push(`${mode}-${level}`);
        rows.push({ mode, level, count: 0 });
        continue;
      }

      rows.push({ mode, level, count: bucket.length });
      for (const card of bucket) {
        const item = {
          file: entry.file,
          dictionaryId: entry.id,
          dictionaryName: entry.name,
          mode,
          level,
          card,
          key: normalizeCard(card),
          wordCount: wordCount(card),
          pattern: patternOf(card),
          head: headOf(card),
        };
        allCards.push(item);
        pushMap(internalMap, item.key, item);
        pushMap(headMap, item.head, item);
        pushMap(patternMap, item.pattern, item);
        if (item.wordCount > 4) longCards.push(item);
      }
    }
  }

  const internalDuplicates = [...internalMap.values()]
    .filter((items) => items.length > 1)
    .sort((a, b) => b.length - a.length || a[0].key.localeCompare(b[0].key, "ru"));

  const repeatedHeads = [...headMap.entries()]
    .filter(([head, items]) => head && items.length >= 8)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "ru"));

  const repeatedPatterns = [...patternMap.entries()]
    .filter(([pattern, items]) => pattern && items.length >= 20)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "ru"));

  return {
    entry,
    rows,
    allCards,
    total: allCards.length,
    catalogWordCount: entry.wordCount,
    wordCountDelta: allCards.length - Number(entry.wordCount || 0),
    missingBuckets,
    longCards,
    internalDuplicates,
    repeatedHeads,
    repeatedPatterns,
  };
}

function buildMarkdown(catalog, audits) {
  const allCards = audits.flatMap((audit) => audit.allCards);
  const globalMap = new Map();
  for (const item of allCards) pushMap(globalMap, item.key, item);

  const globalDuplicates = [...globalMap.values()]
    .filter((items) => items.length > 1)
    .sort((a, b) => b.length - a.length || a[0].key.localeCompare(b[0].key, "ru"));

  const missingPlannedFiles = catalog
    .filter((entry) => entry.file && entry.file.endsWith(".json"))
    .filter((entry) => !fs.existsSync(path.join(ROOT, entry.file)));

  const lines = [];
  lines.push("# Dictionary Audit Report");
  lines.push("");
  lines.push(`Generated from local repository files.`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Existing dictionary files audited: ${audits.length}`);
  lines.push(`- Existing cards audited: ${allCards.length}`);
  lines.push(`- Unique normalized card texts: ${globalMap.size}`);
  lines.push(`- Duplicate/intersection groups: ${globalDuplicates.length}`);
  lines.push(`- Planned dictionary files missing: ${missingPlannedFiles.length}`);
  if (missingPlannedFiles.length) {
    for (const entry of missingPlannedFiles) {
      lines.push(`  - ${entry.id} -> ${entry.file} (${entry.name})`);
    }
  }
  lines.push("");

  lines.push("## Dictionary Sizes");
  lines.push("");
  lines.push("| file | id | name | real cards | catalog wordCount | delta | long >4 words | internal duplicate groups |");
  lines.push("|---|---:|---|---:|---:|---:|---:|---:|");
  for (const audit of audits) {
    lines.push(
      `| ${audit.entry.file} | ${audit.entry.id} | ${audit.entry.name} | ${audit.total} | ${audit.catalogWordCount ?? ""} | ${audit.wordCountDelta} | ${audit.longCards.length} | ${audit.internalDuplicates.length} |`
    );
  }
  lines.push("");

  for (const audit of audits) {
    lines.push(`## ${audit.entry.file} (${audit.entry.name})`);
    lines.push("");
    lines.push("### Buckets");
    lines.push("");
    lines.push("| bucket | count |");
    lines.push("|---|---:|");
    for (const row of audit.rows) {
      lines.push(`| ${row.mode}-${row.level} | ${row.count} |`);
    }
    lines.push("");

    if (audit.missingBuckets.length) {
      lines.push(`Missing buckets: ${audit.missingBuckets.join(", ")}`);
      lines.push("");
    }

    if (audit.longCards.length) {
      lines.push("### Cards Longer Than 4 Words");
      lines.push("");
      for (const item of audit.longCards) {
        lines.push(`- ${item.mode}-${item.level}: ${item.card} (${item.wordCount} words)`);
      }
      lines.push("");
    }

    if (audit.internalDuplicates.length) {
      lines.push("### Internal Duplicate Groups");
      lines.push("");
      for (const group of audit.internalDuplicates) {
        lines.push(`- ${group[0].key}: ${group.map((item) => `${item.mode}-${item.level}: ${item.card}`).join(" | ")}`);
      }
      lines.push("");
    }

    if (audit.repeatedHeads.length) {
      lines.push("### Repeated Heads (8+)");
      lines.push("");
      for (const [head, items] of audit.repeatedHeads.slice(0, 30)) {
        lines.push(`- ${head}: ${items.length} cards`);
        lines.push(`  - ${items.slice(0, 10).map((item) => `${item.mode}-${item.level}: ${item.card}`).join(" | ")}`);
      }
      lines.push("");
    }

    if (audit.repeatedPatterns.length) {
      lines.push("### Repeated Structural Patterns (20+)");
      lines.push("");
      for (const [pattern, items] of audit.repeatedPatterns.slice(0, 20)) {
        lines.push(`- ${pattern}: ${items.length}`);
      }
      lines.push("");
    }
  }

  lines.push("## Exact Duplicate / Intersection Groups");
  lines.push("");
  for (const group of globalDuplicates) {
    lines.push(`- ${group[0].key}:`);
    for (const item of group) {
      lines.push(`  - ${item.file} ${item.mode}-${item.level}: ${item.card}`);
    }
  }
  lines.push("");

  lines.push("## Next Editorial Pass");
  lines.push("");
  if (audits.some((audit) => audit.wordCountDelta !== 0)) {
    lines.push("- Fix `wordCount` mismatches.");
  } else {
    lines.push("- `wordCount` values currently match real card counts.");
  }
  if (audits.some((audit) => audit.internalDuplicates.length > 0)) {
    lines.push("- Resolve exact internal duplicates first.");
  } else {
    lines.push("- No internal duplicate groups are currently detected.");
  }
  lines.push("- Review remaining cross-dictionary intersections and decide whether each is acceptable.");
  lines.push("- Review repeated heads and repeated structural patterns for AI-like sameness where they are not intentional.");
  lines.push("- Then manually review game-fit by mode: `DRAW`, `ACT`, `EXPLAIN`.");
  lines.push("");

  return lines.join("\n");
}

const catalog = readJson(CATALOG_FILE);
const entries = getDictionaryFiles(catalog);
const audits = entries.map(auditDictionary);
const markdown = buildMarkdown(catalog, audits);

if (process.argv.includes("--write")) {
  const output = process.argv[process.argv.indexOf("--write") + 1] || "dictionary_audit_report.md";
  fs.writeFileSync(path.join(ROOT, output), markdown);
  console.log(`Wrote ${output}`);
} else {
  console.log(markdown);
}
