# Bandana Planner (desktop)

The Windows app for fabric inventory and cut plans, built with React Native for Windows. Everything is saved on this computer; there's no account, database or syncing yet.

What's in it so far:

- **Layout**: the prototype's desktop view. A sidebar grouped into Sell and Shop, with badges (runs late, orders to plan, payments late, fabric low, maintenance due), the dark timer card, New, and your card (light/dark, settings). Today, Runs and Schedule use the icon rail to give the content room; More slides the full sidebar in.
- **Reminders**: the bell holds everything that needs you (late or due runs, orders to plan or that won't fit, low fabric and supplies, quotes ending, market prep, maintenance, overdue payments, a timer left running). Dismiss one, or snooze it until later today, tomorrow or next week. The same list goes to Windows notifications.
- **Split view** (Ctrl + \\): two sections side by side, a draggable divider, swap, and saved pairs.
- **Today**: who's timing (pause and stop right there), the next 7 days of booked time, the month's income against your goal, what's on the bench with progress, due dates and list value, what's coming up, the shelf, quotes out and recent activity.
- **Workflow**: pick a run on the bench, the running timer big (pause, stop, fix the time, don't record), and its steps with how each went against the plan.
- **Sell screens** (Orders, Quotes, Customers, Payments, Finished stock, Market day), laid out like the prototype: grouped cards beside a detail card with a stats strip and status banners.
  - **Orders**: to plan, in progress, ready to send and delivered; whether it fits your free hours before the due date (with the first day it would fit), fill from stock, plan it as a run, fabric and notes.
  - **Quotes**: waiting on them, expired, drafts, accepted, declined; the receipt, what it leaves you, delivery, deal and deposit; extend an expired quote; update a sent quote to your current prices; preview, save as PDF and mark sent.
  - **Customers**: who owes you, who has something open, everyone else; email, call, text and social buttons, their dogs, contact details, albums and history.
  - **Payments**: overdue, waiting on payment and paid by month; mark paid, part payments, due dates and a payment reminder email.
  - **Finished stock**: ready to sell by size, orders you can fill now, what's set aside, stock by run and how ready you are for the next market.
  - **Market day**: plan it (packing against your goal, date, hours, booth fee and miles), tap sales card or cash, undo any sale, and a summary once it's recorded.
- **Schedule**: Day, Week, Month and List views of everything with a date (run due dates, orders to plan, market days, fabric due to arrive, quotes ending, your own events), filters for each, and a quick-add line that reads plain English ("Market Sat 8am-2pm at Riverside", "pickup tomorrow 3pm", "sewing every thursday 7pm", "day off friday"). Events can repeat weekly, every 2 weeks or monthly, and remind you beforehand (in the bell and as a Windows notification). Drag a chip to another day in Month, or a timed event to another time in Day; Undo puts it back. Beside it: the chosen day and how the next 7 days fill your free hours, with any run that would finish late. Markets and days off take that day's hours out of run planning.
- **Trends**: this month against your goals, money so far, your pace a bandana, by hour and day, step times against your templates (update a template to match), fabric a bandana and quality.
- **Reports**: sales and profit by month, channel, customer, run, size and style, before and after bills, for the year, 3 months or the month, and a tax summary.
- **Photos**: add pictures (copied into `%LOCALAPPDATA%\BandanaPlanner\photos`), link them to runs, fabric and customers, favorites, albums and client albums you can save to a folder (Documents › Bandana Planner › Albums), a viewer, and Recently deleted for 30 days.
- **Right-click menus**: right-click a run, fabric, order, customer, sale, supply, quote or photo for quick actions (open, start, plan again, mark ordered or arrived, record a payment, duplicate, favorite, delete). Right-click a run step to mark it done, start or stop its timer, edit it, move it up or down, or remove it. Esc closes the menu.
- **Search, New and shortcuts**: search runs, fabric, orders, quotes, customers and their dogs, supplies and sales (Ctrl + K); the New menu (Ctrl + N); Ctrl + 1–9 for Today, Runs, Workflow, Schedule, Orders, Quotes, Customers, Payments and Fabric. **Settings › Shop** has which reminders you want and Windows notifications (daily ones from the hour you pick), the shop name, light or dark (or match Windows), the shortcut list and your data folder.
- **Maintenance**: the Cricut Venture (which blade is in the machine, cuts on it since new, when the next check is due and whether the runs waiting to be cut will reach it; Check it, Replace with why, and after two blades the lifespan your own blades really last, with Use it) and the sewing machine (seam sewn and hours, worked out from each size). Upkeep tasks count mats cut, seam sewn, hours or days.
- **Activity**: what you've done, today and this week, searchable, filtered by kind (work, money, fabric, quotes and more) and grouped by day; each entry opens what it's about.
- **Runs**: plan a batch (sizes, fabric, due date, workflow template). The app lays every piece out on Cricut Venture mats (the same planner as the prototype, so layouts are identical), shows the yards needed against the shelf, works out materials, time and profit, and saves one SVG per mat for Design Space. **Record the cut** takes what you really used off the shelf (Undo puts it back). Work through the steps with tick boxes and a timer (it keeps running if you close the app, and asks if it's still going after a while), enter times by hand, log defects, then **Finish run** to move the bandanas into stock and see the review: each step against its plan, hours, fabric and profit.
- **Shopify listing** (from any run): title, description and tags written from the run, prices and stock per size, a checklist, and a Shopify product CSV that makes a draft product with every size (Documents › Bandana Planner › Listings).
- **Fabric**: every bolt with yards on the shelf, cost per yard, a low-stock warning, print direction, where you buy it, and notes.
- **Cut files**: upload your own SVG for each size and strap (Settings › Sizes & mats). Pieces are nested on the mat by their real traced outline, and the mat files you save draw that outline.
- **Supplies, Suppliers and Restock**: count tags, mailers, elastic and anything else, taken automatically per bandana when a run finishes; keep each supplier's site, lead time and shipping; Restock lists what's low, out, or will run out at your pace before an order could arrive, grouped by supplier, with Mark ordered and It arrived. Fabric shows yards used a week and a run-out forecast, and leftover pieces can be kept as offcuts.
- **Bows and other products** (Settings › Products): styles with a cut size or cut file, pieces, time, notions and price, plus add-on parts. Runs can include them: they're cut on their own mats, get their own steps, and finish into stock. **Export for Design Space** groups the mats by fabric, with Save per mat or all at once.
- **Orders, Sales and Customers**: customers (people, shops, consignment) with their dogs' neck sizes; orders filled from stock or made by a run planned straight from the order, then Mark delivered records the sale; sales from finished stock with card fees and materials worked out, paid now or later, part payments and what's owed. **Settings › Pricing** has the profit target, card fees, shipping, monthly bills, and the price each size needs to hit your target.
- **Quotes**: price a custom or wholesale order with deals, bundles and a deposit, see what you keep, preview the customer's view, save it as a PDF (Documents › Bandana Planner › Quotes), mark it sent (prices lock), and accept it into an order.
- **Market day**: big tiles to tap as things sell, card or cash, a different-price sale, undo, a running total against your goal, and one Market sale when you close up (card fees on the card part, booth fee as a cost).
- **Import from Shopify** (in Sales): open the orders CSV export, match each product to your sizes and styles, and import; unfulfilled orders become orders to make, fulfilled ones past sales, never twice.
- **Finished stock**: bandanas ready to sell, by size and by run, with counts you can fix by hand.
- **Settings**: every setting in one grouped list with its current value, and the one you pick open beside it: shop name, monthly goals, free hours; what clients see on a quote (your logo, cropped square, at the top of the quote and its PDF, and your contact details); profit target, card fees, shipping, bundles, monthly bills; sizes and straps, cutting and mats (the fabric width on a slider over a colour strip of how much each width wastes on what's left to cut, **Least waste**, which picks the width that uses the least fabric, the widths that divide your bolt exactly, cut length, blade gap, straps turning to fit and keeping corners for scrap packs, with an example layout and every run still to cut beside it), cut files, what new fabric starts with, products, workflow templates; reminders, timers, shortcuts and your data.

The window opens at 1280 × 820 (maximised on smaller screens) and can't be made smaller than 1024 × 700.

## Where things are saved

- Your shop: `%LOCALAPPDATA%\BandanaPlanner\shop.json`, saved a moment after every change. The previous version is kept next to it as `shop.json.bak`.
- Cut files: `Documents\Bandana Planner\<plan name>\`, one SVG per mat, sized in inches.
- Quotes: `Documents\Bandana Planner\Quotes\` as PDFs.
- Photos: `%LOCALAPPDATA%\BandanaPlanner\photos\`. Your quote logo sits beside `shop.json` as `logo-….jpg`.

## Getting the installer

Every push to `main` builds the app on GitHub's Windows machines (`.github/workflows/windows.yml`): it runs the tests, compiles a release build, checks it starts, and makes **BandanaPlannerSetup.exe** with Inno Setup (`installer/BandanaPlanner.iss`). Download it from the run's **Artifacts** on the repo's Actions tab. Pushing a tag like `v0.2.0` also attaches it to a GitHub Release.

The installer isn't code-signed yet, so Windows SmartScreen may say "Windows protected your PC": click **More info → Run anyway**. Installing a new version over an old one keeps your shop; uninstalling never deletes it.

## Building on your own PC (optional)

1. Install the React Native for Windows requirements (Visual Studio 2022 with the C++ desktop and Windows App SDK workloads, Node.js, and Developer Mode). Microsoft's guide lists them and has a script that installs them: <https://microsoft.github.io/react-native-windows/docs/rnw-dependencies>
2. Open a terminal in this folder and run:

   ```
   npm install
   ```

## Run it

- **For everyday use** (no dev server; installs Bandana Planner in the Start menu):

  ```
  npm run windows:release
  ```

  After the first time, open it from the Start menu like any app. Run the command again after you update the code.

- **While changing the code** (live reload through Metro):

  ```
  npm run windows
  ```

The first build takes a while (Visual Studio compiles React Native itself); later builds are much faster.

## Checks

```
npm test          # the cut planner matches the prototype exactly, and fabric is taken off / put back correctly
npm run typecheck
```

If the prototype's cut planner changes, rebuild the engine and rerun the tests:

```
npm run engine -- path\to\bandana-planner.html
npm test
```

## Project layout

- `App.tsx`: window layout and the sidebar
- `src/screens/`: Runs (`runs/`), Fabric, Finished stock, Settings
- `src/engine/engine.js`: the cut planner and the time, money and template maths, generated from the prototype (don't edit by hand)
- `src/lib/plan.ts`: how the app calls the engine (dates become the prototype's days-from-today here)
- `src/state/`: the shop's shape, saving and changes
- `src/ui/`: theme (light and dark follow Windows), shared components, icons, the mat drawing
- `windows/BandanaPlanner/BandanaFiles.h`: the native module that reads and writes the shop file and saves cut files
- `windows/BandanaPlanner/BandanaPlanner.cpp`: window title, starting size and minimum size

The `android` and `ios` folders come from the React Native template and are kept for the phone and tablet apps later.
