# SevaSetu Frontend (React + Vite)

Part A: Users & Platform. Registration/login, volunteer profiles, organization profiles,
verification & reporting, admin dashboard, notifications.

## Run it

```bash
cd Frontend
npm install
npm run dev          # http://localhost:5173
```

`.env` is already created from `.env.example`.

| Variable | Meaning |
|---|---|
| `VITE_USE_MOCK_AUTH` | `false` = real FastAPI `/auth` (default). `true` = fake accounts, no backend needed. |
| `VITE_USE_MOCK_DATA` | `true` = fake data for everything except auth (default, since the backend only has auth). Set `false` as endpoints are built. |
| `VITE_API_BASE_URL` | `/api/v1` in dev (proxied). Full URL in production. |
| `VITE_API_PROXY_TARGET` | FastAPI address for the dev proxy. Default `http://localhost:8000`. |

Mock logins (`VITE_USE_MOCK_AUTH=true`), password `password123`:
`volunteer@sevasetu.test`, `org@sevasetu.test`, `admin@sevasetu.test`.

Run the backend: `cd Backend && uvicorn app.main:app --reload` (needs a `.env` with `JWT_SECRET_KEY`).

## Folder map

```
src/
  api/            one file per backend area (authApi, volunteersApi...) + httpClient.js
    mock/         fake backend; delete when the real one is done
  config/         env.js, constants.js (roles, statuses), navigation.js (sidebar links)
  context/        AuthContext: login, logout, token expiry, current user
  hooks/          useAuth, useApiData (loading/error/data), useDocumentTitle
  routes/         AppRoutes.jsx (all URLs), guards.jsx (login + role protection)
  layouts/        PublicLayout, AuthLayout, DashboardLayout
  components/
    ui/           Button, FormField, Modal, Alert, Badge, TagInput...
    common/       QueryState, Logo
    layout/       Sidebar, Topbar
  features/       one folder per feature; this is where you work
    auth/  volunteers/  organizations/  verification/  admin/  notifications/
  pages/          Home, NotFound, Forbidden
  styles/         tokens.css (colors, fonts), global.css
  utils/          storage, jwt, validators, format
```

## How to add a feature (example: Part B "Events")

1. Add `src/api/eventsApi.js` (copy the pattern of `organizationsApi.js`: real call + optional mock).
2. Create `src/features/events/EventsPage.jsx`. Fetch with `useApiData(() => listEvents(), [])` and wrap the body in `<QueryState>`.
3. Register the route in `src/routes/AppRoutes.jsx` (inside the `ProtectedRoute` for the roles allowed).
4. Add a link in `src/config/navigation.js`.

## How auth works

- `POST /auth/login` returns `{access_token, user}`. Both are saved in `localStorage` (`utils/storage.js`).
- `httpClient.js` adds `Authorization: Bearer <token>` to every request and logs the user out on any 401.
- `AuthContext` also logs out when the JWT `exp` time passes (backend default: 30 minutes). There is no refresh token yet.
- `ProtectedRoute roles={[...]}` blocks pages by role; `GuestRoute` keeps logged-in users off login/register.
- Registering does not log in (the backend returns only the user), so the app sends people to the login page.

## Connecting the backend

See `BACKEND_CONTRACT.md` for each endpoint the frontend calls, with request/response shapes,
plus the CORS snippet and the other gaps in the backend (admin role, JWT dependency, `/auth/me`).
