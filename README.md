# VLearn — LMS Prototype

Interactive prototype of a modern Learning Management System built for the K4 Hackathon
checkpoint. It reproduces the "reading a lecture PDF with an AI tutor beside you" workflow:
a materials browser on the left, a slide viewer in the middle, and a context-aware chatbot
on the right.

Built with **React 19**, **Vite**, **Tailwind CSS v4**, and **Lucide React** icons.

## Getting started

```bash
npm install
npm run dev
```

The dev server runs at http://localhost:5173.

Other scripts: `npm run build` (production bundle) and `npm run preview` (serve the build).

## Layout

| Region | What it contains |
| --- | --- |
| Top nav (`h-16`) | VLearn logo, back button, current file `day01_302.pdf` with `COMP2010 · Lecture_material` subtitle, language toggle, dark mode toggle, user dropdown |
| Left column (`w-1/4`) | "Học liệu môn học" accordion — Day 01 expanded with the active `day01_302.pdf` item, Day 02–04 collapsed, plus search and a course progress bar |
| Center column (`w-1/2`) | Toolbar (Đọc / Bút / Highlight, page indicator, zoom, download, delete) above a scrollable slide canvas rendering the "Agenda" slide with a watermark |
| Right column (`w-1/4`) | VLearn Tutor chat — header with page-context tag, scrollable history, and the input area |

## Interactions

The tutor is a mock smart agent driven by a hardcoded Q&A bank of 4 scenarios
(defined in `QA_BANK` inside `src/components/TutorChat.jsx`):

1. Click a suggestion chip (or type that exact question) → the question appears as a user message.
2. A loading bubble shows **"AI đang suy nghĩ..."** for 1 second.
3. The matching hardcoded answer is appended as a bot message.
4. Any other free-form text returns a fallback asking the user to pick a suggestion.

Also interactive:

- **Select text on the slide** — the highlighted passage becomes a context chip above the
  input and is attached as a quote to your next message.
- **Zoom and paging** — the slide is laid out on a fixed 720×540 canvas and scaled to fit the
  column, so it never reflows or clips; the page indicator drives the chat's context tag.
- **Dark mode**, **language toggle**, **materials accordion**, **document search**, and the
  **user dropdown** all respond to clicks.

## Project structure

```
src/
  App.jsx                     Shell + shared state (theme, page, selected text)
  components/
    TopNav.jsx                Header, toggles, profile dropdown
    MaterialSidebar.jsx       Course materials accordion
    PdfViewer.jsx             Toolbar + scaled slide canvas
    TutorChat.jsx             Chat state, message bubbles, input
  index.css                   Tailwind entry, dark variant, scrollbar styling
```

## Notes

The tutor responses are hard-coded in `QA_BANK` — there is no backend or model call.
To wire this to a live service, replace `resolveAnswer()` in `TutorChat.jsx` with an API request
while keeping the same message / loading UX.
