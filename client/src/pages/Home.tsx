import {
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Check,
  ChevronDown,
  Clipboard,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Hexagon,
  Info,
  Layers3,
  Link2,
  Menu,
  MousePointer2,
  Radio,
  RotateCcw,
  ScanLine,
  Sparkles,
  Terminal,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type MintTier = "free" | "passage" | "open";
type MintRoute = "wallet" | "agent";
type GalleryFilter = "all" | MintTier;

type MintRecord = {
  token: number;
  tier: MintTier;
  price: string;
  prompt: string;
  mintedAt: string;
  seed: number;
  image?: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const SUPPLY = 10_000;
const FREE_MINT_END = 1_000;
const PASSAGE_MINT_END = FREE_MINT_END + 8_000;
const ARCHIVE_MINTED_START = 842;
const CONTRACT_ADDRESS = "0x8cc34AaD007bF677FfED5E64e4a05c327609625d";
const BSC_RPC_URL = "https://bsc-dataseed.binance.org/";
const MINT_CALLDATA = "0x1249c58b";

type ChainState = { totalMinted: number; mintEnabled: boolean };

const RPC_URLS = [
  "https://bsc-dataseed.binance.org/",
  "https://bsc.publicnode.com",
  "https://binance.llamarpc.com",
];

async function rpcPost(url: string, payload: unknown): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    window.clearTimeout(timer);
  }
}

async function rpcEthCall(data: string): Promise<string> {
  const wallet = typeof window !== "undefined" ? window.ethereum : undefined;
  if (wallet) {
    try {
      const result = (await wallet.request({
        method: "eth_call",
        params: [{ to: CONTRACT_ADDRESS, data }, "latest"],
      })) as string;
      if (typeof result === "string" && result.startsWith("0x")) return result;
    } catch {
      // Fall through to public RPC endpoints below.
    }
  }
  const payload = { jsonrpc: "2.0", method: "eth_call", params: [{ to: CONTRACT_ADDRESS, data }, "latest"], id: 1 };
  let lastError: unknown = new Error("Contract read failed.");
  for (const url of RPC_URLS) {
    try {
      const json = (await rpcPost(url, payload)) as { result?: string; error?: { message?: string } };
      if (json.result) return json.result;
      lastError = new Error(json.error?.message ?? "Contract read failed.");
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function readChainState(): Promise<ChainState> {
  const [mintedHex, openHex] = await Promise.all([rpcEthCall("0xa2309ff8"), rpcEthCall("0xd1239730")]);
  return { totalMinted: Number.parseInt(mintedHex, 16), mintEnabled: BigInt(openHex) === 1n };
}

function priceWeiForToken(token: number): bigint {
  if (token <= FREE_MINT_END) return 0n;
  if (token <= PASSAGE_MINT_END) return 222000000000000n;
  return 1000000000000000n;
}

function priceHexForToken(token: number): string {
  return `0x${priceWeiForToken(token).toString(16)}`;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function waitForReceipt(txHash: string): Promise<boolean> {
  const payload = { jsonrpc: "2.0", method: "eth_getTransactionReceipt", params: [txHash], id: 1 };
  for (let i = 0; i < 60; i++) {
    for (const url of RPC_URLS) {
      try {
        const json = (await rpcPost(url, payload)) as { result?: { status?: string } | null };
        if (json.result) return json.result.status === "0x1";
        break;
      } catch {
        // Try the next endpoint.
      }
    }
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
  }
  throw new Error("Transaction receipt timed out. Check the hash on BscScan.");
}

const tierForToken = (token: number) => {
  if (token <= FREE_MINT_END) {
    return {
      id: "free" as const,
      label: "Freemint",
      price: "0",
      displayPrice: "FREE",
      range: "0001 — 1,000",
      helper: "First signal, on us.",
    };
  }
  if (token <= PASSAGE_MINT_END) {
    return {
      id: "passage" as const,
      label: "Passage",
      price: "0.000222",
      displayPrice: "0.000222",
      range: "1,001 — 9,000",
      helper: "A small fee to cross the gate.",
    };
  }
  return {
    id: "open" as const,
    label: "Open mint",
    price: "0.001",
    displayPrice: "0.001",
    range: "9,001 — 10,000",
    helper: "The archive stays open.",
  };
};

const PROMPTS: Record<MintTier, string> = {
  free: "A quiet explorer with a lime signal, soft static around the eyes, and a first-light horizon. Keep the silhouette simple, curious, and unmistakably Naroba.",
  passage: "A night courier crossing the Naroba threshold, lilac visor, amber checkpoint light, and a tiny packet of starlight. Pixel-art identity, calm posture, precise details.",
  open: "A signal keeper from the far edge of the archive, dark chrome shell, electric lime core, and one strange artifact held close. Pixel-art identity with a patient, observant mood.",
};
 const seedPrompts = [
   { token: 1, tier: "free" as const, price: "FREE", prompt: "An observant listener with a Solar Gold signal, carrying a tiny beacon.", seed: 0, mintedAt: "20 min ago" },
{ token: 2, tier: "free" as const, price: "FREE", prompt: "An observant listener with an Ice Silver signal, carrying an amber key.", seed: 1, mintedAt: "18 min ago" },
{ token: 3, tier: "free" as const, price: "FREE", prompt: "A strange courier with a Neon Cyan signal, carrying a tiny beacon.", seed: 2, mintedAt: "16 min ago" },
{ token: 4, tier: "free" as const, price: "FREE", prompt: "A strange drifter with an Electric Blue signal, carrying a folded star map.", seed: 3, mintedAt: "14 min ago" },
{ token: 5, tier: "free" as const, price: "FREE", prompt: "An observant drifter with an Electric Blue signal, carrying a packet of starlight.", seed: 4, mintedAt: "12 min ago" },
   { token: 6, tier: "free" as const, price: "FREE", prompt: "An observant listener with an Ice Silver signal, carrying a pocket horizon.", seed: 5, mintedAt: "10 min ago" },
   { token: 7, tier: "free" as const, price: "FREE", prompt: "A strange listener with a Solar Gold signal, carrying a folded star map.", seed: 6, mintedAt: "8 min ago" },
   { token: 8, tier: "free" as const, price: "FREE", prompt: "An electric drifter with an Emerald Signal, carrying a pocket horizon.", seed: 7, mintedAt: "6 min ago" },
   { token: 9, tier: "free" as const, price: "FREE", prompt: "An electric keeper with a Solar Gold signal, carrying a pocket horizon.", seed: 8, mintedAt: "4 min ago" },
   { token: 10, tier: "free" as const, price: "FREE", prompt: "An electric cartographer with an Ice Silver signal, carrying an amber key.", seed: 9, mintedAt: "2 min ago" },
 ];

const stageCards = [
  { id: "free" as const, index: "01", label: "First signal", price: "FREE", range: "1,000 spots", note: "The first 1,000 tokens are free." },
  { id: "passage" as const, index: "02", label: "The passage", price: "0.000222", range: "8,000 spots", note: "Paid mint · tokens #1001–#9000." },
  { id: "open" as const, index: "03", label: "Open archive", price: "0.001", range: "1,000 spots", note: "Final paid tokens #9001–#10000." },
];

function PixelMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`pixel-mark ${compact ? "pixel-mark--compact" : ""}`} aria-hidden="true">
      <span className="pixel-mark__core" />
      <span className="pixel-mark__corner pixel-mark__corner--tl" />
      <span className="pixel-mark__corner pixel-mark__corner--br" />
    </div>
  );
}

function PixelAvatar({ seed = 1, small = false }: { seed?: number; small?: boolean }) {
  const patterns = [
    "0001100001111000011110000110011001100110011001100110011001111110",
    "0011110001100110011001100111111001100110011001100110011001100110",
    "0001100001111000011110000111111011000011011000010111111001100110",
  ];
  const pattern = patterns[(seed - 1) % patterns.length];
  return (
    <div className={`pixel-avatar ${small ? "pixel-avatar--small" : ""}`}>
      <div className="pixel-avatar__glow" />
      <div className="pixel-avatar__frame">
        <div className="pixel-avatar__grid">
          {Array.from(pattern).map((cell, index) => (
            <span
              key={`${seed}-${index}`}
              className={`${cell === "1" ? "pixel-avatar__cell pixel-avatar__cell--on" : "pixel-avatar__cell"} ${index % 13 === seed % 13 ? "pixel-avatar__cell--accent" : ""}`}
            />
          ))}
        </div>
        <div className="pixel-avatar__eye pixel-avatar__eye--left" />
        <div className="pixel-avatar__eye pixel-avatar__eye--right" />
        <div className="pixel-avatar__mouth" />
      </div>
      <div className="pixel-avatar__base" />
    </div>
  );
}

function nftPreviewForSeed(seed: number) {
    const previews = ["nrba-0001.png", "nrba-0002.png", "nrba-0003.png", "nrba-0004.png", "nrba-0005.png", "nrba-0006.png", "nrba-0007.png", "nrba-0008.png", "nrba-0009.png", "nrba-0010.png"];
  return `/nft/${previews[Math.abs(seed) % previews.length]}`;
}

function StatusPill({ children, tone = "lime" }: { children: React.ReactNode; tone?: "lime" | "lilac" | "amber" }) {
  return <span className={`status-pill status-pill--${tone}`}><span className="status-pill__dot" />{children}</span>;
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button className="icon-button" type="button" onClick={copy} aria-label={`${label}: ${value}`} title={label}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

export default function Home() {
  const [minted, setMinted] = useState(ARCHIVE_MINTED_START);
  const [route, setRoute] = useState<MintRoute>("wallet");
  const [walletPrompt, setWalletPrompt] = useState(PROMPTS.free);
  const [agentMood, setAgentMood] = useState("quiet");
  const [agentTrait, setAgentTrait] = useState("curious");
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState("");
  const [chainMinted, setChainMinted] = useState<number | null>(null);
  const [status, setStatus] = useState<"ready" | "reviewing" | "minted" | "error">("ready");
  const [statusMessage, setStatusMessage] = useState("Prompt ready for review.");
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [mobileNav, setMobileNav] = useState(false);
  const [gallery, setGallery] = useState<MintRecord[]>(seedPrompts);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const nextToken = Math.min(minted + 1, SUPPLY);
  const activeTier = tierForToken(nextToken);
  const displayToken = chainMinted === null ? nextToken : Math.min(chainMinted + 1, SUPPLY);
  const displayTier = tierForToken(displayToken);
  const progress = (minted / SUPPLY) * 100;
  const remaining = SUPPLY - minted;

  useEffect(() => {
    if (route === "wallet") {
      setWalletPrompt(PROMPTS[activeTier.id]);
    }
  }, [activeTier.id, route]);

  useEffect(() => {
    readChainState()
      .then((state) => {
        setChainMinted(state.totalMinted);
        setStatusMessage(state.mintEnabled ? `On-chain: mint is open · next token #${String(Math.min(state.totalMinted + 1, SUPPLY)).padStart(4, "0")}.` : "On-chain: mint is not open yet. The owner has not opened mint.");
      })
      .catch(() => {
        setStatusMessage("On-chain read unavailable. Connect a wallet to mint.");
      });
  }, []);

  useEffect(() => {
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
  }, []);

  const visibleGallery = useMemo(() => {
    if (filter === "all") return gallery;
    return gallery.filter((item) => item.tier === filter);
  }, [filter, gallery]);

  const connectWalletPrompt = async () => {
    try {
      const wallet = window.ethereum;
      if (!wallet) {
        setStatus("error");
        setStatusMessage("No wallet found. Open this page in your wallet's dApp browser (Binance Wallet, MetaMask, OKX or Trust).");
        return;
      }
      const accounts = (await wallet.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts[0]) throw new Error("No account returned.");
      try {
        await wallet.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x38" }] });
      } catch (switchError) {
        const code = typeof switchError === "object" && switchError !== null ? (switchError as { code?: number }).code : undefined;
        if (code === 4902) {
          await wallet.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0x38", chainName: "BNB Smart Chain", nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }, rpcUrls: [BSC_RPC_URL], blockExplorerUrls: ["https://bscscan.com"] }] });
        } else {
          throw switchError;
        }
      }
      setAccount(accounts[0]);
      setConnected(true);
      setStatus("ready");
      setStatusMessage(`Wallet connected · ${shortAddress(accounts[0])} · BNB Smart Chain.`);
      const state = await readChainState();
      setChainMinted(state.totalMinted);
    } catch {
      setStatus("error");
      setStatusMessage("Wallet connection failed. Approve the connection in your wallet and try again.");
    }
  };

  const generateAgentPrompt = () => {
    const nextPrompt = `A ${agentMood} ${agentTrait} navigating the Naroba signal field, lime core, lilac edge-light, and one small artifact from the archive. Keep the identity simple, pixel-native, and quietly alive.`;
    setWalletPrompt(nextPrompt);
    setRoute("agent");
    setStatus("ready");
    setStatusMessage("Agent assembled a new identity prompt.");
  };

  const installApp = async () => {
    if (!installPrompt) {
      setStatusMessage("Use your browser menu and choose Add to Home screen.");
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setStatusMessage(choice.outcome === "accepted" ? "Naroba added to your home screen." : "Install kept available from your browser menu.");
    setInstallPrompt(null);
  };

  const mintNow = async () => {
    if (!walletPrompt.trim()) {
      setStatus("error");
      setStatusMessage("Paste a wallet prompt or generate one with the agent first.");
      return;
    }
    if (!connected || !account) {
      setStatus("error");
      setStatusMessage("Connect your wallet first.");
      return;
    }
    const wallet = window.ethereum;
    if (!wallet) {
      setStatus("error");
      setStatusMessage("No wallet found. Open this page in your wallet's dApp browser.");
      return;
    }
    try {
      setStatus("reviewing");
      setStatusMessage("Reading the contract for the next token and price...");
      const state = await readChainState();
      setChainMinted(state.totalMinted);
      if (!state.mintEnabled) {
        setStatus("error");
        setStatusMessage("Mint is not open yet. The owner has not opened mint.");
        return;
      }
      const tokenId = state.totalMinted + 1;
      if (tokenId > SUPPLY) {
        setStatus("error");
        setStatusMessage("The Naroba archive is closed. Supply is complete.");
        return;
      }
      const tier = tierForToken(tokenId);
      setStatusMessage(`Review token #${String(tokenId).padStart(4, "0")} · ${tier.displayPrice === "FREE" ? "no mint price (gas only)" : `${tier.displayPrice} BNB`} · check the value in your wallet before signing.`);
      const txHash = (await wallet.request({
        method: "eth_sendTransaction",
        params: [{ from: account, to: CONTRACT_ADDRESS, value: priceHexForToken(tokenId), data: MINT_CALLDATA }],
      })) as string;
      setStatusMessage("Transaction sent · waiting for confirmation...");
      const ok = await waitForReceipt(txHash);
      if (!ok) {
        setStatus("error");
        setStatusMessage("Transaction failed on-chain. Check the hash on BscScan.");
        return;
      }
      const fresh = await readChainState();
      setChainMinted(fresh.totalMinted);
      const record: MintRecord = {
        token: tokenId,
        tier: tier.id,
        price: tier.displayPrice,
        prompt: walletPrompt.trim(),
        mintedAt: "just now",
        seed: tokenId - 1,
        image: `/collection/images/${String(tokenId).padStart(4, "0")}.png`,
      };
      setGallery((items) => [record, ...items]);
      setStatus("minted");
      setStatusMessage(`Token #${String(tokenId).padStart(4, "0")} minted to your wallet.`);
    } catch {
      setStatus("error");
      setStatusMessage("Mint could not be completed. If you rejected it in your wallet, nothing was sent.");
    }
  };

  const resetSession = () => {
    setMinted(ARCHIVE_MINTED_START);
    setGallery(seedPrompts);
    setStatus("ready");
    setStatusMessage("Local session reset. Prompt ready for review.");
  };

  return (
    <div className="naroba-shell">
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Naroba home">
          <img src="/nft/nrba-0001.png" alt="Naroba NFT identity #0001" style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "8px", border: "1px solid #b9ff59" }} />
          <span className="brand__name">naroba</span>
          <span className="brand__slash">/</span>
          <span className="brand__descriptor">identity archive</span>
        </a>
        <button className="mobile-menu-button" type="button" onClick={() => setMobileNav((value) => !value)} aria-label="Toggle navigation">
          {mobileNav ? <X size={19} /> : <Menu size={19} />}
        </button>
        <nav className={`main-nav ${mobileNav ? "main-nav--open" : ""}`}>
          <a href="#collection" onClick={() => setMobileNav(false)}>Collection <span>01</span></a>
          <a href="#ritual" onClick={() => setMobileNav(false)}>How it works <span>02</span></a>
          <a href="#mint" onClick={() => setMobileNav(false)}>Mint <span>03</span></a>
          <a href="#install" onClick={() => setMobileNav(false)}>Install <span>04</span></a>
          <a href="/deploy.html">Deploy <span>05</span></a>
        </nav>
        <button className={`connect-button ${connected ? "connect-button--connected" : ""}`} type="button" onClick={connectWalletPrompt}>
          <WalletCards size={15} />
          {connected && account ? `Connected · ${shortAddress(account)}` : "Connect wallet"}
          <ArrowUpRight size={14} />
        </button>
      </header>

      <main id="top">
        <section className="hero section-pad">
          <div className="hero__copy">
            <div className="eyebrow"><span className="eyebrow__line" />NAROBA / DIGITAL IDENTITIES</div>
            <h1>A tiny signal<br /><em>from a bigger world.</em></h1>
            <p className="hero__lede">Prompt a pixel identity, mint it into the archive, and leave a small trace of yourself on-chain.</p>
            <div className="hero__actions">
              <a className="primary-button" href="#mint">Enter the archive <ArrowDownRight size={16} /></a>
              <span className="hero__note"><span className="hero__note-dot" />10,000 identities / one shared signal</span>
            </div>
            <div className="hero__meta">
              <div><span className="meta-label">Network</span><strong>BNB Chain</strong></div>
              <div><span className="meta-label">Contract</span><strong className="mono">0xNAROBA…ME</strong></div>
              <div><span className="meta-label">Status</span><strong className="status-live"><span />Mint live</strong></div>
            </div>
          </div>

          <div className="hero__visual">
            <div className="visual-chrome visual-chrome--top"><span>NBR / 0042</span><span>IDENTITY SCAN <ScanLine size={13} /></span></div>
            <div className="visual-noise" />
            <div className="visual-orbit visual-orbit--one" />
            <div className="visual-orbit visual-orbit--two" />
            <div className="visual-cross visual-cross--one" />
            <div className="visual-cross visual-cross--two" />
            <div className="hero-avatar-wrap"><img className="hero-nft-image" src="/nft/nrba-0001.png" alt="Naroba NFT identity #0001" /><span className="hero-nft-pixel-corner hero-nft-pixel-corner--one" /><span className="hero-nft-pixel-corner hero-nft-pixel-corner--two" /></div>
            <div className="visual-label visual-label--left"><span className="visual-label__number">01</span><span>first light<br />/ signal found</span></div>
            <div className="visual-label visual-label--right"><span>CLASS / OBSERVER</span><strong>nrb_0042</strong></div>
            <div className="visual-cursor"><MousePointer2 size={14} /><span>hover to inspect</span></div>
            <div className="visual-footer"><span>08 / 08 / 2026</span><span className="visual-footer__bars"><i /><i /><i /><i /><i /></span><span>v.01</span></div>
          </div>
        </section>

        <section className="supply-bar section-pad" id="collection">
          <div className="supply-intro"><span className="section-kicker">COLLECTION STATUS</span><h2>Explorer archive <span>/</span> 10K</h2></div>
          <div className="supply-progress"><div className="supply-progress__head"><span><strong>{minted.toLocaleString()}</strong> / {SUPPLY.toLocaleString()} minted</span><span>{progress.toFixed(1)}%</span></div><div className="progress-track"><div style={{ width: `${progress}%` }} /></div><div className="supply-progress__foot"><span>Archive supply snapshot</span><span>{remaining.toLocaleString()} remaining</span></div></div>
          <div className="supply-stat"><span className="meta-label">Next token</span><strong>#{String(nextToken).padStart(4, "0")}</strong><span className={`stage-tag stage-tag--${activeTier.id}`}>{activeTier.label}</span></div>
        </section>

        <section className="install-section section-pad" id="install">
          <div className="install-art"><img src="/nft/nrba-2814.png" alt="Naroba NFT identity #2814" /><span className="install-art__tag">NRB / 2814</span><span className="install-art__scan">ARCHIVE READY</span></div>
          <div className="install-copy"><div className="section-kicker">NAROBA / INSTALL APP</div><h2>Carry the<br /><em>archive with you.</em></h2><p>Install Naroba on your home screen and keep the collection, mint stages, and identity prompts one tap away.</p><button className="primary-button" type="button" onClick={installApp}><Download size={16} /> Install Naroba app</button><span className="install-hint">BNB Chain collection · offline shell · NFT-first interface</span></div>
          <div className="install-stack"><img src="/nft/nrba-0001.png" alt="Naroba NFT preview #0001" /><img src="/nft/nrba-0638.png" alt="Naroba NFT preview #0638" /><img src="/nft/nrba-0771.png" alt="Naroba NFT preview #0771" /></div>
        </section>

        <section className="mint-section section-pad" id="mint">
          <div className="mint-sidebar">
            <div className="section-kicker">03 / MINT RITUAL</div>
            <h2>Your prompt<br /><em>becomes a trace.</em></h2>
            <p>Choose your entry point. The archive will use the next open spot and show the exact prompt before any mint action.</p>
            <div className="stage-list">
              {stageCards.map((stage) => (
                <button className={`stage-card ${activeTier.id === stage.id ? "stage-card--active" : ""}`} type="button" key={stage.id} onClick={() => { setMinted(stage.id === "free" ? 0 : stage.id === "passage" ? FREE_MINT_END : PASSAGE_MINT_END); setStatusMessage(`Previewing the ${stage.label.toLowerCase()} tier.`); }}>
                  <span className="stage-card__index">{stage.index}</span><span className="stage-card__main"><strong>{stage.label}</strong><small>{stage.range} · {stage.note}</small></span><span className={`stage-card__price stage-card__price--${stage.id}`}>{stage.price}</span><ChevronDown size={14} className="stage-card__chevron" />
                </button>
              ))}
            </div>
            <div className="sidebar-note"><Info size={15} /><span>Free mint has no mint price. BNB Chain gas and the final contract configuration are separate.</span></div>
          </div>

          <div className="mint-console">
            <div className="console-top"><div className="console-status"><span className="console-dot" /> MINT CONSOLE <span className="console-line" /></div><span className="console-id">NRB / {String(displayToken).padStart(4, "0")}</span></div>
            <div className="route-tabs" role="tablist" aria-label="Mint route">
              <button className={route === "wallet" ? "route-tab route-tab--active" : "route-tab"} type="button" onClick={() => { setRoute("wallet"); setStatusMessage("Wallet prompt channel ready."); }} role="tab" aria-selected={route === "wallet"}><Clipboard size={15} /> Paste wallet prompt</button>
              <button className={route === "agent" ? "route-tab route-tab--active" : "route-tab"} type="button" onClick={() => { setRoute("agent"); setStatusMessage("AI agent channel ready."); }} role="tab" aria-selected={route === "agent"}><Bot size={15} /> Ask AI agent</button>
            </div>
            {route === "wallet" ? (
              <div className="console-body">
                <div className="console-heading"><div><span className="section-kicker">WALLET PROMPT</span><h3>Bring your own<br />signal.</h3></div><StatusPill tone={connected ? "lime" : "lilac"}>{connected ? "CONNECTED" : "READY"}</StatusPill></div>
                <label className="prompt-label" htmlFor="wallet-prompt">Your mint prompt <span>required</span></label>
                <textarea id="wallet-prompt" value={walletPrompt} onChange={(event) => setWalletPrompt(event.target.value)} placeholder="Paste your wallet prompt here..." rows={5} />
                <div className="prompt-help"><Terminal size={14} /> Prompt will be attached to identity #{String(displayToken).padStart(4, "0")}. <button type="button" onClick={() => setWalletPrompt(PROMPTS[activeTier.id])}>Use stage prompt</button></div>
              </div>
            ) : (
              <div className="console-body">
                <div className="console-heading"><div><span className="section-kicker">AI AGENT / NAROBA-01</span><h3>Let the agent<br />find your signal.</h3></div><StatusPill tone="lilac">GUIDED</StatusPill></div>
                <p className="agent-intro">Give the agent a mood and a trait. It will shape the prompt, not your wallet permissions.</p>
                <div className="agent-options"><div><span>Mood</span><div className="chip-row">{["quiet", "electric", "strange"].map((mood) => <button type="button" key={mood} className={agentMood === mood ? "choice-chip choice-chip--active" : "choice-chip"} onClick={() => setAgentMood(mood)}>{mood}</button>)}</div></div><div><span>Trait</span><div className="chip-row">{["curious", "patient", "restless"].map((trait) => <button type="button" key={trait} className={agentTrait === trait ? "choice-chip choice-chip--active" : "choice-chip"} onClick={() => setAgentTrait(trait)}>{trait}</button>)}</div></div></div>
                <button className="secondary-button secondary-button--full" type="button" onClick={generateAgentPrompt}><Sparkles size={15} /> Generate agent prompt <ArrowUpRight size={14} /></button>
              </div>
            )}
            <div className="price-review"><div><span className="meta-label">Active stage</span><strong>{displayTier.label} <span>/ {displayTier.range}</span></strong></div><div className="price-review__amount"><span className="meta-label">Mint price</span><strong className={displayTier.id === "free" ? "is-free" : ""}>{displayTier.displayPrice}{displayTier.id !== "free" && <small> BNB</small>}</strong></div></div>
            <div className="console-action"><button className="mint-button" type="button" onClick={mintNow} disabled={status === "reviewing"}><span>{status === "reviewing" ? "Reviewing..." : status === "minted" ? "Mint another identity" : "Review & mint"}</span><ArrowUpRight size={17} /></button><div className={`mint-status mint-status--${status}`}><span className="mint-status__icon">{status === "minted" ? <Check size={12} /> : status === "error" ? <X size={12} /> : <Radio size={12} />}</span>{statusMessage}</div></div>
            <div className="contract-note"><Code2 size={14} /><span>BNB contract <strong>live on BNB Mainnet</strong>. <a href="https://bscscan.com/address/0x8cc34AaD007bF677FfED5E64e4a05c327609625d" target="_blank" rel="noreferrer">View on BscScan</a></span><CopyButton value={CONTRACT_ADDRESS} label="Copy contract address" /></div>
          </div>
        </section>

        <section className="ritual-section section-pad" id="ritual">
          <div className="ritual-heading"><div><div className="section-kicker">THE NAROBA RITUAL</div><h2>Small prompt.<br /><em>Real identity.</em></h2></div><p>Nothing is hidden behind the pixel. Every identity keeps its prompt, its stage, and its place in the archive.</p></div>
          <div className="ritual-steps"><div className="ritual-step"><span>01</span><div><Link2 size={18} /><h3>Connect a channel</h3><p>Paste a wallet prompt or let the agent prepare one for you.</p></div></div><div className="ritual-step"><span>02</span><div><Layers3 size={18} /><h3>Shape the signal</h3><p>Review the exact words that will travel with your identity.</p></div></div><div className="ritual-step"><span>03</span><div><Zap size={18} /><h3>Enter the archive</h3><p>Mint the next open token and keep the trace in your gallery.</p></div></div></div>
        </section>

        <section className="gallery-section section-pad" id="gallery">
          <div className="gallery-heading"><div><div className="section-kicker">THE ARCHIVE / RECENT SIGNALS</div><h2>Minted identities <span>↘</span></h2></div><div className="gallery-tools"><div className="filter-tabs" role="tablist" aria-label="Gallery filter">{(["all", "free", "passage", "open"] as GalleryFilter[]).map((item) => <button type="button" key={item} className={filter === item ? "filter-tab filter-tab--active" : "filter-tab"} onClick={() => setFilter(item)}>{item === "all" ? "All" : item === "free" ? "Freemint" : item === "passage" ? "Passage" : "Open"}</button>)}</div><button className="reset-button" type="button" onClick={resetSession} title="Reset local session"><RotateCcw size={14} /> Reset session</button></div></div>
          <div className="gallery-track">{visibleGallery.map((item) => <article className="identity-card" key={`${item.token}-${item.mintedAt}`}><div className="identity-card__visual"><span className="identity-card__token">NRB / {String(item.token).padStart(4, "0")}</span><img className="identity-card__nft" src={item.image ?? nftPreviewForSeed(item.seed)} alt={`Naroba NFT identity #${String(item.token).padStart(4, "0")}`} /><span className={`identity-card__badge identity-card__badge--${item.tier}`}>{item.price}</span><span className="identity-card__scan"><ScanLine size={13} /> scanned</span></div><div className="identity-card__body"><div className="identity-card__meta"><span>#{String(item.token).padStart(4, "0")}</span><span>{item.mintedAt}</span></div><p>{item.prompt}</p><div className="identity-card__footer"><span className={`stage-tag stage-tag--${item.tier}`}>{tierForToken(item.token).label}</span><ArrowUpRight size={14} /></div></div></article>)}</div>
          {visibleGallery.length === 0 && <div className="empty-gallery"><Hexagon size={22} /><span>No identities in this filter yet.</span></div>}
        </section>
      </main>

      <footer className="site-footer section-pad"><div className="footer-brand"><PixelMark compact /><span>naroba</span></div><div className="footer-copy">A tiny signal from a bigger world.<br /><span>© 2026 Naroba identity archive.</span></div><div className="footer-links"><a href="#mint">Mint <ArrowUpRight size={13} /></a><a href="#collection">Collection <ArrowUpRight size={13} /></a><a href="/deploy.html">Deploy contract <ArrowUpRight size={13} /></a><a href="#top">Back to top <ArrowUpRight size={13} /></a></div></footer>
    </div>
  );
}
