# CHIP Send: Aliran Collect → Send → Payout

Saya sudah baca dokumen "Process Flow for CHIP Send" dan spesifikasi OpenAPI rasmi. Nota penting: pemindahan duit dari Collect ke Send **memang ada API** — melalui "Budget Allocation" (bukan pindah bank manual seperti yang saya sebut sebelum ini).

## Aliran rasmi

```text
1. Pelanggan bayar (CHIP Collect)          POST /purchases/
2. Semak baki boleh tukar                  GET  /send/accounts
   -> convertible_balance_from_statement, current_balance, send_fee, approvals
3. Mohon tukar baki jadi Send Budget       POST /send/send_limits   { amount }
   -> emel dihantar ke approver; status pending -> success
   -> mesti diluluskan sebelum 12 PM MYT hari berikutnya, jika tidak expired
4. Daftar penerima (bank)                  POST /send/bank_accounts
   { account_number, bank_code, name, reference } -> simpan id
5. Bayar keluar                            POST /send/send_instructions
   { bank_account_id, amount, email, description, reference }
```

Semua guna header `Authorization: Bearer <API Key>`, `epoch`, `checksum` (HMAC-SHA512 `epoch+API Key` dengan API Secret) — sudah betul dalam projek.

## Apa yang akan dibina

### 1. Admin → Payment Gateway → tab "Send Balance"
- Papar baki langsung dari `GET /send/accounts`: baki semasa, baki settlement yang boleh ditukar, send fee, bilangan kelulusan diperlukan.
- Butang **Convert to Send Budget** dengan medan amaun → `POST /send/send_limits`.
- Senarai permintaan budget (`GET /send/send_limits`) dengan status pending/success/expired, supaya admin tahu bila approver sudah lulus.

### 2. Akaun bank penerima
- Jadual baharu `payout_bank_accounts`: pemilik (merchant atau rider), nama, nombor akaun, `bank_code` (SWIFT, cth MBBEMYKL), `chip_bank_account_id`, status, `reference`.
- Merchant boleh isi akaun bank sendiri di `Merchant → Settlements`; rider di profil rider; admin boleh urus semua.
- Bila disimpan, ia didaftar ke CHIP (`POST /send/bank_accounts`) dan `id` CHIP disimpan untuk payout.

### 3. Payout settlement
- Di `Admin → Settlements`, butang **Pay via CHIP Send** pada settlement berstatus pending.
- Panggil `POST /send/send_instructions` guna `bank_account_id` merchant, amaun = `net_payout`, `reference` = kod settlement (elak pendua).
- Simpan `chip_send_instruction_id` + state pada baris settlement; tandakan `paid` bila CHIP pulangkan `completed`.

### 4. Webhook
- Edge function `chip-send-webhook` untuk terima kemas kini status bank account dan send instruction, dan kemas kini status dalam pangkalan data secara automatik.

## Bahagian teknikal

- Edge functions baharu, semuanya admin-only kecuali dinyatakan, guna helper checksum sedia ada dipindah ke `supabase/functions/_shared/chip-send.ts`:
  - `chip-send-accounts` (GET accounts + send_limits)
  - `chip-send-convert` (POST send_limits)
  - `chip-send-bank-account` (POST/DELETE bank_accounts)
  - `chip-send-payout` (POST send_instructions, kemas kini settlement)
  - `chip-send-webhook` (verify signature CHIP, kemas kini status)
- Kredensial diambil dari baris `payment_gateways` `provider = 'chip_send'` (sudah wujud), termasuk mod sandbox/live.
- Migrasi: jadual `payout_bank_accounts` (RLS + GRANT), kolum tambahan pada `settlements` (`chip_send_instruction_id`, `payout_state`, `payout_error`).

## Nota / prasyarat

- Staging ada had RM 1,000 sehari untuk budget allocation; production tiada had selain baki settlement.
- Setiap permintaan conversion perlu kelulusan melalui emel approver yang didaftarkan dengan CHIP — langkah ini tidak boleh diautomasi dari app.

## Skop yang tidak termasuk

Payout rider automatik berjadual (auto-payout tanpa tekan butang) — boleh ditambah selepas aliran manual ini terbukti stabil.
