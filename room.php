<?php

declare(strict_types=1);

require __DIR__ . '/lib/db.php';

$room = find_room((string) ($_GET['c'] ?? ''));
if ($room === null) {
    http_response_code(404);
    $title = 'Room not found';
} else {
    $title = $room['name'];
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<title><?= htmlspecialchars($title) ?> · Pixel Together</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body class="room">
<?php if ($room === null): ?>
<main class="home-card">
    <h1>Room not found</h1>
    <p class="tagline">That code doesn't match any canvas. Check it and try again.</p>
    <a class="btn primary" href="index.php">Back home</a>
</main>
<?php else: ?>
<header class="topbar">
    <a href="index.php" class="brand" title="Home">Pixel<span>Together</span></a>
    <div class="room-meta">
        <strong><?= htmlspecialchars($room['name']) ?></strong>
        <button id="code-btn" class="code" title="Copy invite link">#<?= htmlspecialchars($room['code']) ?></button>
    </div>
    <div class="topbar-right">
        <button id="timelapse-btn" class="btn small" title="Replay how it was built">▶ Timelapse</button>
        <div id="online" class="online" title="Online now"></div>
    </div>
</header>

<div id="viewport" class="viewport">
    <canvas id="board"></canvas>
    <div id="hover-cell" class="hover-cell hidden"></div>
</div>

<footer class="toolbar">
    <div id="cooldown" class="cooldown hidden"><div id="cooldown-fill" class="cooldown-fill"></div></div>
    <div id="palette" class="palette"></div>
    <div class="zoom-controls">
        <button id="zoom-out" class="btn small">−</button>
        <button id="zoom-in" class="btn small">+</button>
    </div>
</footer>

<dialog id="nickname-dialog">
    <form id="nickname-form" method="dialog" class="stack">
        <h2>Pick a name</h2>
        <p>So your friends know who's drawing what.</p>
        <input type="text" id="nickname-input" maxlength="24" placeholder="Your name" required>
        <button type="submit" class="btn primary">Start drawing</button>
    </form>
</dialog>

<div id="toast" class="toast hidden"></div>

<script>
window.ROOM_CODE = <?= json_encode($room['code']) ?>;
</script>
<script src="assets/room.js"></script>
<?php endif; ?>
</body>
</html>
