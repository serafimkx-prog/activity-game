# Dictionary Audit Report

Generated from local repository files.

## Summary

- Existing dictionary files audited: 6
- Existing cards audited: 5632
- Unique normalized card texts: 5623
- Duplicate/intersection groups: 9
- Planned dictionary files missing: 0

## Dictionary Sizes

| file | id | name | real cards | catalog wordCount | delta | long >4 words | internal duplicate groups |
|---|---:|---|---:|---:|---:|---:|---:|
| words.json | classic | Классический | 900 | 900 | 0 | 0 | 0 |
| words_geo.json | geo | География | 800 | 800 | 0 | 0 | 0 |
| words_society.json | society | Общество | 1290 | 1290 | 0 | 0 | 0 |
| words_around_us.json | around_us | Вокруг нас | 1142 | 1142 | 0 | 0 | 0 |
| words_cinema.json | cinema | Мир кино | 800 | 800 | 0 | 0 | 0 |
| words_science.json | science | Наука и природа | 700 | 700 | 0 | 0 | 0 |

## words.json (Классический)

### Buckets

| bucket | count |
|---|---:|
| DRAW-3 | 147 |
| DRAW-4 | 102 |
| DRAW-5 | 71 |
| EXPLAIN-3 | 127 |
| EXPLAIN-4 | 144 |
| EXPLAIN-5 | 91 |
| ACT-3 | 77 |
| ACT-4 | 61 |
| ACT-5 | 80 |

### Repeated Structural Patterns (20+)

- X: 504
- X Y: 275
- X на Y: 25

## words_geo.json (География)

### Buckets

| bucket | count |
|---|---:|
| DRAW-3 | 65 |
| DRAW-4 | 84 |
| DRAW-5 | 123 |
| EXPLAIN-3 | 64 |
| EXPLAIN-4 | 90 |
| EXPLAIN-5 | 124 |
| ACT-3 | 55 |
| ACT-4 | 81 |
| ACT-5 | 114 |

### Repeated Structural Patterns (20+)

- X Y: 330
- X: 160
- X у Y: 40
- X на Y: 34
- X в Y: 30
- X Y Y: 30
- X Y на Y: 28
- X Y в Y: 23

## words_society.json (Общество)

### Buckets

| bucket | count |
|---|---:|
| DRAW-3 | 50 |
| DRAW-4 | 170 |
| DRAW-5 | 210 |
| EXPLAIN-3 | 50 |
| EXPLAIN-4 | 170 |
| EXPLAIN-5 | 210 |
| ACT-3 | 50 |
| ACT-4 | 170 |
| ACT-5 | 210 |

### Repeated Structural Patterns (20+)

- X Y: 537
- X: 242
- X на Y: 100
- X в Y: 68
- X у Y: 64
- X Y Y: 56
- X Y на Y: 29
- X Y в Y: 21
- X за Y: 20

## words_around_us.json (Вокруг нас)

### Buckets

| bucket | count |
|---|---:|
| DRAW-3 | 126 |
| DRAW-4 | 127 |
| DRAW-5 | 127 |
| EXPLAIN-3 | 127 |
| EXPLAIN-4 | 127 |
| EXPLAIN-5 | 127 |
| ACT-3 | 127 |
| ACT-4 | 127 |
| ACT-5 | 127 |

### Repeated Heads (8+)

- двери: 8 cards
  - DRAW-4: зонт у двери | DRAW-4: коврик у двери | DRAW-5: чемодан у двери | DRAW-5: грязные ботинки у двери | DRAW-5: консьерж у двери | DRAW-5: пакеты у двери | ACT-4: ждать у двери | ACT-5: встречать курьера у двери
- дома: 8 cards
  - EXPLAIN-4: день рождения дома | EXPLAIN-4: магазин у дома | EXPLAIN-5: чувство дома | EXPLAIN-5: тихий вечер дома | EXPLAIN-5: покупки для дома | EXPLAIN-5: вечер с караоке дома | ACT-5: распаковывать покупки дома | ACT-5: забыть ключи дома

### Repeated Structural Patterns (20+)

- X Y: 305
- X: 241
- X на Y: 97
- X Y Y: 91
- X в Y: 60
- X у Y: 53
- X с Y: 32
- X Y в Y: 31
- X для Y: 24
- X Y на Y: 24

## words_cinema.json (Мир кино)

### Buckets

| bucket | count |
|---|---:|
| DRAW-3 | 90 |
| DRAW-4 | 90 |
| DRAW-5 | 90 |
| EXPLAIN-3 | 90 |
| EXPLAIN-4 | 90 |
| EXPLAIN-5 | 90 |
| ACT-3 | 80 |
| ACT-4 | 90 |
| ACT-5 | 90 |

### Repeated Structural Patterns (20+)

- X Y: 358
- X: 135
- X Y Y: 108
- X на Y: 26
- X в Y: 25

## words_science.json (Наука и природа)

### Buckets

| bucket | count |
|---|---:|
| DRAW-3 | 80 |
| DRAW-4 | 80 |
| DRAW-5 | 80 |
| EXPLAIN-3 | 70 |
| EXPLAIN-4 | 80 |
| EXPLAIN-5 | 80 |
| ACT-3 | 70 |
| ACT-4 | 80 |
| ACT-5 | 80 |

### Repeated Structural Patterns (20+)

- X Y: 297
- X: 167
- X Y Y: 80
- X Y в Y: 21

## Exact Duplicate / Intersection Groups

- диплом:
  - words.json EXPLAIN-3: диплом
  - words_society.json DRAW-3: диплом
- долг:
  - words.json EXPLAIN-3: долг
  - words_society.json EXPLAIN-3: долг
- контракт:
  - words.json EXPLAIN-3: контракт
  - words_society.json DRAW-3: контракт
- премьера:
  - words.json EXPLAIN-3: премьера
  - words_society.json EXPLAIN-4: премьера
- совесть:
  - words.json EXPLAIN-3: совесть
  - words_society.json EXPLAIN-3: совесть
- стыд:
  - words.json EXPLAIN-3: стыд
  - words_society.json EXPLAIN-3: стыд
- танец:
  - words.json ACT-3: танец
  - words_society.json ACT-3: танец
- традиция:
  - words.json EXPLAIN-3: традиция
  - words_society.json EXPLAIN-3: традиция
- трудовая миграция:
  - words_geo.json EXPLAIN-5: трудовая миграция
  - words_society.json EXPLAIN-5: трудовая миграция

## Next Editorial Pass

- `wordCount` values currently match real card counts.
- No internal duplicate groups are currently detected.
- Review remaining cross-dictionary intersections and decide whether each is acceptable.
- Review repeated heads and repeated structural patterns for AI-like sameness where they are not intentional.
- Then manually review game-fit by mode: `DRAW`, `ACT`, `EXPLAIN`.
