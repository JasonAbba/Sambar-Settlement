# Chettiar Splitter 🍛

*Good food. Good company. Fair splits.*

A mobile-first web app for our lunch group at **Chettiar Karaikudi Mess**. Record who came, what each person ate, and who paid. It works out exactly what everyone owes and tracks who has settled up.

**Live site:** https://jasonabba.github.io/Sambar-Settlement/

## Features

- **Split Today's Lunch**: a 5-step wizard (Details → Who came → Orders → Bill → Split) with running totals. Drafts are saved automatically, so a refresh loses nothing.
- **Fair maths**: each person pays only for what they ordered. Parcel charges, extra items, discounts and other charges are split equally by default, or by food cost if you choose. All money is handled as integer paise, and shares always add up exactly to the total (largest-remainder rounding, applied in a fixed order).
- **Bill reconciliation**: if the restaurant bill doesn't match the dishes entered, the app shows the difference. You can add it as an adjustment with one tap; it is never changed silently.
- **Menu**: add, edit and delete dishes, search, filter by category, and set a photo by upload or URL, or pick a bundled illustration. *The seeded dishes and prices are placeholders.*
- **People**: add, rename and deactivate people. Anyone who has lunch history is kept for past records.
- **History**: every lunch with its full breakdown. You can edit a lunch, and payments already recorded are kept.
- **Settlements**: mark shares as paid for each lunch, see net "who pays whom" balances across all lunches, and settle a pair in one tap.
- **Demo data**: 3 sample lunches, labelled *Demo*. Use **Remove demo lunches** or **Reset demo data** on the dashboard.
- **Phone-friendly** on iOS Safari and Android Chrome: safe-area insets, bottom tab bar, bottom-sheet dialogs, 16px inputs (no zoom on focus), numeric keypads for amounts, 44px+ touch targets, and Add to Home Screen support.

> **Data storage:** v1 stores data in the browser's LocalStorage, so each phone or browser has its own copy. All storage goes through `DataRepository` (`src/data/repository.ts`), so a Supabase backend can be added without touching the UI.

## Tech

React 18 + TypeScript, Vite, Tailwind CSS, Lucide icons, React Router (hash routing for GitHub Pages), Vitest.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173/Sambar-Settlement/
npm test           # calculation tests
npm run build      # production build in dist/
npm run preview    # serve the build
```

## Deploy (GitHub Pages)

Every push to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes to Pages.

One-time setup: go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.

If you rename the repo, the workflow picks up the new name for the base path automatically. For a custom domain, build with `BASE_PATH=/`.

## Project structure

```
src/
  types.ts               data model (User, MenuItem, LunchRecord, LunchOrder, Settlement)
  lib/money.ts           paise parsing/formatting
  lib/split.ts           exact allocation + split computation
  lib/lunch.ts           draft → records, settlements, balances
  data/repository.ts     persistence interface + LocalStorage implementation
  data/store.tsx         app state & actions
  data/seed.ts           demo people, placeholder menu, sample lunches
  components/            layout, modal/bottom sheet, toasts, dish illustrations, UI bits
  pages/                 Dashboard, SplitLunch, Menu, People, History, LunchDetail, Settlements
```
