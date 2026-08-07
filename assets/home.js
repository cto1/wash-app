'use strict';

const errorEl = document.getElementById('home-error');

function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

document.getElementById('create-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('create-name').value.trim();
    if (!name) return;
    try {
        const res = await fetch('api.php?action=create_room', {
            method: 'POST',
            body: new URLSearchParams({ name }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not create room');
        rememberRoom(data.code, name);
        location.href = 'room.php?c=' + data.code;
    } catch (err) {
        showError(err.message);
    }
});

document.getElementById('join-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = document.getElementById('join-code').value.trim().toUpperCase();
    if (code) location.href = 'room.php?c=' + encodeURIComponent(code);
});

function rememberRoom(code, name) {
    const rooms = JSON.parse(localStorage.getItem('pt_rooms') || '[]')
        .filter((r) => r.code !== code);
    rooms.unshift({ code, name });
    localStorage.setItem('pt_rooms', JSON.stringify(rooms.slice(0, 8)));
}

const recent = JSON.parse(localStorage.getItem('pt_rooms') || '[]');
if (recent.length) {
    const list = document.getElementById('recent-list');
    for (const room of recent) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = 'room.php?c=' + encodeURIComponent(room.code);
        a.textContent = room.name;
        const span = document.createElement('span');
        span.textContent = '#' + room.code;
        a.append(' ', span);
        li.append(a);
        list.append(li);
    }
    document.getElementById('recent').classList.remove('hidden');
}
