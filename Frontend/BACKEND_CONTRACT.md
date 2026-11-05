# Backend contract for Part A

What the frontend calls today vs. what the backend still needs.
All paths are relative to `/api/v1`. JSON uses snake_case, same as `Backend/app/schemas.py`.
Authenticated endpoints expect `Authorization: Bearer <access_token>`.

## Already in the backend (frontend uses these for real when `VITE_USE_MOCK_AUTH=false`)

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/register` | `{name, email, password, role: "volunteer"\|"organization", organization_name?}` | `201 UserResponse` |
| POST | `/auth/login` | `{email, password}` | `{access_token, token_type, user}` |

Errors: `{"detail": "text"}` (401, 409) or FastAPI's 422 list. Both are handled in `src/api/httpClient.js`.

## Needed from the backend

1. **CORS** (production, or if you skip the Vite proxy). In `app/main.py`:
   ```python
   from fastapi.middleware.cors import CORSMiddleware
   app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"],
                      allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
   ```
2. **Admin role.** `RegisterRequest.role` only allows volunteer/organization. Create the first admin directly in MongoDB (or a seed script) with `role: "admin"`.
3. **Token check dependency.** A `get_current_user` that decodes the JWT (`sub` = user id) and loads the user. `verify_jwt.py` is a start. Add role guards (`require_role("admin")`).
4. `GET /auth/me` -> `UserResponse` (lets the frontend re-validate a stored token on startup).

## Endpoints the frontend already calls (mock data until `VITE_USE_MOCK_DATA=false`)

### Volunteer profiles
| Method | Path | Notes |
|---|---|---|
| GET | `/volunteers/me` | own profile |
| PUT | `/volunteers/me` | body: `{city, phone, bio, skills[], interests[], availability[]}` |
| GET | `/volunteers/{id}` | any logged-in user |

Profile: `{id, user_id, name, email, city, phone, bio, skills[], interests[], availability[], total_hours, completed_activities, achievements[{id,title,earned_at}], history[{id,event_title,organization_name,date,hours}]}`

### Organization profiles and verification
| Method | Path | Notes |
|---|---|---|
| GET | `/organizations/me` | own organization |
| PUT | `/organizations/me` | `{name, description, website, city, address, contact_email, phone, categories[]}` |
| GET | `/organizations/{id}` | any logged-in user |
| POST | `/organizations/me/verification-request` | `{note}` -> organization with `verification_status: "pending"` |

Organization: `{id, user_id, name, description, website, city, address, contact_email, phone, categories[], verification_status: "unverified"|"pending"|"verified"|"rejected", verification_note, rating_average, rating_count, stats{events_hosted, volunteers_engaged}, events[{id,title,date,status}]}`

### Reports
| Method | Path | Notes |
|---|---|---|
| POST | `/reports` | `{target_type: "user"\|"organization"\|"event", target_id, reason, details}` |

### Notifications
| Method | Path | Response |
|---|---|---|
| GET | `/notifications` | `[{id, type, title, body, read, created_at}]` |
| GET | `/notifications/unread-count` | `{count}` |
| POST | `/notifications/{id}/read` | updated notification |
| POST | `/notifications/read-all` | `{count: 0}` |

### Admin (role = admin)
| Method | Path | Notes |
|---|---|---|
| GET | `/admin/stats` | `{total_users, volunteers, organizations, pending_verifications, open_reports}` |
| GET | `/admin/users?search=&role=` | list of users (UserResponse + `created_at`) |
| PATCH | `/admin/users/{id}` | `{is_active}` |
| GET | `/admin/organizations?verification_status=` | list of organizations |
| PATCH | `/admin/organizations/{id}/verification` | `{status: "verified"\|"rejected", note}` |
| GET | `/admin/reports?status=` | `[{id, target_type, target_id, target_label, reason, details, reporter_name, status, resolution_note, created_at}]` |
| PATCH | `/admin/reports/{id}` | `{status: "resolved"\|"dismissed", resolution_note}` |
