# Staking Rewards Optimizer

An AI-powered DeFi optimization tool built with Move Agent Kit and Anthropic's Claude 3.5 Sonnet for the **Agentic Infra Track**. It maximizes APT returns across Amnis, Thala, and Echo protocols on the Aptos blockchain by analyzing staking, lending, and AMM opportunities.

![Dashboard Screenshot](https://i.imgur.com/PlLZH9L.png)

## Core Features

### Protocol Integration
- **Accurate Contract Integration**: Uses specific contract addresses:
  - Amnis: `0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a`
  - Thala: `0xfaf4e633ae9eb31366c9ca24214231760926576c7b625313b3688b5e900731f6`
  - Echo: `0xeab7ea4d635b6b6add79d5045c4a45d8148d88287b1cfa1c3b6a4b56f46839ed`
- **Protocol-Specific Functions**: Calls precise staking/lending operations (e.g., `::staking::stake` for Amnis).
- **Comprehensive Offerings**: Analyzes staking (7.5-8.5% APR), lending (5-8%), and AMM (5-10%) across protocols.

### AI-Powered Recommendations
- **General Market Strategy**: AI-generated investment strategy based on current market conditions, protocol rates, and news sentiment.
- **Personalized Wallet Recommendations**: Custom investment advice based on your wallet holdings, staking history, and risk profile.
- **Strategic Action Items**: Specific steps with exact APT amounts to allocate to different protocols and products.
- **Risk-Reward Profiles**: Tailored recommendations for conservative, balanced, and aggressive investors.
- **Claude 3.5 Sonnet Integration**: Leverages advanced AI to parse complex DeFi data and generate human-readable insights.

### Portfolio Analysis
- **Wallet Integration**: Connect any Aptos wallet to analyze current holdings and positions.
- **Portfolio Tracking**: Monitor your APT, staked tokens (stAPT, sthAPT), and liquidity positions across protocols.
- **Performance Metrics**: Visual representation of portfolio allocation and historical performance.
- **Risk Assessment**: Analysis of your current risk profile and diversification.

### Market Intelligence
- **Live Token Tracking**: Real-time data on APT and other Aptos ecosystem tokens, including price movements and market trends.
- **Meme Coin Analysis**: Performance and risk metrics for popular meme coins on Aptos with AI-driven categorization.
- **News Aggregation**: Latest Aptos ecosystem news with relevance filtering and sentiment analysis.
- **Market Sentiment Indicators**: AI-analyzed market mood and trend predictions based on news and social data.

### Optimized Strategies
- **Conservative Strategy**: 6.75% APR (70% Amnis staking, 30% Echo lending)
- **Balanced Strategy**: 8.35% APR (40% Amnis staking, 30% Thala lending, 30% Thala AMM)
- **Aggressive Strategy**: 8.85% APR (20% Amnis staking, 30% Thala lending, 50% Thala/Amnis AMM)
- **Dynamic Rebalancing**: AI continuously monitors market conditions to adjust recommendations.

## Technical Features
- **Real-Time Data**: Fetches blockchain data with fallbacks to documented rates if API calls fail.
- **Enhanced Dashboard**: Web interface for easy visualization of staking opportunities, portfolio analysis, and market news.
- **Resilient Architecture**: Multi-layered fallbacks for API connections, data sources, and AI models.
- **Move Agent Kit Integration**: Leverages Move Agent Kit for reliable blockchain interaction.

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

4. **Build CSS** (optional, for development):
   ```bash
   npm run build:css
   ```

5. **Run the Application**:
   ```bash
   node staking_optimizer_app.js
   ```

   The dashboard will be available at: http://localhost:3000

## Usage Guide

### Dashboard Overview
- **General Market Strategy**: AI-generated investment strategy based on current market conditions.
- **Protocol Rates**: Current staking, lending, and AMM rates across all supported protocols.
- **Token Overview**: Performance data for popular tokens on Aptos with market indicators.
- **Latest News**: Curated news feed about the Aptos ecosystem with automatic updates.

### Wallet Analysis
- Enter any Aptos wallet address to analyze holdings and get personalized recommendations.
- View portfolio composition with breakdowns of regular APT, staked tokens, and liquidity positions.
- See transaction history and performance metrics visualized through interactive charts.
- Receive wallet-specific action items tailored to your current holdings.

### AI Recommendations
- After wallet analysis, use the AI recommendation form to get personalized investment advice.
- Set your investment amount and risk profile to receive a detailed allocation strategy.
- Review specific steps to implement the strategy with exact APT amounts for each action.
- Compare different risk profiles to understand the trade-offs between potential returns and risks.

### Market Intelligence
- Monitor real-time token data with automatic refreshing every 5 minutes.
- View trending tokens categorized by functionality (DeFi, Staking, Meme, etc.).
- Track market sentiment and trend predictions based on news and price movements.
- Stay updated with the latest Aptos ecosystem news curated by relevance.

### Optimized Strategies
- Compare pre-configured strategies (Conservative, Balanced, Aggressive) with different risk-reward profiles.
- See detailed protocol allocations with expected APR for each component.
- Understand the rationale behind each strategy with AI-generated explanations.
- Identify potential risks and mitigation strategies for your chosen approach.

## Testnet Option

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

- **`/`**: Main dashboard with general market strategy and protocol rates
- **`/api/wallet/:address`**: Get wallet analytics for specific address
- **`/api/news/latest`**: Get latest crypto news with automatic refresh
- **`/api/tokens/latest`**: Get token data and market trends with categorization
- **`/api/recommendations/ai`**: Generate AI investment recommendations based on parameters

## Move Agent Kit Integration

The application leverages Move Agent Kit to interact with Aptos blockchain:

- **Protocol Integration**: Connects to Amnis, Thala, and Echo protocols directly using their contract addresses
- **Token Operations**: Analyzes APT, stAPT, and sthAPT balances
- **Transaction Analysis**: Monitors wallet transactions and liquidity positions
- **AI Agent Runtime**: Uses AgentRuntime to power AI recommendations with blockchain context

## Known Issues

- **Amnis Parsing**: May fallback to default APR if blockchain fetch fails.
- **Thala Staking**: Blockchain fetch may fail with "Resource not found"; uses 7.5% APR estimate.
- **Refresh Rate**: News and token data refresh every 5 minutes to avoid API rate limits.
- **Token Images**: May show placeholder images if API fails to return token logos.

## Competition Details

- **Track**: Agentic Infra Track
- **Date**: March 13, 2025
- **Author**: Connor Kemet
- **Built With**: Move Agent Kit, Anthropic Claude 3.5 Sonnet

## Future Enhancements

- **Transaction Execution**: Enable direct staking and swaps through the dashboard
- **Multi-chain Support**: Extend to other Move-based chains like Sui
- **AI-driven Auto-rebalancing**: Automatic portfolio optimization based on market conditions
- **Mobile Interface**: Responsive design for mobile access

## License

MIT License - See [LICENSE.txt](LICENSE.txt) for details
