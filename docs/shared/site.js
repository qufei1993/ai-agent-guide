(function () {
  // 0. Baidu Tongji analytics (production only, skip localhost / local files)
  if (
    window.location.protocol.startsWith("http") &&
    !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)
  ) {
    window._hmt = window._hmt || [];
    const hm = document.createElement("script");
    hm.src = "https://hm.baidu.com/hm.js?c1470fb3535d138fd875f09ec4c16a8a";
    hm.async = true;
    const firstScript = document.getElementsByTagName("script")[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(hm, firstScript);
    } else {
      document.head.appendChild(hm);
    }
  }

  const isEn =
    window.location.pathname.includes("/en/") ||
    (document.documentElement.lang || "").toLowerCase().startsWith("en");
  const lang = isEn ? "en" : "zh";
  const otherLang = isEn ? "zh" : "en";

  const ui = isEn
    ? {
        light: "Light",
        dark: "Dark",
        tocTitle: "On this page",
        allChapters: "All Chapters",
        switchTip: "Switch chapter",
        drawerTitle: "Book Contents",
        backHome: "← Back to Book Home",
        curBadge: "Reading",
        readyBadge: "Interactive",
        soonBadge: "Upcoming",
        prevLabel: "← Previous",
        nextLabel: "Next →",
        plannedSuffix: " (Upcoming)",
        langSwitchLabel: "中",
        langSwitchTitle: "切换到中文版",
        langUnavailable: "中文版暂未上线",
        modeFull: "Full",
        modeLabs: "Labs only",
        modeTitle: "Labs only: hide long prose, keep key sentences, diagrams and labs",
      }
    : {
        light: "浅色",
        dark: "深色",
        tocTitle: "本页内容",
        allChapters: "全书目录",
        switchTip: "切换其他章节",
        drawerTitle: "全书章节目录",
        backHome: "← 返回小册首页",
        curBadge: "当前阅读",
        readyBadge: "可交互",
        soonBadge: "即将上线",
        prevLabel: "← 上一章",
        nextLabel: "下一章 →",
        plannedSuffix: "（即将上线）",
        langSwitchLabel: "EN",
        langSwitchTitle: "Switch to English",
        langUnavailable: "English version coming soon",
        modeFull: "完整",
        modeLabs: "只看实验",
        modeTitle: "只看实验：折叠长段落，只保留关键句、图和实验台",
      };

  // 1. Sync saved theme from localStorage immediately
  const savedTheme = localStorage.getItem("book-theme");
  const syncThemeText = (themeVal) => {
    const icon = document.getElementById("themeIcon");
    const text = document.getElementById("themeText");
    if (icon) icon.textContent = themeVal === "dark" ? "☾" : "☀";
    if (text) text.textContent = themeVal === "dark" ? ui.dark : ui.light;
  };
  if (savedTheme === "dark" || savedTheme === "light") {
    document.documentElement.setAttribute("data-theme", savedTheme);
    syncThemeText(savedTheme);
  } else {
    syncThemeText(document.documentElement.getAttribute("data-theme") || "light");
  }

  const themeBtn = document.getElementById("themeToggle");
  if (themeBtn && !themeBtn.dataset.siteThemeBound) {
    themeBtn.dataset.siteThemeBound = "1";
    themeBtn.addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("book-theme", next);
      syncThemeText(next);
    });
  }

  // 1.5 Reading progress bar
  const progressFill = document.getElementById("progressFill");
  if (progressFill) {
    const updateProgress = () => {
      const h = document.documentElement;
      const pct = (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) * 100;
      progressFill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
  }

  // 1.6 Delegated code copy buttons
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest && e.target.closest(".copy-btn");
    if (!btn) return;
    const code = btn.closest(".code-card")?.querySelector("code")?.innerText || "";
    if (!code) return;
    const old = btn.textContent;
    try {
      await navigator.clipboard.writeText(code);
      btn.textContent = isEn ? "Copied ✓" : "已复制 ✓";
    } catch {
      btn.textContent = isEn ? "Failed" : "复制失败";
    }
    setTimeout(() => (btn.textContent = old), 1400);
  });

  // 1.7 Shared Prism highlighter
  window.bookHighlightCode = function (root) {
    if (!window.Prism) return;
    const scope = root || document;
    scope.querySelectorAll(".code-card pre code").forEach((el) => {
      const cls = Array.from(el.classList).find((c) => c.startsWith("language-")) || "language-typescript";
      const langName = cls.replace("language-", "");
      const grammar = Prism.languages[langName] || Prism.languages.typescript;
      if (!grammar) return;
      el.classList.add(cls);
      const lineSpans = el.querySelectorAll(".code-line");
      if (lineSpans.length > 0) {
        lineSpans.forEach((line) => {
          line.innerHTML = Prism.highlight(line.textContent, grammar, langName);
        });
      } else {
        el.innerHTML = Prism.highlight(el.textContent, grammar, langName);
      }
    });
  };
  window.addEventListener("load", () => window.bookHighlightCode());

  // 1.8 Shared decision matrix filter
  const decisionGrid = document.getElementById("decisionGrid");
  if (decisionGrid) {
    document.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = btn.dataset.filter;
        document.querySelectorAll("[data-filter]").forEach((b) => b.classList.toggle("active", b === btn));
        decisionGrid.querySelectorAll(".decision-card").forEach((card) => {
          const tags = (card.dataset.tags || "").split(/\s+/).filter(Boolean);
          if (filter === "all") {
            card.classList.remove("is-match", "is-dim");
          } else if (tags.includes(filter)) {
            card.classList.add("is-match");
            card.classList.remove("is-dim");
          } else {
            card.classList.remove("is-match");
            card.classList.add("is-dim");
          }
        });
      });
    });
  }

  // 2. Inject shared navigation CSS
  const style = document.createElement("style");
  style.textContent = `
    .nav-left-group {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .nav-right-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .nav-home-link {
      font-size: 14px;
      font-weight: 700;
      color: var(--text);
      text-decoration: none;
      white-space: nowrap;
    }
    .nav-home-link:hover { color: var(--teal); }
    .nav-sep {
      color: var(--text-muted);
      font-size: 13px;
      user-select: none;
    }
    .chapter-switcher-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--border);
      background: var(--bg-elevated);
      color: var(--text);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      max-width: 440px;
      transition: border-color 0.15s, background 0.15s;
      font-family: var(--font-sans);
    }
    .chapter-switcher-btn:hover { border-color: var(--teal); }
    .chapter-switcher-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .lang-btn {
      border: 1px solid var(--border);
      background: var(--bg-elevated);
      color: var(--text-secondary);
      border-radius: 999px;
      padding: 5px 11px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: border-color 0.15s, color 0.15s;
      font-family: var(--font-sans);
    }
    .lang-btn:hover:not(:disabled) {
      border-color: var(--teal);
      color: var(--teal);
    }
    .lang-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .github-btn {
      border: 1px solid var(--border);
      background: var(--bg-elevated);
      color: var(--text-secondary);
      border-radius: 999px;
      width: 32px;
      height: 30px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      transition: border-color 0.15s, color 0.15s;
      flex-shrink: 0;
    }
    .github-btn:hover {
      border-color: var(--border-strong);
      color: var(--text);
    }
    /* Floating right-side TOC for wide screens only */
    .floating-toc {
      position: fixed;
      top: 96px;
      left: calc(50% + (var(--page-width, 980px) / 2) + 28px);
      width: 190px;
      font-size: 12.5px;
      line-height: 1.45;
      z-index: 30;
      display: none;
    }
    @media (min-width: 1440px) {
      .floating-toc { display: block; }
    }
    .floating-toc-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 10px;
      padding-left: 10px;
    }
    .floating-toc-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      border-left: 1px solid var(--border);
    }
    .floating-toc a {
      display: block;
      padding: 3px 0 3px 10px;
      margin-left: -1px;
      border-left: 2px solid transparent;
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.15s, border-color 0.15s;
    }
    .floating-toc a:hover { color: var(--text); }
    .floating-toc a.active {
      color: var(--teal);
      border-left-color: var(--teal);
      font-weight: 600;
    }
    .chapter-popover-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.25);
      backdrop-filter: blur(2px);
      z-index: 90;
      display: none;
    }
    .chapter-popover-backdrop.open { display: block; }
    .chapter-popover {
      position: fixed;
      top: 58px;
      left: 50%;
      transform: translateX(-50%);
      width: min(720px, calc(100vw - 32px));
      max-height: calc(100vh - 96px);
      overflow-y: auto;
      background: var(--bg-elevated);
      border: 1px solid var(--border-strong);
      border-radius: 14px;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.22);
      z-index: 100;
      padding: 18px 20px;
      display: none;
    }
    .chapter-popover.open { display: block; }
    .pop-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 12px;
      margin-bottom: 14px;
      border-bottom: 1px solid var(--border);
    }
    .pop-title { font-size: 15px; font-weight: 700; }
    .pop-home {
      font-size: 13px;
      text-decoration: none;
      color: var(--teal);
      font-weight: 600;
    }
    .pop-part { margin-bottom: 16px; }
    .pop-part:last-child { margin-bottom: 0; }
    .pop-part-title {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.04em;
      margin-bottom: 8px;
    }
    .pop-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .pop-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 9px 12px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--bg);
      text-decoration: none;
      color: var(--text);
      transition: border-color 0.15s, background 0.15s;
    }
    a.pop-item:hover {
      border-color: var(--teal);
      background: var(--teal-soft);
    }
    .pop-item.is-current {
      border-color: var(--teal);
      background: var(--teal-soft);
    }
    .pop-item.is-planned {
      opacity: 0.6;
      cursor: default;
    }
    .pop-item-title { font-size: 13.5px; font-weight: 650; }
    .pop-item-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .pop-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .pop-badge-ready { background: var(--teal-soft); color: var(--teal); border: 1px solid color-mix(in srgb, var(--teal) 35%, transparent); }
    .pop-badge-cur { background: var(--teal); color: #fff; }
    .pop-badge-plan { background: var(--bg-muted); color: var(--text-muted); }

    /* Footer Prev / Next cards */
    .pager-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-top: 22px;
    }
    .pager-card {
      padding: 16px 18px;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background: var(--bg-elevated);
      text-decoration: none;
      color: var(--text);
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: border-color 0.15s, transform 0.15s;
    }
    a.pager-card:hover {
      border-color: var(--teal);
      transform: translateY(-1px);
    }
    .pager-card.is-planned {
      opacity: 0.6;
      cursor: default;
    }
    .pager-card.align-right { text-align: right; }
    .pager-kicker {
      font-size: 12px;
      font-weight: 700;
      color: var(--teal);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .pager-card.is-planned .pager-kicker { color: var(--text-muted); }
    .pager-title { font-size: 15px; font-weight: 700; }
    @media (max-width: 720px) {
      .pager-grid { grid-template-columns: 1fr; }
      .pager-card.align-right { text-align: left; }
      .chapter-switcher-btn { max-width: 170px; }
    }
  `;
  document.head.appendChild(style);

  // 2.5 Move in-page .topbar-nav out of topbar into a wide-screen floating TOC
  const topbarNav = document.querySelector(".topbar-nav");
  if (topbarNav) {
    const links = Array.from(topbarNav.querySelectorAll("a")).map((a) => ({
      href: a.getAttribute("href"),
      text: a.textContent.trim(),
    }));
    topbarNav.remove();

    if (links.length > 0) {
      const toc = document.createElement("aside");
      toc.className = "floating-toc";
      toc.setAttribute("aria-label", ui.tocTitle);
      toc.innerHTML = `
        <div class="floating-toc-title">${ui.tocTitle}</div>
        <div class="floating-toc-list">
          ${links.map((l, idx) => `<a href="${l.href}" class="${idx === 0 ? "active" : ""}">${l.text}</a>`).join("")}
        </div>
      `;
      document.body.appendChild(toc);

      const tocLinks = Array.from(toc.querySelectorAll("a"));
      const targets = links.map((l) => document.querySelector(l.href)).filter(Boolean);

      const updateActiveToc = () => {
        const scrollY = window.scrollY + 140;
        let activeIdx = 0;
        targets.forEach((el, idx) => {
          if (el.offsetTop <= scrollY) activeIdx = idx;
        });
        tocLinks.forEach((a, idx) => a.classList.toggle("active", idx === activeIdx));
      };
      window.addEventListener("scroll", updateActiveToc, { passive: true });
      updateActiveToc();
    }
  }

  // 2.6 Reading mode: "full" vs "labs only" (persisted across chapters)
  function applyMode(mode) {
    document.body.classList.toggle("mode-labs", mode === "labs");
    document.querySelectorAll(".read-mode-switch button").forEach((b) => {
      b.classList.toggle("active", b.dataset.mode === mode);
    });
  }
  function buildModeSwitch() {
    if (!document.querySelector(".lab-wrap")) return null;
    const wrap = document.createElement("div");
    wrap.className = "read-mode-switch";
    wrap.title = ui.modeTitle;
    wrap.innerHTML = `
      <button type="button" data-mode="full">${ui.modeFull}</button>
      <button type="button" data-mode="labs">${ui.modeLabs}</button>
    `;
    wrap.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => {
        localStorage.setItem("book-read-mode", b.dataset.mode);
        applyMode(b.dataset.mode);
      });
    });
    setTimeout(() => applyMode(localStorage.getItem("book-read-mode") || "full"), 0);
    return wrap;
  }
  if (document.querySelector(".lab-wrap")) {
    applyMode(localStorage.getItem("book-read-mode") || "full");
  }

  // 2.7 Shared helper: jump to a lab and pulse it (pages may call window.bookJumpToLab)
  window.bookJumpToLab = function (labId) {
    const el = document.getElementById(labId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      const card = el.querySelector(".lab-card");
      if (!card) return;
      card.classList.remove("is-pulsing");
      void card.offsetWidth;
      card.classList.add("is-pulsing");
      setTimeout(() => card.classList.remove("is-pulsing"), 950);
    }, 320);
  };

  // 3. Load ../chapters.json and build switcher + language toggle + footer pager
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const fileName = pathParts[pathParts.length - 1] || "index.html";
  const currentSlug = fileName.replace(/\.html$/, "");

  const pickTitle = (c) => (isEn && c.titleEn ? c.titleEn : c.title);
  const pickSummary = (c) => (isEn && c.summaryEn ? c.summaryEn : c.summary);
  const pickPartName = (p) => (isEn && p.nameEn ? p.nameEn : p.name);
  const hasLang = (c, targetLang) => Array.isArray(c.langs) && c.langs.includes(targetLang);

  fetch("../chapters.json", { cache: "no-cache" })
    .then((r) => r.json())
    .then((data) => {
      const bookTitle = isEn && data.titleEn ? data.titleEn : data.title;
      const allChapters = [];
      data.parts.forEach((p) => {
        p.chapters.forEach((c) => allChapters.push({ ...c, partName: pickPartName(p) }));
      });
      const currentIdx = allChapters.findIndex((c) => c.slug === currentSlug);
      const currentChapter = currentIdx >= 0 ? allChapters[currentIdx] : null;

      // Wrap right-side controls (Lang switcher + Theme toggle)
      const topbarInner = document.querySelector(".topbar-inner");
      const existingThemeBtn = document.getElementById("themeToggle");
      if (topbarInner && existingThemeBtn) {
        const rightGroup = document.createElement("div");
        rightGroup.className = "nav-right-group";

        const langBtn = document.createElement("button");
        langBtn.type = "button";
        langBtn.id = "langSwitchBtn";
        langBtn.className = "lang-btn";
        langBtn.textContent = ui.langSwitchLabel;

        const canSwitch = !currentChapter || hasLang(currentChapter, otherLang);
        if (canSwitch) {
          langBtn.title = ui.langSwitchTitle;
          langBtn.addEventListener("click", () => {
            localStorage.setItem("book-lang", otherLang);
            const targetFile = currentChapter ? `${currentSlug}.html` : "index.html";
            const hash = currentChapter ? window.location.hash : "";
            window.location.href = `../${otherLang}/${targetFile}${hash}`;
          });
        } else {
          langBtn.disabled = true;
          langBtn.title = ui.langUnavailable;
        }

        const githubLink = document.createElement("a");
        githubLink.className = "github-btn";
        githubLink.href = "https://github.com/qufei1993/ai-agent-guide";
        githubLink.target = "_blank";
        githubLink.rel = "noopener noreferrer";
        githubLink.setAttribute("aria-label", isEn ? "GitHub Repository" : "GitHub 仓库");
        githubLink.title = isEn ? "View repository on GitHub" : "在 GitHub 查看源码与点 Star";
        githubLink.innerHTML =
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>';

        existingThemeBtn.parentNode.insertBefore(rightGroup, existingThemeBtn);
        const modeSwitch = buildModeSwitch();
        if (modeSwitch) rightGroup.appendChild(modeSwitch);
        rightGroup.appendChild(langBtn);
        rightGroup.appendChild(existingThemeBtn);
        rightGroup.appendChild(githubLink);
      }

      // Replace topbar .brand with Home link + Chapter Switcher button
      const oldBrand = topbarInner && topbarInner.querySelector(".brand");
      if (oldBrand) {
        const leftGroup = document.createElement("div");
        leftGroup.className = "nav-left-group";
        const btnLabel = currentChapter ? pickTitle(currentChapter) : ui.allChapters;
        leftGroup.innerHTML = `
          <a class="nav-home-link" href="./index.html">${bookTitle}</a>
          <span class="nav-sep">/</span>
          <button class="chapter-switcher-btn" id="chapterSwitcherBtn" type="button" title="${ui.switchTip}">
            <span>☰</span>
            <span class="chapter-switcher-text">${btnLabel}</span>
            <span>▾</span>
          </button>
        `;
        oldBrand.replaceWith(leftGroup);
      }

      // Build popover drawer
      const backdrop = document.createElement("div");
      backdrop.className = "chapter-popover-backdrop";
      const popover = document.createElement("div");
      popover.className = "chapter-popover";
      popover.innerHTML = `
        <div class="pop-head">
          <span class="pop-title">${ui.drawerTitle}</span>
          <a class="pop-home" href="./index.html">${ui.backHome}</a>
        </div>
        ${data.parts
          .map(
            (part) => `
          <div class="pop-part">
            <div class="pop-part-title">${pickPartName(part)}</div>
            <div class="pop-list">
              ${part.chapters
                .map((c) => {
                  const isCur = c.slug === currentSlug;
                  const isReady = c.status === "ready" && hasLang(c, lang);
                  const badge = isCur
                    ? `<span class="pop-badge pop-badge-cur">${ui.curBadge}</span>`
                    : isReady
                    ? `<span class="pop-badge pop-badge-ready">${ui.readyBadge}</span>`
                    : `<span class="pop-badge pop-badge-plan">${ui.soonBadge}</span>`;
                  if (isReady) {
                    return `
                      <a class="pop-item ${isCur ? "is-current" : ""}" href="./${c.slug}.html">
                        <div>
                          <div class="pop-item-title">${pickTitle(c)}</div>
                          <div class="pop-item-sub">${pickSummary(c)}</div>
                        </div>
                        ${badge}
                      </a>`;
                  }
                  return `
                    <div class="pop-item is-planned">
                      <div>
                        <div class="pop-item-title">${pickTitle(c)}</div>
                        <div class="pop-item-sub">${pickSummary(c)}</div>
                      </div>
                      ${badge}
                    </div>`;
                })
                .join("")}
            </div>
          </div>`
          )
          .join("")}
      `;
      document.body.appendChild(backdrop);
      document.body.appendChild(popover);

      const switcherBtn = document.getElementById("chapterSwitcherBtn");
      const togglePop = (open) => {
        backdrop.classList.toggle("open", open);
        popover.classList.toggle("open", open);
      };
      if (switcherBtn) {
        switcherBtn.addEventListener("click", () => {
          togglePop(!popover.classList.contains("open"));
        });
      }
      backdrop.addEventListener("click", () => togglePop(false));
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") togglePop(false);
      });

      // Build Prev / Next pager in footer
      const footer = document.querySelector("footer");
      if (footer && currentIdx >= 0) {
        const oldNext = footer.querySelector(".next-card");
        if (oldNext) oldNext.remove();

        const prev = currentIdx > 0 ? allChapters[currentIdx - 1] : null;
        const next = currentIdx < allChapters.length - 1 ? allChapters[currentIdx + 1] : null;

        const renderPagerCard = (ch, dir) => {
          if (!ch) return `<div></div>`;
          const isReady = ch.status === "ready" && hasLang(ch, lang);
          const label = dir === "prev" ? ui.prevLabel : ui.nextLabel;
          const alignCls = dir === "next" ? "align-right" : "";
          if (isReady) {
            return `
              <a class="pager-card ${alignCls}" href="./${ch.slug}.html">
                <span class="pager-kicker">${label}</span>
                <span class="pager-title">${pickTitle(ch)}</span>
              </a>`;
          }
          return `
            <div class="pager-card is-planned ${alignCls}">
              <span class="pager-kicker">${label}${ui.plannedSuffix}</span>
              <span class="pager-title">${pickTitle(ch)}</span>
            </div>`;
        };

        const pager = document.createElement("div");
        pager.className = "pager-grid";
        pager.innerHTML = `${renderPagerCard(prev, "prev")}${renderPagerCard(next, "next")}`;
        footer.appendChild(pager);
      }
    })
    .catch((err) => {
      console.warn("chapters.json load skipped:", err);
    });
})();
