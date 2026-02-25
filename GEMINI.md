# GEMINI.md: Project "Cable Force" ⚡️🎮

## 1. Executive Summary
**Cable Force** is a high-tension, 8-bit retro multiplayer QTE race. Two players compete to pull a massive power cable by matching rapid-fire arrow sequences. The first to 50 points (5 rounds) wins.

## 2. Technical Stack
*   **Frontend:** Phaser 3 (Canvas, `pixelArt: true`).
*   **Backend:** Node.js + Socket.io (WebSocket-first transport).
*   **State/Session:** Redis (via `@socket.io/redis-adapter`).
*   **Networking:** Kubernetes **Gateway API** (Envoy Gateway) + `BackendTrafficPolicy` (Sticky Sessions).
*   **Infrastructure:** Docker Compose (Local) / Kind (Cluster Dev) / GitHub Actions (CI/CD).

## 3. Senior Dev "Golden Rules" (The Checklist)
*   **[x] Frame-Independent Movement:** Animations (cable jitter, kid sway) are calculated via sin-waves and delta-time.
*   **[x] Object Pooling:** Arrow UI icons in `GameScene` use an internal array-based pool to minimize GC overhead during fast QTEs.
*   **[x] Anti-Cheat:** Server-side validation ensures a minimum 400ms delay between `roundStart` and submission.
*   **[ ] Audio Context:** (CURRENT FOCUS) Implement a "START" button to safely unlock browser audio.
*   **[x] Sticky Sessions:** Required for Socket.io. Implemented via Envoy's `ConsistentHash` using the `cable-force-sid` cookie.
*   **[x] Sync Handshake:** The `playerReady` signal ensures both clients have fully loaded the scene before the QTE loop begins.

## 4. Solved Architectural Challenges
### A. The "Socket.io Saga" (Connection Stability)
*   **Issue:** Port 3000 hardcoding caused 404/400 errors when moving from standalone Docker to an Ingress/Gateway.
*   **Fix:** Updated `LobbyScene.js` to dynamically detect `window.location.port`.
*   **Fix:** Standardized transport to `['websocket', 'polling']` with a websocket-first preference.
*   **Fix:** Implemented an Nginx reverse proxy inside the Frontend container to mirror production routing (`/socket.io` -> `backend`).

### B. Gateway API Migration
*   **Context:** Ingress NGINX is entering retirement. The project successfully migrated to **Gateway API v1.4.1** using **Envoy Gateway**.
*   **Infrastructure-as-Code:** An all-in-one `setup-gateway-api.sh` script automates Kind cluster creation, Experimental CRD installation, and service patching.

## 5. Design & Identity
*   **Resolution:** Native 256x240 (NES Standard).
*   **Theme:** "Playground Grit." Focus on physical effort, sweat, and 8-bit toughness (e.g., *Power Plugger* or *Heavy Hauler* vibes).
*   **Visuals:** Placeholders currently represent the 32x32px "Kid" and the jittering cable. Animations include "Pulling," "Winning Jump," and "Failure Stumble."

## 6. Current Roadmap
1.  **Phase 3 (Audio/Visual):** Replace placeholders with 8-bit sprites. Implement 140 BPM BGM and square-wave SFX.
2.  **Phase 4 (Final Polish):** Refine the "START" screen and "Game Over" transitions.
