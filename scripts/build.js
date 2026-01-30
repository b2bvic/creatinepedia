#!/usr/bin/env node

/**
 * Creatine Research - Static Site Build Script
 *
 * Converts markdown files from content/ to HTML in dist/
 * - Parses frontmatter for metadata
 * - Injects schema, meta tags, internal links
 * - Generates sitemap.xml
 * - Outputs production-ready HTML
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    contentDir: path.join(__dirname, '..', 'content'),
    distDir: path.join(__dirname, '..', 'dist'),
    templateDir: path.join(__dirname, '..', 'templates'),
    rootDir: path.join(__dirname, '..'),
    siteUrl: 'https://creatineresearch.co',
    siteName: 'Creatine Research',
    author: 'Scale With Search',
    defaultOgImage: '/images/og-default.webp'
};

// Source HTML directories to copy to dist (hand-written articles)
const HTML_SOURCE_DIRS = [
    'science',
    'dosing',
    'sports',
    'safety',
    'comparisons',
    'quality'
];

// Root-level files to copy to dist
const ROOT_FILES = [
    'index.html',
    'articles.html',
    'robots.txt',
    'styles.css',
    'base.css'
];

// Root-level HTML files with rename mapping (source -> dist name)
const ROOT_HTML_RENAMES = {};

// Cluster metadata for categorization
const CLUSTERS = {
    'science': { name: 'Science & Mechanisms', color: '#0284c7' },
    'dosing': { name: 'Dosing Protocols', color: '#0d9488' },
    'sports': { name: 'Sport Applications', color: '#f59e0b' },
    'safety': { name: 'Safety & Concerns', color: '#ef4444' },
    'comparisons': { name: 'Supplement Comparisons', color: '#8b5cf6' },
    'quality': { name: 'Product Quality', color: '#10b981' }
};

/**
 * Parse frontmatter from markdown content
 * Expects YAML-style frontmatter between --- delimiters
 */
function parseFrontmatter(content) {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
        return { metadata: {}, body: content };
    }

    const frontmatterStr = match[1];
    const body = match[2];
    const metadata = {};

    // Parse YAML-like frontmatter
    frontmatterStr.split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            let value = line.substring(colonIndex + 1).trim();
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            metadata[key] = value;
        }
    });

    return { metadata, body };
}

/**
 * Convert markdown to HTML
 * Simple implementation - handles common markdown patterns
 */
function markdownToHtml(markdown) {
    let html = markdown;

    // Headers
    html = html.replace(/^######\s+(.*)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.*)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.*)$/gm, '<h3 class="text-xl font-semibold mt-8 mb-4">$1</h3>');
    html = html.replace(/^##\s+(.*)$/gm, '<h2 class="text-2xl sm:text-3xl font-bold mb-6">$1</h2>');
    html = html.replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-accent hover:text-accent-light">$1</a>');

    // Blockquotes
    html = html.replace(/^>\s+(.*)$/gm, '<blockquote class="my-8"><p>$1</p></blockquote>');

    // Unordered lists
    html = html.replace(/^[-*]\s+(.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul class="space-y-2 my-6 text-text-muted">$&</ul>');

    // Ordered lists
    html = html.replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr class="my-8 border-border">');

    // Paragraphs - wrap text blocks not already in tags
    const lines = html.split('\n');
    const processedLines = [];
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Toggle code block state
        if (line.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            processedLines.push(line);
            continue;
        }

        if (inCodeBlock) {
            processedLines.push(lines[i]); // Preserve original spacing in code
            continue;
        }

        // Skip empty lines
        if (!line) {
            processedLines.push('');
            continue;
        }

        // Skip lines that are already HTML tags
        if (line.startsWith('<') || line.endsWith('>')) {
            processedLines.push(line);
            continue;
        }

        // Wrap plain text in paragraph
        processedLines.push(`<p>${line}</p>`);
    }

    html = processedLines.join('\n');

    // Code blocks with syntax highlighting placeholder
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || 'text';
        return `
<div class="code-block my-6">
    <div class="code-header">
        <div class="code-dots">
            <span class="code-dot red"></span>
            <span class="code-dot yellow"></span>
            <span class="code-dot green"></span>
        </div>
        <div class="flex items-center gap-3">
            <span class="text-text-dim text-sm font-mono">${language}</span>
            <button class="copy-button text-text-muted hover:text-text text-sm" onclick="copyCode(this)">Copy</button>
        </div>
    </div>
    <pre class="p-4 overflow-x-auto"><code class="text-sm font-mono">${code.trim()}</code></pre>
</div>`;
    });

    // Clean up extra newlines
    html = html.replace(/\n{3,}/g, '\n\n');

    return html;
}

/**
 * Calculate reading time from content
 */
function calculateReadingTime(content) {
    const words = content.split(/\s+/).length;
    return Math.ceil(words / 200);
}

/**
 * Generate schema.org JSON-LD for article
 */
function generateArticleSchema(metadata, url) {
    return {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        "headline": metadata.title,
        "description": metadata.description,
        "image": `${CONFIG.siteUrl}${metadata.ogImage || CONFIG.defaultOgImage}`,
        "author": {
            "@type": "Organization",
            "name": CONFIG.author,
            "url": "https://scalewithsearch.com"
        },
        "publisher": {
            "@type": "Organization",
            "name": CONFIG.siteName,
            "logo": {
                "@type": "ImageObject",
                "url": `${CONFIG.siteUrl}/images/logo.webp`
            }
        },
        "datePublished": metadata.date || new Date().toISOString().split('T')[0],
        "dateModified": metadata.modified || metadata.date || new Date().toISOString().split('T')[0],
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": url
        }
    };
}

/**
 * Generate breadcrumb schema
 */
function generateBreadcrumbSchema(cluster, title, url) {
    const clusterInfo = CLUSTERS[cluster] || { name: cluster };
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": CONFIG.siteUrl
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": clusterInfo.name,
                "item": `${CONFIG.siteUrl}/${cluster}/`
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": title,
                "item": url
            }
        ]
    };
}

/**
 * Generate FAQ schema from content
 */
function generateFaqSchema(faqs) {
    if (!faqs || faqs.length === 0) return null;

    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
        }))
    };
}

/**
 * Load and process the article template
 */
function loadTemplate() {
    // Use build-template.html which has proper placeholders
    const templatePath = path.join(CONFIG.templateDir, 'build-template.html');
    if (fs.existsSync(templatePath)) {
        return fs.readFileSync(templatePath, 'utf8');
    }

    // Fallback minimal template if build-template.html doesn't exist
    return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}} | ${CONFIG.siteName}</title>
    <meta name="description" content="{{DESCRIPTION}}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="{{CANONICAL_URL}}">
    <meta property="og:title" content="{{TITLE}}">
    <meta property="og:description" content="{{DESCRIPTION}}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="{{CANONICAL_URL}}">
    <meta property="og:image" content="{{OG_IMAGE}}">
    <meta property="og:site_name" content="${CONFIG.siteName}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{TITLE}}">
    <meta name="twitter:description" content="{{DESCRIPTION}}">
    <meta name="twitter:image" content="{{OG_IMAGE}}">
    {{SCHEMA_SCRIPTS}}
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'void': '#0a0a0f',
                        'void-light': '#12121a',
                        'void-lighter': '#1a1a26',
                        'surface': '#1e1e2e',
                        'surface-light': '#262636',
                        'border': 'rgba(255, 255, 255, 0.08)',
                        'border-light': 'rgba(255, 255, 255, 0.12)',
                        'accent': '#0284c7',
                        'accent-light': '#0ea5e9',
                        'accent-dim': 'rgba(2, 132, 199, 0.15)',
                        'text': '#f0f0f5',
                        'text-muted': '#8888a0',
                        'text-dim': '#5a5a70',
                        'code-green': '#4ade80',
                        'code-blue': '#60a5fa',
                        'code-purple': '#c084fc',
                        'code-yellow': '#fbbf24',
                    },
                    fontFamily: {
                        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
                        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
                    },
                }
            }
        }
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        .code-block { position: relative; background: #0d0d14; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; overflow: hidden; }
        .code-header { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.06); }
        .code-dots { display: flex; gap: 6px; }
        .code-dot { width: 12px; height: 12px; border-radius: 50%; }
        .code-dot.red { background: #ff5f57; }
        .code-dot.yellow { background: #febc2e; }
        .code-dot.green { background: #28c840; }
        .copy-button { opacity: 0; transition: opacity 0.2s; }
        .code-block:hover .copy-button { opacity: 1; }
        :not(pre) > code { background: rgba(255,255,255,0.08); padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
        blockquote { border-left: 3px solid #0284c7; padding-left: 1.5rem; font-style: italic; }
    </style>
</head>
<body class="bg-void text-text antialiased">
    <header class="fixed top-0 left-0 right-0 z-50 bg-void/90 backdrop-blur-lg border-b border-border">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
                <a href="/" class="flex items-center gap-2 text-xl font-bold">
                    <span class="text-text">Creatine</span>
                    <span class="text-accent">Research</span>
                </a>
                <nav class="hidden md:flex items-center gap-8">
                    <a href="/articles" class="text-text-muted hover:text-text transition-colors">Articles</a>
                    <a href="/science" class="text-text-muted hover:text-text transition-colors">Science</a>
                    <a href="#newsletter" class="bg-accent hover:bg-accent-light text-white px-4 py-2 rounded-lg font-semibold transition-colors">Research Updates</a>
                </nav>
            </div>
        </div>
    </header>
    <main class="pt-24 pb-16">
        <article class="max-w-3xl mx-auto px-4 sm:px-6">
            <header class="mb-10">
                <div class="flex items-center gap-3 mb-4">
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent-dim text-accent">{{CLUSTER_NAME}}</span>
                    <span class="text-text-dim text-sm">{{READING_TIME}} min read</span>
                </div>
                <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6">{{TITLE}}</h1>
                <p class="text-xl text-text-muted leading-relaxed">{{DESCRIPTION}}</p>
            </header>
            <div class="prose prose-lg max-w-none">
                {{CONTENT}}
            </div>
            <section class="my-16 p-8 bg-gradient-to-br from-accent/20 via-surface to-surface-light rounded-2xl border border-accent/20 text-center">
                <h2 class="text-2xl font-bold mb-4">Evidence-Based Creatine Research</h2>
                <p class="text-lg text-text-muted mb-6">Every claim cited from peer-reviewed sources. Get the latest research delivered.</p>
                <a href="#newsletter" class="inline-flex items-center justify-center px-8 py-4 bg-accent hover:bg-accent-light text-white text-lg font-semibold rounded-xl transition-colors">Get Research Updates</a>
            </section>
        </article>
    </main>
    <footer class="bg-void border-t border-border py-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p class="text-text-dim">&copy; ${new Date().getFullYear()} ${CONFIG.siteName}. All rights reserved.</p>
        </div>
    </footer>
    <script>
        function copyCode(button) {
            const codeBlock = button.closest('.code-block');
            const code = codeBlock.querySelector('code').innerText;
            navigator.clipboard.writeText(code).then(() => {
                button.textContent = 'Copied!';
                setTimeout(() => { button.textContent = 'Copy'; }, 2000);
            });
        }
    </script>
</body>
</html>`;
}

/**
 * Format date for display (e.g., "January 27, 2026")
 */
function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Build a single markdown file into HTML
 */
function buildFile(inputPath, outputPath) {
    const content = fs.readFileSync(inputPath, 'utf8');
    const { metadata, body } = parseFrontmatter(content);

    // Determine cluster from path
    const relativePath = path.relative(CONFIG.contentDir, inputPath);
    const cluster = path.dirname(relativePath);
    const slug = path.basename(inputPath, '.md');

    // Build URL
    const url = `${CONFIG.siteUrl}/${cluster}/${slug}`;

    // Convert markdown to HTML
    const htmlContent = markdownToHtml(body);

    // Calculate reading time
    const readingTime = calculateReadingTime(body);

    // Generate schemas
    const articleSchema = generateArticleSchema(metadata, url);
    const breadcrumbSchema = generateBreadcrumbSchema(cluster, metadata.title || slug, url);

    const schemas = [articleSchema, breadcrumbSchema];

    // Parse FAQs if present in metadata
    if (metadata.faqs) {
        try {
            const faqs = JSON.parse(metadata.faqs);
            const faqSchema = generateFaqSchema(faqs);
            if (faqSchema) schemas.push(faqSchema);
        } catch (e) {
            console.warn(`Warning: Could not parse FAQs for ${inputPath}`);
        }
    }

    const schemaScripts = schemas.map(s =>
        `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`
    ).join('\n');

    // Get cluster info
    const clusterInfo = CLUSTERS[cluster] || { name: cluster };

    // Load template and replace placeholders
    let template = loadTemplate();

    // Extract short title (first part before colon or full title if no colon)
    const fullTitle = metadata.title || slug;
    const shortTitle = fullTitle.includes(':') ? fullTitle.split(':')[0].trim() : fullTitle;

    const replacements = {
        // Standard placeholders
        '{{TITLE}}': fullTitle,
        '{{DESCRIPTION}}': metadata.description || '',
        '{{CANONICAL_URL}}': url,
        '{{OG_IMAGE}}': `${CONFIG.siteUrl}${metadata.ogImage || CONFIG.defaultOgImage}`,
        '{{SCHEMA_SCRIPTS}}': schemaScripts,
        '{{CLUSTER_NAME}}': clusterInfo.name,
        '{{READING_TIME}}': readingTime.toString(),
        '{{CONTENT}}': htmlContent,
        '{{DATE_PUBLISHED}}': metadata.date || new Date().toISOString().split('T')[0],
        '{{DATE_MODIFIED}}': metadata.modified || metadata.date || new Date().toISOString().split('T')[0],
        '{{CLUSTER_FOLDER}}': cluster,
        '{{SLUG}}': slug,

        // Template-specific placeholders (from article.html)
        '{{PRIMARY_KEYWORD}}': fullTitle,
        '{{META_DESCRIPTION}}': metadata.description || '',
        '{{H1_TITLE}}': fullTitle,
        '{{SHORT_TITLE}}': shortTitle,
        '{{DATE_DISPLAY}}': formatDate(metadata.date || new Date().toISOString().split('T')[0])
    };

    for (const [key, value] of Object.entries(replacements)) {
        template = template.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, template);

    return {
        url,
        title: metadata.title || slug,
        date: metadata.date || new Date().toISOString().split('T')[0],
        cluster
    };
}

/**
 * Generate sitemap.xml
 */
function generateSitemap(pages) {
    const today = new Date().toISOString().split('T')[0];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${CONFIG.siteUrl}/</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>${CONFIG.siteUrl}/articles</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
    </url>`;

    for (const page of pages) {
        sitemap += `
    <url>
        <loc>${page.url}</loc>
        <lastmod>${page.date}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>`;
    }

    sitemap += '\n</urlset>';

    return sitemap;
}

/**
 * Recursively find all markdown files in a directory
 */
function findMarkdownFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;

    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            findMarkdownFiles(fullPath, files);
        } else if (item.endsWith('.md') && item !== 'README.md') {
            files.push(fullPath);
        }
    }

    return files;
}

/**
 * Copy static files from content to dist
 */
function copyStaticFiles() {
    // Copy any non-markdown files (images, etc.)
    const staticExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico'];

    function copyRecursive(src, dest) {
        if (!fs.existsSync(src)) return;

        const items = fs.readdirSync(src);

        for (const item of items) {
            const srcPath = path.join(src, item);
            const destPath = path.join(dest, item);
            const stat = fs.statSync(srcPath);

            if (stat.isDirectory()) {
                if (!fs.existsSync(destPath)) {
                    fs.mkdirSync(destPath, { recursive: true });
                }
                copyRecursive(srcPath, destPath);
            } else if (staticExtensions.some(ext => item.endsWith(ext))) {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    copyRecursive(CONFIG.contentDir, CONFIG.distDir);
}

/**
 * Copy hand-written HTML source files from cluster directories to dist
 */
function copyHtmlSourceFiles() {
    let totalCopied = 0;
    for (const dir of HTML_SOURCE_DIRS) {
        const srcDir = path.join(CONFIG.rootDir, dir);
        const destDir = path.join(CONFIG.distDir, dir);

        if (!fs.existsSync(srcDir)) {
            console.log(`  Skipping ${dir}/ (not found)`);
            continue;
        }

        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.html'));
        for (const file of files) {
            fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        }
        totalCopied += files.length;
        console.log(`  ${dir}/: ${files.length} HTML files`);
    }
    return totalCopied;
}

/**
 * Copy root-level files to dist, with optional renames
 */
function copyRootFiles() {
    let copied = 0;
    for (const file of ROOT_FILES) {
        const src = path.join(CONFIG.rootDir, file);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, path.join(CONFIG.distDir, file));
            console.log(`  ${file}`);
            copied++;
        } else {
            console.log(`  ${file} (not found, skipping)`);
        }
    }

    for (const [src, dest] of Object.entries(ROOT_HTML_RENAMES)) {
        const srcPath = path.join(CONFIG.rootDir, src);
        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, path.join(CONFIG.distDir, dest));
            console.log(`  ${src} → ${dest}`);
            copied++;
        }
    }
    return copied;
}

/**
 * Copy JS directory to dist
 */
function copyJsFiles() {
    const srcDir = path.join(CONFIG.rootDir, 'js');
    const destDir = path.join(CONFIG.distDir, 'js');

    if (!fs.existsSync(srcDir)) return 0;

    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    const files = fs.readdirSync(srcDir);
    for (const file of files) {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
    }
    console.log(`  js/: ${files.length} files`);
    return files.length;
}

/**
 * Copy pages directory to dist
 */
function copyPages() {
    const srcDir = path.join(CONFIG.rootDir, 'pages');
    const destDir = path.join(CONFIG.distDir, 'pages');

    if (!fs.existsSync(srcDir)) return 0;

    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.html'));
    for (const file of files) {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
    }
    console.log(`  pages/: ${files.length} files`);
    return files.length;
}

/**
 * Scan dist/ for all HTML pages to build comprehensive sitemap
 */
function scanDistForPages() {
    const pages = [];
    const today = new Date().toISOString().split('T')[0];

    function scanDir(dir, urlPrefix) {
        if (!fs.existsSync(dir)) return;
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                scanDir(fullPath, `${urlPrefix}/${item}`);
            } else if (item.endsWith('.html')) {
                const slug = item.replace('.html', '');
                pages.push({
                    url: `${CONFIG.siteUrl}${urlPrefix}/${slug}`,
                    title: slug,
                    date: today,
                    cluster: urlPrefix.replace(/^\//, '')
                });
            }
        }
    }

    // Scan cluster directories
    for (const dir of HTML_SOURCE_DIRS) {
        scanDir(path.join(CONFIG.distDir, dir), `/${dir}`);
    }

    // Scan pages directory
    scanDir(path.join(CONFIG.distDir, 'pages'), '/pages');

    return pages;
}

/**
 * Main build function
 */
function build() {
    console.log('Creatine Research — Build\n');

    // Clean and create dist
    if (fs.existsSync(CONFIG.distDir)) {
        fs.rmSync(CONFIG.distDir, { recursive: true });
    }
    fs.mkdirSync(CONFIG.distDir, { recursive: true });

    // Step 1: Copy root files (index.html, articles.html, styles.css, etc.)
    console.log('Root files:');
    const rootCount = copyRootFiles();

    // Step 2: Copy hand-written HTML source directories
    console.log('\nCluster HTML:');
    const htmlCount = copyHtmlSourceFiles();

    // Step 3: Copy JS files
    console.log('\nAssets:');
    copyJsFiles();
    copyPages();

    // Step 4: Copy static files from content/ (images, etc.)
    copyStaticFiles();

    // Step 5: Build markdown -> HTML (content/ directory)
    // Skip markdown files that already have a retemplated HTML version in the source cluster dir
    const markdownFiles = findMarkdownFiles(CONFIG.contentDir);
    let mdBuilt = 0;
    let mdSkipped = 0;
    if (markdownFiles.length > 0) {
        console.log(`\nMarkdown → HTML:`);
        for (const inputPath of markdownFiles) {
            const relativePath = path.relative(CONFIG.contentDir, inputPath);
            const htmlEquivalent = relativePath.replace('.md', '.html');
            const sourceHtmlPath = path.join(CONFIG.rootDir, htmlEquivalent);

            // If a retemplated HTML version exists in the source cluster dir, skip the markdown build
            if (fs.existsSync(sourceHtmlPath)) {
                console.log(`  ${relativePath} → SKIPPED (HTML source exists)`);
                mdSkipped++;
                continue;
            }

            const outputPath = path.join(CONFIG.distDir, htmlEquivalent);
            try {
                buildFile(inputPath, outputPath);
                console.log(`  ${relativePath} → ${path.basename(outputPath)}`);
                mdBuilt++;
            } catch (error) {
                console.error(`  ERROR: ${relativePath}: ${error.message}`);
            }
        }
    }

    // Step 6: Generate comprehensive sitemap from all dist/ HTML
    console.log('\nSitemap:');
    const allPages = scanDistForPages();
    const sitemap = generateSitemap(allPages);
    fs.writeFileSync(path.join(CONFIG.distDir, 'sitemap.xml'), sitemap);
    console.log(`  ${allPages.length + 2} URLs (2 root + ${allPages.length} pages)`);

    // Copy .well-known if it exists
    const wellKnownSrc = path.join(CONFIG.rootDir, '.well-known');
    const wellKnownDest = path.join(CONFIG.distDir, '.well-known');
    if (fs.existsSync(wellKnownSrc)) {
        if (!fs.existsSync(wellKnownDest)) {
            fs.mkdirSync(wellKnownDest, { recursive: true });
        }
        const wkFiles = fs.readdirSync(wellKnownSrc);
        for (const f of wkFiles) {
            fs.copyFileSync(path.join(wellKnownSrc, f), path.join(wellKnownDest, f));
        }
    }

    // Summary
    const total = rootCount + htmlCount + mdBuilt;
    console.log(`\n✓ Build complete: ${total} pages in dist/`);
    console.log(`  Root: ${rootCount} | Cluster HTML: ${htmlCount} | Markdown: ${mdBuilt}${mdSkipped ? ` (${mdSkipped} skipped — HTML source exists)` : ''}`);
    console.log(`  Output: ${CONFIG.distDir}`);
}

// Run build
build();
