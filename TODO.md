# Naroba TODO

## Header dan identitas visual — complete

- [x] Di kiri atas tampil nama web Naroba dan logo yang khas.
- [x] Terapkan tema dark premium dengan visual pixel-art sederhana yang sesuai konsep identitas digital.
- [x] Sediakan navigasi ringkas ke bagian koleksi, cara kerja, dan mint.

## Supply dan pricing — complete

- [x] Tampilkan total supply 10.000 NFT, archive supply snapshot, sisa supply, dan progress koleksi.
- [x] Terapkan free mint hanya untuk 1.000 token pertama (#0001–#1000).
- [x] Terapkan harga 0.000222 BNB untuk 8.000 token berikutnya (#1001–#9000).
- [x] Terapkan paid mint 0.001 BNB untuk 1.000 token terakhir (#9001–#10000).
- [x] Tampilkan tier aktif dan harga aktif sebelum konfirmasi mint.

## Wallet prompt dan AI agent — complete

- [x] Sediakan jalur mint dengan paste wallet prompt melalui textarea.
- [x] Validasi prompt agar pengguna tidak mengirim input kosong.
- [x] Sediakan jalur alternatif AI agent untuk membentuk prompt mint.
- [x] Sediakan prompt yang terlihat untuk freemint dan paid mint.
- [x] Tampilkan catatan bahwa alamat kontrak dan chain harus dikonfigurasi sebelum transaksi on-chain nyata.

## Mint result dan gallery — complete

- [x] Tampilkan status ready, reviewing, minted, dan error ringan di workstation mint.
- [x] Tambahkan hasil mint simulasi ke gallery dengan token, tier, harga, dan prompt.
- [x] Sediakan filter gallery untuk semua, freemint, dan paid mint.
- [x] Tampilkan pixel identity yang konsisten untuk setiap hasil.

## Responsif dan validasi — in progress

- [x] Layout desktop asimetris dan layout mobile yang dapat discroll dengan nyaman.
- [x] Register route manifest `/manus-routes.json`.
- [ ] Hubungkan tombol mint homepage ke address kontrak yang sudah dideploy; deploy console saja belum mengaktifkan mint publik.


## Owner deploy console — complete

- [x] Sediakan halaman langsung `/deploy.html` dengan alur sambungkan wallet, pilih BNB Testnet/Mainnet, lalu deploy.
- [x] Tambahkan kontrak ERC-721 suplai 10.000 dengan tahap 1.000 free, 8.000 × 0.000222 BNB, dan 1.000 × 0.001 BNB.
- [x] Pastikan deploy membuat wallet deployer sebagai owner dan mint tetap tertutup sampai owner membuka secara terpisah.
- [x] Tambahkan set Base URI, open/close mint, cek kontrak read-only, dan tarik hasil ke owner.
- [x] Jelaskan IPFS CID, biaya gas, transaksi wallet, ketiadaan seed phrase/private-key prompts, serta bahwa mint console homepage belum terhubung ke kontrak.
- [x] Bangun `deploy.html` sebagai entry multi-page, perbarui navigasi, dan invalidasi cache PWA lama.
- [x] Verifikasi kompilasi Solidity, TypeScript, test suite, dan build statis sebelum push.
