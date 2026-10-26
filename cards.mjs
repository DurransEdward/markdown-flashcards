export const SEPARATOR = '######################################## NEW QUESTION ########################################'
export const MAX_LEVEL = 5
export const IMPORTANT_VALUES = ['TRUE', 'FALSE']

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const FOOTER_PATTERN = /\*\*LEVEL\*\*:[ \t]*(\S*)[ \t]*\r?\n[ \t]*\*\*DATE\*\*:[ \t]*(\S*)[ \t]*(?:\r?\n[ \t]*\*\*IMPORTANT\*\*:[ \t]*(\S*)[ \t]*)?$/

const pad = (number, length = 2) => String(number).padStart(length, '0')

const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate()

function parseDate(dateString) {
    const match = DATE_PATTERN.exec(dateString)
    if (!match) {
        return null
    }

    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
        return null
    }

    return { year, month, day }
}

function formatDate({ year, month, day }) {
    return `${pad(year, 4)}-${pad(month)}-${pad(day)}`
}

function addDays({ year, month, day }, days) {
    const shifted = new Date(Date.UTC(year, month - 1, day + days))
    return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() }
}

// Clamps the day so that e.g. 31 January + 1 month is the last day of February.
function addMonths({ year, month, day }, months) {
    const monthIndex = year * 12 + (month - 1) + months
    const newYear = Math.floor(monthIndex / 12)
    const newMonth = (monthIndex % 12) + 1
    return { year: newYear, month: newMonth, day: Math.min(day, daysInMonth(newYear, newMonth)) }
}

// How long a card at a given level must wait, after its last correct answer, before it is due again.
const WAIT_BEFORE_DUE = {
    1: date => addDays(date, 1),
    2: date => addDays(date, 7),
    3: date => addMonths(date, 1),
    4: date => addMonths(date, 12),
    5: date => addMonths(date, 12),
}

export function todayString(now = new Date()) {
    return formatDate({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() })
}

export function isDue({ level, date }, today = todayString()) {
    if (level === 0) {
        return true
    }

    const dueDate = formatDate(WAIT_BEFORE_DUE[level](parseDate(date)))
    return dueDate <= today
}

// A correct answer moves the card up one level (capped at MAX_LEVEL) and records today's date;
// an incorrect answer sends it back to level 0.
export function gradeCard({ level }, correct, today = todayString()) {
    if (!correct) {
        return { level: 0, date: 'NA' }
    }

    return { level: Math.min(level + 1, MAX_LEVEL), date: today }
}

export function splitEntries(text) {
    return text.split(SEPARATOR).map(entry => entry.trim()).filter(entry => entry)
}

export function joinEntries(entries) {
    return entries.map(entry => `${SEPARATOR}\n\n${entry}\n\n`).join('')
}

export function parseEntry(entry, index = 0) {
    const questionMatch = /\*\*QUESTION\*\*:/.exec(entry)
    const answerMatch = /\*\*ANSWER\*\*:/.exec(entry)
    const footerMatch = FOOTER_PATTERN.exec(entry)

    if (!questionMatch || !answerMatch || !footerMatch || questionMatch.index > answerMatch.index || answerMatch.index > footerMatch.index) {
        throw new Error(`Question with index ${index} must contain **QUESTION**, **ANSWER**, **LEVEL** and **DATE** in that order, with **LEVEL** and **DATE** on separate lines at the end, optionally followed by an **IMPORTANT** line.`)
    }

    const [, levelString, dateString, important = 'FALSE'] = footerMatch

    if (/\*\*IMPORTANCE\*\*:/.test(entry)) {
        throw new Error(`Question with index ${index} still has an old **IMPORTANCE** line. Delete it, and put **IMPORTANT**: TRUE on the line after **DATE** if the card is important.`)
    }

    if (!IMPORTANT_VALUES.includes(important)) {
        throw new Error(`Question with index ${index} has an invalid **IMPORTANT** "${important}". It must be TRUE or FALSE.`)
    }

    if (!/^[0-5]$/.test(levelString)) {
        throw new Error(`Question with index ${index} has an invalid **LEVEL** "${levelString}". It must be a whole number from 0 to ${MAX_LEVEL}.`)
    }

    const level = Number(levelString)

    if (level > 0 && !parseDate(dateString)) {
        throw new Error(`Question with index ${index} has an invalid **DATE** "${dateString}". It must be in YYYY-MM-DD format when **LEVEL** is above 0.`)
    }

    const question = entry.slice(questionMatch.index + questionMatch[0].length, answerMatch.index).trim()
    const answer = entry.slice(answerMatch.index + answerMatch[0].length, footerMatch.index).trim()

    return { question, answer, important: important === 'TRUE', level, date: dateString, questionIndexInFile: index }
}

export function parseCards(text) {
    return splitEntries(text).map(parseEntry)
}

export function withLevelAndDate(entry, { level, date }) {
    const footerMatch = FOOTER_PATTERN.exec(entry)
    const importantLine = footerMatch[3] === undefined ? '' : `\n**IMPORTANT**: ${footerMatch[3]}`
    return `${entry.slice(0, footerMatch.index)}**LEVEL**: ${level}\n**DATE**: ${date}${importantLine}`
}
