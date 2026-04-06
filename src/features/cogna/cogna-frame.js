/**
 * @file src/features/cogna/cogna-frame.js
 * @description Detector de frames Cogna — injetado em TODOS os frames.
 *              Detecta a URL Cogna e reporta ao background via sendMessage.
 *              Roda com document_start para capturar antes de qualquer redirect.
 */

'use strict';

(function () {
  const COGNA_DOMAIN = 'cms.cogna.com.br';
  let reported = false;
  let lastReportedUrl = null;

  function extractLessonName(url) {
    if (!url) return null;
    const match = url.match(/learningObj=(.+?)(?:&|$)/);
    if (!match) return null;
    let name = decodeURIComponent(match[1]);
    name     = name.replace(/^aula-\d+-/, '').replace(/-/g, ' ');
    return name.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }

  function reportUrl(url) {
    if (!url || !url.includes(COGNA_DOMAIN)) return;
    // Permite re-reportar se a URL mudou (navegação SPA entre aulas)
    if (reported && url === lastReportedUrl) return;

    reported = true;
    lastReportedUrl = url;

    chrome.runtime.sendMessage({
      type:      'COGNA_URL_FOUND',
      url,
      nomeAula:  extractLessonName(url),
      timestamp: new Date().toISOString(),
    }).catch(() => {});
  }

  function scan() {
    reportUrl(window.location.href);
    try {
      for (const iframe of document.querySelectorAll('iframe')) {
        // Verifica tanto o atributo src quanto a propriedade (pode diferir antes do parse)
        const src = iframe.src || iframe.getAttribute('src') || '';
        if (src.includes(COGNA_DOMAIN)) { reportUrl(src); return; }
      }
    } catch (_) {}
  }

  // Reseta ao navegar em SPAs para re-capturar na nova aula
  let lastHref = window.location.href;
  setInterval(() => {
    const current = window.location.href;
    if (current !== lastHref) {
      lastHref = current;
      reported = false;
      lastReportedUrl = null;
      scan();
    }
  }, 1_000);

  scan();

  const observer = new MutationObserver(scan);

  function attachObserver() {
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachObserver);
  } else {
    attachObserver();
  }

  window.addEventListener('load', () => {
    setTimeout(scan, 1_000);
    setTimeout(scan, 3_000);
  });
})();
