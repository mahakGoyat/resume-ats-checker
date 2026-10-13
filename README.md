# ScoreMyResume: Free ATS Resume Checker

Check how an Applicant Tracking System (ATS) reads your resume. ScoreMyResume scores your resume, matches it against job keywords and gives AI-powered suggestions, all with no account needed.

**Live demo:** [resume-ats-checker-beta-six.vercel.app](https://resume-ats-checker-beta-six.vercel.app)

## Features

- **ATS score:** upload your resume and get a score for how well an ATS can read it
- **Keyword matching:** compare your resume against the keywords job postings look for
- **AI analysis:** smart feedback powered by Groq and Google Gemini
- **Formatting suggestions:** an improve page that points out what to fix
- **No sign-up:** completely free to use
- **Export:** download your resume as PDF or DOCX
- **Free tools:** resume template library and keyword finder
- **Guides and blog:** resume-help pages for different job fields and cities, plus blog articles
- **Admin dashboard:** protected area to manage blog posts

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Styling and UI:** Tailwind CSS, Radix UI, Framer Motion, Recharts
- **Backend:** Node.js, Express
- **AI:** Groq SDK, Google Gemini (Generative AI SDK)
- **Database:** Supabase (blog and admin dashboard)
- **File handling:** pdf.js, Mammoth (DOCX), Tesseract.js (OCR), jsPDF, docx, pdf-lib
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 24
- [pnpm](https://pnpm.io/installation)

### Installation

```bash
git clone https://github.com/mahakGoyat/resume-ats-checker.git
cd resume-ats-checker
pnpm install
```

### Run the website

```bash
cd artifacts/resume-ats-score-checker
pnpm run dev
```

Open `http://localhost:5173` in your browser.

### Run the API server (for AI features)

From the project root:

```bash
pnpm --filter @workspace/api-server run dev
```

### Build for production

```bash
cd artifacts/resume-ats-score-checker
pnpm run build
```

## Environment Variables

Create a `.env` file in the folder you are running and add your own keys:

- **Website** (`artifacts/resume-ats-score-checker`): copy `.env.example` to `.env` and add your Supabase URL and anon key. These are only needed for the blog and admin dashboard.
- **API server** (`artifacts/api-server`): add your own Groq and Google Gemini API keys. These are needed for the AI analysis.

Never commit your `.env` file or share your API keys.

## Project Structure

```
artifacts/
├── resume-ats-score-checker/   # React website
└── api-server/                 # Express API with Groq and Gemini
```

## Author

Built by [Mahak](https://github.com/mahakGoyat).
