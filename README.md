# Staking Rewards Optimizer

An AI-powered DeFi optimization tool built with Move Agent Kit and Anthropic's Claude 3.5 Sonnet for the **Agentic Infra Track**. It maximizes APT returns across Amnis, Thala, and Echo protocols on the Aptos blockchain by analyzing staking, lending, and AMM opportunities.

![Dashboard Screenshot](https://i.imgur.com/PlLZH9L.png)

## Features

- **Accurate Contract Integration**: Uses specific contract addresses:
  - Amnis: `0xf66e78c95af419fd9fffbf0cd1e6fbe9c46a92ed2d6e88a2570ffc3a6d51d061`
  - Thala: `0x8f7ce0d699cb1fb65e536211ec35504dc952773dfa6e496ddcd3587c7e8a7cb5`
  - Echo: `0x952c1b1fc8eb75ee80f432c9d0a84fcda1d5c7481501a7eca9199f1596a60b53`
- **Protocol-Specific Functions**: Calls precise staking/lending operations (e.g., `::staking::stake` for Amnis).
- **Comprehensive Offerings**: Analyzes staking (7.5% APR for Amnis/Thala), lending (5-8%), and AMM (5-10%) across protocols.
- **Optimized Strategies**:
  - Conservative: 6.75% APR (70% Amnis staking, 30% Echo lending)
  - Balanced: 8.35% APR (40% Amnis staking, 30% Thala lending, 30% Thala AMM)
  - Aggressive: 8.85% APR (20% Amnis staking, 30% Thala lending, 50% Thala/Amnis AMM)
- **Risk-Reward Profiles**: Tailored recommendations for conservative, balanced, and aggressive investors.
- **Real-Time Data**: Fetches blockchain data with fallbacks to documented rates if API calls fail.
- **Enhanced Dashboard**: Web interface for easy visualization of staking opportunities, portfolio analysis, and market news.
- **AI Recommendations**: Claude 3.5 Sonnet-powered investment recommendations based on your risk profile and portfolio.
- **Portfolio Tracking**: Monitor your APT, staked tokens, and liquidity positions across protocols.
- **Market News**: Stay updated with the latest Aptos ecosystem news and trends.
- **Meme Coin Tracking**: Monitor performance and risk metrics for popular meme coins on Aptos.

## Prerequisites

- **Node.js**: v20.18.3 or later
- **Aptos Wallet**: Petra (for `APTOS_PRIVATE_KEY`)
- **Anthropic API**: Key required (`ANTHROPIC_API_KEY`)

## Setup Instructions

1. **Clone Repository**:
   ```bash
   git clone https://github.com/your-username/staking-optimizer.git
   cd staking-optimizer
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Create `.env` file:
   ```bash
   cp .env.example .env
   nano .env
   ```

   Add your keys:
   ```
   APTOS_PRIVATE_KEY="0x-your-64-char-hex-key"
   ANTHROPIC_API_KEY="sk-ant-api03-your-key"
   ```

   - Source `APTOS_PRIVATE_KEY` from Petra (https://petra.app/)
   - Source `ANTHROPIC_API_KEY` from Anthropic (https://console.anthropic.com/)

4. **Create Directory Structure** (if needed):
   ```bash
   mkdir -p public/css public/js views
   ```

5. **Run the Application**:
   ```bash
   node staking_optimizer_app.js
   ```

   The dashboard will be available at: http://localhost:3000

## Usage Guide

1. **Dashboard Overview**:
   - View current staking rates, recommended strategies, meme coins, and market news.
   
2. **Wallet Analysis**:
   - Enter any Aptos wallet address to analyze holdings and get personalized recommendations.
   
3. **AI Recommendations**:
   - After wallet analysis, use the AI recommendation form to get personalized investment advice.
   - Set your investment amount and risk profile to receive a detailed allocation strategy.

4. **Testnet Option**:
   For low API credits or testing, edit the config in `staking_optimizer_app.js`:
   ```javascript
   const aptosConfig = new AptosConfig({ network: Network.TESTNET });
   const signer = new LocalSigner(account, Network.TESTNET);
   ```
   
   Fund your Testnet address at: https://faucet.testnet.aptoslabs.com/

## Project Structure

```
staking-optimizer/
├── staking_optimizer_app.js    # Main application entry point
├── app.js                      # Express app configuration
├── modules/                    # Data processing modules
│   ├── staking_optimizer.js    # Staking protocol analysis
│   ├── portfolio_tracker.js    # Wallet portfolio tracking
│   ├── meme_coins_tracker.js   # Meme coin analysis
│   └── news_tracker.js         # Crypto news fetching
├── public/                     # Static assets
│   ├── css/                    # CSS stylesheets
│   └── js/                     # Client-side JavaScript
├── views/                      # EJS templates
│   └── dashboard.ejs           # Main dashboard template
├── .env                        # Environment variables
└── package.json                # Dependencies and scripts
```

## API Endpoints

- **`/`**: Main dashboard
- **`/api/wallet/:address`**: Get wallet analytics for specific address
- **`/api/news/latest`**: Get latest crypto news
- **`/api/recommendations/ai`**: Generate AI investment recommendations

## Known Issues

- **Amnis Parsing**: May fallback to 21,703,047 APT if supply structure changes.
- **Thala Staking**: Blockchain fetch may fail with "Resource not found"; uses 7.5% APR estimate.
- **NPM Vulnerabilities**: High-severity issues (e.g., axios <1.8.2). See `npm audit`. Mitigation planned post-competition.

## Competition Details

- **Track**: Agentic Infra Track
- **Date**: March 13, 2025
- **Author**: Connor Kemet, Prospera
- **Built With**: Move Agent Kit, Anthropic Claude 3.5 Sonnet

## License

MIT License - See [LICENSE.txt](LICENSE.txt) for details.