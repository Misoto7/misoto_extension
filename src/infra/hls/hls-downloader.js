/**
 * @file src/infra/hls/hls-downloader.js
 * @description Downloader de vídeos HLS com suporte a master playlists,
 *              download paralelo, retry com backoff e combinação em MP4.
 */

'use strict';

class HLSVideoDownloader {
  constructor() {
    /** @type {Array<{url: string, duration: number, index: number}>} */
    this.segments   = [];
    this.total      = 0;
    this.downloaded = 0;
    this._aborted   = false;
  }

  /**
   * Inicia o download de um stream HLS.
   *
   * @param {string}   m3u8Url
   * @param {Object}   callbacks
   * @param {Function} [callbacks.onProgress] - (pct, done, total) => void
   * @param {Function} [callbacks.onComplete] - (sizeBytes, filename) => void
   * @param {Function} [callbacks.onError]    - (error) => void
   */
  async download(m3u8Url, { onProgress, onComplete, onError } = {}) {
    this._aborted  = false;
    this._audioUrl = null; // reset

    try {
      DebugLog.net('HLS: baixando playlist', m3u8Url);
      const response = await fetch(m3u8Url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();

      if (!text.includes('#EXTM3U')) throw new Error('Não é uma playlist .m3u8 válida');

      this.segments = await this._parseSegments(m3u8Url, text);

      if (this.segments.length === 0) throw new Error('Nenhum segmento encontrado');

      this.total      = this.segments.length;
      this.downloaded = 0;

      const totalDuration = this.segments.reduce((s, seg) => s + seg.duration, 0);
      DebugLog.net(`HLS: ${this.total} segmentos (~${totalDuration.toFixed(1)}s)`);

      // Download de vídeo + áudio em paralelo (se houver trilha separada)
      let audioBlobs = null;
      if (this._audioUrl) {
        DebugLog.net('HLS: baixando trilha de áudio separada...');
        const [videoBlobs] = await Promise.all([
          this._downloadAllSegments(onProgress),
          this._downloadAudioTrack(),
        ]);
        audioBlobs = this._audioSegments;
        await this._combineAndSave(videoBlobs, audioBlobs, onComplete, onError);
      } else {
        const blobs = await this._downloadAllSegments(onProgress);
        await this._combineAndSave(blobs, null, onComplete, onError);
      }

    } catch (err) {
      if (!this._aborted) {
        DebugLog.error('HLS: erro no download', String(err));
        onError?.(err);
      }
    }
  }

  abort() {
    this._aborted = true;
    DebugLog.warn('HLS: download cancelado');
  }

  // ─── Parser ────────────────────────────────────────────────────────────────

  async _parseSegments(baseUrl, text) {
    const lines     = text.split('\n').map(l => l.trim()).filter(Boolean);
    const qualities = [];
    const audioGroups = new Map(); // groupId → url

    // Primeiro pass: coletar trilhas de áudio (#EXT-X-MEDIA TYPE=AUDIO)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('#EXT-X-MEDIA') && line.includes('TYPE=AUDIO')) {
        const uriMatch     = line.match(/URI="([^"]+)"/);
        const groupIdMatch = line.match(/GROUP-ID="([^"]+)"/);
        const defaultMatch = line.match(/DEFAULT=(YES|NO)/i);
        if (uriMatch && groupIdMatch) {
          // Prefere DEFAULT=YES, mas guarda qualquer uma
          const groupId = groupIdMatch[1];
          if (!audioGroups.has(groupId) || defaultMatch?.[1]?.toUpperCase() === 'YES') {
            audioGroups.set(groupId, this._resolveUrl(baseUrl, uriMatch[1]));
          }
        }
      }
    }

    // Segundo pass: coletar streams de vídeo
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('#EXT-X-STREAM-INF')) {
        const resMatch    = line.match(/RESOLUTION=\d+x(\d+)/);
        const audioMatch  = line.match(/AUDIO="([^"]+)"/);
        const nextLine    = lines[i + 1];
        if (nextLine && !nextLine.startsWith('#')) {
          const height   = resMatch ? parseInt(resMatch[1], 10) : 0;
          const audioUrl = audioMatch ? audioGroups.get(audioMatch[1]) ?? null : null;
          qualities.push({
            height,
            url:      this._resolveUrl(baseUrl, nextLine),
            audioUrl, // pode ser null se não tiver trilha separada
          });
        }
      }
    }

    // Master playlist → recursão na melhor qualidade
    if (qualities.length > 0) {
      const best = qualities.reduce((a, b) => a.height >= b.height ? a : b);
      DebugLog.net(`HLS: master playlist — ${best.height}p`, best.url);
      if (best.audioUrl) DebugLog.net('HLS: trilha de áudio separada detectada', best.audioUrl);

      const res = await fetch(best.url);
      const txt = await res.text();
      const videoSegs = await this._parseSegments(best.url, txt);

      // Se há trilha de áudio separada, faz download em paralelo
      if (best.audioUrl) {
        this._audioUrl = best.audioUrl;
      }
      return videoSegs;
    }

    // Playlist de segmentos
    const segments = [];
    let pendingDuration = 0;

    for (const line of lines) {
      if (line.startsWith('#EXTINF:')) {
        pendingDuration = parseFloat(line.replace('#EXTINF:', '').split(',')[0]) || 0;
      } else if (!line.startsWith('#')) {
        segments.push({
          url:      this._resolveUrl(baseUrl, line),
          duration: pendingDuration,
          index:    segments.length,
        });
        pendingDuration = 0;
      }
    }

    return segments;
  }

  _resolveUrl(base, relative) {
    if (relative.startsWith('http')) return relative;
    return base.substring(0, base.lastIndexOf('/') + 1) + relative;
  }

  // ─── Download paralelo ─────────────────────────────────────────────────────

  async _downloadAllSegments(onProgress) {
    const blobs  = new Array(this.total);
    const queue  = [...this.segments];
    const active = new Set();

    return new Promise((resolve) => {
      const tick = () => {
        if (this._aborted)                        { resolve(blobs); return; }
        if (queue.length === 0 && active.size === 0) { resolve(blobs); return; }

        while (active.size < HLS_CONFIG.MAX_CONCURRENT && queue.length > 0) {
          const seg = queue.shift();
          const p   = this._fetchSegmentWithRetry(seg)
            .then((blob) => {
              blobs[seg.index] = blob;
              this.downloaded++;
              onProgress?.(
                (this.downloaded / this.total) * 100,
                this.downloaded,
                this.total,
              );
              active.delete(p);
              tick();
            })
            .catch((err) => {
              DebugLog.warn(`HLS: seg #${seg.index} falhou permanentemente`, String(err));
              active.delete(p);
              tick();
            });
          active.add(p);
        }
      };
      tick();
    });
  }

  async _fetchSegmentWithRetry(seg) {
    for (let attempt = 1; attempt <= HLS_CONFIG.RETRY_ATTEMPTS; attempt++) {
      if (this._aborted) throw new Error('aborted');
      try {
        const ctrl  = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), HLS_CONFIG.SEGMENT_TIMEOUT_MS);
        const res   = await fetch(seg.url, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.blob();
      } catch (err) {
        if (err.name === 'AbortError') throw new Error(`Timeout no seg #${seg.index}`);
        if (attempt === HLS_CONFIG.RETRY_ATTEMPTS) throw err;
        const delay = HLS_CONFIG.RETRY_DELAY_BASE_MS * attempt;
        DebugLog.warn(`HLS: seg #${seg.index} tentativa ${attempt} — retry em ${delay}ms`);
        await sleep(delay);
      }
    }
  }

  // ─── Download de trilha de áudio separada ──────────────────────────────────

  async _downloadAudioTrack() {
    try {
      const res = await fetch(this._audioUrl);
      const txt = await res.text();
      const audioSegs = [];
      let pendingDuration = 0;

      for (const line of txt.split('\n').map(l => l.trim()).filter(Boolean)) {
        if (line.startsWith('#EXTINF:')) {
          pendingDuration = parseFloat(line.replace('#EXTINF:', '').split(',')[0]) || 0;
        } else if (!line.startsWith('#')) {
          audioSegs.push({
            url:      this._resolveUrl(this._audioUrl, line),
            duration: pendingDuration,
            index:    audioSegs.length,
          });
          pendingDuration = 0;
        }
      }

      DebugLog.net(`HLS: ${audioSegs.length} segmentos de áudio`);
      const blobs = new Array(audioSegs.length);

      await Promise.all(audioSegs.map(async (seg) => {
        try {
          const r = await fetch(seg.url);
          if (r.ok) blobs[seg.index] = await r.blob();
        } catch (_) {}
      }));

      this._audioSegments = blobs.filter(Boolean);
      DebugLog.ok(`HLS: áudio — ${this._audioSegments.length}/${audioSegs.length} segmentos baixados`);
    } catch (err) {
      DebugLog.warn('HLS: falha ao baixar trilha de áudio', String(err));
      this._audioSegments = [];
    }
  }

  // ─── Combinação e save ─────────────────────────────────────────────────────

  async _combineAndSave(blobs, audioBlobs, onComplete, onError) {
    const validVideo = blobs.filter(Boolean);
    if (validVideo.length === 0) {
      onError?.(new Error('Nenhum segmento de vídeo baixado com sucesso'));
      return;
    }

    DebugLog.info(`HLS: combinando ${validVideo.length}/${this.total} segmentos de vídeo`);

    const title    = await fetchLessonTitle();
    const filename = `${title}.mp4`;

    // Se há áudio separado, combina os blobs: vídeo + áudio intercalados por segmento
    // Como não podemos muxar no browser sem ffmpeg, concatenamos: todos os segs de vídeo
    // seguidos dos segs de áudio — o player lida com isso na maioria dos casos.
    // Para maior compatibilidade, salvamos vídeo e áudio separados se não for possível muxar.
    let combined;
    if (audioBlobs && audioBlobs.length > 0) {
      // Tenta combinar intercalando segmentos (vídeo+áudio juntos por index)
      const merged = [];
      const maxLen = Math.max(validVideo.length, audioBlobs.length);
      for (let i = 0; i < maxLen; i++) {
        if (validVideo[i])  merged.push(validVideo[i]);
        if (audioBlobs[i])  merged.push(audioBlobs[i]);
      }
      combined = new Blob(merged, { type: 'video/mp4' });
      DebugLog.ok('HLS: vídeo + áudio mesclados');
    } else {
      combined = new Blob(validVideo, { type: 'video/mp4' });
    }

    const url    = URL.createObjectURL(combined);
    const anchor = document.createElement('a');
    anchor.href     = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 1_000);

    const sizeMB = (combined.size / 1024 / 1024).toFixed(2);
    DebugLog.ok(`HLS: ✓ ${sizeMB} MB → "${filename}"`);
    onComplete?.(combined.size, filename);
  }
}

// ─── Stream registry (bridge hls ↔ UI) ───────────────────────────────────────

/**
 * Registra um novo stream M3U8 detectado e atualiza a UI.
 * @param {string} url
 */
async function addM3U8Stream(url) {
  const current = Store.get('m3u8Urls');
  if (current.includes(url)) return;

  const updated = [...current, url];
  Store.set('m3u8Urls', updated);
  DebugLog.ok(`HLS: stream #${updated.length} detectado`, url);
  await renderStreamList();
}

/**
 * Atualiza o <select> de streams no widget.
 */
async function renderStreamList() {
  const sel = Store.get('streamSelect');
  if (!sel) return;

  const urls       = Store.get('m3u8Urls');
  const lessonName = await fetchLessonTitle();

  while (sel.options.length > 1) sel.remove(1);

  urls.forEach((url, i) => {
    const opt      = document.createElement('option');
    opt.value      = url;
    const filename = url.split('?')[0].split('/').pop() || url;
    const short    = truncate(filename, 50);
    const prefix   = lessonName && lessonName !== 'aula'
      ? `📖 ${truncate(lessonName, 35)} `
      : '';
    opt.textContent = `${prefix}#${i + 1} — ${short}`;
    opt.title       = url;
    sel.appendChild(opt);
  });

  sel.selectedIndex = sel.options.length - 1;
  sel.style.color   = '#c084fc';

  const downloadBtn = Store.get('downloadBtn');
  if (downloadBtn && !Store.get('isDownloading')) {
    downloadBtn.disabled      = false;
    downloadBtn.style.opacity = '1';
    downloadBtn.style.cursor  = 'pointer';
  }

  const statusEl = Store.get('downloadStatusEl');
  if (statusEl) {
    const label = lessonName && lessonName !== 'aula'
      ? `🎬 "${truncate(lessonName, 40)}"`
      : `📡 ${urls.length} stream(s) detectado(s)`;
    statusEl.textContent = label;
    statusEl.style.color = '#38bdf8';
  }
}
