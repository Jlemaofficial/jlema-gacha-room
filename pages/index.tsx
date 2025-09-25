// pages/index.tsx
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import axios from "axios";
import ContractABI from "../abi/JlemaGachaRoom.json";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const CONTRACT_ADDRESS = "0xA71f087Df075E6d85453e425AD15Ab0d5366050f";
const CLEAN_TOKEN_ADDRESS = "0xeF2c6201f085E972fbaD4FA08beF4BaB660DAc33";

export default function Home() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState<string>("");
  const [cleanBalance, setCleanBalance] = useState<string>("0");
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [swapAmount, setSwapAmount] = useState<number>(0);
  const [ownerAddress, setOwnerAddress] = useState<string>("");
  const [isOwner, setIsOwner] = useState(false);
  const [contractCleanBalance, setContractCleanBalance] = useState<string>("0");
  const [availableNFTs, setAvailableNFTs] = useState<number>(0);





  useEffect(() => {
    if (window.ethereum) {
      const p = new ethers.BrowserProvider(window.ethereum);
      setProvider(p);
    }
  }, []);

  useEffect(() => {
    if (provider) {
      const c = new ethers.Contract(CONTRACT_ADDRESS, ContractABI, provider);
      setContract(c);
    }
  }, [provider]);

  useEffect(() => {
  if (!contract || !address) return;

  async function fetchOwner() {
  if (!contract) return; // 
  try {
    const owner = await contract.owner();
    setOwnerAddress(owner);
    setIsOwner(address.toLowerCase() === owner.toLowerCase());
  } catch (e) {
    console.error(e);
  }
}


  fetchOwner();
}, [contract, address]);


  async function connectWallet() {
    if (!window.ethereum) return alert("Please install Metamask");
    const p = new ethers.BrowserProvider(window.ethereum);
    await p.send("eth_requestAccounts", []);
    const s = await p.getSigner();
    const a = await s.getAddress();
    setProvider(p);
    setSigner(s);
    setAddress(a);
    fetchCleanBalance(a, p);
  }

  async function fetchCleanBalance(addr: string, p: ethers.BrowserProvider) {
    try {
      const abiERC20 = [
        "function balanceOf(address) view returns (uint256)",
        "function decimals() view returns (uint8)"
      ];
      const token = new ethers.Contract(CLEAN_TOKEN_ADDRESS, abiERC20, p);
      const bal = await token.balanceOf(addr);
      const dec = await token.decimals();
      const formatted = parseFloat(ethers.formatUnits(bal, dec)).toLocaleString('en-US', { maximumFractionDigits: 0 });
setCleanBalance(formatted);

    } catch (e) {
      console.error(e);
    }
  }

  async function swapMultiple() {
    if (!signer) return alert("Connect wallet first");
    setLoading(true);
    try {
      const contractWithSigner = new ethers.Contract(CONTRACT_ADDRESS, ContractABI, signer);
      const abiERC20 = ["function approve(address spender, uint256 amount) returns (bool)", "function decimals() view returns (uint8)"];
      const token = new ethers.Contract(CLEAN_TOKEN_ADDRESS, abiERC20, signer);
      const dec = await token.decimals();
      const totalAmount = ethers.parseUnits((10000 * swapAmount).toString(), dec);

      const txApprove = await token.approve(CONTRACT_ADDRESS, totalAmount);
      await txApprove.wait();

      for (let i = 0; i < swapAmount; i++) {
        const txSwap = await contractWithSigner.swap();
        await txSwap.wait();

          // Refresh balances and available NFTs after each swap
  fetchCleanBalance(address, provider!);
  fetchAvailableNFTs();
      }

      alert(`Swap complete! You got ${swapAmount} NFT(s).`);
      fetchCleanBalance(address, provider!);

    } catch (e) {
      console.error(e);
      alert("Swap failed");
    } finally {
      setLoading(false);
    }
  }

async function withdrawCleanHandler() {
  if (!contract || !signer) return alert("Contract or wallet not ready");
  try {
    const contractWithSigner = contract.connect(signer);
    const tx = await contractWithSigner.withdrawClean(); // assumes no args
    await tx.wait();
    alert("Withdraw successful!");
  } catch (e) {
    console.error(e);
    alert("Withdraw failed");
  }
}

async function fetchContractCleanBalance() {
  if (!provider) return;
  try {
    const abiERC20 = [
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)"
    ];
    const token = new ethers.Contract(CLEAN_TOKEN_ADDRESS, abiERC20, provider);
    const bal = await token.balanceOf(CONTRACT_ADDRESS);
    const dec = await token.decimals();
    setContractCleanBalance(ethers.formatUnits(bal, dec));
  } catch (e) {
    console.error("Fetch contract balance error:", e);
  }
}

async function fetchAvailableNFTs() {
  if (!contract) return;
  try {
    const count = await contract.getAvailableCount();
    setAvailableNFTs(Number(count));
  } catch (e) {
    console.error("Failed to fetch available NFTs", e);
    setAvailableNFTs(0);
  }
}


useEffect(() => {
  if (provider) fetchContractCleanBalance();
}, [provider]);

useEffect(() => {
  if (contract) {
    fetchAvailableNFTs();
  }
}, [contract]);






  return (
    <div style={{ fontFamily: "Inter, system-ui", minHeight: "100vh", background: "#fff", color: "#000" }}>
      <div style={{ maxWidth: 400, margin: "0 auto", padding: "20px" }}>
     {/* HEADER */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <img src="/logojlema.svg" alt="Jlema Gacha Room" style={{ height: 32, width: "auto" }} />
        {address ? (
          <div style={{ textAlign: "right", fontSize: 12 }}>
            <div>Connected</div>
            <div>{address.substring(0,6)}...{address.slice(-4)}</div>
          </div>
        ) : (
          <button onClick={connectWallet} style={connectBtn}>Connect Wallet</button>
        )}
      </header>

      {/* TITLE & SUBTITLE */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Gacha Room</h2>
        <p style={{ fontSize: 14, color: "#555", marginTop: 6 }}>
          Get 1 Jlema NFT for every 10,000 CLEAN you swap
        </p>
      </div>


        {/* BALANCE */}
        <div style={card}>
          <div style={{ fontSize: 14 }}>Your $CLEAN balance:</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{cleanBalance} CLEAN</div>
        </div>

        {/* INPUT NFTs */}
        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
  Available: {availableNFTs} NFT(s)
</div>

          <div style={{ fontSize: 14, marginBottom: 6 }}>Number of NFTs:</div>
          <input
            type="number"
            min={0}
            max={availableNFTs}
            value={swapAmount}
            onChange={(e) => setSwapAmount(Number(e.target.value))}
            style={inputStyle}
          />
        </div>

        {/* SWAP BUTTON */}
        <div style={card}>
          <button onClick={swapMultiple} style={swapBtn} disabled={loading || swapAmount<=0}>
            Swap {((10000 * swapAmount).toLocaleString('en-US'))} CLEAN
          </button>
          <div style={{ fontSize: 14, marginTop: 8 }}>
            You will get: {swapAmount} JLEMA NFT(s)
          </div>
        </div>

        {/* FOOTER / HOW TO USE */}
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>How to use:</h3>
          <p style={pStyle}>Connect your EVM wallet (Polygon network)</p>
          <p style={pStyle}>Make sure you hold at least 10,000 $CLEAN tokens and have some $POL for gas fees</p>
          <p style={pStyle}>Click the SWAP button and sign the transaction</p>
          <p style={pStyle}>The NFT(s) will be automatically transferred to your wallet</p>
          <p style={pStyle}>
            If you have any problems, please reach out to{" "}
            <a
              href="https://discord.com/invite/mSGVQBcPpA"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#000", textDecoration: "underline" }}
            >
              us
            </a>
          </p>
         {isOwner && (
  <div style={{ marginTop: 20, textAlign: "center" }}>
    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Owner Panel</h3>
    <button onClick={withdrawCleanHandler} style={swapBtn} disabled={loading}>
      Withdraw CLEAN
    </button>
    <div style={{ fontSize: 14, marginTop: 6 }}>
      Contract balance: {contractCleanBalance} CLEAN
    </div>
  </div>
)}


        </div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#f8f8f8",
  borderRadius: 16,
  padding: 20,
  textAlign: "center",
  marginBottom: 14
};

const connectBtn: React.CSSProperties = {
  background: "#000",
  color: "#fff",
  padding: "8px 14px",
  border: "none",
  borderRadius: 10,
  fontWeight: 600,
  cursor: "pointer"
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px",
  borderRadius: 8,
  border: "1px solid #ccc",
  textAlign: "center",
  fontSize: 16
};

const swapBtn: React.CSSProperties = {
  width: "100%",
  background: "#000",
  color: "#fff",
  border: "none",
  padding: "14px",
  borderRadius: 12,
  fontWeight: 700,
  fontSize: 16,
  cursor: "pointer"
};

const pStyle: React.CSSProperties = {
  fontSize: 12,
  marginBottom: 8
};
