# Design System Rules — Nacre (smart-skin-scope)

Rules for adapting Figma MCP output (`get_design_context`) into this codebase. The Figma file's design system is named **"Nacre"** (see `src/index.css` comment `/* ── Figma Design System: Nacre ── */`). When Figma hints, CSS variables, or component names reference "Nacre," they map to the token layer described below.

## 1. Token Definitions

**Source of truth:** `src/index.css` (`:root` and `.dark` blocks under `@layer base`), consumed by `tailwind.config.ts`.

- Tokens are **HSL triplets stored as raw CSS custom properties** (no `hsl()` wrapper in the variable itself), e.g. `--primary: 19 49% 12%;`. Tailwind wraps them: `hsl(var(--primary))`.
- Each token has an inline comment with the literal hex value from Figma, e.g. `--primary: 19 49% 12%;       /* #2C180F */`. **Use these comments to reverse-map a Figma hex fill to the correct token** — do not hardcode hex values in components when a token comment matches.
- Semantic pairs follow the shadcn convention: `--x` + `--x-foreground` (e.g. `--card` / `--card-foreground`, `--accent` / `--accent-foreground`).
- Domain-specific tokens exist beyond shadcn defaults:
  - `--success` / `--success-foreground` (green, system state)
  - `--skin-glow`, `--skin-hydration`, `--skin-redness`, `--skin-texture`, `--skin-oil` (product-specific metric colors, exposed as `text-skin-*` / `bg-skin-*` via `tailwind.config.ts`)
- `--radius: 0.875rem` drives `rounded-lg/md/sm` via `borderRadius` in `tailwind.config.ts` (`md` = `radius - 2px`, `sm` = `radius - 4px`). Prefer `rounded-lg`/`rounded-full` over arbitrary `rounded-[Npx]` when a design's corner radius is close to 14px.
- Dark mode is class-based (`darkMode: ["class"]`, toggled via `.dark` on an ancestor) — a full second token set lives in `.dark {}`. **Always define dark-mode-aware components using tokens, never raw hex, so `.dark` overrides apply for free.**
- Fonts are **not** Tailwind theme extensions of arbitrary strings but CSS variables too: `--font-display: 'DM Sans', sans-serif;`, `--font-body`, `--font-inter`, mirrored in `tailwind.config.ts` → `fontFamily: { display, body, inter }`. Fonts are loaded via Google Fonts `@import` at the top of `index.css` (DM Sans 400/500/600/700, Inter 400/500/600/700) — do not add new weights without updating that `@import` line.
  - **Convention:** headings (`h1`–`h6`) auto-apply `font-display` + `font-weight: 600` via a global base-layer rule — don't manually add `font-display font-semibold` to heading tags, it's redundant.
  - Body text defaults to `font-body` (Inter) at the `<body>` level.
- No separate token JSON/YAML or Style Dictionary pipeline exists — **CSS variables in `index.css` are the only transformation layer**. When Figma variables come back from `get_variable_defs`, match them against this file's comments rather than inventing new Tailwind color keys.
- Utility-level composite tokens worth reusing (defined in `index.css` `@layer utilities`):
  - `.premium-card` — `bg-card/40 backdrop-blur-sm border border-border/60 rounded-[--radius] premium-shadow` (the standard elevated card look used across the dashboard)
  - `.premium-shadow` — the standard soft drop shadow (`0 2px 8px rgba(0,0,0,0.06)`)
  - `.lab-card` / `.lab-border` are legacy aliases of `.premium-card` / `border-border/40` — don't introduce new "lab-*" names, they're being phased out; use `.premium-card` directly.

## 2. Component Library

- **shadcn/ui**, generated into `src/components/ui/` (accordion, alert-dialog, button, card, dialog, dropdown-menu, form, input, select, sheet, sidebar, tabs, toast, tooltip, etc. — 40+ primitives). Configuration lives in `components.json`:
  ```json
  { "style": "default", "baseColor": "slate", "cssVariables": true,
    "aliases": { "components": "@/components", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" } }
  ```
  **Always check `src/components/ui/` first** before generating a new primitive from Figma output — Radix + shadcn equivalents almost certainly already exist (Dialog, Select, Tabs, Toast, Sheet, etc.).
- **Composed / feature components** live flat in `src/components/` (not further subdivided by domain): `MetricCard.tsx`, `AdviceCard.tsx`, `AdviceStack.tsx`, `PearlHero.tsx`, `SkinScoreRing.tsx`, `RoutineCard.tsx`, `BottomNav.tsx`, `PageHeader.tsx`, `ProductPhoto.tsx`, `ProductTypeIcon.tsx`, `NavLink.tsx`, `DailyCheckinModal.tsx`, `FactorsModal.tsx`. These are the reusable, product-specific building blocks — check here for an existing match before creating a new composite component (e.g. a "metric tile" design should map to `MetricCard`, a circular score gauge to `SkinScoreRing`).
- **Feature-scoped modules** live under `src/features/<feature>/{components,pages}/`, currently only `src/features/passport/` (Passport screens 2–5 + preview + share button + prompt card). Use this pattern — `src/features/<name>/components` and `src/features/<name>/pages` — when a Figma flow represents a self-contained multi-screen feature, rather than dropping files into the flat `src/pages/`.
- **Pages** (route-level screens) live in `src/pages/` and are wired directly into `src/App.tsx`'s `<Routes>`. There is no nested layout-route abstraction — each page is a flat top-level route, optionally wrapped in `<AuthGuard>` or `<PublicOnlyGuard>` (also defined in `App.tsx`).
- No Storybook or component doc site exists. Component "documentation" is the TSX itself plus inline JSDoc-free prop interfaces — read the component source directly rather than looking for a docs site.
- Component conventions to match:
  - Primitives (`ui/`) use `React.forwardRef`, `class-variance-authority` (`cva`) for variants, and export both the component and its `xVariants` cva function (see `button.tsx`).
  - Feature components are plain function components (not forwardRef) with a typed `Props` interface declared just above, and are default-exported (e.g. `export default MetricCard;`) while `ui/` primitives are named-exported.
  - Animation on feature components uses `framer-motion` (`motion.div` with `initial`/`animate`/`transition`), not CSS keyframes, except for the two Tailwind-registered accordion keyframes.

## 3. Frameworks & Libraries

- **React 18** + **TypeScript**, bundled with **Vite 5** (`@vitejs/plugin-react-swc` for fast refresh/compilation).
- **Routing:** `react-router-dom` v6, single flat `<Routes>` tree in `src/App.tsx` (no file-based routing).
- **Styling:** **Tailwind CSS 3** utility-first, no prefix (`prefix: ""` in `tailwind.config.ts`), plus `tailwindcss-animate` plugin and `@tailwindcss/typography`.
- **Component variants:** `class-variance-authority` (cva) + `clsx` + `tailwind-merge`, unified through the `cn()` helper in `src/lib/utils.ts`:
  ```ts
  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  ```
  **Always wrap conditional/merged className logic in `cn(...)`**, never string-concatenate classes.
- **Radix UI** primitives underlie all `ui/` components (accessible unstyled behavior + shadcn styling on top).
- **Data/forms:** `@tanstack/react-query` for server state (`QueryClientProvider` wraps the whole app), `react-hook-form` + `@hookform/resolvers` + `zod` for forms/validation.
- **Backend:** `@supabase/supabase-js` (client at `src/integrations/supabase/client.ts`, generated types at `src/types/supabase.ts`) — auth, Postgres, and Storage (e.g. `skin-photos` bucket) all go through this client.
- **Animation:** `framer-motion` for component-level motion; `embla-carousel-react` for carousels; `recharts` for charts (wrapped by `src/components/ui/chart.tsx`).
- **Native shell:** Capacitor iOS project under `ios/` — this is a hybrid PWA/native app. `vite-plugin-pwa` (`vite.config.ts`) generates the web-app manifest (name "Nacre", icons `pwa-192x192.png`/`pwa-512x512.png`/`apple-touch-icon.png`).
- **Testing:** Vitest (`vitest.config.ts`) + Testing Library (`jsdom` environment).
- Path alias: `@/*` → `src/*` (set in both `vite.config.ts` and `tsconfig.app.json`). **Always import via `@/...`**, never relative `../../` chains, to match existing code.

## 4. Asset Management

- **Static/public assets** (favicons, PWA icons, robots.txt, `placeholder.svg`) live in `public/` and are referenced by absolute path (`/apple-touch-icon.png`).
- **Bundled image assets** live in `src/assets/` (flat: `diag-previous.png`, `face-scan.png`, `zone-chin.png`) and `src/assets/pearls/` for a themed illustration set (`Pearl-absente.svg`, `Pearl-douce.svg`, `Pearl-fragile.svg`, `Pearl-lumineuse.svg`, `Pearl-terne.svg`) — these correspond 1:1 to the `PEARL_CONFIG` cycle-phase entries in `src/components/PearlHero.tsx` ("Perle douce/lumineuse/terne/fragile"). **When a Figma design references a "Pearl" illustration by phase name, reuse the matching SVG in `src/assets/pearls/` instead of re-exporting a new asset.**
- No image CDN or optimization pipeline (no `next/image`-equivalent, no imagemin build step) — Vite serves assets as-is; import them as ES modules (`import face from "@/assets/face-scan.png"`) so Vite fingerprints/hashes them on build.
- When `get_design_context` returns exported image/icon URLs, download and commit them into `src/assets/` (co-located by feature if feature-scoped, otherwise flat) rather than referencing the expiring Figma CDN URL.

## 5. Icon System

- **General-purpose icons:** `lucide-react`, imported directly per-file, e.g. `import { Camera, Check } from "lucide-react";` (see `PearlHero.tsx`, `MetricCard.tsx`, `BottomNav.tsx`). There is no central icon registry/barrel file — just import the named icon directly where used. Size via the `size` prop (e.g. `<Camera size={16} />`), not via wrapping divs.
- Button primitives already reserve icon spacing/sizing at the CSS level: `buttonVariants` includes `[&_svg]:size-4 [&_svg]:shrink-0` — icons dropped inside a `<Button>` are auto-sized; don't add manual `w-4 h-4` on icons inside buttons.
- **Domain-specific illustrated icons** (skincare product types) are hand-authored inline SVG components, not files from an icon font/set — see `src/components/ProductTypeIcon.tsx`. Pattern: a `resolveIcon()` function maps loose string variants (French + accented + alt spellings) to a canonical icon key, then a single `<svg viewBox="0 0 60 60">` conditionally renders one `<g>` per key, all sharing a `common` stroke style object (`stroke: "#2C180F"`, `strokeWidth: 2.4`, `fill: "none"`, rounded joins/caps). **Follow this exact pattern (shared `common` props, single viewBox, conditional groups) when a Figma design introduces a new product-type icon**, rather than creating one-off SVG files.
- No icon naming convention beyond lucide's own PascalCase export names; custom SVG "icon keys" inside `ProductTypeIcon` are lowercase French/English nouns (`"serum"`, `"creme"`, `"masque"`, etc.).

## 6. Styling Approach

- **Utility-first Tailwind**, no CSS Modules, no styled-components/Emotion. Class merging always goes through `cn()`.
- **Global styles:** `src/index.css` (token definitions, Google Fonts import, base-layer resets, the `.premium-card`/`.premium-shadow` utilities) and `src/App.css` (check before assuming it's used — most layout is handled inline/Tailwind, `App.css` is legacy CRA-scaffold residue and should not be extended; add new global rules to `index.css` instead).
- **Two co-existing styling patterns in feature components** — be aware of both when adapting Figma output:
  1. Tailwind utility classes + tokens (majority pattern, e.g. `MetricCard.tsx`: `className="premium-card p-5 hover:border-primary/40 ..."`).
  2. Inline `style={{ ... }}` objects with hardcoded hex values for complex gradient/positioning work (e.g. `PearlHero.tsx`'s radial-gradient pearl layers and floating chip callouts). This second pattern is used specifically for **non-token decorative gradients** (per-cycle-phase color themes) that don't fit the semantic token system — it is not an anti-pattern to avoid, but don't default to it for anything a token/utility class can already express.
- **Responsive design:** Tailwind's default breakpoint scale (`sm/md/lg/xl/2xl`), plus a custom container config (`center: true, padding: "2rem", screens: { "2xl": "1400px" }`). This app is primarily a **mobile-first PWA** (bottom tab nav via `BottomNav.tsx`, single-column screens) — treat mobile viewport as the default target, not a breakpoint override.
- Border radius, shadow, and blur conventions to reuse rather than re-derive: `rounded-full` for pill buttons/nav, `.premium-card`'s `rounded-[--radius]` (~14px) for cards, `backdrop-blur-sm` for translucent surfaces.

## 7. Project Structure

```
src/
├─ App.tsx / App.css / main.tsx / index.css   # app shell, providers, routing table
├─ pages/            # flat route-level screens (~23), wired directly in App.tsx
├─ features/<name>/  # self-contained multi-screen flows (components/ + pages/) — currently "passport"
├─ components/       # reusable feature-agnostic building blocks (flat, ~13 files)
│  └─ ui/            # shadcn/ui primitives (generated, ~40 files) — treat as vendored, edit cautiously
├─ hooks/             # custom hooks (use-mobile, use-toast, useDiagnosisStore, useRoutineProducts, useWeatherData, useSaveWeather)
├─ lib/               # utils.ts (the cn() helper) — small, don't overload with unrelated logic
├─ integrations/supabase/   # Supabase client + generated helpers
├─ types/             # supabase.ts (generated DB types)
├─ data/              # static domain data/matrices (skincare_matrix*.json, presetDevices.ts, stravaIntensity.ts)
├─ assets/            # bundled images/SVGs (see §4)
├─ utils/             # (check before adding — may overlap with lib/, confirm no duplicate helper exists)
└─ test/              # Vitest setup
ios/                  # Capacitor native iOS wrapper (Xcode project) — do not hand-edit generated Xcode files
supabase/             # Supabase project config/migrations
public/               # static assets served at root (favicons, PWA icons, robots.txt)
```

- Feature organization is **hybrid**: most product surfaces are flat pages/components; only multi-step flows that outgrew a single page (Passport) get promoted to `src/features/<name>/`. When implementing a new multi-screen Figma flow, prefer creating a new `src/features/<name>/` module over adding several loosely-related files to `src/pages/`.
- No barrel (`index.ts`) re-export files were found in `components/` or `features/` — import each component from its concrete file path via the `@/` alias, don't invent a barrel export.

## Quick Reference for Design-to-Code

| Figma hint | Map to |
|---|---|
| Fill color matching a hex in `index.css` comments | The corresponding `hsl(var(--token))` / Tailwind class (`bg-primary`, `text-muted-foreground`, etc.) |
| Corner radius ≈14px | `rounded-lg` (or `.premium-card` if it's a card with border+shadow+blur too) |
| Heading text style | Plain `<h1>`–`<h6>`, no manual font classes needed (auto `font-display font-semibold`) |
| Body text style | Default inherited `font-body` (Inter) — no class needed unless overriding |
| Button component | `@/components/ui/button` `<Button variant=... size=...>`, not a hand-rolled `<button>` |
| Modal/dialog | `@/components/ui/dialog` (or `sheet`/`drawer` for bottom-sheet-style mobile modals) |
| Icon (generic UI glyph) | `lucide-react` named import |
| Icon (skincare product type) | Extend `ProductTypeIcon.tsx`'s `resolveIcon()`/svg pattern |
| Illustration matching a "Pearl" cycle-phase asset | Reuse `src/assets/pearls/Pearl-*.svg` |
| New multi-screen flow | New `src/features/<name>/{components,pages}` module |
| Single new reusable widget | New file in flat `src/components/` |
