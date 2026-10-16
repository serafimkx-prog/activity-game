import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function cardId(dictionaryId, mode, difficulty, word) {
  const normalizedWord = String(word || "").normalize("NFKC").trim().toLocaleLowerCase("ru-RU");
  const input = `activity-card-v1:${dictionaryId}:${mode}:${difficulty}:${normalizedWord}`;
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;

  for (let index = 0; index < input.length; index++) {
    const code = input.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
    second ^= second >>> 13;
  }

  return [first, second]
    .map(value => (value >>> 0).toString(16).padStart(8, "0"))
    .join("");
}

const dictionaries = JSON.parse(fs.readFileSync(path.join(root, "dictionaries.json"), "utf8"));
const catalog = new Map();
const collisions = [];

for (const dictionary of dictionaries.filter(item => item.available)) {
  const data = JSON.parse(fs.readFileSync(path.join(root, dictionary.file), "utf8"));
  for (const mode of ["DRAW", "EXPLAIN", "ACT"]) {
    for (const difficulty of [3, 4, 5]) {
      for (const word of data?.[mode]?.[String(difficulty)] || []) {
        const id = cardId(dictionary.id, mode, difficulty, word);
        const entry = { cardId: id, dictionaryId: dictionary.id, mode, difficulty, word };
        if (catalog.has(id)) collisions.push([catalog.get(id), entry]);
        catalog.set(id, entry);
      }
    }
  }
}

if (collisions.length) {
  console.error(JSON.stringify({ ok: false, collisions }, null, 2));
  process.exitCode = 1;
} else if (process.argv.length > 2) {
  const requestedIds = process.argv.slice(2);
  console.log(JSON.stringify(requestedIds.map(id => catalog.get(id) || { cardId: id, unknown: true }), null, 2));
} else {
  console.log(JSON.stringify({ ok: true, cards: catalog.size, collisions: 0 }, null, 2));
}
