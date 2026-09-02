# travel-pc

Global Dubai Travel PC consumer client. The UI is Vue 3 + Vite and the desktop shell is Tauri 2.

## Architecture

`travel-pc -> HTTPS -> travel-api -> gRPC -> travel-rpc -> Ent/MySQL`

The client never connects directly to `travel-rpc`, MySQL, `merchant-api2`, or `merchant-rpc`.

## Local test

1. Install Node.js 20+ and Rust/Tauri prerequisites.
2. Set `VITE_TRAVEL_API_BASE_URL` if Travel API is not `http://localhost:9200`.
3. `npm install`
4. `npm run dev` for browser/H5-style testing.
5. `npm run tauri dev` for the Tauri desktop shell.
6. `npm run build` verifies the web production build.

The catalog page reads real data from `GET /api/travel/products`; no product price or inventory is fabricated by the client.

## Status

- Vue/Vite client: implemented.
- Responsive PC UI: implemented baseline.
- Tauri 2 desktop shell: implemented baseline.
- Product detail, traveler, cart, checkout and order UX: next development stage.
- Full sandbox E2E: pending deployed Travel API and test database.
