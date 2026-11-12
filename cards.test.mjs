import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isDue,
  gradeCard,
  parseCards,
  parseEntry,
  withLevelAndDate,
  splitEntries,
  joinEntries,
  todayString,
} from "./cards.mjs";

test("level 0 cards are always due", () => {
  assert.equal(isDue({ level: 0, date: "NA" }, "2025-01-01"), true);
});

test("level 1 is due the day after the correct answer, not the same day", () => {
  assert.equal(isDue({ level: 1, date: "2025-03-10" }, "2025-03-10"), false);
  assert.equal(isDue({ level: 1, date: "2025-03-10" }, "2025-03-11"), true);
  assert.equal(isDue({ level: 1, date: "2025-12-31" }, "2026-01-01"), true);
});

test("level 2 is due after one week", () => {
  assert.equal(isDue({ level: 2, date: "2025-03-10" }, "2025-03-16"), false);
  assert.equal(isDue({ level: 2, date: "2025-03-10" }, "2025-03-17"), true);
});

test("level 3 is due after one calendar month", () => {
  assert.equal(isDue({ level: 3, date: "2025-03-10" }, "2025-04-09"), false);
  assert.equal(isDue({ level: 3, date: "2025-03-10" }, "2025-04-10"), true);
  assert.equal(isDue({ level: 3, date: "2025-01-31" }, "2025-02-27"), false);
  assert.equal(isDue({ level: 3, date: "2025-01-31" }, "2025-02-28"), true);
  assert.equal(isDue({ level: 3, date: "2025-12-15" }, "2026-01-15"), true);
});

test("levels 4 and 5 are due after one year", () => {
  for (const level of [4, 5]) {
    assert.equal(isDue({ level, date: "2025-03-10" }, "2026-03-09"), false);
    assert.equal(isDue({ level, date: "2025-03-10" }, "2026-03-10"), true);
  }
  assert.equal(isDue({ level: 4, date: "2024-02-29" }, "2025-02-27"), false);
  assert.equal(isDue({ level: 4, date: "2024-02-29" }, "2025-02-28"), true);
});

test("a correct answer moves up a level and records today, capped at level 5", () => {
  assert.deepEqual(gradeCard({ level: 0 }, true, "2025-03-10"), {
    level: 1,
    date: "2025-03-10",
  });
  assert.deepEqual(gradeCard({ level: 4 }, true, "2025-03-10"), {
    level: 5,
    date: "2025-03-10",
  });
  assert.deepEqual(gradeCard({ level: 5 }, true, "2025-03-10"), {
    level: 5,
    date: "2025-03-10",
  });
});

test("an incorrect answer resets to level 0 with no date", () => {
  assert.deepEqual(gradeCard({ level: 3 }, false, "2025-03-10"), {
    level: 0,
    date: "NA",
  });
});

test("todayString uses the local calendar date", () => {
  assert.equal(todayString(new Date(2025, 2, 5, 23, 59)), "2025-03-05");
});

const sampleFile = `######################################## NEW CARD ########################################

**QUESTION**: What is 1 + 1?

**ANSWER**:

\`\`\`python
print(1 + 1)
\`\`\`

**LEVEL**: 2
**DATE**: 2025-03-10
**IMPORTANT**: TRUE

######################################## NEW CARD ########################################

**QUESTION**: Second?

**ANSWER**: Yes.

**LEVEL**: 0
**DATE**: NA
`;

test("parses questions, answers, level, date and the optional important flag", () => {
  const cards = parseCards(sampleFile);
  assert.equal(cards.length, 2);
  assert.deepEqual(cards[0], {
    question: "What is 1 + 1?",
    answer: "```python\nprint(1 + 1)\n```",
    important: true,
    level: 2,
    date: "2025-03-10",
    cardIndexInFile: 0,
  });
  assert.deepEqual(cards[1], {
    question: "Second?",
    answer: "Yes.",
    important: false,
    level: 0,
    date: "NA",
    cardIndexInFile: 1,
  });
});

test("an explicit FALSE is the same as leaving the line out", () => {
  const card = parseEntry(
    "**QUESTION**: q\n\n**ANSWER**: a\n\n**LEVEL**: 0\n**DATE**: NA\n**IMPORTANT**: FALSE",
  );
  assert.equal(card.important, false);
  assert.equal(card.answer, "a");
});

test("rejects malformed entries", () => {
  assert.throws(
    () =>
      parseEntry("**QUESTION**: q\n\n**ANSWER**: a\n\n**LEARNED**: false", 3),
    /index 3/,
  );
  assert.throws(
    () => parseEntry("**QUESTION**: q\n\n**ANSWER**: a\n\n**LEVEL**: 0", 2),
    /index 2/,
  );
  assert.throws(
    () =>
      parseEntry(
        "**QUESTION**: q\n\n**ANSWER**: a\n\n**IMPORTANCE**: LOW\n**LEVEL**: 0\n**DATE**: NA",
      ),
    /old \*\*IMPORTANCE\*\* line/,
  );
  assert.throws(
    () =>
      parseEntry(
        "**QUESTION**: q\n\n**ANSWER**: a\n\n**LEVEL**: 0\n**DATE**: NA\n**IMPORTANT**: HIGH",
      ),
    /invalid \*\*IMPORTANT\*\*/,
  );
  assert.throws(
    () =>
      parseEntry(
        "**QUESTION**: q\n\n**ANSWER**: a\n\n**LEVEL**: 0\n**DATE**: NA\n**IMPORTANT**: true",
      ),
    /invalid \*\*IMPORTANT\*\*/,
  );
  assert.throws(
    () =>
      parseEntry(
        "**QUESTION**: q\n\n**ANSWER**: a\n\n**LEVEL**: 6\n**DATE**: NA",
      ),
    /invalid \*\*LEVEL\*\*/,
  );
  assert.throws(
    () =>
      parseEntry(
        "**QUESTION**: q\n\n**ANSWER**: a\n\n**LEVEL**: 1\n**DATE**: NA",
      ),
    /invalid \*\*DATE\*\*/,
  );
  assert.throws(
    () =>
      parseEntry(
        "**QUESTION**: q\n\n**ANSWER**: a\n\n**LEVEL**: 1\n**DATE**: 2025-02-30\n**IMPORTANT**: TRUE",
      ),
    /invalid \*\*DATE\*\*/,
  );
});

test("rewriting a card only changes its level and date", () => {
  const entries = splitEntries(sampleFile);
  entries[0] = withLevelAndDate(
    entries[0],
    gradeCard(parseEntry(entries[0]), true, "2025-04-01"),
  );
  const rewritten = joinEntries(entries);

  const cards = parseCards(rewritten);
  assert.equal(cards[0].important, true);
  assert.equal(cards[0].level, 3);
  assert.equal(cards[0].date, "2025-04-01");
  assert.equal(cards[0].answer, "```python\nprint(1 + 1)\n```");
  assert.deepEqual(cards[1], {
    question: "Second?",
    answer: "Yes.",
    important: false,
    level: 0,
    date: "NA",
    cardIndexInFile: 1,
  });
});

test("the bundled example deck parses with every card due", async () => {
  const { readFile } = await import("node:fs/promises");
  const cards = parseCards(
    await readFile(
      new URL("./decks/example_deck.md", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(cards.length, 6);
  assert.ok(cards.every((card) => isDue(card)));
});
