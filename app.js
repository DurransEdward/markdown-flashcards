import { marked } from 'marked'
import markedKatex from 'marked-katex-extension'
import { parseCards, isDue, MAX_LEVEL } from './cards.mjs'

marked.use(markedKatex({ nonStandard: true }))

const BUTTON_IDS = ['reveal-button', 'skip-button', 'correct-button', 'almost-correct-button', 'incorrect-button', 'restart-button']

let questions = []
let currentQuestionIndex = -1
let questionsFileName = ''

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Renders markdown/KaTeX; on failure shows an explicit error plus the raw source instead of breaking the card.
function renderMarkdown(source, part) {
    try {
        return marked.parse(source)
    } catch (error) {
        console.error(`Failed to render the ${part} of question ${currentQuestionIndex + 1}:`, error)
        return `<div class="render-error"><strong>⚠ Rendering error in this ${part}:</strong> ${escapeHtml(error.message)}</div>` +
            `<pre class="render-error-source">${escapeHtml(source)}</pre>`
    }
}

function showButtons(...visibleIds) {
    for (const id of BUTTON_IDS) {
        document.getElementById(id).hidden = !visibleIds.includes(id)
    }
}

function showLevel(level) {
    const badge = document.getElementById('level-badge')
    badge.textContent = "Level: " + level
    badge.style.setProperty('--level-progress', (level / MAX_LEVEL * 100) + '%')
    badge.hidden = false
}

function showImportant(important) {
    document.getElementById('important-badge').hidden = !important
}

function showQuestionsRemaining() {
    const counter = document.getElementById('questions-remaining')
    counter.textContent = "Questions remaining: " + (questions.length - currentQuestionIndex)
    counter.hidden = false
}

async function loadQuestionsFromInput() {
    questionsFileName = document.getElementById('file-input').value.trim()

    if (!questionsFileName) {
        alert("Please enter a file name.")
        throw new Error("Please enter a file name.")
    }

    if (questionsFileName === '.' || questionsFileName === '..' || /[\\/]/.test(questionsFileName)) {
        alert("Please enter a file name, not a path.")
        throw new Error("Please enter a file name, not a path.")
    }

    let text = ''

    try {
        const response = await fetch(`http://localhost:3000/questions/${encodeURIComponent(questionsFileName)}`)

        if (!response.ok) {
            throw new Error(`Could not load "${questionsFileName}" (HTTP ${response.status}). Check that the file is inside the questions directory.`)
        }

        text = await response.text()
    } catch (error) {
        alert(`Failed to load questions. ${error.message}`)
        throw error
    }

    let allQuestions = []

    try {
        allQuestions = parseCards(text)
    } catch (error) {
        alert(error.message)
        throw error
    }

    if (allQuestions.length === 0) {
        alert("No questions found in the file.")
        throw new Error("No questions found in the file.")
    }

    questions = allQuestions.filter(question => isDue(question))

    if (questions.length === 0) {
        alert("No questions are due today.")
        throw new Error("No questions are due today.")
    }

    document.getElementById('answer-input').style.visibility = 'visible'
}

async function askNextQuestion() {
    currentQuestionIndex++

    if (questions.length <= currentQuestionIndex) {
        finishedQuiz()
        return
    }

    showImportant(questions[currentQuestionIndex].important)
    showLevel(questions[currentQuestionIndex].level)
    showQuestionsRemaining()

    document.getElementById('header').textContent = "Question"
    document.getElementById('question-text').innerHTML = renderMarkdown(questions[currentQuestionIndex].question, 'question')
    document.getElementById('answer-section').hidden = true
    document.getElementById('answer-text').innerHTML = ''
    document.getElementById('text').scrollTop = 0

    showButtons('reveal-button', 'skip-button')

    document.getElementById('answer-input').value = ''
}

async function revealAnswer() {
    document.getElementById('answer-text').innerHTML = renderMarkdown(questions[currentQuestionIndex].answer, 'answer')

    const answerSection = document.getElementById('answer-section')
    answerSection.hidden = false
    answerSection.scrollIntoView({ block: 'nearest' })

    showButtons('correct-button', 'almost-correct-button', 'incorrect-button')
}

function finishedQuiz() {
    document.getElementById('header').textContent = "Finished Quiz!"
    document.getElementById('important-badge').hidden = true
    document.getElementById('level-badge').hidden = true
    document.getElementById('questions-remaining').hidden = true
    document.getElementById('question-text').innerHTML = ''
    document.getElementById('answer-section').hidden = true

    document.getElementById('answer-input').value = ''
    document.getElementById('answer-input').style.visibility = 'hidden'

    showButtons('restart-button')
}

async function recordAnswer(correct) {
    const response = await fetch('http://localhost:3000/record-answer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            questionsFileName,
            questionIndex: questions[currentQuestionIndex].questionIndexInFile,
            correct
        }),
    })

    if (response.ok) {
        await askNextQuestion()
    } else {
        alert('Failed to save your answer. Is the server running?')
        console.error('Failed to record answer')
    }
}

async function startQuiz() {
    currentQuestionIndex = -1
    await loadQuestionsFromInput()
    await askNextQuestion()
}

function setup() {
    document.getElementById('reveal-button').addEventListener('click', revealAnswer)
    document.getElementById('skip-button').addEventListener('click', askNextQuestion)
    document.getElementById('correct-button').addEventListener('click', () => recordAnswer(true))
    document.getElementById('almost-correct-button').addEventListener('click', askNextQuestion)
    document.getElementById('incorrect-button').addEventListener('click', () => recordAnswer(false))
    document.getElementById('restart-button').addEventListener('click', startQuiz)
    document.getElementById('load-questions-button').addEventListener('click', startQuiz)
}

setup()
