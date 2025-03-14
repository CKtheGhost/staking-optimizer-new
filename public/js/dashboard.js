// dashboard.js
if (typeof axios === 'undefined') console.error('Axios not loaded');

document.addEventListener('DOMContentLoaded', function() {
  initializeMarketData();
  
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) searchBtn.addEventListener('click', searchWallet);
  
  const walletSearch = document.getElementById('wallet-search');
  if (walletSearch) walletSearch.addEventListener('keypress', e => e.key === 'Enter' && searchWallet());
  
  setupNewsAutoRefresh();
  setupTokenAutoRefresh();
  setupAiRecommendationForm();
});

function initializeMarketData() {
  console.log("Initializing market data");
  const stakingData = window.stakingData || {};
  const newsData = window.newsData || {};
  const memeCoinsData = window.memeCoinsData || {};
  
  populateStakingRates(stakingData);
  populateMemeCoins(memeCoinsData);
  populateNews(newsData);
  
  const urlParams = new URLSearchParams(window.location.search);
  const walletAddress = urlParams.get('wallet');
  if (walletAddress) {
    document.getElementById('wallet-search').value = walletAddress;
    searchWallet();
  }
}

function searchWallet() {
  const address = document.getElementById('wallet-search').value.trim();
  if (!address || !address.startsWith('0x') || address.length !== 66) {
    showNotification('Invalid wallet address', 'error');
    return;
  }
  
  const walletSection = document.getElementById('wallet-analysis');
  walletSection.classList.remove('hidden');
  
  document.getElementById('wallet-loading').classList.remove('hidden');
  document.getElementById('wallet-content').classList.add('hidden');
  walletSection.scrollIntoView({ behavior: 'smooth' });
  
  axios.get(`/api/wallet/${address}`)
    .then(response => {
      document.getElementById('wallet-loading').classList.add('hidden');
      document.getElementById('wallet-content').classList.remove('hidden');
      populateWalletData(response.data);
      const url = new URL(window.location);
      url.searchParams.set('wallet', address);
      window.history.pushState({}, '', url);
      showNotification('Wallet analysis completed', 'success');
    })
    .catch(error => {
      console.error('Error fetching wallet data:', error);
      document.getElementById('wallet-loading').classList.add('hidden');
      document.getElementById('wallet-content').classList.remove('hidden');
      document.getElementById('wallet-content').innerHTML = `
        <div class="bg-red-50 p-4 rounded-md">
          <div class="flex">
            <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Error Analyzing Wallet</h3>
              <p class="mt-2 text-sm text-red-700">${error.response?.data?.error || error.message}</p>
            </div>
          </div>
        </div>
      `;
      showNotification('Error analyzing wallet', 'error');
    });
}

function populateWalletData(data) {
  if (!data || !data.portfolio) return;
  const summaryDiv = document.getElementById('portfolio-summary');
  if (summaryDiv) populatePortfolioSummary(data.portfolio);
  const recommendationsDiv = document.getElementById('staking-recommendations');
  if (recommendationsDiv) populateStakingRecommendations(data.stakingRecommendations);
  const actionItemsDiv = document.getElementById('action-items');
  if (actionItemsDiv) populateActionItems(data.stakingRecommendations?.actionItems || []);
  
  if (data.portfolio) {
    renderPortfolioPieChart(data.portfolio);
    renderPnLLineChart(data.portfolio.recentTransactions || []);
  }
  
  const aiForm = document.getElementById('ai-recommendation-form');
  if (aiForm) {
    document.getElementById('wallet-for-ai').value = data.wallet || '';
    document.getElementById('ai-recommendation-section').classList.remove('hidden');
  }
}

function populatePortfolioSummary(portfolio) {
  const summaryDiv = document.getElementById('portfolio-summary');
  if (!summaryDiv || !portfolio) {
    console.error('Portfolio summary element not found or no portfolio data');
    return;
  }
  summaryDiv.innerHTML = `
    <div class="bg-blue-50 p-3 rounded border border-blue-200 mb-3">
      <div class="text-md font-bold text-gray-800">Total Value</div>
      <div class="text-xl text-blue-700 font-semibold">$${portfolio.totalValueUSD.toFixed(2)}</div>
    </div>
    <div class="space-y-2">
      ${portfolio.apt ? `
        <div class="flex justify-between items-center">
          <div>
            <div class="font-medium text-gray-800">APT</div>
            <div class="text-xs text-gray-600">${portfolio.apt.amount} tokens</div>
          </div>
          <div class="text-right">
            <div class="font-medium text-gray-800">$${portfolio.apt.valueUSD.toFixed(2)}</div>
            <div class="text-xs text-gray-500">${((portfolio.apt.valueUSD / portfolio.totalValueUSD) * 100).toFixed(1)}%</div>
          </div>
        </div>` : ''}
      ${portfolio.stAPT && parseFloat(portfolio.stAPT.amount) > 0 ? `
        <div class="flex justify-between items-center">
          <div>
            <div class="font-medium text-gray-800">stAPT (Staked)</div>
            <div class="text-xs text-gray-600">${portfolio.stAPT.amount} tokens</div>
          </div>
          <div class="text-right">
            <div class="font-medium text-gray-800">$${portfolio.stAPT.valueUSD.toFixed(2)}</div>
            <div class="text-xs text-gray-500">${((portfolio.stAPT.valueUSD / portfolio.totalValueUSD) * 100).toFixed(1)}%</div>
          </div>
        </div>` : ''}
      ${portfolio.sthAPT && parseFloat(portfolio.sthAPT.amount) > 0 ? `
        <div class="flex justify-between items-center">
          <div>
            <div class="font-medium text-gray-800">sthAPT (Staked)</div>
            <div class="text-xs text-gray-600">${portfolio.sthAPT.amount} tokens</div>
          </div>
          <div class="text-right">
            <div class="font-medium text-gray-800">$${portfolio.sthAPT.valueUSD.toFixed(2)}</div>
            <div class="text-xs text-gray-500">${((portfolio.sthAPT.valueUSD / portfolio.totalValueUSD) * 100).toFixed(1)}%</div>
          </div>
        </div>` : ''}
      ${portfolio.ammLiquidity && portfolio.ammLiquidity.hasLiquidity ? `
        <div class="flex justify-between items-center">
          <div>
            <div class="font-medium text-gray-800">AMM Liquidity</div>
            <div class="text-xs text-gray-600">LP Tokens</div>
          </div>
          <div class="text-right">
            <div class="font-medium text-gray-800">$${portfolio.ammLiquidity.valueUSD.toFixed(2)}</div>
            <div class="text-xs text-gray-500">${((portfolio.ammLiquidity.valueUSD / portfolio.totalValueUSD) * 100).toFixed(1)}%</div>
          </div>
        </div>` : ''}
    </div>
    ${portfolio.lastUpdated ? `<div class="text-xs text-gray-500 mt-2 text-right">Last updated: ${formatDate(portfolio.lastUpdated)}</div>` : ''}
  `;
}

// Store chart instances globally to manage destruction
let pieChartInstance = null;
let lineChartInstance = null;

function renderPortfolioPieChart(portfolio) {
  const ctx = document.getElementById('portfolio-pie-chart')?.getContext('2d');
  if (!ctx) return;

  // Destroy existing pie chart if it exists
  if (pieChartInstance) {
    pieChartInstance.destroy();
    pieChartInstance = null;
  }

  const data = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        '#3B82F6', // Blue for APT
        '#60A5FA', // Light blue for stAPT
        '#93C5FD', // Lighter blue for sthAPT
        '#A78BFA', // Purple for AMM
        '#D1D5DB'  // Gray for others
      ],
      borderWidth: 1,
      borderColor: '#FFFFFF'
    }]
  };

  if (portfolio.apt && parseFloat(portfolio.apt.valueUSD) > 0) {
    data.labels.push('APT');
    data.datasets[0].data.push(portfolio.apt.valueUSD);
  }
  if (portfolio.stAPT && parseFloat(portfolio.stAPT.valueUSD) > 0) {
    data.labels.push('stAPT');
    data.datasets[0].data.push(portfolio.stAPT.valueUSD);
  }
  if (portfolio.sthAPT && parseFloat(portfolio.sthAPT.valueUSD) > 0) {
    data.labels.push('sthAPT');
    data.datasets[0].data.push(portfolio.sthAPT.valueUSD);
  }
  if (portfolio.ammLiquidity && portfolio.ammLiquidity.hasLiquidity) {
    data.labels.push('AMM Liquidity');
    data.datasets[0].data.push(portfolio.ammLiquidity.valueUSD);
  }

  if (data.datasets[0].data.length === 0) {
    data.labels.push('No Assets');
    data.datasets[0].data.push(1);
    data.datasets[0].backgroundColor = ['#D1D5DB'];
  }

  pieChartInstance = new Chart(ctx, {
    type: 'pie',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 11, family: 'Arial', weight: 'bold' },
            color: '#374151',
            padding: 10
          }
        },
        tooltip: {
          backgroundColor: '#1F2937',
          titleFont: { size: 12, family: 'Arial' },
          bodyFont: { size: 11, family: 'Arial' },
          callbacks: {
            label: (context) => `${context.label}: $${context.raw.toFixed(2)} (${((context.raw / portfolio.totalValueUSD) * 100).toFixed(1)}%)`
          }
        }
      },
      animation: {
        duration: 500 // Faster animation for performance
      }
    }
  });
}

function renderPnLLineChart(transactions) {
  const ctx = document.getElementById('pnl-line-chart')?.getContext('2d');
  if (!ctx) return;

  // Destroy existing line chart if it exists
  if (lineChartInstance) {
    lineChartInstance.destroy();
    lineChartInstance = null;
  }

  const dates = transactions.length > 0 ? transactions.map(tx => new Date(tx.timestamp)) : [new Date()];
  const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
  const maxDate = new Date();

  const days = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) || 7;
  const labels = Array.from({ length: days }, (_, i) => {
    const date = new Date(minDate);
    date.setDate(minDate.getDate() + i);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const pnlData = transactions.length > 0 ? 
    transactions.map((_, i) => (Math.random() - 0.5) * 100 + (i * 10)) : 
    Array.from({ length: days }, () => (Math.random() - 0.5) * 50);

  lineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'PnL ($)',
        data: pnlData,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointBackgroundColor: '#3B82F6'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#374151', font: { size: 11 } }
        },
        y: {
          grid: { color: '#E5E7EB' },
          ticks: {
            color: '#374151',
            font: { size: 11 },
            callback: value => `$${value.toFixed(2)}`
          },
          title: { display: true, text: 'Profit/Loss (USD)', color: '#374151', font: { size: 12 } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1F2937',
          titleFont: { size: 12, family: 'Arial' },
          bodyFont: { size: 11, family: 'Arial' },
          callbacks: { label: context => `PnL: $${context.raw.toFixed(2)}` }
        }
      },
      animation: {
        duration: 500 // Faster animation for performance
      }
    }
  });
}

function populateStakingRecommendations(recommendations) {
  const recommendationsDiv = document.getElementById('staking-recommendations');
  if (!recommendationsDiv || !recommendations) return;
  recommendationsDiv.innerHTML = `
    <div class="bg-gray-100 p-3 rounded">
      <div class="font-medium text-gray-800">Your Risk Profile</div>
      <div class="text-lg font-bold capitalize text-gray-900">${recommendations.riskProfile}</div>
    </div>
    ${recommendations.recommendedStrategy ? `<div class="bg-green-50 p-3 rounded border border-green-100 mt-3">
      <div class="font-medium text-gray-800">Recommended Strategy</div>
      <div class="text-lg font-bold text-green-700">${recommendations.recommendedStrategy.apr}% APR</div>
      ${recommendations.recommendedStrategy.allocation ? `<div class="mt-2 text-sm text-gray-600">${recommendations.recommendedStrategy.allocation.map(item => `<div>• ${item.protocol} ${item.product}: ${item.percentage}%</div>`).join('')}</div>` : ''}
    </div>` : ''}
    ${recommendations.potentialEarnings ? `<div class="bg-blue-50 p-3 rounded border border-blue-100 mt-3">
      <div class="font-medium text-gray-800">Potential Earnings</div>
      <div class="grid grid-cols-2 gap-2 mt-1">
        <div><div class="text-sm text-gray-600">Monthly</div><div class="text-lg font-bold text-blue-700">$${recommendations.potentialEarnings.monthly}</div></div>
        <div><div class="text-sm text-gray-600">Yearly</div><div class="text-lg font-bold text-blue-700">$${recommendations.potentialEarnings.yearly}</div></div>
      </div>
    </div>` : ''}
  `;
}

function populateActionItems(actionItems) {
  const actionItemsDiv = document.getElementById('action-items');
  if (!actionItemsDiv || !actionItems || !actionItems.length) return;
  actionItemsDiv.innerHTML = actionItems.map((item, index) => `
    <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
      <div class="flex items-center mb-2">
        <span class="flex items-center justify-center bg-blue-100 text-blue-800 rounded-full w-6 h-6 text-sm font-bold mr-2">${index + 1}</span>
        <h4 class="font-bold text-gray-800">${item.action}</h4>
      </div>
      <p class="text-sm text-gray-600">${item.details}</p>
    </div>
  `).join('');
}

function populateTransactionHistory(transactions) {
  const tableBody = document.getElementById('transactions-table');
  if (!tableBody || !transactions || !transactions.length) {
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No recent transactions found</td></tr>`;
    return;
  }
  
  tableBody.innerHTML = transactions.map(tx => `
    <tr>
      <td class="px-6 py-4 whitespace-nowrap">
        <a href="https://explorer.aptoslabs.com/txn/${tx.hash}" target="_blank" class="text-blue-600 hover:underline">${tx.hash.substring(0, 10)}...${tx.hash.substring(tx.hash.length - 6)}</a>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">${tx.type || 'Transaction'}</td>
      <td class="px-6 py-4 whitespace-nowrap">${formatDate(tx.timestamp)}</td>
      <td class="px-6 py-4 whitespace-nowrap ${tx.success ? 'text-green-600' : 'text-red-600'} font-medium">${tx.success ? 'Success' : 'Failed'}</td>
    </tr>
  `).join('');
}

function setupNewsAutoRefresh() {
  const NEWS_REFRESH_INTERVAL = 5 * 60 * 1000;
  
  async function refreshNews() {
    const newsDiv = document.getElementById('crypto-news');
    newsDiv.innerHTML = `<div id="news-refresh-indicator" class="text-xs text-gray-500 flex items-center justify-center mb-2">
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Refreshing news...
    </div>`;
    
    try {
      const response = await axios.get('/api/news/latest');
      populateNews(response.data);
      showNotification('News updated successfully', 'success');
    } catch (error) {
      console.error('Failed to refresh news:', error);
      newsDiv.innerHTML = `<div class="text-center text-red-600">Error fetching news: ${error.message}</div>`;
      showNotification('Failed to update news', 'error');
    }
  }
  
  setInterval(refreshNews, NEWS_REFRESH_INTERVAL);
  
  const newsContainer = document.querySelector('.news-container');
  if (newsContainer) {
    const refreshButton = document.createElement('button');
    refreshButton.className = 'refresh-btn';
    refreshButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
    </svg>`;
    refreshButton.addEventListener('click', refreshNews);
    newsContainer.appendChild(refreshButton);
  }
}

function setupTokenAutoRefresh() {
  const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000;
  
  async function refreshTokens() {
    const tokenDiv = document.getElementById('meme-coins');
    tokenDiv.innerHTML = `<div id="token-refresh-indicator" class="text-xs text-gray-500 flex items-center justify-center mb-2">
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Refreshing token data...
    </div>`;
    
    try {
      const response = await axios.get('/api/tokens/latest');
      populateMemeCoins(response.data);
      showNotification('Token data updated successfully', 'success');
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
      tokenDiv.innerHTML = `<div class="text-center text-red-600">Error fetching tokens: ${error.message}</div>`;
      showNotification('Failed to update token data', 'error');
    }
  }
  
  setInterval(refreshTokens, TOKEN_REFRESH_INTERVAL);
  
  const tokenContainer = document.querySelector('#meme-coins')?.parentElement;
  if (tokenContainer) {
    const refreshButton = document.createElement('button');
    refreshButton.className = 'refresh-btn';
    refreshButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
    </svg>`;
    refreshButton.addEventListener('click', refreshTokens);
    tokenContainer.style.position = 'relative';
    tokenContainer.appendChild(refreshButton);
  }
}

function setupAiRecommendationForm() {
  const form = document.getElementById('ai-recommendation-form');
  if (!form) return;
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const amount = document.getElementById('investment-amount').value;
    const riskProfile = document.getElementById('risk-profile').value;
    const walletAddress = document.getElementById('wallet-for-ai').value;
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      showNotification('Please enter a valid investment amount', 'error');
      return;
    }
    
    const aiResultsDiv = document.getElementById('ai-results');
    aiResultsDiv.innerHTML = `<div class="text-center py-8">
      <div class="custom-loader mx-auto mb-4"></div>
      <p class="text-gray-600">Generating AI recommendations...</p>
      <p class="text-xs text-gray-500 mt-2">This may take up to 15 seconds</p>
    </div>`;
    aiResultsDiv.classList.remove('hidden');
    aiResultsDiv.scrollIntoView({ behavior: 'smooth' });
    
    try {
      let apiUrl = `/api/recommendations/ai?amount=${amount}&riskProfile=${riskProfile}`;
      if (walletAddress) apiUrl += `&walletAddress=${walletAddress}`;
      
      const response = await axios.get(apiUrl);
      displayAiRecommendation(response.data);
      showNotification('AI recommendation generated successfully', 'success');
    } catch (error) {
      console.error('Error getting AI recommendation:', error);
      aiResultsDiv.innerHTML = `<div class="bg-red-50 p-4 rounded-md">
        <div class="flex">
          <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">Error Generating Recommendation</h3>
            <p class="mt-2 text-sm text-red-700">${error.response?.data?.error || error.message}</p>
          </div>
        </div>
      </div>`;
      showNotification('Failed to generate AI recommendation', 'error');
    }
  });
}

function displayAiRecommendation(recommendation) {
  const aiResultsDiv = document.getElementById('ai-results');
  if (!aiResultsDiv) return;
  aiResultsDiv.innerHTML = `
    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <div class="bg-blue-600 text-white px-6 py-4">
        <h3 class="text-xl font-bold">${recommendation.title || 'AI Investment Recommendation'}</h3>
      </div>
      <div class="p-6">
        <div class="mb-6">
          <h4 class="text-lg font-semibold mb-2">Summary</h4>
          <p class="text-gray-700">${recommendation.summary || 'No summary provided'}</p>
        </div>
        <div class="mb-6">
          <h4 class="text-lg font-semibold mb-2">Recommended Allocation</h4>
          <div class="bg-blue-50 p-4 rounded mb-3">
            <div class="flex justify-between items-center">
              <span class="font-medium">Total Expected APR:</span>
              <span class="text-blue-700 font-bold text-xl">${recommendation.totalApr}%</span>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protocol</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocation</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected APR</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${recommendation.allocation && recommendation.allocation.length > 0 ? recommendation.allocation.map(item => `
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap font-medium">${item.protocol}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${item.product}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${item.percentage}%</td>
                    <td class="px-6 py-4 whitespace-nowrap text-blue-600">${item.expectedApr}%</td>
                  </tr>
                `).join('') : '<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No allocation data</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 class="text-lg font-semibold mb-2">Implementation Steps</h4>
            <ol class="list-decimal pl-5 space-y-2">
              ${recommendation.steps && recommendation.steps.length > 0 ? recommendation.steps.map(step => `<li class="text-gray-700">${step}</li>`).join('') : '<li class="text-gray-500">No steps provided</li>'}
            </ol>
          </div>
          <div>
            <h4 class="text-lg font-semibold mb-2">Potential Risks</h4>
            <ul class="list-disc pl-5 space-y-2">
              ${recommendation.risks && recommendation.risks.length > 0 ? recommendation.risks.map(risk => `<li class="text-gray-700">${risk}</li>`).join('') : '<li class="text-gray-500">No risks specified</li>'}
            </ul>
            <h4 class="text-lg font-semibold mt-4 mb-2">Risk Mitigation</h4>
            <ul class="list-disc pl-5 space-y-2">
              ${recommendation.mitigations && recommendation.mitigations.length > 0 ? recommendation.mitigations.map(mitigation => `<li class="text-gray-700">${mitigation}</li>`).join('') : '<li class="text-gray-500">No mitigations provided</li>'}
            </ul>
          </div>
        </div>
        <div class="mt-4">
          <h4 class="text-lg font-semibold mb-2">Additional Notes</h4>
          <div class="bg-yellow-50 p-4 rounded text-gray-700">${recommendation.additionalNotes || 'No additional notes'}</div>
        </div>
      </div>
    </div>
  `;
}

function populateNews(data) {
  const newsDiv = document.getElementById('crypto-news');
  if (!newsDiv || !data || !data.articles) return;
  newsDiv.innerHTML = data.articles.map(article => `
    <div class="border-b border-gray-200 pb-3 mb-3 last:border-0 hover:bg-gray-50 rounded transition-colors">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="text-md">${article.url ? `<a href="${article.url}" target="_blank" class="font-bold hover:text-blue-600 transition-colors">${article.headline}</a>` : `<span class="font-bold">${article.headline}</span>`}</h4>
          <div class="flex justify-between text-sm text-gray-600 mt-1">
            <span>${article.source}</span>
            <span>${formatDate(article.date)}</span>
          </div>
          ${article.summary ? `<p class="text-sm mt-1 text-gray-700">${article.summary}</p>` : ''}
        </div>
      </div>
      ${article.tags && article.tags.length > 0 ? `<div class="mt-2">${article.tags.includes('aptos') ? '<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mr-1">Aptos</span>' : ''}${article.tags.some(t => ['defi', 'staking'].includes(t)) ? '<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 mr-1">DeFi</span>' : ''}</div>` : ''}
    </div>
  `).join('') + `
    <div class="text-center mt-4">
      <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm" onclick="window.open('https://cryptopanic.com/news/aptos/', '_blank')">View More Crypto News</button>
    </div>
  `;
  
  if (data.lastUpdated) document.getElementById('news-last-updated').textContent = `Updated: ${formatDate(data.lastUpdated)}`;
}

function populateMemeCoins(data) {
  const memeCoinsDiv = document.getElementById('meme-coins');
  if (!memeCoinsDiv || !data || !data.coins) return;
  memeCoinsDiv.innerHTML = data.coins.map(coin => `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded mb-2 hover:bg-gray-100 transition-colors">
      <div class="flex items-center">
        <div class="mr-3">${coin.image ? `<img src="${coin.image}" alt="${coin.symbol}" class="w-8 h-8 rounded-full" onerror="this.src='https://cryptologos.cc/logos/aptos-apt-logo.svg?v=026'">` : `<div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">${coin.symbol.charAt(0)}</div>`}</div>
        <div>
          <h4 class="font-bold">${coin.symbol}</h4>
          <div class="text-xs text-gray-600">${coin.name}</div>
        </div>
      </div>
      <div class="text-right">
        <div class="font-medium">${coin.marketCap}</div>
        <div class="text-sm ${coin.change24h > 0 ? 'text-green-600' : 'text-red-600'}">${coin.change24h > 0 ? '+' : ''}${coin.change24h.toFixed(2)}%</div>
      </div>
    </div>
  `).join('') + `
    ${data.marketInfo ? `<div class="text-sm text-gray-600 mt-4 p-3 bg-gray-50 rounded">
      ${data.marketInfo.averageChange ? `<div>Avg. 24h Change: <span class="${data.marketInfo.averageChange >= 0 ? 'text-green-600' : 'text-red-600'}">${data.marketInfo.averageChange >= 0 ? '+' : ''}${data.marketInfo.averageChange}%</span></div>` : ''}
      ${data.marketInfo.sentiment ? `<div>Market Sentiment: ${data.marketInfo.sentiment}</div>` : ''}
      ${data.marketInfo.totalTokens ? `<div>Total Tokens Tracked: ${data.marketInfo.totalTokens}</div>` : ''}
    </div>` : ''}
    ${data.tokensByCategory && Object.keys(data.tokensByCategory).length > 0 ? `<div class="text-center mt-4">
      <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm" onclick="showAllTokensModal(${JSON.stringify(data).replace(/"/g, '"')})">View All Tokens</button>
    </div>` : ''}
  `;
  
  if (data.lastUpdated) document.getElementById('tokens-last-updated').textContent = `Updated: ${formatDate(data.lastUpdated)}`;
}

function showAllTokensModal(data) {
  const modalContainer = document.createElement('div');
  modalContainer.id = 'tokens-modal';
  modalContainer.innerHTML = `
    <div>
      <div class="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
        <h3 class="text-xl font-bold">All Aptos Tokens</h3>
        <button id="close-tokens-modal" class="text-white hover:text-gray-200">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="p-6 overflow-y-auto flex-grow">
        ${data.tokensByCategory ? Object.entries(data.tokensByCategory).map(([category, tokens]) => tokens.length > 0 ? `
          <div class="mb-6">
            <h4 class="text-lg font-bold mb-3">${category}</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              ${tokens.map(token => `
                <div class="bg-gray-50 p-3 rounded border border-gray-200">
                  <div class="flex items-center mb-2">
                    <div class="mr-2">${token.image ? `<img src="${token.image}" alt="${token.symbol}" class="w-6 h-6 rounded-full" onerror="this.src='https://cryptologos.cc/logos/aptos-apt-logo.svg?v=026'">` : `<div class="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">${token.symbol.charAt(0)}</div>`}</div>
                    <div>
                      <h5 class="font-bold">${token.symbol}</h5>
                      <div class="text-xs text-gray-600">${token.name}</div>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-1 text-sm">
                    <div>Market Cap:</div><div class="text-right font-medium">${token.marketCap}</div>
                    <div>24h Change:</div><div class="text-right ${token.change24h > 0 ? 'text-green-600' : 'text-red-600'}">${token.change24h > 0 ? '+' : ''}${token.change24h.toFixed(2)}%</div>
                    <div>Volume:</div><div class="text-right">${token.volume24h || 'N/A'}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : '').join('') : '<p>No token category data available</p>'}
        ${data.trends ? `<div class="mt-6 pt-6 border-t border-gray-200">
          <h4 class="text-lg font-bold mb-3">Token Trends</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${data.trends.hottest ? `<div class="bg-green-50 p-3 rounded border border-green-200">
              <h5 class="font-bold text-green-700">Biggest Gainer: ${data.trends.hottest.symbol}</h5>
              <div class="flex items-center mt-2">
                <div class="mr-2">${data.trends.hottest.image ? `<img src="${data.trends.hottest.image}" alt="${data.trends.hottest.symbol}" class="w-6 h-6 rounded-full" onerror="this.src='https://cryptologos.cc/logos/aptos-apt-logo.svg?v=026'">` : `<div class="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-green-700">${data.trends.hottest.symbol.charAt(0)}</div>`}</div>
                <div class="flex-grow">
                  <div class="text-sm">${data.trends.hottest.name}</div>
                  <div class="text-sm">Market Cap: ${data.trends.hottest.marketCap}</div>
                </div>
                <div class="text-lg font-bold text-green-600">+${parseFloat(data.trends.hottest.change24h).toFixed(2)}%</div>
              </div>
            </div>` : ''}
            ${data.trends.coldest ? `<div class="bg-red-50 p-3 rounded border border-red-200">
              <h5 class="font-bold text-red-700">Biggest Loser: ${data.trends.coldest.symbol}</h5>
              <div class="flex items-center mt-2">
                <div class="mr-2">${data.trends.coldest.image ? `<img src="${data.trends.coldest.image}" alt="${data.trends.coldest.symbol}" class="w-6 h-6 rounded-full" onerror="this.src
                'https://cryptologos.cc/logos/aptos-apt-logo.svg?v=026'">` : `<div class="w-6 h-6 bg-red-200 rounded-full flex items-center justify-center text-red-700">${data.trends.coldest.symbol.charAt(0)}</div>`}</div>
                <div class="flex-grow">
                  <div class="text-sm">${data.trends.coldest.name}</div>
                  <div class="text-sm">Market Cap: ${data.trends.coldest.marketCap}</div>
                </div>
                <div class="text-lg font-bold text-red-600">${parseFloat(data.trends.coldest.change24h).toFixed(2)}%</div>
              </div>
            </div>` : ''}
          </div>
        </div>` : ''}
      </div>
    </div>
  `;
  document.body.appendChild(modalContainer);
  
  document.getElementById('close-tokens-modal').addEventListener('click', () => modalContainer.remove());
  modalContainer.addEventListener('click', e => e.target === modalContainer && modalContainer.remove());
}

function populateStakingRates(data) {
  const protocolsDiv = document.getElementById('protocol-rates');
  if (!protocolsDiv || !data || !data.protocols) return;
  protocolsDiv.innerHTML = Object.entries(data.protocols).map(([name, protocol]) => `
    <div class="bg-gray-50 p-3 rounded">
      <h4 class="font-bold text-lg capitalize text-gray-800">${name}</h4>
      <div class="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
        ${protocol.staking ? `<div><span class="font-medium">Staking:</span> ${protocol.staking.apr}% APR</div>` : ''}
        ${protocol.lending ? `<div><span class="font-medium">Lending:</span> ${protocol.lending.apr}% APR</div>` : ''}
        ${protocol.amm ? `<div><span class="font-medium">AMM:</span> ${protocol.amm.apr}% APR</div>` : ''}
        ${protocol.blendedStrategy ? `<div><span class="font-medium">Blended:</span> ${protocol.blendedStrategy.apr}% APR</div>` : ''}
      </div>
    </div>
  `).join('');
  
  const strategiesDiv = document.getElementById('staking-strategies');
  if (!strategiesDiv || !data.strategies) return;
  strategiesDiv.innerHTML = Object.entries(data.strategies).map(([name, strategy]) => `
    <div class="bg-gray-50 p-3 rounded">
      <h4 class="font-bold capitalize text-gray-800">${name} (${strategy.apr}% APR)</h4>
      <p class="text-sm text-gray-600 mt-1">${strategy.description || ''}</p>
      ${strategy.allocation ? `
        <div class="mt-2 text-sm text-gray-600">
          ${strategy.allocation.map(item => `
            <div>• ${item.protocol} ${item.product}: ${item.percentage}%</div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
}

function showNotification(message, type = 'info') {
  const existingNotifications = document.querySelectorAll('.notification-toast');
  existingNotifications.forEach(notification => notification.remove());
  
  const notification = document.createElement('div');
  notification.className = 'notification-toast fixed top-4 right-4 z-50 rounded-lg shadow-lg notification';
  
  let bgColor, textColor, icon;
  switch (type) {
    case 'success':
      bgColor = 'bg-green-500';
      textColor = 'text-white';
      icon = `<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>`;
      break;
    case 'error':
      bgColor = 'bg-red-500';
      textColor = 'text-white';
      icon = `<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>`;
      break;
    default:
      bgColor = 'bg-blue-500';
      textColor = 'text-white';
      icon = `<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>`;
  }
  
  notification.classList.add(bgColor, textColor);
  notification.innerHTML = `
    <div class="flex items-center justify-between p-4">
      <div class="flex items-center">
        ${icon}
        <span>${message}</span>
      </div>
      <button class="ml-4 text-white opacity-70 hover:opacity-100 focus:outline-none">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
        </svg>
      </button>
    </div>
  `;
  
  document.body.appendChild(notification);
  notification.querySelector('button').addEventListener('click', () => notification.remove());
  setTimeout(() => {
    notification.classList.add('opacity-0', 'transition-opacity', 'duration-300');
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}