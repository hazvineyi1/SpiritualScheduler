---
name: Server code changes need a workflow restart
description: Express/server edits don't hot-reload in this repl; restart before API testing
---
Editing files under `server/` (routes, storage) does NOT take effect on the running
`Start application` workflow automatically — only the Vite client HMRs. The Express
process keeps the old code until the workflow is restarted.

**Why:** Wasted a curl test cycle: new state-machine guards returned stale 200/500
results because the dev server still ran the pre-edit routes.

**How to apply:** After any `server/**` edit, call `restart_workflow("Start application")`
BEFORE hitting the API with curl, or the results reflect old code. `npm run build`
compiles a separate `dist/` bundle and does not affect the running dev server.
