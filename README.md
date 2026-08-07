# Pixel Together

A shared pixel canvas for groups of friends — r/place, but private for your group. Create a canvas, share the room code, and build something ridiculous together. Works live and asynchronously: drop in whenever, place pixels, watch the picture evolve.

## Features

- Private rooms with 5-letter join codes — no accounts, just pick a nickname
- 80×60 canvas, 16-color palette, tap/click to place pixels
- Live updates (polling), who's-online list, per-player cooldown
- Pan, pinch/scroll zoom, mobile-first UI
- Timelapse replay of how the canvas was built

## Stack

Plain PHP 8 + SQLite (PDO), vanilla JS and CSS. No frameworks, no build step — runs on any PHP host.

## Run locally

```
php -S localhost:8000
```

Then open http://localhost:8000. The SQLite database is created automatically in `data/`.

## Deploy

Copy the files to any PHP 8+ host with the `pdo_sqlite` extension. Make sure the web server can write to `data/` (created automatically), and ideally deny direct HTTP access to it.
