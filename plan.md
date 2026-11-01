# Naroba — Pixel Identity Mint

## Implementasi

Naroba adalah landing page mint NFT satu halaman yang seluruh pengalaman utamanya berjalan di browser. React menangani state supply demo, pemilihan jalur wallet prompt atau AI agent, kalkulasi tier harga, validasi input, konfirmasi mint, dan gallery hasil mint. Karena alamat kontrak dan chain belum diberikan, aksi mint dibuat sebagai simulasi aman yang menunjukkan payload dan status; konfigurasi kontrak ditampilkan sebagai placeholder yang harus diganti sebelum transaksi on-chain diaktifkan.

Supply memakai konstanta 10.000 token. Tier harga dipetakan deterministik: token 1–1.000 gratis, token 1.001–9.000 (8.000 token) seharga 0.000222 BNB, dan token 9.001–10.000 (1.000 token) seharga 0.001 BNB. Setiap hasil mint menyimpan tier, harga, nomor token, dan prompt sehingga dapat ditampilkan kembali di gallery.

## Struktur proyek

- `client/src/pages/Home.tsx`: halaman Naroba, komponen visual pixel-art, state mint, wallet prompt, AI agent, dan gallery.
- `client/src/index.css`: sistem warna dark premium, layout editorial, pixel-art utilities, responsive breakpoints, dan animasi.
- `client/src/App.tsx`: route utama dan provider aplikasi.
- `client/public/manus-routes.json`: manifest route halaman.
- `TODO.md`: outcome implementasi dan status.

## Design

### Style options

- **Neo-arcade editorial** — 0.07: UI mint seperti terminal kolektor dengan aksen phosphor hijau.
- **Soft cyber relic** — 0.06: galeri gelap dengan kartu bercahaya dan tekstur arsip.
- **Monochrome pixel lab** — 0.05: interface eksperimental dengan grid, noise, dan objek pixel sederhana.

Dipilih: **Neo-arcade editorial**.

### Design movement

Neo-arcade editorial: referensi terminal game 16-bit dan landing page koleksi digital yang lebih tenang, dengan banyak ruang kosong, angka besar, dan panel seperti perangkat observasi.

### Core principles

1. Harga dan supply selalu menjadi informasi paling mudah dipindai.
2. Visual pixel-art menjadi identitas, bukan dekorasi yang menutupi fungsi.
3. Mint terasa seperti ritual singkat: pilih jalur, isi prompt, review, lalu mint.
4. Semua aksi berbahaya diberi status demo/configuration yang jelas sampai kontrak nyata tersedia.

### Color philosophy

Latar `#08090f` memberi kesan ruang digital yang hening. `#b9ff59` menjadi signature brand color untuk menandai status aktif dan energi hidup Naroba. Lilac `#a99cff` membawa rasa identitas dan imajinasi, sementara amber dipakai hemat sebagai sinyal proses atau tahap harga.

### Layout paradigm

Layout asimetris dua kolom: narasi dan identitas koleksi berada di sisi kiri, sedangkan kartu mint menjadi workstation di sisi kanan. Bagian gallery bergeser menjadi aliran kartu horizontal di bawahnya, supaya halaman terasa seperti arsip yang terus memanjang, bukan dashboard grid biasa.

### Signature elements

- Logo `N` berbentuk artefak pixel dalam kotak miring.
- Pixel avatar dengan outline hijau dan aura lilac.
- Garis scanline, dot-matrix, dan label monospace sebagai bahasa sistem.

### Interaction philosophy

Klik terasa langsung dan ringan. Button utama memakai highlight hijau yang jelas, tab mengubah workstation tanpa perpindahan halaman, dan prompt selalu terlihat sebelum pengguna mengonfirmasi mint. Status demo tidak disamarkan sebagai transaksi nyata.

### Animation

Gunakan drift halus pada avatar, shimmer pada progress bar, dan scanline pelan pada panel visual. Hindari animasi besar yang mengganggu pembacaan harga. Respek `prefers-reduced-motion` dengan mematikan drift dan shimmer.

### Typography system

Gunakan `Space Grotesk` untuk heading dan angka besar, `IBM Plex Mono` untuk label, harga, prompt, dan metadata. Heading memakai tracking sedikit negatif, label memakai uppercase dan letter-spacing lebar.

### Brand essence

Naroba adalah koleksi identitas pixel untuk orang yang ingin meninggalkan sinyal kecil di jaringan yang lebih besar. Kepribadiannya: observant, playful, precise.

### Brand voice

Singkat, tenang, sedikit misterius. Contoh: “Mint a signal. Keep the trace.” dan “Your prompt becomes a tiny identity.”

### Wordmark & logo

Logo berupa artefak `N` dari blok pixel hijau dan lilac dalam frame empat sudut, dipasangkan dengan wordmark Naroba yang bersih.

### Signature brand color

Naroba Signal — `#b9ff59`.


## Contract deployment console

Halaman multi-entry `/deploy.html` memakai alur tiga tahap seperti referensi Framlin: koneksi wallet owner, pemilihan BNB Testnet/Mainnet dan deploy ERC-721, lalu pengaturan Base URI serta kontrol open/close mint dan pemeriksaan read-only. Network awal adalah Testnet. Tidak ada private key atau seed phrase yang diminta; semua transaksi hanya menunggu tanda tangan eksplisit dari wallet.

`contracts/NarobaNFT.sol` memakai OpenZeppelin ERC-721, menyimpan suplai/harga fase 1.000 gratis, 8.000 × 0.000222 BNB, dan 1.000 × 0.001 BNB, dengan mint tertutup ketika kontrak dibuat. Base URI harus disiapkan dari CID metadata IPFS sebelum mint dibuka. Dana mint tertahan di kontrak sampai owner menariknya. Homepage mint panel masih simulasi dan tidak otomatis terhubung oleh deploy; UI console mengingatkan agar mint tetap tertutup sampai binding frontend publik dikerjakan.

Artifact ABI/bytecode dibuat ulang oleh `scripts/compile_naroba.mjs`; Vite membangun `index.html` dan `deploy.html` sebagai entry terpisah. `deploy.html` dirutekan langsung untuk GitHub Pages, dengan cache PWA dinaikkan agar halaman baru tidak tertutup cache lama.
