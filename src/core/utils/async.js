/**
 * @file src/core/utils/async.js
 * @description Utilitários para controle de fluxo assíncrono.
 */

'use strict';

/**
 * Aguarda N milissegundos.
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Throttle — limita a frequência de chamadas de uma função.
 * Usa rAF para sincronizar com o ciclo de renderização quando possível.
 *
 * @param {Function} fn
 * @param {number} limitMs
 * @returns {Function}
 */
function throttle(fn, limitMs) {
  let lastCall = 0;
  let rafId    = null;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= limitMs) {
      lastCall = now;
      fn.apply(this, args);
    } else {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        lastCall = Date.now();
        fn.apply(this, args);
      });
    }
  };
}

/**
 * Debounce — adia a execução até que as chamadas parem.
 *
 * @param {Function} fn
 * @param {number} waitMs
 * @returns {Function}
 */
function debounce(fn, waitMs) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), waitMs);
  };
}

/**
 * Mutex simples baseado em Promise Chain.
 * Garante execução serial de tarefas assíncronas.
 *
 * @returns {{ run: (fn: Function) => Promise<any> }}
 *
 * @example
 * const mutex = createMutex();
 * await mutex.run(async () => { ... });
 */
function createMutex() {
  let _queue = Promise.resolve();
  return {
    run(fn) {
      _queue = _queue.then(() => fn()).catch(() => {});
      return _queue;
    },
  };
}

/**
 * Retry com backoff exponencial.
 *
 * @param {Function} fn            - Função async a tentar
 * @param {number}   attempts      - Número máximo de tentativas
 * @param {number}   baseDelayMs   - Delay base (dobra a cada falha)
 * @returns {Promise<any>}
 * @throws {Error} Após esgotar as tentativas
 */
async function retryWithBackoff(fn, attempts = 3, baseDelayMs = 1_000) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts) await sleep(baseDelayMs * i);
    }
  }
  throw lastErr;
}
