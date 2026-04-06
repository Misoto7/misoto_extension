/**
 * @file src/shared/events.js
 * @description Event Bus global da extensão Misoto.
 *
 * Desacopla completamente os módulos entre si:
 *  - Features publicam eventos sem conhecer os consumidores
 *  - UI se inscreve em eventos sem conhecer as features
 *  - Facilita testes e substituição de implementações
 *
 * Convenção de nomes: 'domínio:ação'
 * Exemplos: 'token:updated', 'lesson:marked', 'stream:detected'
 */

'use strict';

const EventBus = (() => {
  /** @type {Map<string, Set<Function>>} */
  const _subscribers = new Map();

  /**
   * Publica um evento com payload opcional.
   * @param {string} event
   * @param {*}      [payload]
   */
  function emit(event, payload) {
    const handlers = _subscribers.get(event);
    if (!handlers) return;
    for (const fn of handlers) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[EventBus] Erro no handler de "${event}":`, err);
      }
    }
  }

  /**
   * Inscreve-se em um evento.
   * @param {string}   event
   * @param {Function} fn - (payload) => void
   * @returns {Function} unsubscribe
   */
  function on(event, fn) {
    if (!_subscribers.has(event)) _subscribers.set(event, new Set());
    _subscribers.get(event).add(fn);
    return () => off(event, fn);
  }

  /**
   * Remove uma inscrição.
   * @param {string}   event
   * @param {Function} fn
   */
  function off(event, fn) {
    _subscribers.get(event)?.delete(fn);
  }

  /**
   * Inscreve-se em um evento apenas uma vez.
   * @param {string}   event
   * @param {Function} fn
   * @returns {Function} unsubscribe
   */
  function once(event, fn) {
    const unsub = on(event, (payload) => {
      fn(payload);
      unsub();
    });
    return unsub;
  }

  /**
   * Remove todas as inscrições de um evento.
   * @param {string} event
   */
  function clear(event) {
    _subscribers.delete(event);
  }

  return { emit, on, off, once, clear };
})();

// ─── Catálogo de eventos ──────────────────────────────────────────────────────
// Documentados aqui para facilitar descoberta. Não é exaustivo.

const EVENTS = Object.freeze({
  // Token
  TOKEN_UPDATED:       'token:updated',

  // Cogna
  COGNA_URL_FOUND:     'cogna:url_found',

  // Aula
  LESSON_MARKED:       'lesson:marked',
  LESSON_MARK_FAILED:  'lesson:mark_failed',
  AUTO_LOOP_STARTED:   'auto:loop_started',
  AUTO_LOOP_STOPPED:   'auto:loop_stopped',
  AUTO_LOOP_CYCLE:     'auto:loop_cycle',

  // HLS
  STREAM_DETECTED:     'stream:detected',
  DOWNLOAD_STARTED:    'download:started',
  DOWNLOAD_PROGRESS:   'download:progress',
  DOWNLOAD_COMPLETE:   'download:complete',
  DOWNLOAD_ERROR:      'download:error',

  // Focus Freeze
  FF_CONFIG_APPLIED:   'ff:config_applied',
  FF_STAT_CHANGED:     'ff:stat_changed',

  // UI
  UI_WIDGET_READY:     'ui:widget_ready',
  UI_DEBUG_TOGGLED:    'ui:debug_toggled',
});
