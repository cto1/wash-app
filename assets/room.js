'use strict';

const code = window.ROOM_CODE;
const board = document.getElementById('board');
const ctx = board.getContext('2d');
const viewport = document.getElementById('viewport');
const paletteEl = document.getElementById('palette');
const onlineEl = document.getElementById('online');
const hoverEl = document.getElementById('hover-cell');
const toastEl = document.getElementById('toast');
const cooldownEl = document.getElementById('cooldown');
const cooldownFill = document.getElementById('cooldown-fill');

const uid = localStorage.getItem('pt_uid') ||
    Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
localStorage.setItem('pt_uid', uid);

let nickname = localStorage.getItem('pt_nickname') || '';
let room = null;
let palette = [];
let seq = 0;
let selectedColor = 5;
let coolingUntil = 0;
let timelapsing = false;
let pollTimer = null;

// View transform: board is scaled/panned inside the viewport.
let scale = 8;
let panX = 0;
let panY = 0;

function applyTransform() {
    board.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

function fitToViewport() {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    scale = Math.min(vw / room.width, vh / room.height) * 0.95;
    panX = (vw - room.width * scale) / 2;
    panY = (vh - room.height * scale) / 2;
    applyTransform();
}

function toast(message, ms = 1800) {
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => toastEl.classList.add('hidden'), ms);
}

function drawPixel(x, y, color) {
    ctx.fillStyle = palette[color];
    ctx.fillRect(x, y, 1, 1);
}

function cellFromEvent(e) {
    const rect = board.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / scale);
    const y = Math.floor((e.clientY - rect.top) / scale);
    if (x < 0 || x >= room.width || y < 0 || y >= room.height) return null;
    return { x, y };
}

async function api(action, params, method = 'GET') {
    const url = new URL('api.php', location.href);
    url.searchParams.set('action', action);
    let options = {};
    if (method === 'POST') {
        options = { method, body: new URLSearchParams(params) };
    } else {
        for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data.error || 'Request failed');
        err.data = data;
        throw err;
    }
    return data;
}

async function place(x, y) {
    if (Date.now() < coolingUntil) return;
    const previous = ctx.getImageData(x, y, 1, 1);
    drawPixel(x, y, selectedColor);
    try {
        await api('place', { code, uid, nickname, x, y, color: selectedColor }, 'POST');
        startCooldown(room.cooldown);
    } catch (err) {
        ctx.putImageData(previous, x, y);
        if (err.data && err.data.error === 'cooldown') {
            startCooldown(err.data.wait);
        } else {
            toast(err.message);
        }
    }
}

function startCooldown(seconds) {
    coolingUntil = Date.now() + seconds * 1000;
    cooldownEl.classList.remove('hidden');
    cooldownFill.style.transition = 'none';
    cooldownFill.style.width = '100%';
    requestAnimationFrame(() => {
        cooldownFill.style.transition = `width ${seconds}s linear`;
        cooldownFill.style.width = '0%';
    });
    clearTimeout(startCooldown.timer);
    startCooldown.timer = setTimeout(() => cooldownEl.classList.add('hidden'), seconds * 1000);
}

async function poll() {
    try {
        const data = await api('state', { code, uid, nickname, since: seq });
        seq = data.seq;
        if (!timelapsing) {
            for (const [x, y, color] of data.events) drawPixel(x, y, color);
        }
        onlineEl.textContent = data.online.join(', ');
        onlineEl.title = 'Online now: ' + data.online.join(', ');
    } catch (err) {
        // Transient network errors: keep polling.
    }
    pollTimer = setTimeout(poll, 1500);
}

async function runTimelapse() {
    if (timelapsing) return;
    timelapsing = true;
    try {
        const { events } = await api('history', { code });
        if (!events.length) {
            toast('Nothing to replay yet — place some pixels!');
            return;
        }
        toast('Replaying…', 2500);
        ctx.fillStyle = palette[0];
        ctx.fillRect(0, 0, room.width, room.height);
        const duration = Math.min(8000, Math.max(2000, events.length * 25));
        const start = performance.now();
        let drawn = 0;
        await new Promise((resolve) => {
            function frame(now) {
                const target = Math.min(events.length, Math.ceil(((now - start) / duration) * events.length));
                while (drawn < target) {
                    const [x, y, color] = events[drawn++];
                    drawPixel(x, y, color);
                }
                if (drawn < events.length) requestAnimationFrame(frame);
                else resolve();
            }
            requestAnimationFrame(frame);
        });
    } catch (err) {
        toast(err.message);
    } finally {
        timelapsing = false;
        await resync();
    }
}

async function resync() {
    ctx.fillStyle = palette[0];
    ctx.fillRect(0, 0, room.width, room.height);
    seq = 0;
    const data = await api('state', { code, uid, nickname, since: 0 });
    seq = data.seq;
    for (const [x, y, color] of data.events) drawPixel(x, y, color);
}

function buildPalette() {
    palette.forEach((hex, i) => {
        const swatch = document.createElement('button');
        swatch.className = 'swatch' + (i === selectedColor ? ' selected' : '');
        swatch.style.background = hex;
        swatch.setAttribute('aria-label', 'Color ' + hex);
        swatch.addEventListener('click', () => {
            paletteEl.querySelector('.selected')?.classList.remove('selected');
            swatch.classList.add('selected');
            selectedColor = i;
        });
        paletteEl.append(swatch);
    });
}

// --- Pan / zoom / tap input ---------------------------------------------

const pointers = new Map();
let moved = false;
let pinchStart = null;

viewport.addEventListener('pointerdown', (e) => {
    viewport.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = false;
    if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale };
    }
});

viewport.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) {
        updateHover(e);
        return;
    }
    const prev = pointers.get(e.pointerId);
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;

    if (pointers.size === 1) {
        panX += dx;
        panY += dy;
        applyTransform();
    } else if (pointers.size === 2 && pinchStart) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        zoomAt(midX, midY, pinchStart.scale * (dist / pinchStart.dist));
        panX += dx / 2;
        panY += dy / 2;
        applyTransform();
    }
});

function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
    if (pointers.size === 0 && !moved && e.type === 'pointerup') {
        const cell = cellFromEvent(e);
        if (cell) place(cell.x, cell.y);
    }
}
viewport.addEventListener('pointerup', endPointer);
viewport.addEventListener('pointercancel', endPointer);

function zoomAt(cx, cy, newScale) {
    newScale = Math.max(1, Math.min(60, newScale));
    const rect = viewport.getBoundingClientRect();
    const px = cx - rect.left;
    const py = cy - rect.top;
    panX = px - ((px - panX) / scale) * newScale;
    panY = py - ((py - panY) / scale) * newScale;
    scale = newScale;
    applyTransform();
}

viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
}, { passive: false });

document.getElementById('zoom-in').addEventListener('click', () => {
    const rect = viewport.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, scale * 1.4);
});
document.getElementById('zoom-out').addEventListener('click', () => {
    const rect = viewport.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, scale / 1.4);
});

function updateHover(e) {
    const cell = cellFromEvent(e);
    if (!cell || e.pointerType !== 'mouse') {
        hoverEl.classList.add('hidden');
        return;
    }
    const boardRect = board.getBoundingClientRect();
    const vpRect = viewport.getBoundingClientRect();
    hoverEl.classList.remove('hidden');
    hoverEl.style.width = scale + 'px';
    hoverEl.style.height = scale + 'px';
    hoverEl.style.left = (boardRect.left - vpRect.left + cell.x * scale) + 'px';
    hoverEl.style.top = (boardRect.top - vpRect.top + cell.y * scale) + 'px';
}
viewport.addEventListener('pointerleave', () => hoverEl.classList.add('hidden'));

// --- Misc UI -------------------------------------------------------------

document.getElementById('code-btn').addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(location.href);
        toast('Invite link copied!');
    } catch {
        toast('Room code: ' + code);
    }
});

document.getElementById('timelapse-btn').addEventListener('click', runTimelapse);

window.addEventListener('resize', () => room && fitToViewport());

// --- Boot ----------------------------------------------------------------

async function start() {
    room = await api('room_info', { code });
    palette = room.palette;
    board.width = room.width;
    board.height = room.height;
    ctx.fillStyle = palette[0];
    ctx.fillRect(0, 0, room.width, room.height);
    fitToViewport();
    buildPalette();

    const rooms = JSON.parse(localStorage.getItem('pt_rooms') || '[]').filter((r) => r.code !== code);
    rooms.unshift({ code, name: room.name });
    localStorage.setItem('pt_rooms', JSON.stringify(rooms.slice(0, 8)));

    if (!nickname) {
        const dialog = document.getElementById('nickname-dialog');
        dialog.showModal();
        document.getElementById('nickname-form').addEventListener('submit', () => {
            nickname = document.getElementById('nickname-input').value.trim() || 'Anonymous';
            localStorage.setItem('pt_nickname', nickname);
            poll();
        });
    } else {
        poll();
    }
}

start().catch((err) => toast(err.message, 5000));
