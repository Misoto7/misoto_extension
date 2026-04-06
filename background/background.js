/**
 * @file background/background.js
 * @description Service Worker da extensão Misoto v5.
 *
 * Responsabilidades:
 *  1. Interceptar requisições GraphQL → extrair e broadcast do Bearer token
 *  2. Detectar streams M3U8 e notificar a aba correspondente
 *  3. Relay de mensagens COGNA_URL_FOUND entre frames e abas
 *  4. Gerenciar estado persistido do Focus Freeze
 *  5. Roteador central de mensagens
 */

'use strict';

// ─── Constantes locais (background não carrega constants.js) ──────────────────

const GRAPHQL_ENDPOINT = 'https://graphql.ampli.com.br/*';
const FF_STORAGE_KEY   = 'ff_state_v5';

const MSG = {
  TOKEN:             'TOKEN',
  M3U8_DETECTED:     'M3U8_DETECTED',
  COGNA_URL_FOUND:   'COGNA_URL_FOUND',
  FF_GET_STATE:      'FF_GET_STATE',
  FF_SET_STATE:      'FF_SET_STATE',
  FF_GET_STATS:      'FF_GET_STATS',
  FF_RESET_STATS:    'FF_RESET_STATS',
  FF_APPLY_CONFIG:   'FF_APPLY_CONFIG',
  FF_STAT_INCREMENT: 'FF_STAT_INCREMENT',
  FF_PING:           'FF_PING',
  FF_PONG:           'FF_PONG',
};

const FF_PROFILES = { FULL: 'full', SOFT: 'soft', CUSTOM: 'custom' };

// ─── Estado em memória ────────────────────────────────────────────────────────

/** URLs M3U8 detectadas por aba. @type {Map<number, string[]>} */
const detectedM3U8 = new Map();

/** Cache do token para evitar broadcasts redundantes. */
let cachedToken = null;

// ─── Focus Freeze — estado padrão ─────────────────────────────────────────────

const FF_DEFAULT_STATE = {
  enabled: true,
  profile: FF_PROFILES.FULL,
  stats: {
    blurBlocked:       0,
    visibilityBlocked: 0,
    timersIntercepted: 0,
    eventsBlocked:     0,
    sessionStart:      null,
  },
  custom: {
    blockBlur:          true,  blockVisibility:    true,
    blockKeyDetection:  false, blockMouseLeave:    true,
    blockResize:        true,  blockIdle:          true,
    blockTimers:        true,  blockBattery:       true,
    blockNetwork:       true,  blockPointerLock:   true,
    blockPageLifecycle: true,  blockFullscreen:    true,
    fakeHeartbeat:      true,  unlockClipboard:    true,
  },
};

// ─── Focus Freeze — storage helpers ──────────────────────────────────────────

function ff_loadState() {
  return new Promise((resolve) => {
    chrome.storage.local.get([FF_STORAGE_KEY], (result) => {
      const saved = result[FF_STORAGE_KEY];
      if (!saved) return resolve(structuredClone(FF_DEFAULT_STATE));
      resolve({
        ...FF_DEFAULT_STATE,
        ...saved,
        stats:  { ...FF_DEFAULT_STATE.stats,  ...(saved.stats  ?? {}) },
        custom: { ...FF_DEFAULT_STATE.custom, ...(saved.custom ?? {}) },
      });
    });
  });
}

function ff_saveState(state) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [FF_STORAGE_KEY]: state }, resolve);
  });
}

async function ff_updateState(patch) {
  const current = await ff_loadState();
  const next    = _deepMerge(current, patch);
  await ff_saveState(next);
  return next;
}

function _deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    const isObj = source[key] !== null
               && typeof source[key] === 'object'
               && !Array.isArray(source[key]);
    out[key] = isObj ? _deepMerge(target[key] ?? {}, source[key]) : source[key];
  }
  return out;
}

// ─── Focus Freeze — builders de config ───────────────────────────────────────

function ff_buildConfig(state) {
  if (!state.enabled) return { enabled: false };
  if (state.profile === FF_PROFILES.FULL)   return { enabled: true, ...ff_allTrue() };
  if (state.profile === FF_PROFILES.SOFT)   return { enabled: true, ...ff_softProfile() };
  return { enabled: true, ...state.custom };
}

function ff_allTrue() {
  return {
    blockBlur: true, blockVisibility: true, blockKeyDetection: false,
    blockMouseLeave: true, blockResize: true, blockIdle: true,
    blockTimers: true, blockBattery: true, blockNetwork: true,
    blockPointerLock: true, blockPageLifecycle: true, blockFullscreen: true,
    fakeHeartbeat: true, unlockClipboard: true,
  };
}

function ff_softProfile() {
  return {
    blockBlur: true, blockVisibility: true, blockFullscreen: true,
    fakeHeartbeat: true, unlockClipboard: true,
    blockKeyDetection: false, blockMouseLeave: false, blockResize: false,
    blockIdle: false, blockTimers: false, blockBattery: false,
    blockNetwork: false, blockPointerLock: false, blockPageLifecycle: false,
  };
}

// ─── Instalação ───────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  await ff_saveState({
    ...structuredClone(FF_DEFAULT_STATE),
    enabled: true,
    stats: { ...FF_DEFAULT_STATE.stats, sessionStart: Date.now() },
  });
  console.log('[Misoto] Extensão instalada/atualizada.');
});

// ─── Detecção de Streams M3U8 ─────────────────────────────────────────────────

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    const { tabId, url, type, responseHeaders } = details;
    if (type !== 'xmlhttprequest' && type !== 'media') return;

    const ctHeader = (responseHeaders ?? []).find(
      (h) => h.name.toLowerCase() === 'content-type'
    );
    const ct = ctHeader?.value?.toLowerCase() ?? '';
    const isM3U8 = ct.includes('application/vnd.apple.mpegurl')
                || ct.includes('application/x-mpegurl')
                || url.includes('.m3u8');

    if (!isM3U8) return;

    if (!detectedM3U8.has(tabId)) detectedM3U8.set(tabId, []);
    const urls = detectedM3U8.get(tabId);

    if (!urls.includes(url)) {
      urls.push(url);
      chrome.tabs.sendMessage(tabId, { type: MSG.M3U8_DETECTED, url }).catch(() => {});
    }

    return { responseHeaders };
  },
  { urls: ['<all_urls>'], types: ['xmlhttprequest', 'media'] },
  ['responseHeaders']
);

chrome.tabs.onRemoved.addListener((tabId) => detectedM3U8.delete(tabId));

// ─── Extração do Bearer Token ─────────────────────────────────────────────────

function _extractBearerToken(headers) {
  for (const header of headers) {
    if (header.name.toLowerCase() === 'authorization') {
      const value = header.value ?? '';
      return value.startsWith('Bearer ') ? value.slice(7) : null;
    }
  }
  return null;
}

async function _persistToken(token) {
  await chrome.storage.local.set({ token });
}

async function _broadcastToken(token) {
  if (token === cachedToken) return;
  cachedToken = token;
  const tabs  = await chrome.tabs.query({});
  await Promise.allSettled(
    tabs.map((tab) =>
      chrome.tabs.sendMessage(tab.id, { type: MSG.TOKEN, token }).catch(() => {})
    )
  );
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  async (details) => {
    const token = _extractBearerToken(details.requestHeaders ?? []);
    if (token) {
      await _persistToken(token);
      await _broadcastToken(token);
    }
    return { requestHeaders: details.requestHeaders };
  },
  { urls: [GRAPHQL_ENDPOINT] },
  ['requestHeaders']
);

// ─── Roteador de mensagens ────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  // ── Focus Freeze ──────────────────────────────────────────────────────────
  if (msg.type?.startsWith('FF_')) {
    (async () => {
      switch (msg.type) {
        case MSG.FF_GET_STATE: {
          const state = await ff_loadState();
          respond({ ok: true, state });
          break;
        }
        case MSG.FF_SET_STATE: {
          const next = await ff_updateState(msg.patch);
          respond({ ok: true, state: next });
          _ff_broadcastConfig(next);
          break;
        }
        case MSG.FF_GET_STATS: {
          const state = await ff_loadState();
          respond({ ok: true, stats: state.stats });
          break;
        }
        case MSG.FF_RESET_STATS: {
          const next = await ff_updateState({
            stats: { ...FF_DEFAULT_STATE.stats, sessionStart: Date.now() },
          });
          respond({ ok: true, stats: next.stats });
          break;
        }
        case MSG.FF_STAT_INCREMENT: {
          const state = await ff_loadState();
          const key   = msg.key;
          if (key in state.stats && typeof state.stats[key] === 'number') {
            state.stats[key] += (msg.amount || 1);
            await ff_saveState(state);
          }
          respond({ ok: true });
          break;
        }
        case MSG.FF_PING:
          respond({ ok: true, type: MSG.FF_PONG });
          break;
        default:
          respond({ ok: false, error: 'Unknown FF message type' });
      }
    })();
    return true; // async response
  }

  // ── Cogna relay ───────────────────────────────────────────────────────────
  if (msg.type === MSG.COGNA_URL_FOUND) {
    chrome.storage.local.set({
      urlCogna:      msg.url,
      nomeAula:      msg.nomeAula  ?? null,
      ultimaCaptura: msg.timestamp ?? new Date().toISOString(),
    });

    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type:      MSG.COGNA_URL_FOUND,
        url:       msg.url,
        nomeAula:  msg.nomeAula,
        timestamp: msg.timestamp,
      }).catch(() => {});
    }
  }
});

// ─── Focus Freeze — injeção de config em novas abas ───────────────────────────

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status !== 'loading') return;
  const state = await ff_loadState();
  if (!state.enabled) return;
  setTimeout(() => {
    chrome.tabs.sendMessage(tabId, {
      type:   MSG.FF_APPLY_CONFIG,
      config: ff_buildConfig(state),
    }).catch(() => {});
  }, 30);
});

// ─── Helpers internos ─────────────────────────────────────────────────────────

async function _ff_broadcastConfig(state) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.id) continue;
    chrome.tabs.sendMessage(tab.id, {
      type:   MSG.FF_APPLY_CONFIG,
      config: ff_buildConfig(state),
    }).catch(() => {});
  }
}
