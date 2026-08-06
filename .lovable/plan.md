# Betulkan sambungan CHIP Send mengikut dokumentasi rasmi

Dokumentasi CHIP Send menunjukkan dua perbezaan berbanding pelaksanaan semasa dalam projek, dan kedua-duanya akan menyebabkan kegagalan sambungan.

## Apa yang salah sekarang

1. **Signing string tidak lengkap.** Kod semasa mengira checksum daripada `epoch` sahaja. Dokumentasi menetapkan `epoch + API Key` digabung tanpa pemisah, kemudian HMAC-SHA512 dengan API Secret, output hex.
2. **Path endpoint salah.** Kod semasa memanggil `/send_limits/`. Endpoint rasmi berada di bawah prefix `/send/`, contohnya `/send/accounts`.

Base URL sedia ada sudah betul: `https://staging-api.chip-in.asia/api` (staging) dan `https://api.chip-in.asia/api` (production).

## Apa yang akan dibuat

Kemas kini edge function `chip-test-send-connection`:

- Bina signing string `` `${epoch}${api_key}` `` dan tandatangan HMAC-SHA512 hex dengan API Secret.
- Tukar panggilan ujian kepada `GET {base}/send/accounts` — endpoint Accounts adalah langkah pertama dalam aliran integrasi rasmi dan sesuai untuk mengesahkan kredensial.
- Kekalkan tiga header: `Authorization: Bearer <API Key>`, `epoch`, `checksum`, dan kira semula checksum pada setiap permintaan.
- Perbaiki mesej ralat: bezakan 401 (checksum/epoch/API key) daripada ralat lain, dan sertakan nota jam pelayan mesti dalam 30 saat.
- Pada kejayaan, papar ringkasan akaun (bilangan akaun dan baki convertible jika ada) supaya admin nampak sambungan benar-benar berfungsi.

Borang UI di `Admin → Payment Gateway → Payment Send` tidak berubah — medan API Key dan API Secret sedia ada sudah mencukupi (tiada Brand ID diperlukan).

## Pengesahan

Selepas perubahan, saya boleh sahkan implementasi HMAC terhadap vektor ujian dalam dokumentasi (epoch `1689826456`, key `e0645c9e-...`, secret `a118729e-...` → checksum `45bee62d...`) sebelum anda tekan Test connection dengan kredensial sebenar.

## Skop

Hanya ujian sambungan dan pengesahan kredensial. Aliran payout sebenar (Increase Send Limit, Add Bank Account, Create Send Instruction) belum termasuk dan boleh dibina selepas sambungan disahkan.
