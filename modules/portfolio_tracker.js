// modules/portfolio_tracker.js
const { Aptos, AptosConfig, Network } = require('@aptos-labs/ts-sdk');

const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(aptosConfig);

const CONTRACTS = {
  amnis: "0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a",
  thala: "0xfaf4e633ae9eb31366c9ca24214231760926576c7b625313b3688b5e900731f6",
  echo: "0xeab7ea4d635b6b6add79d5045c4a45d8148d88287b1cfa1c3b6a4b56f46839ed"
};

async function fetchWithRetry(resourceFn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await resourceFn();
    } catch (error) {
      if (i === maxRetries - 1) throw new Error(`Failed after ${maxRetries} retries: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

async function checkAccountExists(walletAddress) {
  const resources = await aptos.getAccountResources({ accountAddress: walletAddress });
  if (!resources || resources.length === 0) throw new Error(`Account ${walletAddress} has no resources`);
  return true;
}

async function getAptBalance(walletAddress) {
  const resources = await fetchWithRetry(() =>
    aptos.getAccountResources({ accountAddress: walletAddress })
  );
  
  const aptCoinStore = resources.find(r => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>");
  if (!aptCoinStore) throw new Error("No APT balance found");
  
  return (parseInt(aptCoinStore.data.coin.value || "0") / 1e8).toFixed(2);
}

async function getStakedAptBalance(walletAddress) {
  const resources = await fetchWithRetry(() =>
    aptos.getAccountResources({ accountAddress: walletAddress })
  );
  
  const stAPTResource = resources.find(r => 
    r.type.includes(`${CONTRACTS.amnis}::stapt_token::StakedApt`) || 
    r.type.includes(`${CONTRACTS.amnis}::staking::StakedApt`)
  );
  if (!stAPTResource) return "0.00";
  
  return (parseInt(stAPTResource.data.coin?.value || "0") / 1e8).toFixed(2);
}

async function getThalaStakedAptBalance(walletAddress) {
  const resources = await fetchWithRetry(() =>
    aptos.getAccountResources({ accountAddress: walletAddress })
  );
  
  const sthAPTResource = resources.find(r => 
    r.type.includes(`${CONTRACTS.thala}::staking`) && r.type.includes("Staked")
  );
  if (!sthAPTResource) return "0.00";
  
  return (parseInt(sthAPTResource.data.value || "0") / 1e8).toFixed(2);
}

async function getAmmLiquidity(walletAddress) {
  const resources = await fetchWithRetry(() =>
    aptos.getAccountResources({ accountAddress: walletAddress })
  );
  
  const lpResources = resources.filter(r => 
    r.type.includes("LiquidityPool") || r.type.includes("LPCoin")
  );
  if (lpResources.length === 0) return { hasLiquidity: false, estimatedValueUSD: 0 };
  
  const estimatedValueUSD = lpResources.reduce((sum, r) => 
    sum + (parseInt(r.data.value || "0") / 1e8 * 10), 0); // Assuming $10 per LP token
  return { hasLiquidity: true, estimatedValueUSD };
}

async function getTransactionHistory(walletAddress) {
  const transactions = await fetchWithRetry(() =>
    aptos.getAccountTransactions({ accountAddress: walletAddress, limit: 5 })
  );
  
  return transactions.map(tx => ({
    hash: tx.hash,
    type: tx.type,
    timestamp: tx.timestamp,
    success: tx.success,
    vmStatus: tx.vm_status
  }));
}

async function getPortfolioData(walletAddress) {
  console.log(`Fetching portfolio data for ${walletAddress}`);
  await checkAccountExists(walletAddress);
  
  const aptBalance = await getAptBalance(walletAddress);
  const aptValueUSD = parseFloat(aptBalance) * 10; // Real-time price feed needed
  
  const stAPTBalance = await getStakedAptBalance(walletAddress);
  const stAPTValueUSD = parseFloat(stAPTBalance) * 11;
  
  const sthAPTBalance = await getThalaStakedAptBalance(walletAddress);
  const sthAPTValueUSD = parseFloat(sthAPTBalance) * 10.75;
  
  const ammLiquidity = await getAmmLiquidity(walletAddress);
  const recentTransactions = await getTransactionHistory(walletAddress);
  
  const totalValueUSD = aptValueUSD + stAPTValueUSD + sthAPTValueUSD + ammLiquidity.estimatedValueUSD;
  
  return {
    apt: { amount: aptBalance, valueUSD: aptValueUSD },
    stAPT: { amount: stAPTBalance, valueUSD: stAPTValueUSD },
    sthAPT: { amount: sthAPTBalance, valueUSD: sthAPTValueUSD },
    ammLiquidity: { hasLiquidity: ammLiquidity.hasLiquidity, valueUSD: ammLiquidity.estimatedValueUSD },
    totalValueUSD,
    recentTransactions,
    lastUpdated: new Date().toISOString()
  };
}

module.exports = { getPortfolioData };