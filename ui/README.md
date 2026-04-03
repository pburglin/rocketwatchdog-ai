# RocketWatchDog.ai UI

React + TypeScript + Vite frontend for the RocketWatchDog.ai control plane.

## Purpose

This package is intended to host the browser-based administrative UI for:

- platform health and readiness visibility
- config status and reload actions
- traffic and policy views
- integration status views
- skill scan workflows

## Current Status

The UI package builds and lints cleanly, but it is still partially scaffolded.

Implemented today:

- Vite + React 19 + TypeScript frontend setup
- shared API client in `src/services/api.ts`
- demo auth context with role/permission model
- reusable app shell layout in `src/components/Layout.tsx`
- typed frontend models in `src/types/api.ts`

Not fully wired yet:

- the main app screen in `src/App.tsx` is still the default Vite starter page
- the layout and auth provider are not yet connected to the rendered app tree
- several data sources in `src/services/api.ts` are mocked in memory rather than fetched from the backend

## Requirements

- Node.js 20+ recommended
- npm

## Install

```bash
cd ui
npm install
```

## Run In Development

```bash
npm run dev
```

This starts the Vite development server. By default, Vite prints the local URL in the terminal, usually `http://localhost:5173`.

## Build

```bash
npm run build
```

This runs:

1. TypeScript project build via `tsc -b`
2. Production bundle build via `vite build`

Output is written to `ui/dist/`.

## Lint

```bash
npm run lint
```

## Preview Production Build

```bash
npm run preview
```

## Backend Configuration

The frontend API client uses:

- `VITE_API_BASE` if provided
- otherwise `http://localhost:8080`

Example:

```bash
VITE_API_BASE=http://localhost:8080 npm run dev
```

## API Integration

The frontend service layer lives in `src/services/api.ts`.

Real backend-backed calls currently include:

- `GET /healthz`
- `GET /readyz`
- `GET /v1/config/status`
- `POST /v1/config/reload`
- `POST /v1/skills/scan`

Currently mocked client-side:

- traffic logs
- guard policies
- integrations

Those mocked datasets are placeholders until matching backend endpoints exist or are wired up.

## Demo Authentication

The auth context currently uses demo users stored in local browser storage rather than real backend auth.

Available demo users:

- `admin@rocketwatchdog.ai` / `admin123`
- `operator@rocketwatchdog.ai` / `operator123`
- `viewer@rocketwatchdog.ai` / `viewer123`

Session state is stored under the `rwd_user` key in `localStorage`.

## Project Structure

```text
src/
  components/
    Layout.tsx
  contexts/
    AuthContext.tsx
    useAuth.ts
  services/
    api.ts
  types/
    api.ts
  App.tsx
  main.tsx
```

## Main Dependencies

- `react`
- `react-dom`
- `react-router-dom`
- `clsx`
- `lucide-react`
- `recharts`
- `vite`
- `typescript`

## Recommended Workflow

From `ui/`:

```bash
npm install
npm run lint
npm run build
```

If you are also running the backend:

```bash
cd ..
npm run build
npm start
```

Then in another shell:

```bash
cd ui
VITE_API_BASE=http://localhost:8080 npm run dev
```

## Known Gaps

- no routed pages yet
- no authenticated backend session flow yet
- no live traffic stream yet
- no completed dashboard implementation yet
- no production deployment configuration documented specifically for the UI package

## Next Implementation Targets

- replace the Vite starter `App.tsx` with the RocketWatchDog control plane shell
- mount `AuthProvider` at the app root
- add route-based pages for dashboard, traffic, policies, integrations, and settings
- connect mocked frontend service methods to real backend endpoints
