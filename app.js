// app.js - Main application file for Staking Rewards Optimizer
require('dotenv').config();
const express = require('express');
const path = require('path');
const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = require('@aptos-labs/ts-sdk');
const { AgentRuntime, createAptosTools, LocalSigner } = require('move-agent-kit');
const { ChatAnthropic } = require('@langchain/anthropic');
const { OpenAI } = require('openai');
const axios = require('axios');
const fs = require('fs');

// Import modules
const stakingOptimizer = require('./modules/staking_optimizer');
const portfolioTracker = require('./modules/portfolio_tracker');
const tokenTracker = require('./modules/meme_coins_tracker');
const newsTracker = require('./modules/news_tracker');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Add template data for section configuration (for enhanced header)
app.locals.sections = [
  { id: 'market-overview', title: 'Market Overview', icon: 'chart' },
  { id: 'protocol-comparison', title: 'Protocol Comparison', icon: 'compare' },
  { id: 'wallet-analysis', title: 'Portfolio Analysis', icon: 'wallet' },
  { id: 'ai-recommendation', title: 'AI Recommendations', icon: 'ai' },
  { id: 'news-feed', title: 'News & Updates', icon: 'news' }
];

// Aptos configuration
const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(aptosConfig);

// In-memory cache for AI agent
let agentInstance = null;

/**
 * Initialize AI agent with Move Agent Kit
 * @returns {Promise<Object>} - Initialized agent and tools
 */
async function initializeAgent() {
  // Return cached instance if it exists
  if (agentInstance) return agentInstance;
  
  try {
    const privateKeyHex = process.env.APTOS_PRIVATE_KEY;
    if (!privateKeyHex) {
      throw new Error('No Aptos private key found in environment variables');
    }

    // Create private key object
    let privateKey;
    try {
      privateKey = new Ed25519PrivateKey(privateKeyHex);
    } catch (e) {
      throw new Error(`Invalid private key format: ${e.message}`);
    }
    
    // Create account from private key
    const account = Account.fromPrivateKey({ privateKey });
    console.log(`Initialized agent with account: ${account.accountAddress.toString()}`);

    // Create signer for the agent
    const signer = new LocalSigner(account, Network.MAINNET);
    
    // Initialize agent runtime with API keys
    const agent = new AgentRuntime(signer, aptos, {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY
    });

    // Create Move tools
    const tools = createAptosTools(agent);
    
    // Store the instance
    agentInstance = { account, agent, tools };
    return agentInstance;
  } catch (error) {
    console.error('Failed to initialize agent:', error);
    throw error;
  }
}

// Ensure all required directories exist
function ensureDirectories() {
  const directories = [
    path.join(__dirname, 'views'),
    path.join(__dirname, 'public'),
    path.join(__dirname, 'public/css'),
    path.join(__dirname, 'public/js'),
    path.join(__dirname, 'modules'),
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
}

// Root route - Dashboard
app.get('/', async (req, res) => {
  let stakingData = { protocols: {}, strategies: {} };
  let newsData = { articles: [], lastUpdated: new Date().toISOString() };
  let tokenData = { coins: [], lastUpdated: new Date().toISOString() };
  let generalStrategy = null;
  let error = null;

  try {
    // Ensure directories exist
    ensureDirectories();
    
    // Get staking data
    try {
      stakingData = await stakingOptimizer.getStakingData();
    } catch (stakingError) {
      console.error('Staking data error:', stakingError.message);
      error = `Staking data error: ${stakingError.message}`;
    }

    // Get news data
    try {
      newsData = await newsTracker.getLatestNews();
    } catch (newsError) {
      console.error('News data error:', newsError.message);
    }

    // Get token data
    try {
      tokenData = await tokenTracker.getMemeCoinData(stakingData, newsData);
    } catch (tokenError) {
      console.error('Token data error:', tokenError.message);
    }

    // Generate general market strategy with AI
    try {
      // Check for required API keys
      if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
        throw new Error('No AI API keys available. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in .env file.');
      }

      // Try to initialize agent
      await initializeAgent();

      // Prepare prompt for AI
      const prompt = `As an AI financial advisor specialized in Aptos DeFi, analyze the following real-time data to provide a general best investment strategy for users who have not yet connected their wallet:
1. Staking/Lending Rewards: ${JSON.stringify(stakingData.protocols, null, 2)}
2. Token Overview: ${JSON.stringify(tokenData.coins?.slice(0, 5) || [], null, 2)} (top 5 tokens by movement)
3. Latest News: ${JSON.stringify(newsData.articles?.slice(0, 5) || [], null, 2)} (top 5 news items)
Provide a JSON response with:
- title: "General Market Strategy"
- summary: Brief summary of the strategy (2-3 sentences)
- allocation: Array of {protocol, product, percentage, expectedApr}
- totalApr: Blended APR of the strategy
- rationale: Explanation based on the data (3-4 sentences)
- risks: Array of potential risks (3-5 items)`;

      // Try with Anthropic first, fall back to OpenAI
      let aiResponse;
      try {
        if (process.env.ANTHROPIC_API_KEY) {
          const anthropicModel = new ChatAnthropic({
            anthropicApiKey: process.env.ANTHROPIC_API_KEY,
            model: "claude-3-5-sonnet-20241022",
            temperature: 0.2,
          });
          
          aiResponse = await anthropicModel.invoke(prompt);
          console.log('Generated general strategy with Anthropic');
        } else {
          throw new Error('Anthropic API key not available');
        }
      } catch (anthropicError) {
        console.error('Anthropic API failed for general strategy:', anthropicError.message);
        
        if (process.env.OPENAI_API_KEY) {
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const openaiResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            response_format: { type: "json_object" }
          });
          aiResponse = { content: openaiResponse.choices[0].message.content };
          console.log('Generated general strategy with OpenAI fallback');
        } else {
          throw new Error('No available AI providers');
        }
      }

      // Parse AI response
      const content = aiResponse.content || aiResponse;
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        generalStrategy = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        throw new Error('Could not parse AI response as JSON');
      }
    } catch (strategyError) {
      console.error('General strategy generation error:', strategyError.message);
    }

    // Render the dashboard with all data
    res.render('dashboard', {
      stakingData,
      newsData,
      memeCoinsData: tokenData,
      walletData: null,
      generalStrategy,
      error,
      pageTitle: 'DeFi Headquarters - Enterprise Staking Dashboard',
      appVersion: '1.2.0', // Add version number for the UI
      lastUpdated: new Date().toISOString(),
      userConfig: {
        preferredRiskProfile: req.query.risk || 'balanced',
        darkMode: req.query.theme === 'dark',
        sections: app.locals.sections,
        activeSection: req.query.section || 'market-overview'
      }
    });
  } catch (e) {
    console.error('Dashboard rendering error:', e);
    res.status(500).render('dashboard', {
      stakingData: { protocols: {}, strategies: {} },
      newsData: { articles: [], lastUpdated: new Date().toISOString() },
      memeCoinsData: { coins: [], lastUpdated: new Date().toISOString() },
      walletData: null,
      generalStrategy: null,
      error: `Server error: ${e.message}`,
      pageTitle: 'DeFi Headquarters - Error',
      appVersion: '1.2.0',
      lastUpdated: new Date().toISOString(),
      userConfig: {
        preferredRiskProfile: 'balanced',
        darkMode: false,
        sections: app.locals.sections,
        activeSection: 'market-overview'
      }
    });
  }
});

// Wallet analysis endpoint
app.get('/api/wallet/:address', async (req, res) => {
  try {
    const walletAddress = req.params.address;
    
    // Validate wallet address format
    if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 66) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // Get portfolio data
    const portfolioData = await portfolioTracker.getPortfolioData(walletAddress);
    
    // Get personalized recommendations based on portfolio
    const stakingRecommendations = await stakingOptimizer.getPersonalizedRecommendations(
      walletAddress, 
      portfolioData
    );

    // Return combined data
    res.json({ 
      wallet: walletAddress, 
      portfolio: portfolioData, 
      stakingRecommendations,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Wallet analysis error:', error.message);
    res.status(500).json({ 
      error: 'Error analyzing wallet', 
      details: error.message,
      lastUpdated: new Date().toISOString()
    });
  }
});

// Latest news endpoint
app.get('/api/news/latest', async (req, res) => {
  try {
    const newsData = await newsTracker.getLatestNews();
    res.json(newsData);
  } catch (error) {
    console.error('News API error:', error.message);
    res.status(500).json({ 
      error: 'Error fetching latest news', 
      articles: [], 
      lastUpdated: new Date().toISOString() 
    });
  }
});

// Latest token data endpoint
app.get('/api/tokens/latest', async (req, res) => {
  try {
    const stakingData = await stakingOptimizer.getStakingData();
    const newsData = await newsTracker.getLatestNews();
    const tokenData = await tokenTracker.getMemeCoinData(stakingData, newsData);
    res.json(tokenData);
  } catch (error) {
    console.error('Token API error:', error.message);
    res.status(500).json({ 
      error: 'Error fetching latest token data', 
      coins: [], 
      lastUpdated: new Date().toISOString() 
    });
  }
});

// AI recommendations endpoint
app.get('/api/recommendations/ai', async (req, res) => {
  try {
    const { amount, riskProfile, walletAddress } = req.query;

    // Validate input parameters
    if (!amount || isNaN(parseFloat(amount)) || !riskProfile) {
      return res.status(400).json({ 
        error: 'Invalid parameters. Required: amount (number) and riskProfile (conservative/balanced/aggressive)' 
      });
    }

    // Ensure we have required API keys
    if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
      throw new Error('No AI API keys available. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in .env file.');
    }

    // Initialize agent if needed
    const agentData = await initializeAgent();
    if (!agentData) throw new Error('Could not initialize AI agent');

    // Get staking data and portfolio data (if wallet provided)
    const stakingData = await stakingOptimizer.getStakingData();
    let portfolioData = null;
    
    if (walletAddress) {
      try {
        portfolioData = await portfolioTracker.getPortfolioData(walletAddress);
      } catch (portfolioError) {
        console.error('Portfolio error:', portfolioError.message);
      }
    }

    // Prepare prompt for AI
    const prompt = `As an AI financial advisor specialized in Aptos DeFi, provide a personalized staking and investment strategy for a user with:
1. Amount to invest: ${amount} APT
2. Risk profile: ${riskProfile}
3. Current portfolio: ${portfolioData ? JSON.stringify(portfolioData) : 'Not provided'}

Current staking rates:
${JSON.stringify(stakingData.protocols, null, 2)}

Provide a JSON response with:
- title: Recommendation title
- summary: Brief summary (2-3 sentences)
- allocation: Array of {protocol, product, percentage, expectedApr}
- totalApr: Blended APR
- steps: Array of implementation instructions (5-7 steps)
- risks: Array of investment risks (3-5 items)
- mitigations: Array of risk mitigation strategies (3-5 items)
- additionalNotes: Additional insights or recommendations`;

    // Try with Anthropic first, fall back to OpenAI
    let aiResponse;
    try {
      if (process.env.ANTHROPIC_API_KEY) {
        const anthropicModel = new ChatAnthropic({
          anthropicApiKey: process.env.ANTHROPIC_API_KEY,
          model: "claude-3-5-sonnet-20241022",
          temperature: 0.2,
        });
        
        aiResponse = await anthropicModel.invoke(prompt);
        console.log('Successfully generated recommendation with Anthropic');
      } else {
        throw new Error('Anthropic API key not available');
      }
    } catch (anthropicError) {
      console.error('Anthropic API failed:', anthropicError.message);
      
      if (process.env.OPENAI_API_KEY) {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const openaiResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          response_format: { type: "json_object" }
        });
        aiResponse = { content: openaiResponse.choices[0].message.content };
        console.log('Successfully generated recommendation with OpenAI fallback');
      } else {
        throw new Error('Both Anthropic and OpenAI APIs failed');
      }
    }

    // Parse AI response
    const content = aiResponse.content || aiResponse;
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);
    
    if (!jsonMatch) throw new Error("Could not parse AI response");

    const aiRecommendation = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    
    // Enrich the recommendation with agent execution capabilities if wallet address is provided
    if (walletAddress && parseFloat(amount) > 0) {
      aiRecommendation.agentCapabilities = {
        canExecuteTransactions: true,
        supportedOperations: generateSupportedOperations(aiRecommendation.allocation, stakingData, amount)
      };
    }
    
    // Add UI enhancement metadata - required by dashboard.js
    aiRecommendation.ui = {
      lastUpdated: new Date().toISOString(),
      animationDelay: 300,
      chartColors: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'],
      visualizationType: 'donut' // 'donut', 'pie', or 'bar'
    };
    
    res.json(aiRecommendation);
  } catch (error) {
    console.error('AI recommendation error:', error.message);
    res.status(500).json({ 
      error: 'Error generating AI recommendation', 
      details: error.message 
    });
  }
});

// Execute strategy with agent
app.post('/api/execute-strategy', async (req, res) => {
  try {
    const { 
      walletAddress, 
      amount, 
      allocation, 
      operations 
    } = req.body;
    
    console.log('Execute strategy request:', JSON.stringify(req.body, null, 2));
    
    // Validate input
    if (!walletAddress || !amount || !allocation || !operations || !Array.isArray(operations)) {
      return res.status(400).json({ 
        error: 'Invalid request parameters. Required: walletAddress, amount, allocation, operations[]' 
      });
    }
    
    // Initialize agent
    const { agent, tools } = await initializeAgent();
    if (!agent) throw new Error('Could not initialize agent');
    
    // Execute operations sequentially
    const results = [];
    const failedOperations = [];
    
    for (const operation of operations) {
      try {
        console.log(`Executing operation: ${operation.type} with ${operation.protocol}`);
        
        // Prepare operation parameters
        const params = {
          to: operation.contractAddress,
          amount: parseFloat(operation.amount),
          functionName: operation.functionName,
          args: operation.args || []
        };
        
        // Execute operation based on type
        let result;
        switch (operation.type) {
          case 'stake':
            result = await agent.stakeTokens(params);
            break;
          case 'lend':
            result = await agent.lendTokens(params);
            break;
          case 'addLiquidity':
            result = await agent.addLiquidity(params);
            break;
          case 'deposit':
            result = await agent.depositTokens(params);
            break;
          default:
            result = await agent.executeTransaction({
              function: `${operation.contractAddress}${operation.functionName}`,
              type_arguments: [],
              arguments: [parseFloat(operation.amount) * 100000000] // Convert to octas
            });
        }
        
        results.push({
          operation: operation.type,
          protocol: operation.protocol,
          amount: operation.amount,
          status: 'success',
          transactionHash: result.hash || result.txHash || result.transaction?.hash,
          details: result
        });
        
      } catch (opError) {
        console.error(`Operation failed: ${operation.type} with ${operation.protocol}`, opError);
        
        failedOperations.push({
          operation: operation.type,
          protocol: operation.protocol,
          amount: operation.amount,
          status: 'failed',
          error: opError.message
        });
      }
    }
    
    // Return results
    res.json({
      wallet: walletAddress,
      totalAmount: amount,
      successfulOperations: results.length,
      failedOperations: failedOperations.length,
      operations: results,
      failed: failedOperations,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Strategy execution error:', error.message);
    res.status(500).json({ 
      error: 'Error executing strategy', 
      details: error.message 
    });
  }
});

// New route for user preferences
app.post('/api/user/preferences', (req, res) => {
  const { riskProfile, theme, activeSection } = req.body;
  
  console.log('User preferences update:', req.body);
  
  // Store in a cookie or session if needed
  // For now, we'll just return them for the client to store
  
  res.json({
    riskProfile: riskProfile || 'balanced',
    theme: theme || 'light',
    activeSection: activeSection || 'market-overview',
    lastUpdated: new Date().toISOString()
  });
});

// App status/health check endpoint
app.get('/api/status', async (req, res) => {
  try {
    // Check if agent is initialized
    let agentStatus = 'Not initialized';
    try {
      const agentData = await initializeAgent();
      agentStatus = agentData ? 'Connected' : 'Failed to initialize';
    } catch (e) {
      agentStatus = `Error: ${e.message}`;
    }
    
    // Get available protocols from staking optimizer
    let protocols = [];
    try {
      const stakingData = await stakingOptimizer.getStakingData();
      protocols = Object.keys(stakingData.protocols || {});
    } catch (e) {
      console.error('Error getting protocols:', e);
    }
    
    res.json({
      status: 'online',
      version: '1.2.0',
      timestamp: new Date().toISOString(),
      agent: {
        status: agentStatus,
        network: 'mainnet'
      },
      services: {
        staking: protocols.length > 0 ? 'available' : 'unavailable',
        news: 'available',
        tokens: 'available',
        ai: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY ? 'available' : 'unavailable'
      },
      protocols: protocols.length > 0 ? protocols : ['amnis', 'thala', 'echo']
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      error: error.message
    });
  }
});

/**
 * Generate list of supported operations based on allocation
 * @param {Array} allocation - Allocation from AI recommendation
 * @param {Object} stakingData - Staking data with protocol details
 * @param {number} amount - Total investment amount
 * @returns {Array} - Supported operations
 */
function generateSupportedOperations(allocation, stakingData, amount) {
  if (!allocation || !Array.isArray(allocation)) return [];
  
  // Use contract addresses from staking_optimizer module
  const contracts = stakingOptimizer.contracts;
  
  return allocation.map(item => {
    const protocol = item.protocol;
    const contractAddress = contracts[protocol] || stakingData?.protocols?.[protocol]?.contractAddress;
    
    // Determine operation type based on product
    let operationType = 'unknown';
    let functionName = '';
    
    if (item.product.toLowerCase().includes('staking') || item.product.toLowerCase().includes('stapt') || item.product.toLowerCase().includes('tapt')) {
      operationType = 'stake';
      functionName = '::staking::stake';
    } else if (item.product.toLowerCase().includes('lend') || item.product.toLowerCase().includes('apt')) {
      operationType = 'lend';
      functionName = '::lending::supply';
    } else if (item.product.toLowerCase().includes('amm') || item.product.toLowerCase().includes('lp')) {
      operationType = 'addLiquidity';
      functionName = '::router::add_liquidity';
    } else if (item.product.toLowerCase().includes('vault') || item.product.toLowerCase().includes('yield')) {
      operationType = 'deposit';
      functionName = '::yield::deposit';
    }
    
    // Protocol-specific function names
    if (protocol === 'amnis') {
      if (operationType === 'stake') functionName = '::staking::stake';
      else if (operationType === 'lend') functionName = '::lending::supply';
    } else if (protocol === 'thala') {
      if (operationType === 'stake') functionName = '::staking::stake_apt';
      else if (operationType === 'lend') functionName = '::lending::supply_apt';
    } else if (protocol === 'pancakeswap' || protocol === 'liquidswap') {
      if (operationType === 'addLiquidity') functionName = '::router::add_liquidity';
    }
    
    return {
      protocol,
      type: operationType,
      percentage: item.percentage,
      amount: (parseFloat(item.percentage) / 100 * parseFloat(amount)).toFixed(2),
      contractAddress,
      functionName,
      args: []
    };
  }).filter(op => op.type !== 'unknown' && op.contractAddress);
}

// Start the server
app.listen(port, () => {
  console.log(`DeFi Headquarters is running on http://localhost:${port}`);
  
  // Initialize agent in background
  initializeAgent().then(() => {
    console.log('Agent initialized successfully');
  }).catch(error => {
    console.error('Agent initialization failed:', error.message);
  });
});

module.exports = app;