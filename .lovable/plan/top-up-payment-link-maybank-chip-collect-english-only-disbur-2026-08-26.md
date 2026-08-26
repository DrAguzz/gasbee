# Top-up Payment Link (Maybank → CHIP Collect) + English-only Disbursement

Add a payment link generator inside Admin → Disbursement so finance can move money from the Gasbee Maybank account back into CHIP Collect by paying a CHIP checkout link. Also convert all remaining Malay text in the Disbursement module to English.

## 1. Top-up payment link

New card "Top up CHIP Collect" on the Disbursement page:

- Admin enters an amount (and optional note/reference).
- Clicking "Generate payment link" creates a CHIP Collect purchase and returns a checkout URL.
- The link is shown with copy and open buttons, so finance can pay it from Maybank (FPX / card).
- A list of top-up links shows amount, date, status (pending / paid / failed), reference and the link itself.
- When the payment succeeds, the top-up is automatically marked paid and appears as a `bank_to_chip` fund movement, so the existing "Top up back to CHIP" and "Still at Maybank" totals stay correct — no double manual entry needed.

Manual fund movement records stay as they are for cases where money is moved outside CHIP.

## 2. English-only module

Translate all user-facing strings in the Disbursement page, fund movement card and disbursement queue to English (headings, flow steps, table headers, buttons, toasts, empty states).

## Technical section

**Database** — extend `public.fund_movements`:
- `status text not null default 'recorded'` (`recorded` | `pending` | `paid` | `failed`)
- `chip_purchase_id text`, `checkout_url text`
- Existing manual rows stay `recorded`; totals for "topped up to CHIP" count `recorded` + `paid` only.

**Edge function** — new `supabase/functions/chip-topup-link/index.ts`:
- Admin-only (validate JWT, check `public.is_admin`).
- Reads the `chip` (Collect) gateway config from `payment_gateways`, same pattern as `chip-create-purchase`.
- Inserts a `fund_movements` row with `direction = 'bank_to_chip'`, `status = 'pending'`, then creates a CHIP purchase with `reference = 'topup:<movement_id>'` and `success_callback` pointing to `chip-webhook`.
- Saves `chip_purchase_id` and `checkout_url` back on the row and returns the URL.

**Webhook** — `supabase/functions/chip-webhook/index.ts`: when the purchase `reference` starts with `topup:`, verify the purchase status with CHIP (existing verification path) and set the fund movement `status` to `paid` or `failed` instead of touching orders.

**Frontend**
- `src/components/admin/ChipTopupCard.tsx` — new card: amount input, generate button, link list with copy/open, refresh.
- `src/components/admin/FundMovementsCard.tsx` — show status badge, exclude `pending`/`failed` rows from totals, English strings.
- `src/components/admin/DisbursementQueue.tsx` and `src/pages/admin/Disbursement.tsx` — English strings; place the top-up card between the Send balance card and fund movements.

**Unchanged** — settlement generation, net payout formulas, CHIP Send payout and bank account flows.
