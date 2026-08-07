<?php

declare(strict_types=1);

const CANVAS_WIDTH = 80;
const CANVAS_HEIGHT = 60;
const COOLDOWN_SECONDS = 2;
const PALETTE = [
    '#FFFFFF', '#E4E4E4', '#888888', '#222222',
    '#FFA7D1', '#E50000', '#E59500', '#A06A42',
    '#E5D900', '#94E044', '#02BE01', '#00D3DD',
    '#0083C7', '#0000EA', '#CF6EE4', '#820080',
];

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dir = __DIR__ . '/../data';
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $pdo = new PDO('sqlite:' . $dir . '/canvas.db');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec('PRAGMA journal_mode = WAL');
        $pdo->exec('PRAGMA busy_timeout = 5000');
        $pdo->exec('
            CREATE TABLE IF NOT EXISTS rooms (
                id INTEGER PRIMARY KEY,
                code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id INTEGER NOT NULL,
                x INTEGER NOT NULL,
                y INTEGER NOT NULL,
                color INTEGER NOT NULL,
                uid TEXT NOT NULL,
                nickname TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_events_room ON events (room_id, id);
            CREATE INDEX IF NOT EXISTS idx_events_cooldown ON events (room_id, uid, created_at);
            CREATE TABLE IF NOT EXISTS presence (
                room_id INTEGER NOT NULL,
                uid TEXT NOT NULL,
                nickname TEXT NOT NULL,
                last_seen INTEGER NOT NULL,
                PRIMARY KEY (room_id, uid)
            );
        ');
    }
    return $pdo;
}

function find_room(string $code): ?array
{
    $stmt = db()->prepare('SELECT * FROM rooms WHERE code = ?');
    $stmt->execute([strtoupper($code)]);
    $room = $stmt->fetch(PDO::FETCH_ASSOC);
    return $room === false ? null : $room;
}

function generate_room_code(): string
{
    // Unambiguous letters only (no I/O/0/1 lookalikes).
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    do {
        $code = '';
        for ($i = 0; $i < 5; $i++) {
            $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }
    } while (find_room($code) !== null);
    return $code;
}
