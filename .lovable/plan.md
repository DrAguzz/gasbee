# Settlement merchant: tolak delivery, service & processing fee

Settlement (khas untuk merchant) kini akan memaparkan dan menolak yuran platform sebelum bayaran keluar melalui CHIP Send. Komisen kekal seperti sedia ada (tiada perubahan pada cara ia dikira).

## Formula baharu

```text
Gross sales        = jumlah semua order berbayar (total_amount)
Commission         = seperti sekarang (kadar merchant / default)
Delivery fee       = jumlah delivery_fee order tersebut
Service fee        = jumlah service_fee order tersebut
Processing fee     = jumlah processing_fee order tersebut
Net payout         = Gross − Commission − Delivery − Service − Processing
```

## Perubahan pangkalan data

Tambah tiga lajur pada jadual `settlements` (default 0, tidak null):
- `delivery_fee_total`
- `service_fee_total`
- `processing_fee_total`

Rekod settlement lama kekal dengan nilai 0 supaya paparan tidak pecah.

## Perubahan aplikasi

**Admin → Settlements**
- Semasa "Generate", tarik juga `delivery_fee`, `service_fee`, `processing_fee` bagi setiap order berbayar dalam julat tarikh, jumlahkan dan simpan ke lajur baharu.
- Kira `net_payout` guna formula di atas.
- Tambah lajur Delivery, Service, Processing dalam jadual supaya admin nampak pecahan sebelum bayar.

**Merchant → Settlements**
- Tambah lajur yang sama dalam jadual merchant supaya merchant faham kenapa net payout lebih rendah daripada gross.
- Kemas kini nota "How settlements work" untuk sebut yuran delivery, service dan processing ditolak.

**Payout CHIP Send**
- Tiada perubahan logik; ia tetap membayar nilai `net_payout` yang kini sudah ditolak yuran.
