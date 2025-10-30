DocScanPro

iOS‑first, privacy‑forward PDF scanner built with React Native. Fast capture, robust zoom/fit viewer, on‑device OCR, and a clean edit toolbar (crop/rotate/filters/delete). Android support will come later.

⸻

Why this repo looks the way it does
	•	pnpm‑only installs for deterministic dependency trees and disk savings.
	•	TypeScript with strict options and guarded nullish states to prevent runtime crashes.
	•	Husky hooks block commits/pushes that fail lint or typecheck.
	•	Light CI on GitHub Actions to keep PRs green (lint + typecheck).
	•	React Navigation v7 with an explicit navigator id and central route types.

⸻

Requirements
	•	Node 20+ (repo has "engines": { "node": ">=20" }).
	•	pnpm 9 (the repo declares "packageManager": "pnpm@9.0.0").
	•	Enable via Corepack: corepack enable then pnpm -v.
	•	Xcode + Cocoapods for iOS: gem install cocoapods (or Bundler).
	•	Watchman (optional, improves Metro): brew install watchman.

Android: The android script currently exits intentionally. iOS is the primary target for now.

⸻

Quick start (iOS)

# 0) Ensure corepack/pnpm are available
corepack enable

# 1) Install JS deps
pnpm i

# 2) Install iOS pods
cd ios && pod install && cd ..

# 3) Start Metro
pnpm start

# 4) Run on iOS simulator or a connected device
pnpm ios

If everything is set up correctly, the app boots in the iOS Simulator and supports:
	•	Tap‑to‑fullscreen page carousel with pinch‑to‑zoom
	•	Rotation (persisted), basic filters, and delete in the edit toolbar
	•	On‑device OCR (privacy‑first) with bounding boxes prepared for overlays

⸻

Common commands

# Install deps
pnpm i

# Lint (fails on warnings)
pnpm lint

# Auto‑fix what can be fixed
pnpm lint:fix

# Typecheck only
pnpm typecheck

# Start Metro (JS bundler)
pnpm start

# iOS run
