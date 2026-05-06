# How to Run Locally

## Terminal 1: Backend

```bash
cd server
npm run dev
```

Leave this running. You should see:
```
WildFire-Tracker backend listening on port 5001
```

---

## Terminal 2: Frontend

```bash
cd client
npm run dev
```

Leave this running. Open the URL it gives you (e.g. `http://localhost:5173`).

---

## Seed the database (run once)

In the backend terminal, stop the server with `Ctrl+C`, then run:

```bash
npm run seed
```

You should see:
```
Seeded 3 wildfire records.
```

Then start the server again:

```bash
npm run dev
```

---

## Notes

- Both terminals must stay open while developing
- Backend runs on port `5001`
- Frontend runs on port `5173` (or `5174`, `5175` if taken)
- If you close a terminal, restart it with the same commands above

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
