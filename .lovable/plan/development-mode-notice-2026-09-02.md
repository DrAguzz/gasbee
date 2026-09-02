# Development Mode Notice

Admin boleh hidup/matikan "Development Mode". Bila aktif, setiap kali user buka aplikasi (selepas login), popup notis keluar memberitahu aplikasi dalam pembangunan dan tiada penghantaran akan dilakukan. Teks notis boleh diedit oleh admin.

## Admin side (Settings → System)

Seksyen baru "App Status / Development Mode" dalam halaman Settings admin:
- Toggle: Development mode on/off
- Field: Tajuk notis (default: "Mobile App dalam tempoh percubaan")
- Field: Mesej notis (textarea, default: "Aplikasi sedang dalam pembangunan semula. Tiada penghantaran akan dilakukan sepanjang tempoh ini.")
- Field: Teks butang (default: "Faham")
- Butang Save yang sedia ada menyimpan semua nilai ini

## User side

- Selepas login / setiap kali aplikasi dibuka, aplikasi baca status dev mode.
- Jika aktif, popup (dialog tidak boleh ditutup dengan klik luar) keluar dengan tajuk + mesej + butang.
- Notis keluar setiap kali user buka aplikasi (satu kali per sesi buka, bukan setiap tukar halaman) — guna penanda sessionStorage supaya tidak berulang semasa navigasi dalam sesi yang sama.
- Bila dev mode off, tiada popup langsung.

## Technical details

1. Migration: kemas kini fungsi `get_public_fee_settings` (atau tambah RPC `get_public_app_settings`) supaya turut memulangkan kunci `dev_mode_enabled`, `dev_mode_title`, `dev_mode_message`, `dev_mode_button`. Ini perlu kerana RLS `app_settings` hanya benarkan admin baca terus. Seed nilai default ke `app_settings`.
2. `src/pages/admin/Settings.tsx`: tambah seksyen baharu dengan Switch + Input + Textarea, disimpan ke `app_settings` melalui upsert sedia ada.
3. Komponen baharu `src/components/user/DevModeNotice.tsx`: panggil RPC, papar `AlertDialog` bila `dev_mode_enabled` benar dan penanda sesi belum diset.
4. Pasang komponen dalam `src/components/user/UserLayout.tsx` (selepas BeeIntro) supaya ia meliputi semua halaman user.
