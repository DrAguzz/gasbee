# Settlement Rider + Payout CHIP Send

Tambah aliran settlement untuk rider yang sama seperti merchant: jana settlement ikut tempoh, lihat pecahan, dan bayar terus ke akaun bank rider melalui CHIP Send.

## Cara ia berfungsi

- Pendapatan rider dikira daripada `delivery_fee` bagi setiap order berstatus `delivered` dalam tempoh yang dipilih.
- Net payout rider = jumlah delivery fee − potongan platform (peratus/flat, boleh diset; default 0).
- Rider mesti sudah daftar akaun bank di profil rider (kad payout sedia ada) sebelum boleh dibayar.

## Yang akan dibina

### 1. Jadual `rider_settlements`
Medan: rider, tempoh mula/tamat, jumlah penghantaran, jumlah delivery fee, potongan platform, net payout, status (pending/processing/paid/failed), tarikh dibayar, nota, serta medan payout CHIP (`chip_send_instruction_id`, `payout_state`, `payout_error`).
Akses: admin urus semua; rider hanya boleh lihat settlement dirinya sendiri.

### 2. Admin → Settlements: dua tab
- Tab **Merchant** — halaman sedia ada tanpa perubahan logik.
- Tab **Rider** — pilih rider + tempoh, butang Generate, jadual senarai settlement rider (jumlah trip, delivery fee, potongan, net, status, tarikh bayar) dan butang **Pay via CHIP Send**, Process / Mark paid / Failed seperti merchant.

### 3. Payout CHIP Send untuk rider
Edge function `chip-send-payout` diperluas supaya menerima `rider_settlement_id` selain `settlement_id`:
- ambil akaun bank `payout_bank_accounts` dengan `owner_type = 'rider'` dan `chip_bank_account_id`,
- hantar `POST /send/send_instructions` dengan amaun net payout dan `reference` unik (`RSTL-xxxxxxxx`),
- simpan `chip_send_instruction_id` + state, tandakan `paid` bila state `completed`,
- hantar notifikasi kepada rider.

`chip-send-webhook` dikemas kini untuk mengemas kini `rider_settlements` juga apabila state instruction berubah.

### 4. Paparan rider
Halaman baharu **Rider → Settlements** (pautan dalam menu rider): senarai settlement rider, status bayaran, dan kad akaun bank payout sedia ada supaya rider tahu bila bayaran diterima.

## Bahagian teknikal

- Migrasi: `CREATE TABLE public.rider_settlements` + GRANT (`authenticated`, `service_role`) + RLS (rider baca sendiri melalui `riders.user_id`, admin penuh melalui `is_admin`) + trigger `set_updated_at`.
- Setting potongan platform rider disimpan dalam `app_settings` (`rider_commission_type`, `rider_commission_value`) dan boleh diubah di Admin → Settings.
- `src/pages/admin/Settlements.tsx` dipecah kepada dua komponen: `MerchantSettlementsTab` (kod sedia ada) dan `RiderSettlementsTab` baharu, dibalut Tabs.
- Fail baharu: `src/pages/rider/RiderSettlements.tsx` + route dalam `src/App.tsx` dan menu `RiderLayout`.
