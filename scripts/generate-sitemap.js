#!/usr/bin/env node

/**
 * Sitemap Generator for creatineresearch.co
 *
 * Scans HTML files and generates sitemap.xml with:
 * - Priority scoring based on content type
 * - lastmod dates from file modification times
 * - changefreq settings based on content category
 *
 * Usage:
 *   node scripts/generate-sitemap.js
 *
 * Can be run on build or via cron:
 *   0 0 * * * cd /path/to/creatine-research && node scripts/generate-sitemap.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: 'https://creatineresearch.co',
  contentDir: path.resolve(__dirname, '..'),
  outputFile: path.resolve(__dirname, '..', 'sitemap.xml'),
  indexFile: path.resolve(__dirname, '..', 'sitemap-index.xml'),

  // Directories to exclude from sitemap
  excludeDirs: [
    'node_modules',
    'components',
    'templates',
    'dist',
    'scripts',
    '.git'
  ],

  // Files to exclude
  excludeFiles: [],

  // Priority and changefreq mappings
  priorities: {
    'index.html': { priority: 1.0, changefreq: 'weekly' },
    'articles.html': { priority: 0.9, changefreq: 'weekly' },
    'science': { priority: 0.8, changefreq: 'monthly' },
    'dosing': { priority: 0.8, changefreq: 'monthly' },
    'sports': { priority: 0.7, changefreq: 'monthly' },
    'safety': { priority: 0.8, changefreq: 'monthly' },
    'comparisons': { priority: 0.7, changefreq: 'monthly' },
    'quality': { priority: 0.7, changefreq: 'monthly' },
    'default': { priority: 0.5, changefreq: 'monthly' }
  }
};

/**
 * Get all HTML files recursively from a directory
 */
function getHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip excluded directories
      if (!CONFIG.excludeDirs.includes(file)) {
        getHtmlFiles(filePath, fileList);
      }
    } else if (file.endsWith('.html') && !CONFIG.excludeFiles.includes(file)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Get priority and changefreq for a file based on its path
 */
function getPriorityConfig(filePath) {
  const relativePath = path.relative(CONFIG.contentDir, filePath);
  const fileName = path.basename(filePath);

  // Check for exact file matches first
  if (CONFIG.priorities[fileName]) {
    return CONFIG.priorities[fileName];
  }

  // Check for directory-based priority
  for (const [key, value] of Object.entries(CONFIG.priorities)) {
    if (relativePath.includes(key + '/') || relativePath.startsWith(key)) {
      return value;
    }
  }

  return CONFIG.priorities.default;
}

/**
 * Convert file path to URL
 */
function filePathToUrl(filePath) {
  let relativePath = path.relative(CONFIG.contentDir, filePath);

  // Handle dist folder files - they go to root
  if (relativePath.startsWith('dist/')) {
    relativePath = relativePath.replace('dist/', '');
  }

  // Remove .html extension for clean URLs
  let url = relativePath.replace('.html', '');

  // Handle index.html -> /
  if (url === 'index') {
    url = '';
  }

  return `${CONFIG.baseUrl}/${url}`.replace(/\/$/, '/');
}

/**
 * Get file modification date in YYYY-MM-DD format
 */
function getLastMod(filePath) {
  const stat = fs.statSync(filePath);
  const date = stat.mtime;
  return date.toISOString().split('T')[0];
}

/**
 * Generate XML for a single URL entry
 */
function generateUrlEntry(filePath) {
  const url = filePathToUrl(filePath);
  const lastmod = getLastMod(filePath);
  const { priority, changefreq } = getPriorityConfig(filePath);

  return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
}

/**
 * Generate the complete sitemap.xml
 */
function generateSitemap() {
  console.log('Scanning for HTML files...');

  const htmlFiles = getHtmlFiles(CONFIG.contentDir);

  // Also include dist files for built pages
  const distDir = path.join(CONFIG.contentDir, 'dist');
  if (fs.existsSync(distDir)) {
    const distFiles = fs.readdirSync(distDir)
      .filter(f => f.endsWith('.html'))
      .map(f => path.join(distDir, f));

    // Add dist files, avoiding duplicates
    distFiles.forEach(distFile => {
      const baseName = path.basename(distFile);
      const hasSourceVersion = htmlFiles.some(f => path.basename(f) === baseName);

      // For dist files, always prefer them over source versions
      if (hasSourceVersion) {
        const sourceIndex = htmlFiles.findIndex(f => path.basename(f) === baseName);
        if (sourceIndex > -1) {
          htmlFiles.splice(sourceIndex, 1);
        }
      }
      htmlFiles.push(distFile);
    });
  }

  console.log(`Found ${htmlFiles.length} HTML files`);

  // Sort files for consistent output
  htmlFiles.sort((a, b) => {
    const priorityA = getPriorityConfig(a).priority;
    const priorityB = getPriorityConfig(b).priority;
    if (priorityA !== priorityB) {
      return priorityB - priorityA; // Higher priority first
    }
    return a.localeCompare(b);
  });

  // Generate sitemap XML
  const urlEntries = htmlFiles.map(generateUrlEntry).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  // Write sitemap
  fs.writeFileSync(CONFIG.outputFile, sitemap);
  console.log(`Generated: ${CONFIG.outputFile}`);

  // Update sitemap index with current date
  const today = new Date().toISOString().split('T')[0];
  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${CONFIG.baseUrl}/sitemap.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <!--
    Ready for expansion. Add additional sitemaps as needed:

    <sitemap>
      <loc>${CONFIG.baseUrl}/sitemap-blog.xml</loc>
      <lastmod>${today}</lastmod>
    </sitemap>

    <sitemap>
      <loc>${CONFIG.baseUrl}/sitemap-resources.xml</loc>
      <lastmod>${today}</lastmod>
    </sitemap>
  -->
</sitemapindex>`;

  fs.writeFileSync(CONFIG.indexFile, sitemapIndex);
  console.log(`Generated: ${CONFIG.indexFile}`);

  // Print summary
  console.log('\nSitemap Summary:');
  console.log('================');

  const byCat = {};
  htmlFiles.forEach(f => {
    const config = getPriorityConfig(f);
    const cat = `Priority ${config.priority.toFixed(1)}`;
    byCat[cat] = (byCat[cat] || 0) + 1;
  });

  Object.entries(byCat).sort().forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} pages`);
  });

  console.log(`\nTotal: ${htmlFiles.length} URLs`);
}

// Run the generator
generateSitemap();
