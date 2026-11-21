import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.resolve(__dirname, "../docs");
const chaptersPath = path.join(docsDir, "chapters.json");
const data = JSON.parse(fs.readFileSync(chaptersPath, "utf8"));

const baseUrl = (data.siteUrl || "https://qufei1993.github.io/ai-agent-fullstack-roadmap").replace(/\/+$/, "");
const today = new Date().toISOString().slice(0, 10);

function escapeAttr(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildSeoBlock(ch, lang) {
  const isEn = lang === "en";
  const headline = isEn && ch.titleEn ? ch.titleEn : ch.title;
  const desc = isEn && ch.summaryEn ? ch.summaryEn : ch.summary;
  const bookName = isEn && data.titleEn ? data.titleEn : data.title;
  const pageUrl = `${baseUrl}/${lang}/${ch.slug}.html`;
  const hasZh = ch.langs.includes("zh");
  const hasEn = ch.langs.includes("en");
  const defaultUrl = hasEn ? `${baseUrl}/en/${ch.slug}.html` : `${baseUrl}/zh/${ch.slug}.html`;

  const altTags = [];
  if (hasZh) altTags.push(`  <link rel="alternate" hreflang="zh-CN" href="${baseUrl}/zh/${ch.slug}.html" />`);
  if (hasEn) altTags.push(`  <link rel="alternate" hreflang="en" href="${baseUrl}/en/${ch.slug}.html" />`);
  altTags.push(`  <link rel="alternate" hreflang="x-default" href="${defaultUrl}" />`);

  const ogAlt =
    hasZh && hasEn
      ? `\n  <meta property="og:locale:alternate" content="${isEn ? "zh_CN" : "en_US"}" />`
      : "";

  const jsonLd = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline,
      description: desc,
      inLanguage: isEn ? "en" : "zh-CN",
      url: pageUrl,
      isPartOf: {
        "@type": "Book",
        name: bookName,
      },
    },
    null,
    2
  )
    .split("\n")
    .map((line) => "  " + line)
    .join("\n");

  return [
    "  <!-- SEO:START (auto-synced by scripts/generate-seo.mjs) -->",
    `  <meta name="description" content="${escapeAttr(desc)}" />`,
    `  <link rel="canonical" href="${pageUrl}" />`,
    ...altTags,
    `  <meta property="og:type" content="article" />`,
    `  <meta property="og:locale" content="${isEn ? "en_US" : "zh_CN"}" />${ogAlt}`,
    `  <meta property="og:title" content="${escapeAttr(headline)}" />`,
    `  <meta property="og:description" content="${escapeAttr(desc)}" />`,
    `  <meta property="og:url" content="${pageUrl}" />`,
    `  <script type="application/ld+json">`,
    jsonLd,
    `  </script>`,
    "  <!-- SEO:END -->",
  ].join("\n");
}

function syncChapterHtmlSeo(filePath, seoBlock) {
  let html = fs.readFileSync(filePath, "utf8");

  // 1. Replace existing auto-synced block if present
  if (/<!-- SEO:START[\s\S]*?<!-- SEO:END -->/.test(html)) {
    html = html.replace(/[ \t]*<!-- SEO:START[\s\S]*?<!-- SEO:END -->/, seoBlock);
    fs.writeFileSync(filePath, html, "utf8");
    return;
  }

  // 2. Strip any manual SEO tags inside <head> to avoid duplicates
  const headMatch = html.match(/<head>[\s\S]*?<\/head>/);
  if (!headMatch) return;
  let head = headMatch[0];
  head = head
    .replace(/\n?[ \t]*<meta\s+name="description"[^>]*>/g, "")
    .replace(/\n?[ \t]*<link\s+rel="canonical"[^>]*>/g, "")
    .replace(/\n?[ \t]*<link\s+rel="alternate"\s+hreflang="[^"]*"[^>]*>/g, "")
    .replace(/\n?[ \t]*<meta\s+property="og:[^"]*"[^>]*>/g, "")
    .replace(/\n?[ \t]*<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/g, "");

  // 3. Insert right after </title>
  head = head.replace(/(<\/title>)/, `$1\n${seoBlock}`);
  html = html.replace(/<head>[\s\S]*?<\/head>/, head);
  fs.writeFileSync(filePath, html, "utf8");
}

const urlEntries = [];
let syncedPages = 0;

function addUrlEntry(loc, alternates, priority = "0.8") {
  const altLinks = alternates
    .map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}" />`)
    .join("\n");
  urlEntries.push(
    `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${priority}</priority>\n${altLinks}\n  </url>`
  );
}

// Language homepages
const homeAlts = [
  { hreflang: "zh-CN", href: `${baseUrl}/zh/index.html` },
  { hreflang: "en", href: `${baseUrl}/en/index.html` },
  { hreflang: "x-default", href: `${baseUrl}/en/index.html` },
];
for (const lang of ["zh", "en"]) {
  const isEn = lang === "en";
  const pageUrl = `${baseUrl}/${lang}/index.html`;
  const title = isEn ? data.titleEn || data.title : data.title;
  const desc = isEn ? data.subtitleEn || data.subtitle : data.subtitle;
  const homeJsonLd = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: title,
      description: desc,
      inLanguage: isEn ? "en" : "zh-CN",
      url: pageUrl,
    },
    null,
    2
  )
    .split("\n")
    .map((line) => "  " + line)
    .join("\n");
  const homeSeoBlock = [
    "  <!-- SEO:START (auto-synced by scripts/generate-seo.mjs) -->",
    `  <meta name="description" content="${escapeAttr(desc)}" />`,
    `  <link rel="canonical" href="${pageUrl}" />`,
    `  <link rel="alternate" hreflang="zh-CN" href="${baseUrl}/zh/index.html" />`,
    `  <link rel="alternate" hreflang="en" href="${baseUrl}/en/index.html" />`,
    `  <link rel="alternate" hreflang="x-default" href="${baseUrl}/en/index.html" />`,
    `  <meta property="og:type" content="website" />`,
    `  <meta property="og:locale" content="${isEn ? "en_US" : "zh_CN"}" />`,
    `  <meta property="og:locale:alternate" content="${isEn ? "zh_CN" : "en_US"}" />`,
    `  <meta property="og:title" content="${escapeAttr(title)}" />`,
    `  <meta property="og:description" content="${escapeAttr(desc)}" />`,
    `  <meta property="og:url" content="${pageUrl}" />`,
    `  <script type="application/ld+json">`,
    homeJsonLd,
    `  </script>`,
    "  <!-- SEO:END -->",
  ].join("\n");
  const idxPath = path.join(docsDir, lang, "index.html");
  if (fs.existsSync(idxPath)) {
    syncChapterHtmlSeo(idxPath, homeSeoBlock);
    syncedPages++;
  }
}
addUrlEntry(`${baseUrl}/zh/index.html`, homeAlts, "1.0");
addUrlEntry(`${baseUrl}/en/index.html`, homeAlts, "1.0");

// Ready chapters
for (const part of data.parts) {
  for (const ch of part.chapters) {
    if (ch.status !== "ready" || !Array.isArray(ch.langs) || ch.langs.length === 0) continue;
    const alternates = [];
    if (ch.langs.includes("zh")) {
      alternates.push({ hreflang: "zh-CN", href: `${baseUrl}/zh/${ch.slug}.html` });
    }
    if (ch.langs.includes("en")) {
      alternates.push({ hreflang: "en", href: `${baseUrl}/en/${ch.slug}.html` });
    }
    const defaultHref = ch.langs.includes("en")
      ? `${baseUrl}/en/${ch.slug}.html`
      : `${baseUrl}/zh/${ch.slug}.html`;
    alternates.push({ hreflang: "x-default", href: defaultHref });

    for (const lang of ch.langs) {
      const filePath = path.join(docsDir, lang, `${ch.slug}.html`);
      if (fs.existsSync(filePath)) {
        syncChapterHtmlSeo(filePath, buildSeoBlock(ch, lang));
        syncedPages++;
      }
      addUrlEntry(`${baseUrl}/${lang}/${ch.slug}.html`, alternates, "0.9");
    }
  }
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.join("\n")}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;

fs.writeFileSync(path.join(docsDir, "sitemap.xml"), sitemap, "utf8");
fs.writeFileSync(path.join(docsDir, "robots.txt"), robots, "utf8");

console.log(`Synced SEO tags into ${syncedPages} chapter pages; generated docs/sitemap.xml (${urlEntries.length} URLs) and docs/robots.txt.`);
