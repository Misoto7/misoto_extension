/**
 * @file src/features/focus-freeze/bridge.js
 * @description Focus Freeze — world: ISOLATED (MV3 padrão)
 *
 * Ponte entre background.js e bootstrap.js (MAIN world).
 *  - Lê config inicial do background via sendMessage
 *  - Empurra config para MAIN world via CustomEvent '__ff_config'
 *  - Recebe estatísticas do MAIN world e encaminha ao background
 *  - Guard de contexto: protege contra "Extension context invalidated"
 *
 * IMPORTANTE: todo o código fica dentro de um IIFE para evitar colisão
 * de nomes com constants.js (que é carregado no mesmo contexto isolated
 * nas páginas unopar.com.br).
 */

'use strict';

(function () {

  // ─── Constantes locais ─────────────────────────────────────────────────────
  // Definidas aqui pois bridge.js roda em <all_urls> sem acesso a constants.js,
  // mas também dentro de IIFE para não colidir quando constants.js já está carregado.

  const _MSG = {
    FF_GET_STATE:      'FF_GET_STATE',
    FF_SET_STATE:      'FF_SET_STATE',
    FF_APPLY_CONFIG:   'FF_APPLY_CONFIG',
    FF_STAT_INCREMENT: 'FF_STAT_INCREMENT',
    FF_PING:           'FF_PING',
    FF_PONG:           'FF_PONG',
  };

  const _FF_PROFILES = {
    FULL:   'full',
    SOFT:   'soft',
    CUSTOM: 'custom',
  };

  // ─── Guard de contexto ────────────────────────────────────────────────────

  function isContextAlive() {
    try {
      return !!chrome.runtime?.id;
    } catch (_) {
      return false;
    }
  }

  function safeSend(payload) {
    if (!isContextAlive()) return Promise.resolve(null);
    return chrome.runtime.sendMessage(payload).catch(() => null);
  }

  // ─── Bootstrap ────────────────────────────────────────────────────────────

  (async function bootstrap() {
    if (!isContextAlive()) return;

    let state = null;
    try {
      const res = await chrome.runtime.sendMessage({ type: _MSG.FF_GET_STATE });
      state = res?.state;
    } catch (_) {}

    if (state) pushConfig(buildConfig(state));

    // Ouve atualizações do background
    chrome.runtime.onMessage.addListener((msg) => {
      if (!isContextAlive()) return;
      if (msg.type === _MSG.FF_APPLY_CONFIG) pushConfig(msg.config);
    });
  })();

  // ─── Stats do MAIN world → background ────────────────────────────────────

  window.addEventListener('__ff_stats', (e) => {
    if (!isContextAlive()) return;

    const counts = e.detail;
    if (!counts) return;

    const MAP = {
      eventsBlocked:     'eventsBlocked',
      timersIntercepted: 'timersIntercepted',
      blurBlocked:       'blurBlocked',
      visibilityBlocked: 'visibilityBlocked',
    };

    for (const [local, remote] of Object.entries(MAP)) {
      const n = counts[local];
      if (n && n > 0) {
        safeSend({ type: _MSG.FF_STAT_INCREMENT, key: remote, amount: n });
      }
    }
  });

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function pushConfig(config) {
    window.dispatchEvent(new CustomEvent('__ff_config', { detail: config }));
  }

  function buildConfig(state) {
    if (!state?.enabled) return { enabled: false, ...allFalse() };
    if (state.profile === _FF_PROFILES.FULL)   return { enabled: true, ...allTrue() };
    if (state.profile === _FF_PROFILES.SOFT)   return { enabled: true, ...softProfile() };

    // CUSTOM: mescla os valores do custom; módulos não definidos ficam false
    const customCfg = state.custom ?? {};
    const resolved = { ...allFalse(), ...customCfg };

    // Se nenhum módulo estiver ativo, desativa completamente
    const anyActive = Object.values(resolved).some(Boolean);
    return { enabled: anyActive, ...resolved };
  }

  function allFalse() {
    return {
      blockBlur: false, blockVisibility: false, blockKeyDetection: false,
      blockMouseLeave: false, blockResize: false, blockIdle: false,
      blockTimers: false, blockBattery: false, blockNetwork: false,
      blockPointerLock: false, blockPageLifecycle: false, blockFullscreen: false,
      fakeHeartbeat: false, unlockClipboard: false,
    };
  }

  function allTrue() {
    return {
      blockBlur: true, blockVisibility: true, blockKeyDetection: false,
      blockMouseLeave: true, blockResize: true, blockIdle: true,
      blockTimers: true, blockBattery: true, blockNetwork: true,
      blockPointerLock: true, blockPageLifecycle: true, blockFullscreen: true,
      fakeHeartbeat: true, unlockClipboard: true,
    };
  }

  function softProfile() {
    return {
      blockBlur: true, blockVisibility: true, blockFullscreen: true,
      fakeHeartbeat: true, unlockClipboard: true,
      blockKeyDetection: false, blockMouseLeave: false, blockResize: false,
      blockIdle: false, blockTimers: false, blockBattery: false,
      blockNetwork: false, blockPointerLock: false, blockPageLifecycle: false,
    };
  }

})();
