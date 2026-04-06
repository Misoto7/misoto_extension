/**
 * @file src/core/rate-limiter/rate-limiter.js
 * @description Rate limiter com janela deslizante, penalidade 429 progressiva
 *              e fila serializada para evitar race conditions de token.
 */

'use strict';

const RateLimiter = (() => {
  // ─── Estado ────────────────────────────────────────────────────────────────

  /** Timestamps (ms) das requisições dentro da janela atual */
  const _timestamps    = [];
  let   _penaltyMs     = 0;
  let   _consecutive429 = 0;

  /**
   * Fila serializada — garante que apenas uma requisição execute por vez,
   * eliminando race conditions quando múltiplas chamadas chegam simultaneamente.
   */
  let _queue = Promise.resolve();

  // ─── Janela deslizante ─────────────────────────────────────────────────────

  function _pruneWindow() {
    const cutoff = Date.now() - RATE_LIMIT.WINDOW_MS;
    while (_timestamps.length > 0 && _timestamps[0] < cutoff) {
      _timestamps.shift();
    }
    return _timestamps.length;
  }

  function _waitTime() {
    const count = _pruneWindow();

    if (_penaltyMs > 0) return _penaltyMs;

    if (count >= RATE_LIMIT.MAX_REQUESTS_PER_WINDOW) {
      const oldest    = _timestamps[0];
      const expiresIn = (oldest + RATE_LIMIT.WINDOW_MS) - Date.now();
      return Math.max(0, expiresIn) + RATE_LIMIT.BACKOFF_MS;
    }

    return 0;
  }

  function _recordSuccess() {
    _timestamps.push(Date.now());
    _consecutive429 = 0;
    _penaltyMs      = 0;
  }

  function _record429() {
    _consecutive429++;
    const factor  = Math.pow(RATE_LIMIT.BACKOFF_MULTIPLIER, _consecutive429 - 1);
    _penaltyMs    = Math.min(RATE_LIMIT.PENALTY_MS * factor, RATE_LIMIT.MAX_BACKOFF_MS);

    DebugLog.warn(
      `RateLimiter: HTTP 429 #${_consecutive429} — backoff ${(_penaltyMs / 1000).toFixed(1)}s`
    );

    setTimeout(() => { _penaltyMs = 0; }, _penaltyMs);
  }

  // ─── API pública ───────────────────────────────────────────────────────────

  /**
   * Agenda a execução de `fn` respeitando rate limit.
   * Chamadas são serializadas — nunca executam em paralelo.
   *
   * @template T
   * @param {() => Promise<T>} fn
   * @returns {Promise<T>}
   */
  function schedule(fn) {
    _queue = _queue.then(async () => {
      const wait = _waitTime();
      if (wait > 0) {
        DebugLog.warn(`RateLimiter: aguardando ${(wait / 1000).toFixed(1)}s`);
        await sleep(wait);
      }
    });

    return _queue.then(async () => {
      try {
        const result = await fn();
        _recordSuccess();
        return result;
      } catch (err) {
        if (String(err).includes('429')) _record429();
        throw err;
      }
    });
  }

  function getStats() {
    return {
      requestsInWindow: _pruneWindow(),
      maxPerWindow:     RATE_LIMIT.MAX_REQUESTS_PER_WINDOW,
      windowMs:         RATE_LIMIT.WINDOW_MS,
      penaltyActive:    _penaltyMs > 0,
      penaltyMs:        _penaltyMs,
      consecutive429:   _consecutive429,
    };
  }

  function reset() {
    _timestamps.length = 0;
    _penaltyMs         = 0;
    _consecutive429    = 0;
    _queue             = Promise.resolve();
    DebugLog.info('RateLimiter: estado resetado');
  }

  return { schedule, getStats, reset };
})();
