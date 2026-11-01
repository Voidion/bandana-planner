# Bandana Planner (desktop)

The Windows app for fabric inventory and cut plans, built with React Native for Windows. Everything is saved on this computer; there's no account, database or syncing yet.

What's in this first version:

- **Fabric**: every bolt with yards on the shelf, cost per yard, a low-stock warning, print direction (with which way the top faces), where you buy it, and notes.
- **Cut plans**: pick how many of each size and the fabric for the bandanas and straps. The app lays every piece out on Cricut Venture mats (the same planner as the prototype, so the layouts are identical), shows the yards needed against what's on the shelf, and saves one SVG per mat for Design Space. **Mark as cut** takes the fabric off the shelf; **Undo cut** puts it back, and you can correct what you really used.
- **Sizes & mats**: the triangle measurements for XS–XXL, strap cut sizes, the mat, bolt width, strip width, blade gap and extra-fabric allowance.

The window opens at 1280 × 820 (maximised on smaller screens) and can't be made smaller than 1024 × 700.

## Where things are saved

- Your shop: `%LOCALAPPDATA%\BandanaPlanner\shop.json`, saved a moment after every change. The previous version is kept next to it as `shop.json.bak`.
- Cut files: `Documents\Bandana Planner\<plan name>\`, one SVG per mat, sized in inches.

## One-time setup on Windows

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
- `src/screens/`: Fabric, Cut plans, Sizes & mats
- `src/engine/engine.js`: the cut planner, generated from the prototype (don't edit by hand)
- `src/lib/plan.ts`: how the app calls the planner
- `src/state/`: the shop's shape, saving and changes
- `src/ui/`: theme (light and dark follow Windows), shared components, icons, the mat drawing
- `windows/BandanaPlanner/BandanaFiles.h`: the native module that reads and writes the shop file and saves cut files
- `windows/BandanaPlanner/BandanaPlanner.cpp`: window title, starting size and minimum size

The `android` and `ios` folders come from the React Native template and are kept for the phone and tablet apps later.
