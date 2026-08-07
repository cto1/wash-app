<?php declare(strict_types=1); ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pixel Together</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body class="home">
<main class="home-card">
    <h1>Pixel<span>Together</span></h1>
    <p class="tagline">A shared canvas for your friend group. Place pixels, build something ridiculous together.</p>

    <form id="create-form" class="stack">
        <input type="text" id="create-name" maxlength="24" placeholder="Canvas name (e.g. The Lads)" required>
        <button type="submit" class="btn primary">Create a canvas</button>
    </form>

    <div class="divider"><span>or</span></div>

    <form id="join-form" class="stack">
        <input type="text" id="join-code" maxlength="5" placeholder="Room code" autocapitalize="characters" required>
        <button type="submit" class="btn">Join a canvas</button>
    </form>

    <div id="recent" class="recent hidden">
        <h2>Your canvases</h2>
        <ul id="recent-list"></ul>
    </div>

    <p id="home-error" class="error hidden"></p>
</main>
<script src="assets/home.js"></script>
</body>
</html>
