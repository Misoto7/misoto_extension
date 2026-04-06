/**
 * @file src/ui/debug/filters.js
 * @description Controles de filtro para o painel de debug.
 */

'use strict';

/**
 * Cria a toolbar de filtros do painel de debug.
 * @returns {HTMLElement}
 */
function createDebugFilters() {
  const bar = document.createElement('div');
  Object.assign(bar.style, {
    display:    'flex',
    gap:        '4px',
    padding:    '6px 8px',
    borderBottom:'1px solid #1e293b',
    flexWrap:   'wrap',
  });

  const filters = [
    { label: 'ALL',   severity: 0 },
    { label: 'INFO+', severity: 2 },
    { label: 'WARN+', severity: 3 },
    { label: 'ERR',   severity: 4 },
  ];

  let activeBtn = null;

  filters.forEach(({ label, severity }) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    Object.assign(btn.style, {
      padding:      '2px 6px',
      borderRadius: '4px',
      border:       '1px solid #334155',
      background:   '#1e293b',
      color:        '#6b7280',
      fontSize:     '9px',
      cursor:       'pointer',
      transition:   'all 0.1s',
    });

    function activate() {
      if (activeBtn) {
        activeBtn.style.background  = '#1e293b';
        activeBtn.style.color       = '#6b7280';
        activeBtn.style.borderColor = '#334155';
      }
      btn.style.background  = '#334155';
      btn.style.color       = '#e2e8f0';
      btn.style.borderColor = '#60a5fa';
      activeBtn = btn;
      DebugLog.setMinSeverity(severity);
    }

    btn.addEventListener('click', activate);

    if (severity === 0) {
      activate(); // ALL ativo por padrão — sem depender de .click()
    }

    bar.appendChild(btn);
  });

  // Botão exportar
  const exportBtn = document.createElement('button');
  exportBtn.textContent = '⬇ Export';
  Object.assign(exportBtn.style, {
    marginLeft:   'auto',
    padding:      '2px 6px',
    borderRadius: '4px',
    border:       '1px solid #334155',
    background:   '#1e293b',
    color:        '#a78bfa',
    fontSize:     '9px',
    cursor:       'pointer',
  });
  exportBtn.addEventListener('click', () => {
    const text = DebugLog.exportLogs();
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `misoto-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Botão limpar
  const clearBtn = document.createElement('button');
  clearBtn.textContent = '🗑 Limpar';
  Object.assign(clearBtn.style, {
    padding:      '2px 6px',
    borderRadius: '4px',
    border:       '1px solid #334155',
    background:   '#1e293b',
    color:        '#f87171',
    fontSize:     '9px',
    cursor:       'pointer',
  });
  clearBtn.addEventListener('click', () => DebugLog.clear());

  bar.append(exportBtn, clearBtn);
  return bar;
}
