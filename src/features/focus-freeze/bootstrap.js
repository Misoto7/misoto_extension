// ============================================================
// src/content-bootstrap.js  — world: MAIN, run_at: document_start
// FOCUS FREEZE v4.0 — hardened core
//
// CORREÇÃO: _freezeGeometry() agora usa screen.width/height
// para eliminar divergência entre innerWidth e screen.width
// ============================================================

(function () {
  'use strict';

  // ─── Captura das referências nativas ANTES de qualquer patch ─────
  const _native = Object.freeze({
    defineProperty:           Object.defineProperty.bind(Object),
    getOwnPropertyDescriptor: Object.getOwnPropertyDescriptor.bind(Object),
    getOwnPropertyNames:      Object.getOwnPropertyNames.bind(Object),
    freeze:                   Object.freeze.bind(Object),
    keys:                     Object.keys.bind(Object),
    assign:                   Object.assign.bind(Object),
    addEventListener:         EventTarget.prototype.addEventListener,
    removeEventListener:      EventTarget.prototype.removeEventListener,
    dispatchEvent:            EventTarget.prototype.dispatchEvent,
    fnToString:               Function.prototype.toString,
    setTimeout:               window.setTimeout.bind(window),
    setInterval:              window.setInterval.bind(window),
    clearTimeout:             window.clearTimeout.bind(window),
    clearInterval:            window.clearInterval.bind(window),
    requestAnimationFrame:    window.requestAnimationFrame?.bind(window),
    cancelAnimationFrame:     window.cancelAnimationFrame?.bind(window),
    requestIdleCallback:      window.requestIdleCallback?.bind(window),
    performanceNow:           performance.now.bind(performance),
    errorCaptureStackTrace:   Error.captureStackTrace,
    fetch:                    window.fetch?.bind(window),
    sendBeacon:               navigator.sendBeacon?.bind(navigator),
    postMessage:              window.postMessage?.bind(window),
  });

  // ─── Configuração padrão ─────────────────────────────────────────
  const DEFAULT_CFG = {
    enabled:           true,
    blockBlur:         true,
    blockVisibility:   true,
    blockKeyDetection: false,
    blockMouseLeave:   true,
    blockResize:       true,
    blockIdle:         true,
    blockTimers:       true,
    blockBattery:      true,
    blockNetwork:      true,
    blockPointerLock:  true,
    blockPageLifecycle:true,
    blockFullscreen:   true,
    fakeHeartbeat:     true,
    unlockClipboard:   true
  };

  // ─── Estatísticas ────────────────────────────────────────────────
  const _stats = {
    counts: { eventsBlocked:0, timersIntercepted:0, blurBlocked:0, visibilityBlocked:0 },
    record(key, n = 1) { if (key in this.counts) this.counts[key] += n; },
    flush() {
      _native.setTimeout(() => {
        try {
          window.dispatchEvent(new CustomEvent('__ff_stats', { detail: { ...this.counts } }));
        } catch (_) {}
      }, 0);
    }
  };

  _native.setInterval(() => _stats.flush(), 2000);

  let _cfg         = { ...DEFAULT_CFG };
  let _initialized = false;

  // ─── Blocklist global de eventos ─────────────────────────────────
  // NOTA: 'beforeunload' e 'unload' foram REMOVIDOS intencionalmente.
  // Esses eventos são de navegação (não de detecção de foco) e bloqueá-los
  // quebra SPAs como YouTube e gera erro de Permissions Policy no Instagram.
  // 'pagehide' e 'freeze' são controlados dinamicamente via _cfg.blockPageLifecycle.
  // Mapa evento → chave de módulo em _cfg.
  // O interceptor consulta _cfg[módulo] em runtime para cada evento,
  // permitindo que módulos Custom sejam ligados/desligados sem recarregar.
  const _eventModuleMap = {
    // blockVisibility
    'visibilitychange':            'blockVisibility',
    'webkitvisibilitychange':      'blockVisibility',
    'mozvisibilitychange':         'blockVisibility',
    // blockBlur
    'blur':                        'blockBlur',
    'focusout':                    'blockBlur',
    // blockPageLifecycle
    'pagehide':                    'blockPageLifecycle',
    'freeze':                      'blockPageLifecycle',
    'resume':                      'blockPageLifecycle',
    // blockMouseLeave
    'mouseleave':                  'blockMouseLeave',
    'mouseout':                    'blockMouseLeave',
    'pointerleave':                'blockMouseLeave',
    'pointerout':                  'blockMouseLeave',
    'dragleave':                   'blockMouseLeave',
    'dragend':                     'blockMouseLeave',
    // blockFullscreen
    'fullscreenchange':            'blockFullscreen',
    'webkitfullscreenchange':      'blockFullscreen',
    'mozfullscreenchange':         'blockFullscreen',
    'MSFullscreenChange':          'blockFullscreen',
    'fullscreenerror':             'blockFullscreen',
    'webkitfullscreenerror':       'blockFullscreen',
    'mozfullscreenerror':          'blockFullscreen',
    // blockPointerLock
    'pointerlockchange':           'blockPointerLock',
    'pointerlockerror':            'blockPointerLock',
  };

  // Conjunto legado mantido para compatibilidade com __ff_extend_blocklist
  // (eventos adicionados dinamicamente não têm módulo → usam apenas _cfg.enabled)
  const _blocklist = new Set(Object.keys(_eventModuleMap));

  function _shouldBlock(type) {
    if (!_cfg.enabled) return false;
    const mod = _eventModuleMap[type];
    if (mod) return _cfg[mod] !== false; // respeita o módulo individual
    return _blocklist.has(type);         // evento extra sem módulo → checa só enabled
  }

  // ================================================================
  // CAMADA 0 — Spoof Function.prototype.toString
  // ================================================================
  (function installToStringSpoof() {
    const _nativeSet = new WeakSet();
    const spoofed = function toString() {
      if (_nativeSet.has(this)) {
        return `function ${this.name || ''}() { [native code] }`;
      }
      return _native.fnToString.call(this);
    };
    _nativeSet.add(spoofed);
    Function.prototype.toString = spoofed;
    window.__ffMarkNative = function (fn) {
      if (typeof fn === 'function') _nativeSet.add(fn);
    };
    window.__ffMarkNative(spoofed);
  })();

  // ================================================================
  // CAMADA 1 — Propriedades de visibilidade
  // ================================================================
  (function installVisibilityProps() {
    const proto = Document.prototype;

    function forceProp(target, name, value) {
      try {
        _native.defineProperty(target, name, {
          get: () => value,
          set: () => {},
          configurable: false,
          enumerable: true
        });
      } catch (_) {}
    }

    forceProp(proto, 'hidden',                false);
    forceProp(proto, 'webkitHidden',          false);
    forceProp(proto, 'mozHidden',             false);
    forceProp(proto, 'visibilityState',       'visible');
    forceProp(proto, 'webkitVisibilityState', 'visible');
    forceProp(proto, 'mozVisibilityState',    'visible');
    forceProp(proto, 'wasDiscarded',          false);
    forceProp(proto, 'prerendering',          false);

    const fakeHasFocus = function hasFocus() { return true; };
    window.__ffMarkNative(fakeHasFocus);
    proto.hasFocus = fakeHasFocus;

    try {
      const noop = function () {};
      window.__ffMarkNative(noop);
      window.blur = noop;
    } catch (_) {}
  })();

  // ================================================================
  // CAMADA 2 — Interceptação de eventos
  // ================================================================
  (function installEventInterceptor() {
    const wrapped_AEL = function addEventListener(type, listener, options) {
      if (_shouldBlock(type)) {
        _stats.record('eventsBlocked');
        if (type === 'blur' || type === 'focusout') _stats.record('blurBlocked');
        if (type === 'visibilitychange') _stats.record('visibilityBlocked');
        return;
      }
      return _native.addEventListener.call(this, type, listener, options);
    };

    const wrapped_REL = function removeEventListener(type, listener, options) {
      if (_shouldBlock(type)) return;
      return _native.removeEventListener.call(this, type, listener, options);
    };

    const wrapped_DE = function dispatchEvent(event) {
      if (event && _shouldBlock(event.type)) {
        _stats.record('eventsBlocked');
        return true;
      }
      return _native.dispatchEvent.call(this, event);
    };

    window.__ffMarkNative(wrapped_AEL);
    window.__ffMarkNative(wrapped_REL);
    window.__ffMarkNative(wrapped_DE);

    EventTarget.prototype.addEventListener    = wrapped_AEL;
    EventTarget.prototype.removeEventListener = wrapped_REL;
    EventTarget.prototype.dispatchEvent       = wrapped_DE;
  })();

  // ================================================================
  // CAMADA 3 — isTrusted spoofing
  // ================================================================
  (function installIsTrustedSpoof() {
    try {
      const desc = _native.getOwnPropertyDescriptor(Event.prototype, 'isTrusted');
      if (!desc) return;
      const origGet = desc.get;
      const patchedGet = function isTrusted() {
        if (this.__ffSynthetic) return true;
        return origGet.call(this);
      };
      window.__ffMarkNative(patchedGet);
      _native.defineProperty(Event.prototype, 'isTrusted', {
        get: patchedGet,
        configurable: false,
        enumerable: true
      });
    } catch (_) {}
  })();

  // ================================================================
  // CAMADA 4 — getOwnPropertyDescriptor guard
  // ================================================================
  (function installDescriptorGuard() {
    const GUARDED_PROPS = new Set([
      'hidden', 'visibilityState', 'wasDiscarded', 'prerendering',
      'webkitHidden', 'mozHidden', 'webkitVisibilityState',
      'hasFocus', 'fullscreenElement', 'fullscreen', 'fullscreenEnabled',
      'webkitIsFullScreen', 'webkitFullscreenElement',
      'isTrusted', 'userActivation'
    ]);

    const wrappedGOPD = function getOwnPropertyDescriptor(obj, prop) {
      const desc = _native.getOwnPropertyDescriptor(obj, prop);
      if (!desc) return desc;
      if (GUARDED_PROPS.has(prop) && typeof desc.get === 'function') {
        return {
          get: desc.get,
          set: desc.set ?? undefined,
          enumerable: true,
          configurable: false
        };
      }
      return desc;
    };
    window.__ffMarkNative(wrappedGOPD);
    Object.getOwnPropertyDescriptor = wrappedGOPD;
  })();

  // ================================================================
  // CAMADA 5 — Error.stack sanitization
  // ================================================================
  (function installStackSanitizer() {
    try {
      const desc = _native.getOwnPropertyDescriptor(Error.prototype, 'stack');
      if (!desc) return;
      const EXT_PATTERN = /\s+at .*(chrome-extension:\/\/|__ff)[^\n]*/g;
      const origGet = desc.get;
      const patchedGet = function stack() {
        const raw = origGet ? origGet.call(this) : this._stack;
        if (typeof raw !== 'string') return raw;
        return raw.replace(EXT_PATTERN, '');
      };
      window.__ffMarkNative(patchedGet);
      _native.defineProperty(Error.prototype, 'stack', {
        get: patchedGet,
        set: desc.set,
        configurable: true,
        enumerable: false
      });
    } catch (_) {}

    const origOnerror = window.onerror;
    window.onerror = function (msg, src, line, col, err) {
      if (src && /chrome-extension:\/\//.test(src)) return true;
      if (origOnerror) return origOnerror.call(this, msg, src, line, col, err);
      return false;
    };
    window.__ffMarkNative(window.onerror);

    _native.addEventListener.call(window, 'unhandledrejection', (e) => {
      const stack = e.reason?.stack || '';
      if (/chrome-extension:\/\//.test(stack)) e.preventDefault();
    }, { capture: true });
  })();

  // ================================================================
  // CAMADA 6 — navigator.webdriver spoof
  // ================================================================
  (function spoofWebdriver() {
    try {
      _native.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: false,
        enumerable: true
      });
    } catch (_) {}
  })();

  // ================================================================
  // CAMADA 7 — window.name guard
  // ================================================================
  (function guardWindowName() {
    let _name = '';
    try { _name = window.name; } catch (_) {}
    const SUSPICIOUS = /focus|freeze|proctorio|examity|honorlock|respondus|inactive|blur/i;
    if (SUSPICIOUS.test(_name)) _name = '';
    try {
      _native.defineProperty(window, 'name', {
        get: () => _name,
        set: (v) => { if (!SUSPICIOUS.test(String(v))) _name = String(v); },
        configurable: false,
        enumerable: true
      });
    } catch (_) {}
  })();

  // ================================================================
  // CAMADA 8 — Iframe proto guard
  // ================================================================
  (function installIframeProtoGuard() {
    const origCWDesc = _native.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
    if (!origCWDesc?.get) return;

    const patchedCWGet = function contentWindow() {
      const win = origCWDesc.get.call(this);
      if (!win || win === window) return win;
      try { patchChildWindow(win); } catch (_) {}
      return win;
    };
    window.__ffMarkNative(patchedCWGet);
    _native.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
      get: patchedCWGet,
      configurable: true,
      enumerable: true
    });

    const origCDDesc = _native.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentDocument');
    if (origCDDesc?.get) {
      const patchedCDGet = function contentDocument() {
        const doc = origCDDesc.get.call(this);
        if (!doc) return doc;
        try { patchChildDoc(doc); } catch (_) {}
        return doc;
      };
      window.__ffMarkNative(patchedCDGet);
      _native.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', {
        get: patchedCDGet,
        configurable: true
      });
    }

    function patchChildWindow(win) {
      patchChildDoc(win.document);
      try { win.document.hasFocus = () => true; } catch (_) {}
      try {
        _native.defineProperty(win.Document.prototype, 'hidden',
          { get: () => false, configurable: false });
        _native.defineProperty(win.Document.prototype, 'visibilityState',
          { get: () => 'visible', configurable: false });
        _native.defineProperty(win.Document.prototype, 'wasDiscarded',
          { get: () => false, configurable: false });
        win.Document.prototype.hasFocus = () => true;
      } catch (_) {}
    }

    function patchChildDoc(doc) {
      try {
        _native.defineProperty(doc, 'hidden',          { get: () => false,     configurable: false });
        _native.defineProperty(doc, 'visibilityState', { get: () => 'visible', configurable: false });
      } catch (_) {}
    }
  })();

  // ================================================================
  // CAMADA 9 — Web Locks API guard
  // ================================================================
  (function guardWebLocks() {
    if (!navigator.locks) return;
    try {
      const fakeLocks = {
        request: (name, ...args) => {
          const cb = args[args.length - 1];
          if (typeof cb === 'function') return cb({ name, mode: 'exclusive' });
          return Promise.resolve();
        },
        query: () => Promise.resolve({ held: [], pending: [] })
      };
      _native.defineProperty(navigator, 'locks', {
        get: () => fakeLocks,
        configurable: false
      });
    } catch (_) {}
  })();

  // ================================================================
  // CAMADA 10 — performance.now() drift guard
  // ================================================================
  (function guardPerformanceNow() {
    const epochStart  = Date.now();
    const perfStart   = _native.performanceNow();
    const patchedNow = function now() {
      return (Date.now() - epochStart) + perfStart;
    };
    window.__ffMarkNative(patchedNow);
    try {
      _native.defineProperty(Performance.prototype, 'now', {
        value: patchedNow,
        writable: false,
        configurable: false
      });
    } catch (_) {}
    try {
      _native.defineProperty(Object.getPrototypeOf(document.timeline), 'currentTime', {
        get: patchedNow,
        configurable: true
      });
    } catch (_) {}
  })();

  // ================================================================
  // CAMADA 11 — Beacon API filter
  // ================================================================
  (function interceptBeacon() {
    if (!navigator.sendBeacon) return;
    const SUSPICIOUS_URL  = /blur|hidden|inactive|leave|unfocus|focus-?lost/i;
    const SUSPICIOUS_BODY = /blur|hidden|inactive|leave|unfocus|focus-?lost/i;
    const patchedBeacon = function sendBeacon(url, data) {
      const urlStr  = String(url);
      const bodyStr = typeof data === 'string' ? data
                    : data instanceof URLSearchParams ? data.toString()
                    : '';
      if (SUSPICIOUS_URL.test(urlStr) || SUSPICIOUS_BODY.test(bodyStr)) {
        return true;
      }
      return _native.sendBeacon.call(navigator, url, data);
    };
    window.__ffMarkNative(patchedBeacon);
    try {
      _native.defineProperty(navigator, 'sendBeacon', {
        value: patchedBeacon,
        writable: false,
        configurable: false
      });
    } catch (_) {}
  })();

  // ================================================================
  // CAMADA 12 — BroadcastChannel guard
  // ================================================================
  (function guardBroadcastChannel() {
    if (!window.BroadcastChannel) return;
    const OrigBC = window.BroadcastChannel;
    const SUSPICIOUS = /blur|hidden|inactive|unfocus|leave|focus-?lost/i;
    class PatchedBroadcastChannel extends OrigBC {
      postMessage(msg) {
        const str = typeof msg === 'string' ? msg : JSON.stringify(msg ?? '');
        if (SUSPICIOUS.test(str)) return;
        return super.postMessage(msg);
      }
    }
    window.__ffMarkNative(PatchedBroadcastChannel);
    window.BroadcastChannel = PatchedBroadcastChannel;
  })();

  // ================================================================
  // CAMADA 13 — Screen Orientation API
  // ================================================================
  (function guardScreenOrientation() {
    if (!screen.orientation) return;
    try {
      _native.defineProperty(screen, 'orientation', {
        get: () => ({
          type: 'landscape-primary',
          angle: 0,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          lock: () => Promise.resolve(),
          unlock: () => {}
        }),
        configurable: false
      });
    } catch (_) {}
  })();

  // ================================================================
  // CAMADA 14 — navigator.scheduling.isInputPending
  // ================================================================
  (function guardScheduling() {
    try {
      if (navigator.scheduling) {
        const fakeIsInputPending = function isInputPending() { return false; };
        window.__ffMarkNative(fakeIsInputPending);
        navigator.scheduling.isInputPending = fakeIsInputPending;
      }
    } catch (_) {}
  })();

  // ================================================================
  // ======================== INTERCEPTORS =========================
  // ================================================================

  // ⭐ CORREÇÃO: agora usa screen.width/height em vez dos valores reais.
  // scrollX/Y e pageXOffset/Y foram REMOVIDOS do freeze — o YouTube e SPAs
  // usam scroll position para lazy-load de imagens. Congelar em 0 impede
  // o carregamento de thumbnails e causa a página parcialmente em branco.
  function _freezeGeometry() {
    const SW = screen.width || 1920;
    const SH = screen.height || 1080;
    
    const vals = {
      innerWidth:  SW,
      innerHeight: SH,
      outerWidth:  SW,
      outerHeight: SH,
      screenX: 0, screenY: 0, screenLeft: 0, screenTop: 0
      // scrollX, scrollY, pageXOffset, pageYOffset: NÃO congelar —
      // SPAs (YouTube, etc.) dependem desses valores para lazy-load.
    };
    
    for (const [k, v] of Object.entries(vals)) {
      try {
        _native.defineProperty(window, k, { 
          get: () => v, 
          set: () => {}, 
          configurable: false 
        });
      } catch (_) {}
    }
    
    _native.addEventListener.call(window, 'resize', e => e.stopImmediatePropagation(), { capture: true });
  }

  function _spoofBattery() {
    const fake = {
      charging: true, chargingTime: 0, dischargingTime: Infinity, level: 1.0,
      onchargingchange: null, onchargingtimechange: null,
      ondischargingtimechange: null, onlevelchange: null,
      addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true
    };
    if (navigator.getBattery) {
      const fakeFn = function getBattery() { return Promise.resolve(fake); };
      window.__ffMarkNative(fakeFn);
      try {
        _native.defineProperty(navigator, 'getBattery', { value: fakeFn, writable: false, configurable: false });
      } catch (_) {}
    }
  }

  function _spoofNetwork() {
    const fake = {
      type: 'wifi', effectiveType: '4g', downlink: 10, downlinkMax: Infinity,
      rtt: 50, saveData: false, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {}
    };
    for (const prop of ['connection', 'mozConnection', 'webkitConnection']) {
      try {
        _native.defineProperty(navigator, prop, { get: () => fake, configurable: false });
      } catch (_) {}
    }
  }

  function _neutralizePointerLock() {
    try {
      _native.defineProperty(document, 'pointerLockElement', { get: () => null, configurable: false });
    } catch (_) {}
    const noop = () => Promise.resolve();
    window.__ffMarkNative(noop);
    try { Element.prototype.requestPointerLock = noop; } catch (_) {}
    try { document.exitPointerLock = () => {}; } catch (_) {}
  }

  function _interceptTimers() {
    const MAX_TIMEOUT  = 10_000;
    const MAX_INTERVAL = 5_000;

    const patchedST = function setTimeout(fn, delay = 0, ...args) {
      if (!_cfg.blockTimers) return _native.setTimeout(fn, delay, ...args);
      const d = (typeof delay === 'number' && delay > MAX_TIMEOUT) ? MAX_TIMEOUT : delay;
      if (d !== delay) _stats.record('timersIntercepted');
      return _native.setTimeout(fn, d, ...args);
    };
    window.__ffMarkNative(patchedST);
    window.setTimeout = patchedST;

    const patchedSI = function setInterval(fn, interval = 0, ...args) {
      if (!_cfg.blockTimers) return _native.setInterval(fn, interval, ...args);
      const i = (typeof interval === 'number' && interval > MAX_INTERVAL) ? MAX_INTERVAL : interval;
      if (i !== interval) _stats.record('timersIntercepted');
      return _native.setInterval(fn, i, ...args);
    };
    window.__ffMarkNative(patchedSI);
    window.setInterval = patchedSI;

    window.__ffMarkNative(window.requestAnimationFrame);
    window.__ffMarkNative(window.cancelAnimationFrame);
  }

  function _interceptIdle() {
    // requestIdleCallback: não substituímos pelo nativo — apenas bloqueamos
    // a IdleDetector API (usada para detectar inatividade real do usuário).
    // Substituir rIC por setTimeout(0) causava lag ao saturar a thread principal.
    if (window.requestIdleCallback) {
      // Marca como native para passar toString() spoof, mas mantém comportamento real.
      window.__ffMarkNative(window.requestIdleCallback);
      window.__ffMarkNative(window.cancelIdleCallback);
    }

    // IdleDetector API — essa sim bloqueamos: é a API de detecção de inatividade.
    if ('IdleDetector' in window) {
      class FakeIdleDetector {
        static async requestPermission() { return 'granted'; }
        async start() {}
        get userState()   { return 'active'; }
        get screenState() { return 'unlocked'; }
        addEventListener() {}
        removeEventListener() {}
      }
      try { window.IdleDetector = FakeIdleDetector; } catch (_) {}
    }
  }

  function _spoofUserActivation() {
    if (!('userActivation' in navigator)) return;
    try {
      _native.defineProperty(navigator, 'userActivation', {
        get: () => ({ isActive: true, hasBeenActive: true }),
        configurable: false
      });
    } catch (_) {}
  }

  function _unlockClipboard() {
    const UNLOCK = ['copy', 'cut', 'paste', 'contextmenu', 'selectstart', 'select'];
    for (const evt of UNLOCK) {
      _native.addEventListener.call(document, evt, e => e.stopImmediatePropagation(), {
        capture: true, passive: false
      });
    }

    const style      = document.createElement('style');
    style.id         = '__ff_sel';
    style.textContent = '* { -webkit-user-select: text !important; user-select: text !important; }';
    const root = document.head || document.documentElement;
    if (root) root.appendChild(style);

    const obs = new MutationObserver(() => {
      if (!document.getElementById('__ff_sel')) {
        const r = document.head || document.documentElement;
        if (r) r.appendChild(style);
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });

    for (const p of ['oncopy', 'oncut', 'onpaste', 'oncontextmenu', 'onselectstart']) {
      _nullifyProp(document, p);
      if (document.body) _nullifyProp(document.body, p);
    }
  }

  function _spoofFullscreen() {
    // Sempre usa documentElement como elemento fake — nunca o valor real (null)
    const fakeEl = document.documentElement;

    for (const p of ['fullscreenElement', 'webkitFullscreenElement', 'mozFullScreenElement', 'msFullscreenElement']) {
      try {
        _native.defineProperty(Document.prototype, p, {
          get: () => fakeEl, set: () => {}, configurable: false, enumerable: true
        });
      } catch (_) {}
    }

    for (const p of ['fullscreen', 'fullscreenEnabled', 'webkitIsFullScreen',
                     'webkitFullscreenEnabled', 'mozFullScreen', 'mozFullScreenEnabled',
                     'msFullscreenEnabled']) {
      try {
        _native.defineProperty(Document.prototype, p, {
          get: () => true, set: () => {}, configurable: false, enumerable: true
        });
      } catch (_) {}
    }

    const fsNoop = function () { return Promise.resolve(); };
    window.__ffMarkNative(fsNoop);
    for (const m of ['requestFullscreen', 'webkitRequestFullscreen', 'webkitRequestFullScreen',
                     'mozRequestFullScreen', 'msRequestFullscreen']) {
      try { Element.prototype[m] = fsNoop; } catch (_) {}
    }
    for (const m of ['exitFullscreen', 'webkitExitFullscreen', 'webkitCancelFullScreen',
                     'mozCancelFullScreen', 'msExitFullscreen']) {
      try { Document.prototype[m] = fsNoop; } catch (_) {}
    }
    // Nota: innerWidth/Height/outerWidth/outerHeight são congelados em
    // _freezeGeometry() usando screen.width/height como fonte de verdade.
    // Não duplicamos aqui para evitar dois Object.defineProperty no mesmo
    // alvo — o segundo lançaria TypeError pois configurable:false já foi
    // aplicado. _freezeGeometry() é sempre chamado antes desta função.
  }

  function _neutralizePiP() {
    try {
      _native.defineProperty(document, 'pictureInPictureEnabled', { get: () => false, configurable: false });
      _native.defineProperty(document, 'pictureInPictureElement', { get: () => null, configurable: false });
    } catch (_) {}
  }

  function _nullifyOnHandlers(cfg) {
    const handlers = [
      'onvisibilitychange', 'onwebkitvisibilitychange', 'onmozvisibilitychange',
      ...(cfg.blockBlur          ? ['onblur', 'onfocusout'] : []),
      // 'onbeforeunload' e 'onunload' removidos: são eventos de navegação,
      // não de detecção de foco. Bloqueá-los quebra SPAs (YouTube, etc.).
      ...(cfg.blockPageLifecycle ? ['onpagehide', 'onpageshow', 'onfreeze', 'onresume'] : []),
      ...(cfg.blockMouseLeave    ? ['onmouseleave', 'onmouseout', 'onpointerleave', 'onpointerout', 'ondragleave', 'ondragend'] : []),
      ...(cfg.unlockClipboard    ? ['oncopy', 'oncut', 'onpaste', 'oncontextmenu', 'onselectstart'] : []),
      ...(cfg.blockFullscreen    ? ['onfullscreenchange', 'onwebkitfullscreenchange', 'onmozfullscreenchange', 'onfullscreenerror'] : [])
    ];
    const targets = [window, document, document.documentElement, document.body].filter(Boolean);
    for (const t of targets) {
      for (const h of handlers) {
        _nullifyProp(t, h);
      }
    }
  }

  // ================================================================
  // HEARTBEAT
  // ================================================================
  let _heartbeatId = null;
  let _heartbeatJitter = 0;

  function _startHeartbeat() {
    if (_heartbeatId) return;
    _heartbeatId = _native.setInterval(() => {
      _heartbeatJitter = (_heartbeatJitter + 1) % 3;
      const jitterMs = _heartbeatJitter * 50;
      _native.setTimeout(() => {
        try {
          const e = new FocusEvent('focus', { bubbles: false, cancelable: false });
          Object.defineProperty(e, '__ffSynthetic', { value: true, configurable: false });
          _native.dispatchEvent.call(window, e);
        } catch (_) {}
      }, jitterMs);
    }, 250);
  }

  function _stopHeartbeat() {
    if (_heartbeatId) {
      _native.clearInterval(_heartbeatId);
      _heartbeatId = null;
    }
  }

  // ================================================================
  // INTEGRITY LOOP
  // ================================================================
  let _integrityLoopStarted = false;
  function _startIntegrityLoop() {
    if (_integrityLoopStarted) return; // garante apenas 1 intervalo
    _integrityLoopStarted = true;
    _native.setInterval(() => {
      try {
        if (!_cfg.enabled) return; // respeita o estado atual
        if (_cfg.blockVisibility) {
          if (document.hidden !== false) {
            try { _native.defineProperty(Document.prototype, 'hidden', { get: () => false, configurable: false }); } catch (_) {}
          }
          if (document.visibilityState !== 'visible') {
            try { _native.defineProperty(Document.prototype, 'visibilityState', { get: () => 'visible', configurable: false }); } catch (_) {}
          }
          if (typeof document.hasFocus === 'function' && !document.hasFocus()) {
            Document.prototype.hasFocus = () => true;
          }
        }
        if (_cfg.unlockClipboard && document.body) {
          document.body.style.userSelect       = 'text';
          document.body.style.webkitUserSelect = 'text';
        }
        if (_cfg.blockFullscreen && document.fullscreen !== true) {
          try {
            _native.defineProperty(Document.prototype, 'fullscreen', { get: () => true, configurable: false });
          } catch (_) {}
        }
      } catch (_) {}
    }, 500);
  }

  // ================================================================
  // UTILITÁRIOS
  // ================================================================
  function _nullifyProp(target, prop) {
    try {
      _native.defineProperty(target, prop, {
        get: () => null,
        set: () => {},
        configurable: true,
        enumerable: false
      });
    } catch (_) {}
  }

  // ================================================================
  // INICIALIZAÇÃO
  // ================================================================
  function initialize(cfg) {
    // _freezeGeometry() é a única fonte de verdade para dimensões da janela.
    // Deve rodar sempre que blockResize OU blockFullscreen estiver ativo,
    // pois _spoofFullscreen() depende das dimensões já congeladas em screen.width/height.
    if (cfg.blockResize || cfg.blockFullscreen) _freezeGeometry();
    if (cfg.blockBattery)      _spoofBattery();
    if (cfg.blockNetwork)      _spoofNetwork();
    if (cfg.blockPointerLock)  _neutralizePointerLock();
    if (cfg.blockTimers)       _interceptTimers();
    if (cfg.blockIdle)         _interceptIdle();
    _spoofUserActivation();
    if (cfg.unlockClipboard)   _unlockClipboard();
    if (cfg.blockFullscreen)   _spoofFullscreen(); // sempre após _freezeGeometry()
    _nullifyOnHandlers(cfg);
    _neutralizePiP();
    _startIntegrityLoop();
    if (cfg.fakeHeartbeat)     _startHeartbeat();
  }

  // ================================================================
  // LISTENERS
  // ================================================================
  _native.addEventListener.call(window, '__ff_config', (e) => {
    const cfg = e.detail;
    if (!cfg) return;

    const prevHeartbeat = _cfg.fakeHeartbeat;
    _cfg = cfg;

    if (!_initialized) {
      if (cfg.enabled) { initialize(cfg); _initialized = true; }
      return;
    }

    // Heartbeat é o único patch reversível em runtime
    if (cfg.enabled && cfg.fakeHeartbeat && !prevHeartbeat) {
      _startHeartbeat();
    } else if (!cfg.enabled || !cfg.fakeHeartbeat) {
      _stopHeartbeat();
    }

    // Atualiza integrity loop com config atual
    _startIntegrityLoop();
  });

  _native.addEventListener.call(window, '__ff_extend_blocklist', (e) => {
    if (Array.isArray(e.detail)) {
      for (const type of e.detail) _blocklist.add(type);
    }
  });

  // Bootstrap imediato — aplica todos os spoofs críticos antes do __ff_config
  // chegar do background. Isso garante que a página não detecte o estado real
  // mesmo que o background demore para responder (ex: primeira carga da aba).
  _cfg = DEFAULT_CFG;
  _freezeGeometry();      // congela geometria (não causa side-effects em SPAs)
  _spoofUserActivation(); // navigator.userActivation.isActive = true
  _spoofBattery();        // getBattery() → fake charging
  _spoofNetwork();        // connection.downlink = 10, effectiveType = '4g'
  _interceptTimers();     // setTimeout clamping ≤ 10s
  _interceptIdle();       // IdleDetector fake
  _neutralizePointerLock();
  _spoofFullscreen();     // fullscreenElement / fullscreen / webkitIsFullScreen
  _unlockClipboard();
  _neutralizePiP();
  _nullifyOnHandlers(_cfg);
  _startIntegrityLoop();
  if (_cfg.fakeHeartbeat) _startHeartbeat();
  // Marca como inicializado para que __ff_config não duplique os patches
  _initialized = true;

})();