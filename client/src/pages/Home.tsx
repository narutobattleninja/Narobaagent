import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
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
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type MintTier = "free" | "passage" | "open";
type GalleryFilter = "all" | MintTier;

type MintRecord = {
  token: number;
  tier: MintTier;
  price: string;
  description: string;
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
const CONTRACT_ADDRESS = "0x8cc34AaD007bF677FfED5E64e4a05c327609625d";
const BSC_RPC_URL = "https://bsc-dataseed.binance.org/";
const MINT_CALLDATA = "0x1249c58b";
const TRANSFER_EVENT_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const AGENT_ID_PROMPT = `You are operating my Binance Agentic Wallet on BNB Smart Chain (chain ID 56).

First, check the Naroba mint status on-chain before doing anything:
- Contract: 0x8cc34AaD007bF677FfED5E64e4a05c327609625d
- Read mintEnabled and totalMinted.
- If mintEnabled is false, STOP and tell me "Mint is not open yet." Do not send any transaction.

If mint is open, mint exactly 1 Naroba NFT for me:
- Call mint() on 0x8cc34AaD007bF677FfED5E64e4a05c327609625d (calldata 0x1249c58b, no arguments, 1 token per call, token ID is sequential).
- Value must be exact, based on the next token ID:
  - Token #1-#1000: 0 BNB (gas only)
  - Token #1001-#9000: 0.000222 BNB
  - Token #9001-#10000: 0.001 BNB
- Show me the preview first (next token ID, exact value, estimated gas) and wait for my approval before sending.
- This contract mints the next pre-generated token; the custom prompt is not sent to the contract or stored in NFT metadata.
- After the transaction confirms, report the transaction hash and the token ID I received.
- Never approve other spenders, never transfer funds to unknown addresses, and never ask for my seed phrase or private key.`;

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

type MintReceipt = {
  status?: string;
  logs?: Array<{ address?: string; topics?: string[] }>;
};

async function waitForReceipt(txHash: string): Promise<MintReceipt> {
  const payload = { jsonrpc: "2.0", method: "eth_getTransactionReceipt", params: [txHash], id: 1 };
  for (let i = 0; i < 60; i++) {
    for (const url of RPC_URLS) {
      try {
        const json = (await rpcPost(url, payload)) as { result?: MintReceipt | null };
        if (json.result) return json.result;
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
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState("");
  const [chainMinted, setChainMinted] = useState<number | null>(null);
  const [mintEnabled, setMintEnabled] = useState<boolean | null>(null);
  const [status, setStatus] = useState<"ready" | "reviewing" | "awaiting_wallet" | "confirming" | "minted" | "error">("ready");
  const [statusMessage, setStatusMessage] = useState("Loading live mint status…");
  const [transactionHash, setTransactionHash] = useState("");
  const [filter, setFilter] = useState<GalleryFilter>("all");
  const [mobileNav, setMobileNav] = useState(false);
  const [gallery, setGallery] = useState<MintRecord[]>([]);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const nextToken = Math.min((chainMinted ?? 0) + 1, SUPPLY);
  const activeTier = tierForToken(nextToken);
  const displayToken = chainMinted === null ? nextToken : Math.min(chainMinted + 1, SUPPLY);
  const displayTier = tierForToken(displayToken);

  useEffect(() => {
    readChainState()
      .then((state) => {
        setChainMinted(state.totalMinted);
        setMintEnabled(state.mintEnabled);
        setStatusMessage(state.mintEnabled ? `On-chain: mint is open · next token #${String(Math.min(state.totalMinted + 1, SUPPLY)).padStart(4, "0")}.` : "On-chain: mint is not open yet. The owner has not opened mint.");
      })
      .catch(() => {
        setStatusMessage("On-chain read unavailable. Connect a wallet to mint.");
      });
    const timer = window.setInterval(() => {
      readChainState()
        .then((state) => {
          setChainMinted(state.totalMinted);
          setMintEnabled(state.mintEnabled);
        })
        .catch(() => {});
    }, 30000);
    return () => window.clearInterval(timer);
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
      setMintEnabled(state.mintEnabled);
    } catch {
      setStatus("error");
      setStatusMessage("Wallet connection failed. Approve the connection in your wallet and try again.");
    }
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
    let submittedTxHash = "";
    try {
      setTransactionHash("");
      setStatus("reviewing");
      setStatusMessage("Checking BNB Chain, mint status, current price, and gas estimate...");
      const chainId = await wallet.request({ method: "eth_chainId" });
      if (typeof chainId !== "string" || BigInt(chainId) !== 56n) {
        throw new Error("Switch your wallet to BNB Smart Chain (chain ID 56), then reconnect it.");
      }
      const currentAccounts = (await wallet.request({ method: "eth_accounts" })) as string[];
      const from = currentAccounts[0];
      if (!from) throw new Error("No wallet account is connected.");
      if (from.toLowerCase() !== account.toLowerCase()) {
        setAccount(from);
        throw new Error("Your active wallet account changed. Review the account and press mint again.");
      }
      const state = await readChainState();
      setChainMinted(state.totalMinted);
      setMintEnabled(state.mintEnabled);
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
      const value = priceHexForToken(tokenId);
      const tx = { from, to: CONTRACT_ADDRESS, value, data: MINT_CALLDATA };
      const estimateHex = (await wallet.request({ method: "eth_estimateGas", params: [tx] })) as string;
      const estimatedGas = BigInt(estimateHex);
      const gasLimit = (estimatedGas * 120n + 99n) / 100n;
      setStatus("awaiting_wallet");
      setStatusMessage(`Token #${String(tokenId).padStart(4, "0")} · ${tier.displayPrice === "FREE" ? "FREE" : `${tier.displayPrice} BNB`} · estimated gas ${estimatedGas.toLocaleString()}. Wallet request pending: review it there; if you already approved it, wait for confirmation. Do not tap mint again.`);
      submittedTxHash = (await wallet.request({
        method: "eth_sendTransaction",
        params: [{ ...tx, gas: `0x${gasLimit.toString(16)}` }],
      })) as string;
      setTransactionHash(submittedTxHash);
      setStatus("confirming");
      setStatusMessage("Transaction submitted · waiting for BNB Chain confirmation...");
      const receipt = await waitForReceipt(submittedTxHash);
      if (receipt.status !== "0x1") {
        setStatus("error");
        setStatusMessage("Transaction failed on-chain. Check the hash on BscScan.");
        return;
      }
      const transferLog = receipt.logs?.find((log) =>
        log.address?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
        && log.topics?.[0]?.toLowerCase() === TRANSFER_EVENT_TOPIC
        && log.topics?.[1] === `0x${"0".repeat(64)}`
        && log.topics?.[2]?.slice(-40).toLowerCase() === from.slice(2).toLowerCase(),
      );
      const fresh = await readChainState();
      setChainMinted(fresh.totalMinted);
      setMintEnabled(fresh.mintEnabled);
      if (!transferLog?.topics?.[3]) {
        setStatus("minted");
        setStatusMessage(`Transaction confirmed, but the token ID could not be read from its receipt. Check transaction ${submittedTxHash} on BscScan.`);
        return;
      }
      const mintedTokenId = Number(BigInt(transferLog.topics[3]));
      const record: MintRecord = {
        token: mintedTokenId,
        tier: tierForToken(mintedTokenId).id,
        price: tierForToken(mintedTokenId).displayPrice,
        description: `Mint confirmed · ${tierForToken(mintedTokenId).label} · collection metadata.`,
        mintedAt: "just now",
        seed: mintedTokenId - 1,
        image: `/collection/images/${String(mintedTokenId).padStart(4, "0")}.png`,
      };
      setGallery((items) => [record, ...items]);
      setStatus("minted");
      setStatusMessage(`Token #${String(mintedTokenId).padStart(4, "0")} minted to your wallet.`);
    } catch (error) {
      setStatus("error");
      if (submittedTxHash) {
        setTransactionHash(submittedTxHash);
        setStatusMessage("A transaction was submitted but its final status could not be read. Check BscScan before trying again.");
        return;
      }
      const message = error instanceof Error ? error.message : "Mint could not be completed.";
      setStatusMessage(message.includes("rejected") || message.includes("denied")
        ? "Mint was cancelled in your wallet. No transaction was sent."
        : message);
    }
  };

  const resetSession = () => {
    setGallery([]);
    setTransactionHash("");
    setStatus("ready");
    setStatusMessage("Session gallery cleared.");
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
            <p className="hero__lede">Mint the next pre-generated identity and leave a small trace on-chain.</p>
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
          <div className="supply-progress"><div className="supply-progress__head"><span><strong>{chainMinted === null ? "…" : chainMinted.toLocaleString()}</strong> / {SUPPLY.toLocaleString()} minted</span><span>{chainMinted === null ? "…" : `${((chainMinted / SUPPLY) * 100).toFixed(1)}%`}</span></div><div className="progress-track"><div style={{ width: `${chainMinted === null ? 0 : (chainMinted / SUPPLY) * 100}%` }} /></div><div className="supply-progress__foot"><span>{chainMinted === null ? "Reading live count from BNB Chain…" : "Live on-chain · refreshes automatically"}</span><span>{chainMinted === null ? "…" : `${(SUPPLY - chainMinted).toLocaleString()} remaining`}</span></div></div>
          <div className="supply-stat"><span className="meta-label">Next token</span><strong>#{String(nextToken).padStart(4, "0")}</strong><span className={`stage-tag stage-tag--${activeTier.id}`}>{activeTier.label}</span></div>
        </section>

        <section className="install-section section-pad" id="install">
          <div className="install-art"><img src="/nft/nrba-2814.png" alt="Naroba NFT identity #2814" /><span className="install-art__tag">NRB / 2814</span><span className="install-art__scan">ARCHIVE READY</span></div>
          <div className="install-copy"><div className="section-kicker">NAROBA / INSTALL APP</div><h2>Carry the<br /><em>archive with you.</em></h2><p>Install Naroba on your home screen and keep the collection, mint stages, and wallet status one tap away.</p><button className="primary-button" type="button" onClick={installApp}><Download size={16} /> Install Naroba app</button><span className="install-hint">BNB Chain collection · offline shell · NFT-first interface</span></div>
          <div className="install-stack"><img src="/nft/nrba-0001.png" alt="Naroba NFT preview #0001" /><img src="/nft/nrba-0638.png" alt="Naroba NFT preview #0638" /><img src="/nft/nrba-0771.png" alt="Naroba NFT preview #0771" /></div>
        </section>

        <section className="mint-section section-pad" id="mint">
          <div className="mint-sidebar">
            <div className="section-kicker">03 / MINT BOX</div>
            <h2>Mint the next<br /><em>identity.</em></h2>
            <p>No edition or quantity to choose. The contract assigns the next token and its price automatically.</p>
            <div className="stage-list">
              {stageCards.map((stage) => (
                <div className={`stage-card ${activeTier.id === stage.id ? "stage-card--active" : ""}`} key={stage.id}>
                  <span className="stage-card__index">{stage.index}</span><span className="stage-card__main"><strong>{stage.label}</strong><small>{stage.range} · {stage.note}</small></span><span className={`stage-card__price stage-card__price--${stage.id}`}>{stage.price}</span>
                </div>
              ))}
            </div>
            <div className="sidebar-note"><Info size={15} /><span>One NFT per transaction. Free mint still requires BNB for network gas.</span></div>
          </div>

          <div className="mint-console">
            <div className="console-top"><div className="console-status"><span className="console-dot" /> NAROBA / LIVE MINT <span className="console-line" /></div><span className="console-id"># {String(displayToken).padStart(4, "0")}</span></div>
            <div className="console-body">
              <div className="console-heading"><div><span className="section-kicker">NEXT TOKEN</span><h3>Identity #{String(displayToken).padStart(4, "0")}</h3></div><StatusPill tone={connected ? "lime" : "lilac"}>{connected ? "CONNECTED" : "CONNECT WALLET"}</StatusPill></div>
              <p className="mint-one-liner">Mint one pre-generated Naroba NFT. The next token ID sets the mint price automatically.</p>
            </div>
            <div className="price-review"><div><span className="meta-label">Current phase</span><strong>{displayTier.label} <span>/ {displayTier.range}</span></strong></div><div className="price-review__amount"><span className="meta-label">Mint cost</span><strong className={displayTier.id === "free" ? "is-free" : ""}>{displayTier.displayPrice}{displayTier.id !== "free" && <small> BNB</small>}</strong></div></div>
            <div className="mint-gas-note">Gas paid by you · estimated before wallet confirmation</div>
            <div className="console-action"><button className="mint-button" type="button" onClick={connected ? mintNow : connectWalletPrompt} disabled={status === "reviewing" || status === "awaiting_wallet" || status === "confirming" || mintEnabled === false || chainMinted === SUPPLY || (status === "error" && Boolean(transactionHash))}><span>{status === "reviewing" ? "Checking mint…" : status === "awaiting_wallet" ? "Wallet request pending…" : status === "confirming" ? "Confirming on-chain…" : mintEnabled === false ? "Mint not open" : chainMinted === SUPPLY ? "Sold out" : status === "error" && transactionHash ? "Check transaction before retry" : connected ? status === "minted" ? "Mint next identity" : `Mint #${String(displayToken).padStart(4, "0")}` : "Connect wallet to mint"}</span><ArrowUpRight size={17} /></button><div className={`mint-status mint-status--${status}`} aria-live="polite"><span className="mint-status__icon">{status === "minted" ? <Check size={12} /> : status === "error" ? <X size={12} /> : <Radio size={12} />}</span>{statusMessage}{transactionHash && <> <a href={`https://bscscan.com/tx/${transactionHash}`} target="_blank" rel="noreferrer">View transaction</a></>}</div></div>
            <div className="contract-note"><Code2 size={14} /><span>BNB contract <strong>live on BNB Mainnet</strong>. <a href="https://bscscan.com/address/0x8cc34AaD007bF677FfED5E64e4a05c327609625d" target="_blank" rel="noreferrer">View on BscScan</a></span><CopyButton value={CONTRACT_ADDRESS} label="Copy contract address" /></div>
          </div>
        </section>

        <section className="section-pad" id="agent">
          <div className="section-kicker">BINANCE AGENT ID</div>
          <h2>Mint with your<br /><em>Binance agent.</em></h2>
          <p>Own a Binance Agentic Wallet? Your AI agent can mint Naroba for you. No new contract is needed and the Naroba contract does not check Agent ID on-chain — your Agent ID is simply your agent wallet&apos;s readable .ai identity, and any wallet can mint once mint is open.</p>
          <ol>
            <li><strong>Claim your Agent ID.</strong> In the Binance Wallet app, open your Agentic Wallet and claim your .ai name from the Agent ID banner.</li>
            <li><strong>Turn on Developer Mode.</strong> In your Agentic Wallet settings, enable Developer Mode and set a low daily spending limit. Without it, your agent cannot call custom contracts.</li>
            <li><strong>Pair your agent.</strong> Connect your AI agent (Binance AI Pro or another supported agent) by scanning the pairing QR code in the Binance app. Never share your seed phrase or private key — an Agentic Wallet is keyless by design.</li>
            <li><strong>Paste the prompt.</strong> Copy the prompt below, give it to your agent, review the preview, then approve. The agent checks mint status first and stops instead of sending a transaction if mint is not open yet.</li>
          </ol>
          <div style={{ marginTop: "20px", border: "1px solid var(--line)", borderRadius: "12px", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}><span className="section-kicker">AGENT PROMPT — COPY &amp; PASTE</span><CopyButton value={AGENT_ID_PROMPT} label="Copy agent prompt" /></div>
            <pre style={{ marginTop: "12px", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px", lineHeight: "1.7" }}>{AGENT_ID_PROMPT}</pre>
          </div>
        </section>
        <section className="ritual-section section-pad" id="ritual">
          <div className="ritual-heading"><div><div className="section-kicker">THE NAROBA RITUAL</div><h2>One token.<br /><em>One approval.</em></h2></div><p>The contract picks the next available identity and calculates its fixed mint price from the token ID. There is no extra form to fill in.</p></div>
          <div className="ritual-steps"><div className="ritual-step"><span>01</span><div><Link2 size={18} /><h3>Connect wallet</h3><p>Use a wallet on BNB Smart Chain.</p></div></div><div className="ritual-step"><span>02</span><div><Layers3 size={18} /><h3>Check the price</h3><p>The next token, phase, and mint cost are shown before minting.</p></div></div><div className="ritual-step"><span>03</span><div><Zap size={18} /><h3>Confirm once</h3><p>Approve the mint in your wallet; the receipt confirms your token ID.</p></div></div></div>
        </section>

        <section className="gallery-section section-pad" id="gallery">
          <div className="gallery-heading"><div><div className="section-kicker">THE ARCHIVE / RECENT SIGNALS</div><h2>Minted identities <span>↘</span></h2></div><div className="gallery-tools"><div className="filter-tabs" role="tablist" aria-label="Gallery filter">{(["all", "free", "passage", "open"] as GalleryFilter[]).map((item) => <button type="button" key={item} className={filter === item ? "filter-tab filter-tab--active" : "filter-tab"} onClick={() => setFilter(item)}>{item === "all" ? "All" : item === "free" ? "Freemint" : item === "passage" ? "Passage" : "Open"}</button>)}</div><button className="reset-button" type="button" onClick={resetSession} title="Reset local session"><RotateCcw size={14} /> Reset session</button></div></div>
          <div className="gallery-track">{visibleGallery.map((item) => <article className="identity-card" key={`${item.token}-${item.mintedAt}`}><div className="identity-card__visual"><span className="identity-card__token">NRB / {String(item.token).padStart(4, "0")}</span><img className="identity-card__nft" src={item.image ?? nftPreviewForSeed(item.seed)} alt={`Naroba NFT identity #${String(item.token).padStart(4, "0")}`} /><span className={`identity-card__badge identity-card__badge--${item.tier}`}>{item.price}</span><span className="identity-card__scan"><ScanLine size={13} /> scanned</span></div><div className="identity-card__body"><div className="identity-card__meta"><span>#{String(item.token).padStart(4, "0")}</span><span>{item.mintedAt}</span></div><p>{item.description}</p><div className="identity-card__footer"><span className={`stage-tag stage-tag--${item.tier}`}>{tierForToken(item.token).label}</span><ArrowUpRight size={14} /></div></div></article>)}</div>
          {visibleGallery.length === 0 && <div className="empty-gallery"><Hexagon size={22} /><span>No identities in this filter yet.</span></div>}
        </section>
      </main>

      <footer className="site-footer section-pad"><div className="footer-brand"><img src="/nft/nrba-0001.png" alt="Naroba NFT identity #0001" style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "8px", border: "1px solid #b9ff59" }} /><span>naroba</span></div><div className="footer-copy">A tiny signal from a bigger world.<br /><span>© 2026 Naroba identity archive.</span><br /><span>Developer by <a href="https://x.com/404Naroba" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>@404Naroba</a></span></div><div className="footer-links"><a href="#mint">Mint <ArrowUpRight size={13} /></a><a href="#agent">Agent ID <ArrowUpRight size={13} /></a><a href="#collection">Collection <ArrowUpRight size={13} /></a><a href="#top">Back to top <ArrowUpRight size={13} /></a></div></footer>
    </div>
  );
}
