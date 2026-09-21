# Smart Farmer Procurement & Assistance Portal

A complete, runnable web application for crop procurement: farmers register, upload documents,
find the nearest procurement centre, submit crop details, track the request through weighing and
quality check, and download a digital receipt. It includes an admin dashboard and a trilingual
(English / हिंदी / मराठी) AI farmer assistant.

Built with **HTML5, CSS3, Bootstrap 5, JavaScript, Node.js, Express and SQLite**.

---

## 1. What you need before starting

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 18 or newer | Download from nodejs.org. Check with `node -v` |
| VS Code | any recent | Any editor works; VS Code is assumed below |

No database server is needed. SQLite stores everything in a single file that is created
automatically the first time you start the project.

---

## 2. How to run it (4 commands)

Open the `farmer-portal` folder in VS Code, then open a terminal
(**Terminal → New Terminal**, or `` Ctrl+` ``) and run:

```bash
npm install          # 1. install the dependencies (needs internet, one time only)
cp .env.example .env  # 2. create your settings file  (Windows: copy .env.example .env)
npm start             # 3. start the server
```

Then open **http://localhost:5000** in your browser.

**Which file runs first?** `backend/server.js`. You never open it by hand — `npm start` runs it.
The server also serves all the frontend pages, so `http://localhost:5000` loads `frontend/index.html`.

> **Do not double-click `frontend/index.html`.** Opening it as a `file://` page means the browser
> cannot talk to the API. Always go through `npm start` and `http://localhost:5000`.
> (If you prefer the VS Code *Live Server* extension on port 5500, it works too: `frontend/js/api.js`
> automatically points the API calls at `http://localhost:5000`. The Express server must still be running.)

### Demo logins

| Role | Login | Password |
|---|---|---|
| Farmer | mobile `9876543210` | `demo1234` |
| Administrator | username `admin` | `admin123` |

Other demo farmers: `9876500002`, `9876500003`, `9876500004` — all with password `demo1234`.

### Useful commands

| Command | What it does |
|---|---|
| `npm start` | Start the server on port 5000 |
| `npm run dev` | Start with auto-restart while you edit files |
| `npm run seed` | Load demo data (only if the database is empty) |
| `npm run reset` | Wipe the database and reload fresh demo data |

---

## 3. Project structure

```
farmer-portal/
├── package.json              dependencies and npm scripts
├── .env.example              settings template (copy to .env)
├── README.md
│
├── backend/
│   ├── server.js             ENTRY POINT - Express app, routes, static files
│   ├── config/
│   │   ├── db.js             SQLite connection
│   │   ├── schema.sql        all 8 tables
│   │   └── seed.js           fictional demo data
│   ├── middleware/
│   │   ├── auth.js           JWT login checks (farmer / admin)
│   │   └── upload.js         file uploads: PDF/JPG/PNG only, 5 MB limit
│   ├── controllers/          one file per feature (auth, farmer, centre,
│   │                         document, procurement, transaction,
│   │                         notification, crop, assistant, admin)
│   ├── routes/               one route file per controller
│   ├── utils/helpers.js      distance, ID generators, validation
│   ├── uploads/              uploaded documents (created at runtime)
│   └── data/                 farmer_portal.db (created at runtime)
│
└── frontend/
    ├── index.html            landing page
    ├── login.html            login + forgot password
    ├── register.html         farmer registration
    ├── dashboard.html        farmer dashboard, stats, notifications
    ├── centres.html          nearby centre finder (list + map)
    ├── documents.html        6-document upload manager
    ├── procurement.html      procurement form + request tracking
    ├── receipts.html         digital receipt view / print / download / share
    ├── transactions.html     transaction history with filters
    ├── crops.html            crop information guides
    ├── assistant.html        AI farmer assistant (EN / HI / MR)
    ├── profile.html          farmer profile
    ├── admin.html            administrator dashboard
    ├── css/style.css         the whole theme
    ├── assets/               logo and hero graphics (SVG)
    └── js/
        ├── api.js            all API calls + session handling
        ├── components.js     navbar, footer, toasts, formatting helpers
        └── one file per page (home, auth, dashboard, centres, documents,
                               procurement, receipts, transactions, crops,
                               assistant, profile, admin)
```

---

## 4. Features

**Farmer side**
- Registration with validation, login, show/hide password, forgot password, logout
- Dashboard: crops submitted, total quantity, completed transactions, total value, latest
  transaction, live notifications, document readiness bar
- Nearby centre finder: browser GPS ("Use my location"), distance in km, working hours,
  queue length, estimated waiting time, crops accepted, contact, Open / Busy / Closed status,
  search, crop and status filters, sorting, list view + map view, "Get directions"
- Document manager: 6 documents (Aadhaar, farmer ID, land record, bank passbook, crop record,
  photo), PDF/JPG/PNG up to 5 MB, statuses Not Uploaded → Uploaded → Under Verification →
  Verified, replace and delete, "4 / 6 documents uploaded" progress
- Procurement: full form, confirmation summary before submit, success screen with the
  procurement ID, and a 7-stage tracker — Submitted → At Centre → Weighing → Quality Check →
  Accepted → Payment Processing → Completed
- Digital receipt with a unique transaction number: view, print, download, share
- Transaction history with search and crop/date filters
- Crop information for 9 crops in English, Hindi and Marathi
- AI assistant in 3 languages with suggested questions and a clear-chat button
- Profile editing (no sensitive data shown)

**Admin side** (`admin.html`)
- Counts for farmers, centres, active requests, completed transactions, pending documents, queue
- Change the status of any procurement request (setting it to Completed generates the receipt)
- Add / edit / delete procurement centres
- View farmers, verify or reject documents, view all transactions

---

## 5. AI assistant: demo mode and real API mode

**Demo mode is the default and needs no key.** Answers come from a keyword knowledge base in
`backend/controllers/assistantController.js`, in all three languages, so the assistant works
offline during a demonstration.

**To connect a real AI model**, edit `.env` and restart the server:

```env
AI_PROVIDER=anthropic       # or: openai
AI_API_KEY=paste_your_key_here
AI_MODEL=claude-sonnet-4-5  # or: gpt-4o-mini
```

The page badge changes from "demo mode" to "AI mode". If the key is missing or the request fails,
the assistant silently falls back to demo mode, so a live demo never breaks.

The map uses **Leaflet + OpenStreetMap and needs no API key at all**. If you want Google Maps
later, `frontend/js/centres.js` has a comment marked `GOOGLE MAPS HOOK` showing where to swap it.

---

## 6. Database

SQLite file at `backend/data/farmer_portal.db`, schema in `backend/config/schema.sql`.

| Table | Holds |
|---|---|
| `farmers` | account, farmer code, village, hashed password |
| `documents` | uploaded file record + verification status |
| `centres` | procurement centres, coordinates, hours, queue, crops |
| `procurement_requests` | crop submissions and their current stage |
| `transactions` | completed procurements = digital receipts |
| `notifications` | farmer alerts |
| `crop_info` | crop guides in English, Hindi, Marathi |
| `admins` | administrator accounts |

Demo data: 6 centres, 4 farmers, 9 crops, 4 documents, 4 procurement requests, 3 transactions,
4 notifications.

---

## 7. Security and privacy

- Passwords are hashed with bcrypt and never stored or returned in plain text
- Login uses signed JWT tokens; every farmer route checks ownership of the record
- All `/api/admin/*` routes are behind an administrator check
- Uploads are restricted to PDF/JPG/PNG, capped at 5 MB, and saved under randomised names
- The `uploads` folder is **not** served as static files — a document can only be opened by its
  owner (or an admin) through an authenticated route
- Every form is validated on both the browser and the server
- **There is no column anywhere in the schema for an Aadhaar number, a bank account number or an
  IFSC code.** Identity documents exist only as uploaded files with a status. All demo data is
  fictional. Never load real citizen data into this project.

---

## 8. API reference

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create a farmer account |
| POST | `/api/auth/login` | Farmer login |
| POST | `/api/auth/admin/login` | Administrator login |
| POST | `/api/auth/forgot-password` | Demo password reset |
| GET | `/api/auth/me` | Current session |
| GET/PUT | `/api/farmers/me` | Profile |
| GET | `/api/farmers/me/stats` | Dashboard statistics |
| GET | `/api/centres` | Centres with distance, filters, sorting |
| GET | `/api/centres/crops` | Crop list for the filter |
| GET | `/api/documents` | Documents + progress |
| POST | `/api/documents/:type` | Upload or replace a document |
| DELETE | `/api/documents/:id` | Delete a document |
| GET/POST | `/api/procurements` | List / create requests |
| POST | `/api/procurements/:id/advance` | Move to the next stage |
| GET | `/api/transactions` | Transaction history |
| GET | `/api/transactions/:txnNo/receipt` | Full receipt |
| GET | `/api/notifications` | Notifications |
| GET | `/api/crops`, `/api/crops/:slug` | Crop guides |
| POST | `/api/assistant/chat` | Ask the assistant |
| GET | `/api/admin/stats` … | Admin dashboard (protected) |
| GET | `/api/health` | Server check |

---

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| `npm install` fails on better-sqlite3 | Update Node to 18+ and retry. On Windows also run `npm install --global windows-build-tools` if a build is attempted |
| "Cannot reach the server" in the browser | The Express server is not running. Run `npm start` in the project folder |
| Port 5000 already in use | Change `PORT=5001` in `.env` and open `http://localhost:5001` |
| "Use my location" does nothing | Browsers only give GPS on `localhost` or HTTPS. On `localhost` allow the permission prompt; if you refuse, the page falls back to a demo location |
| Login stops working after editing `.env` | Changing `JWT_SECRET` invalidates old tokens. Just log in again |
| Want the demo data back | `npm run reset` |

---

## 10. Ready for future work

The code is structured so these can be added without rewriting anything:
real-time queue updates via websockets, Google Maps instead of Leaflet, a real AI model
(already supported through `.env`), SMS/WhatsApp notifications in
`notificationController.js`, online payment in `transactionController.js`, government scheme
and weather/mandi-price modules as new controller + route pairs, voice input on the assistant
page, and multi-state expansion by adding rows to the `centres` table.
