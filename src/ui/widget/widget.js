/**
 * @file src/ui/widget/widget.js
 * @description Widget flutuante da extensão Misoto — UI premium com glass morphism,
 *              animações, ripple, toasts, modo minimizado e drag corrigido.
 */

'use strict';

// ─── Palette ──────────────────────────────────────────────────────────────────

const COLORS = {
  purple: '#a78bfa', blue: '#60a5fa', green: '#34d399',
  yellow: '#fbbf24', red:  '#f87171', cyan:  '#06b6d4',
  pink:   '#ec4899', orange:'#fb923c',
  bg:     'rgba(10,11,26,0.92)', surface: 'rgba(255,255,255,0.05)',
  border: 'rgba(167,139,250,0.18)',
};

// ─── CSS injetado no Shadow DOM ───────────────────────────────────────────────

const WIDGET_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}

  @keyframes slideIn  { from{opacity:0;transform:translateX(-18px)} to{opacity:1;transform:translateX(0)} }
  @keyframes fadeUp   { from{opacity:0;transform:translateY(8px)}   to{opacity:1;transform:translateY(0)} }
  @keyframes pulse    { 0%,100%{box-shadow:0 0 0 0 rgba(52,211,153,.6)} 50%{box-shadow:0 0 0 5px rgba(52,211,153,0)} }
  @keyframes pulseRed { 0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,.5)} 50%{box-shadow:0 0 0 5px rgba(251,191,36,0)} }
  @keyframes shimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes bounce   { 0%,100%{transform:scale(1)} 40%{transform:scale(1.18)} 70%{transform:scale(.93)} }
  @keyframes spinKf   { to{transform:rotate(360deg)} }
  @keyframes toastIn  { from{opacity:0;transform:translateX(22px)} to{opacity:1;transform:translateX(0)} }
  @keyframes toastOut { from{opacity:1;transform:translateX(0)}   to{opacity:0;transform:translateX(22px)} }
  @keyframes numPop   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.22)} }
  @keyframes borderGlow { 0%,100%{opacity:.5} 50%{opacity:1} }

  .widget{
    position:fixed;
    width:272px;
    background:rgba(10,11,26,0.93);
    border:1px solid rgba(167,139,250,0.22);
    border-radius:16px;
    font-family:'Segoe UI',system-ui,sans-serif;
    user-select:none;
    overflow:hidden;
    backdrop-filter:blur(18px) saturate(1.4);
    -webkit-backdrop-filter:blur(18px) saturate(1.4);
    box-shadow:0 8px 40px rgba(0,0,0,.7),0 0 0 1px rgba(167,139,250,.08),inset 0 1px 0 rgba(255,255,255,.06);
    animation:slideIn .3s cubic-bezier(.22,1,.36,1);
    transition:width .25s ease,height .25s ease,border-radius .25s ease,opacity .2s;
    z-index:2147483647;
  }
  .widget.minimized{
    width:46px!important;
    height:46px!important;
    border-radius:50%!important;
    overflow:hidden;
    cursor:pointer;
  }
  .widget.minimized .widget-body,
  .widget.minimized .widget-footer{ display:none!important }
  .widget.minimized .widget-header{ padding:0!important;border:none!important;background:transparent!important;height:46px;cursor:pointer }
  .widget.minimized .header-title,
  .widget.minimized .header-controls,
  .widget.minimized .status-dot{ display:none!important }
  .widget.minimized .header-min{ display:flex!important;width:100%;height:100%;align-items:center;justify-content:center }
  .widget.minimized .header-min img{ width:46px!important;height:46px!important;border-radius:50%!important;object-fit:cover!important;display:block!important }

  .widget-header{
    padding:10px 12px 9px;
    background:linear-gradient(135deg,rgba(167,139,250,.15),rgba(6,182,212,.08));
    border-bottom:1px solid rgba(167,139,250,.16);
    display:flex;align-items:center;justify-content:space-between;
    cursor:grab;position:relative;
  }
  .widget-header:active{cursor:grabbing}
  .header-left{display:flex;align-items:center;gap:8px}
  .header-title{color:#a78bfa;font-weight:700;font-size:12.5px;letter-spacing:-.01em}
  .status-dot{
    width:9px;height:9px;border-radius:50%;background:#374151;
    transition:background .3s;flex-shrink:0;
  }
  .status-dot.active{background:#34d399;animation:pulse 2s infinite}
  .status-dot.waiting{background:#fbbf24;animation:pulseRed 1.4s infinite}
  .header-controls{display:flex;align-items:center;gap:5px}
  .header-min{display:none}
  .ctrl-btn{
    width:20px;height:20px;border-radius:5px;border:none;
    background:rgba(255,255,255,.06);color:#6b7280;font-size:11px;
    cursor:pointer;display:flex;align-items:center;justify-content:center;
    transition:background .15s,color .15s;
  }
  .ctrl-btn:hover{background:rgba(167,139,250,.2);color:#a78bfa}

  .widget-body{
    padding:10px;display:flex;flex-direction:column;gap:8px;
    max-height:72vh;overflow-y:auto;overflow-x:hidden;
  }
  .widget-body::-webkit-scrollbar{width:5px}
  .widget-body::-webkit-scrollbar-track{background:transparent}
  .widget-body::-webkit-scrollbar-thumb{background:rgba(167,139,250,.25);border-radius:99px}
  .widget-body::-webkit-scrollbar-thumb:hover{background:rgba(167,139,250,.55)}

  /* Seções */
  .section{
    border:1px solid var(--sec-color,rgba(167,139,250,.18));
    border-radius:11px;overflow:hidden;
    transition:box-shadow .2s,border-color .2s;
  }
  .section:hover{
    box-shadow:0 0 12px var(--sec-glow,rgba(167,139,250,.15));
    border-color:var(--sec-color-hover,rgba(167,139,250,.35));
  }
  .section-header{
    padding:6px 10px;
    background:var(--sec-bg,rgba(167,139,250,.08));
    color:var(--sec-fg,#a78bfa);
    font-size:10px;font-weight:700;letter-spacing:.04em;
  }
  .section-body{
    padding:8px;display:flex;flex-direction:column;gap:5px;
    background:rgba(0,0,0,.2);
  }

  /* Botões */
  .btn{
    padding:5px 10px;border-radius:8px;
    border:1px solid var(--btn-border,rgba(167,139,250,.3));
    background:var(--btn-bg,rgba(167,139,250,.1));
    color:var(--btn-fg,#a78bfa);
    font-size:10.5px;font-weight:600;cursor:pointer;
    transition:transform .15s,box-shadow .15s,background .15s,border-color .15s;
    position:relative;overflow:hidden;white-space:nowrap;
    display:inline-flex;align-items:center;justify-content:center;gap:5px;
  }
  .btn:hover:not(:disabled){
    transform:translateY(-1px);
    box-shadow:0 4px 14px var(--btn-glow,rgba(167,139,250,.25));
    background:var(--btn-bg-hover,rgba(167,139,250,.2));
    border-color:var(--btn-fg,#a78bfa);
  }
  .btn:active:not(:disabled){transform:scale(.96)}
  .btn:disabled{opacity:.4;cursor:not-allowed}
  .btn.full{width:100%}
  .btn .spinner{
    width:11px;height:11px;border-radius:50%;
    border:2px solid rgba(255,255,255,.2);
    border-top-color:currentColor;
    animation:spinKf .6s linear infinite;
    display:none;
  }
  .btn.loading .spinner{display:inline-block}
  .btn.loading .btn-label{opacity:.5}

  /* Ripple */
  .ripple{
    position:absolute;border-radius:50%;
    transform:scale(0);animation:rippleAnim .5s linear;
    background:rgba(255,255,255,.2);pointer-events:none;
  }
  @keyframes rippleAnim{to{transform:scale(4);opacity:0}}

  /* Inputs */
  .inp{
    flex:1;padding:4px 7px;border-radius:7px;
    border:1px solid rgba(255,255,255,.08);
    background:rgba(255,255,255,.05);color:#e2e8f0;font-size:11px;
    transition:border-color .15s,box-shadow .15s;outline:none;
  }
  .inp:focus{border-color:rgba(167,139,250,.5);box-shadow:0 0 0 2px rgba(167,139,250,.12)}

  /* Slider */
  .slider-wrap{display:flex;flex-direction:column;gap:4px}
  .slider-row{display:flex;align-items:center;gap:8px}
  .slider-label{color:#6b7280;font-size:10px;flex-shrink:0}
  .slider-val{color:#a78bfa;font-size:10px;font-weight:700;min-width:38px;text-align:right}
  input[type=range]{
    -webkit-appearance:none;appearance:none;
    flex:1;height:4px;border-radius:99px;
    background:linear-gradient(90deg,#a78bfa var(--pct,50%),rgba(255,255,255,.1) var(--pct,50%));
    outline:none;cursor:pointer;
  }
  input[type=range]::-webkit-slider-thumb{
    -webkit-appearance:none;width:14px;height:14px;border-radius:50%;
    background:linear-gradient(135deg,#a78bfa,#06b6d4);
    box-shadow:0 0 6px rgba(167,139,250,.5);
    transition:box-shadow .15s,transform .15s;cursor:pointer;
  }
  input[type=range]::-webkit-slider-thumb:hover{
    box-shadow:0 0 12px rgba(167,139,250,.8);transform:scale(1.2)
  }

  /* Data row */
  .data-row{
    display:flex;justify-content:space-between;align-items:center;
    padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04);
    font-size:9.5px;gap:6px;
  }
  .data-row:last-child{border-bottom:none}
  .dr-label{color:#4b5563;flex-shrink:0}
  .dr-val{font-family:'Courier New',monospace;font-size:9px;text-align:right;word-break:break-all;transition:color .3s}
  .dr-val.anim{animation:numPop .35s ease}

  /* Select */
  select{
    width:100%;padding:4px 7px;border-radius:7px;
    border:1px solid rgba(255,255,255,.08);
    background:rgba(255,255,255,.05);color:#4b5563;font-size:10px;
    outline:none;cursor:pointer;
  }
  select:focus{border-color:rgba(6,182,212,.4)}

  /* Progress */
  .prog-wrap{display:none;flex-direction:column;gap:2px}
  .prog-wrap.vis{display:flex}
  .prog-track{height:3px;border-radius:99px;background:rgba(255,255,255,.06);overflow:hidden}
  .prog-fill{height:100%;width:0%;border-radius:99px;background:#a78bfa;transition:width .3s ease,background .3s}
  .prog-label{font-size:9px;color:#6b7280;text-align:center}

  /* Toast container */
  .toast-stack{
    position:fixed;bottom:16px;right:16px;
    display:flex;flex-direction:column;gap:6px;
    pointer-events:none;z-index:99999;
  }
  .toast{
    padding:7px 12px 7px 10px;border-radius:8px;
    background:rgba(15,23,42,.95);
    border-left:3px solid #34d399;
    color:#e2e8f0;font-size:11px;font-weight:500;
    display:flex;align-items:center;gap:7px;
    box-shadow:0 4px 20px rgba(0,0,0,.5);
    animation:toastIn .25s cubic-bezier(.22,1,.36,1);
    backdrop-filter:blur(12px);
    pointer-events:none;min-width:160px;max-width:240px;
  }
  .toast.out{animation:toastOut .2s ease forwards}
  .toast-icon{font-size:13px;flex-shrink:0}
  .toast.success{border-left-color:#34d399}
  .toast.error  {border-left-color:#f87171}
  .toast.info   {border-left-color:#60a5fa}
  .toast.warn   {border-left-color:#fbbf24}

  /* Help modal */
  .help-overlay{
    position:fixed;inset:0;background:rgba(0,0,0,.65);
    display:flex;align-items:center;justify-content:center;
    z-index:2147483648;
    backdrop-filter:blur(4px);
    animation:fadeUp .2s ease;
  }
  .help-card{
    background:rgba(12,14,28,.98);border:1px solid rgba(167,139,250,.28);
    border-radius:14px;padding:16px 18px;width:320px;max-height:85vh;
    overflow-y:auto;box-shadow:0 14px 44px rgba(0,0,0,.75);
    font-family:'Segoe UI',system-ui,sans-serif;display:flex;flex-direction:column;gap:12px;
  }
  .help-card::-webkit-scrollbar{width:4px}
  .help-card::-webkit-scrollbar-thumb{background:rgba(167,139,250,.25);border-radius:99px}
  .help-hdr{display:flex;justify-content:space-between;align-items:center}
  .help-title{color:#a78bfa;font-weight:700;font-size:12px;letter-spacing:.03em}
  .help-close{background:none;border:none;color:#6b7280;cursor:pointer;font-size:15px;padding:0 2px;line-height:1}
  .help-close:hover{color:#a78bfa}
  .help-section{display:flex;flex-direction:column;gap:4px;margin-bottom:8px}
  .help-section-title{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.06)}
  .help-item{display:flex;gap:7px;padding:3px 0}
  .help-icon{font-size:12px;flex-shrink:0;width:18px;text-align:center;margin-top:1px}
  .help-text{display:flex;flex-direction:column;gap:1px}
  .help-label{font-size:10.5px;font-weight:600}
  .help-desc{font-size:9.5px;color:#6b7280;line-height:1.4}

  .widget-footer{
    display:flex;justify-content:space-between;align-items:center;
    padding:6px 10px;
    border-top:1px solid rgba(255,255,255,.05);
    background:rgba(0,0,0,.15);
  }
  .footer-ver{color:#374151;font-size:9px}
  .footer-btns{display:flex;gap:4px}
`;

// ─── Widget principal ─────────────────────────────────────────────────────────

function createWidget() {
  if (Store.get('widgetRoot')) return;

  // Host invisível para o Shadow DOM
  const host = document.createElement('div');
  host.id = 'misoto-host';
  Object.assign(host.style, {
    position: 'fixed', zIndex: '2147483647',
    top: '0', left: '0', width: '0', height: '0', overflow: 'visible',
  });

  let root;
  try { root = host.attachShadow({ mode: 'open' }); } catch (_) { root = host; }

  // Injeta CSS
  const style = document.createElement('style');
  style.textContent = WIDGET_CSS;
  root.appendChild(style);

  // Toast stack — filho do shadow, acima de tudo
  const toastStack = document.createElement('div');
  toastStack.className = 'toast-stack';
  root.appendChild(toastStack);
  Store.set('_toastStack', toastStack);

  document.documentElement.appendChild(host);
  Store.set('widgetRoot', root);

  _buildWidget(root);
  DebugLog.ok('Widget criado');
  EventBus.emit(EVENTS.UI_WIDGET_READY);
}

// ─── Build principal ──────────────────────────────────────────────────────────

function _buildWidget(root) {
  const pos = { top: '80px', left: '20px' };

  // Carrega posição salva
  AppStorage.get([STORAGE.WIDGET_POS]).then((res) => {
    const p = res[STORAGE.WIDGET_POS];
    if (p) { widget.style.top = p.top; widget.style.left = p.left; }
  });

  const widget = document.createElement('div');
  widget.className = 'widget';
  Object.assign(widget.style, { top: pos.top, left: pos.left });
  root.appendChild(widget);

  // ── Header ──────────────────────────────────────────────────────────────────
  const header = _buildHeader(widget);

  // ── Body ────────────────────────────────────────────────────────────────────
  const body = document.createElement('div');
  body.className = 'widget-body';
  widget.appendChild(body);

  _buildMarkingSection(body);
  _buildDownloadSection(body);
  _buildCognaSection(body);
  _buildDataSection(body);

  // ── Footer ──────────────────────────────────────────────────────────────────
  _buildFooter(widget);

  // ── Drag corrigido ──────────────────────────────────────────────────────────
  _makeDraggable(widget, header, STORAGE.WIDGET_POS);

  // ── Minimizar ────────────────────────────────────────────────────────────────
  const minBtn = header.querySelector('.ctrl-btn[title="Minimizar"]');
  _setupMinimize(widget, header, minBtn);

  _attachStoreListeners();
}

// ─── Header ───────────────────────────────────────────────────────────────────

function _buildHeader(widget) {
  const header = document.createElement('div');
  header.className = 'widget-header';

  // Ícone para modo minimizado (escondido por padrão)
  const minIcon = document.createElement('span');
  minIcon.className = 'header-min';
  const _minImg = document.createElement('img');
  _minImg.src = 'data:image/png;base64,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';
  _minImg.alt = 'Misoto';
  Object.assign(_minImg.style, {
    width: '46px', height: '46px',
    borderRadius: '50%', objectFit: 'cover',
    pointerEvents: 'none', userSelect: 'none', display: 'block',
  });
  minIcon.appendChild(_minImg);

  const left = document.createElement('div');
  left.className = 'header-left';

  const dot = document.createElement('span');
  dot.className = 'status-dot waiting';
  dot.title = 'Aguardando token';

  const title = document.createElement('span');
  title.className = 'header-title';
  title.textContent = `⚡ Misoto`;

  left.append(dot, title);

  const controls = document.createElement('div');
  controls.className = 'header-controls';

  // Botão de ajuda "?"
  const helpBtn = document.createElement('button');
  helpBtn.className = 'ctrl-btn';
  helpBtn.title = 'Ajuda — o que cada seção faz';
  helpBtn.textContent = '?';
  helpBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
  helpBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    _showHelpModal(widget);
  });

  const minBtn = document.createElement('button');
  minBtn.className = 'ctrl-btn';
  minBtn.title = 'Minimizar';
  minBtn.textContent = '−';

  controls.append(helpBtn, minBtn);
  header.append(minIcon, left, controls);
  widget.appendChild(header);

  // Reativo: token status
  Store.on('sessionToken', (token) => {
    dot.className = token ? 'status-dot active' : 'status-dot waiting';
    dot.title     = token ? 'Token capturado' : 'Aguardando token';
  });

  return header;
}

// ─── Minimizar ────────────────────────────────────────────────────────────────

function _setupMinimize(widget, header, minBtn) {
  let minimized = false;

  // Rastreia se o pointer se moveu (drag vs clique)
  let _pointerMoved = false;
  let _pointerDownX = 0;
  let _pointerDownY = 0;

  function doMinimize() {
    minimized = true;
    widget.classList.add('minimized');
    minBtn.textContent = '+';
    minBtn.title = 'Expandir';
  }

  function doExpand() {
    minimized = false;
    widget.classList.remove('minimized');
    minBtn.textContent = '−';
    minBtn.title = 'Minimizar';
  }

  // ── Botão minimizar (visível apenas quando expandido) ──────────────────────
  minBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
  });
  minBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (minimized) doExpand(); else doMinimize();
  });

  // ── Quando minimizado: clicar em QUALQUER PARTE do widget expande ──────────
  // Usa pointerdown+pointerup para distinguir clique de drag
  widget.addEventListener('pointerdown', (e) => {
    if (!minimized) return;
    _pointerMoved = false;
    _pointerDownX = e.clientX;
    _pointerDownY = e.clientY;
  }, true); // capture para pegar antes do drag handler

  widget.addEventListener('pointermove', (e) => {
    if (!minimized) return;
    const dx = Math.abs(e.clientX - _pointerDownX);
    const dy = Math.abs(e.clientY - _pointerDownY);
    if (dx > 5 || dy > 5) _pointerMoved = true;
  }, true);

  widget.addEventListener('pointerup', (e) => {
    if (!minimized) return;
    if (!_pointerMoved) {
      e.stopPropagation();
      doExpand();
    }
    _pointerMoved = false;
  }, true);
}

// ─── Seção: marcação ──────────────────────────────────────────────────────────

function _buildMarkingSection(body) {
  const section = _section('📌 Marcação', COLORS.purple);

  // Slider de intervalo
  const sliderWrap = document.createElement('div');
  sliderWrap.className = 'slider-wrap';

  const sliderRow = document.createElement('div');
  sliderRow.className = 'slider-row';

  const sliderLabel = document.createElement('span');
  sliderLabel.className = 'slider-label';
  sliderLabel.textContent = 'Intervalo';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min  = '0';
  slider.max  = '30000';
  slider.step = '500';
  slider.value = Store.get('autoIntervalMs');

  const sliderVal = document.createElement('span');
  sliderVal.className = 'slider-val';
  sliderVal.textContent = `${Store.get('autoIntervalMs')}ms`;

  function updateSlider() {
    const v = Number(slider.value);
    const pct = (v / 30000) * 100;
    slider.style.setProperty('--pct', pct + '%');
    sliderVal.textContent = `${v}ms`;
    Store.set('autoIntervalMs', v);
  }
  slider.addEventListener('input', updateSlider);
  slider.addEventListener('pointerdown', (e) => e.stopPropagation());
  updateSlider();

  sliderRow.append(sliderLabel, slider, sliderVal);
  sliderWrap.appendChild(sliderRow);
  section.body.appendChild(sliderWrap);

  // Botões linha 1
  const btnRow = document.createElement('div');
  Object.assign(btnRow.style, { display: 'flex', gap: '5px' });

  const markBtn = _btn('✓ Marcar', COLORS.green, async () => {
    _btnLoading(markBtn, true);
    const ok = await CognaService.markLessonComplete();
    _btnLoading(markBtn, false, '✓ Marcar');
    _toast(ok ? '✓ Aula marcada!' : '✕ Falhou', ok ? 'success' : 'error');
    if (ok) markBtn.style.animation = 'bounce .4s ease';
  });

  const autoBtn = _btn('▶ Auto', COLORS.blue, () =>
    AutoCompletionService.start(Number(slider.value)));
  const stopBtn = _btn('■ Parar', COLORS.red, () =>
    AutoCompletionService.stop());
  stopBtn.disabled = true;

  Store.set('autoButton', autoBtn);
  Store.set('stopButton', stopBtn);

  Store.on('isAutoRunning', (running) => {
    autoBtn.disabled = running;
    autoBtn.querySelector('.btn-label').textContent = running ? '▶ Rodando…' : '▶ Auto';
    stopBtn.disabled = !running;
  });

  btnRow.append(markBtn, autoBtn, stopBtn);
  section.body.appendChild(btnRow);

  // Botão marcar tudo
  const allBtn = _btn('🔥 Marcar TODAS as Aulas', COLORS.orange);
  allBtn.classList.add('full');

  const prog = _progressBar(section.body);

  allBtn.addEventListener('click', () => {
    if (allBtn.disabled) return;
    _btnLoading(allBtn, true);
    prog.show();

    CognaService.markAllLessonsComplete({
      onProgress: (msg, pct) => {
        allBtn.querySelector('.btn-label').textContent = truncate(msg, 26);
        prog.set(pct, msg);
      },
      onDone: (ok, falhas, total) => {
        _btnLoading(allBtn, false, '🔥 Marcar TODAS as Aulas');
        prog.set(100, `✓ ${ok}/${total} marcadas`);
        setTimeout(() => prog.hide(), 3000);
        _toast(`✓ ${ok} aulas marcadas!`, 'success');
      },
      onError: (msg) => {
        _btnLoading(allBtn, false, '🔥 Marcar TODAS as Aulas');
        prog.set(0, `✕ ${truncate(msg, 32)}`);
        setTimeout(() => prog.hide(), 4000);
        _toast('✕ Erro ao marcar', 'error');
      },
    });
  });

  section.body.appendChild(allBtn);
  body.appendChild(section.root);
}

// ─── Seção: download ──────────────────────────────────────────────────────────

function _buildDownloadSection(body) {
  const section = _section('🎬 Download de Vídeo', COLORS.cyan);

  const sel = document.createElement('select');
  const ph  = new Option('📡 Aguardando streams M3U8…', '', true, true);
  ph.disabled = true;
  sel.appendChild(ph);
  Store.set('streamSelect', sel);

  const statusEl = document.createElement('div');
  statusEl.style.cssText = 'font-size:9.5px;color:#4b5563';
  statusEl.textContent   = 'Nenhum stream detectado';
  Store.set('downloadStatusEl', statusEl);

  const dlBtn = _btn('⬇ Baixar MP4', COLORS.cyan);
  dlBtn.classList.add('full');
  dlBtn.disabled = true;
  Store.set('downloadBtn', dlBtn);

  const prog = _progressBar(section.body);

  dlBtn.addEventListener('click', () => {
    const url = sel.value;
    if (!url) return;
    VideoDownloadService.download(url, {
      onProgress: (pct, done, total) => { prog.show(); prog.set(pct, `⬇ ${done}/${total} segs`); },
      onComplete: (bytes, fn) => {
        const mb = (bytes/1024/1024).toFixed(1);
        prog.set(100, `✓ ${mb}MB — ${truncate(fn, 22)}`);
        setTimeout(() => prog.hide(), 4000);
        _toast('✓ Download concluído!', 'success');
      },
      onError: (err) => {
        prog.set(0, `✕ ${truncate(err.message, 30)}`);
        setTimeout(() => prog.hide(), 4000);
        _toast('✕ Erro no download', 'error');
      },
      onStateChange: (loading) => {
        _btnLoading(dlBtn, loading, loading ? '⌛ Baixando…' : '⬇ Baixar MP4');
      },
    });
  });

  section.body.append(sel, statusEl, dlBtn);
  body.appendChild(section.root);
}

// ─── Seção: Cogna ─────────────────────────────────────────────────────────────

function _buildCognaSection(body) {
  const section = _section('🔗 URL Cogna', COLORS.pink);

  const { root: nomeRow, update: updNome } = _dataRow('Aula:', 'aguardando…', COLORS.pink);
  const { root: tsRow,   update: updTs   } = _dataRow('Captura:', '—', '#6b7280');

  const btnRow = document.createElement('div');
  Object.assign(btnRow.style, { display: 'flex', gap: '5px', marginTop: '3px' });

  const copyBtn = _btn('📋 Copiar URL', COLORS.pink, async () => {
    const ok = await copyToClipboard(Store.get('cognaUrl') ?? '');
    _toast(ok ? '✓ URL copiada!' : '✕ Sem URL', ok ? 'success' : 'warn');
  });

  const openBtn = _btn('↗ Abrir', COLORS.blue, () => {
    const url = Store.get('cognaUrl');
    if (url) window.open(url, '_blank');
    else _toast('✕ Sem URL', 'warn');
  });

  const shareBtn = _btn('🔗 Compartilhar', COLORS.cyan, async () => {
    const url   = Store.get('cognaUrl');
    const title = Store.get('cognaUrlNome') ?? 'Aula';
    if (!url) { _toast('✕ Sem URL para compartilhar', 'warn'); return; }

    if (navigator.share) {
      try {
        await navigator.share({ title, text: `📚 ${title}`, url });
        _toast('✓ Compartilhado!', 'success');
      } catch (err) {
        if (err.name !== 'AbortError') _toast('✕ Erro ao compartilhar', 'error');
      }
    } else {
      await copyToClipboard(url);
      _showShareFallback(url, title);
    }
  });

  btnRow.append(copyBtn, openBtn, shareBtn);
  section.body.append(nomeRow, tsRow, btnRow);
  body.appendChild(section.root);

  const refresh = () => {
    updNome(truncate(Store.get('cognaUrlNome') ?? 'aguardando…', 28));
    updTs(formatDateBR(Store.get('cognaCaptura')) || '—');
  };
  Store.on('cognaUrl',     refresh);
  Store.on('cognaUrlNome', refresh);
  Store.on('cognaCaptura', refresh);
}

// ─── Share fallback ──────────────────────────────────────────────────────────

function _showShareFallback(url, title) {
  const root   = Store.get('widgetRoot');
  const enc    = encodeURIComponent(url);
  const encTxt = encodeURIComponent(`📚 ${title} — ${url}`);

  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', background: 'rgba(0,0,0,.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: '2147483647', backdropFilter: 'blur(4px)', animation: 'fadeUp .2s ease',
  });

  const card = document.createElement('div');
  Object.assign(card.style, {
    background: 'rgba(15,17,30,.97)', border: '1px solid rgba(167,139,250,.25)',
    borderRadius: '14px', padding: '18px 20px', width: '260px',
    boxShadow: '0 12px 40px rgba(0,0,0,.7)',
    fontFamily: "'Segoe UI',system-ui,sans-serif",
    display: 'flex', flexDirection: 'column', gap: '12px',
  });

  const hdr = document.createElement('div');
  Object.assign(hdr.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center' });
  const ttl = document.createElement('span');
  Object.assign(ttl.style, { color: '#a78bfa', fontWeight: '700', fontSize: '12px' });
  ttl.textContent = '🔗 Compartilhar aula';
  const cls = document.createElement('button');
  Object.assign(cls.style, {
    background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer',
    fontSize: '14px', padding: '0 2px',
  });
  cls.textContent = '✕';
  cls.onclick = () => overlay.remove();
  hdr.append(ttl, cls);

  const urlBox = document.createElement('div');
  Object.assign(urlBox.style, {
    background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
    borderRadius: '7px', padding: '6px 8px', fontSize: '9px',
    color: '#06b6d4', wordBreak: 'break-all', cursor: 'pointer',
  });
  urlBox.textContent = truncate(url, 60);
  urlBox.title = 'Clique para copiar';
  urlBox.onclick = async () => {
    await copyToClipboard(url);
    _toast('✓ URL copiada!', 'success');
  };

  const apps = [
    { label: 'WhatsApp', color: '#25d366', url: `https://wa.me/?text=${encTxt}` },
    { label: 'Telegram', color: '#2aabee', url: `https://t.me/share/url?url=${enc}&text=${encodeURIComponent(title)}` },
    { label: 'Email',    color: '#fbbf24', url: `mailto:?subject=${encodeURIComponent(title)}&body=${encTxt}` },
    { label: 'Copiar',   color: '#a78bfa', action: async () => { await copyToClipboard(url); _toast('✓ URL copiada!', 'success'); overlay.remove(); } },
  ];

  const grid = document.createElement('div');
  Object.assign(grid.style, { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' });

  for (const app of apps) {
    const btn = document.createElement('button');
    Object.assign(btn.style, {
      padding: '7px 8px', borderRadius: '8px', border: `1px solid ${app.color}33`,
      background: `${app.color}11`, color: app.color,
      fontSize: '11px', fontWeight: '600', cursor: 'pointer',
      transition: 'background .15s, transform .1s',
    });
    btn.textContent = app.label;
    btn.onmouseenter = () => { btn.style.background = `${app.color}22`; btn.style.transform = 'translateY(-1px)'; };
    btn.onmouseleave = () => { btn.style.background = `${app.color}11`; btn.style.transform = ''; };
    btn.onclick = () => {
      if (app.action) { app.action(); }
      else { window.open(app.url, '_blank'); overlay.remove(); }
    };
    grid.appendChild(btn);
  }

  card.append(hdr, urlBox, grid);
  overlay.appendChild(card);
  overlay.addEventListener('click', (e) => { e.stopPropagation(); if (e.target === overlay) overlay.remove(); });
  root.appendChild(overlay);
}

// ─── Seção: dados ─────────────────────────────────────────────────────────────

function _buildDataSection(body) {
  const section = _section('📊 Dados da Sessão', COLORS.yellow);

  const rows = {
    token:    _dataRow('Token:',          '—', COLORS.yellow),
    student:  _dataRow('ID do Aluno:',    '—', COLORS.blue),
    enroll:   _dataRow('ID da Matrícula:','—', '#94a3b8'),
    unit:     _dataRow('ID da Unidade:',  '—', '#94a3b8'),
    section:  _dataRow('ID da Seção:',    '—', '#94a3b8'),
    object:   _dataRow('ID do Conteúdo:', '—', '#94a3b8'),
    success:  _dataRow('✓ Marcadas:',     '0', COLORS.green),
    errors:   _dataRow('✕ Erros:',        '0', COLORS.red),
    status:   _dataRow('Último HTTP:',    '—', '#6b7280'),
    rl:       _dataRow('Rate Limit:',     '—', '#6b7280'),
  };

  for (const { root: r } of Object.values(rows)) section.body.appendChild(r);

  Store.set('dataArea', section.body);

  Store.on('sessionToken', (t)  => rows.token.update(t ? truncate(t, 18) + '…' : '—', COLORS.yellow));
  Store.on('studentId',    (id) => rows.student.update(truncate(id ?? '—', 28)));
  Store.on('successCount', (n)  => rows.success.update(n, COLORS.green));
  Store.on('errorCount',   (n)  => rows.errors.update(n, n > 0 ? COLORS.red : '#6b7280'));
  Store.on('lastStatus',   (s)  => rows.status.update(s ?? '—', s === '200' ? COLORS.green : COLORS.yellow));

  const copyAllBtn = _btn('📋 Copiar Tudo', COLORS.yellow, async () => {
    const ok = await copyToClipboard(formatSessionDataForClipboard());
    _toast(ok ? '✓ Dados copiados!' : '✕ Erro ao copiar', ok ? 'success' : 'error');
    if (ok) copyAllBtn.style.animation = 'bounce .4s ease';
  });
  copyAllBtn.classList.add('full');
  section.body.appendChild(copyAllBtn);

  setInterval(() => {
    const s = RateLimiter.getStats();
    rows.rl.update(
      s.penaltyActive ? `⚠ backoff ${(s.penaltyMs/1000).toFixed(0)}s`
                      : `${s.requestsInWindow}/${s.maxPerWindow}`,
      s.penaltyActive ? COLORS.red : '#6b7280'
    );
    const ids = CognaParser.parseLessonIds();
    rows.enroll.update(truncate(ids.subjectEnrollmentId ?? '—', 28));
    rows.unit.update(truncate(ids.learningUnitId        ?? '—', 28));
    rows.section.update(truncate(ids.sectionId          ?? '—', 28));
    rows.object.update(truncate(ids.learningObjectId    ?? '—', 28));
  }, UI.DATA_REFRESH_INTERVAL_MS);

  body.appendChild(section.root);
}

// ─── Modal de Ajuda CORRIGIDO ─────────────────────────────────────────────────

function _showHelpModal(widget) {
  const root = Store.get('widgetRoot');
  if (!root) return;

  const HELP = [
    {
      title: '📌 Marcação',
      color: '#a78bfa',
      items: [
        { icon: '✓',  label: 'Marcar',              desc: 'Marca a aula atual como concluída imediatamente.' },
        { icon: '▶',  label: 'Auto',                desc: 'Liga o modo automático: marca a aula repetidamente no intervalo definido pelo slider.' },
        { icon: '■',  label: 'Parar',               desc: 'Para o modo automático.' },
        { icon: '⏱',  label: 'Slider de intervalo', desc: 'Define o tempo entre cada marcação automática (0 = sem espera).' },
        { icon: '🔥', label: 'Marcar TODAS',        desc: 'Busca e marca todas as aulas de todos os cursos matriculados de uma só vez.' },
      ],
    },
    {
      title: '🎬 Download de Vídeo',
      color: '#06b6d4',
      items: [
        { icon: '📡', label: 'Seletor de stream',   desc: 'Lista os streams HLS (.m3u8) detectados na página atual.' },
        { icon: '⬇',  label: 'Baixar MP4',          desc: 'Baixa o stream selecionado como arquivo .mp4 com vídeo e áudio.' },
      ],
    },
    {
      title: '🔗 URL Cogna',
      color: '#ec4899',
      items: [
        { icon: '📋', label: 'Copiar URL',          desc: 'Copia a URL interna da aula no sistema Cogna/Ampli.' },
        { icon: '↗',  label: 'Abrir',               desc: 'Abre a URL Cogna em uma nova aba.' },
        { icon: '🔗', label: 'Compartilhar',        desc: 'Compartilha a URL via WhatsApp, Telegram, e-mail ou área de transferência.' },
      ],
    },
    {
      title: '📊 Dados da Sessão',
      color: '#fbbf24',
      items: [
        { icon: '🔑', label: 'Token',               desc: 'Token de autenticação capturado automaticamente ao navegar pela plataforma.' },
        { icon: '🆔', label: 'IDs',                 desc: 'Identificadores únicos da matrícula, unidade, seção e conteúdo da aula atual.' },
        { icon: '📋', label: 'Copiar Tudo',         desc: 'Copia todos os dados da sessão formatados para a área de transferência.' },
      ],
    },
  ];

  const overlay = document.createElement('div');
  overlay.className = 'help-overlay';

  const card = document.createElement('div');
  card.className = 'help-card';

  const hdr = document.createElement('div');
  hdr.className = 'help-hdr';

  const titleEl = document.createElement('span');
  titleEl.className   = 'help-title';
  titleEl.textContent = '❓ O que cada função faz';

  const closeBtn = document.createElement('button');
  closeBtn.className   = 'help-close';
  closeBtn.textContent = '✕';
  closeBtn.onclick = () => {
    overlay.remove();
    // Garante que o widget mantenha seu estado (não minimize sozinho)
    if (widget && widget.classList.contains('minimized')) {
      // Se estava minimizado, mantém minimizado
    }
  };

  hdr.append(titleEl, closeBtn);
  card.appendChild(hdr);

  for (const section of HELP) {
    const secEl = document.createElement('div');
    secEl.className = 'help-section';

    const secTitle = document.createElement('div');
    secTitle.className   = 'help-section-title';
    secTitle.textContent = section.title;
    secTitle.style.color = section.color;
    secEl.appendChild(secTitle);

    for (const item of section.items) {
      const itemEl = document.createElement('div');
      itemEl.className = 'help-item';

      const iconEl = document.createElement('span');
      iconEl.className   = 'help-icon';
      iconEl.textContent = item.icon;
      iconEl.style.color = section.color;

      const textEl = document.createElement('div');
      textEl.className = 'help-text';

      const labelEl = document.createElement('span');
      labelEl.className   = 'help-label';
      labelEl.textContent = item.label;
      labelEl.style.color = section.color;

      const descEl = document.createElement('span');
      descEl.className   = 'help-desc';
      descEl.textContent = item.desc;

      textEl.append(labelEl, descEl);
      itemEl.append(iconEl, textEl);
      secEl.appendChild(itemEl);
    }

    card.appendChild(secEl);
  }

  overlay.appendChild(card);
  overlay.addEventListener('click', (e) => { 
    e.stopPropagation();
    if (e.target === overlay) {
      overlay.remove();
    } 
  });
  root.appendChild(overlay);
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function _buildFooter(widget) {
  const footer = document.createElement('div');
  footer.className = 'widget-footer';

  const ver = document.createElement('span');
  ver.className   = 'footer-ver';
  ver.textContent = `v${MISOTO_VERSION}`;

  const btns = document.createElement('div');
  btns.className = 'footer-btns';

  const dbgBtn = _btn('🔍 Debug', COLORS.purple, () => toggleDebugPanel());
  dbgBtn.style.cssText += 'font-size:9px;padding:3px 7px';

  btns.appendChild(dbgBtn);
  footer.append(ver, btns);
  widget.appendChild(footer);
}

// ─── Helpers de UI ────────────────────────────────────────────────────────────

function _section(title, color) {
  const root = document.createElement('div');
  root.className = 'section';
  root.style.setProperty('--sec-color',       color + '33');
  root.style.setProperty('--sec-color-hover',  color + '66');
  root.style.setProperty('--sec-glow',         color + '22');
  root.style.setProperty('--sec-bg',           color + '12');
  root.style.setProperty('--sec-fg',           color);

  const hdr = document.createElement('div');
  hdr.className   = 'section-header';
  hdr.textContent = title;

  const body = document.createElement('div');
  body.className = 'section-body';

  root.append(hdr, body);
  return { root, body };
}

function _btn(label, color, onClick) {
  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.style.setProperty('--btn-fg',       color);
  btn.style.setProperty('--btn-border',   color + '44');
  btn.style.setProperty('--btn-bg',       color + '14');
  btn.style.setProperty('--btn-bg-hover', color + '26');
  btn.style.setProperty('--btn-glow',     color + '44');

  const lbl = document.createElement('span');
  lbl.className   = 'btn-label';
  lbl.textContent = label;

  const spin = document.createElement('span');
  spin.className = 'spinner';

  btn.append(lbl, spin);

  btn.addEventListener('click', (e) => {
    if (btn.disabled) return;
    const r    = document.createElement('span');
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.5;
    r.className = 'ripple';
    Object.assign(r.style, {
      width: size + 'px', height: size + 'px',
      left: (e.clientX - rect.left - size / 2) + 'px',
      top:  (e.clientY - rect.top  - size / 2) + 'px',
    });
    btn.appendChild(r);
    r.addEventListener('animationend', () => r.remove());

    if (navigator.vibrate) navigator.vibrate(8);
  });

  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}

function _btnLoading(btn, loading, label) {
  btn.classList.toggle('loading', loading);
  btn.disabled = loading;
  if (label) btn.querySelector('.btn-label').textContent = label;
}

function _dataRow(label, value, color) {
  const row = document.createElement('div');
  row.className = 'data-row';

  const lbl = document.createElement('span');
  lbl.className   = 'dr-label';
  lbl.textContent = label;

  const val = document.createElement('span');
  val.className   = 'dr-val';
  val.textContent = value;
  val.style.color = color;

  row.append(lbl, val);

  return {
    root: row,
    update(v, c) {
      const changed = val.textContent !== String(v ?? '—');
      val.textContent = String(v ?? '—');
      if (c) val.style.color = c;
      if (changed) {
        val.classList.remove('anim');
        requestAnimationFrame(() => val.classList.add('anim'));
        val.addEventListener('animationend', () => val.classList.remove('anim'), { once: true });
      }
    },
  };
}

function _progressBar(parent) {
  const wrap = document.createElement('div');
  wrap.className = 'prog-wrap';

  const track = document.createElement('div');
  track.className = 'prog-track';

  const fill = document.createElement('div');
  fill.className = 'prog-fill';

  const lbl = document.createElement('div');
  lbl.className = 'prog-label';

  track.appendChild(fill);
  wrap.append(track, lbl);
  parent.appendChild(wrap);

  return {
    show() { wrap.classList.add('vis'); },
    hide() { wrap.classList.remove('vis'); },
    set(pct, text) {
      fill.style.width      = Math.min(100, pct) + '%';
      fill.style.background = pct >= 100 ? COLORS.green : COLORS.purple;
      lbl.textContent       = text ?? '';
    },
  };
}

function _toast(message, type = 'info') {
  const stack = Store.get('_toastStack');
  if (!stack) return;

  const icons = { success: '✓', error: '✕', warn: '⚠', info: 'ℹ' };

  const t = document.createElement('div');
  t.className = `toast ${type}`;

  const icon = document.createElement('span');
  icon.className   = 'toast-icon';
  icon.textContent = icons[type] ?? 'ℹ';

  const msg = document.createElement('span');
  msg.textContent = message;

  t.append(icon, msg);
  stack.appendChild(t);

  setTimeout(() => {
    t.classList.add('out');
    t.addEventListener('animationend', () => t.remove(), { once: true });
  }, UI.TOAST_DURATION_MS);
}

// ─── Drag com Pointer Events ─────────────────────────────────────────────────

function _makeDraggable(elem, handle, storageKey) {
  let dragging = false;
  let startX = 0, startY = 0;
  let startLeft = 0, startTop = 0;
  let rafId = null;
  let pendingLeft = null, pendingTop = null;

  function applyPosition() {
    if (pendingLeft !== null && pendingTop !== null) {
      elem.style.left = pendingLeft + 'px';
      elem.style.top = pendingTop + 'px';
      pendingLeft = null;
      pendingTop = null;
    }
    rafId = null;
  }

  function schedulePosition(left, top) {
    pendingLeft = left;
    pendingTop = top;
    if (rafId === null) {
      rafId = requestAnimationFrame(applyPosition);
    }
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    
    e.preventDefault();
    
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = elem.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    
    handle.setPointerCapture(e.pointerId);
    
    elem.style.transition = 'none';
    elem.style.willChange = 'left, top';
    handle.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    document.body.style.pointerEvents = 'none';
  }

  function onPointerMove(e) {
    if (!dragging) return;
    
    let newLeft = startLeft + (e.clientX - startX);
    let newTop = startTop + (e.clientY - startY);
    
    const maxLeft = window.innerWidth - elem.offsetWidth;
    const maxTop = window.innerHeight - elem.offsetHeight;
    newLeft = Math.max(0, Math.min(maxLeft, newLeft));
    newTop = Math.max(0, Math.min(maxTop, newTop));
    
    const movedX = Math.abs(e.clientX - startX);
    const movedY = Math.abs(e.clientY - startY);
    if (movedX > 4 || movedY > 4) {
      elem._wasDragged = true;
    }

    schedulePosition(newLeft, newTop);
  }

  function onPointerUp(e) {
    if (!dragging) return;
    
    dragging = false;
    
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    
    if (pendingLeft !== null && pendingTop !== null) {
      elem.style.left = pendingLeft + 'px';
      elem.style.top = pendingTop + 'px';
      pendingLeft = null;
      pendingTop = null;
    }
    
    handle.releasePointerCapture(e.pointerId);
    
    elem.style.transition = '';
    elem.style.willChange = '';
    handle.style.cursor = '';
    document.body.style.userSelect = '';
    document.body.style.pointerEvents = '';
    
    AppStorage.set({ 
      [storageKey]: { 
        top: elem.style.top, 
        left: elem.style.left 
      } 
    });
  }

  function onPointerCancel(e) {
    if (dragging) onPointerUp(e);
  }

  handle.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerCancel);
  
  return function destroy() {
    handle.removeEventListener('pointerdown', onPointerDown);
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerCancel);
  };
}

function updateDataDisplay() {}

function showToast(msg, type) { _toast(msg, type); }

function _attachStoreListeners() {
  EventBus.on(EVENTS.LESSON_MARKED,   () => DebugLog.ok('UI: aula marcada'));
  EventBus.on(EVENTS.TOKEN_UPDATED,   () => DebugLog.ok('UI: token'));
  EventBus.on(EVENTS.COGNA_URL_FOUND, ({ nomeAula }) => DebugLog.ok('UI: Cogna', nomeAula));
}