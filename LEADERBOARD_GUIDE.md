# Simple leaderboard implementation

Branch: `feature/leaderboard-recommendations`. Based on upstream `main` at
`df6ebc5859993938e62e1ad9c20e07aa9bcd606f`. Four patch files in the download
reproduce the four commits. No changes have been pushed to GitHub.

## 1. Pull first, then create your branch

Run these commands in PowerShell (Git must be installed). Commit or stash your
existing local work before pulling. For a fresh checkout:

```powershell
git clone https://github.com/nakshatra3/SevaSetu.git
cd SevaSetu
git switch main
git pull --ff-only origin main
git switch -c feature/leaderboard-recommendations
```

For an existing checkout, start with `cd` into that checkout and skip clone.
If you want to build on your own existing branch instead, switch to that branch
and pull its upstream before creating this feature branch.

Extract the downloaded ZIP outside your checkout. Apply the supplied patches
in order (replace the example path with your extracted folder):

```powershell
git am C:/Downloads/SevaSetu-delivery/patches/01.patch
git am C:/Downloads/SevaSetu-delivery/patches/02.patch
git am C:/Downloads/SevaSetu-delivery/patches/03.patch
git am C:/Downloads/SevaSetu-delivery/patches/04.patch
git log -4 --oneline
```

This creates exactly four commits, with the implementation already included.
Do not copy the source files first and then apply patches: choose one method.
If newer upstream edits conflict, use `git am --abort` to return to the state
before the patch series. The full modified files are also in `source/` for
manual comparison. Do not overwrite newer changes blindly.

After testing, push your branch:

```powershell
git push -u origin feature/leaderboard-recommendations
```

## 2. Run the backend (PowerShell, terminal 1)

Install Python and start MongoDB locally first. MongoDB Atlas also works: set
its connection string in `Backend/.env`. Never commit this file.

```powershell
cd Backend
py -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env`: replace the example JWT secret with a long random string, and
check MongoDB settings. Then run:

```powershell
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

API documentation: http://localhost:8000/docs

## 3. Run the frontend (PowerShell, terminal 2, repository root)

Install Node.js with npm first.

```powershell
cd Frontend
npm ci
```

Create `Frontend/.env.local` with:

```dotenv
VITE_API_BASE_URL=/api/v1
VITE_USE_MOCK_AUTH=false
VITE_USE_MOCK_DATA=false
```

```powershell
npm run dev
```

Open http://localhost:5173, register/login, then select **Leaderboard** in the
sidebar or open http://localhost:5173/app/leaderboard.
Vite forwards `/api` to port 8000. Do not use mock login for contribution testing.
On macOS/Linux use `python3 -m venv .venv`, `.venv/bin/python`, and `cp` instead
of the Windows Python path and `Copy-Item` above.

## 4. How it works / demo flow

- An organization confirms a volunteer attended its entire finished event.
- `PUT /api/v1/contributions/{event_id}/{volunteer_id}` requires that event's
  organization JWT. Points cannot be supplied by the browser.
- Event duration determines hours. Points = hours × 10, rounded half up.
- Each event/volunteer pair is stored once in MongoDB `contributions` using a
  deterministic primary key. Repeated/concurrent confirmation adds no points.
- `GET /api/v1/leaderboard` requires login; returns top 50 active volunteers
  (optional `limit` 1–100), descending points, then hours, then ID for stable ties.
- Badges: Helping Hand <50; Changemaker 50–199; Community Hero >=200.
- No attendance/registration backend existed in the supplied project. This
  implementation trusts the event owner's full-event attendance confirmation;
  partial hours and automated attendance verification are outside this change.
- Recommendations are fixed frontend examples, clearly marked demo. They make
  no recommendation API calls and cannot register users for fictional events.

To demo real scores:

1. Register a volunteer and an organization through the normal app.
2. As the organization, use `/docs` to log in through the auth endpoint and
   authorize with its bearer token. Create a short future event via `POST /api/v1/events`.
3. Wait until it ends. Copy its ID from the API response. The volunteer's ID is
   shown on their leaderboard page (also returned by login/register).
4. In the organization's Leaderboard form, enter the two IDs and confirm attendance.
5. Refresh the volunteer's leaderboard. Confirm the same pair again: score stays
   unchanged. Use more ended events or volunteers to compare rankings.

No real leaderboard entries are fabricated or seeded automatically. A fresh
MongoDB database correctly starts with an empty leaderboard.

## 5. Four commits

1. `feat: add verified contributions and leaderboard API`
2. `feat: show leaderboard badges and contribution confirmation`
3. `feat: add frontend-only demo recommendations`
4. `test: cover contribution rules and document setup`

## Checks

```powershell
cd Backend
.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.venv\Scripts\python.exe -m unittest discover -s tests -v
cd ../Frontend
npm run build
```

Backend unit tests cover score rounding, badge boundaries, duplicate/concurrent
confirmation, owner restrictions, unfinished events, missing volunteers and invalid
IDs. Live MongoDB/browser integration should also be checked with the demo flow.

Validation here: all 10 backend tests passed; Vite production build passed.
Live MongoDB and full browser attendance flow were not exercised here.
