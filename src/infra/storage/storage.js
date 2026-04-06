/**
 * @file src/infra/storage/storage.js
 * @description Abstração sobre chrome.storage.local.
 *              Promisifica as APIs e centraliza o tratamento de erros.
 */

'use strict';

const AppStorage = (() => {
  /**
   * Lê um ou mais valores do storage.
   * @param {string|string[]} keys
   * @returns {Promise<Object>}
   */
  function get(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Persiste um ou mais pares chave-valor.
   * @param {Object} items
   * @returns {Promise<void>}
   */
  function set(items) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(items, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Remove chaves do storage.
   * @param {string|string[]} keys
   * @returns {Promise<void>}
   */
  function remove(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Limpa todo o storage local da extensão.
   * @returns {Promise<void>}
   */
  function clear() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  return { get, set, remove, clear };
})();
