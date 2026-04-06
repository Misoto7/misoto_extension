/**
 * @file src/features/video-download/video-download.service.js
 * @description Gerencia o ciclo de vida do download de vídeos HLS.
 *              Bridge entre a UI e o HLSVideoDownloader.
 */

'use strict';

const VideoDownloadService = (() => {
  /** @type {HLSVideoDownloader|null} */
  let _currentDownloader = null;

  /**
   * Inicia o download de uma URL M3U8.
   *
   * @param {string}   m3u8Url
   * @param {Object}   callbacks
   * @param {Function} [callbacks.onProgress]  - (pct, done, total) => void
   * @param {Function} [callbacks.onComplete]  - (sizeBytes, filename) => void
   * @param {Function} [callbacks.onError]     - (error) => void
   * @param {Function} [callbacks.onStateChange] - (isDownloading) => void
   */
  function download(m3u8Url, { onProgress, onComplete, onError, onStateChange } = {}) {
    if (Store.get('isDownloading')) {
      DebugLog.warn('VideoDownload: download já em andamento');
      return;
    }

    if (!m3u8Url) {
      DebugLog.warn('VideoDownload: URL não fornecida');
      onError?.(new Error('URL M3U8 não fornecida'));
      return;
    }

    Store.set('isDownloading', true);
    onStateChange?.(true);
    EventBus.emit(EVENTS.DOWNLOAD_STARTED, { url: m3u8Url });

    _currentDownloader = new HLSVideoDownloader();

    _currentDownloader.download(m3u8Url, {
      onProgress: (pct, done, total) => {
        onProgress?.(pct, done, total);
        EventBus.emit(EVENTS.DOWNLOAD_PROGRESS, { pct, done, total });
      },
      onComplete: (sizeBytes, filename) => {
        Store.set('isDownloading', false);
        _currentDownloader = null;
        onStateChange?.(false);
        onComplete?.(sizeBytes, filename);
        EventBus.emit(EVENTS.DOWNLOAD_COMPLETE, { sizeBytes, filename });
      },
      onError: (err) => {
        Store.set('isDownloading', false);
        _currentDownloader = null;
        onStateChange?.(false);
        onError?.(err);
        EventBus.emit(EVENTS.DOWNLOAD_ERROR, { error: err });
      },
    });
  }

  /**
   * Cancela o download em andamento.
   */
  function abort() {
    _currentDownloader?.abort();
    Store.set('isDownloading', false);
    _currentDownloader = null;
  }

  return { download, abort };
})();
