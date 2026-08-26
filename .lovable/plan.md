# Modul Disbursement (Admin → Rider & Merchant)

Satu page baharu **Admin → Disbursement** yang menyatukan seluruh aliran duit, dari CHIP Collect sehingga masuk ke akaun bank rider dan merchant, berserta rekod audit untuk peringkat bank Maybank.

## Aliran yang dipapar

```text
1. Customer bayar          → CHIP Collect
2. Convert Collect → Send  → butang "Convert to Send budget" (sedia ada)
3. CHIP settle ke bank     → finance rekod: keluar ke Maybank Gasbee
4. Finance topup semula    → rekod: masuk balik ke CHIP Collect/Send
5. Disburse                → butang bayar setiap merchant / rider melalui CHIP Send
```

Page dibahagi kepada tiga bahagian:

**A. Baki & budget CHIP Send** — guna semula paparan baki sedia ada (Send balance, convertible from Collect, senarai permintaan budget) dan butang convert.

**B. Rekod pergerakan dana (Maybank)** — jadual manual untuk jejak audit. Admin/finance tambah rekod dengan:
- Jenis: `collect_to_bank` (CHIP → Maybank Gasbee) atau `bank_to_chip` (Maybank → CHIP)
- Amaun, tarikh, nombor rujukan, nota
- Muat naik slip / penyata (opsyenal)
Rekod boleh disemak semula, dan ringkasan menunjukkan jumlah keluar vs jumlah masuk supaya finance nampak baki yang belum ditopup semula.

**C. Senarai disbursement** — semua settlement yang belum dibayar (merchant + rider) dalam satu jadual dengan tab Merchant / Rider:
- Penerima, tempoh, amaun net payout, akaun bank berdaftar, status akaun bank, status payout
- Butang **Disburse via CHIP Send** untuk setiap baris (satu-satu, bukan batch)
- Amaun diambil terus daripada `net_payout` settlement sedia ada — tiada pengiraan baharu
- Baris yang tiada akaun bank CHIP menunjukkan amaran dan butang dimatikan
- Selepas berjaya, status dan `payout_state` dikemas kini seperti sedia ada (webhook CHIP menutup status kepada paid)

## Bahagian teknikal

**Pangkalan data** — jadual baharu `public.fund_movements`:
- `id`, `direction` (`collect_to_bank` | `bank_to_chip`), `amount numeric`, `moved_at date`, `reference text`, `notes text`, `proof_url text`, `created_by uuid`, `created_at`, `updated_at` + trigger `set_updated_at`
- GRANT kepada `authenticated` dan `service_role`; RLS: hanya admin (`public.is_admin(auth.uid())`) boleh baca/tulis
- Bucket storan `finance-docs` (private) untuk slip, dengan polisi storage admin-sahaja; papar guna komponen `SignedImage` sedia ada

**Frontend**
- `src/pages/admin/Disbursement.tsx` — page baharu, tiga bahagian di atas
- `src/components/admin/FundMovementsCard.tsx` — CRUD rekod pergerakan dana + ringkasan
- `src/components/admin/DisbursementQueue.tsx` — jadual settlement belum bayar (merchant/rider) + butang disburse
- Guna semula `ChipSendBalance` dan `PayoutBankAccountCard` sedia ada; guna semula edge function `chip-send-payout` (sudah menyokong `settlement_id` dan `rider_settlement_id`) — tiada edge function baharu diperlukan
- Daftar laluan `/disbursement` dalam `src/App.tsx` dan pautan menu dalam `src/components/admin/AdminLayout.tsx`

**Tidak berubah**
- Logik penjanaan settlement merchant/rider kekal di page Settlements
- Formula net payout kekal (gross − commission − delivery − service − processing untuk merchant; delivery fee − komisen untuk rider)
