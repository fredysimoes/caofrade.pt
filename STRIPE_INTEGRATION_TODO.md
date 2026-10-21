# Stripe Checkout Integration TODO

This file is the single source of truth for completing and going live with the Stripe Embedded Checkout (`ui_mode: "form"`) integration on **Cãofrade.pt**.

---

## Values to Replace

The following values are placeholders and must be updated before going live.

**Files containing placeholders:**
- [js/app.js](js/app.js)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Your actual Stripe Publishable Key from the Stripe Dashboard (`https://dashboard.stripe.com/apikeys`). |

*(Note: In [api/checkout.js](api/checkout.js), `mode` (`"payment"`) and `line_items` (dynamically constructed from the customer's shopping cart and shipping cost in EUR) already use real application values and were preserved.)*

---

## Configured Parameters

These parameters were configured in Checkout Studio and are already set in your Checkout Session creation call.

**Files containing these parameters:**
- [api/checkout.js](api/checkout.js)

| Parameter | Value |
|-----------|-------|
| `ui_mode` | `"form"` |
| `billing_address_collection` | `"auto"` |
| `phone_number_collection` | `{ "enabled": false }` |
| `automatic_tax` | `{ "enabled": false }` |
| `submit_type` | `"auto"` |
| `integration_identifier` | `"custom_embedded_web_0001"` |

*(Note: `payment_method_collection: "always"` is omitted while `mode` is `"payment"`, as `payment_method_collection` is only applicable when `mode` is `"subscription"`.)*

---

## Setup and Next Steps

### 1. Environment Variables & API Keys
Configure the following environment variable in your Vercel project (**Settings → Environment Variables**) or local `.env` file:

```bash
STRIPE_SECRET_KEY=sk_test_...
```

- Retrieve your **Publishable Key** (`pk_test_...` / `pk_live_...`) and **Secret Key** (`sk_test_...` / `sk_live_...`) from the [Stripe Dashboard API Keys page](https://dashboard.stripe.com/apikeys).
- Update `STRIPE_PUBLISHABLE_KEY` in [js/app.js](js/app.js) with your Publishable Key.
- Never commit secret keys (`sk_...`) to version control.

### 2. Dependencies
The server-side Vercel function uses the `stripe` Node.js SDK configured with API version `2026-03-25.dahlia` in [package.json](package.json):

```bash
npm install
```

### 3. Project Structure of Updated Files
- [api/checkout.js](api/checkout.js) — Serverless endpoint (`POST /api/checkout`) that creates a Stripe Checkout Session using `ui_mode: "form"` on API version `2026-03-25.dahlia` and returns `{ client_secret: session.client_secret }`.
- [index.html](index.html) — Loads `https://js.stripe.com/dahlia/stripe.js` in `<head>` and provides the `<div id="checkout-form"></div>` container inside the checkout modal.
- [js/app.js](js/app.js) — Initializes `stripe.initCheckoutFormSdk({ clientSecret, appearance })`, mounts the expanded embedded form to `#checkout-form`, and wires `form.on('confirm', ...)` via `checkout.loadActions()`.
- [package.json](package.json) — Specifies the `stripe` Node SDK dependency.

### 4. How the Integration Works (Flow Overview)
1. When a customer opens the Checkout modal, [js/app.js](js/app.js) sends a `POST` request to `/api/checkout` with the current cart items and shipping cost.
2. [api/checkout.js](api/checkout.js) calls `stripe.checkout.sessions.create(...)` with `ui_mode: "form"` and returns `{ client_secret: session.client_secret }`.
3. The client initializes the Stripe Checkout Form SDK (`stripe.initCheckoutFormSdk`) with the configured appearance and mounts the embedded payment form into `#checkout-form`.
4. When the customer submits the payment form, the `confirm` event handler invokes `loadActionsResult.actions.confirm({ formConfirmEvent: event })` to complete payment confirmation.

### 5. Testing in Test Mode
Use `pk_test_...` and `sk_test_...` keys to test payments without real charges:
- **Visa (Success):** `4242 4242 4242 4242` (any future expiry date, any 3-digit CVC)
- **Mastercard (Success):** `5555 5555 5555 4444`
- **Declined Card:** `4000 0000 0000 0002`
- **3D Secure Authentication Required:** `4000 0027 6000 3184`

### 6. Next Steps (Products, Fulfillment & Order Tracking)
- **Products:** Manage your catalog in [js/products.js](js/products.js) or through the private Backoffice (`/?admin`).
- **Webhooks & Fulfillment:** Configure a Stripe webhook endpoint listening for `checkout.session.completed` in the [Stripe Workbench Webhooks Dashboard](https://dashboard.stripe.com/workbench/webhooks) to automate order status updates and fulfillment notifications.
- **Order Tracking:** Use the Backoffice **Encomendas & Envios** tab to copy customer addresses for AliExpress/DSers fulfillment or export orders via CSV.

### 7. Resources
- Stripe Support: https://support.stripe.com
- Stripe MCP & Documentation: https://docs.stripe.com/mcp
