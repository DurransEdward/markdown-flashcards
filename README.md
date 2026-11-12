# Mathematical and Programming Flash Cards

This is a simple web app that allows you to create flash cards which include LaTeX equations, code snippets and audio clips.

## Clone, Install, and Run

You need [Node.js](https://nodejs.org/) (which includes `npm`) installed.

1. Clone this repository, then `cd` into it:

```bash
git clone https://github.com/DurransEdward/markdown-flashcards-app.git
cd markdown-flashcards-app
```

2. Install dependencies:

```bash
npm install
```

3. Start the app:

```bash
npm run start
```

This builds the app, starts the backend server (port 3000) and the front-end server (port 1234), and opens `http://localhost:1234` in your default browser. Press `Ctrl+C` in the terminal to stop everything.

4. Type `example_deck.md` into the input field and click the "Load Deck" button. Deck files are loaded from the `decks` directory.

5. Click through the flash cards. Only cards that are due today are shown. Before revealing an answer you can click `Reveal Answer` or `Skip Card` (which leaves the card untouched). After revealing the answer, it appears below the question, and you can then mark how you did:
   - `Correct` moves the card up a level and records today's date.
   - `Almost Correct` leaves the card's level and date unchanged (for small slips, like a typo).
   - `Incorrect` sends the card back to level 0 with the date `NA`.

## Spaced Repetition

Each card has a `**LEVEL**` (0 to 5) and a `**DATE**` (the day it was last answered correctly, as `YYYY-MM-DD`, or `NA`). A card is shown when enough time has passed since that date:

| Level | Shown again when...                                    |
| ----- | ------------------------------------------------------ |
| 0     | Always (new cards, or cards answered incorrectly)      |
| 1     | At least 1 day after the last correct answer           |
| 2     | At least 1 week (7 days) after the last correct answer |
| 3     | At least 1 month after the last correct answer         |
| 4     | At least 1 year after the last correct answer          |
| 5     | At least 1 year after the last correct answer          |

Days are calendar days in your local time, so a card answered correctly yesterday evening is due today. A correct answer at level 5 keeps the card at level 5 and refreshes its date. The app updates `**LEVEL**` and `**DATE**` in your markdown file for you.

## Make Your Own Deck of Flash Cards

1. Create a new markdown file in the `decks` directory, e.g. `decks/my_cards.md`.

2. Add cards to the markdown file in the following format:

```markdown
######################################## NEW CARD ########################################

**QUESTION**: Your first question.

**ANSWER**: Your first answer.

**LEVEL**: 0
**DATE**: NA
**IMPORTANT**: TRUE

######################################## NEW CARD ########################################

**QUESTION**: Your second question.

**ANSWER**: Your second answer.

**LEVEL**: 0
**DATE**: NA
```

To mark a card as important, add `**IMPORTANT**: TRUE` on the line directly below `**DATE**`, as in the first card above. Important cards show a ⚠️IMPORTANT⚠️ badge next to their level while you study. The line is optional: leave it out, or write `**IMPORTANT**: FALSE`, for an ordinary card. You set it yourself; the app never changes it.

## Audio Clips

Cards can play short audio clips, which is handy for learning a language.

1. Put your clips in the `decks/audio` directory. Like your decks, they are not committed to git. Use `.mp3` or `.m4a` files, which play in every browser; `.wav` and `.ogg` also work.

2. Add a clip anywhere in a question or answer with markdown's embed syntax, writing the path relative to the deck file:

```markdown
**QUESTION**: Que veut dire cette phrase ?

![](audio/ca_va.m4a)

**ANSWER**: How are you?

![](audio/ca_va_reponse.m4a)
```

When a card appears, its first question clip starts after half a second and repeats, with a 1.5 second pause between plays, until you reveal the answer or move on. Revealing the answer stops the question clip and plays the first answer clip in the same way. Each clip has its own player, so you can pause it (which stops the repeats) or play any clip again; only one clip plays at a time. If your browser blocks autoplay, press play on the player.

If a clip can't be loaded, or its path points outside `decks/audio`, the card shows an error in its place.

## Tests

```bash
npm test
```

## Disclaimer

I make no claim that this codebase is particularly well-written. I threw everything together because I couldn't find a flash card app that supported LaTeX questions and code snippets, both of which I needed for my studies. Half of this codebase was vibe-coded and is still unreviewed.

Pull requests are welcome.
