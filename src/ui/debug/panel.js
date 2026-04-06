/**
 * @file src/ui/debug/panel.js
 * @description Painel de diagnóstico flutuante da extensão Misoto.
 */

'use strict';

function createDebugPanel() {
  if (Store.get('debugPanel')) return;

  const savedPos = { top: '80px', right: '20px' };

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position:    'fixed',
    top:         savedPos.top,
    right:       savedPos.right,
    width:       '400px',
    height:      '320px',
    background:  '#080f1a',
    border:      '1px solid #1e293b',
    borderRadius:'10px',
    boxShadow:   '0 8px 32px rgba(0,0,0,0.8)',
    fontFamily:  '"Courier New", monospace',
    zIndex:      '2147483646',
    display:     'none',
    flexDirection:'column',
    overflow:    'hidden',
  });

  const header = document.createElement('div');
  Object.assign(header.style, {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '6px 10px',
    borderBottom:   '1px solid #1e293b',
    cursor:         'move',
    background:     '#0f172a',
    flexShrink:     '0',
  });

  const titleEl = document.createElement('span');
  titleEl.textContent = '🔍 Misoto Debug';
  Object.assign(titleEl.style, { color: '#a78bfa', fontSize: '11px', fontWeight: '700' });

  const statsEl = document.createElement('span');
  statsEl.style.color    = '#4b5563';
  statsEl.style.fontSize = '9px';

  setInterval(() => {
    const s = DebugLog.getStats();
    statsEl.textContent = `${s.total} entradas | ${s.errors} erros | ${s.warns} warns`;
  }, 2_000);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  Object.assign(closeBtn.style, {
    background: 'none', border: 'none',
    color: '#6b7280', cursor: 'pointer',
    fontSize: '12px', padding: '0 2px',
  });
  closeBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });
  closeBtn.addEventListener('click', () => toggleDebugPanel(false));

  header.append(titleEl, statsEl, closeBtn);

  const filtersBar = createDebugFilters();

  const logContainer = document.createElement('div');
  Object.assign(logContainer.style, {
    flex:       '1',
    overflowY:  'auto',
    overflowX:  'hidden',
    padding:    '2px 0',
    scrollbarWidth: 'thin',
    scrollbarColor: '#334155 transparent',
  });

  Store.set('debugLogContainer', logContainer);

  panel.append(header, filtersBar, logContainer);
  document.documentElement.appendChild(panel);
  Store.set('debugPanel', panel);

  let dragging = false;
  let startX = 0, startY = 0;
  let startLeft = 0, startTop = 0;
  let rafId = null;
  let pendingLeft = null, pendingTop = null;

  function schedulePosition(left, top) {
    pendingLeft = left;
    pendingTop = top;
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (pendingLeft !== null && pendingTop !== null) {
          panel.style.left = pendingLeft + 'px';
          panel.style.top = pendingTop + 'px';
          panel.style.right = 'auto';
          pendingLeft = null;
          pendingTop = null;
        }
        rafId = null;
      });
    }
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();

    dragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = panel.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;

    header.setPointerCapture(e.pointerId);

    panel.style.transition = 'none';
    header.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    document.body.style.pointerEvents = 'none';
  }

  function onPointerMove(e) {
    if (!dragging) return;

    let newLeft = startLeft + (e.clientX - startX);
    let newTop = startTop + (e.clientY - startY);

    const maxLeft = window.innerWidth - panel.offsetWidth;
    const maxTop = window.innerHeight - panel.offsetHeight;
    newLeft = Math.max(0, Math.min(maxLeft, newLeft));
    newTop = Math.max(0, Math.min(maxTop, newTop));

    schedulePosition(newLeft, newTop);
  }

  function onPointerUp(e) {
    if (!dragging) return;

    dragging = false;

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (pendingLeft !== null && pendingTop !== null) {
      panel.style.left = pendingLeft + 'px';
      panel.style.top = pendingTop + 'px';
      pendingLeft = null;
      pendingTop = null;
    }

    header.releasePointerCapture(e.pointerId);

    panel.style.transition = '';
    header.style.cursor = '';
    document.body.style.userSelect = '';
    document.body.style.pointerEvents = '';

    AppStorage.set({ [STORAGE.DEBUG_POS]: { top: panel.style.top, left: panel.style.left } });
  }

  function onPointerCancel(e) {
    if (dragging) onPointerUp(e);
  }

  header.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerCancel);
}

function toggleDebugPanel(forceState) {
  const panel = Store.get('debugPanel');
  if (!panel) return;

  const isOpen   = Store.get('debugOpen');
  const newState = forceState !== undefined ? forceState : !isOpen;

  Store.set('debugOpen', newState);
  panel.style.display = newState ? 'flex' : 'none';

  if (newState) DebugLog.renderAll();

  EventBus.emit(EVENTS.UI_DEBUG_TOGGLED, { open: newState });
}