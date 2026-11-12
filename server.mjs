import express from 'express'
import { promises as fs } from 'fs'
import path from 'path'
import cors from 'cors'
import { splitEntries, joinEntries, parseEntry, gradeCard, withLevelAndDate } from './cards.mjs'

const app = express()
app.use(express.json())
app.use(cors())

app.post('/record-answer', async (req, res) => {
    const { deckFileName, cardIndex, correct } = req.body

    if (
        typeof deckFileName !== 'string' ||
        !deckFileName ||
        deckFileName === '.' ||
        deckFileName === '..' ||
        path.basename(deckFileName) !== deckFileName ||
        deckFileName.includes('\\') ||
        typeof correct !== 'boolean'
    ) {
        res.status(400).send('Expected deckFileName (file name) and correct (boolean)')
        return
    }

    const deckFilePath = path.join('decks', deckFileName)

    try {
        const data = await fs.readFile(deckFilePath, 'utf8')
        const entries = splitEntries(data)

        if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= entries.length) {
            res.status(400).send('Invalid cardIndex')
            return
        }

        const card = parseEntry(entries[cardIndex], cardIndex)
        entries[cardIndex] = withLevelAndDate(entries[cardIndex], gradeCard(card, correct))

        await fs.writeFile(deckFilePath, joinEntries(entries))

        res.send('OK')
    } catch (error) {
        console.error(error)
        res.status(500).send('Error processing the request')
    }
})

app.listen(3000, () => console.log('Server listening on port 3000'))

app.use(express.static('./'))
