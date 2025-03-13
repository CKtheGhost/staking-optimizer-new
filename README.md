# Staking Rewards Optimizer

An AI-powered DeFi optimization tool built with Move Agent Kit and Anthropic's Claude 3.5 Sonnet for the **Agentic Infra Track**. It maximizes APT returns across Amnis, Thala, and Echo protocols on the Aptos blockchain by analyzing staking, lending, and AMM opportunities.

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

## Prerequisites

- **Node.js**: v20.18.3 or later
- **Aptos Wallet**: Petra (for `APTOS_PRIVATE_KEY`)
- **Anthropic API**: Key required (`ANTHROPIC_API_KEY`)

## Setup Instructions

1. **Clone Repository** (after creating on GitHub):
   ```bash
   git clone https://github.com/your-username/staking-optimizer.git
   cd staking-optimizer

Install Dependencies:
bash

npm install @aptos-labs/ts-sdk move-agent-kit @langchain/anthropic @langchain/langgraph dotenv

Configure Environment:
Create .env:
bash

nano .env

Add:

APTOS_PRIVATE_KEY="0x-your-64-char-hex-key"
ANTHROPIC_API_KEY="sk-ant-api03-your-key"

Source APTOS_PRIVATE_KEY from Petra (https://petra.app/).

Source ANTHROPIC_API_KEY from Anthropic (https://console.anthropic.com/).

How to Run
bash

node staking_optimizer.js

Output
The tool fetches real-time data (or uses fallbacks) and provides:
Detailed APRs for staking, lending, and AMM per protocol.

Blended APR strategies (e.g., Thala: 8.3%).

Risk-based recommendations (conservative, balanced, aggressive).

Known Issues
Amnis Parsing: May fallback to 21,703,047 APT if supply structure changes.

Thala Staking: Blockchain fetch may fail ("Resource not found"); uses 7.5% APR estimate.

NPM Vulnerabilities: 12 high-severity issues (e.g., axios <1.8.2). See npm audit. Mitigation planned post-competition.

Testnet Option
For low API credits:
Edit staking_optimizer.js:
javascript

const aptosConfig = new AptosConfig({ network: Network.TESTNET });
const signer = new LocalSigner(account, Network.TESTNET);

Fund Testnet address (0x213b...dce5) at https://faucet.testnet.aptoslabs.com/.

Submission Details
Files: staking_optimizer.js, README.md, .env (template)

Competition: Agentic Infra Track, March 13, 2025

Author: Connor Kemet, Prospera

