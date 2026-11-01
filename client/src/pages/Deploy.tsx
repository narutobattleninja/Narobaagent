import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CircleAlert,
  Clipboard,
  ExternalLink,
  FileCheck2,
  LockKeyhole,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import {
  BrowserProvider,
  Contract,
  ContractFactory,
  formatEther,
  getAddress,
  isAddress,
  type InterfaceAbi,
} from "ethers";
import { useEffect, useMemo, useState } from "react";
import artifact from "@/contracts/NarobaNFTArtifact.json";
import "../deploy.css";

type NetworkKey = "bnb-mainnet" | "bnb-testnet";
type Action = "connect" | "deploy" | "check" | "base-uri" | "open" | "close" | "withdraw" | null;
type Notice = { kind: "success" | "error" | "info"; text: string };
type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};
type ContractSnapshot = {
  owner: string;
  baseURI: string;
  mintEnabled: boolean;
  totalMinted: number;
  balance: string;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

const NETWORKS: Record<NetworkKey, {
  chainId: number;
  hexChainId: string;
  name: string;
  display: string;
  rpcUrl: string;
  explorer: string;
  currency: { name: string; symbol: string; decimals: number };
}> = {
  "bnb-mainnet": {
    chainId: 56,
    hexChainId: "0x38",
    name: "BNB Smart Chain",
    display: "BNB Mainnet (56) — real BNB",
    rpcUrl: "https://bsc-dataseed.binance.org/",
    explorer: "https://bscscan.com",
    currency: { name: "BNB", symbol: "BNB", decimals: 18 },
  },
  "bnb-testnet": {
    chainId: 97,
    hexChainId: "0x61",
    name: "BNB Smart Chain Testnet",
    display: "BNB Testnet (97) — tBNB",
    rpcUrl: "https://data-seed-prebsc-1-s1.bnbchain.org:8545/",
    explorer: "https://testnet.bscscan.com",
    currency: { name: "Test BNB", symbol: "tBNB", decimals: 18 },
  },
};

const ABI = artifact.abi as InterfaceAbi;
const BYTECODE = artifact.bytecode;
const ADDRESS_KEY = (network: NetworkKey) => `naroba:contract:${NETWORKS[network].chainId}`;

function getWallet() {
  if (!window.ethereum) throw new Error("No browser wallet found. Install MetaMask or OKX Wallet, then reload this page.");
  return window.ethereum;
}

function shortError(error: unknown) {
  if (typeof error === "object" && error !== null) {
    const candidate = error as { shortMessage?: string; reason?: string; message?: string; code?: number | string };
    if (candidate.code === 4001 || candidate.code === "ACTION_REJECTED") return "The wallet request was cancelled. No transaction was sent.";
    return candidate.shortMessage || candidate.reason || candidate.message || "The wallet request failed.";
  }
  return String(error);
}

function getSavedAddress(network: NetworkKey) {
  try { return localStorage.getItem(ADDRESS_KEY(network)) ?? ""; } catch { return ""; }
}

export default function Deploy() {
  const [networkKey, setNetworkKey] = useState<NetworkKey>("bnb-mainnet");
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState<number | null>(null);
  const [address, setAddress] = useState(() => getSavedAddress("bnb-mainnet"));
  const [baseURIInput, setBaseURIInput] = useState("");
  const [snapshot, setSnapshot] = useState<ContractSnapshot | null>(null);
  const [busy, setBusy] = useState<Action>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [txHash, setTxHash] = useState("");
  const network = NETWORKS[networkKey];

  useEffect(() => {
    setAddress(getSavedAddress(networkKey));
    setSnapshot(null);
    setTxHash("");
  }, [networkKey]);

  useEffect(() => {
    const wallet = window.ethereum;
    if (!wallet) return;
    const syncAccounts = (value: unknown) => {
      const accounts = Array.isArray(value) ? value.map(String) : [];
      setAccount(accounts[0] ?? "");
    };
    const syncChain = (value: unknown) => {
      const parsed = typeof value === "string" ? Number.parseInt(value, 16) : Number(value);
      setChainId(Number.isFinite(parsed) ? parsed : null);
    };
    void wallet.request({ method: "eth_accounts" }).then(syncAccounts).catch(() => undefined);
    void wallet.request({ method: "eth_chainId" }).then(syncChain).catch(() => undefined);
    wallet.on?.("accountsChanged", syncAccounts);
    wallet.on?.("chainChanged", syncChain);
    return () => {
      wallet.removeListener?.("accountsChanged", syncAccounts);
      wallet.removeListener?.("chainChanged", syncChain);
    };
  }, []);

  const onTargetNetwork = chainId === network.chainId;
  const isOwner = Boolean(account && snapshot?.owner && account.toLowerCase() === snapshot.owner.toLowerCase());
  const canManage = isOwner && onTargetNetwork;
  const txUrl = useMemo(() => txHash ? `${network.explorer}/tx/${txHash}` : "", [network.explorer, txHash]);

  async function switchToSelectedNetwork() {
    const wallet = getWallet();
    try {
      await wallet.request({ method: "wallet_switchEthereumChain", params: [{ chainId: network.hexChainId }] });
    } catch (error) {
      const code = typeof error === "object" && error !== null ? (error as { code?: number }).code : undefined;
      if (code !== 4902) throw error;
      await wallet.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: network.hexChainId,
          chainName: network.name,
          nativeCurrency: network.currency,
          rpcUrls: [network.rpcUrl],
          blockExplorerUrls: [network.explorer],
        }],
      });
    }
    setChainId(network.chainId);
  }

  async function selectedSigner() {
    const wallet = getWallet();
    const provider = new BrowserProvider(wallet as never);
    const current = await provider.getNetwork();
    if (Number(current.chainId) !== network.chainId) await switchToSelectedNetwork();
    const refreshed = new BrowserProvider(wallet as never);
    return refreshed.getSigner();
  }

  async function connectWallet() {
    setBusy("connect");
    setNotice(null);
    try {
      const wallet = getWallet();
      const result = await wallet.request({ method: "eth_requestAccounts" });
      const accounts = Array.isArray(result) ? result.map(String) : [];
      if (!accounts[0]) throw new Error("No wallet account was approved.");
      await switchToSelectedNetwork();
      const next = getAddress(accounts[0]);
      setAccount(next);
      setNotice({ kind: "success", text: `Wallet connected: ${next}` });
    } catch (error) {
      setNotice({ kind: "error", text: shortError(error) });
    } finally {
      setBusy(null);
    }
  }

  async function deployContract() {
    setBusy("deploy");
    setNotice(null);
    setTxHash("");
    try {
      const signer = await selectedSigner();
      const factory = new ContractFactory(ABI, BYTECODE, signer);
      const contract = await factory.deploy();
      const transaction = contract.deploymentTransaction();
      if (transaction) {
        setTxHash(transaction.hash);
        setNotice({ kind: "info", text: "Deployment transaction sent. Confirm it in your wallet and wait for the network." });
        await transaction.wait();
      }
      const deployed = await contract.getAddress();
      setAddress(deployed);
      try { localStorage.setItem(ADDRESS_KEY(networkKey), deployed); } catch { /* address can still be copied */ }
      const readProvider = new BrowserProvider(getWallet() as never);
      const readContract = new Contract(deployed, ABI, readProvider);
      const [owner, baseURI, mintEnabled, totalMinted, balance] = await Promise.all([
        readContract.owner(), readContract.baseURI(), readContract.mintEnabled(), readContract.totalMinted(), readProvider.getBalance(deployed),
      ]);
      setSnapshot({ owner: getAddress(owner), baseURI, mintEnabled, totalMinted: Number(totalMinted), balance: formatEther(balance) });
      setNotice({ kind: "success", text: "Contract deployed. Mint is still closed; set the final metadata URI before opening it." });
    } catch (error) {
      setNotice({ kind: "error", text: shortError(error) });
    } finally {
      setBusy(null);
    }
  }

  async function checkContract() {
    setBusy("check");
    setNotice(null);
    try {
      if (!isAddress(address)) throw new Error("Enter a valid contract address.");
      const provider = new BrowserProvider(getWallet() as never);
      const current = await provider.getNetwork();
      if (Number(current.chainId) !== network.chainId) throw new Error(`Switch your wallet to ${network.display} to read this contract.`);
      const code = await provider.getCode(address);
      if (code === "0x") throw new Error("No contract code was found at this address on the selected network.");
      const contract = new Contract(address, ABI, provider);
      const [owner, baseURI, mintEnabled, totalMinted, balance] = await Promise.all([
        contract.owner(), contract.baseURI(), contract.mintEnabled(), contract.totalMinted(), provider.getBalance(address),
      ]);
      const normalizedAddress = getAddress(address);
      setAddress(normalizedAddress);
      setSnapshot({ owner: getAddress(owner), baseURI, mintEnabled, totalMinted: Number(totalMinted), balance: formatEther(balance) });
      try { localStorage.setItem(ADDRESS_KEY(networkKey), normalizedAddress); } catch { /* optional convenience only */ }
      setNotice({ kind: "success", text: "Contract checked using read-only calls. No signature was requested." });
    } catch (error) {
      setSnapshot(null);
      setNotice({ kind: "error", text: shortError(error) });
    } finally {
      setBusy(null);
    }
  }

  async function setBaseURI() {
    setBusy("base-uri");
    setNotice(null);
    try {
      if (!isAddress(address)) throw new Error("Enter a valid contract address.");
      const uri = baseURIInput.trim();
      if (!(uri.startsWith("ipfs://") || uri.startsWith("https://")) || !uri.endsWith("/")) {
        throw new Error("Use an https:// or ipfs:// metadata directory URI ending in /.");
      }
      if (!window.confirm(`Set the contract metadata URI to:\n\n${uri}\n\nThis requires an owner-wallet signature.`)) return;
      const signer = await selectedSigner();
      const contract = new Contract(address, ABI, signer);
      const transaction = await contract.setBaseURI(uri);
      setTxHash(transaction.hash);
      setNotice({ kind: "info", text: "Base URI transaction sent. Confirm it in your wallet." });
      await transaction.wait();
      setBaseURIInput(uri);
      await checkContract();
    } catch (error) {
      setNotice({ kind: "error", text: shortError(error) });
    } finally {
      setBusy(null);
    }
  }

  async function setMintOpen(enabled: boolean) {
    setBusy(enabled ? "open" : "close");
    setNotice(null);
    try {
      if (!isAddress(address)) throw new Error("Enter a valid contract address.");
      if (enabled) {
        if (!snapshot?.baseURI) throw new Error("Set and check the metadata URI before opening mint.");
        const confirmed = window.confirm(
          `Open public mint on ${network.display}?\n\nThe contract will accept mint transactions at the displayed phase prices. This action is on-chain and requires an owner-wallet signature.`,
        );
        if (!confirmed) return;
      } else if (!window.confirm("Close public mint on this contract? This requires an owner-wallet signature.")) {
        return;
      }
      const signer = await selectedSigner();
      const contract = new Contract(address, ABI, signer);
      const transaction = await contract.setMintEnabled(enabled);
      setTxHash(transaction.hash);
      setNotice({ kind: "info", text: `${enabled ? "Open" : "Close"} mint transaction sent. Confirm it in your wallet.` });
      await transaction.wait();
      await checkContract();
    } catch (error) {
      setNotice({ kind: "error", text: shortError(error) });
    } finally {
      setBusy(null);
    }
  }

  async function withdrawProceeds() {
    setBusy("withdraw");
    setNotice(null);
    try {
      if (!isAddress(address)) throw new Error("Enter a valid contract address.");
      if (!snapshot) throw new Error("Check the contract before withdrawing.");
      const amount = Number(snapshot.balance);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("The contract has no BNB proceeds to withdraw.");
      if (!window.confirm(`Withdraw all ${snapshot.balance} BNB to the contract owner ${snapshot.owner}?\n\nThis requires an owner-wallet signature.`)) return;
      const signer = await selectedSigner();
      const contract = new Contract(address, ABI, signer);
      const transaction = await contract.withdrawProceeds();
      setTxHash(transaction.hash);
      setNotice({ kind: "info", text: "Withdrawal transaction sent. Confirm it in your wallet." });
      await transaction.wait();
      await checkContract();
    } catch (error) {
      setNotice({ kind: "error", text: shortError(error) });
    } finally {
      setBusy(null);
    }
  }

  const formatAddress = (value: string) => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "—";

  return (
    <div className="naroba-shell deploy-shell">
      <header className="deploy-header">
        <a className="deploy-brand" href="/" aria-label="Back to Naroba home"><span className="deploy-mark">N</span><span>naroba <i>/ deploy</i></span></a>
        <a className="deploy-back" href="/#mint"><ArrowLeft size={15} /> Mint archive</a>
      </header>

      <main className="deploy-main">
        <section className="deploy-hero">
          <div className="section-kicker">NAROBA / CONTRACT CONTROL</div>
          <h1>Deploy <em>your archive.</em></h1>
          <p>Deploy the Naroba NFT contract from your owner wallet. No Remix, no pasted private key, and no minting until you open it yourself.</p>
          <div className="deploy-locked-callout"><LockKeyhole size={17} /><span><strong>Mint is closed by default.</strong> Deploying only creates the contract; it does not open mint.</span></div>
        </section>

        <div className="deploy-layout">
          <div className="deploy-steps">
            <section className="deploy-card" aria-labelledby="connect-heading">
              <div className="deploy-card__step">01</div>
              <div className="deploy-card__content">
                <div className="deploy-card__eyebrow">OWNER WALLET</div>
                <h2 id="connect-heading">Connect the owner wallet</h2>
                <p>The wallet that deploys becomes the contract owner. Use MetaMask or OKX Wallet. This page never asks for your seed phrase or private key.</p>
                <button className="deploy-primary" type="button" onClick={connectWallet} disabled={busy !== null}>
                  <WalletCards size={16} /> {busy === "connect" ? "Connecting…" : account ? "Wallet connected" : "Connect wallet owner"}
                </button>
                <div className={`deploy-wallet-state ${account ? "is-connected" : ""}`}>
                  <span className="deploy-state-dot" />
                  <span>{account ? `${formatAddress(account)} · ${chainId === network.chainId ? network.name : "switch network before signing"}` : "Wallet not connected yet"}</span>
                  {account && <button className="deploy-copy" type="button" onClick={() => navigator.clipboard?.writeText(account)} aria-label="Copy connected wallet"><Clipboard size={14} /></button>}
                </div>
              </div>
            </section>

            <section className="deploy-card" aria-labelledby="network-heading">
              <div className="deploy-card__step">02</div>
              <div className="deploy-card__content">
                <div className="deploy-card__eyebrow">NETWORK & DEPLOY</div>
                <h2 id="network-heading">Pick a network, then deploy</h2>
                <label className="deploy-label" htmlFor="deploy-network">Network</label>
                <select id="deploy-network" className="deploy-select" value={networkKey} onChange={(event) => setNetworkKey(event.target.value as NetworkKey)}>
                  <option value="bnb-testnet">{NETWORKS["bnb-testnet"].display}</option>
                  <option value="bnb-mainnet">{NETWORKS["bnb-mainnet"].display}</option>
                </select>
                <div className="deploy-network-note"><ShieldCheck size={16} /><span>Mainnet is selected by default. Mainnet deployment uses real BNB for gas. Deploying does not charge the mint price or open mint.</span></div>
                <button className="deploy-primary deploy-primary--wide" type="button" onClick={deployContract} disabled={!account || busy !== null}>
                  <FileCheck2 size={16} /> {busy === "deploy" ? "Deploying contract…" : `Deploy Naroba on ${networkKey === "bnb-mainnet" ? "Mainnet" : "Testnet"} — sign in wallet`}
                </button>
                <p className="deploy-footnote">Check the selected chain and gas estimate in your wallet before signing. No transaction is submitted until you press Deploy.</p>
              </div>
            </section>

            <section className="deploy-card" aria-labelledby="manage-heading">
              <div className="deploy-card__step">03</div>
              <div className="deploy-card__content">
                <div className="deploy-card__eyebrow">AFTER DEPLOY / OWNER ACTIONS</div>
                <h2 id="manage-heading">Set metadata, then decide when to open mint</h2>
                <label className="deploy-label" htmlFor="contract-address">Deployed contract address</label>
                <input id="contract-address" className="deploy-input" type="text" inputMode="text" autoComplete="off" spellCheck={false} placeholder="0x… (auto-filled after deploy)" value={address} onChange={(event) => { setAddress(event.target.value.trim()); setSnapshot(null); }} />
                <label className="deploy-label" htmlFor="base-uri">Metadata Base URI</label>
                <input id="base-uri" className="deploy-input" type="url" autoComplete="off" spellCheck={false} placeholder="ipfs://YOUR_METADATA_CID/" value={baseURIInput} onChange={(event) => setBaseURIInput(event.target.value)} />
                <div className="deploy-uri-note"><CircleAlert size={15} /><span>Pin the metadata and image folders first. Use the metadata CID ending in <code>/</code>. Do not use a placeholder CID. The contract owner can change this URI later.</span></div>
                <div className="deploy-action-grid">
                  <button className="deploy-secondary" type="button" onClick={setBaseURI} disabled={!canManage || busy !== null || !baseURIInput.trim()}>{busy === "base-uri" ? "Setting URI…" : "Set Base URI — sign"}</button>
                  <button className="deploy-secondary" type="button" onClick={() => void setMintOpen(true)} disabled={!canManage || busy !== null || Boolean(snapshot?.mintEnabled)}>{busy === "open" ? "Opening…" : "Open mint — sign"}</button>
                  <button className="deploy-secondary" type="button" onClick={() => void setMintOpen(false)} disabled={!canManage || busy !== null || !snapshot?.mintEnabled}>{busy === "close" ? "Closing…" : "Close mint — sign"}</button>
                  <button className="deploy-secondary" type="button" onClick={checkContract} disabled={busy !== null}>{busy === "check" ? "Checking…" : "Check contract — read only"}</button>
                </div>
                <button className="deploy-withdraw" type="button" onClick={withdrawProceeds} disabled={!canManage || busy !== null || !snapshot || Number(snapshot.balance) <= 0}>
                  {busy === "withdraw" ? "Withdrawing…" : "Withdraw contract proceeds to owner"}
                </button>
                {snapshot && (
                  <div className="deploy-contract-state">
                    <div className="deploy-contract-state__head"><Check size={15} /> CONTRACT CHECKED <span>{network.name}</span></div>
                    <dl>
                      <div><dt>Owner</dt><dd title={snapshot.owner}>{formatAddress(snapshot.owner)}</dd></div>
                      <div><dt>Mint</dt><dd className={snapshot.mintEnabled ? "is-open" : "is-closed"}>{snapshot.mintEnabled ? "OPEN" : "CLOSED"}</dd></div>
                      <div><dt>Supply</dt><dd>{snapshot.totalMinted.toLocaleString()} / 10,000</dd></div>
                      <div><dt>Contract BNB</dt><dd>{snapshot.balance} BNB</dd></div>
                      <div className="deploy-contract-state__uri"><dt>Base URI</dt><dd title={snapshot.baseURI}>{snapshot.baseURI || "Not set"}</dd></div>
                    </dl>
                    {isAddress(address) && <a className="deploy-explorer" href={`${network.explorer}/address/${address}`} target="_blank" rel="noreferrer">View on {networkKey === "bnb-mainnet" ? "BscScan" : "Testnet BscScan"} <ExternalLink size={13} /></a>}
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="deploy-aside">
            <section className="deploy-aside-card">
              <div className="deploy-card__eyebrow">NAROBA / MINT SCHEDULE</div>
              <h3>Prices fixed in the contract</h3>
              <div className="deploy-tier"><span>01–1,000</span><strong>FREE</strong><small>1,000 tokens · BNB gas may apply</small></div>
              <div className="deploy-tier"><span>1,001–9,000</span><strong>0.000222 BNB</strong><small>8,000 tokens · paid</small></div>
              <div className="deploy-tier"><span>9,001–10,000</span><strong>0.001 BNB</strong><small>1,000 tokens · paid</small></div>
              <div className="deploy-supply-total"><span>Total supply</span><strong>10,000 NRB</strong></div>
              <p className="deploy-aside-note">Minting is one token per transaction. Free mint is capped by the first 1,000 token IDs, not per wallet.</p>
            </section>

            <section className="deploy-aside-card deploy-safety-card">
              <div className="deploy-card__eyebrow">BEFORE OPENING MINT</div>
              <ol>
                <li>Pin the finalized image and metadata folders to IPFS.</li>
                <li>Set the metadata Base URI to the metadata CID.</li>
                <li>Check the owner, URI, and supply on the selected chain.</li>
                <li>Open mint only when the public mint page is connected.</li>
              </ol>
              <p><strong>Important:</strong> the current Naroba home-page mint panel is still a local preview, not a live contract mint UI. Opening this contract does not connect the home page automatically. Keep mint closed until that binding is added.</p>
              <a href="https://github.com/narutobattleninja/Narobaagent#nft-assets-and-metadata" target="_blank" rel="noreferrer">Read IPFS pinning steps <ArrowUpRight size={13} /></a>
            </section>
          </aside>
        </div>

        {notice && <div className={`deploy-notice deploy-notice--${notice.kind}`} role="status">{notice.text}</div>}
        {txUrl && <a className="deploy-tx-link" href={txUrl} target="_blank" rel="noreferrer">View latest transaction <ExternalLink size={13} /></a>}
        <div className="deploy-bottom-safety"><ShieldCheck size={15} /><span>Never share your seed phrase or private key. This page only requests wallet connections and transaction signatures you choose to approve.</span></div>
      </main>

      <footer className="deploy-footer"><a href="/">← Back to Naroba</a><span>BNB Chain · Owner-controlled · Mint closed at deploy</span></footer>
    </div>
  );
}
