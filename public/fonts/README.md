# Self-hosted fonts

These woff2 files are bundled locally so there is **zero network dependency on
pitch day** (design system §2). They are the `latin` subset, weights 400/500/600/700.

- `InstrumentSans-{400,500,600,700}.woff2` — UI font (Instrument Sans, OFL).
- `GeistMono-{400,500,600,700}.woff2` — data font (Geist Mono, OFL).

Declared via `@font-face` in `src/index.css`. Both fonts are licensed under the
SIL Open Font License; self-hosting is permitted. If you need extended glyphs
(Cyrillic, Vietnamese, etc.), pull the additional subsets from Google Fonts and
add matching `@font-face` blocks.
