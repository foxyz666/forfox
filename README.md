# ForFox Demo

**IMPORTANT — DEMO ONLY. DOES NOT ACCEPT REAL MONEY.**  
This is a client-side educational demo of a fictional "ForFox" token. It intentionally stores everything in `localStorage` and does not connect to payment providers or blockchains.

## What's included
- React + Vite app
- Demo admin account: Netu
- Demo user: `demo@forfox.demo` / `demo123`
- Features: registration/login, deposits (demo), referral simulation, admin panel (view/edit users), smooth animations.

## Run locally
1. Install dependencies:
```bash
npm install
```
2. Start dev server:
```bash
npm run dev
```
3. Open the printed local URL in your browser.

## How to publish to GitHub Pages / GitHub
1. Create a new repository on GitHub.
2. Push this project (example commands):
```bash
git init
git add .
git commit -m "ForFox demo"
git branch -M main
git remote add origin https://github.com/<yourname>/<repo>.git
git push -u origin main
```
3. Optionally enable GitHub Pages from the repository settings to serve `index.html` (or use Vercel/Netlify).

## Legal / Safety notice
This repository is for demo/prank/educational purposes only. Do **not** accept real funds, do not use with real user credentials. The admin panel intentionally exposes passwords and personal data — this is insecure by design for this demo. If you want a production-ready system, you'll need secure backend, hashed passwords, auth, KYC, and legal compliance.

License: MIT
