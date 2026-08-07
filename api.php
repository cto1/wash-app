<?php

declare(strict_types=1);

require __DIR__ . '/lib/db.php';

header('Content-Type: application/json');

function fail(string $error, int $status = 400): never
{
    http_response_code($status);
    echo json_encode(['error' => $error]);
    exit;
}

function clean_name(string $raw): string
{
    $name = trim(preg_replace('/\s+/', ' ', $raw) ?? '');
    if ($name === '' || mb_strlen($name) > 24) {
        fail('Name must be 1-24 characters');
    }
    return $name;
}

function require_room(): array
{
    $room = find_room((string) ($_GET['code'] ?? $_POST['code'] ?? ''));
    if ($room === null) {
        fail('Room not found', 404);
    }
    return $room;
}

function require_uid(): string
{
    $uid = (string) ($_GET['uid'] ?? $_POST['uid'] ?? '');
    if (!preg_match('/^[a-f0-9]{16,32}$/', $uid)) {
        fail('Invalid uid');
    }
    return $uid;
}

$action = $_GET['action'] ?? '';
$now = time();

switch ($action) {
    case 'create_room':
        $name = clean_name((string) ($_POST['name'] ?? ''));
        $code = generate_room_code();
        db()->prepare('INSERT INTO rooms (code, name, width, height, created_at) VALUES (?, ?, ?, ?, ?)')
            ->execute([$code, $name, CANVAS_WIDTH, CANVAS_HEIGHT, $now]);
        echo json_encode(['code' => $code]);
        break;

    case 'room_info':
        $room = require_room();
        echo json_encode([
            'code' => $room['code'],
            'name' => $room['name'],
            'width' => (int) $room['width'],
            'height' => (int) $room['height'],
            'palette' => PALETTE,
            'cooldown' => COOLDOWN_SECONDS,
        ]);
        break;

    case 'state':
        // Incremental events since a sequence number, plus presence heartbeat.
        $room = require_room();
        $uid = require_uid();
        $nickname = clean_name((string) ($_GET['nickname'] ?? ''));
        $since = max(0, (int) ($_GET['since'] ?? 0));

        db()->prepare('INSERT INTO presence (room_id, uid, nickname, last_seen) VALUES (?, ?, ?, ?)
                       ON CONFLICT (room_id, uid) DO UPDATE SET nickname = excluded.nickname, last_seen = excluded.last_seen')
            ->execute([$room['id'], $uid, $nickname, $now]);

        $stmt = db()->prepare('SELECT id, x, y, color FROM events WHERE room_id = ? AND id > ? ORDER BY id');
        $stmt->execute([$room['id'], $since]);
        $seq = $since;
        $events = [];
        foreach ($stmt as $row) {
            $seq = (int) $row['id'];
            $events[] = [(int) $row['x'], (int) $row['y'], (int) $row['color']];
        }

        $stmt = db()->prepare('SELECT nickname FROM presence WHERE room_id = ? AND last_seen > ? ORDER BY nickname');
        $stmt->execute([$room['id'], $now - 12]);
        echo json_encode([
            'seq' => $seq,
            'events' => $events,
            'online' => $stmt->fetchAll(PDO::FETCH_COLUMN),
        ]);
        break;

    case 'place':
        $room = require_room();
        $uid = require_uid();
        $nickname = clean_name((string) ($_POST['nickname'] ?? ''));
        $x = (int) ($_POST['x'] ?? -1);
        $y = (int) ($_POST['y'] ?? -1);
        $color = (int) ($_POST['color'] ?? -1);
        if ($x < 0 || $x >= (int) $room['width'] || $y < 0 || $y >= (int) $room['height']) {
            fail('Pixel out of bounds');
        }
        if ($color < 0 || $color >= count(PALETTE)) {
            fail('Invalid color');
        }

        $stmt = db()->prepare('SELECT MAX(created_at) FROM events WHERE room_id = ? AND uid = ?');
        $stmt->execute([$room['id'], $uid]);
        $last = (int) $stmt->fetchColumn();
        $wait = $last + COOLDOWN_SECONDS - $now;
        if ($wait > 0) {
            http_response_code(429);
            echo json_encode(['error' => 'cooldown', 'wait' => $wait]);
            break;
        }

        db()->prepare('INSERT INTO events (room_id, x, y, color, uid, nickname, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
            ->execute([$room['id'], $x, $y, $color, $uid, $nickname, $now]);
        echo json_encode(['seq' => (int) db()->lastInsertId()]);
        break;

    case 'history':
        // Full event log for timelapse replay.
        $room = require_room();
        $stmt = db()->prepare('SELECT x, y, color, nickname FROM events WHERE room_id = ? ORDER BY id');
        $stmt->execute([$room['id']]);
        $events = [];
        foreach ($stmt as $row) {
            $events[] = [(int) $row['x'], (int) $row['y'], (int) $row['color'], $row['nickname']];
        }
        echo json_encode(['events' => $events]);
        break;

    default:
        fail('Unknown action', 404);
}
