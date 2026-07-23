# Contributing to arqavellum

> How to evolve arqavellum itself. The recurring question for a starter repo is: "when something needs to change, does the fix land in arqavellum or in the consumer?" This doc answers that.

## Arqavellum is a starter, not a framework

There's no `npm install arqavellum`. Consumers clone, own the copy, modify freely. This means:

- **There's no "upgrade path" from arqavellum to a new version.** Once a consumer forks, their copy is its own thing. They cherry-pick fixes from arqavellum if they want to, manually.
- **Arqavellum's job is to be a good starting point.** Bug fixes and improvements that benefit *future* consumers belong here. Domain-specific extensions belong in the consumer.

## When to fix in arqavellum vs. in a consumer

| Change | Lands in arqavellum? | Why |
|---|---|---|
| Bug in a MobilePremium primitive | **Yes** | Every current and future consumer inherits the bug. |
| Audit script false-positive | **Yes** | The next consumer hits the same noise. |
| Audit script missed a real violation | **Yes** | The audit's whole purpose is to catch this. |
| Token retune (color, spacing, motion timing) | **Yes, with care** | Future consumers get the better-tuned version. Current consumers may or may not cherry-pick — the change is theirs to make. |
| New MobilePremium primitive (e.g. `MobileDatePicker`) | **Yes** | Future consumers benefit. Add it to the showcase (`app/dev/premium.tsx`) in the same change — the showcase IS the visual source of truth. |
| New cross-cutting store (e.g. `themeStore`) | **Yes** | Most consumers need it. |
| New audit script for a pattern every consumer benefits from | **Yes** | Add it to `.husky/pre-commit` and `package.json` → `lint:structure` in the same change. |
| New repository interface (e.g. `ISoftDeletableRepository`) | **Yes** | Pattern-level; consumers extend. |
| Domain-specific repository (e.g. `RecordRepository`) | **No** | That's consumer code. Arqavellum ships abstractions, not domain implementations. |
| Domain-specific route (e.g. `/record-detail`) | **No** | Consumer. |
| Brand-specific token override | **No** | Consumer. Arqavellum ships the default; the consumer overrides. |
| PIN-auth primitives | **No** | Consumer-specific extension. Arqavellum defaults to email/password; the consumer guide documents the re-add path. |
| Native-target support (iOS/Android build config) | **Yes (placeholder scaffolding)** | Arqavellum ships native scaffolding in `app.config.ts` (`icon`, `ios`, `android`, `expo-splash-screen` plugin) + 3 neutral PNGs at `./assets/`. A consumer going native adds `eas.json`, EAS Build config, platform validation, brand PNGs, and their own iOS bundle ID + Android application/package ID (replacing the `app.arqavellum` starter value) before release. |
| Dark mode | **No** | Light is the default and dark is opt-in per invariant #3 (both palettes ship). A consumer wanting a *third* color mode (e.g. `dim`) does the retune work themselves. |

## The decision rule

> **Does every future consumer benefit from this change, with no consumer-specific assumption baked in?**

- **Yes** → lands in arqavellum.
- **No, or "only my consumer needs it"** → consumer-side change.

When unsure, default to consumer-side. Promoting a consumer-specific change into arqavellum later is cheap; rolling back an arqavellum-wide change that turned out to be domain-specific is expensive (every consumer has to react).

## Evolving the audit gate

The 12-audit gate is the load-bearing enforcement of the constitution. Evolve it deliberately:

1. **New audit script.** Drops into `scripts/audit-*.ts`. Wire into `.husky/pre-commit` (in pre-commit order — read the existing order to find the right slot) AND `package.json` → `lint:structure`. Update `CLAUDE.md` → "The 12 audits" table in the same change. If the audit corresponds to a new S/C/D/SE/T/R code, also update `ARCHITECTURE.md` with the definition.

2. **Tightening an existing audit (regex tweak, removed allowlist entry).** Run the audit on the current arqavellum tree first. If arqavellum passes, ship. If arqavellum doesn't pass, fix the violations in the same change.

3. **Loosening an audit (new allowlist entry, broader exemption).** Justify in the script's docstring or a comment next to the allowlist entry. Loosening is the dangerous direction — every future consumer inherits the looser rule. The bar is "the rule as written produces false positives that aren't fixable at the violation site."

4. **Removing an audit.** Almost never. If you're considering this, the pattern it enforced is being sunset — that's an `ARCHITECTURE.md` change too.

## Evolving the constitution

`ARCHITECTURE.md` holds the 47-pattern constitution. Add a pattern when:

- A recurring code-review nit can be mechanically checked → also add a `scripts/audit-*.ts`.
- A recurring class of bug has a statically-checkable shape → also add an audit.
- An architectural decision needs to be recorded so consumers don't accidentally invert it → no audit (the decision is the point, not a mechanical check).

Drop a pattern when:

- The violation no longer occurs in practice AND the audit produces false positives → remove the audit script, leave the pattern in `ARCHITECTURE.md` with a "deprecated" note explaining why.

## Evolving the design system

The MobilePremium kit is documented in `docs/architecture/mobile-premium-design-system.md`. The showcase at `app/dev/premium.tsx` (the `/dev/premium` route) IS the visual source of truth — a primitive not in the showcase doesn't exist as far as a consumer can tell.

- **Add a primitive** → also add a section to the showcase AND a row in the design-system doc's inventory table. Same change.
- **Retune a primitive** → visit `/dev/premium` to see the change in context. Update the doc's treatment section if the retune alters a documented property (e.g. hairline opacity goes from 8% to 6%).
- **Retune an atmosphere palette** → all 7 palettes render side-by-side in the showcase; use it to confirm the family still reads as distinct.

## Evolving the PWA layer

`docs/architecture/pwa-installability.md` is the canonical reference. The load-bearing invariant: Expo Web static export strips every PWA-related tag from `<head>` except `<link rel="icon">`. The runtime injection block in `app/_layout.tsx` restores them. Don't remove that block. If a future Expo SDK version stops stripping those tags, the injection block becomes a no-op (the existence guards make it safe to leave in place).

## Adding desktop support

Arqavellum ships mobile-first. Every MobilePremium primitive is tuned for mobile constraints — the 490px height-budget test, safe-area insets, touch-target sizing, atmosphere density — and `SCREEN_BODY_STYLE` (in `constants/styles.ts`) bakes in the 420pt centered column that gives every screen the mobile shape on any viewport.

A consumer who later wants a *true* tablet or desktop layout (multi-column dashboards, sidebar nav, persistent rails, dense data tables) has two options. The first is almost always the right one.

### Option A — add a sibling `DesktopPremium` kit (recommended)

Build a sibling kit at `components/DesktopPremium/` with its own layout primitives, its own body constant, its own constraint set. The MobilePremium kit stays mobile-only.

Why a sibling kit and not a parameterized MobilePremium:

- **Different constraints.** MobilePremium primitives assume the 490px height budget, safe-area insets, and touch targets. Desktop layouts don't have a height budget (the viewport is tall), have no safe-area insets, and tolerate smaller click targets with hover. Parameterizing one kit to serve both means every primitive carries both constraint sets forever — the complexity compounds with each new primitive.
- **Different atmosphere density.** The 7-palette atmosphere system is calibrated for mobile surface sizes. At desktop widths the same palettes read differently.
- **Different layout vocabulary.** Mobile screens are scroll-first; desktop screens are grid-first. The body container's job is fundamentally different.

Concretely:

1. Create `components/DesktopPremium/` with its own primitives (`DesktopSurface`, `DesktopHeader`, `DesktopActionFooter`, etc.).
2. Add a `DESKTOP_BODY_STYLE` (or no constraint) in a new `constants/desktop-styles.ts` — NOT a parameterization of `SCREEN_BODY_STYLE`.
3. Add a `useLayoutMode(): 'mobile' | 'tablet' | 'desktop'` hook driven by `useWindowDimensions()` + the existing `BREAKPOINTS` / `CONTAINER_THRESHOLDS` constants.
4. Pick mobile vs desktop at the route level — expo-router's per-route `_layout.tsx` is the natural branching point.
5. Scope the SB1 audit (`scripts/audit-screen-body.ts`) to mobile-only directories by adding the desktop routes' directory to the early-return in `walk()`. Do NOT sprinkle `// sb1-exempt` across desktop routes — that hides the structural distinction.
6. If useful, add a parallel `audit-desktop-body.ts` for the desktop kit's body contract.

### Option B — relax `SCREEN_BODY_STYLE` to a wider breakpoint (rare)

For a "mobile-but-wider-on-tablet" treatment — same primitives, same layouts, just more breathing room at ≥768px — add a `SCREEN_BODY_STYLE_TABLET` variant or a `useScreenBodyStyle()` hook that reads `useWindowDimensions()`. The SB1 audit accepts any variant (regex match for `SCREEN_BODY_STYLE` covers `SCREEN_BODY_STYLE_TABLET` too).

This works for the narrow case of a tablet-friendly mobile app. It doesn't scale to true desktop layouts (multi-column, persistent nav rails). Most consumers wanting "desktop" actually want Option A.

### What NOT to do

- **Don't parameterize `SCREEN_BODY_STYLE` with a `mode` parameter.** Two callers, two intents, one primitive, eventual confusion. Keep the mobile constant mobile-only.
- **Don't reuse `MobileSurface` / `MobileHeader` / `MobileActionFooter` on desktop screens.** The MobilePremium kit is mobile-shaped by design; reusing it at desktop widths requires retuning each primitive. Build desktop equivalents.
- **Don't drop the SB1 audit when adding desktop routes.** Scope it; don't delete it. The mobile body contract still applies to mobile screens.

## What NOT to do

- **Don't add domain code to arqavellum.** No domain types, no domain repositories, no domain-specific routes. The moment arqavellum has domain code, every consumer has to delete it.
- **Don't add a second color slot.** The `brand` slot is the single override point. A second accent slot fragments the surface — every consumer wins from one canonical override.
- **Don't add an abstraction without a second consumer in mind.** "We might need this someday" is the failure mode. Add abstractions when there are two concrete consumers; not before.
- **Don't promote native release readiness or PIN auth into shell-level surfaces.** Native is supported as an intentional consumer extension: arqavellum ships scaffolding (icon/ios/android/splash plugin in `app.config.ts` + placeholder PNGs at `./assets/`) per invariant #2, and consumers wanting native complete the path on top — `eas.json`, EAS Build config, brand PNGs, their own iOS bundle ID + Android application/package ID (replacing `app.arqavellum`), and platform validation. PIN auth has the same shape — arqavellum defaults to email/password; documented in `CLAUDE.md` → "When to add PIN auth".
- **Don't re-introduce a circular import via the showcase.** `components/MobilePremium/showcase.tsx` imports each primitive directly (`./MobileSurface`), not via `./index` — the barrel re-exports the showcase, so going via the barrel is a cycle. Audit S5 catches this; just don't do it.
