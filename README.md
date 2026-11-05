# Sambar Settlement 🍛

*Good food. Good company. Fair splits.*

A mobile-first web app for our lunch group at **Chettiar Karaikudi Mess**. Whoever pays the bill records who came and what each person ate. The app shows how much each person owes the payer and the total, and shares it on WhatsApp in one tap.

**Live site:** https://jasonabba.github.io/Sambar-Settlement/

Made with ❤️ by Jason, because he was frustrated of splitting the bill.

## How to use it

1. Open the site on your phone. For quick access, add it to your home screen: **Share → Add to Home Screen** on iPhone, or **⋮ → Add to Home screen** on Android.
2. Tap the big **+ Split** button.
3. **Details:** the date, who paid, and the bill amount (optional, used to check the dishes add up).
4. **Who came:** tick the people at lunch. You can add a new person right there.
5. **Orders:** tap **Add dishes** under each person and pick from the menu. Use **+ / −** for quantities. Anything not on the menu can be added as a one-off item.
   - **Shared a dish?** Add it to whoever ordered it (e.g. one Full Kebab on Jason), tap 🤝 on that dish and tick who shared it. The cost is split equally to the paisa and shows on each sharer's card.
6. **Bill:** add parcel charges, discounts or other extras, split equally or by food cost. If the bill and the dishes don't match, the app shows the difference.
7. **Split:** check everyone's share, then tap **Confirm & save**.
8. On the lunch page, tap **Share on WhatsApp** and send the summary to the group.

## Features

### Splitting
- **Five-step lunch wizard** with running totals. A lunch in progress is saved on that phone, so refreshing or closing the page loses nothing.
- **Fair maths:** each person pays only for what they ordered, plus their part of any extra charges.
  - Extra charges and discounts are split equally by default, or by food cost.
  - Money is calculated in whole paise, and shares always add up exactly to the total (any leftover paise are assigned by a fixed rule, never at random).
- **Shared dishes:** one dish split equally between any number of people (₹160 ÷ 3 = ₹53.34 + ₹53.33 + ₹53.33). Badges and stats count each sharer's fraction, so a shared kebab still counts as one dish.
- **Bill check:** if the restaurant bill doesn't match the dishes entered, the app shows the difference. You can add it as an adjustment with one tap; nothing is changed silently.
- **Lunch page:** who paid, what each person pays them, who ate what, and the total. Lunches can be edited or deleted.
- **WhatsApp share:** sends a ready-to-paste summary to any chat. It uses a `wa.me` link, so there's no API or setup. The share icon next to the button opens the phone's normal share menu.

### Menu & people
- **Menu:** add, edit and delete dishes; search and filter by category; set a photo by upload or URL, or pick a bundled illustration. Past lunches keep the dish names and prices they were recorded with. *The starting dishes and prices are placeholders; edit them to match the mess.*
- **People:** add, rename and deactivate. Anyone in past lunches is kept for history.

### Dashboard fun
- **Stats:** number of lunches, people, total spent, average bill.
- **Dish of the week:** the most-ordered dish over the last 7 days and its biggest fan, plus a daily "nobody has tried X 👀" nudge.
- **Fun facts:** crowd favourite, biggest appetite, most generous wallet, never misses lunch, biggest feast, single-lunch record, plates cleared.
- **Leaderboard:** top eaters, regulars and bill payers.
- **Bill per lunch:** a bar chart; tap a bar to see that day.
- **Lunch buddies:** the pairs who eat together most.
- **Badges & Hall of fame:** 💸 Bank of the Gang, 📅 Never Misses, 🔥 Big Appetite, 🍗 Chicken Monster, 🐐 Mutton Master, 🍛 Biryani Boss, 🐟 Fish Fanatic, 🥛 Curd Rice Loyalist, 🥤 Soda Sipper, 🫓 Parotta Pro, 🥬 Green Leaf, ⚡ On a Roll. Each badge goes to whoever leads its category, so badges move as more lunches are recorded.

### Phone-friendly
- Built for iOS Safari and Android Chrome.
- Works around the notch and home bar.
- Bottom tab bar, and pop-ups that slide up from the bottom.
- No zooming when you tap into a field; amounts open the number keypad.
- Large tap targets.
- Add to Home Screen support.

### Demo data
- 3 sample lunches, labelled **Demo**.
- **Remove demo lunches** on the dashboard clears them for everyone.
- **Reset demo data** replaces **all** data with the starting demo set.

## Shared data (Supabase)

All lunches, people and dishes are stored in one Supabase table, `app_records`, so everyone sees the same data.
- Changes show up live on every phone.
- A copy is kept on each phone, so the app still opens without internet. A lunch saved while offline isn't uploaded automatically when the signal returns; save it again once online.
- A lunch that's still being entered stays on the phone entering it until it's saved.

**Access:** anyone with the site link can view and edit; there is no login yet. The publishable key in `src/data/config.ts` is meant to be public. Access is controlled by the policies in `supabase-schema.sql`. Never put the database password in the code.

### Supabase setup (already done for this project)

1. In the Supabase SQL editor, run `supabase-schema.sql`. It creates the table, the access policies and live updates.
2. Set the project URL and publishable key in `src/data/config.ts`, or as `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. To run without the cloud, with data kept only in that browser, build with `VITE_STORAGE=local`.

## Tech

React 18 + TypeScript, Vite, Tailwind CSS, Lucide icons, React Router (hash routing for GitHub Pages), Supabase, Vitest.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173/Sambar-Settlement/
npm test           # calculation & feature tests
npm run build      # production build in dist/
npm run preview    # serve the build
```

Local development uses the same shared Supabase data as the live site. To experiment without affecting the group's data, run `VITE_STORAGE=local npm run dev`.

## Deploy (GitHub Pages)

Every push to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes to Pages.

- **One-time setup** (already done): go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
- **Renamed repo:** the workflow picks up the new name for the base path automatically.
- **Custom domain:** build with `BASE_PATH=/`.

## Project structure

```
src/
  types.ts                    data model (User, MenuItem, LunchRecord, LunchOrder, Settlement)
  lib/money.ts                paise parsing & ₹ formatting
  lib/split.ts                exact allocation + split computation
  lib/lunch.ts                lunch draft → saved records
  lib/insights.ts             dashboard stats, leaderboard, chart data
  lib/fun.ts                  WhatsApp text, badges, lunch buddies, dish of the week
  data/repository.ts          storage interface + LocalStorage implementation
  data/supabaseRepository.ts  shared cloud storage (changed rows only, live updates, offline copy)
  data/config.ts              which storage to use (Supabase URL + publishable key)
  data/store.tsx              app state & actions
  data/seed.ts                demo people, placeholder menu, sample lunches, menu updates
  components/                 layout, pop-ups, toasts, dish illustrations, insights, badges, share
  pages/                      Dashboard, SplitLunch, Menu, People, History, LunchDetail
supabase-schema.sql           table + access policies + live updates
```

## Credits

- WhatsApp logo: [WhatsApp.svg](https://commons.wikimedia.org/wiki/File:WhatsApp.svg), public domain, via Wikimedia Commons.
