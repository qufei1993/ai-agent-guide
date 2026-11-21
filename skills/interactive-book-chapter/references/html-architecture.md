# HTML Chapter Architecture Reference

## `site.js` DOM Contract

`../shared/site.js` automatically injects global navigation, the chapter switcher drawer, the `中 / EN` toggle, the footer prev/next pager, and the right-side `.floating-toc`. Every chapter HTML must preserve these hooks:

| Selector / Attribute | Purpose |
|---|---|
| `<html lang="zh-CN">` or `<html lang="en">` | Sets language-specific line-height and `details.code-fold` labels |
| `.topbar-inner > .brand` | Replaced by `site.js` with Home link + `#chapterSwitcherBtn` |
| `.topbar-nav a[href^="#"]` | Extracted into `.floating-toc` (`>= 1440px`) and removed from topbar |
| `#themeToggle`, `#themeIcon`, `#themeText` | Wrapped into `.nav-right-group` alongside `#langSwitchBtn` |
| `<footer>` | Receives `.pager-grid` prev/next chapter cards |
| Filename `<slug>.html` | Must match `slug` in `../chapters.json` |

## Ready-to-Use Classes in `tokens.css`

Do not redeclare these in chapter `<style>` blocks:

- **Layout**: `.topbar`, `.topbar-inner`, `.progress-track`, `.progress-fill`, `.hero`, `.hero-meta`, `.hero-pill`, `.hero-lead`, `.prose`, `.lab-wrap`, `footer` (all unified at `--page-width: 980px`)
- **Lab shell & controls**: `.lab-card`, `.lab-card.is-pulsing`, `.lab-header`, `.lab-eyebrow`, `.lab-title`, `.lab-desc`, `.lab-body`, `.lab-toolbar`, `.toolbar-group`, `.toolbar-label`, `.split-2`, `.pane-box`, `.pane-head`, `.raw-stream`, `.btn`, `.btn-primary`, `.chip-btn` (`.active`, `.teal-active`, `.danger-active`), `.pick-options` (`.pick-card`, `.pick-kicker`, `.pick-title`, `.pick-sub`)
- **Interactive prose hooks**: `.inline-trigger`, `.predict-hook`, `.predict-q`, `.predict-badge`, `.predict-opts`, `.predict-opt` (`.is-right`, `.is-wrong`), `.predict-feedback` (`.show`), `.predict-verify`
- **v2 Reading & Provenance primitives**: `.tldr` (`.tldr-card`, `.tldr-list`, `.tldr-item`, `.tldr-go`), `p.key` (kept visible in `site.js` "Labs only" mode), `.diagram-figure`, `.outcome` (`.bad`, `.meh`, `.good`, `.outcome-title`), `.src-tag`, `.sim-tag`, `.bar-real`, `.bar-sim`, `.sim-zone[data-sim-label]`
- **Code blocks**: `.code-card`, `.code-header`, `.copy-btn`, `details.code-fold`, `.code-fold-body`
- **Theme tokens**: `--bg`, `--bg-elevated`, `--bg-muted`, `--bg-code`, `--text`, `--text-secondary`, `--text-muted`, `--border`, `--border-strong`, `--accent`, `--accent-soft`, `--blue`, `--blue-soft`, `--teal`, `--teal-soft`, `--purple`, `--purple-soft`, `--rose`, `--rose-soft`, `--green`, `--green-soft`

## Inline SVG Craft Guidelines

- Prefer showing **input → transformation → failure/success contrast** (e.g., dashed noise vs solid signal, branching paths with distinct stroke colors) instead of flat homogeneous boxes.
- Keep node text to a maximum of 2 short lines (title + 1 crisp keyword); never dump sentences inside SVG rects.
- Always use `var(--...)` tokens for fills, strokes, and text so light/dark themes work seamlessly without hardcoded `#fff` / `#000` backgrounds.

## Minimal Page Skeleton

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Chapter Title — Book Title</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css" />
  <link rel="stylesheet" href="../shared/tokens.css" />
  <style>
    /* Only chapter-specific layout/component CSS here */
  </style>
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="./index.html">
        <span>Book Title</span>
        <span class="brand-badge">Interactive</span>
      </a>
      <nav class="topbar-nav">
        <a href="#section-1">Section 1</a>
        <a href="#lab-1">Lab 01</a>
        <a href="#decision">Decision Matrix</a>
      </nav>
      <button class="theme-btn" id="themeToggle" type="button">
        <span id="themeIcon">☀</span>
        <span id="themeText">浅色</span>
      </button>
    </div>
    <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>
  </header>

  <section class="hero">...</section>
  <section class="tldr">...</section>
  <main class="prose">...</main>
  <section class="lab-wrap" id="lab-1">
    <div class="lab-card">
      <div class="lab-header">...</div>
      <div class="lab-body">...</div>
    </div>
  </section>
  <footer>...</footer>

  <script>
    // Insert Standard Boilerplate + Chapter Lab Logic here
  </script>
  <script src="../shared/site.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-typescript.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-json.min.js"></script>
</body>
</html>
```

## Standard JS Boilerplate (Auto-Handled by `site.js`)

`../shared/site.js` now automatically handles:
- `#themeToggle` light/dark switching and `localStorage` persistence
- `#progressFill` scroll progress bar
- `.copy-btn` delegated click-to-copy (`已复制 ✓` / `Copied ✓`)
- Prism highlighting via `window.bookHighlightCode(root?)` (auto-runs on `load`; call after updating a dynamic code block)
- `#decisionGrid` filtering via `[data-filter]` buttons against `[data-tags]`
- `window.bookJumpToLab(labId)` smooth scroll + `.lab-card.is-pulsing`

Chapter `<script>` blocks only need to implement their own interactive labs and `.predict-hook` handlers.
