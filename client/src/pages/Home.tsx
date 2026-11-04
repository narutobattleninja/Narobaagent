import {
  Bell,
  Bookmark,
  Check,
  CircleEllipsis,
  Compass,
  Feather,
  Home as HomeIcon,
  Image as ImageIcon,
  List,
  Mail,
  Menu,
  MoreHorizontal,
  Phone,
  Rocket,
  Search,
  Settings,
  Sparkles,
  UserRound,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

const SUPPLY = 10_000;
const CONTRACT_ADDRESS = "0x8cc34AaD007bF677FfED5E64e4a05c327609625d";
const BSC_RPC_URL = "https://bsc-dataseed.binance.org/";
const MINT_CALLDATA = "0x1249c58b";
const RPC_URLS = ["https://bsc-dataseed.binance.org/", "https://bsc.publicnode.com"];

function shortAddress(address: string) { return `${address.slice(0, 6)}...${address.slice(-4)}`; }
async function rpcPost(url: string, payload: unknown): Promise<any> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  return response.json();
}
async function readChainState() {
  for (const url of RPC_URLS) {
    try {
      const [minted, enabled] = await Promise.all([
        rpcPost(url, { jsonrpc: "2.0", method: "eth_call", params: [{ to: CONTRACT_ADDRESS, data: "0xa2309ff8" }, "latest"], id: 1 }),
        rpcPost(url, { jsonrpc: "2.0", method: "eth_call", params: [{ to: CONTRACT_ADDRESS, data: "0xd1239730" }, "latest"], id: 2 }),
      ]);
      return { totalMinted: Number.parseInt(minted.result, 16), mintEnabled: BigInt(enabled.result) === 1n };
    } catch { /* try next RPC */ }
  }
  throw new Error("Status blockchain belum tersedia.");
}

const navItems = [
  [HomeIcon, "Beranda"], [Compass, "Jelajahi"], [Bell, "Notifikasi"], [Mail, "Pesan"],
  [Bookmark, "Markah"], [List, "Daftar"], [Users, "Komunitas"], [UserRound, "Profil"], [MoreHorizontal, "Lainnya"],
] as const;

function Avatar({ image = "/nft/nrba-0001.png", className = "" }: { image?: string; className?: string }) {
  return <img className={`social-avatar ${className}`} src={image} alt="Naroba avatar" />;
}

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState("");
  const [chainMinted, setChainMinted] = useState<number | null>(null);
  const [mintEnabled, setMintEnabled] = useState<boolean | null>(null);
  const [status, setStatus] = useState("Memuat status mint...");
  const [mobileNav, setMobileNav] = useState(false);
  const [postText, setPostText] = useState("");
  const [posted, setPosted] = useState(false);

  useEffect(() => { readChainState().then((state) => { setChainMinted(state.totalMinted); setMintEnabled(state.mintEnabled); setStatus(state.mintEnabled ? "Mint aktif di BNB Chain" : "Mint belum dibuka oleh owner"); }).catch(() => setStatus("Status blockchain sedang offline")); }, []);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) throw new Error("Wallet tidak ditemukan. Buka melalui dApp browser.");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      if (!accounts[0]) throw new Error("Akun wallet tidak ditemukan.");
      try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] }); }
      catch (error) {
        if ((error as { code?: number }).code === 4902) await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0x38", chainName: "BNB Smart Chain", nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }, rpcUrls: [BSC_RPC_URL], blockExplorerUrls: ["https://bscscan.com"] }] });
        else throw error;
      }
      setAccount(accounts[0]); setConnected(true); setStatus(`Terhubung · ${shortAddress(accounts[0])}`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Koneksi wallet gagal."); }
  };

  const mint = async () => {
    if (!connected) return connectWallet();
    try {
      if (!window.ethereum) throw new Error("Wallet tidak ditemukan.");
      const state = await readChainState(); setChainMinted(state.totalMinted); setMintEnabled(state.mintEnabled);
      if (!state.mintEnabled) throw new Error("Mint belum dibuka oleh owner.");
      const token = state.totalMinted + 1; if (token > SUPPLY) throw new Error("Koleksi sudah habis.");
      const value = token <= 1000 ? "0x0" : token <= 9000 ? "0xc9f2c0000000" : "0x38d7ea4c68000";
      setStatus(`Menunggu konfirmasi wallet untuk Naroba #${String(token).padStart(4, "0")}...`);
      const hash = await window.ethereum.request({ method: "eth_sendTransaction", params: [{ from: account, to: CONTRACT_ADDRESS, value, data: MINT_CALLDATA }] }) as string;
      setStatus(`Mint terkirim · ${hash.slice(0, 10)}...`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Mint gagal."); }
  };

  const publish = () => { if (postText.trim()) { setPosted(true); setPostText(""); window.setTimeout(() => setPosted(false), 3200); } };
  const nextToken = Math.min((chainMinted ?? 0) + 1, SUPPLY);

  return (
    <div className="social-shell">
      <aside className={`social-sidebar ${mobileNav ? "social-sidebar--open" : ""}`}>
        <div className="social-logo"><span className="social-logo-mark">N</span><strong>Naroba</strong></div>
        <nav className="social-nav">{navItems.map(([Icon, label]) => <a href={label === "Beranda" ? "#top" : `#${label.toLowerCase()}`} key={label} className={label === "Beranda" ? "is-active" : ""}><Icon size={24} strokeWidth={label === "Beranda" ? 2.8 : 2} /><span>{label}</span>{label === "Notifikasi" && <b>3</b>}</a>)}</nav>
        <button className="social-post-button" onClick={() => document.getElementById("composer")?.scrollIntoView({ behavior: "smooth" })}><Feather size={19} /><span>Posting</span></button>
        <div className="social-profile"><Avatar /><div><strong>Naroba Dream</strong><span>@naroba_info</span></div><MoreHorizontal size={19} /></div>
      </aside>

      <main className="social-main" id="top">
        <header className="social-mobile-header"><button onClick={() => setMobileNav(!mobileNav)} aria-label="Buka menu">{mobileNav ? <X /> : <Menu />}</button><span className="social-logo-mark">N</span><button onClick={connectWallet} aria-label="Hubungkan wallet"><WalletCards size={20} /></button></header>
        <div className="social-feed">
          <div className="feed-tabs"><button className="is-selected">Untuk Anda</button><button>Mengikuti</button><button>Berita</button><button>Art</button><button>Web3</button><span>＋</span></div>
          <section className="composer" id="composer"><Avatar /><div className="composer-body"><textarea value={postText} onChange={(event) => setPostText(event.target.value)} placeholder="Apa yang sedang terjadi?" aria-label="Tulis posting" /><div className="composer-actions"><div><ImageIcon size={20} /><Sparkles size={20} /><MapPinIcon /><BarChartIcon /></div><button onClick={publish}>{posted ? <Check size={18} /> : "Posting"}</button></div></div></section>
          <div className="show-posts">{posted ? "Posting terkirim" : "Tampilkan 35 posting"}</div>
          <article className="social-post"><Avatar image="/nft/nrba-0638.png" /><div className="post-content"><div className="post-meta"><strong>Naroba Dream Agents</strong><span className="verified">✓</span><span>@naroba_info · 59m</span><MoreHorizontal size={17} /></div><p>Selamat datang di <b>naroba.info</b> — sebuah identitas kecil dari dunia yang lebih besar. Mint sinyalmu hari ini.</p><div className="post-card post-card--hero"><img src="/nft/nrba-2814.png" alt="Naroba Dream Agents artwork" /><div className="post-card-caption"><strong>Naroba Dream Agents — {SUPPLY.toLocaleString()} Dreams</strong><span>From naroba.info</span></div></div><div className="post-actions"><span>♡ 24</span><span>◌ 8</span><span>↗ 16</span><span>♡</span><span>⇧</span></div></div></article>
          <article className="social-post"><Avatar image="/nft/nrba-0771.png" /><div className="post-content"><div className="post-meta"><strong>Naroba Intelligence</strong><span className="verified">✓</span><span>@naroba_info · 2h</span><MoreHorizontal size={17} /></div><p>Every token is a trace. Every collector adds a new point to the archive.</p><div className="mini-grid"><img src="/nft/nrba-0001.png" alt="Identity 0001" /><img src="/nft/nrba-0004.png" alt="Identity 0004" /><img src="/nft/nrba-0007.png" alt="Identity 0007" /></div><div className="post-actions"><span>♡ 41</span><span>◌ 12</span><span>↗ 19</span><span>♡</span><span>⇧</span></div></div></article>
        </div>
      </main>

      <aside className="social-right"><div className="social-search"><Search size={18} /><input placeholder="Cari di Naroba" /></div><section className="trend-box"><h2>Yang sedang terjadi</h2><Trend label="Naroba Dream Agents" count="3.333 posting" /><Trend label="#Naroba" count="1.205 posting" /><Trend label="BNB Chain" count="982 posting" /><Trend label="Digital Identity" count="689 posting" /><a href="#top" className="show-more">Tampilkan lebih banyak</a></section><section className="trend-box follow-box"><h2>Siapa yang harus diikuti</h2><Follow image="/nft/nrba-0009.png" name="Naroba Studio" handle="@naroba_info" /><Follow image="/nft/nrba-0010.png" name="BNB Chain" handle="@BNBCHAIN" /><a href="#top" className="show-more">Tampilkan lebih banyak</a></section><footer className="social-footer">Ketentuan Layanan · Privasi · Kebijakan · © 2026 Naroba</footer></aside>
      <div className="mint-dock"><span className="mint-dock-status"><Zap size={15} /> {status}</span><span className="mint-dock-token">Next #{String(nextToken).padStart(4, "0")}</span><button onClick={mint} disabled={mintEnabled === false}>{connected ? "Mint NFT" : "Hubungkan Wallet"}</button></div>
    </div>
  );
}

function Trend({ label, count }: { label: string; count: string }) { return <a className="trend-item" href="#top"><span>Trending in Naroba</span><strong>{label}</strong><small>{count}</small><MoreHorizontal size={16} /></a>; }
function Follow({ image, name, handle }: { image: string; name: string; handle: string }) { return <div className="follow-item"><Avatar image={image} /><div><strong>{name}</strong><span>{handle}</span></div><button>Ikuti</button></div>; }
function MapPinIcon() { return <span className="fake-icon">⌖</span>; }
function BarChartIcon() { return <span className="fake-icon">▥</span>; }
