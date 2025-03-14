// app.js - Main application file
const express = require('express');
const path = require('path');
const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = require('@aptos-labs/ts-sdk');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const { AgentRuntime, createAptosTools } = require('move-agent-kit');
const { ChatAnthropic } = require('@langchain/anthropic');
const { OpenAI } = require('openai');

const stakingOptimizer = require('./modules/staking_optimizer');
const portfolioTracker = require('./modules/portfolio_tracker');
const tokenTracker = require('./modules/meme_coins_tracker');
const newsTracker = require('./modules/news_tracker');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

const aptosConfig = new AptosConfig({ network: Network.MAINNET });
const aptos = new Aptos(aptosConfig);

async function initializeAgent() {
  const privateKeyHex = process.env.APTOS_PRIVATE_KEY;
  if (!privateKeyHex) throw new Error('No Aptos private key found in environment variables');
  
  const privateKey = new Ed25519PrivateKey(privateKeyHex.startsWith('0x') ? privateKeyHex.slice(2) : privateKeyHex);
  const account = Account.fromPrivateKey({ privateKey });
  console.log(`Initialized agent with account: ${account.accountAddress.toString()}`);
  
  const LocalSigner = require('move-agent-kit').LocalSigner;
  const signer = new LocalSigner(account, Network.MAINNET);
  const agent = new AgentRuntime(signer, aptos, {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY
  });
  
  const tools = createAptosTools(agent);
  return { account, agent, tools };
}

const viewsDir = path.join(__dirname, 'views');
if (!fs.existsSync(viewsDir)) fs.mkdirSync(viewsDir, { recursive: true });

const publicDir = path.join(__dirname, 'public');
const cssDir = path.join(publicDir, 'css');
const jsDir = path.join(publicDir, 'js');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir, { recursive: true });
if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir, { recursive: true });

app.get('/', async (req, res) => {
  let stakingData = {};
  let newsData = { articles: [], lastUpdated: new Date().toISOString() };
  let tokenData = { coins: [], lastUpdated: new Date().toISOString() };
  let generalStrategy = null;

  try {
    stakingData = await stakingOptimizer.getStakingData();
  } catch (stakingError) {
    console.error('Staking data error:', stakingError.message);
  }

  try {
    newsData = await newsTracker.getLatestNews();
  } catch (newsError) {
    console.error('News data error:', newsError.message);
  }

  try {
    tokenData = await tokenTracker.getMemeCoinData();
  } catch (tokenError) {
    console.error('Token data error:', tokenError.message);
  }

  try {
    const agentData = await initializeAgent();
    const { ChatAnthropic } = require('@langchain/anthropic');
    const anthropicModel = new ChatAnthropic({
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      model: "claude-3-5-sonnet-20241022",
      temperature: 0.2,
    });
    
    const prompt = `As an AI financial advisor specialized in Aptos DeFi, analyze the following real-time data to provide a general best investment strategy for users who have not yet connected their wallet:
1. Staking/Lending Rewards: ${JSON.stringify(stakingData.protocols, null, 2)}
2. Token Overview: ${JSON.stringify(tokenData.coins.slice(0, 5), null, 2)} (top 5 tokens by movement)
3. Latest News: ${JSON.stringify(newsData.articles.slice(0, 5), null, 2)} (top 5 news items)
Provide a JSON response with:
- title: "General Market Strategy"
- summary: Brief summary of the strategy
- allocation: Array of {protocol, product, percentage, expectedApr}
- totalApr: Blended APR of the strategy
- rationale: Explanation based on the data
- risks: Array of potential risks`;
    
    let response;
    try {
      response = await anthropicModel.invoke(prompt);
      console.log('Generated general strategy with Anthropic');
    } catch (anthropicError) {
      console.error('Anthropic API failed for general strategy:', anthropicError.message);
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const openaiResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });
      response = { content: openaiResponse.choices[0].message.content };
      console.log('Generated general strategy with OpenAI fallback');
    }
    
    const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) || response.content.match(/{[\s\S]*}/);
    if (jsonMatch) generalStrategy = JSON.parse(jsonMatch[1] || jsonMatch[0]);
  } catch (strategyError) {
    console.error('General strategy generation error:', strategyError.message);
  }

  res.render('dashboard', { 
    stakingData, 
    newsData, 
    memeCoinsData: tokenData, 
    walletData: null, 
    generalStrategy,
    error: null
  });
});

app.get('/api/wallet/:address', async (req, res) => {
  try {
    const walletAddress = req.params.address;
    if (!walletAddress || !walletAddress.startsWith('0x') || walletAddress.length !== 66) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }
    
    const portfolioData = await portfolioTracker.getPortfolioData(walletAddress);
    const stakingRecommendations = await stakingOptimizer.getPersonalizedRecommendations(walletAddress, portfolioData);
    
    res.json({ wallet: walletAddress, portfolio: portfolioData, stakingRecommendations });
  } catch (error) {
    console.error('Wallet analysis error:', error.message);
    res.status(500).json({ error: 'Error analyzing wallet', details: error.message });
  }
});

app.get('/api/news/latest', async (req, res) => {
  try {
    const newsData = await newsTracker.getLatestNews();
    res.json(newsData);
  } catch (error) {
    console.error('News API error:', error.message);
    res.status(500).json({ error: 'Error fetching latest news', articles: [], lastUpdated: new Date().toISOString() });
  }
});

app.get('/api/tokens/latest', async (req, res) => {
  try {
    const tokenData = await tokenTracker.getMemeCoinData();
    res.json(tokenData);
  } catch (error) {
    console.error('Token API error:', error.message);
    res.status(500).json({ error: 'Error fetching latest token data', coins: [], lastUpdated: new Date().toISOString() });
  }
});

app.get('/api/recommendations/ai', async (req, res) => {
  try {
    const { amount, riskProfile, walletAddress } = req.query;
    
    if (!amount || isNaN(parseFloat(amount)) || !riskProfile) {
      return res.status(400).json({ error: 'Invalid parameters. Required: amount (number) and riskProfile (conservative/balanced/aggressive)' });
    }
    
    const agentData = await initializeAgent();
    if (!agentData) throw new Error('Could not initialize AI agent');

    const stakingData = await stakingOptimizer.getStakingData();
    let portfolioData = walletAddress ? await portfolioTracker.getPortfolioData(walletAddress) : null;
    
    const prompt = `As an AI financial advisor specialized in Aptos DeFi, provide a personalized staking and investment strategy for a user with:
1. Amount to invest: ${amount} APT
2. Risk profile: ${riskProfile}
3. Current portfolio: ${portfolioData ? JSON.stringify(portfolioData) : 'Not provided'}
Current staking rates:
${JSON.stringify(stakingData, null, 2)}
Provide a JSON response with:
- title: Recommendation title
- summary: Brief summary
- allocation: Array of {protocol, product, percentage, expectedApr}
- totalApr: Blended APR
- steps: Array of instructions
- risks: Array of risks
- mitigations: Array of mitigation strategies
- additionalNotes: Additional insights`;

    let response;
    try {
      const { ChatAnthropic } = require('@langchain/anthropic');
      const anthropicModel = new ChatAnthropic({
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        model: "claude-3-5-sonnet-20241022",
        temperature: 0.2,
      });
      response = await anthropicModel.invoke(prompt);
      console.log('Successfully generated recommendation with Anthropic');
    } catch (anthropicError) {
      console.error('Anthropic API failed:', anthropicError.message);
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const openaiResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          response_format: { type: "json_object" }
        });
        response = { content: openaiResponse.choices[0].message.content };
        console.log('Successfully generated recommendation with OpenAI fallback');
      } catch (openaiError) {
        console.error('OpenAI fallback failed:', openaiError.message);
        throw new Error('Both Anthropic and OpenAI APIs failed');
      }
    }

    const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) || response.content.match(/{[\s\S]*}/);
    if (!jsonMatch) throw new Error("Could not parse AI response");
    
    const aiRecommendation = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    res.json(aiRecommendation);
  } catch (error) {
    console.error('AI recommendation error:', error.message);
    res.status(500).json({ error: 'Error generating AI recommendation', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Staking Rewards Optimizer is running on http://localhost:${port}`);
});

module.exports = app;