# ESP32-S3 U5 Gateway — Firmware Plan

## What this device does

A dedicated, always-on hardware bridge that replaces the Node.js poller script (`backend/scripts/u5Poller.ts`) described in `U5_DEVICE_INTEGRATION_HANDOFF.md`. It sits on the same LAN as the U5 terminal, polls it for new attendance records, and forwards them to the already-deployed Jenix backend. **Read that handoff doc first** — this firmware is a direct hardware port of a solution already proven working against real hardware; nothing about the protocol is new or speculative.

**Explicit non-goal: this device never touches photo data.** `pic_large` (the base64 JPEG per attendance record) must never be parsed into a buffer, held in memory, or forwarded anywhere. Photos stay on the U5 device only.

---

## Hardware

- **ESP32-S3** (any dev board — WROOM-1 or similar; PSRAM not required given the filtering approach below, but doesn't hurt if the board has it).
- WiFi only needed — no Ethernet, no display, no extra peripherals required for v1. A status LED (built-in on most dev boards) is enough for basic health signaling.

---

## Network topology

```
[U5 terminal]  --- LAN, plain HTTP ---  [ESP32-S3]  --- WiFi/internet, plain HTTP ---  [Jenix VPS]
192.168.1.92                                                    community.iotsoft.in
```

Both hops are **plain HTTP, no TLS**. Confirm the ESP32 is on the same WiFi network/subnet as the U5 terminal (or has routed access to `192.168.1.92`).

---

## Step 1 — Pull from the U5 device

```
POST http://192.168.1.92/getWorkNoteList
Content-Type: application/json
Body: {"password":"123456","type":2}
```

Response shape:
```json
{
  "result": 0,
  "data": [
    {
      "userid": "2120152124",
      "name": "Manoj jain",
      "checkin_time": "2026-08-13 20:31:13",
      "ispass": 1,
      "id_number": "...",
      "temp": 0,
      "pic_large": "<hundreds of KB of base64 — DO NOT PARSE INTO MEMORY>"
    },
    ...
  ]
}
```
`result: 0` = success. `checkin_time` is `"YYYY-MM-DD HH:MM:SS"`, in the device's own local clock (this exact unit defaults to China Standard Time / UTC+8 — the Jenix backend already handles this conversion server-side, see `deviceTimezoneOffsetMinutes` in the handoff doc; **the firmware should forward `checkin_time` as-is, unconverted**).

### Parsing this safely (the whole point of this plan)

Use **ArduinoJson v7**, `deserializeJson` with a **filter document** and a **Stream input** (not a fully-buffered string):

```cpp
#include <ArduinoJson.h>
#include <HTTPClient.h>

// Filter: only keep the fields we actually want. Everything else — pic_large
// included — is skipped by the parser without being buffered or allocated.
StaticJsonDocument<256> filter;
filter["result"] = true;
JsonObject filterData = filter["data"].createNestedObject();
filterData["userid"] = true;
filterData["name"] = true;
filterData["checkin_time"] = true;
filterData["ispass"] = true;
filterData["id_number"] = true;

HTTPClient http;
http.begin("http://192.168.1.92/getWorkNoteList");
http.addHeader("Content-Type", "application/json");
int code = http.POST("{\"password\":\"123456\",\"type\":2}");

if (code == 200) {
  JsonDocument doc; // ArduinoJson v7 auto-sized, small because of the filter
  DeserializationError err = deserializeJson(
    doc, http.getStream(),
    DeserializationOption::Filter(filter)
  );
  // doc now contains ONLY result + data[].{userid,name,checkin_time,ispass,id_number}
  // pic_large was never allocated.
}
http.end();
```

**Do not** call `http.getString()` first and then `deserializeJson` on the resulting `String` — that defeats the whole point by buffering the full (photo-laden) response before parsing. Always parse directly from `http.getStream()`.

---

## Step 2 — Deduplicate

- Store the last-forwarded `checkin_time` (as a Unix timestamp, converted from the `"YYYY-MM-DD HH:MM:SS"` string) in NVS via the `Preferences` library — this is flash-backed and survives power loss/reboot, equivalent to the Node poller's `STATE_FILE`.
- On each poll, only forward records with `checkin_time` strictly newer than the stored value.
- After a successful push (see Step 3), update the stored value to the newest `checkin_time` among the records just sent.

---

## Step 3 — Push to Jenix

```
POST http://community.iotsoft.in/api/devices/push/c59ada87b12b48338aa4aae008ae0f9b
Content-Type: application/json
Body: { "data": [ { "userid": "...", "name": "...", "checkin_time": "...", "ispass": 1 }, ... ] }
```

This is the **exact same endpoint and payload shape** the Node poller already uses successfully — no backend changes needed. Build this JSON with a small `JsonDocument` (only the filtered fields, so it's tiny) and `serializeJson`.

Expected response: `{"success": true, "data": {"received": <n>, "warning": null}}`, HTTP 200. Only advance the NVS-stored timestamp if this returns 200 — if the push fails, retry on the next poll cycle rather than losing the record.

The `apiKey` (`c59ada87b12b48338aa4aae008ae0f9b`) is the device's real, already-registered credential in Jenix (Society: Krishna Nagar, device "Main Gate U5"). Treat it as a secret — anyone with this URL can post fake attendance events. Don't hardcode it in a way that ends up in a public repo/log; store it in `Preferences` alongside WiFi credentials, or as a build-time define kept out of version control.

---

## Step 4 — Loop

- Poll interval: 15–30s is reasonable (matches the Node poller default of 15s; the U5's own `Poll time(s)` setting is currently 5s, but that's for its unrelated polling connection to a different server — no need to match it).
- Standard ESP32 WiFi reliability pattern: `WiFi.onEvent` (or a periodic `WiFi.status() != WL_CONNECTED` check) to auto-reconnect on drop.
- A watchdog timer (`esp_task_wdt`) is worth adding so a hang (e.g., device or Jenix unreachable mid-request) doesn't require a manual power cycle.

---

## Memory budget (why this is comfortable on ESP32-S3)

- Filtered parse of `getWorkNoteList`: proportional only to kept fields (`userid`, `name`, `checkin_time`, `ispass`, `id_number` per record) — even 50+ backlogged records is a few KB, not hundreds of KB.
- Outbound push JSON: same small field set, built fresh — trivial.
- No TLS stack needed (plain HTTP both hops) — saves the ~40-60KB mbedTLS/WiFiClientSecure would otherwise cost.
- No photo ever touches heap.

This fits comfortably within ESP32-S3's ~512KB SRAM without needing PSRAM, though a PSRAM-equipped board is harmless if that's what's on hand.

---

## Config the firmware needs (via `Preferences`, not hardcoded in source)

| Key | Value |
|---|---|
| WiFi SSID / password | your network |
| `u5_ip` | `192.168.1.92` (or wherever the terminal ends up) |
| `u5_password` | `123456` |
| `push_url` | `http://community.iotsoft.in/api/devices/push/c59ada87b12b48338aa4aae008ae0f9b` |
| `poll_interval_ms` | `15000` |
| `last_checkin_unix` | runtime state, starts at 0 |

A simple serial-console or captive-portal (`WiFiManager` library) provisioning flow is worth adding if this needs to be set up more than once (e.g., multiple gates/devices later) — not required for a single-unit v1.

---

## Validation checklist for your developer

1. Confirm the board can reach `http://192.168.1.92/getWorkNoteList` and get a 200 (test with a hardcoded minimal sketch before adding filtering).
2. Confirm the filtered parse produces the expected small `JsonDocument` — log `doc["data"].size()` and each kept field, confirm `pic_large` is absent from the parsed result, and watch free heap (`ESP.getFreeHeap()`) before/after to confirm no large spike.
3. Confirm a push to the Jenix endpoint returns `received` matching the number of records sent — cross-check against `GET /api/devices/6a7db2e43bde41dd65dbb232/event-logs` (authenticated, from the Jenix admin UI's "Push URL & Event Log" button on the device card) to see it land.
4. Trigger a real punch on the U5 device, confirm it shows up in Jenix within one poll cycle.
5. Power-cycle the ESP32, confirm no duplicate records get re-sent (NVS dedupe working).
6. Leave it running unattended for a few hours/overnight, confirm it's still polling (no WiFi-drop lockup) and no duplicate/missed records.
