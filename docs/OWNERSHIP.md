# Arqavellum — Canonical Doc Ownership

> Settles "which doc owns claim X" disputes. If two docs appear to own the same claim, one is canonical and the other cross-links. This file is the authority.

## Claim-type → canonical-owner map

| Claim type | Canonical owner | Notes |
|---|---|---|
| Repo operating context (invariants, pre-commit checks, consumer guide, doc maintenance contract) | `CLAUDE.md` | Auto-loads in Claude Code sessions at the arqavellum root. The "How to consume" section is the load-bearing consumer guide. |
| Architecture constitution (47 patterns, S/C/D/SE/T/R codes) | `ARCHITECTURE.md` | Every architectural decision is grounded here. This file is the cheatsheet; `scripts/audit-*.ts` are canonical for enforcement. |
| Project orientation (what arqavellum is, quickstart) | `README.md` | Navigation surface — points at canonical content, doesn't redefine it. |
| Claim-type → owner-doc map (this meta-layer) | this file (`docs/OWNERSHIP.md`) | — |
| MobilePremium design system (four pillars, primitive inventory, atmosphere palettes, 490px test, gating policy) | `docs/architecture/mobile-premium-design-system.md` | The visual source of truth is `app/dev/premium.tsx`; the doc is the written reference. |
| PWA installability (manifest, SW, runtime injection, icons) | `docs/architecture/pwa-installability.md` | The runtime injection block in `app/_layout.tsx` is load-bearing — keep it in sync with the doc. |
| How to evolve arqavellum itself (when to fix in arqavellum vs. in a consumer) | `docs/contributing.md` | — |
| Theme tokens (canonical hex values) | `constants/theme.ts` | Source of truth. Docs that mention a color link here; they don't restate the hex. |
| Animation durations | `constants/animation.ts` | Source of truth. `ARCHITECTURE.md` §S3 cross-links. |
| Responsive breakpoints | `constants/breakpoints.ts` | Source of truth. `ARCHITECTURE.md` §C3 and §C9 cross-link. |
| Audit scripts (canonical regex / exempt lists / escape hatches) | `scripts/audit-*.ts` | If `CLAUDE.md`'s cheatsheet and the scripts disagree, the scripts win. |
| Package manifest (dependencies, scripts) | `package.json` | Source of truth. `CLAUDE.md` and `README.md` cross-link specific scripts (e.g. `lint:structure`). |

## Rules

1. **One owner per claim.** If two docs appear to own the same claim, one is canonical and the other cross-links. The table above settles which is which.
2. **Navigation layers don't restate content.** `README.md`, `CLAUDE.md` intro paragraphs are navigation surfaces — they point at canonical content; they don't paraphrase it.
3. **Source code is canonical for what it owns.** `constants/theme.ts` owns the hex values; `scripts/audit-*.ts` own the audit regexes; `package.json` owns the dependency list. Docs describe and link; they don't duplicate.
4. **If a change doesn't fit the contract, update the contract first.** Add a row to this table (or to a more specific doc's maintenance contract), then make the change.
