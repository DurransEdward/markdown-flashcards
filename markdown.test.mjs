import { test } from "node:test";
import assert from "node:assert/strict";
import { createMarkdownRenderer, escapeHtml, isAudioPath } from "./markdown.mjs";

const render = createMarkdownRenderer("http://localhost:3000/decks/");

test("an audio clip in the audio folder renders as a player served from the decks folder", () => {
  const html = render("Écoutez :\n\n![](audio/ca_va.m4a)");
  assert.match(
    html,
    /<audio class="card-audio" controls preload="auto" src="http:\/\/localhost:3000\/decks\/audio\/ca_va\.m4a" data-path="audio\/ca_va\.m4a"><\/audio>/,
  );
  assert.doesNotMatch(html, /render-error/);
});

test("audio extensions are matched case-insensitively and paths with spaces are encoded", () => {
  assert.match(
    render("![](audio/BONJOUR.MP3)"),
    /<audio [^>]*src="http:\/\/localhost:3000\/decks\/audio\/BONJOUR\.MP3"/,
  );
  assert.match(
    render("![](<audio/ça va.mp3>)"),
    /<audio [^>]*src="http:\/\/localhost:3000\/decks\/audio\/%C3%A7a%20va\.mp3"/,
  );
});

test("an audio clip outside the audio folder renders an explicit error instead of a player", () => {
  for (const path of [
    "ca_va.mp3",
    "../x.mp3",
    "audio/../x.mp3",
    "other/x.mp3",
    "https://example.com/x.mp3",
  ]) {
    const html = render(`![](${path})`);
    assert.match(html, /render-error/, path);
    assert.doesNotMatch(html, /<audio/, path);
  }
});

test("images that are not audio still render as images", () => {
  const html = render("![pic](x.png)");
  assert.match(html, /<img src="x\.png" alt="pic">/);
  assert.doesNotMatch(html, /<audio/);
});

test("KaTeX still renders alongside audio", () => {
  const html = render("$x^2$ and ![](audio/x.wav)");
  assert.match(html, /class="katex"/);
  assert.match(html, /<audio /);
});

test("the original path is escaped in the player's attributes", () => {
  const html = render('![](<audio/a"b.ogg>)');
  assert.match(html, /data-path="audio\/a&quot;b\.ogg"/);
});

test("escapeHtml escapes characters that are special in text and attributes", () => {
  assert.equal(escapeHtml(`<a href="x">&</a>`), "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
});

test("isAudioPath recognises the supported audio extensions only", () => {
  for (const path of ["a.mp3", "a.m4a", "a.wav", "a.ogg", "a.OGG"]) {
    assert.equal(isAudioPath(path), true, path);
  }
  for (const path of ["a.png", "a.mp3.png", "mp3", "a.flac"]) {
    assert.equal(isAudioPath(path), false, path);
  }
});
