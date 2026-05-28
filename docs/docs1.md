# Ringkasan Perubahan Projek Gasbee

Dokumen ini menyenaraikan semua perubahan penting yang telah dibuat pada projek **Gasbee**, terutamanya berkaitan dengan integrasi sistem pembayaran (payment), konfigurasi Android, multi-variant build, dan pengurusan deep linking.

---

## 1. Integrasi Sistem Pembayaran (CHIP Payment Gateway)

Sistem pembayaran telah dikemaskini untuk menyokong kedua-dua platform **Web** dan **Native Mobile (Android)** secara lancar.

### Perubahan Utama:
* **Penyediaan `payment.service.ts`** (`src/services/payment.service.ts`):
  * Memisahkan logik pembayaran dari komponen UI ke dalam service helper.
  * Menggunakan `@capacitor/browser` untuk membuka checkout link di dalam in-app browser apabila aplikasi dijalankan di peranti native (mudah alih).
  * Menyediakan fungsi `createAndOpenPayment` dan `closePaymentBrowser` untuk mengendalikan transaksi secara automatik.
  * Mengesan platform secara dinamik untuk menentukan URL redirect (`Vercel` origin untuk peranti native, dan `window.location.origin` untuk web).

* **Penambahbaikan Halaman Status Pembayaran** (`src/pages/PaymentSuccess.tsx` & `src/pages/PaymentFailed.tsx`):
  * Menambah `useEffect` dengan pemasa (timer) selama 1.5 saat.
  * Selepas 1.5 saat, halaman secara automatik akan memanggil deep link custom scheme `gasbee://payment/success` atau `gasbee://payment/failed` untuk menghantar maklum balas terus ke aplikasi native dan menutup in-app browser secara automatik.

* **Pengemaskinian `UserPayment.tsx`** (`src/pages/user/UserPayment.tsx`):
  * Menggantikan kod inline memanggil Supabase Edge Function dan logik pemecahan iframe (`_top` target redirect) dengan memanggil fungsi daripada `createAndOpenPayment`.

---

## 2. Pembangunan Aplikasi Native Android & Konfigurasi Multi-Variant

Projek ini kini menyokong pembinaan dua variasi aplikasi Android yang berbeza iaitu **User (Pembeli)** dan **Rider (Penghantar)** menggunakan satu codebase yang sama.

### Perubahan Utama:
* **Pengasingan Folder Projek Android**:
  * Pengekodan disimpan di dalam folder berasingan: `android-user/` untuk aplikasi pengguna dan `android-rider/` untuk aplikasi rider.
* **Skrip Automasi Pembinaan APK** (`build-apk.sh`):
  * Ditambah/dikemaskini untuk menguruskan penyalinan konfigurasi variant, penyelarasan projek Android (`cap sync`), menjalankan utiliti konfigurasi, dan memulakan kompilasi gradle untuk menghasilkan fail APK (`gasbee-user-debug.apk` dan `gasbee-rider-debug.apk`) secara automatik di root directory.
* **Skrip Konfigurasi Dinamik** (`update-config.cjs`):
  * Menggantikan fail lama (`update-config.js`) kepada format CommonJS (`.cjs`) untuk keserasian execution node.
  * Memperbaharui fail `capacitor.config.ts`, `build.gradle` namespace, `strings.xml`, `AndroidManifest.xml` (Deep Links), dan fail penunjuk variant `src/variant.ts` berdasarkan parameter target (`user` atau `rider`).
* **Sokongan Deep Linking di Android (`AndroidManifest.xml`)**:
  * Menambah `intent-filter` dengan custom scheme `gasbee` di dalam `AndroidManifest.xml` bagi kedua-dua variasi aplikasi supaya peranti Android boleh mengenali URL scheme `gasbee://` untuk menutup in-app browser selepas pembayaran selesai.
  * Menetapkan `launchMode` kepada `singleTask` pada `MainActivity` bagi mengelakkan pembukaan multiple instance aplikasi semasa proses deep linking.
* **Kemaskini Versi Java**:
  * Menurunkan versi sasaran Gradle compileOptions daripada `JavaVersion.VERSION_21` kepada `JavaVersion.VERSION_17` di dalam `capacitor.build.gradle` untuk meningkatkan kestabilan dan mengelakkan isu keserasian JDK semasa proses build.
* **Penambahan Pakej Plugin Capacitor**:
  * Menambah rujukan dependencies plugins secara manual di dalam `capacitor.settings.gradle` dan `capacitor.build.gradle` (seperti `capacitor-app`, `capacitor-browser`, `capacitor-splash-screen`, dan `capacitor-status-bar`) bagi memastikan plugin native berfungsi dengan baik.

---

## 3. Kawalan Aliran Variant & Laluan (Routing)

* **Sekatan Laluan Login Rider** (`src/App.tsx` & `src/variant.ts`):
  * Memperkenalkan pembolehubah global `APP_VARIANT` untuk menjejaki jenis aplikasi yang sedang aktif.
  * Mengemaskini penghalaan (routing) bagi `/login` (Admin) dan `/user/login` (User). Jika variasi yang aktif adalah `rider`, sebarang cubaan melayari halaman login pengguna/admin akan dialihkan secara automatik (`Navigate`) ke `/merchant/login`.

---

## Fail-Fail Terlibat yang Diubah / Ditambah:

1. **`src/services/payment.service.ts`** [NEW] - Service pengurusan pembayaran CHIP.
2. **`update-config.cjs`** [NEW] - Skrip konfigurasi variant NodeJS.
3. **`docs/docs1.md`** [NEW] - Fail dokumentasi ini.
4. **`src/App.tsx`** [MODIFY] - Pengalihan laluan berdasarkan `APP_VARIANT`.
5. **`src/pages/PaymentSuccess.tsx`** [MODIFY] - Pemasa redirect deep link automatik (Success).
6. **`src/pages/PaymentFailed.tsx`** [MODIFY] - Pemasa redirect deep link automatik (Failed).
7. **`src/pages/user/UserPayment.tsx`** [MODIFY] - Integrasi dengan `payment.service.ts`.
8. **`build-apk.sh`** [MODIFY] - Automasi penuh kompilasi gradle dan pemindahan fail APK.
9. **`capacitor.config.ts`** [MODIFY] - Konfigurasi Capacitor mengikut variant aktif.
10. **`src/variant.ts`** [MODIFY] - Pembolehubah variant aktif.
11. **`android-rider/app/capacitor.build.gradle`** [MODIFY] - Penetapan JDK 17 & manual dependencies.
12. **`android-rider/app/src/main/AndroidManifest.xml`** [MODIFY] - Pendaftaran scheme `gasbee` & `singleTask`.
13. **`android-rider/capacitor.settings.gradle`** [MODIFY] - Plugin binding Capacitor.
14. **`android-user/app/capacitor.build.gradle`** [MODIFY] - Penetapan JDK 17 & manual dependencies.
15. **`android-user/app/src/main/AndroidManifest.xml`** [MODIFY] - Pendaftaran scheme `gasbee` & `singleTask`.
16. **`android-user/capacitor.settings.gradle`** [MODIFY] - Plugin binding Capacitor.
17. **`update-config.js`** [DELETE] - Dibuang untuk digantikan dengan `update-config.cjs`.
