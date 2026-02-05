# Deckflict

**Find missing cards across your MTG decks**

A privacy-focused web app to track your Magic: The Gathering collection and identify card conflicts across multiple decks. Upload your collection from Archidekt and instantly see which cards you need to proxy or purchase more copies of.

**Live App**: [deckflict.vercel.app](https://deckflict.vercel.app)

---

## Features

- **Upload Collection** — Import your card collection from Archidekt (CSV export)
- **Upload Decks** — Add multiple deck lists to compare
- **Card Count Analysis** — See which cards appear in multiple decks
- **Shortage Detection** — Identify cards where you own fewer copies than needed
- **Cards Not Owned** — View all cards you need to acquire
- **Export Missing Cards** — Download a list for easy purchasing
- **Basic Lands Filter** — Toggle to include/exclude basic and snow-covered lands
- **Scryfall Links** — Look up any card instantly
- **100% Private** — All data stays in your browser, no server, no tracking

---

## Supported Formats

### Collection Import
- Archidekt CSV export

### Deck List Import
- Archidekt CSV export
- Standard deck list format (`1 Card Name`)
- MTGO format (`1x Card Name`)
- Arena format (`1 Card Name (SET) 123`)

---

## Getting Started

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Production Build

```bash
npm run build
npm start
```

---

## How to Export from Archidekt

### Exporting Your Collection
1. Go to [archidekt.com](https://archidekt.com) and log in
2. Navigate to your Collection
3. Click the menu or export button
4. Select **Export as CSV**
5. Upload the downloaded file to Deckflict

### Exporting a Deck
1. Open your deck on Archidekt
2. Click **Export** > **Copy to Clipboard** or download as CSV/TXT
3. Upload or paste into Deckflict

---

## Privacy

Deckflict is **100% client-side**. Your data never leaves your browser:

- No account or login required
- No data sent to any server
- No cookies or tracking
- Data stored locally using browser localStorage

---

## Tech Stack

- [Next.js 16](https://nextjs.org) — React framework with App Router
- [TypeScript](https://typescriptlang.org) — Type safety
- [Tailwind CSS](https://tailwindcss.com) — Utility-first styling
- [Vercel](https://vercel.com) — Deployment
- Browser localStorage — Data persistence

---

## License

MIT
