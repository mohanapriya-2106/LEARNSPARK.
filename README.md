 ⚡ LearnSpark — Student Learning Portal

A futuristic student learning portal with course videos, quizzes, certificates, and a full activity task tracker.

## 📁 Project Structure

```
learnspark/
├── index.html      ← Main HTML (links to CSS + JS)
├── style.css       ← All styles
├── script.js       ← All JavaScript logic
├── events.json     ← Single source of truth: courses, quizzes, tasks, students
└── README.md
```

## ✅ Features

- **Multi-student login** with 4-digit PIN security
- **Student registration** with emoji avatar picker
- **3 Courses**: HTML, CSS, JavaScript — each with YouTube video + timed quiz
- **Certificate generation** (with PDF download via jsPDF)
- **Activity Task Tracker**:
  - 6 preset course tasks seeded for every student
  - Tasks marked Done show a ✅ badge + completion timestamp
  - Live "X out of Y activities completed" counter updates instantly
  - Visual progress bar syncs on every toggle
  - Preset course tasks auto-mark done when the matching quiz is passed
- **Profile page** with stats, achievements, and task summary
- **Leaderboard** across all students
- **Learning calendar** heatmap (GitHub-style)
- **Fireworks** on 100% quiz scores
- **Dark/light mode** toggle
- **Auto-save** on tab hide or page close

## 🚀 How to Run

### Option 1: GitHub Pages (Recommended)
1. Push all files to a GitHub repository
2. Go to **Settings → Pages → Source → main branch / root**
3. Your site will be live at `https://yourusername.github.io/learnspark/`

### Option 2: Local with a dev server
```bash
# Python (built-in)
python -m http.server 8080
# Then open http://localhost:8080

# OR Node.js (npx)
npx serve .
```

> ⚠️ **Important**: `events.json` is fetched via `fetch('./events.json')`.  
> This requires a server — it won't work if you open `index.html` directly as a file (`file://`).  
> The app includes a fallback with inline data if the fetch fails.

## 🔑 Default PINs (Built-in Students)

| Student | PIN  |
|---------|------|
| ANU     | 1111 |
| ANAMIKA | 2222 |
| ADHI    | 3333 |
| KRISHNA | 4444 |
| VARUN   | 5555 |

Custom registered students use their own chosen PIN.

## 🛠️ Customising

All course content, quiz questions, preset tasks, and student data live in **`events.json`** — edit that file to add new courses, change questions, or update tasks without touching any code.

## 📦 Dependencies (CDN — no install needed)

- [jsPDF 2.5.1](https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.jspdf.umd.min.js) — certificate PDF export
- [Google Fonts](https://fonts.google.com/) — Orbitron, Rajdhani, Space 
# LEARNSPARK.
