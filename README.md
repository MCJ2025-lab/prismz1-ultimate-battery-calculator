# PrismZ1 Battery Calculator

A dark-mode e-bike/e-scooter battery calculator built with Next.js (App Router), React, TypeScript, and Tailwind CSS. Installable as a PWA on desktop and mobile.

## Features

- **Time to full charge** — piecewise-linear interpolation across calibrated charge points, plus a fixed buffer
- **Electricity cost estimate** — based on an editable ₱/kWh rate, synced across your devices via a small API route
- **Remaining range** — estimated km left per speed mode, derived from GPS-calibrated field samples
- **History** — recent calculations, persisted locally
- **Installable PWA** — add-to-home-screen support with offline service worker and app icons for desktop, Android, and iOS

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- [Next.js](https://nextjs.org) (App Router)
- React + TypeScript
- Tailwind CSS
- Progressive Web App (manifest, service worker, install prompt)

## Build

```bash
npm run build
```
