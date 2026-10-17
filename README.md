# PhishGuard

PhishGuard analyzes URLs and email content for phishing. It checks links against Google Safe Browsing and VirusTotal, scores emails with keyword rules plus AI analysis, and keeps a searchable history of every scan with a downloadable PDF report.

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://phishing-detection-pied.vercel.app)
[![API Docs](https://img.shields.io/badge/Backend_API-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://your-backend.onrender.com/docs)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

## Screenshots

| Admin analytics | Scan verdict |
| :---: | :---: |
| ![Admin dashboard](https://raw.githubusercontent.com/Ayusht20/phishing-detection/main/assets/admin-dashboard.png) | ![Scan verdict](https://raw.githubusercontent.com/Ayusht20/phishing-detection/main/assets/scan-verdict.png) |

| Scan history | PDF report |
| :---: | :---: |
| ![Scan history](https://raw.githubusercontent.com/Ayusht20/phishing-detection/main/assets/scan-history.png) | ![PDF report](https://raw.githubusercontent.com/Ayusht20/phishing-detection/main/assets/report-preview.png) |

---

## Features

- **URL scanning:** Google Safe Browsing and VirusTotal are queried concurrently, and the results are combined into a verdict (`safe`, `suspicious`, `phishing`) with a risk level.
- **Email analysis:** keyword and sender rules, AI analysis, and a Safe Browsing check on up to 5 embedded links. Returns a 0-100 risk score, a summary and a list of red flags.
- **Scan history:** server-side pagination, URL/email filter, per-scan delete and clear-all.
- **PDF reports:** download a report for any scan, either right after it finishes or from the history list.
- **Admin console:** platform analytics (scans per day by verdict, verdict and scan-type breakdowns, most active users, latest threats) and user role management.
- **Rate limiting:** scan endpoints are limited to 5 requests per minute per IP to protect third-party API quotas.

## Tech stack

**Frontend**
- Next.js (App Router) and React
- Tailwind CSS
- Recharts
- Lucide React
- Axios

**Backend**
- FastAPI (Python 3.11+) with `asyncio` for concurrent API calls
- SQLAlchemy with SQLite or PostgreSQL
- Pydantic v2
- JWT authentication
- SlowAPI for rate limiting
- ReportLab for PDF generation
- Google Safe Browsing API v4 and VirusTotal API v3

## Project structure

```text
phishing-detection/
├── backend/
│   ├── app/
│   │   ├── models/            # SQLAlchemy models (User, Scan)
│   │   ├── routes/            # auth, scan, email_scan, history, admin, admin_stats
│   │   ├── schemas/           # Pydantic request/response models
│   │   ├── services/          # VirusTotal, Safe Browsing, email rules, AI analysis
│   │   ├── utils/             # security (JWT), limiter, report (PDF)
│   │   ├── database.py        # engine and session setup
│   │   └── main.py            # app entry point, CORS, rate limiter
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/               # pages: dashboard, admin, login
│   │   ├── components/        # UrlScanner, EmailScanner, ScanHistory,
│   │   │                      # DownloadReportButton, AdminAnalytics, ...
│   │   ├── constants/         # API endpoint map
│   │   ├── lib/               # shared scan helpers
│   │   └── services/          # Axios instance
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## Getting started

**Backend**

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # add your API keys and secrets
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`, with interactive docs at `/docs`.

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

## Use cases

- **URL triage:** check a suspicious or shortened link before anyone clicks it.
- **Email review:** paste a suspicious message to see its red flags, embedded links and a risk score.
- **Evidence for tickets:** download a PDF report of any scan to attach to an incident or share with a colleague.
- **Activity review:** admins can see scan volume, verdict mix and the most active users over 7, 14 or 30 days.

## Roles

**User**
- Run URL and email scans
- Browse, filter and delete their own scan history
- Download PDF reports for their own scans

**Admin**
- Everything a user can do
- View platform analytics at `/admin/dashboard`
- Promote or demote other users

## Rate limiting

`POST /api/scan/url` and `POST /api/scan/email` are each limited to 5 requests per minute per client IP. Exceeding the limit returns HTTP 429, and the dashboard shows a cooldown message.

## Conclusion

PhishGuard bridges the gap between complex cyber threat intelligence engines and fast-paced operational workflows. By packaging asynchronous backend processing into an intuitive, telemetry-rich interface, it delivers enterprise-grade endpoint security analysis suitable for security analysts, IT administrators, and corporate defense teams.

## License

MIT