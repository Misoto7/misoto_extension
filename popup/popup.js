'use strict';
// ============================================================
// popup/popup.js — Misoto v5 · apenas Focus Freeze
// ============================================================

const MSG = {
  FF_GET_STATE:   'FF_GET_STATE',
  FF_SET_STATE:   'FF_SET_STATE',
};

const FF_MODULES = [
  { key: 'blockBlur',          icon: '👁',  label: 'Blur / focusout'             },
  { key: 'blockVisibility',    icon: '🌑',  label: 'Visibilidade'                },
  { key: 'blockPageLifecycle', icon: '⚡',  label: 'Ciclo de vida'               },
  { key: 'blockMouseLeave',    icon: '🖱',  label: 'Mouse leave'                 },
  { key: 'blockResize',        icon: '↔',  label: 'Resize / geometria'          },
  { key: 'blockTimers',        icon: '⏱',  label: 'Timers + rAF bypass'         },
  { key: 'blockIdle',          icon: '💤',  label: 'Idle Detection API'          },
  { key: 'blockBattery',       icon: '🔋',  label: 'Battery API'                 },
  { key: 'blockNetwork',       icon: '📡',  label: 'Network Info API'            },
  { key: 'blockPointerLock',   icon: '🔒',  label: 'Pointer Lock'                },
  { key: 'blockFullscreen',    icon: '⛶',   label: 'Fullscreen spoof'            },
  { key: 'fakeHeartbeat',      icon: '💓',  label: 'Fake heartbeat', tag: 'new'  },
  { key: 'unlockClipboard',    icon: '📋',  label: 'Desbloquear clipboard'       },
];

const $ = id => document.getElementById(id);

const els = {
  ffToggle:  $('ff-toggle'),
  ffSub:     $('ff-sub'),
  customSec: $('custom-sec'),
  modList:   $('mod-list'),
  toastWrap: $('toast-wrap'),
};

const state = { ffState: null };

function toast(msg, type = 'info') {
  const existingToast = document.querySelector('.popup-toast');
  if (existingToast) existingToast.remove();
  
  const toastEl = document.createElement('div');
  toastEl.className = `popup-toast ${type}`;
  toastEl.textContent = msg;
  
  Object.assign(toastEl.style, {
    position: 'fixed',
    bottom: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: type === 'success' ? '#1a4731' : (type === 'warn' ? '#4a3a1a' : '#1e2a4a'),
    color: '#e2e8f0',
    fontSize: '10px',
    padding: '4px 10px',
    borderRadius: '20px',
    zIndex: '10000',
    fontFamily: 'monospace',
    opacity: '0',
    transition: 'opacity 0.2s ease',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  });
  
  document.body.appendChild(toastEl);
  requestAnimationFrame(() => { toastEl.style.opacity = '1'; });
  setTimeout(() => {
    toastEl.style.opacity = '0';
    setTimeout(() => toastEl.remove(), 200);
  }, 1500);
}

function renderFF(ff) {
  state.ffState = ff ?? null;
  
  if (!ff) {
    els.ffSub.textContent = 'não inicializado';
    els.ffToggle.checked = false;
    return;
  }
  
  const on = ff.enabled !== false;
  els.ffToggle.checked = on;
  els.ffSub.textContent = on
    ? 'Todas as camadas de defesa ativas'
    : 'A página pode detectar quando você sai';

  document.querySelectorAll('[data-p]').forEach(btn => {
    if (btn.dataset.p === ff.profile) {
      btn.classList.add('act');
    } else {
      btn.classList.remove('act');
    }
  });

  if (els.customSec) {
    els.customSec.style.display = ff.profile === 'custom' ? 'block' : 'none';
  }
}

function buildModList(ff) {
  if (!ff) return;
  els.modList.innerHTML = '';
  const isCustom = ff.profile === 'custom';
  
  for (const mod of FF_MODULES) {
    const checked = ff.custom?.[mod.key] ?? false;
    const row = document.createElement('div');
    row.className = 'mod-row';
    const tagHtml = mod.tag ? `<span class="mod-tag">${mod.tag.toUpperCase()}</span>` : '';
    
    row.innerHTML = `
      <span class="mod-icon">${mod.icon}</span>
      <span class="mod-label">${mod.label}</span>
      ${tagHtml}
      <label class="mtog${isCustom ? '' : ' disabled'}">
        <input type="checkbox" data-key="${mod.key}"${checked ? ' checked' : ''}>
        <span class="mtog-track"></span>
      </label>
    `;
    els.modList.appendChild(row);
  }
  
  els.modList.querySelectorAll('input[data-key]').forEach(inp => {
    inp.addEventListener('change', async () => {
      const patch = { custom: { ...state.ffState.custom, [inp.dataset.key]: inp.checked } };
      await pushFF(patch);
    });
  });
}

async function pushFF(patch) {
  try {
    const res = await chrome.runtime.sendMessage({ type: MSG.FF_SET_STATE, patch });
    if (res?.state) {
      state.ffState = res.state;
      renderFF(res.state);
      buildModList(res.state);
    }
  } catch (_) {}
}

function updateAll() {
  chrome.storage.local.get(['ff_state_v5'], data => {
    renderFF(data.ff_state_v5 ?? null);
    buildModList(data.ff_state_v5 ?? null);
  });
}

els.ffToggle.addEventListener('change', async () => {
  const on = els.ffToggle.checked;

  // Animação no track do toggle
  const track = els.ffToggle.nextElementSibling;
  track.classList.remove('anim-on', 'anim-off');
  void track.offsetWidth; // reflow para reiniciar animação
  track.classList.add(on ? 'anim-on' : 'anim-off');

  // Flash no bloco master
  const master = els.ffToggle.closest('.master') ?? document.querySelector('.master');
  if (master) {
    master.classList.remove('flash-on', 'flash-off');
    void master.offsetWidth;
    master.classList.add(on ? 'flash-on' : 'flash-off');
    master.addEventListener('animationend', () => master.classList.remove('flash-on','flash-off'), { once: true });
  }

  await pushFF({ enabled: on, stats: { sessionStart: on ? Date.now() : null } });
  if (on) toast('Focus Freeze ativado', 'success');
  else toast('Focus Freeze desativado', 'warn');
});

document.querySelectorAll('[data-p]').forEach(btn => {
  btn.addEventListener('click', async () => {
    await pushFF({ profile: btn.dataset.p });
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => { btn.style.transform = ''; }, 150);
  });
});

// HELP - ABRE EM NOVA ABA (SOLUÇÃO DEFINITIVA)
function showHelpModal() {
  const helpContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Misoto - Ajuda</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #08090d;
      color: #d8dae8;
      font-family: 'Segoe UI', system-ui, sans-serif;
      padding: 30px 20px;
      min-height: 100vh;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 {
      font-size: 24px;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #a78bfa, #06b6d4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .sub {
      color: #525470;
      margin-bottom: 30px;
      border-bottom: 1px solid #1c1e28;
      padding-bottom: 15px;
    }
    .section {
      background: #0f1117;
      border: 1px solid #1c1e28;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 1px solid #252836;
      color: #a78bfa;
    }
    .item {
      display: flex;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid #1c1e28;
    }
    .item:last-child { border-bottom: none; }
    .icon { font-size: 20px; min-width: 36px; text-align: center; }
    .label { font-weight: 600; font-size: 14px; margin-bottom: 4px; color: #e2e8f0; }
    .desc { font-size: 12px; color: #6b7280; line-height: 1.4; }
    footer { text-align: center; padding: 20px; color: #374151; font-size: 11px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚡ MISOTO</h1>
    <div class="sub">Central de Ajuda — Focus Freeze</div>

    <div class="section">
      <div class="section-title">🛡️ FOCUS FREEZE - PERFIS</div>
      <div class="item"><div class="icon">🛡️</div><div><div class="label">Focus Freeze</div><div class="desc">Ativa a proteção principal. Impede que a plataforma detecte quando você muda de aba ou janela.</div></div></div>
      <div class="item"><div class="icon">🛡️</div><div><div class="label">Perfil FULL</div><div class="desc">Ativa todos os módulos de proteção simultaneamente. Recomendado para máxima proteção.</div></div></div>
      <div class="item"><div class="icon">🌙</div><div><div class="label">Perfil SOFT</div><div class="desc">Proteção leve: bloqueia apenas os eventos mais comuns (blur, visibilidade, fullscreen).</div></div></div>
      <div class="item"><div class="icon">⚙️</div><div><div class="label">Perfil CUSTOM</div><div class="desc">Permite ativar ou desativar cada módulo individualmente conforme sua necessidade.</div></div></div>
    </div>

    <div class="section">
      <div class="section-title">🔧 MÓDULOS DE PROTEÇÃO</div>
      <div class="item"><div class="icon">👁</div><div><div class="label">Blur / focusout</div><div class="desc">Bloqueia eventos de perda de foco da janela.</div></div></div>
      <div class="item"><div class="icon">🌑</div><div><div class="label">Visibilidade</div><div class="desc">Congela o estado de visibilidade da página (document.visibilityState = "visible").</div></div></div>
      <div class="item"><div class="icon">⚡</div><div><div class="label">Ciclo de vida</div><div class="desc">Bloqueia eventos de ciclo de vida da página (freeze, pagehide, etc.).</div></div></div>
      <div class="item"><div class="icon">🖱</div><div><div class="label">Mouse leave</div><div class="desc">Suprime o evento mouseleave que indica que o cursor saiu da janela.</div></div></div>
      <div class="item"><div class="icon">↔</div><div><div class="label">Resize / geometria</div><div class="desc">Bloqueia eventos de redimensionamento da janela.</div></div></div>
      <div class="item"><div class="icon">⏱</div><div><div class="label">Timers + rAF</div><div class="desc">Intercepta setTimeout/setInterval para evitar detecção por timer de inatividade.</div></div></div>
      <div class="item"><div class="icon">💤</div><div><div class="label">Idle Detection</div><div class="desc">Bloqueia a Idle Detection API que detecta usuário inativo.</div></div></div>
      <div class="item"><div class="icon">🔋</div><div><div class="label">Battery API</div><div class="desc">Mascara a Battery Status API para evitar fingerprinting.</div></div></div>
      <div class="item"><div class="icon">📡</div><div><div class="label">Network Info</div><div class="desc">Oculta mudanças de conexão de rede que podem sinalizar troca de contexto.</div></div></div>
      <div class="item"><div class="icon">🔒</div><div><div class="label">Pointer Lock</div><div class="desc">Bloqueia detecção de liberação do pointer lock.</div></div></div>
      <div class="item"><div class="icon">⛶</div><div><div class="label">Fullscreen spoof</div><div class="desc">Simula modo fullscreen ativo para enganar checagens da plataforma.</div></div></div>
      <div class="item"><div class="icon">💓</div><div><div class="label">Fake heartbeat</div><div class="desc">Envia sinais periódicos de "atividade" para manter a sessão viva.</div></div></div>
      <div class="item"><div class="icon">📋</div><div><div class="label">Desbloquear clipboard</div><div class="desc">Remove restrições de copiar/colar impostas pela plataforma.</div></div></div>
    </div>
    <footer>Misoto v1.0.0 — Extensão para Ampli/Unopar</footer>
  </div>
</body>
</html>`;

  const blob = new Blob([helpContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  chrome.tabs.create({ url: url }, () => {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateAll();
  setInterval(updateAll, 2000);

  const helpBtn = $('popup-help-btn');
  if (helpBtn) {
    helpBtn.addEventListener('click', showHelpModal);
  }
});