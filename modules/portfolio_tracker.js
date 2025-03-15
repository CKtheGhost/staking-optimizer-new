// modules/portfolio_tracker.js
const { Aptos, AptosConfig, Network } = require('@aptos-labs/ts-sdk');

// Initialize Aptos client
const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(aptosConfig);

// Import contract addresses from staking_optimizer
const stakingOptimizer = require('./staking_optimizer');
const contracts = stakingOptimizer.contracts;

/**
 * Fetch resource data with retry logic
 * @param {Function} resourceFn - Function to fetch resource data
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<any>} - Fetched data
 */
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

/**
 * Check if an account exists on the blockchain
 * @param {string} walletAddress - User's wallet address
 * @returns {Promise<boolean>} - Whether the account exists
 */
async function checkAccountExists(walletAddress) {
  try {
    const resources = await aptos.getAccountResources({ accountAddress: walletAddress });
    if (!resources || resources.length === 0) throw new Error(`Account ${walletAddress} has no resources`);
    return true;
  } catch (error) {
    console.error(`Error checking account existence: ${error.message}`);
    throw new Error(`Account validation failed: ${error.message}`);
  }
}

/**
 * Get APT balance for a wallet
 * @param {string} walletAddress - User's wallet address
 * @returns {Promise<string>} - APT balance as string with 2 decimal places
 */
async function getAptBalance(walletAddress) {
  try {
    const resources = await fetchWithRetry(() =>
      aptos.getAccountResources({ accountAddress: walletAddress })
    );
    
    const aptCoinStore = resources.find(r => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>");
    if (!aptCoinStore) return "0.00";
    
    return (parseInt(aptCoinStore.data.coin.value || "0") / 1e8).toFixed(2);
  } catch (error) {
    console.error(`Error fetching APT balance: ${error.message}`);
    return "0.00";
  }
}

/**
 * Get staked APT balance from Amnis protocol
 * @param {string} walletAddress - User's wallet address
 * @returns {Promise<string>} - Staked APT balance as string with 2 decimal places
 */
async function getStakedAptBalance(walletAddress) {
  try {
    const resources = await fetchWithRetry(() =>
      aptos.getAccountResources({ accountAddress: walletAddress })
    );
    
    // Check for Amnis stAPT tokens
    const stAPTResource = resources.find(r => 
      r.type.includes(`${contracts.amnis}::stapt_token::StakedApt`) || 
      r.type.includes(`${contracts.amnis}::staking::StakedApt`)
    );
    if (!stAPTResource) return "0.00";
    
    return (parseInt(stAPTResource.data.coin?.value || "0") / 1e8).toFixed(2);
  } catch (error) {
    console.error(`Error fetching stAPT balance: ${error.message}`);
    return "0.00";
  }
}

/**
 * Get staked APT balance from Thala protocol
 * @param {string} walletAddress - User's wallet address
 * @returns {Promise<string>} - Staked APT balance as string with 2 decimal places
 */
async function getThalaStakedAptBalance(walletAddress) {
  try {
    const resources = await fetchWithRetry(() =>
      aptos.getAccountResources({ accountAddress: walletAddress })
    );
    
    // Check for Thala sthAPT tokens
    const sthAPTResource = resources.find(r => 
      r.type.includes(`${contracts.thala}::staking`) && r.type.includes("Staked")
    );
    if (!sthAPTResource) return "0.00";
    
    return (parseInt(sthAPTResource.data.value || "0") / 1e8).toFixed(2);
  } catch (error) {
    console.error(`Error fetching sthAPT balance: ${error.message}`);
    return "0.00";
  }
}

/**
 * Get staked APT balances from all supported protocols
 * @param {string} walletAddress - User's wallet address
 * @param {Array} resources - Account resources (optional, to avoid refetching)
 * @returns {Promise<Object>} - All staked balances
 */
async function getAllStakedBalances(walletAddress, resources = null) {
  try {
    if (!resources) {
      resources = await fetchWithRetry(() =>
        aptos.getAccountResources({ accountAddress: walletAddress })
      );
    }
    
    // Initialize all staked balances
    const stakedBalances = {
      amnis: "0.00",
      thala: "0.00",
      tortuga: "0.00",
      ditto: "0.00"
    };
    
    // Check all liquid staking protocols
    for (const proto of ['amnis', 'thala', 'tortuga', 'ditto']) {
      if (!contracts[proto]) continue;
      
      const stakeResource = resources.find(r => 
        (r.type.includes(`${contracts[proto]}::staking`) || 
         r.type.includes(`${contracts[proto]}::stake`) ||
         r.type.includes(`${contracts[proto]}::apt`)) &&
        (r.type.includes("Staked") || r.type.includes("stapt") || r.type.includes("token"))
      );
      
      if (stakeResource) {
        const valueField = stakeResource.data.coin?.value || stakeResource.data.value || "0";
        stakedBalances[proto] = (parseInt(valueField) / 1e8).toFixed(2);
      }
    }
    
    return stakedBalances;
  } catch (error) {
    console.error(`Error fetching all staked balances: ${error.message}`);
    return {
      amnis: "0.00",
      thala: "0.00",
      tortuga: "0.00",
      ditto: "0.00"
    };
  }
}

/**
 * Get AMM liquidity positions
 * @param {string} walletAddress - User's wallet address
 * @returns {Promise<Object>} - AMM liquidity info
 */
async function getAmmLiquidity(walletAddress) {
  try {
    const resources = await fetchWithRetry(() =>
      aptos.getAccountResources({ accountAddress: walletAddress })
    );
    
    // Find all LP tokens and liquidity pool positions
    const lpResources = resources.filter(r => 
      r.type.includes("LiquidityPool") || 
      r.type.includes("LPCoin") || 
      r.type.includes("LP<") || 
      r.type.includes("Swap") || 
      r.type.includes("AMM")
    );
    
    if (lpResources.length === 0) {
      return { 
        hasLiquidity: false, 
        estimatedValueUSD: 0,
        positions: [] 
      };
    }
    
    // Current APT price estimate
    const aptPrice = 12.50; // Updated fallback price as of March 2025
    
    // Extract details for each liquidity position
    const positions = [];
    let totalValueUSD = 0;
    
    for (const resource of lpResources) {
      // Try to determine the protocol based on resource type
      let protocol = "Unknown";
      for (const [name, address] of Object.entries(contracts)) {
        if (resource.type.includes(address)) {
          protocol = name;
          break;
        }
      }
      
      // Extract value amount
      const value = parseInt(resource.data.value || resource.data.coin?.value || resource.data.amount || "0");
      const valueInApt = value / 1e8;
      const valueUSD = valueInApt * aptPrice;
      
      // Add position details
      if (value > 0) {
        positions.push({
          protocol,
          type: resource.type.split("::").pop(),
          rawValue: value,
          valueInApt: valueInApt.toFixed(4),
          valueUSD: valueUSD.toFixed(2)
        });
        
        totalValueUSD += valueUSD;
      }
    }
    
    return { 
      hasLiquidity: positions.length > 0, 
      estimatedValueUSD: totalValueUSD,
      positions
    };
  } catch (error) {
    console.error(`Error fetching AMM liquidity: ${error.message}`);
    return { 
      hasLiquidity: false, 
      estimatedValueUSD: 0,
      positions: [],
      error: error.message
    };
  }
}

/**
 * Get recent transaction history
 * @param {string} walletAddress - User's wallet address
 * @param {number} limit - Number of transactions to fetch
 * @returns {Promise<Array>} - Recent transactions
 */
async function getTransactionHistory(walletAddress, limit = 5) {
  try {
    const transactions = await fetchWithRetry(() =>
      aptos.getAccountTransactions({ accountAddress: walletAddress, limit })
    );
    
    return transactions.map(tx => {
      // Try to identify transaction type based on payload
      let transactionType = tx.type || "Transaction";
      if (tx.payload) {
        const functionName = tx.payload.function || "";
        if (functionName.includes("::stake")) {
          transactionType = "Staking";
        } else if (functionName.includes("::unstake") || functionName.includes("::withdraw")) {
          transactionType = "Unstaking";
        } else if (functionName.includes("::swap")) {
          transactionType = "Swap";
        } else if (functionName.includes("::add_liquidity")) {
          transactionType = "Add Liquidity";
        } else if (functionName.includes("::remove_liquidity")) {
          transactionType = "Remove Liquidity";
        } else if (functionName.includes("::transfer")) {
          transactionType = "Transfer";
        }
      }
      
      return {
        hash: tx.hash,
        type: transactionType,
        timestamp: tx.timestamp,
        success: tx.success,
        vmStatus: tx.vm_status
      };
    });
  } catch (error) {
    console.error(`Error fetching transaction history: ${error.message}`);
    return [];
  }
}

/**
 * Get complete portfolio data for a wallet
 * @param {string} walletAddress - User's wallet address
 * @returns {Promise<Object>} - Complete portfolio data
 */
async function getPortfolioData(walletAddress) {
  console.log(`Fetching portfolio data for ${walletAddress}`);
  try {
    await checkAccountExists(walletAddress);
    
    const aptBalance = await getAptBalance(walletAddress);
    const aptPrice = 12.50; // Fallback price as of March 2025
    const aptValueUSD = parseFloat(aptBalance) * aptPrice;
    
    // Get staked balances from all protocols
    const stakedBalances = await getAllStakedBalances(walletAddress);
    
    // Calculate Amnis stAPT value
    const stAPTBalance = stakedBalances.amnis;
    const stAPTValueUSD = parseFloat(stAPTBalance) * 11; // Slightly higher value than APT
    
    // Calculate Thala sthAPT value
    const sthAPTBalance = stakedBalances.thala;
    const sthAPTValueUSD = parseFloat(sthAPTBalance) * 10.75;
    
    // Calculate Tortuga and Ditto staked values
    const tAPTBalance = stakedBalances.tortuga;
    const tAPTValueUSD = parseFloat(tAPTBalance) * 10.9;
    
    const dAPTBalance = stakedBalances.ditto;
    const dAPTValueUSD = parseFloat(dAPTBalance) * 10.8;
    
    // Get AMM liquidity
    const ammLiquidity = await getAmmLiquidity(walletAddress);
    
    // Get recent transactions
    const recentTransactions = await getTransactionHistory(walletAddress);
    
    // Calculate total value
    const totalValueUSD = aptValueUSD + stAPTValueUSD + sthAPTValueUSD + tAPTValueUSD + dAPTValueUSD + ammLiquidity.estimatedValueUSD;
    
    // Return complete portfolio data
    return {
      apt: { amount: aptBalance, valueUSD: aptValueUSD },
      stAPT: { amount: stAPTBalance, valueUSD: stAPTValueUSD },
      sthAPT: { amount: sthAPTBalance, valueUSD: sthAPTValueUSD },
      tAPT: { amount: tAPTBalance, valueUSD: tAPTValueUSD },
      dAPT: { amount: dAPTBalance, valueUSD: dAPTValueUSD },
      ammLiquidity: { 
        hasLiquidity: ammLiquidity.hasLiquidity, 
        valueUSD: ammLiquidity.estimatedValueUSD,
        positions: ammLiquidity.positions 
      },
      totalValueUSD,
      recentTransactions,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error in getPortfolioData: ${error.message}`);
    throw error;
  }
}

// Export functions
module.exports = { 
  getPortfolioData,
  checkAccountExists,
  getAptBalance,
  getStakedAptBalance,
  getThalaStakedAptBalance,
  getAllStakedBalances,
  getAmmLiquidity,
  getTransactionHistory
};