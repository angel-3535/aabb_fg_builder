# Lakebed App Instructions

This is a Lakebed capsule. Build the app inside this directory using the Lakebed v0 contract.

## Project Purpose

This project is a prototype tool for defining fighting-game character move frames. It should help users load a sprite sheet, define per-frame sprite regions, place hurtboxes and hitboxes as AABBs, and export the resulting move data as JSON for use by a game.

## File Layout

- `server/index.ts`: schema, queries, and mutations.
- `client/index.tsx`: Preact UI entrypoint.
- `shared/`: pure TypeScript shared by client and server.

## Commands

Run locally:

```sh
lakebed dev .
```

Deploy:

```sh
lakebed deploy .
```

Inspect local state while `lakebed dev` is running:

```sh
lakebed db list --port 3000
lakebed db dump --port 3000
lakebed logs --port 3000
```

## Rules

- Use `lakebed/server` only from `server/index.ts`.
- Use `lakebed/client` only from `client/index.tsx`.
- Do not import npm packages from app code.
- Do not use Node built-ins in app code.
- Use Tailwind classes directly in JSX.
- Do not add a CSS, PostCSS, or Tailwind build pipeline.
- Use guest auth through `ctx.auth` on the server and `useAuth()` on the client.
- Keep `shared/` free of DOM, Node, env, and Lakebed runtime imports.

## Current Limits

- One server entry.
- One client entry.
- Guest auth only.
- No file storage.
- No outbound fetch in anonymous deploys.
- Local state resets when `lakebed dev` restarts.
