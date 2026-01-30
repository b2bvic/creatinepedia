#!/usr/bin/env node

/**
 * Inject FAQ sections into all cluster articles.
 *
 * Strategy: Extract H2 headings + first paragraph after each H2.
 * Convert top 5 into Q&A format. Inject FAQ HTML before </article>.
 * Also injects FAQPage JSON-LD schema into <head>.
 *
 * Run: node scripts/inject-faqs.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

const HTML_SOURCE_DIRS = [
    'science',
    'dosing',
    'sports',
    'safety',
    'comparisons',
    'quality'
];


function stripTags(html) {
    return html.replace(/<[^>]+>/g, '').trim();
}

function escapeJsonString(str) {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}

function extractH2Sections(articleHtml) {
    const sections = [];
    // Match H2 headings and capture everything until the next H2 or end
    const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2|<\/article>|<section class="references|<div class="cta-box|$)/gi;
    let match;

    while ((match = h2Regex.exec(articleHtml)) !== null) {
        const heading = stripTags(match[1]).trim();
        const content = match[2];

        // Skip references/bibliography sections
        if (/references|bibliography|sources|citations/i.test(heading)) continue;
        // Skip FAQ sections that already exist
        if (/frequently asked|faq/i.test(heading)) continue;

        // Extract first paragraph
        const pMatch = content.match(/<p[^>]*>([\s\S]*?)<\/p>/);
        if (pMatch) {
            const answer = stripTags(pMatch[1]).trim();
            if (answer.length > 30) {
                sections.push({ heading, answer });
            }
        }
    }

    return sections;
}

function headingToQuestion(heading, category) {
    const h = heading.toLowerCase().trim();

    // If it's already a question, keep it
    if (h.endsWith('?')) return heading;

    // Clean common heading patterns
    let cleaned = heading
        .replace(/^(the|an?)\s+/i, '')
        .replace(/\s*[:–—]\s*.*$/, ''); // Remove subtitle after colon/em-dash

    const lc = cleaned.toLowerCase();

    // Already starts like a question word — just add ?
    if (/^(how|what|why|when|where|which|does|is|can|should|do)\s/i.test(h)) {
        return heading + '?';
    }

    // Pattern: contains "vs" or "versus" → comparison question
    if (/\bvs\.?\b|versus|compared/i.test(h)) {
        return `How does ${lc} compare?`;
    }

    // Pattern: contains action verbs → "How" question
    if (/\b(effect|impact|influence|affect|interact|deplet|resynthes|recover|adapt|respond|contribut|work)\b/i.test(h)) {
        return `How does ${lc} work?`;
    }

    // Pattern: plural nouns or lists → "What are" question
    if (/\b(benefits|advantages|risks|dangers|side effects|concerns|differences|types|forms|factors|contributions|strategies|recommendations|guidelines|considerations)\b/i.test(h)) {
        return `What are the ${lc}?`;
    }

    // Pattern: contains "and" connecting topics → "What is the relationship between"
    if (/\band\b/i.test(h) && !(/dosing|dose|protocol/i.test(h))) {
        return `What is the relationship between ${lc}?`;
    }

    // Pattern: dosing/protocol headings → "What is the recommended"
    if (/dosing|dose|protocol|timing|loading|cycle|schedul/i.test(h)) {
        return `What is the recommended ${lc}?`;
    }

    // Pattern: safety/concern headings → "Is ... safe?"
    if (/safe|kidney|liver|hair|blood|heart|health/i.test(h)) {
        return `Is ${lc} safe?`;
    }

    // Default: "What is the [heading]?" — works for noun phrase headings
    return `What is the ${lc}?`;
}

function buildFaqHtml(qaPairs) {
    const items = qaPairs.map(qa => `
        <div class="faq-item">
          <h3>${qa.question}</h3>
          <p>${qa.answer}</p>
        </div>`).join('');

    return `
      <section class="faq-section">
        <h2>Frequently Asked Questions</h2>
        ${items}
      </section>`;
}

function buildFaqSchema(qaPairs, url) {
    const mainEntity = qaPairs.map(qa => ({
        "@type": "Question",
        "name": qa.question,
        "acceptedAnswer": {
            "@type": "Answer",
            "text": qa.answer
        }
    }));

    return JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": mainEntity
    }, null, 2);
}

function stripExistingFaq(html) {
    // Remove existing FAQ HTML section
    let cleaned = html.replace(/\s*<section class="faq-section">[\s\S]*?<\/section>/g, '');
    // Remove existing FAQPage schema
    cleaned = cleaned.replace(/\s*<script type="application\/ld\+json">\s*\{[\s\S]*?"@type":\s*"FAQPage"[\s\S]*?\}\s*<\/script>\n?/g, '');
    return cleaned;
}

function injectFaq(html, category, slug) {
    // Strip any existing FAQ content first (allows re-run)
    html = stripExistingFaq(html);

    // Extract article content to find H2 sections
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/);
    if (!articleMatch) return { html, injected: false };

    const articleContent = articleMatch[1];
    const sections = extractH2Sections(articleContent);

    if (sections.length < 3) return { html, injected: false };

    // Take top 5 sections (or fewer)
    const topSections = sections.slice(0, 5);
    const qaPairs = topSections.map(s => ({
        question: headingToQuestion(s.heading, category),
        answer: s.answer
    }));

    // Build FAQ HTML
    const faqHtml = buildFaqHtml(qaPairs);

    // Build FAQ schema
    const url = `https://creatinepedia.com/${category}/${slug}`;
    const faqSchema = buildFaqSchema(qaPairs, url);

    // Inject FAQ HTML before </article>
    let newHtml = html.replace(
        '</article>',
        `${faqHtml}\n      </article>`
    );

    // Inject FAQ schema after last existing schema block
    const schemaInsertPoint = newHtml.lastIndexOf('</script>\n${');
    // Simpler: inject before </head>
    const faqSchemaTag = `  <script type="application/ld+json">\n  ${faqSchema}\n  </script>\n`;
    newHtml = newHtml.replace('</head>', `${faqSchemaTag}</head>`);

    return { html: newHtml, injected: true };
}

function run() {
    console.log('Injecting FAQ sections into articles...\n');
    let total = 0;
    let skipped = 0;
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
            const slug = file.replace('.html', '');

            try {
                const { html: newHtml, injected } = injectFaq(html, dir, slug);
                if (injected) {
                    fs.writeFileSync(filePath, newHtml);
                    count++;
                } else {
                    skipped++;
                }
            } catch (e) {
                errors.push(`${dir}/${file}: ${e.message}`);
            }
        }

        console.log(`  ${dir}/: ${count} injected, ${files.length - count} skipped`);
        total += count;
    }

    if (errors.length > 0) {
        console.log(`\nErrors (${errors.length}):`);
        errors.forEach(e => console.log(`  ${e}`));
    }

    console.log(`\n✓ Injected FAQs into ${total} articles (${skipped} skipped — already had FAQ or too few sections)`);
}

run();
