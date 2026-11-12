import { Marked } from "marked";
import markedKatex from "marked-katex-extension";

export const AUDIO_FOLDER = "audio/";
export const AUDIO_EXTENSIONS = [".mp3", ".m4a", ".wav", ".ogg"];

export function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isAudioPath(path) {
  const lowerCasePath = path.toLowerCase();
  return AUDIO_EXTENSIONS.some((extension) => lowerCasePath.endsWith(extension));
}

// Audio clips are written like images, e.g. ![](audio/ca_va.m4a), with the path relative to the
// decks folder. They must live inside decks/audio/; anything else renders as an explicit error.
function renderAudio(path, decksUrl) {
  const audioFolderUrl = new URL(AUDIO_FOLDER, decksUrl).href;
  const url = new URL(path, decksUrl).href;

  if (!url.startsWith(audioFolderUrl)) {
    return (
      `<div class="render-error"><strong>⚠ Audio clip outside the audio folder:</strong> "${escapeHtml(path)}". ` +
      `Put the clip in decks/${AUDIO_FOLDER} and write it as ![](${AUDIO_FOLDER}file_name.m4a).</div>`
    );
  }

  return `<audio class="card-audio" controls preload="auto" src="${escapeHtml(url)}" data-path="${escapeHtml(path)}"></audio>`;
}

// Returns a function that renders card markdown (with KaTeX) to HTML. decksUrl is the URL the
// server serves the decks folder from, e.g. "http://localhost:3000/decks/".
export function createMarkdownRenderer(decksUrl) {
  const marked = new Marked();
  marked.use(markedKatex({ nonStandard: true }));
  marked.use({
    renderer: {
      image({ href }) {
        // Returning false falls back to marked's normal <img> rendering.
        return isAudioPath(href) ? renderAudio(href, decksUrl) : false;
      },
    },
  });

  return (source) => marked.parse(source);
}
