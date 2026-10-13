# 履歴書 (Rirekisho) Maker — Bilingual Japanese & English CV Generator

Web-based Japanese curriculum vitae (履歴書) generator built with Python (Flask) and ReportLab.

Renders pixel-accurate, standard JIS-format A4 履歴書 PDFs directly in the browser with **bilingual (Japanese & English side-by-side)** support, live preview, photo cropping/embedding, Japanese era (和暦) conversion, and JSON save/load support.

---

## ✨ Features

- **Bilingual Interface & PDF (日英併記)**:
  - Both the **web UI form** and the **generated PDF** feature Japanese and English side-by-side labels (e.g., `氏 名 / Full Name`, `学歴・職歴 / Academic & Employment History`).
  - Toggle between **日英併記 (Bilingual JP & EN)** and **日本語のみ (Japanese Only)** with one click.
- **Standard JIS Layout**: Faithful Japanese resume layout with accurate cell dimensions, borders, and typography.
- **Japanese Era Conversion**: Automatically converts Western years (西暦) to Japanese era years (和暦: 令和・平成・昭和・大正・明治) and calculates exact age (`満○歳 / Age: ○`).
- **Live In-Browser Preview**: See the generated PDF inside an iframe without having to leave or refresh the page.
- **High-Quality CJK Typography**: Uses official IPAex Mincho (`ipaexm.ttf`) font with built-in font downloader and fallback.
- **Photo Upload**: Supports portrait photo upload with preview, auto-centering, and optional removal.
- **Dynamic Rows**: Easily add/remove entries for Education (学歴), Work History (職歴), and Licenses/Certifications (免許・資格).
- **JSON Save & Load**: Save form drafts as `.json` files to reuse, edit, or share anytime.
- **One-Click Bilingual Sample Data**: "✨ サンプル / Sample" button pre-fills the form with a complete, realistic bilingual profile and generates an instant preview.

---

## 🚀 Quick Start

### 1. Requirements

- Python 3.10+
- `uv` (recommended) or `pip` / `python3-venv`

### 2. Run the Server

**Easiest way (single command):**
```bash
./run.sh
```

Or manually:
```bash
.venv/bin/python app.py
```

### 3. Open in Browser

Open your browser and navigate to:
```
http://localhost:5000
```

---

## 📁 Project Structure

```
cv-maker/
├── app.py                 # Flask server & REST API endpoints
├── era_converter.py       # Western (西暦) ↔ Japanese Era (和暦) conversion module
├── pdf_generator.py       # ReportLab JIS-format PDF generator (Bilingual & Japanese modes)
├── requirements.txt       # Python dependencies (Flask, ReportLab, Pillow)
├── fonts/                 # Japanese TrueType font directory (ipaexm.ttf)
├── static/
│   ├── css/
│   │   └── style.css      # Responsive bilingual UI styles & layout
│   └── js/
│       └── app.js         # Frontend interactivity, live preview, JSON import/export
└── templates/
    └── index.html         # Main bilingual web UI template
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Web application UI |
| `POST` | `/api/generate` | Generates rirekisho PDF (Attachment download) |
| `POST` | `/api/preview` | Generates rirekisho PDF (Inline iframe view) |
| `GET` | `/api/eras` | Returns JSON list of Japanese era metadata |
| `POST` | `/api/download-font` | Downloads IPAex Mincho font if not present |
