# travel-pc

Global Dubai Travel PC consumer client. The UI is Vue 3 + Vite and the desktop shell is Tauri 2.

## Architecture

`travel-pc -> HTTPS -> travel-api -> gRPC -> travel-rpc -> Ent/MySQL`

The client never connects directly to `travel-rpc`, MySQL, `merchant-api2`, or `merchant-rpc`.

## Local test

1. Install Node.js 20+ and Rust/Tauri prerequisites.
2. API requests use relative paths proxied by Vite (`/api` -> `VITE_TRAVEL_API_BASE_URL`, default `http://localhost:9206`), same as travel-app; set `VITE_TRAVEL_API_ORIGIN` only if the client must call a different origin directly (requires backend CORS).
3. Set `VITE_TRAVEL_TENANT_ID` / `VITE_TRAVEL_MERCHANT_ID` to match the merchant data you want to show (local test data lives under tenant 2 / merchant 1; the travel-app stores the same values in localStorage `travel_tenant_id` / `travel_merchant_id`, which override the build-time defaults per browser).
4. `npm install`
5. `npm run dev` for browser/H5-style testing.
6. `npm run tauri dev` for the Tauri desktop shell.
7. `npm run build` verifies the web production build.

The catalog page reads real data from `GET /api/travel/products`; no product price or inventory is fabricated by the client.

## Status

- Vue/Vite client: implemented.
- Responsive PC official website: implemented with home, destination listing, and product detail pages.
- Middle East positioning: Dubai, Abu Dhabi, Doha, and Riyadh destination entries are included.
- Tauri 2 desktop shell: implemented baseline.
- Booking funnel (aligned with travel-app page logic): product detail booking panel (package -> 14-day date strip with live inventory prices/remaining -> people stepper) -> `#/booking` traveler/contact form (multilingual name, saved travelers/contacts, sessionStorage persistence) -> `#/payment` (PayPal redirect + Stripe Payment Element via CDN) -> `#/payments/return` PayPal capture -> `#/orders` status tabs with badges -> `#/orders/:orderNo` detail (cancel/refund/voucher).
- Auth: email-code login/register with image captcha at `#/login`; Bearer token shared via `travel_user_token` localStorage keys (same schema as travel-app); auth guard on booking/payment/orders routes.
- Currency: display-currency conversion (AED base, backend rates with static fallback), `X-Display-Currency` header on order create locks the rate; switcher in header nav.
- Full sandbox E2E: pending deployed Travel API and test database.

## PayPal return URL

PayPal 同步回跳地址由后端 `travel-api.yaml` 的 `Payment.PayPal.ReturnURL` 配置。若回跳到 PC 站的原始路径（如 `https://<pc-domain>/payments/return?token=..&PayerID=..`），`src/router.js` 会自动将其重写为 hash 路由 `#/payments/return`，无需服务端额外配置。
