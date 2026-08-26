"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  type Address,
  type EIP1193Provider,
  type Hash,
} from "viem";
import { base } from "viem/chains";
import {
  BASE_CHAIN_ID,
  MINEGAME_ECONOMY_ADDRESS,
  MINEGAME_TOKEN_ADDRESS,
  minegameEconomyAbi,
  minegameTokenAbi,
} from "@/lib/minegame";

export type TierState = {
  tierId: string;
  price: string;
  baseHashrate: string;
  gridDraw: string;
  buybackBps: number;
  active: boolean;
  metadataURI: string;
};

export type MinerState = {
  minerId: string;
  owner: Address;
  tierId: string;
  buybackBasis: string;
  acquiredAt: string;
  listed: boolean;
  listingPrice: string;
};

export type ListingState = {
  minerId: string;
  owner: Address;
  tierId: string;
  buybackBasis: string;
  acquiredAt: string;
  seller: Address;
  price: string;
};

type PlayerState = {
  address: Address;
  balance: string;
  allowance: string;
  rooms: string;
  minerCount: string;
  activeHashrate: string;
  gridDraw: string;
  pendingRewards: string;
  miners: MinerState[];
};

export type GameState = {
  timestamp: number;
  chainId: number;
  token: Address;
  economy: Address;
  paused: boolean;
  solvent: boolean;
  roomPrice: string;
  rewardRatePerSecond: string;
  rewardReserve: string;
  buybackReserve: string;
  rewardLiability: string;
  totalActiveHashrate: string;
  gridCapacityPerRoom: string;
  tiers: TierState[];
  player: PlayerState | null;
};

type BrowserProvider = EIP1193Provider & {
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

type MineGameContextValue = {
  account: Address | null;
  chainId: number | null;
  connected: boolean;
  game: GameState | null;
  listings: ListingState[];
  loading: boolean;
  marketLoading: boolean;
  pendingAction: string | null;
  notice: string;
  connect: () => Promise<void>;
  disconnect: () => void;
  refresh: () => Promise<void>;
  loadMarketplace: () => Promise<void>;
  approve: (amount: bigint) => Promise<void>;
  buyMiner: (tierId: bigint, maxPrice: bigint) => Promise<void>;
  buyRoom: (maxPrice: bigint) => Promise<void>;
  claim: () => Promise<void>;
  listMiner: (minerId: bigint, price: bigint) => Promise<void>;
  cancelListing: (minerId: bigint) => Promise<void>;
  buyListedMiner: (minerId: bigint, maxPrice: bigint) => Promise<void>;
  sellMinerBack: (minerId: bigint, minimumPayout: bigint) => Promise<void>;
  fundRewards: (amount: bigint) => Promise<void>;
};

const MineGameContext = createContext<MineGameContextValue | null>(null);

declare global {
  interface Window {
    ethereum?: BrowserProvider;
  }
}

function readableError(error: unknown) {
  if (!(error instanceof Error)) return "Transaction failed.";
  const message = error.message.split("\n")[0];
  if (/user rejected|user denied/i.test(message)) return "Transaction cancelled in wallet.";
  if (/insufficient funds/i.test(message)) return "Not enough ETH for Base network gas.";
  return message.replace(/^ContractFunctionExecutionError:\s*/i, "").slice(0, 220);
}

async function switchToBase(provider: BrowserProvider) {
  const current = await provider.request({ method: "eth_chainId" });
  if (Number(current) === BASE_CHAIN_ID) return;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x2105" }] });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? Number(error.code) : 0;
    if (code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: "0x2105",
        chainName: "Base",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: ["https://mainnet.base.org"],
        blockExplorerUrls: ["https://basescan.org"],
      }],
    });
  }
}

export function MineGameProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [listings, setListings] = useState<ListingState[]>([]);
  const [loading, setLoading] = useState(true);
  const [marketLoading, setMarketLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [notice, setNotice] = useState("Connect a Base wallet to load your room.");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const query = account ? `?address=${account}` : "";
      const response = await fetch(`/api/game${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not read MineGame from Base.");
      setGame(await response.json() as GameState);
    } catch (error) {
      setNotice(readableError(error));
    } finally {
      setLoading(false);
    }
  }, [account]);

  const loadMarketplace = useCallback(async () => {
    setMarketLoading(true);
    try {
      const response = await fetch("/api/market", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load marketplace listings.");
      const payload = await response.json() as { listings: ListingState[] };
      setListings(payload.listings);
    } catch (error) {
      setNotice(readableError(error));
    } finally {
      setMarketLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 15_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    const injected = window.ethereum;
    if (!injected) return;
    const restore = async () => {
      const accounts = await injected.request({ method: "eth_accounts" }) as Address[];
      const walletChain = await injected.request({ method: "eth_chainId" });
      setChainId(Number(walletChain));
      if (accounts[0]) {
        setProvider(injected);
        setAccount(accounts[0]);
        setNotice("Wallet restored. Live Base state loaded.");
      }
    };
    void restore();

    const accountsChanged = (...args: unknown[]) => {
      const accounts = (args[0] || []) as Address[];
      setAccount(accounts[0] || null);
      if (!accounts[0]) setProvider(null);
    };
    const chainChanged = (...args: unknown[]) => setChainId(Number(args[0]));
    injected.on?.("accountsChanged", accountsChanged);
    injected.on?.("chainChanged", chainChanged);
    return () => {
      injected.removeListener?.("accountsChanged", accountsChanged);
      injected.removeListener?.("chainChanged", chainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    const injected = window.ethereum;
    if (!injected) {
      setNotice("No browser wallet found. Open minegame.fun inside Base App or install Coinbase Wallet.");
      return;
    }
    try {
      const accounts = await injected.request({ method: "eth_requestAccounts" }) as Address[];
      await switchToBase(injected);
      setProvider(injected);
      setAccount(accounts[0]);
      setChainId(BASE_CHAIN_ID);
      setNotice("Wallet connected on Base.");
    } catch (error) {
      setNotice(readableError(error));
    }
  }, []);

  const disconnect = useCallback(() => {
    setProvider(null);
    setAccount(null);
    setNotice("Wallet disconnected from this page.");
  }, []);

  const submit = useCallback(async (label: string, to: Address, data: `0x${string}`) => {
    if (!provider || !account) {
      setNotice("Connect your wallet first.");
      return;
    }
    setPendingAction(label);
    setNotice(`${label}: confirm in your wallet.`);
    try {
      await switchToBase(provider);
      const wallet = createWalletClient({ account, chain: base, transport: custom(provider) });
      const hash: Hash = await wallet.sendTransaction({ account, chain: base, to, data });
      setNotice(`${label}: submitted ${hash.slice(0, 10)}… Waiting for Base confirmation.`);
      const publicClient = createPublicClient({ chain: base, transport: custom(provider) });
      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
      if (receipt.status !== "success") throw new Error(`${label} reverted on Base.`);
      setNotice(`${label}: confirmed on Base.`);
      await Promise.all([refresh(), loadMarketplace()]);
    } catch (error) {
      setNotice(readableError(error));
    } finally {
      setPendingAction(null);
    }
  }, [account, loadMarketplace, provider, refresh]);

  const actions = useMemo(() => ({
    approve: (amount: bigint) => submit("Approve MINEGAME", MINEGAME_TOKEN_ADDRESS, encodeFunctionData({
      abi: minegameTokenAbi, functionName: "approve", args: [MINEGAME_ECONOMY_ADDRESS, amount],
    })),
    buyMiner: (tierId: bigint, maxPrice: bigint) => submit("Buy miner", MINEGAME_ECONOMY_ADDRESS, encodeFunctionData({
      abi: minegameEconomyAbi, functionName: "buyMiner", args: [tierId, maxPrice],
    })),
    buyRoom: (maxPrice: bigint) => submit("Buy room", MINEGAME_ECONOMY_ADDRESS, encodeFunctionData({
      abi: minegameEconomyAbi, functionName: "buyRoom", args: [maxPrice],
    })),
    claim: () => submit("Claim MINEGAME", MINEGAME_ECONOMY_ADDRESS, encodeFunctionData({
      abi: minegameEconomyAbi, functionName: "claimMinegame",
    })),
    listMiner: (minerId: bigint, price: bigint) => submit("List miner", MINEGAME_ECONOMY_ADDRESS, encodeFunctionData({
      abi: minegameEconomyAbi, functionName: "listMiner", args: [minerId, price],
    })),
    cancelListing: (minerId: bigint) => submit("Cancel listing", MINEGAME_ECONOMY_ADDRESS, encodeFunctionData({
      abi: minegameEconomyAbi, functionName: "cancelListing", args: [minerId],
    })),
    buyListedMiner: (minerId: bigint, maxPrice: bigint) => submit("Buy listed miner", MINEGAME_ECONOMY_ADDRESS, encodeFunctionData({
      abi: minegameEconomyAbi, functionName: "buyListedMiner", args: [minerId, maxPrice],
    })),
    sellMinerBack: (minerId: bigint, minimumPayout: bigint) => submit("Sell miner back", MINEGAME_ECONOMY_ADDRESS, encodeFunctionData({
      abi: minegameEconomyAbi, functionName: "sellMinerBack", args: [minerId, minimumPayout],
    })),
    fundRewards: (amount: bigint) => submit("Fund reward reserve", MINEGAME_ECONOMY_ADDRESS, encodeFunctionData({
      abi: minegameEconomyAbi, functionName: "fundRewards", args: [amount],
    })),
  }), [submit]);

  const value = useMemo<MineGameContextValue>(() => ({
    account,
    chainId,
    connected: Boolean(account),
    game,
    listings,
    loading,
    marketLoading,
    pendingAction,
    notice,
    connect,
    disconnect,
    refresh,
    loadMarketplace,
    ...actions,
  }), [account, actions, chainId, connect, disconnect, game, listings, loadMarketplace, loading, marketLoading, notice, pendingAction, refresh]);

  return <MineGameContext.Provider value={value}>{children}</MineGameContext.Provider>;
}

export function useMineGame() {
  const context = useContext(MineGameContext);
  if (!context) throw new Error("useMineGame must be used inside MineGameProvider");
  return context;
}
