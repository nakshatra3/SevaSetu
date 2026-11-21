# SevaSetu Frontend (React + Vite)

Setup, demo accounts and the full feature list are in the main [README](../README.md).

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
npm run dev               # http://localhost:5173 (the backend must run on http://localhost:8000)
npm run build             # production build in dist/
```

| Variable | Meaning |
|---|---|
| `VITE_API_BASE_URL` | `/api/v1` in development (Vite proxies it). Full backend URL in production. |
| `VITE_API_PROXY_TARGET` | FastAPI address for the dev proxy. Default `http://localhost:8000`. |

## Folder map

```
src/
  api/          httpClient.js (shared Axios instance) + one file per backend area
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

## How to add a page

1. Add the API call to `src/api/<area>Api.js` using `http.get/post/...` from `httpClient.js`.
2. Create `src/features/<area>/<Name>Page.jsx`. Load data with
   `const { data, loading, error, reload } = useApiData(() => getThing(id), [id]);`
   and wrap the page body in `<QueryState loading={loading} error={error} onRetry={reload}>`.
3. Register the route in `src/routes/AppRoutes.jsx` (inside the `ProtectedRoute` for the right roles).
4. Add a sidebar link in `src/config/navigation.js`.

## How auth works

- `POST /auth/login` returns `{access_token, user}`. Both are saved in `localStorage`.
- `httpClient.js` adds `Authorization: Bearer <token>` to every request and logs the user out on any 401.
- On start-up `AuthContext` calls `GET /auth/me` to refresh the user (deactivated accounts get logged out).
- `ProtectedRoute roles={[...]}` hides pages by role. The backend checks roles again on every request.
