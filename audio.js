// Playback for the <audio class="card-audio"> players rendered by markdown.mjs.
// A clip starts shortly after it appears and then loops, with a gap between plays, until it is
// paused or the quiz moves on. Only one clip plays at a time.

export const AUTOPLAY_DELAY_MS = 500
export const REPLAY_GAP_MS = 1500

const pendingTimers = new Set()

function schedule(callback, delay) {
    const timer = setTimeout(() => {
        pendingTimers.delete(timer)
        callback()
    }, delay)
    pendingTimers.add(timer)
}

function clearPendingTimers() {
    for (const timer of pendingTimers) {
        clearTimeout(timer)
    }
    pendingTimers.clear()
}

function play(audio) {
    // A removed <audio> element can still play, so never start one that is no longer on the page.
    if (!audio.isConnected) {
        return
    }

    audio.play().catch(error => {
        // AbortError just means we moved on before playback started; load errors are shown by showLoadError.
        if (error.name === 'NotAllowedError') {
            console.info(`The browser blocked autoplay of "${audio.dataset.path}". Press play to listen.`)
        }
    })
}

function showLoadError(audio) {
    const heading = document.createElement('strong')
    heading.textContent = "⚠ Couldn't load audio clip:"

    const message = document.createElement('div')
    message.className = 'render-error'
    message.append(heading, ` "${audio.dataset.path}". Check that the file exists in decks/audio/ and is an .mp3, .m4a, .wav or .ogg file.`)

    audio.replaceWith(message)
}

export function setupAudio(container) {
    for (const audio of container.querySelectorAll('.card-audio')) {
        audio.addEventListener('play', () => {
            clearPendingTimers()
            for (const other of document.querySelectorAll('.card-audio')) {
                if (other !== audio) {
                    other.pause()
                }
            }
        })
        audio.addEventListener('ended', () => schedule(() => play(audio), REPLAY_GAP_MS))
        audio.addEventListener('error', () => showLoadError(audio))

        if (audio.error) {
            showLoadError(audio)
        }
    }
}

export function autoplayFirst(container) {
    const audio = container.querySelector('.card-audio')

    if (audio) {
        schedule(() => play(audio), AUTOPLAY_DELAY_MS)
    }
}

export function stopAudio() {
    clearPendingTimers()
    for (const audio of document.querySelectorAll('.card-audio')) {
        audio.pause()
    }
}
