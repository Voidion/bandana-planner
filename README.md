# Bandana Planner (desktop)

The Windows app for fabric inventory and cut plans, built with React Native for Windows. Everything is saved on this computer; there's no account, database or syncing yet.

What's in it so far:

- **Today**: what needs you (late runs, orders due, overdue payments, restock, tools due, quotes ending), this week's booked time, the month's income against your goal, runs in progress with their finish dates, and recent activity.
- **Schedule**: four weeks of free hours with the runs fitted in, earliest due first, due dates and finish dates on the calendar, and markets or days off that take a day's hours out.
- **Reports**: trends by month, what sells best, your real time a bandana; sales and profit by channel, size, customer and run, before and after bills; a tax summary; and goals.
- **Photos**: add pictures (copied into `%LOCALAPPDATA%\BandanaPlanner\photos`), link them to runs, fabric and customers, favorites, albums and client albums you can save to a folder (Documents › Bandana Planner › Albums), a viewer, and Recently deleted for 30 days.
- **Search, New and shortcuts**: search runs, fabric, orders, quotes, customers and their dogs, supplies and sales (Ctrl + K); the New menu (Ctrl + N); Ctrl + 1–6 to jump between screens. **Settings › Shop** has the shop name, light or dark (or match Windows), the shortcut list and your data folder.
- **Maintenance and Activity**: blades and mats count mats cut, machines count sewing hours; a full log of what you've done.
- **Runs**: plan a batch (sizes, fabric, due date, workflow template). The app lays every piece out on Cricut Venture mats (the same planner as the prototype, so layouts are identical), shows the yards needed against the shelf, works out materials, time and profit, and saves one SVG per mat for Design Space. **Record the cut** takes what you really used off the shelf (Undo puts it back). Work through the steps with tick boxes and a timer (it keeps running if you close the app, and asks if it's still going after a while), enter times by hand, log defects, then **Finish run** to move the bandanas into stock and see the review: each step against its plan, hours, fabric and profit.
- **Fabric**: every bolt with yards on the shelf, cost per yard, a low-stock warning, print direction, where you buy it, and notes.
- **Cut files**: upload your own SVG for each size and strap (Settings › Sizes & mats). Pieces are nested on the mat by their real traced outline, and the mat files you save draw that outline.
- **Supplies, Suppliers and Restock**: count tags, mailers, elastic and anything else, taken automatically per bandana when a run finishes; keep each supplier's site, lead time and shipping; Restock lists what's low, out, or will run out at your pace before an order could arrive, grouped by supplier, with Mark ordered and It arrived. Fabric shows yards used a week and a run-out forecast, and leftover pieces can be kept as offcuts.
- **Bows and other products** (Settings › Products): styles with a cut size or cut file, pieces, time, notions and price, plus add-on parts. Runs can include them: they're cut on their own mats, get their own steps, and finish into stock. **Export for Design Space** groups the mats by fabric, with Save per mat or all at once.
- **Orders, Sales and Customers**: customers (people, shops, consignment) with their dogs' neck sizes; orders filled from stock or made by a run planned straight from the order, then Mark delivered records the sale; sales from finished stock with card fees and materials worked out, paid now or later, part payments and what's owed. **Settings › Pricing** has the profit target, card fees, shipping, monthly bills, and the price each size needs to hit your target.
- **Quotes**: price a custom or wholesale order with deals, bundles and a deposit, see what you keep, preview the customer's view, save it as a PDF (Documents › Bandana Planner › Quotes), mark it sent (prices lock), and accept it into an order.
- **Market day**: big tiles to tap as things sell, card or cash, a different-price sale, undo, a running total against your goal, and one Market sale when you close up (card fees on the card part, booth fee as a cost).
- **Import from Shopify** (in Sales): open the orders CSV export, match each product to your sizes and styles, and import; unfulfilled orders become orders to make, fulfilled ones past sales, never twice.
- **Finished stock**: bandanas ready to sell, by size and by run, with counts you can fix by hand.
- **Settings**: sizes (cut measurements, price, time each), straps, mat and bolt; workflow templates (steps and minutes per bandana, with your real timed pace next to each); free hours per day; timer check-in.

The window opens at 1280 × 820 (maximised on smaller screens) and can't be made smaller than 1024 × 700.

## Where things are saved

- Your shop: `%LOCALAPPDATA%\BandanaPlanner\shop.json`, saved a moment after every change. The previous version is kept next to it as `shop.json.bak`.
- Cut files: `Documents\Bandana Planner\<plan name>\`, one SVG per mat, sized in inches.
- Quotes: `Documents\Bandana Planner\Quotes\` as PDFs.
- Photos: `%LOCALAPPDATA%\BandanaPlanner\photos\`.

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
