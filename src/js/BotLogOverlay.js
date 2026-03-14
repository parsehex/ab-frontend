"use strict";

const BOT_LOG_URL = 'http://127.0.0.1:3901/stream';
const ENABLE_QUERY = 'botlog';
const STORAGE_KEY = 'ab.botlog.overlay.enabled';
const MAX_EVENTS = 300;
const MENU_ITEM_ID = 'mainmenu-botlogs';

let overlayApi = null;

function isEnabledByDefault() {
  const params = new URLSearchParams(window.location.search);
  return params.get(ENABLE_QUERY) === '1';
}

function isOverlayEnabled() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === '1') return true;
  if (stored === '0') return false;
  return isEnabledByDefault();
}

function setOverlayEnabled(enabled) {
  localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
}

function levelName(level) {
  if (typeof level === 'string') return level.toUpperCase();
  const map = {
    10: 'TRACE',
    20: 'DEBUG',
    30: 'INFO',
    40: 'WARN',
    50: 'ERROR',
    60: 'FATAL'
  };
  return map[level] || String(level || 'INFO');
}

function eventTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '--:--:--';
  return date.toLocaleTimeString();
}

function renderEventLine(ev) {
  const bot = ev.bot || 'unknown';
  const type = ev.eventType || 'generic';
  const level = levelName(ev.level);
  const msg = ev.message || '(no message)';
  const ts = eventTime(ev.time);
  return `[${ts}] [${level}] [${bot}] [${type}] ${msg}`;
}

function createOverlay() {
  const root = document.createElement('div');
  root.id = 'ab-botlog-overlay';
  root.style.cssText = [
    'position:fixed',
    'right:12px',
    'bottom:12px',
    'width:min(640px,90vw)',
    'height:min(46vh,420px)',
    'display:flex',
    'flex-direction:column',
    'z-index:999999',
    'background:rgba(8,12,18,0.95)',
    'border:1px solid rgba(160,220,255,0.35)',
    'border-radius:8px',
    'font-family:Menlo,Monaco,Consolas,monospace',
    'font-size:12px',
    'color:#d6e7ff',
    'box-shadow:0 16px 48px rgba(0,0,0,0.35)'
  ].join(';');

  const header = document.createElement('div');
  header.style.cssText = [
    'display:flex',
    'align-items:center',
    'gap:8px',
    'padding:8px 10px',
    'border-bottom:1px solid rgba(160,220,255,0.25)',
    'background:rgba(11,18,26,0.96)'
  ].join(';');

  const title = document.createElement('strong');
  title.textContent = 'Bot Logs';
  title.style.color = '#9ad4ff';

  const status = document.createElement('span');
  status.textContent = 'disconnected';
  status.style.cssText = 'color:#f0b36b;opacity:0.95';

  const botFilter = document.createElement('select');
  botFilter.style.cssText = 'margin-left:auto;width:150px;background:#0f1622;color:#d6e7ff;border:1px solid #34485f;border-radius:4px;padding:4px 6px';

  const allBotsOpt = document.createElement('option');
  allBotsOpt.value = '';
  allBotsOpt.textContent = 'All bots';
  botFilter.appendChild(allBotsOpt);

  const typeFilter = document.createElement('input');
  typeFilter.placeholder = 'type filter';
  typeFilter.style.cssText = 'width:120px;background:#0f1622;color:#d6e7ff;border:1px solid #34485f;border-radius:4px;padding:4px 6px';

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear';
  clearBtn.style.cssText = 'background:#12314c;color:#d6e7ff;border:1px solid #35648a;border-radius:4px;padding:4px 8px;cursor:pointer';

  const body = document.createElement('div');
  body.style.cssText = 'flex:1;overflow:auto;padding:8px 10px;line-height:1.45;white-space:pre-wrap;word-break:break-word';

  const botNames = new Set();

  function stopOverlayInputEvent(ev) {
    ev.stopPropagation();
  }

  ['keydown', 'keyup', 'keypress', 'mousedown', 'mouseup', 'click', 'contextmenu'].forEach((eventName) => {
    root.addEventListener(eventName, stopOverlayInputEvent);
  });

  function refreshBotFilterOptions() {
    const selected = botFilter.value;
    const names = Array.from(botNames).sort((a, b) => a.localeCompare(b));

    while (botFilter.options.length > 1) {
      botFilter.remove(1);
    }

    for (const name of names) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      botFilter.appendChild(opt);
    }

    if (selected && names.includes(selected)) {
      botFilter.value = selected;
    }
  }

  header.appendChild(title);
  header.appendChild(status);
  header.appendChild(botFilter);
  header.appendChild(typeFilter);
  header.appendChild(clearBtn);

  root.appendChild(header);
  root.appendChild(body);
  document.body.appendChild(root);

  const events = [];

  function paint() {
    const botTerm = botFilter.value.trim().toLowerCase();
    const typeTerm = typeFilter.value.trim().toLowerCase();

    const rows = events.filter((ev) => {
      if (botTerm && (ev.bot || '').toLowerCase() !== botTerm) return false;
      if (typeTerm && !(ev.eventType || '').toLowerCase().includes(typeTerm)) return false;
      return true;
    });

    body.textContent = rows.map(renderEventLine).join('\n');
    body.scrollTop = body.scrollHeight;
  }

  function addEvent(ev) {
    if (ev && ev.bot) {
      const before = botNames.size;
      botNames.add(String(ev.bot));
      if (botNames.size !== before) {
        refreshBotFilterOptions();
      }
    }

    events.push(ev);
    if (events.length > MAX_EVENTS) {
      events.splice(0, events.length - MAX_EVENTS);
    }
    paint();
  }

  clearBtn.addEventListener('click', () => {
    events.length = 0;
    paint();
  });
  botFilter.addEventListener('input', paint);
  botFilter.addEventListener('change', paint);
  typeFilter.addEventListener('input', paint);

  return {
    setStatus(text, color) {
      status.textContent = text;
      if (color) status.style.color = color;
    },
    addEvent,
    destroy() {
      root.remove();
    }
  };
}

function startOverlay() {
  if (overlayApi) {
    return;
  }

  const ui = createOverlay();
  let eventSource = null;

  function connect() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    ui.setStatus('connecting', '#f0b36b');
    eventSource = new EventSource(BOT_LOG_URL);

    eventSource.onopen = function onOpen() {
      ui.setStatus('connected', '#8de88d');
    };

    eventSource.onmessage = function onMessage(event) {
      try {
        const payload = JSON.parse(event.data);
        ui.addEvent(payload);
      } catch (err) {
        ui.addEvent({
          time: Date.now(),
          level: 'warn',
          bot: 'overlay',
          eventType: 'parse-error',
          message: 'failed to parse event payload'
        });
      }
    };

    eventSource.onerror = function onError() {
      ui.setStatus('disconnected (retrying)', '#f39d9d');
    };
  }

  connect();

  overlayApi = {
    stop() {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      ui.destroy();
      overlayApi = null;
    }
  };
}

function stopOverlay() {
  if (!overlayApi) {
    return;
  }
  overlayApi.stop();
}

function installToggleHint() {
  const hint = document.createElement('div');
  hint.textContent = 'Bot logs: Ctrl+Shift+B or Main Menu';
  hint.style.cssText = [
    'position:fixed',
    'left:10px',
    'bottom:10px',
    'z-index:999998',
    'font:11px Menlo,Monaco,Consolas,monospace',
    'background:rgba(0,0,0,0.55)',
    'color:#9ec4e8',
    'padding:3px 6px',
    'border-radius:4px',
    'pointer-events:none'
  ].join(';');
  document.body.appendChild(hint);
}

function installMainMenuToggle() {
  const settings = document.querySelector('#mainmenu .settings');
  if (!settings || document.getElementById(MENU_ITEM_ID)) {
    return;
  }

  const item = document.createElement('div');
  item.className = 'item';
  item.id = MENU_ITEM_ID;
  item.innerHTML = [
    '<div class="tick"><div class="arrow" id="mainmenu-botlogs-tick"></div></div>',
    '<span class="name">Bot Logs Overlay</span>',
    '<span class="desc">Toggle dev bot telemetry panel (localhost:3901)</span>'
  ].join('');

  const tick = item.querySelector('#mainmenu-botlogs-tick');

  const repaintTick = () => {
    if (!tick) return;
    if (isOverlayEnabled()) {
      tick.style.display = 'block';
    } else {
      tick.style.display = 'none';
    }
  };

  item.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const next = !isOverlayEnabled();
    setOverlayEnabled(next);

    if (next) {
      startOverlay();
    } else {
      stopOverlay();
    }

    repaintTick();
  });

  settings.appendChild(item);
  repaintTick();
}

function boot() {
  installToggleHint();
  installMainMenuToggle();

  const enabled = isOverlayEnabled();
  if (enabled) {
    startOverlay();
  }

  document.addEventListener('keydown', (ev) => {
    const toggle = ev.ctrlKey && ev.shiftKey && String(ev.key).toLowerCase() === 'b';
    if (!toggle) return;
    ev.preventDefault();
    ev.stopPropagation();
    const next = !isOverlayEnabled();
    setOverlayEnabled(next);

    if (next) {
      startOverlay();
    } else {
      stopOverlay();
    }

    const tick = document.querySelector('#mainmenu-botlogs-tick');
    if (tick) {
      tick.style.display = next ? 'block' : 'none';
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
