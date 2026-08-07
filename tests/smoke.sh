#!/usr/bin/env bash
# End-to-end API smoke test. Starts the PHP dev server against a throwaway
# data dir, exercises every endpoint, and fails on any unexpected response.
set -euo pipefail

cd "$(dirname "$0")/.."
WORKDIR=$(mktemp -d)
trap 'kill $SERVER_PID 2>/dev/null || true; rm -rf "$WORKDIR"' EXIT

cp -r ./* "$WORKDIR"/ 2>/dev/null || true
rm -rf "$WORKDIR/data"
php -S 127.0.0.1:8919 -t "$WORKDIR" >"$WORKDIR/server.log" 2>&1 &
SERVER_PID=$!

BASE=http://127.0.0.1:8919
for _ in $(seq 1 20); do
    curl -sf -o /dev/null "$BASE/index.php" && break
    sleep 0.2
done

fail() { echo "FAIL: $1"; exit 1; }
assert_contains() { # haystack needle label
    case "$1" in *"$2"*) echo "ok: $3";; *) fail "$3 — expected '$2' in: $1";; esac
}

UID1=aaaaaaaaaaaaaaaaaaaaaaaa
UID2=bbbbbbbbbbbbbbbbbbbbbbbb

RES=$(curl -s -X POST "$BASE/api.php?action=create_room" -d 'name=CI Crew')
assert_contains "$RES" '"code":"' 'create_room returns code'
CODE=$(echo "$RES" | php -r 'echo json_decode(stream_get_contents(STDIN))->code;')

RES=$(curl -s "$BASE/api.php?action=room_info&code=$CODE")
assert_contains "$RES" '"width":80' 'room_info returns dimensions'
assert_contains "$RES" '"palette"' 'room_info returns palette'

RES=$(curl -s -X POST "$BASE/api.php?action=place" -d "code=$CODE&uid=$UID1&nickname=Alice&x=3&y=4&color=5")
assert_contains "$RES" '"seq":1' 'first placement accepted'

RES=$(curl -s -X POST "$BASE/api.php?action=place" -d "code=$CODE&uid=$UID1&nickname=Alice&x=4&y=4&color=6")
assert_contains "$RES" '"error":"cooldown"' 'immediate second placement hits cooldown'

RES=$(curl -s -X POST "$BASE/api.php?action=place" -d "code=$CODE&uid=$UID2&nickname=Bob&x=10&y=10&color=2")
assert_contains "$RES" '"seq":2' 'other player not affected by cooldown'

RES=$(curl -s "$BASE/api.php?action=state&code=$CODE&uid=$UID1&nickname=Alice&since=0")
assert_contains "$RES" '[3,4,5]' 'state returns first pixel'
assert_contains "$RES" '[10,10,2]' 'state returns second pixel'
assert_contains "$RES" '"Alice"' 'state returns presence'

RES=$(curl -s "$BASE/api.php?action=state&code=$CODE&uid=$UID2&nickname=Bob&since=2")
assert_contains "$RES" '"events":[]' 'incremental state is empty when caught up'

RES=$(curl -s "$BASE/api.php?action=history&code=$CODE")
assert_contains "$RES" '"Bob"' 'history includes author nicknames'

RES=$(curl -s -X POST "$BASE/api.php?action=place" -d "code=$CODE&uid=$UID2&nickname=Bob&x=999&y=0&color=2")
assert_contains "$RES" 'out of bounds' 'out-of-bounds placement rejected'

RES=$(curl -s "$BASE/api.php?action=room_info&code=ZZZZZ")
assert_contains "$RES" 'Room not found' 'unknown room rejected'

STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/room.php?c=$CODE")
[ "$STATUS" = 200 ] || fail "room page returned $STATUS"
echo "ok: room page renders"

STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/room.php?c=NOPEX")
[ "$STATUS" = 404 ] || fail "missing room page returned $STATUS"
echo "ok: missing room 404s"

echo "All smoke tests passed."
