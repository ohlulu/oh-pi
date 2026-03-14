# App Store Screenshots

Build a Next.js page that renders iOS App Store screenshots as advertisements and exports them via `html-to-image` at Apple's required resolutions.

## Usage

Ask the agent to build App Store screenshot pages:

```
Build App Store screenshots for my app
Generate marketing screenshots for iOS
Create a screenshot generator with phone mockups
```

## What It Does

- Scaffolds a Next.js + Tailwind project with `html-to-image` export
- Guides copy-first workflow: headlines approved before layout
- Renders iPhone mockups using included `mockup.png` with pre-measured overlays
- Renders iPad mockups with CSS-only frames (no asset needed)
- Exports at all Apple-required resolutions (6.9", 6.5", 6.3", 6.1" iPhone; 13" / 12.9" iPad)
- Supports device toggle (iPhone / iPad) with size dropdown
- Uses double-call `toPng()` trick for reliable font/image rendering

## When to Use

- Building App Store screenshot pages
- Generating exportable marketing screenshots for iOS apps
- Creating programmatic screenshot generators

## Key Rules

- Screenshots are **advertisements**, not UI documentation — sell a feeling, not a feature list
- One idea per headline; 3–5 words per line; readable at thumbnail size
- Vary phone placement across slides — never repeat the same layout
- Copy-first: get all headlines approved before building layouts
- Design at largest resolution (1320×2868), scale down for export
- Always use double-call `toPng()` — first call warms fonts/images
