/**
 * @file src/core/state/store.js
 * @description Store reativo global da extensão Misoto.
 *
 * Padrão Observer leve com suporte a:
 *  - Leitura/escrita tipada
 *  - Listeners por chave
 *  - Batch updates (múltiplas chaves em um set())
 *  - Middleware (intercepta mudanças antes de aplicar)
 *  - Snapshot para debug
 */

'use strict';

const Store = (() => {
  // ─── Estado interno ────────────────────────────────────────────────────────

  /** @type {Map<string, Set<Function>>} */
  const _listeners = new Map();

  /** @type {Function[]} Middlewares registrados */
  const _middlewares = [];

  const _state = {
    // ── Sessão ──────────────────────────────────────────────────────────────
    sessionToken:    null,
    studentId:       null,

    // ── Auto-loop ────────────────────────────────────────────────────────────
    isAutoRunning:   false,
    autoLoopCount:   0,
    autoIntervalMs:  UI.AUTO_INTERVAL_DEFAULT_MS,

    // ── Contadores ───────────────────────────────────────────────────────────
    successCount:    0,
    errorCount:      0,
    lastStatus:      null,
    lastStatusTime:  null,

    // ── HLS / Download ───────────────────────────────────────────────────────
    m3u8Urls:        [],
    isDownloading:   false,

    // ── Cogna ────────────────────────────────────────────────────────────────
    cognaUrl:        null,
    cognaUrlNome:    null,
    cognaCaptura:    null,

    // ── UI refs (não disparam listeners externos) ────────────────────────────
    widgetRoot:        null,
    autoButton:        null,
    stopButton:        null,
    dataArea:          null,
    debugPanel:        null,
    debugLogContainer: null,
    debugOpen:         false,
    downloadBtn:       null,
    downloadStatusEl:  null,
    streamSelect:      null,

    // ── UI internals ─────────────────────────────────────────────────────────
    _toastStack:       null,
  };

  // ─── Leitura ───────────────────────────────────────────────────────────────

  /**
   * Retorna o valor atual de uma chave.
   * @template T
   * @param {string} key
   * @returns {T}
   */
  function get(key) {
    return _state[key];
  }

  /**
   * Retorna um snapshot imutável do estado atual (útil para debug/export).
   * @returns {Object}
   */
  function snapshot() {
    return JSON.parse(JSON.stringify(_state, (k, v) => {
      if (v instanceof Element || v instanceof HTMLElement) return '[DOM element]';
      return v;
    }));
  }

  // ─── Escrita ───────────────────────────────────────────────────────────────

  /**
   * Atualiza uma ou múltiplas chaves de estado.
   * @param {string|Object} keyOrObj
   * @param {*} [value]
   */
  function set(keyOrObj, value) {
    if (typeof keyOrObj === 'string') {
      _applyChange(keyOrObj, value);
    } else if (keyOrObj && typeof keyOrObj === 'object') {
      for (const [k, v] of Object.entries(keyOrObj)) {
        _applyChange(k, v);
      }
    }
  }

  /**
   * Aplica uma mudança, passando por middlewares antes de commitar.
   * @private
   */
  function _applyChange(key, nextValue) {
    if (!(key in _state)) {
      console.warn(`[Store] Tentativa de set em chave desconhecida: "${key}"`);
    }

    const prevValue = _state[key];

    // Passa por middlewares (podem bloquear ou transformar)
    let value = nextValue;
    for (const mw of _middlewares) {
      const result = mw(key, value, prevValue);
      if (result === false) return; // middleware bloqueou
      if (result !== undefined) value = result; // middleware transformou
    }

    _state[key] = value;

    if (prevValue !== value) {
      _notify(key, value, prevValue);
    }
  }

  // ─── Observadores ─────────────────────────────────────────────────────────

  /**
   * Registra um listener para mudanças em uma chave.
   * @param {string} key
   * @param {Function} fn - (newValue, prevValue) => void
   * @returns {Function} unsubscribe
   */
  function on(key, fn) {
    if (!_listeners.has(key)) _listeners.set(key, new Set());
    _listeners.get(key).add(fn);
    return () => off(key, fn);
  }

  /**
   * Remove um listener.
   * @param {string} key
   * @param {Function} fn
   */
  function off(key, fn) {
    _listeners.get(key)?.delete(fn);
  }

  /**
   * Registra um listener que dispara apenas uma vez.
   * @param {string} key
   * @param {Function} fn
   * @returns {Function} unsubscribe
   */
  function once(key, fn) {
    const unsub = on(key, (...args) => {
      fn(...args);
      unsub();
    });
    return unsub;
  }

  /**
   * Notifica listeners de uma chave.
   * @private
   */
  function _notify(key, newVal, prevVal) {
    _listeners.get(key)?.forEach((fn) => {
      try {
        fn(newVal, prevVal);
      } catch (err) {
        console.error(`[Store] Erro em listener de "${key}":`, err);
      }
    });
  }

  // ─── Middleware ────────────────────────────────────────────────────────────

  /**
   * Registra um middleware de transformação/validação.
   * Retorne `false` para cancelar a mudança.
   * Retorne um valor para substituí-lo.
   * Retorne `undefined` para deixar passar.
   *
   * @param {Function} fn - (key, nextValue, prevValue) => value | false | undefined
   */
  function use(fn) {
    _middlewares.push(fn);
  }

  // ─── API pública ───────────────────────────────────────────────────────────

  return { get, set, on, off, once, use, snapshot };
})();

// ─── Atalhos retrocompatíveis ─────────────────────────────────────────────────

/** @deprecated Use Store.get() */
const State = Store;
const getToken        = () => Store.get('sessionToken');
const getStudentId    = () => Store.get('studentId');
const isAutoRunning   = () => Store.get('isAutoRunning');
const getAutoInterval = () => Store.get('autoIntervalMs');
