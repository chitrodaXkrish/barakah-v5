# App Optimization Plan

Three focused workstreams. I'll do them in order so bug fixes land first and the audit benefits from the perf improvements.

## 1. Critical bug fixes (first)

**Cart empties after adding a product** — `CartContext` keeps items in plain `useState`, so any provider remount (auth state change, redirect through `LoadingScreen`, hot reload) wipes them.
- Persist cart in `localStorage` (read on init, write on change).
- Keyed by user id when logged in so different accounts don't share carts.

**Console warning: `fetchPriority` on `<img>`** in `Onboarding.tsx`.
- Use lowercase `fetchpriority` or drop it; React 18 doesn't recognize the camelCase form.

**Overpass API failures** spamming logs in `Places.tsx` / nearby-mosques logic.
- Add proper try/catch, stop logging on every fallback, fail silently to a sane empty state.

**React Router v7 future-flag warnings** — enable `v7_startTransition` and `v7_relativeSplatPath` on `BrowserRouter`.

## 2. Performance

- **Route-based code splitting**: convert every `import { Page } from './pages/X'` in `App.tsx` to `React.lazy` + `<Suspense fallback={<LoadingScreen />}>`. Currently all 35 pages ship in the initial bundle.
- **Memoize providers' context values** (`CartContext`, `LocationContext`, `AuthContext`) with `useMemo` so consumers don't re-render on every parent render.
- **Image hygiene**: add `loading="lazy"` and explicit `width`/`height` to non-LCP images across Shop, News, ProductDetail to stop layout shift and defer offscreen decoding.
- **React Query defaults**: set `staleTime` (e.g. 60s) and `refetchOnWindowFocus: false` on the shared `QueryClient` to cut redundant network calls.
- **Drop dev-only console noise** in production builds.

## 3. Functionality audit (Playwright walk)

Drive the live preview headless, restoring the signed-in session, and verify each route renders without runtime errors and key actions work. I'll fix anything that breaks as I go.

Routes to walk: `/`, `/prayer-times`, `/quran`, `/qibla`, `/places`, `/shop`, `/shop/categories`, `/shop/product/:id`, `/cart`, `/checkout`, `/hajj`, `/news`, `/forum`, `/mood`, `/zakat`, `/halal-scanner`, `/makkah-live`, `/account`, `/seller-dashboard`, `/progress`.

For each: screenshot, capture console errors, click the primary CTA. Report a short pass/fail table at the end and patch the failures.

## Technical notes

- Cart persistence: `useEffect` syncs `items` to `localStorage.setItem('barakah_cart_v1', JSON.stringify(items))`; init reads it back. Wrapped in try/catch for SSR/quota safety.
- Lazy routes: keep `Login`, `Onboarding`, `LoadingScreen`, `Home` eager (first-paint critical); lazy-load the rest. Add a single `<Suspense>` boundary around `<Routes>`.
- `QueryClient` config:
  ```ts
  new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 } } })
  ```
- Router future flags go on `<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>`.

## Out of scope

- No backend schema changes, no new features, no visual redesign — only fixes and perf.
- No edits to auto-generated files (`src/integrations/supabase/client.ts`, etc.).

Reply "go" (or with tweaks) and I'll execute.
