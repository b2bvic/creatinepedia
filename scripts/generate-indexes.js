#!/usr/bin/env node

/**
 * Generate articles hub page + category index pages.
 *
 * Creates:
 * - articles.html (root level hub listing all categories)
 * - index.html in each cluster directory (category listing)
 *
 * Run: node scripts/generate-indexes.js
 */

const fs = require('fs');
const path = require('path');
const { megaNavHtml, megaNavStyles, megaNavScript, footerHtml, headIncludes } = require('./shared');

const ROOT_DIR = path.join(__dirname, '..');

const CATEGORIES = {
    'science': {
        name: 'Science & Mechanisms',
        description: 'How creatine works at the molecular level. ATP resynthesis, phosphocreatine, cell volumization, and more.',
        color: 'sky'
    },
    'dosing': {
        name: 'Dosing Protocols',
        description: 'Evidence-based loading, maintenance, and timing protocols from peer-reviewed research.',
        color: 'teal'
    },
    'sports': {
        name: 'Sport Applications',
        description: 'Sport-by-sport creatine application guides based on energy system demands.',
        color: 'amber'
    },
    'safety': {
        name: 'Safety & Concerns',
        description: 'Clinical evidence on kidneys, liver, hair, dehydration, and long-term safety.',
        color: 'rose'
    },
    'comparisons': {
        name: 'Supplement Comparisons',
        description: 'Head-to-head evidence: creatine vs protein, BCAAs, beta-alanine, and more.',
        color: 'violet'
    },
    'quality': {
        name: 'Product Quality',
        description: 'Third-party testing, purity standards, and which forms actually work.',
        color: 'emerald'
    }
};

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function extractTitle(html) {
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    if (h1Match) {
        return h1Match[1].replace(/<[^>]*>/g, '').trim();
    }
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
    if (titleMatch) {
        return titleMatch[1].replace(/\s*\|.*$/, '').trim();
    }
    return 'Untitled';
}

function extractDescription(html) {
    const match = html.match(/<meta\s+name="description"\s+content="([\s\S]*?)"/);
    return match ? match[1].trim() : '';
}

function slugToTitle(slug) {
    return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getArticlesForCategory(category) {
    const dirPath = path.join(ROOT_DIR, category);
    if (!fs.existsSync(dirPath)) return [];

    return fs.readdirSync(dirPath)
        .filter(f => f.endsWith('.html') && f !== 'index.html')
        .map(file => {
            const html = fs.readFileSync(path.join(dirPath, file), 'utf8');
            const title = extractTitle(html);
            const description = extractDescription(html);
            const slug = file.replace('.html', '');
            return { file, slug, title, description };
        })
        .sort((a, b) => a.title.localeCompare(b.title));
}

function pageShell(title, description, canonicalPath, bodyContent) {
    const safeTitle = escapeHtml(title);
    const safeDesc = escapeHtml(description);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} | Creatine Research</title>
  <meta name="description" content="${safeDesc}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://creatineresearch.co${canonicalPath}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://creatineresearch.co${canonicalPath}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:site_name" content="Creatine Research">
${headIncludes}
  <style>
    ::selection { background: rgba(2, 132, 199, 0.3); }
${megaNavStyles}
  </style>
</head>
<body class="bg-slate-50 dark:bg-slate-950 font-sans antialiased">
${megaNavHtml}

  <main class="pt-24 pb-16">
${bodyContent}
  </main>

${footerHtml}

${megaNavScript}
</body>
</html>`;
}

// ---- Hub Page (articles.html) ----

function generateHubPage() {
    let totalArticles = 0;
    const categoryData = {};

    for (const [dir, meta] of Object.entries(CATEGORIES)) {
        const articles = getArticlesForCategory(dir);
        categoryData[dir] = { ...meta, articles, count: articles.length };
        totalArticles += articles.length;
    }

    const colorMap = {
        sky: { bg: 'bg-sky-500/10 dark:bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/20', hover: 'hover:border-sky-500/40' },
        teal: { bg: 'bg-teal-500/10 dark:bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/20', hover: 'hover:border-teal-500/40' },
        amber: { bg: 'bg-amber-500/10 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', hover: 'hover:border-amber-500/40' },
        rose: { bg: 'bg-rose-500/10 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20', hover: 'hover:border-rose-500/40' },
        violet: { bg: 'bg-violet-500/10 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/20', hover: 'hover:border-violet-500/40' },
        emerald: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', hover: 'hover:border-emerald-500/40' }
    };

    const categoryCards = Object.entries(categoryData).map(([dir, data]) => {
        const c = colorMap[data.color] || colorMap.sky;
        return `
        <a href="/${dir}" class="block p-6 bg-white dark:bg-zinc-900/50 border ${c.border} ${c.hover} rounded-xl transition-colors group">
          <div class="flex items-center justify-between mb-3">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}">${data.name}</span>
            <span class="text-sm text-slate-400 dark:text-zinc-600">${data.count} articles</span>
          </div>
          <p class="text-sm text-slate-600 dark:text-zinc-500 leading-relaxed">${data.description}</p>
        </a>`;
    }).join('\n');

    // Latest articles from each category (3 per category, max 18)
    const featured = [];
    for (const [dir, data] of Object.entries(categoryData)) {
        const c = colorMap[data.color] || colorMap.sky;
        data.articles.slice(0, 3).forEach(article => {
            featured.push({ ...article, dir, categoryName: data.name, colorClasses: c });
        });
    }

    const articleGrid = featured.map(a => {
        const c = a.colorClasses;
        const desc = a.description ? `<p class="text-sm text-slate-500 dark:text-zinc-600 line-clamp-2 mt-2">${escapeHtml(a.description)}</p>` : '';
        return `
        <a href="/${a.dir}/${a.slug}" class="block p-5 bg-white dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800/60 hover:border-slate-300 dark:hover:border-zinc-700 rounded-lg transition-colors">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text} mb-2">${a.categoryName}</span>
          <h3 class="text-slate-800 dark:text-zinc-200 font-medium leading-snug">${escapeHtml(a.title)}</h3>${desc}
        </a>`;
    }).join('\n');

    const body = `
    <div class="max-w-6xl mx-auto px-6">
      <div class="max-w-3xl mb-16">
        <h1 class="font-serif text-4xl md:text-5xl leading-tight text-slate-900 dark:text-zinc-100 mb-4">Articles</h1>
        <p class="text-lg text-slate-600 dark:text-zinc-500">100 research-grade articles on creatine supplementation. Every claim cited from peer-reviewed sources.</p>
      </div>

      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
${categoryCards}
      </div>

      <div class="mb-8">
        <h2 class="font-serif text-3xl text-slate-900 dark:text-zinc-100 mb-8">Featured Articles</h2>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
${articleGrid}
        </div>
      </div>
    </div>`;

    return pageShell(
        'Articles',
        `${totalArticles} research-grade articles on creatine supplementation. Every claim cited from peer-reviewed sources.`,
        '/articles',
        body
    );
}

// ---- Category Index Pages ----

function generateCategoryIndex(category) {
    const meta = CATEGORIES[category];
    if (!meta) return null;

    const articles = getArticlesForCategory(category);
    if (articles.length === 0) return null;

    const colorMap = {
        sky: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400' },
        teal: { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400' },
        amber: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
        rose: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
        violet: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
        emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' }
    };
    const c = colorMap[meta.color] || colorMap.sky;

    const articleList = articles.map(a => {
        const desc = a.description ? `<p class="text-sm text-slate-500 dark:text-zinc-600 mt-1 line-clamp-2">${escapeHtml(a.description)}</p>` : '';
        return `
          <a href="/${category}/${a.slug}" class="block p-5 bg-white dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800/60 hover:border-slate-300 dark:hover:border-zinc-700 rounded-lg transition-colors">
            <h3 class="text-slate-800 dark:text-zinc-200 font-medium leading-snug">${escapeHtml(a.title)}</h3>${desc}
          </a>`;
    }).join('\n');

    const body = `
    <div class="max-w-4xl mx-auto px-6">
      <div class="flex items-center gap-2 text-sm mb-8">
        <a href="/" class="text-slate-400 dark:text-zinc-600 hover:text-slate-600 dark:hover:text-zinc-400 transition-colors">Home</a>
        <span class="text-slate-300 dark:text-zinc-700">/</span>
        <a href="/articles" class="text-slate-400 dark:text-zinc-600 hover:text-slate-600 dark:hover:text-zinc-400 transition-colors">Articles</a>
        <span class="text-slate-300 dark:text-zinc-700">/</span>
        <span class="text-slate-600 dark:text-zinc-400">${meta.name}</span>
      </div>

      <div class="mb-12">
        <div class="flex items-center gap-3 mb-4">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}">${articles.length} articles</span>
        </div>
        <h1 class="font-serif text-4xl md:text-5xl leading-tight text-slate-900 dark:text-zinc-100 mb-4">${meta.name}</h1>
        <p class="text-lg text-slate-600 dark:text-zinc-500">${meta.description}</p>
      </div>

      <div class="grid gap-3">
${articleList}
      </div>

      <div class="mt-16 p-8 bg-white dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800/60 rounded-xl text-center">
        <h2 class="font-serif text-2xl text-slate-900 dark:text-zinc-100 mb-3">Evidence-Based Research</h2>
        <p class="text-slate-600 dark:text-zinc-500 mb-6">Every claim cited from peer-reviewed sources. Get the latest research delivered.</p>
        <a href="#newsletter" class="inline-block px-8 py-3 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg transition-colors">Get Research Updates</a>
      </div>
    </div>`;

    return pageShell(
        `${meta.name} — Creatine Research`,
        `${articles.length} articles about ${meta.description.toLowerCase()}`,
        `/${category}`,
        body
    );
}

// ---- Main ----

function main() {
    console.log('Generating index pages...\n');

    // Hub page
    const hubHtml = generateHubPage();
    fs.writeFileSync(path.join(ROOT_DIR, 'articles.html'), hubHtml);
    console.log('  articles.html (hub page)');

    // Category indexes
    let catCount = 0;
    for (const category of Object.keys(CATEGORIES)) {
        const html = generateCategoryIndex(category);
        if (!html) continue;

        const dirPath = path.join(ROOT_DIR, category);
        if (!fs.existsSync(dirPath)) continue;

        fs.writeFileSync(path.join(dirPath, 'index.html'), html);
        console.log(`  ${category}/index.html`);
        catCount++;
    }

    console.log(`\n✓ Generated 1 hub + ${catCount} category index pages`);
}

main();
