#!/usr/bin/env node

/**
 * Retemplate all cluster article HTML files to match root page design system.
 *
 * Extracts: title, meta description, schema JSON-LD, article body
 * Wraps in: Tailwind CDN + DM Sans + Instrument Serif + mega nav/footer
 *
 * Run: node scripts/retemplate.js
 */

const fs = require('fs');
const path = require('path');
const { megaNavHtml, megaNavStyles, megaNavScript, footerHtml, headIncludes } = require('./shared');

const ROOT_DIR = path.join(__dirname, '..');

const HTML_SOURCE_DIRS = [
    'science',
    'dosing',
    'sports',
    'safety',
    'comparisons',
    'quality'
];

const CATEGORY_NAMES = {
    'science': 'Science & Mechanisms',
    'dosing': 'Dosing Protocols',
    'sports': 'Sport Applications',
    'safety': 'Safety & Concerns',
    'comparisons': 'Supplement Comparisons',
    'quality': 'Product Quality'
};

const PILLAR_PAGES = {
    'science': { slug: 'creatine-mechanisms-summary', label: 'Complete Science Guide' },
    'dosing': { slug: 'creatine-dosing-protocols-summary', label: 'Complete Dosing Guide' },
    'sports': { slug: 'creatine-for-sport-summary', label: 'Every Sport Guide' },
    'safety': { slug: 'creatine-safety-complete-guide', label: 'Complete Safety Guide' },
    'comparisons': { slug: 'creatine-supplement-hierarchy', label: 'Supplement Hierarchy Guide' },
    'quality': { slug: 'creatine-buying-guide', label: 'Complete Buying Guide' }
};

function truncateText(str, maxLen) {
    if (!str || str.length <= maxLen) return str;
    const truncated = str.slice(0, maxLen - 3).replace(/\s+\S*$/, '');
    return truncated + '...';
}

function escapeAttr(str) {
    // First decode any existing entities to avoid double-encoding
    let decoded = str
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
    // Then encode for attribute context
    return decoded
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function extractFromHtml(html) {
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].trim() : 'Creatinepedia';

    const descMatch = html.match(/<meta\s+name="description"\s+content="([\s\S]*?)"/);
    const description = descMatch ? descMatch[1].trim() : '';

    const schemaBlocks = [];
    const schemaRegex = /<script\s+type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g;
    let match;
    while ((match = schemaRegex.exec(html)) !== null) {
        schemaBlocks.push(match[1].trim());
    }

    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/);
    const articleContent = articleMatch ? articleMatch[1] : '';

    return { title, description, schemaBlocks, articleContent };
}

function buildTemplate(title, description, schemaBlocks, articleContent, category, slug) {
    const categoryName = CATEGORY_NAMES[category] || category;
    const pillar = PILLAR_PAGES[category];
    const safeTitle = escapeAttr(truncateText(title, 65));
    const safeDesc = escapeAttr(truncateText(description, 160));

    const schemaScripts = schemaBlocks.map(s =>
        `  <script type="application/ld+json">\n  ${s}\n  </script>`
    ).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://creatinepedia.com/${category}/${slug}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://creatinepedia.com/${category}/${slug}">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:site_name" content="Creatinepedia">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
${schemaScripts}
${headIncludes}
  <style>
    ::selection { background: rgba(2, 132, 199, 0.3); }
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: var(--bg-secondary, #18181b); }
    ::-webkit-scrollbar-thumb { background: var(--border, #27272a); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }

    /* Article body — light mode */
    .article-body { max-width: 720px; margin: 0 auto; padding: 0 1rem; }
    .article-body h1 { font-family: 'Instrument Serif', Georgia, serif; font-size: 2.75rem; line-height: 1.15; margin-bottom: 1rem; color: #0f172a; }
    .article-body h2 { font-family: 'Instrument Serif', Georgia, serif; font-size: 1.875rem; margin: 2.5rem 0 1rem; color: #0f172a; }
    .article-body h3 { font-size: 1.25rem; font-weight: 600; margin: 2rem 0 0.75rem; color: #0f172a; }
    .article-body p { margin-bottom: 1.5rem; color: #475569; line-height: 1.8; }
    .article-body a { color: #0284c7; text-decoration: none; }
    .article-body a:hover { text-decoration: underline; }
    .article-body ul, .article-body ol { margin: 1.5rem 0; padding-left: 1.5rem; color: #475569; }
    .article-body li { margin-bottom: 0.75rem; line-height: 1.7; }
    .article-body strong { color: #1e293b; }
    .article-body blockquote { border-left: 3px solid #0284c7; padding-left: 1.5rem; margin: 2rem 0; font-style: italic; color: #334155; }
    .article-body .meta { color: #64748b; font-size: 0.9rem; margin-bottom: 2rem; }
    .article-body table { width: 100%; border-collapse: collapse; margin: 2rem 0; }
    .article-body th, .article-body td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid #e2e8f0; color: #475569; }
    .article-body th { color: #0f172a; font-weight: 600; border-bottom: 2px solid #cbd5e1; }
    .article-body .cta-box {
      background: linear-gradient(135deg, rgba(2, 132, 199, 0.08), rgba(13, 148, 136, 0.04));
      border: 1px solid rgba(2, 132, 199, 0.2);
      border-radius: 16px; padding: 2.5rem; margin: 3rem 0; text-align: center;
    }
    .article-body .cta-box h3 { margin-top: 0; font-family: 'Instrument Serif', Georgia, serif; font-size: 1.5rem; }
    .article-body .cta-box p { color: #64748b; margin-bottom: 1.5rem; }
    .article-body .cta-button {
      display: inline-block; background: #0284c7; color: #ffffff;
      padding: 1rem 2rem; border-radius: 8px; font-weight: 600;
      text-decoration: none; transition: background 0.2s;
    }
    .article-body .cta-button:hover { background: #0ea5e9; text-decoration: none; }
    .article-body .related-articles { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #e2e8f0; }
    .article-body .related-articles h3 { margin-bottom: 1rem; }
    .article-body .related-articles ul { list-style: none; padding: 0; }
    .article-body .related-articles li { margin-bottom: 0.5rem; }
    .article-body .faq-section { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #e2e8f0; }
    .article-body .faq-section > h2 { margin-top: 0; }
    .article-body .faq-item { margin-bottom: 2rem; }
    .article-body .faq-item h3 { color: #0f172a; margin-bottom: 0.5rem; }
    .article-body .faq-item p { margin-bottom: 0; }

    /* Article body — dark mode */
    .dark .article-body h1, .dark .article-body h2, .dark .article-body h3 { color: #fafaf9; }
    .dark .article-body p { color: #a1a1aa; }
    .dark .article-body ul, .dark .article-body ol { color: #a1a1aa; }
    .dark .article-body strong { color: #e4e4e7; }
    .dark .article-body a { color: #38bdf8; }
    .dark .article-body blockquote { color: #d4d4d8; }
    .dark .article-body .meta { color: #71717a; }
    .dark .article-body th, .dark .article-body td { border-bottom-color: #27272a; color: #a1a1aa; }
    .dark .article-body th { color: #fafaf9; border-bottom-color: #3f3f46; }
    .dark .article-body .cta-box { background: linear-gradient(135deg, rgba(2, 132, 199, 0.12), rgba(13, 148, 136, 0.06)); }
    .dark .article-body .cta-box p { color: #a1a1aa; }
    .dark .article-body .related-articles { border-top-color: #27272a; }
    .dark .article-body .faq-section { border-top-color: #27272a; }
    .dark .article-body .faq-item h3 { color: #fafaf9; }

    /* Newsletter section */
    #newsletter input::placeholder { color: #94a3b8; }
    .dark #newsletter input::placeholder { color: #52525b; }

${megaNavStyles}

    @media (max-width: 768px) {
      .article-body h1 { font-size: 2rem; }
      .article-body h2 { font-size: 1.5rem; }
    }
  </style>
</head>
<body class="bg-slate-50 dark:bg-slate-950 font-sans antialiased">
${megaNavHtml}

  <main class="pt-24 pb-16">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 mb-6">
      <div class="flex items-center gap-2 text-sm">
        <a href="/" class="text-slate-400 dark:text-zinc-600 hover:text-slate-600 dark:hover:text-zinc-400 transition-colors">Home</a>
        <span class="text-slate-300 dark:text-zinc-700">/</span>
        <a href="/articles" class="text-slate-400 dark:text-zinc-600 hover:text-slate-600 dark:hover:text-zinc-400 transition-colors">Articles</a>
        <span class="text-slate-300 dark:text-zinc-700">/</span>
        <a href="/${category}" class="text-slate-400 dark:text-zinc-600 hover:text-slate-600 dark:hover:text-zinc-400 transition-colors">${categoryName}</a>
      </div>
    </div>
    <div class="article-body">
      <article>${articleContent}
      </article>

      <!-- In-article CTA -->
      <div class="cta-box">
        <h3>Stay Current with Creatinepedia</h3>
        <p>Get notified when new entries are published. No hype, no marketing — just what the science shows.</p>
        <a href="#newsletter" class="cta-button">Get New Entries</a>
      </div>

      <!-- Pillar page link -->${pillar ? `
      <div class="related-articles">
        <h3>Read the Full Guide</h3>
        <p style="margin-bottom: 0.75rem;"><a href="/${category}/${pillar.slug}">${pillar.label}: ${categoryName}</a> — comprehensive overview with all cited sources.</p>
      </div>` : ''}
    </div>

    <!-- Category nav -->
    <div class="max-w-3xl mx-auto px-4 sm:px-6 mt-12">
      <div class="flex items-center justify-between p-5 bg-slate-100 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800/60 rounded-xl">
        <div>
          <p class="text-xs text-slate-500 dark:text-zinc-600 uppercase tracking-wider mb-1">Category</p>
          <a href="/${category}" class="text-slate-800 dark:text-zinc-200 font-medium hover:text-sky-600 dark:hover:text-sky-400 transition-colors">${categoryName}</a>
        </div>
        <a href="/${category}" class="text-sm text-sky-600 dark:text-sky-400 font-medium hover:underline">Browse all &rarr;</a>
      </div>
    </div>
  </main>

  <!-- Newsletter section -->
  <section id="newsletter" class="py-16 bg-slate-100 dark:bg-zinc-900/30 border-t border-slate-200 dark:border-zinc-800/60">
    <div class="max-w-xl mx-auto px-6 text-center">
      <h2 class="font-serif text-3xl text-slate-900 dark:text-zinc-100 mb-3">New Entries & Updates</h2>
      <p class="text-slate-600 dark:text-zinc-400 mb-6">New encyclopedia entries and updates — delivered when they matter. No spam. Unsubscribe anytime.</p>
      <form class="flex flex-col sm:flex-row gap-3 justify-center" onsubmit="return false;">
        <input type="email" placeholder="your@email.com" class="px-4 py-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-sky-500 w-full sm:w-72">
        <button type="submit" class="px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg transition-colors cta-glow">Subscribe</button>
      </form>
      <p class="text-xs text-slate-500 dark:text-zinc-600 mt-3">100% evidence-based. Every claim cited.</p>
    </div>
  </section>

${footerHtml}

${megaNavScript}
</body>
</html>`;
}

function retemplate() {
    console.log('Retemplating cluster articles...\n');
    let total = 0;
    const errors = [];

    for (const dir of HTML_SOURCE_DIRS) {
        const dirPath = path.join(ROOT_DIR, dir);
        if (!fs.existsSync(dirPath)) {
            console.log(`  Skipping ${dir}/ (not found)`);
            continue;
        }

        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.html') && f !== 'index.html');
        let count = 0;

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const html = fs.readFileSync(filePath, 'utf8');
            const { title, description, schemaBlocks, articleContent } = extractFromHtml(html);

            if (!articleContent) {
                errors.push(`${dir}/${file}: no <article> tag found`);
                continue;
            }

            const slug = file.replace('.html', '');
            const newHtml = buildTemplate(title, description, schemaBlocks, articleContent, dir, slug);
            fs.writeFileSync(filePath, newHtml);
            count++;
        }

        console.log(`  ${dir}/: ${count} files`);
        total += count;
    }

    if (errors.length > 0) {
        console.log(`\nErrors (${errors.length}):`);
        errors.forEach(e => console.log(`  ${e}`));
    }

    console.log(`\n✓ Retemplated ${total} articles`);
}

retemplate();
