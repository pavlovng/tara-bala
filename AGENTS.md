# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Tara Bala Calculator — a browser-based Vedic astrology tool that calculates the Tara Bala (star strength) based on a person's birth nakshatra and the current/transit Moon position. UI is in Russian.

## Running and Testing

No build step. Serve static files with any HTTP server (ES modules require it):

```
npx serve .
# or
python -m http.server 8000
```

Open in browser:
- **App**: `index.html`
- **Unit tests** (pure logic, no ephemeris): `test/test.html`
- **Golden tests** (requires Swiss Ephemeris WASM): `test/test-golden.html`

There is no test runner or CI — tests are browser-based `<script type="module">` pages with visual pass/fail output.

## Architecture

The app loads Swiss Ephemeris (WASM) from CDN at runtime to compute sidereal Moon longitude, then applies Vedic astrological calculations.

**`js/swiss.js`** — Async wrapper around the `swisseph-wasm` CDN module. Initializes the ephemeris engine, exposes `getMoonSiderealLongitude(jd)`, `julday()`, and `getAyanamsa()`. Uses True Lahiri/Chitrapaksha ayanamsa (`SE_SIDM_LAHIRI`).

**`js/calculator.js`** — Pure astrological math: maps sidereal longitude to nakshatra index (0–26), computes tara number (1–27) as `(currentIdx - janmaIdx + 27) % 27 + 1`, maps to tara class (0–8) as `(taraNum - 1) % 9`. Also handles boundary detection (moon within ~2 arcmin of a nakshatra edge) and binary-search refinement to sub-second precision.

**`js/data.js`** — Static reference data: 27 nakshatras (with Russian and Sanskrit names), 9 tara classes (with favorability ratings), fixed UTC offset timezone list, and constants (`NAKSHATRA_SIZE = 360/27`, `BOUNDARY_THRESHOLD_DEG`).

**`js/app.js`** — UI controller. Two input modes: Auto (date/time/coordinates → computes birth nakshatra via Swiss Eph) and Manual (user selects nakshatra directly). Supports "now" or custom calculation time. Converts local time to UTC using either fixed offsets or IANA timezone via `Intl.DateTimeFormat`.

**`css/style.css`** — Dark theme styling (marcboney.ru-inspired).

## Key Domain Concepts

- **Nakshatra**: One of 27 lunar mansions, each spanning 13.333° of sidereal longitude
- **Tara Number**: Distance from birth nakshatra to transit nakshatra (1–27), cyclical
- **Tara Class**: Tara number mod 9 → one of 9 classes (Janma, Sampat, Vipat, etc.), each with a favorability rating
- **Boundary detection**: Warns when the Moon is within ~2 arcmin of a nakshatra boundary, as the result may change imminently
