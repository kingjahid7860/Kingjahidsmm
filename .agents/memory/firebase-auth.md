---
name: Firebase Auth integration
description: Firebase Authentication and server session behavior for the two frontends.
---

The Firebase client must call the shared API at `/api/*`, independently of the
frontend artifact base path. The admin frontend is mounted at `/admin-panel/`,
but `/admin-panel/api/firebase-login` is not a valid API route.

**Why:** Artifact base paths are for frontend routing and static assets; the
shared API server is mounted at the workspace root. Using the frontend base
path prevents the server session cookie from being created.

**How to apply:** Keep Firebase login and logout requests rooted at `/api`,
while using the artifact base path only for frontend navigation.