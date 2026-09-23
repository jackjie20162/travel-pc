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
- IM customer service (`src/plugin/im/`): right-side drawer, WebSocket直连 imGateway（`VITE_IM_WS_URL`，默认 `ws://127.0.0.1:9281/ws`），支持文本/图片/商品卡片（contentType 3）/订单卡片（contentType 4）；入口：产品详情“咨询客服”、订单详情“咨询此订单”、顶栏“客服”（登录后常驻连接 + 未读红点，订单推送另有高亮徽标）。
- Full sandbox E2E: pending deployed Travel API and test database.

## PayPal return URL

PayPal 同步回跳地址由后端 `travel-api.yaml` 的 `Payment.PayPal.ReturnURL` 配置。若回跳到 PC 站的原始路径（如 `https://<pc-domain>/payments/return?token=..&PayerID=..`），`src/router.js` 会自动将其重写为 hash 路由 `#/payments/return`，无需服务端额外配置。

## IM 对接

- 身份：客户 `user_type=3` + `biz_uid=登录用户 id`，咨询对象为商户客服 `user_type=2` + `biz_uid=merchantId`。
- 传输：WebSocket 不受 CORS 限制，因此不走 Vite 代理，直接由 `VITE_IM_WS_URL` 指定 imGateway；图片上传走 `VITE_IM_API_URL`（默认从 WS 地址推导 http 等价地址）。本地需先启动 imGateway(9281) 与其依赖的 Kafka/imWsRpc。
- 订单推送：由 travel-rpc 在支付成功/接单/退款审批/核销后调用 imGateway `POST /im/system-msg` 下发，PC 端只需在线接收。
