# Sema

An AI chat product with a streaming interface, built for the FlyRank AI Internship
Front-end AI Engineering track.

*Sema* is Swahili for "speak".

## What this is

A production-quality chat interface for a large language model. The focus of this
project is the **front end**: streaming token rendering, structured tool output,
accessible components, and the error and empty states that separate a demo from a
product.

## Status

Early setup. The application skeleton lands in FE-05; the streaming chat interface
lands in FE-06.

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| UI | React + Tailwind CSS |
| Model access | Anthropic Claude via the AI SDK |
| Hosting | Vercel |

## Getting started

**Prerequisites:** Node.js 20 LTS or newer, npm 10+, and an Anthropic API key.

```bash
git clone https://github.com/Robertkip/sema-chat.git
cd sema-chat
npm install
cp .env.example .env.local   # then add your ANTHROPIC_API_KEY
npm run dev
```

Then open <http://localhost:3000>.

> The app skeleton lands in FE-05. Until then `npm run dev` has nothing to serve —
> the steps above are the contract the skeleton will satisfy.

## Roadmap

This repo is built incrementally across the Front-end AI Engineering track:

- [x] **FE-01** — Environment and AI toolchain
- [ ] **FE-04** — The AI-assisted workflow drill
- [ ] **FE-05** — Capstone skeleton, deployed
- [ ] **FE-03** — Accessible component fundamentals
- [ ] **FE-06** — Streaming AI chat interface
- [ ] **FE-07** — Tool results and structured output in the UI
- [ ] **FE-08** — Error states, empty states, edge cases
- [ ] **FE-09** — Testing pass
- [ ] **FE-10** — Accessibility and performance audit
- [ ] **FE-11** — Production deployment and README

## License

MIT — see [LICENSE](LICENSE).
