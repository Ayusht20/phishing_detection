# PhishGuard — AI-Assisted Phishing Detection

PhishGuard is a web application for checking suspicious URLs and email messages. It combines external URL reputation checks with email-content analysis, then presents a verdict and keeps a history of scans for later review.

<p align="center">
  <a href="https://phishing-detection-pied.vercel.app"><strong>Open the frontend demo</strong></a>
  &nbsp; · &nbsp;
  <a href="https://phishing-detection-9em2.onrender.com/docs"><strong>Backend API documentation</strong></a>
</p>

> **Deployment note:** The repository references the Render API URL above, but this README does not claim that the live service is currently healthy. Confirm the API docs URL and the frontend's `NEXT_PUBLIC_API_URL` deployment setting before presenting the deployment as verified.

## Screenshots

Screenshots show the landing page, URL scanner, email analyzer, account creation, and scan history. The images are stored in `docs/screenshots/`.

| Landing page | How it works |
|---|---|
| ![PhishGuard landing page](docs/screenshots/landing-page.jpg) | ![Three-step workflow](docs/screenshots/how-it-works.jpg) |

| URL scanner | Email analyzer |
|---|---|
| ![URL scanner](docs/screenshots/url-scanner.jpg) | ![Email analyzer](docs/screenshots/email-analyzer.jpg) |

| Scan history with records | Empty scan history |
|---|---|
| ![Scan history](docs/screenshots/scan-history-populated.jpg) | ![Empty scan history](docs/screenshots/scan-history-empty.jpg) |

| Registration | Product features |
|---|---|
| ![Create account page](docs/screenshots/register.jpg) | ![PhishGuard features](docs/screenshots/features.jpg) |

*The screenshots are UI examples, not evidence of detection accuracy, throughput, or production uptime.*

## Features

- **URL scanning:** checks URLs with Google Safe Browsing and VirusTotal and combines the available results into a verdict and risk level.
- **Email analysis:** evaluates sender, subject, and body using rule-based indicators and configured AI analysis. Extracted links can also be checked with Google Safe Browsing.
- **Scan history:** lists previous scans, supports URL/email filters and pagination, and provides individual-record deletion and clear-all.
- **PDF reports:** generates a downloadable PDF for a scan.
- **User accounts:** registration and login with token-based authentication.
- **Admin dashboard:** administrative user/role management and scan analytics.
- **Rate limiting:** protects scan endpoints from excessive requests.

## Technology stack

**Frontend**
- Next.js App Router and React
- Tailwind CSS
- Axios
- Recharts
- Lucide React and React Icons

**Backend**
- Python and FastAPI
- SQLAlchemy and Pydantic
- PostgreSQL (deployed configuration) or SQLite where supported by configuration
- JWT authentication and password hashing
- `httpx` / `asyncio` for external service requests
- ReportLab for PDF generation
- SlowAPI for rate limiting

**External services**
- VirusTotal API v3
- Google Safe Browsing API
- Groq and/or Gemini for AI-assisted email analysis, when configured

## Repository structure

```text
phishing-detection/
├── backend/
│   ├── app/
│   │   ├── models/            # SQLAlchemy ORM entities (User, Scan)
│   │   ├── routes/            # REST API endpoints (auth, scan, history, admin)
│   │   ├── schemas/           # Pydantic validation & response envelopes
│   │   ├── services/          # Multi-engine inspection services (VT, SafeBrowsing)
│   │   ├── utils/             # JWT security, defangers, token helpers
│   │   ├── database.py        # Database sessions & engine initialization
│   │   └── main.py            # FastAPI entry point, CORS & lifecycle
│   ├── requirements.txt       # Python dependencies
│   └── .env.example           # Backend environment configuration
│
├── frontend/
│   ├── src/
│   │   ├── app/               # Next.js App Router (dashboard, admin, auth)
│   │   ├── components/        # Reusable UI (ScanHistory, AdminUI, Cards)
│   │   ├── constants/         # API routes & route maps
│   │   ├── services/          # Axios instance & interceptors
│   │   └── utils/             # Defangers, formatters, dossier generator
│   ├── package.json           # Frontend dependencies & Next scripts
│   └── tailwind.config.js     # Design system theme
└── README.md
```
## Roles

**User**
- Run URL and email scans
- Browse, filter and delete their own scan history
- Download PDF reports for their own scans

**Admin**
- View platform analytics at `/admin/dashboard`
- Promote or demote other users

## Rate limiting

`POST /api/scan/url` and `POST /api/scan/email` are each limited to 5 requests per minute per client IP. Exceeding the limit returns HTTP 429, and the dashboard shows a cooldown message.

## Run locally

### Prerequisites

- Python 3.11 or a version supported by the backend dependencies
- Node.js and npm
- A PostgreSQL database if using PostgreSQL locally
- API keys for the external services you want to use

### 1. Configure the backend

From the repository root:

```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
copy .env.example .env
```

Edit `backend/.env` and set the database URL and secret values for your environment. Do not commit `.env` or paste credentials into public issues or documentation.

Typical settings include:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
SECRET_KEY=replace-with-a-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
VIRUSTOTAL_API_KEY=
GOOGLE_SAFE_BROWSING_API_KEY=
GROQ_API_KEY=
GEMINI_API_KEY=
```

Use the variable names expected by `backend/app/config.py`; keep optional provider keys empty only if the corresponding feature can run without them. Make sure the database server is running and the database exists before starting the backend.

Start the API from the `backend` directory:

```bat
python -m uvicorn app.main:app --reload
```

Local API base URL: `http://127.0.0.1:8000`  
Interactive API docs: `http://127.0.0.1:8000/docs`

### 2. Configure the frontend

Open a second terminal:

```bat
cd frontend
npm install
```

Create `frontend/.env.local` and set the backend API base URL:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Then start the frontend:

```bat
npm run dev
```

Open `http://localhost:3000`.

For a deployed frontend, set `NEXT_PUBLIC_API_URL` in the hosting provider's environment-variable settings to the deployed backend's base URL (without `/docs`). Redeploy the frontend after changing it. The backend CORS configuration must also allow the frontend's origin.

## Main user workflows

1. Register or sign in.
2. Submit a suspicious URL in the URL scanner, or paste an email's sender, subject, and body into the email analyzer.
3. Review the verdict, risk level, score/summary, and any detected red flags or links.
4. Open scan history to review earlier results, filter by scan type, download a report, or delete records.

Administrators can access the admin dashboard for available user-management and analytics features.

## Security and limitations

- A verdict is an aid to investigation, not a guarantee that a URL or message is safe.
- External threat feeds and AI providers can be unavailable, rate-limited, or return incomplete results.
- Keep API keys, database credentials, JWT secrets, and production environment files out of source control.
- Validate production CORS settings, authentication/authorization, database persistence, provider failure handling, and rate limiting before public use.
- Do not publish detection-accuracy, scan-volume, speed, or customer-testimonial claims unless they have been measured and can be substantiated.

## API overview

The backend provides endpoints for authentication, URL scans, email scans, scan history, PDF reports, and admin features. The interactive FastAPI documentation is available at `/docs` when the backend is running.

Common route groups include:

- `/api/auth/`
- `/api/scan/`
- `/api/scan/history`
- `/api/admin/`

Use the live API documentation for exact request schemas and currently available endpoints.

## License

Check the repository's license file and confirm its terms before redistributing this project. If the project does not include a license file, do not assume it is MIT-licensed.


## Conclusion

PhishGuard brings URL reputation checking, email phishing analysis, scan history, PDF reporting, and administrative insights together in one web application. By combining external threat-intelligence services with rule-based and AI-assisted email analysis, it helps users examine suspicious content and understand potential warning signs.

The project is intended as a decision-support tool, not a guarantee that any message or URL is safe. Its reliability depends on correct configuration, available external services, and thorough testing of the deployed environment. Before production use, the team should verify the live deployment, API configuration, authentication and authorization, database persistence, and the accuracy of any performance claims.

PhishGuard provides a foundation that the team can continue improving through automated tests, clearer operational documentation, and measured evaluation of detection performance.
