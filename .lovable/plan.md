# Payment Gateway: Collect + Send (CHIP Disbursement)

Tambah integrasi kedua untuk **hantar duit** (disbursement/payout) melalui CHIP, di sebelah integrasi sedia ada untuk **terima duit** (collect).

## Apa yang berubah pada page Payment Gateway

Page `/payment-gateway` dipecah kepada dua tab:

```text
[ Payment Collect ]  [ Payment Send ]
```

- **Payment Collect** — kekal sama seperti sekarang (CHIP Collect: Brand ID, Secret API Key, success/failure redirect, webhook URL, Test connection, Save).
- **Payment Send** — borang baharu dengan medan yang sama bentuknya:
  - Enable/disable switch
  - Environment: Sandbox / Live
  - Brand ID (Send / Instant Transfer)
  - Secret API Key
  - Success redirect URL (opsyenal)
  - Failure redirect URL (opsyenal)
  - Webhook URL (dipapar untuk disalin ke dashboard CHIP Send)
  - Butang **Test connection** dan **Save settings**

Setiap tab disimpan berasingan, jadi kredensial collect dan send tidak bercampur.

## Penyimpanan data

Guna jadual `payment_gateways` sedia ada, tiada perubahan skema. Baris baharu dengan `provider = 'chip_send'` (collect kekal `provider = 'chip'`). Medan `enabled`, `mode`, `config` digunakan sama seperti collect. Policy RLS admin-only sedia ada terpakai automatik.

## Bahagian teknikal

- `src/pages/admin/PaymentGateway.tsx`: refactor borang jadi satu komponen boleh guna semula (`GatewayForm`) dengan prop `provider`, `title`, `description`, lalu render dua kali dalam Tabs.
- Edge function baharu `chip-test-send-connection`: sahkan admin, panggil endpoint CHIP Send (`GET /api/v1/send/limits/` atau `/send/accounts/`) dengan Bearer key untuk sahkan kredensial, pulangkan `{ ok, message }` — bentuk respons sama seperti `chip-test-connection` supaya UI tidak berubah.
- `supabase/config.toml`: daftar function baharu dengan `verify_jwt = true`.

## Skop

Plan ini hanya menyediakan **konfigurasi dan ujian sambungan** untuk Payment Send. Aliran sebenar untuk mencetuskan payout (contoh: settlement kepada merchant/rider) belum termasuk — boleh dibina selepas kredensial disahkan berfungsi.
