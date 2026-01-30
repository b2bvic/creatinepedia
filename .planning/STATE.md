---
repo:: creatine-research
domain:: SWS
updated:: 2026.01.28
---

# Creatine Research Site — State

## Current Position

- **Status:** Built, NOT deployed
- **Pages:** 109 in dist/ (100 articles + 1 hub + 6 category + 2 root)
- **Phase:** Deploy (domain registration + Netlify)

## Architecture Decisions

| Decision | Chose | Why | Date |
|----------|-------|-----|------|
| Forked from | aifirstsearch pipeline | Proven build system | 2026.01.28 |
| Color palette | Science-forward blue/teal | Research credibility, academic feel | 2026.01.28 |
| Schema markup | TechArticle + BreadcrumbList | Research content, citeable | 2026.01.28 |
| Article clusters | 6 (science, dosing, sports, safety, comparisons, quality) | Full topic coverage | 2026.01.28 |
| Citations | Peer-reviewed bibliography per article | Authority signals | 2026.01.28 |
| Attribution | SWS footer backlink on every page | Demo asset + SEO | 2026.01.28 |

## Blockers

- Domain not registered
- No git init yet
- No Netlify setup
- No GSC verification

## Purpose

Platform demo asset #2. Shows SWS capability to build 100-page research-grade sites from scratch. Used in sales conversations and portfolio.

## Build Commands

```bash
cd ~/Documents/code/creatine-research
node scripts/retemplate.js     # 100 articles
node scripts/generate-indexes.js  # Hub + 6 category pages
node scripts/build.js          # Full build to dist/ (109 pages)
```

## Content Distribution

| Cluster | Count |
|---------|-------|
| Science | 20 |
| Dosing | 15 |
| Sports | 20 |
| Safety | 15 |
| Comparisons | 15 |
| Quality | 15 |
