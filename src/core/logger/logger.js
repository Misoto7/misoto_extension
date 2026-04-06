/**
 * @file src/core/logger/logger.js
 * @description Sistema de log seguro com sanitização, filtros por severidade,
 *              buffer circular, exportação e renderização no painel de debug.
 */

'use strict';

const DebugLog = (() => {
  // ─── Níveis ────────────────────────────────────────────────────────────────

  const LEVELS = Object.freeze({
    DEBUG:   { label: 'DBG ', color: '#a78bfa', bg: '#2d1b5522', severity: 0 },
    NET:     { label: 'NET ', color: '#38bdf8', bg: '#0c2d3d22', severity: 1 },
    MSG:     { label: 'MSG ', color: '#4ade80', bg: '#0d3d1522', severity: 1 },
    DOM:     { label: 'DOM ', color: '#fb923c', bg: '#3d1f0022', severity: 1 },
    STORAGE: { label: 'STG ', color: '#e879f9', bg: '#2d0d3d22', severity: 1 },
    INFO:    { label: 'INFO', color: '#60a5fa', bg: '#1e3a5f22', severity: 2 },
    SUCCESS: { label: 'OK  ', color: '#34d399', bg: '#0d3d2822', severity: 2 },
    WARN:    { label: 'WARN', color: '#fbbf24', bg: '#3d2e0022', severity: 3 },
    ERROR:   { label: 'ERR ', color: '#f87171', bg: '#3d100022', severity: 4 },
  });

  // ─── Estado interno ────────────────────────────────────────────────────────

  /** @type {Array<{id, ts, level, message, detail}>} */
  const _entries   = [];
  let   _minSeverity = 0;
  let   _idCounter   = 0;

  // ─── Sanitização ──────────────────────────────────────────────────────────

  const REDACTION_PATTERNS = [
    [/eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*/g,            '[TOKEN:REDACTED]'],
    [/Bearer\s+[A-Za-z0-9\-_.~+/]+=*/gi,                                    'Bearer [REDACTED]'],
    [/(authorization["']?\s*[:=]\s*["']?)[^\s"',}]+/gi,                     '$1[REDACTED]'],
  ];

  function _sanitize(text) {
    if (typeof text !== 'string') return text;
    let out = text;
    for (const [pattern, replacement] of REDACTION_PATTERNS) {
      out = out.replace(pattern, replacement);
    }
    return out;
  }

  function _serialize(detail) {
    if (detail === null || detail === undefined) return null;
    try {
      const raw = typeof detail === 'object'
        ? JSON.stringify(detail, null, 2)
        : String(detail);
      return _sanitize(raw);
    } catch (_) {
      return '[não serializável]';
    }
  }

  // ─── Registro ─────────────────────────────────────────────────────────────

  function _push(level, message, detail = null) {
    const cfg = LEVELS[level] ?? LEVELS.INFO;

    const now = new Date();
    const ts  = now.toLocaleTimeString('pt-BR', { hour12: false })
              + '.' + String(now.getMilliseconds()).padStart(3, '0');

    const entry = {
      id:       _idCounter++,
      ts,
      level,
      severity: cfg.severity,
      message:  _sanitize(String(message)),
      detail:   _serialize(detail),
    };

    // Buffer circular — sempre armazena para que filtros retroativos funcionem
    if (_entries.length >= UI.DEBUG_MAX_ENTRIES) _entries.shift();
    _entries.push(entry);

    // Só renderiza se passar o filtro ativo
    if (cfg.severity >= _minSeverity) {
      _render(entry);
    }

    _toConsole(level, entry.message, entry.detail);
  }

  // ─── Renderização ─────────────────────────────────────────────────────────

  function _render(entry) {
    const container = Store.get('debugLogContainer');
    if (!container) return;

    const cfg = LEVELS[entry.level] ?? LEVELS.INFO;

    const row = document.createElement('div');
    Object.assign(row.style, {
      display:             'grid',
      gridTemplateColumns: '75px 38px 1fr',
      gap:                 '5px',
      padding:             '3px 6px',
      borderBottom:        '1px solid #ffffff06',
      fontSize:            '9.5px',
      lineHeight:          '1.55',
      fontFamily:          '"Courier New", monospace',
      background:          cfg.bg,
      borderLeft:          `2px solid ${cfg.color}44`,
    });

    const tsEl  = Object.assign(document.createElement('span'), {
      textContent: entry.ts,
      style:       Object.assign(document.createElement('span').style, { color: '#4b5563' }),
    });
    tsEl.style.color = '#4b5563';

    const lvlEl = document.createElement('span');
    lvlEl.textContent  = cfg.label;
    lvlEl.style.color  = cfg.color;
    lvlEl.style.fontWeight = 'bold';

    const msgEl = document.createElement('span');
    msgEl.style.color     = '#d1d5db';
    msgEl.style.wordBreak = 'break-all';

    if (entry.detail) {
      msgEl.title        = entry.detail;
      msgEl.style.cursor = 'help';
      const msgText    = document.createTextNode(entry.message + ' ');
      const detailSpan = document.createElement('span');
      detailSpan.style.color = '#6b7280';
      const short = entry.detail.replace(/\n/g, ' ');
      detailSpan.textContent = short.length > 80 ? short.slice(0, 80) + '…' : short;
      msgEl.appendChild(msgText);
      msgEl.appendChild(detailSpan);
    } else {
      msgEl.textContent = entry.message;
    }

    row.append(tsEl, lvlEl, msgEl);
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  function renderAll() {
    const container = Store.get('debugLogContainer');
    if (!container) return;
    container.innerHTML = '';
    _entries
      .filter(e => (LEVELS[e.level]?.severity ?? 0) >= _minSeverity)
      .forEach(_render);
    container.scrollTop = container.scrollHeight;
  }

  // ─── Console nativo ────────────────────────────────────────────────────────

  function _toConsole(level, message, detail) {
    const prefix = `[Misoto:${level.trim()}]`;
    if (level === 'ERROR')     console.error(prefix, message, detail ?? '');
    else if (level === 'WARN') console.warn(prefix, message, detail ?? '');
    else                       console.log(prefix, message, detail ?? '');
  }

  // ─── Exportação ───────────────────────────────────────────────────────────

  function exportLogs() {
    const lines = [
      '═══════════════════════════════════════',
      `  MISOTO v${MISOTO_VERSION} — LOG DE DIAGNÓSTICO`,
      `  Exportado: ${new Date().toLocaleString('pt-BR')}`,
      '═══════════════════════════════════════',
      '',
    ];
    for (const e of _entries) {
      const detail = e.detail ? ` | ${e.detail.replace(/\n/g, ' ')}` : '';
      lines.push(`[${e.ts}] ${LEVELS[e.level]?.label ?? e.level} ${e.message}${detail}`);
    }
    return lines.join('\n');
  }

  // ─── Utilidades ───────────────────────────────────────────────────────────

  function setMinSeverity(severity) {
    _minSeverity = severity;
    renderAll();
  }

  function getStats() {
    return {
      total:  _entries.length,
      errors: _entries.filter(e => e.level === 'ERROR').length,
      warns:  _entries.filter(e => e.level === 'WARN').length,
    };
  }

  function clear() {
    _entries.length = 0;
    const container = Store.get('debugLogContainer');
    if (container) container.innerHTML = '';
  }

  // ─── API pública ───────────────────────────────────────────────────────────

  return {
    debug:   (msg, d) => _push('DEBUG',   msg, d),
    net:     (msg, d) => _push('NET',     msg, d),
    msg:     (msg, d) => _push('MSG',     msg, d),
    dom:     (msg, d) => _push('DOM',     msg, d),
    storage: (msg, d) => _push('STORAGE', msg, d),
    info:    (msg, d) => _push('INFO',    msg, d),
    ok:      (msg, d) => _push('SUCCESS', msg, d),
    warn:    (msg, d) => _push('WARN',    msg, d),
    error:   (msg, d) => _push('ERROR',   msg, d),

    renderAll,
    exportLogs,
    setMinSeverity,
    getStats,
    getEntries: () => [..._entries],
    clear,
    LEVELS,
  };
})();
