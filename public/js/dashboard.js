// dashboard.js - Enhanced with proper header navigation and interactions
if (typeof axios === 'undefined') console.error('Axios not loaded');

document.addEventListener('DOMContentLoaded', function() {
  // Initialize all UI components
  initializeHeader();
  initializeMarketData();
  setupNavigationTabs();
  setupDarkModeToggle();
  
  // Set up event listeners for search and wallet
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) searchBtn.addEventListener('click', searchWallet);
  
  const walletSearch = document.getElementById('wallet-search');
  if (walletSearch) walletSearch.addEventListener('keypress', e => e.key === 'Enter' && searchWallet());
  
  // Connect wallet button
  const connectWalletBtn = document.getElementById('connect-wallet-btn');
  if (connectWalletBtn) connectWalletBtn.addEventListener('click', connectWallet);
  
  // Auto-refresh data
  setupNewsAutoRefresh();
  setupTokenAutoRefresh();
  setupAiRecommendationForm();
  
  // Add section IDs to main sections for navigation
  addSectionIds();
  
  // Apply progressive loading animations to all sections
  applyProgressiveLoading();
});

/**
 * Initialize header functionality
 */
function initializeHeader() {
  // Initialize navigation tabs
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach(tab => {
    tab.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Update active tab
      navTabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // Get target section
      const targetSection = this.getAttribute('data-section');
      const targetElement = document.getElementById(targetSection);
      
      // Scroll to section
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
        
        // Update URL without reloading
        const url = new URL(window.location);
        url.searchParams.set('section', targetSection);
        window.history.pushState({}, '', url);
        
        // Store active section in user preferences
        updateUserPreferences({ activeSection: targetSection });
      }
    });
  });
  
  // Add scroll detection for active section highlighting
  setupScrollDetection();
}

/**
 * Connect wallet functionality
 */
async function connectWallet() {
  const connectWalletBtn = document.getElementById('connect-wallet-btn');
  if (!connectWalletBtn) return;
  
  try {
    // Show connecting state
    const originalHtml = connectWalletBtn.innerHTML;
    connectWalletBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Connecting...
    `;
    
    // Check if Petra wallet is available
    if (window.petra) {
      try {
        const response = await window.petra.connect();
        const address = response.address;
        
        // Update button to show connected state
        connectWalletBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="hidden md:inline">${address.substring(0, 6)}...${address.substring(address.length - 4)}</span>
        `;
        
        // Add a connected class for styling
        connectWalletBtn.classList.add('connected', 'connected-wallet');
        connectWalletBtn.classList.remove('bg-white/10', 'hover:bg-white/20');
        
        // Automatically search for the connected wallet
        document.getElementById('wallet-search').value = address;
        searchWallet();
        
        // Show notification
        showNotification('Wallet connected successfully!', 'success');
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        connectWalletBtn.innerHTML = originalHtml;
        showNotification('Failed to connect wallet: ' + error.message, 'error');
      }
    } else {
      connectWalletBtn.innerHTML = originalHtml;
      showNotification('Petra wallet not found. Please install Petra extension.', 'error');
    }
  } catch (error) {
    console.error('Wallet connection error:', error);
    showNotification('Wallet connection error', 'error');
  }
}

/**
 * Set up dark mode toggle functionality
 */
function setupDarkModeToggle() {
  const darkModeToggle = document.querySelector('a[href="#"][class*="block px-4 py-2 text-sm text-gray-700"]:first-child');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Toggle dark mode class on html element
      document.documentElement.classList.toggle('dark');
      
      // Update user preferences
      const isDarkMode = document.documentElement.classList.contains('dark');
      updateUserPreferences({ theme: isDarkMode ? 'dark' : 'light' });
      
      // Show notification
      showNotification(`${isDarkMode ? 'Dark' : 'Light'} mode activated`, 'success');
    });
    
    // Check URL params or localStorage for initial dark mode setting
    const urlParams = new URLSearchParams(window.location.search);
    const prefersDark = urlParams.get('theme') === 'dark' || 
                       localStorage.getItem('theme') === 'dark' ||
                       window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }
  }
}

/**
 * Setup navigation tabs 
 */
function setupNavigationTabs() {
  // Get the active section from URL or default to market-overview
  const urlParams = new URLSearchParams(window.location.search);
  const activeSection = urlParams.get('section') || 'market-overview';
  
  // Update active tab
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach(tab => {
    if (tab.getAttribute('data-section') === activeSection) {
      tab.classList.add('active');
      
      // Scroll to section if specified in URL
      const targetElement = document.getElementById(activeSection);
      if (targetElement) {
        // Small delay to ensure the DOM is fully loaded
        setTimeout(() => {
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      }
    } else {
      tab.classList.remove('active');
    }
  });
}

/**
 * Setup scroll detection to highlight active section
 */
function setupScrollDetection() {
  // Define sections to track
  const sections = [
    'market-overview',
    'protocol-comparison',
    'wallet-analysis',
    'ai-recommendation',
    'news-feed'
  ];
  
  // Add section highlight class to each section
  sections.forEach(sectionId => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.classList.add('section-highlight');
    }
  });
  
  // Update active tab on scroll
  window.addEventListener('scroll', function() {
    // Throttle scroll events
    if (!window.scrollTimeout) {
      window.scrollTimeout = setTimeout(function() {
        // Find current section in viewport
        let currentSection = null;
        let smallestDistance = Infinity;
        
        sections.forEach(sectionId => {
          const element = document.getElementById(sectionId);
          if (element) {
            const rect = element.getBoundingClientRect();
            const distance = Math.abs(rect.top - 120); // 120px offset for header
            
            if (distance < smallestDistance) {
              smallestDistance = distance;
              currentSection = sectionId;
            }
          }
        });
        
        // Update active tab
        if (currentSection) {
          const navTabs = document.querySelectorAll('.nav-tab');
          navTabs.forEach(tab => {
            if (tab.getAttribute('data-section') === currentSection) {
              tab.classList.add('active');
            } else {
              tab.classList.remove('active');
            }
          });
          
          // Update URL without reloading
          const url = new URL(window.location);
          url.searchParams.set('section', currentSection);
          window.history.pushState({}, '', url);
        }
        
        window.scrollTimeout = null;
      }, 100);
    }
  });
}

/**
 * Update user preferences via API
 * @param {Object} preferences - User preferences to update
 */
function updateUserPreferences(preferences) {
  // Store preferences in localStorage for now
  Object.entries(preferences).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
  
  // Optional: Send to server API
  axios.post('/api/user/preferences', preferences)
    .catch(error => console.error('Failed to save preferences:', error));
}

/**
 * Add section IDs to main content sections if they don't exist
 */
function addSectionIds() {
  // Map of section titles to IDs
  const sectionMappings = [
    { title: "General Market Strategy", id: "market-overview" },
    { title: "Protocol Comparison", id: "protocol-comparison" },
    { title: "Wallet Analysis", id: "wallet-analysis" },
    { title: "AI-Powered Investment Strategy", id: "ai-recommendation" },
    { title: "Latest News", id: "news-feed" }
  ];
  
  // Find sections by their h2 titles and add IDs
  const sections = document.querySelectorAll('section');
  sections.forEach(section => {
    const heading = section.querySelector('h2');
    if (heading) {
      const title = heading.textContent.trim();
      const mapping = sectionMappings.find(m => title.includes(m.title));
      
      if (mapping && !section.id) {
        section.id = mapping.id;
      }
    }
  });
}

/**
 * Apply progressive loading animations to sections
 */
function applyProgressiveLoading() {
  // Add the progressive-load class to all main sections
  const sections = document.querySelectorAll('section');
  sections.forEach((section, index) => {
    section.classList.add('progressive-load');
    
    // Create IntersectionObserver to detect when section enters viewport
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Add loaded class with staggered delay based on section index
          setTimeout(() => {
            section.classList.add('loaded');
          }, 100 * index);
          
          // Disconnect observer after loading
          observer.disconnect();
        }
      });
    }, { threshold: 0.1 });
    
    observer.observe(section);
  });
}

// Function to populate the crypto ticker banner
function populateCryptoTicker(data) {
  const tickerContainer = document.getElementById('crypto-ticker');
  if (!tickerContainer || !data || !data.coins) return;
  
  let tickerHtml = '';
  
  // First add all tokens to the ticker
  data.coins.forEach(coin => {
    tickerHtml += `
      <div class="ticker-item">
        <div class="mr-2">${coin.image ? 
          `<img src="${coin.image}" alt="${coin.symbol}" class="ticker-image" onerror="this.src='https://cryptologos.cc/logos/aptos-apt-logo.svg?v=026'">` : 
          `<div class="ticker-image bg-blue-800 flex items-center justify-center">${coin.symbol.charAt(0)}</div>`}
        </div>
        <span class="ticker-symbol">${coin.symbol}</span>
        <span class="ticker-price">${typeof coin.price === 'number' ? '$' + coin.price.toFixed(2) : coin.marketCap}</span>
        <span class="ticker-change ${coin.change24h > 0 ? 'ticker-positive' : 'ticker-negative'}">
          ${coin.change24h > 0 ? '+' : ''}${typeof coin.change24h === 'number' ? coin.change24h.toFixed(2) : coin.change24h}%
        </span>
      </div>
    `;
  });
  
  // Then duplicate them to ensure smooth infinite animation
  tickerContainer.innerHTML = tickerHtml + tickerHtml;
  
  // Update last updated time if available
  if (data.lastUpdated && document.getElementById('ticker-last-updated')) {
    document.getElementById('ticker-last-updated').textContent = `Updated: ${formatDate(data.lastUpdated)}`;
  }
  
  // Add market sentiment indicator if available
  if (data.marketInfo && data.marketInfo.sentiment) {
    const sentimentClass = 
      data.marketInfo.sentiment === "Bullish" ? "ticker-positive" : 
      data.marketInfo.sentiment === "Bearish" ? "ticker-negative" : "";
    
    // First remove any existing sentiment indicator
    const existingSentiment = document.querySelector('.ticker-sentiment');
    if (existingSentiment) existingSentiment.remove();
    
    // Add new sentiment indicator
    const tickerWrapper = tickerContainer.parentElement;
    if (tickerWrapper) {
      const sentimentElement = document.createElement('div');
      sentimentElement.className = `ticker-sentiment ${sentimentClass} absolute right-0 top-0 bg-gray-800 px-3 py-1 z-10`;
      sentimentElement.innerHTML = `Market: <span class="font-bold">${data.marketInfo.sentiment}</span>`;
      tickerWrapper.appendChild(sentimentElement);
    }
  }
}

// Function to refresh the ticker data
function refreshTicker() {
  axios.get('/api/tokens/latest')
    .then(response => {
      populateCryptoTicker(response.data);
    })
    .catch(error => {
      console.error('Failed to refresh ticker:', error);
    });
}

// Initialize market data
function initializeMarketData() {
  console.log("Initializing market data");
  const stakingData = window.stakingData || {
    protocols: {}, 
    strategies: {},
    recommendedProtocol: "amnis"
  };
  const newsData = window.newsData || {
    articles: [], 
    lastUpdated: new Date().toISOString()
  };
  const memeCoinsData = window.memeCoinsData || {
    coins: [], 
    lastUpdated: new Date().toISOString()
  };
  
  // Try to populate UI elements, but don't fail if data is missing
  try {
    if (typeof populateStakingRates === 'function') {
      populateStakingRates(stakingData);
    }
    
    if (typeof populateMemeCoins === 'function') {
      populateMemeCoins(memeCoinsData);
    }
    
    if (typeof populateCryptoTicker === 'function') {
      populateCryptoTicker(memeCoinsData);
    }
    
    if (typeof populateNews === 'function') {
      populateNews(newsData);
    }
  } catch (error) {
    console.error('Error initializing UI components:', error);
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const walletAddress = urlParams.get('wallet');
  if (walletAddress) {
    document.getElementById('wallet-search').value = walletAddress;
    searchWallet();
  }
  
  // Add ticker refresh if you want to automatically update it
  setInterval(() => {
    try {
      refreshTicker();
    } catch (err) {
      console.error('Error refreshing ticker:', err);
    }
  }, 3 * 60 * 1000); // Refresh ticker every 3 minutes
  
  // Check app status
  checkAppStatus();
}

/**
 * Check application status for services availability
 */
function checkAppStatus() {
  axios.get('/api/status')
    .then(response => {
      const status = response.data;
      
      // Update version display if available
      const versionDisplay = document.querySelector('.app-version');
      if (versionDisplay && status.version) {
        versionDisplay.textContent = `v${status.version}`;
      }
      
      // Show notification if any service is unavailable
      const unavailableServices = Object.entries(status.services || {})
        .filter(([_, status]) => status !== 'available')
        .map(([name]) => name);
      
      if (unavailableServices.length > 0) {
        showNotification(`Some services are currently unavailable: ${unavailableServices.join(', ')}`, 'error');
      }
    })
    .catch(error => {
      console.error('Error checking app status:', error);
    });
}

function searchWallet() {
  const address = document.getElementById('wallet-search').value.trim();
  if (!address || !address.startsWith('0x') || address.length !== 66) {
    showNotification('Invalid wallet address', 'error');
    return;
  }
  
  // Update active tab to wallet analysis
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach(tab => {
    if (tab.getAttribute('data-section') === 'wallet-analysis') {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  const walletSection = document.getElementById('wallet-analysis');
  walletSection.classList.remove('hidden');
  
  document.getElementById('wallet-loading').classList.remove('hidden');
  document.getElementById('wallet-content').classList.add('hidden');
  walletSection.scrollIntoView({ behavior: 'smooth' });
  
  // Show loading state on connect wallet button
  const connectWalletBtn = document.getElementById('connect-wallet-btn');
  if (connectWalletBtn && !connectWalletBtn.classList.contains('connected')) {
    const originalHtml = connectWalletBtn.innerHTML;
    connectWalletBtn.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="hidden md:inline">Loading...</span>
    `;
  }
  
  axios.get(`/api/wallet/${address}`)
    .then(response => {
      document.getElementById('wallet-loading').classList.add('hidden');
      document.getElementById('wallet-content').classList.remove('hidden');
      populateWalletData(response.data);
      
      // Update URL without reloading
      const url = new URL(window.location);
      url.searchParams.set('wallet', address);
      url.searchParams.set('section', 'wallet-analysis');
      window.history.pushState({}, '', url);
      
      // Update connect wallet button
      if (connectWalletBtn && !connectWalletBtn.classList.contains('connected')) {
        connectWalletBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="hidden md:inline">${address.substring(0, 6)}...${address.substring(address.length - 4)}</span>
        `;
        connectWalletBtn.classList.add('connected', 'connected-wallet');
        connectWalletBtn.classList.remove('bg-white/10', 'hover:bg-white/20');
      }
      
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
      
      // Reset connect wallet button
      if (connectWalletBtn && !connectWalletBtn.classList.contains('connected')) {
        connectWalletBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span class="hidden md:inline">Connect Wallet</span>
        `;
      }
      
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
    
    // Highlight the AI recommendation tab
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
      if (tab.getAttribute('data-section') === 'ai-recommendation') {
        tab.classList.add('pulse-slow'); // Add pulsing effect to draw attention
      }
    });
  }
}

function populatePortfolioSummary(portfolio) {
  const summaryDiv = document.getElementById('portfolio-summary');
  if (!summaryDiv || !portfolio) {
    console.error('Portfolio summary element not found or no portfolio data');
    return;
  }
  
  // Apply enhanced card styles
  summaryDiv.classList.add('data-card');
  
  summaryDiv.innerHTML = `
    <div class="bg-blue-50 p-3 rounded border border-blue-200 mb-3">
      <div class="text-md font-bold text-gray-800">Total Value</div>
      <div class="text-xl text-blue-700 font-semibold">$${portfolio.totalValueUSD.toFixed(2)}</div>
    </div>
    <div class="space-y-2">
      ${portfolio.apt ? `
        <div class="flex justify-between items-center p-2 hover:bg-blue-50 rounded transition-colors">
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
        <div class="flex justify-between items-center p-2 hover:bg-green-50 rounded transition-colors">
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
        <div class="flex justify-between items-center p-2 hover:bg-green-50 rounded transition-colors">
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
        <div class="flex justify-between items-center p-2 hover:bg-purple-50 rounded transition-colors">
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
        '#10B981', // Green for stAPT
        '#8B5CF6', // Purple for sthAPT
        '#F59E0B', // Amber for AMM
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
    type: 'doughnut', // Changed from pie to doughnut for more modern look
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%', // Doughnut hole size
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
        animateScale: true,
        animateRotate: true,
        duration: 800 // Slightly longer animation for better effect
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
  
  // Generate more realistic PnL data for demo
  const pnlData = transactions.length > 0 ? 
    transactions.map((_, i) => {
      // Create a trend with some randomness
      const trend = i * 15; // Upward trend
      const volatility = (Math.random() - 0.5) * 80; // Random variance
      return trend + volatility;
    }) : 
    Array.from({ length: days }, (_, i) => {
      // More realistic market simulation for demo
      const baseValue = 50; // Starting point
      const trend = i * 10; // Overall trend
      const volatility = (Math.random() - 0.5) * 60; // Day-to-day volatility
      return baseValue + trend + volatility;
    });

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
        pointRadius: 3,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 1.5,
        pointHoverRadius: 5
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
            callback: value => `$${value.toFixed(0)}`
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
        duration: 1000,
        easing: 'easeOutQuart'
      }
    }
  });
}

function populateStakingRecommendations(recommendations) {
  const recommendationsDiv = document.getElementById('staking-recommendations');
  if (!recommendationsDiv || !recommendations) return;
  
  recommendationsDiv.innerHTML = `
    <div class="bg-gray-100 p-3 rounded shadow-inner">
      <div class="font-medium text-gray-800">Your Risk Profile</div>
      <div class="flex items-center justify-between">
        <div class="text-lg font-bold capitalize text-gray-900">${recommendations.riskProfile}</div>
        <span class="strategy-risk risk-${recommendations.riskProfile === 'conservative' ? 'low' : recommendations.riskProfile === 'balanced' ? 'medium' : 'high'}">
          ${recommendations.riskProfile === 'conservative' ? 'Low Risk' : recommendations.riskProfile === 'balanced' ? 'Medium Risk' : 'High Risk'}
        </span>
      </div>
    </div>
    ${recommendations.recommendedStrategy ? `
    <div class="bg-green-50 p-3 rounded border border-green-100 mt-3 shadow-sm hover:shadow-md transition-shadow">
      <div class="font-medium text-gray-800">Recommended Strategy</div>
      <div class="text-lg font-bold text-green-700">${recommendations.recommendedStrategy.apr}% APR</div>
      ${recommendations.recommendedStrategy.allocation ? `
      <div class="mt-2 space-y-1">
        ${recommendations.recommendedStrategy.allocation.map(item => `
        <div class="flex justify-between items-center bg-white bg-opacity-60 p-2 rounded">
          <div class="text-sm capitalize">
            <span class="font-medium">${item.protocol}</span> 
            <span class="text-gray-600">${item.product}</span>
          </div>
          <div class="flex items-center">
            <div class="bg-blue-100 text-blue-800 text-xs font-medium rounded-full px-2 py-0.5 mr-2">${item.percentage}%</div>
            <div class="text-green-600 font-semibold">${item.expectedApr || item.apr || ''}%</div>
          </div>
        </div>
        `).join('')}
      </div>` : ''}
    </div>` : ''}
    ${recommendations.potentialEarnings ? `
    <div class="bg-blue-50 p-3 rounded border border-blue-100 mt-3 shadow-sm hover:shadow-md transition-shadow">
      <div class="font-medium text-gray-800">Potential Earnings</div>
      <div class="grid grid-cols-2 gap-2 mt-1">
        <div class="bg-white bg-opacity-60 p-2 rounded">
          <div class="text-sm text-gray-600">Monthly</div>
          <div class="text-lg font-bold text-blue-700">$${recommendations.potentialEarnings.monthly}</div>
        </div>
        <div class="bg-white bg-opacity-60 p-2 rounded">
          <div class="text-sm text-gray-600">Yearly</div>
          <div class="text-lg font-bold text-blue-700">$${recommendations.potentialEarnings.yearly}</div>
        </div>
      </div>
    </div>` : ''}
    
    ${recommendations.alternativeStrategies ? `
    <div class="mt-3">
      <div class="font-medium text-gray-800 mb-2">Alternative Strategies</div>
      <div class="space-y-2">
        ${recommendations.alternativeStrategies.map(strategy => `
        <div class="bg-gray-50 p-2 rounded border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer">
          <div class="flex justify-between items-center">
            <span class="font-medium">${strategy.name}</span>
            <span class="text-blue-600 font-bold">${strategy.apr}% APR</span>
          </div>
          <div class="text-xs text-gray-600 mt-1">${strategy.description || ''}</div>
        </div>
        `).join('')}
      </div>
    </div>` : ''}
  `;
}

function populateActionItems(actionItems) {
  const actionItemsDiv = document.getElementById('action-items');
  if (!actionItemsDiv || !actionItems || !actionItems.length) return;
  
  actionItemsDiv.innerHTML = actionItems.map((item, index) => `
    <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow data-card">
      <div class="flex items-center mb-2">
        <span class="flex items-center justify-center bg-blue-100 text-blue-800 rounded-full w-6 h-6 text-sm font-bold mr-2">${index + 1}</span>
        <h4 class="font-bold text-gray-800">${item.action}</h4>
      </div>
      <p class="text-sm text-gray-600">${item.details}</p>
      ${item.contractAddress ? `
      <div class="mt-3 pt-2 border-t border-gray-100">
        <div class="flex justify-between">
          <button class="text-xs text-blue-600 hover:text-blue-800" onclick="viewContractDetails('${item.contractAddress}', '${item.functionName}')">
            View Contract
          </button>
          ${item.protocol && item.amount ? `
          <button class="text-xs text-green-600 hover:text-green-800 font-medium" onclick="executeOperation('${item.protocol}', '${item.type}', ${item.amount}, '${item.contractAddress}', '${item.functionName}')">
            Execute
          </button>
          ` : ''}
        </div>
      </div>
      ` : ''}
    </div>
  `).join('');
  
  // Add event listeners for action items
  actionItemsDiv.querySelectorAll('button').forEach(button => {
    button.classList.add('btn-xs', 'underline', 'hover:no-underline');
  });
}

// Function to view contract details
function viewContractDetails(contractAddress, functionName) {
  window.open(`https://explorer.aptoslabs.com/account/${contractAddress}?network=mainnet`, '_blank');
}

// Function to execute an operation via agent
function executeOperation(protocol, type, amount, contractAddress, functionName) {
  const walletAddress = document.getElementById('wallet-search').value;
  if (!walletAddress) {
    showNotification('Please connect your wallet first', 'error');
    return;
  }
  
  showNotification(`Preparing to execute ${type} operation on ${protocol}...`, 'info');
  
  // Prepare operation data
  const operation = {
    protocol,
    type,
    amount,
    contractAddress,
    functionName,
    args: []
  };
  
  // Show confirmation modal
  showConfirmationModal(walletAddress, operation);
}

// Show confirmation modal for operation execution
function showConfirmationModal(walletAddress, operation, operations, totalAmount, allocation) {
  // Use the single operation if provided, otherwise use array
  const operationsToExecute = operations || [operation];
  const totalAmountToExecute = totalAmount || (operation ? operation.amount : 0);
  
  // Create modal container
  const modalContainer = document.createElement('div');
  modalContainer.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm';
  modalContainer.id = 'confirmation-modal';
  
  // Create modal content
  modalContainer.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl overflow-hidden max-w-md w-full transform transition-all animate-fade-in-up">
      <div class="bg-blue-600 px-4 py-3 flex justify-between items-center">
        <h3 class="text-lg font-bold text-white">Confirm Transaction</h3>
        <button id="close-modal" class="text-white hover:text-gray-200">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="p-4">
        <p class="mb-4">You are about to execute the following operation${operationsToExecute.length > 1 ? 's' : ''}:</p>
        <div class="bg-gray-50 p-3 rounded mb-4 max-h-60 overflow-y-auto">
          ${operationsToExecute.length > 1 ? `
            <div class="mb-2 pb-2 border-b border-gray-200">
              <div class="text-sm font-semibold">Total Transaction Value:</div>
              <div class="text-lg font-bold text-blue-600">${totalAmountToExecute} APT</div>
            </div>
            ${operationsToExecute.map((op, index) => `
              <div class="grid grid-cols-2 gap-2 text-sm mb-2 pb-2 ${index < operationsToExecute.length - 1 ? 'border-b border-gray-200' : ''}">
                <div class="text-gray-600">Protocol:</div>
                <div class="font-semibold text-gray-900 capitalize">${op.protocol}</div>
                
                <div class="text-gray-600">Operation:</div>
                <div class="font-semibold text-gray-900 capitalize">${op.type}</div>
                
                <div class="text-gray-600">Amount:</div>
                <div class="font-semibold text-gray-900">${op.amount} APT</div>
              </div>
            `).join('')}
          ` : `
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div class="text-gray-600">Protocol:</div>
              <div class="font-semibold text-gray-900 capitalize">${operation.protocol}</div>
              
              <div class="text-gray-600">Operation:</div>
              <div class="font-semibold text-gray-900 capitalize">${operation.type}</div>
              
              <div class="text-gray-600">Amount:</div>
              <div class="font-semibold text-gray-900">${operation.amount} APT</div>
              
              <div class="text-gray-600">Value:</div>
              <div class="font-semibold text-gray-900">$${(operation.amount * 12.50).toFixed(2)}</div>
            </div>
          `}
        </div>
        <div class="flex items-center mb-4 p-2 bg-yellow-50 rounded text-yellow-800 text-sm">
          <svg class="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <span>This transaction will be executed on-chain using your connected wallet.</span>
        </div>
        <div class="flex justify-end gap-3">
          <button id="cancel-operation" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 font-medium transition-colors">
            Cancel
          </button>
          <button id="confirm-operation" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium transition-colors flex items-center">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Confirm
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Add to document
  document.body.appendChild(modalContainer);
  
  // Add event listeners
  document.getElementById('close-modal').addEventListener('click', () => modalContainer.remove());
  document.getElementById('cancel-operation').addEventListener('click', () => modalContainer.remove());
  document.getElementById('confirm-operation').addEventListener('click', () => {
    // Update button state
    const confirmButton = document.getElementById('confirm-operation');
    confirmButton.disabled = true;
    confirmButton.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Processing...
    `;
    
    // Execute operation via API
    axios.post('/api/execute-strategy', {
      walletAddress: walletAddress,
      amount: totalAmountToExecute || operation.amount,
      allocation: allocation || [
        {
          protocol: operation.protocol,
          percentage: 100,
          amount: operation.amount
        }
      ],
      operations: operationsToExecute
    })
    .then(response => {
      modalContainer.remove();
      showNotification(`Transaction executed successfully!`, 'success');
      console.log('Operation result:', response.data);
      
      // If successful, update UI
      if (response.data.successfulOperations > 0) {
        // Refresh wallet data after 2 seconds to show changes
        setTimeout(() => {
          searchWallet();
        }, 2000);
      }
    })
    .catch(error => {
      console.error('Error executing operation:', error);
      confirmButton.disabled = false;
      confirmButton.innerHTML = `
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Retry
      `;
      
      // Show error in modal
      const errorMessage = error.response?.data?.error || error.message;
      document.querySelector('#confirmation-modal .p-4').insertAdjacentHTML('afterbegin', `
        <div class="bg-red-50 p-3 rounded mb-4 text-red-800">
          <p class="font-medium">Error: ${errorMessage}</p>
          <p class="text-sm mt-1">Please try again or contact support if the issue persists.</p>
        </div>
      `);
      
      showNotification(`Failed to execute transaction: ${errorMessage}`, 'error');
    });
  });
}

function populateTransactionHistory(transactions) {
  const tableBody = document.getElementById('transactions-table');
  if (!tableBody || !transactions || !transactions.length) {
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">No recent transactions found</td></tr>`;
    return;
  }
  
  tableBody.innerHTML = transactions.map(tx => `
    <tr class="hover:bg-gray-50 transition-colors">
      <td class="px-6 py-4 whitespace-nowrap">
        <a href="https://explorer.aptoslabs.com/txn/${tx.hash}" target="_blank" class="text-blue-600 hover:underline">
          ${tx.hash.substring(0, 10)}...${tx.hash.substring(tx.hash.length - 6)}
        </a>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">${tx.type || 'Transaction'}</td>
      <td class="px-6 py-4 whitespace-nowrap">${formatDate(tx.timestamp)}</td>
      <td class="px-6 py-4 whitespace-nowrap ${tx.success ? 'text-green-600' : 'text-red-600'} font-medium">
        <span class="inline-flex items-center">
          ${tx.success ? 
            `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>` : 
            `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>`
          }
          ${tx.success ? 'Success' : 'Failed'}
        </span>
      </td>
    </tr>
  `).join('');
}

function setupNewsAutoRefresh() {
  const NEWS_REFRESH_INTERVAL = 5 * 60 * 1000;
  
  async function refreshNews() {
    const newsDiv = document.getElementById('crypto-news');
    if (!newsDiv) return;

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
    if (!tokenDiv) return;

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
  
  // Add animation classes for entrance effect
  aiResultsDiv.classList.add('animate-fade-in-up');
  
  // Check for UI enhancement metadata
  const uiData = recommendation.ui || {
    lastUpdated: new Date().toISOString(),
    animationDelay: 300,
    chartColors: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'],
    visualizationType: 'donut'
  };
  
  aiResultsDiv.innerHTML = `
    <div class="bg-white rounded-lg shadow-md overflow-hidden data-card">
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
        <h3 class="text-xl font-bold">${recommendation.title || 'AI Investment Recommendation'}</h3>
        <div class="text-xs text-blue-100">Updated: ${formatDate(uiData.lastUpdated)}</div>
      </div>
      <div class="p-6">
        <div class="mb-6 bg-blue-50 p-4 rounded">
          <h4 class="text-lg font-semibold mb-2 section-title">Summary</h4>
          <p class="text-gray-700">${recommendation.summary || 'No summary provided'}</p>
        </div>
        
        <!-- Recommendation Chart & Allocation -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div class="md:col-span-1">
            <h4 class="text-lg font-semibold mb-4 section-title">Allocation</h4>
            <div id="recommendation-chart" class="h-64 relative">
              <!-- Chart will be inserted here -->
            </div>
          </div>
          <div class="md:col-span-2">
            <div class="flex justify-between items-center mb-3">
              <h4 class="text-lg font-semibold section-title">Recommended Strategy</h4>
              <div class="bg-blue-100 text-blue-800 font-bold py-1 px-3 rounded-full text-xl">
                ${recommendation.totalApr}% APR
              </div>
            </div>
            <div class="overflow-x-auto bg-gray-50 p-2 rounded-lg">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-100">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protocol</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allocation</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected APR</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  ${recommendation.allocation && recommendation.allocation.length > 0 ? recommendation.allocation.map((item, index) => `
                    <tr class="hover:bg-gray-50 transition-colors">
                      <td class="px-4 py-3 whitespace-nowrap font-medium">${item.protocol}</td>
                      <td class="px-4 py-3 whitespace-nowrap">${item.product}</td>
                      <td class="px-4 py-3 whitespace-nowrap">
                        <div class="flex items-center">
                          <div class="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                            <div class="h-2.5 rounded-full" style="width: ${item.percentage}%; background-color: ${uiData.chartColors[index % uiData.chartColors.length]}"></div>
                          </div>
                          <span>${item.percentage}%</span>
                        </div>
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap text-blue-600 font-semibold">${item.expectedApr}%</td>
                    </tr>
                  `).join('') : '<tr><td colspan="4" class="px-4 py-3 text-center text-gray-500">No allocation data</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <!-- Implementation Steps & Risks -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
            <h4 class="text-lg font-semibold mb-3 section-title">Implementation Steps</h4>
            <ol class="list-decimal pl-5 space-y-2 ml-2">
              ${recommendation.steps && recommendation.steps.length > 0 ? recommendation.steps.map(step => `
                <li class="text-gray-700 pb-2">${step}</li>
              `).join('') : '<li class="text-gray-500">No steps provided</li>'}
            </ol>
            
            ${recommendation.agentCapabilities && recommendation.agentCapabilities.canExecuteTransactions ? `
            <div class="mt-4 pt-3 border-t border-gray-200">
              <button id="execute-strategy-btn" class="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded flex items-center justify-center transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Execute Strategy with Agent
              </button>
              <p class="text-xs text-gray-500 mt-2 text-center">The strategy will be executed automatically using the Move Agent Kit</p>
            </div>
            ` : ''}
          </div>
          <div>
            <div class="bg-gray-50 p-4 rounded-lg shadow-sm mb-4">
              <h4 class="text-lg font-semibold mb-2 section-title">Potential Risks</h4>
              <ul class="list-disc pl-5 space-y-1 ml-2">
                ${recommendation.risks && recommendation.risks.length > 0 ? recommendation.risks.map(risk => `
                  <li class="text-gray-700">${risk}</li>
                `).join('') : '<li class="text-gray-500">No risks specified</li>'}
              </ul>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg shadow-sm">
              <h4 class="text-lg font-semibold mb-2 section-title">Risk Mitigation</h4>
              <ul class="list-disc pl-5 space-y-1 ml-2">
                ${recommendation.mitigations && recommendation.mitigations.length > 0 ? recommendation.mitigations.map(mitigation => `
                  <li class="text-gray-700">${mitigation}</li>
                `).join('') : '<li class="text-gray-500">No mitigations provided</li>'}
              </ul>
            </div>
          </div>
        </div>
        
        <!-- Additional Notes -->
        <div class="mt-4">
          <h4 class="text-lg font-semibold mb-2 section-title">Additional Notes</h4>
          <div class="bg-yellow-50 p-4 rounded shadow-sm text-gray-700">
            ${recommendation.additionalNotes || 'No additional notes'}
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add event listener for execute strategy button
  const executeBtn = document.getElementById('execute-strategy-btn');
  if (executeBtn && recommendation.allocation) {
    executeBtn.addEventListener('click', () => {
      const walletAddress = document.getElementById('wallet-for-ai')?.value;
      const amount = document.getElementById('investment-amount')?.value;
      
      if (!walletAddress) {
        showNotification('Please connect your wallet first', 'error');
        return;
      }
      
      // Prepare operations from allocation
      const operations = (recommendation.agentCapabilities?.supportedOperations || []).map(op => ({
        protocol: op.protocol,
        type: op.type,
        amount: op.amount,
        contractAddress: op.contractAddress,
        functionName: op.functionName,
        args: op.args || []
      }));
      
      if (operations.length === 0) {
        showNotification('No supported operations found', 'error');
        return;
      }
      
      // Show confirmation modal for full strategy
      showConfirmationModal(walletAddress, null, operations, amount, recommendation.allocation);
    });
  }
  
  // Render allocation chart
  renderAllocationChart(recommendation, uiData);
}

/**
 * Render allocation pie chart for AI recommendation
 */
function renderAllocationChart(recommendation, uiData) {
  const chartContainer = document.getElementById('recommendation-chart');
  if (!chartContainer || !recommendation.allocation) return;
  
  // Create canvas element
  const canvas = document.createElement('canvas');
  chartContainer.appendChild(canvas);
  
  // Prepare chart data
  const data = {
    labels: recommendation.allocation.map(item => item.protocol),
    datasets: [{
      data: recommendation.allocation.map(item => item.percentage),
      backgroundColor: uiData.chartColors || ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'],
      borderWidth: 1,
      borderColor: '#FFFFFF'
    }]
  };
  
  // Create chart
  new Chart(canvas, {
    type: uiData.visualizationType || 'doughnut',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%', // For doughnut chart
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 11, family: 'Arial', weight: 'bold' },
            color: '#374151',
            padding: 5,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: '#1F2937',
          titleFont: { size: 12, family: 'Arial' },
          bodyFont: { size: 11, family: 'Arial' },
          callbacks: {
            label: (context) => {
              const alloc = recommendation.allocation[context.dataIndex];
              return `${alloc.protocol}: ${alloc.percentage}% (${alloc.expectedApr}% APR)`;
            }
          }
        }
      },
      animation: {
        animateScale: true,
        animateRotate: true,
        duration: 800
      }
    }
  });
}

function populateNews(data) {
  // Check if the news container exists
  const newsDiv = document.getElementById('crypto-news');
  if (!newsDiv) {
    console.error('News container (#crypto-news) not found in HTML');
    return;
  }

  // Check if data or articles are missing or empty
  if (!data || !Array.isArray(data.articles) || data.articles.length === 0) {
    newsDiv.innerHTML = '<p class="text-center text-gray-500">No news available at this time.</p>';
    return;
  }

  // Define tag colors for specific tags
  const tagColors = {
    aptos: 'bg-blue-100 text-blue-800',
    defi: 'bg-green-100 text-green-800',
    staking: 'bg-green-100 text-green-800',
    // Add more tags and colors as needed
  };

  // Generate HTML for news articles
  newsDiv.innerHTML = data.articles
    .map(article => `
      <div class="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
        ${
          article.image
            ? `<img src="${article.image}" alt="${article.headline || 'News Image'}" class="w-full h-32 object-cover rounded-md mb-2">`
            : ''
        }
        <h3 class="text-lg font-semibold mb-1">
          ${
            article.url
              ? `<a href="${article.url}" target="_blank" class="hover:text-blue-600 transition-colors">${article.headline || 'Untitled'}</a>`
              : article.headline || 'Untitled'
          }
        </h3>
        ${article.summary ? `<p class="text-sm text-gray-600 mb-2">${article.summary}</p>` : ''}
        <div class="flex justify-between items-center text-xs text-gray-500 mb-2">
          <span>${article.source || 'Unknown'}</span>
          <span>${formatDate(article.date)}</span>
        </div>
        ${
          article.tags && article.tags.length > 0
            ? `
              <div class="flex flex-wrap gap-1 mt-2">
                ${article.tags
                  .filter(tag => tagColors[tag])
                  .map(tag => `<span class="px-2 py-1 text-xs font-semibold rounded-full ${tagColors[tag]}">${tag}</span>`)
                  .join('')}
              </div>
            `
            : ''
        }
      </div>
    `)
    .join('') + `
      <div class="text-center mt-4">
        <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm" onclick="window.open('https://cryptopanic.com/news/aptos/', '_blank')">
          View More Crypto News
        </button>
      </div>
    `;

  // Update the last updated timestamp
  if (data.lastUpdated) {
    const lastUpdatedDiv = document.getElementById('news-last-updated');
    if (lastUpdatedDiv) {
      lastUpdatedDiv.textContent = `Updated: ${formatDate(data.lastUpdated)}`;
    }
  }
}

// Ensure formatDate is defined (include this if not already in your code)
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
      <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm" onclick="showAllTokensModal(${JSON.stringify(data).replace(/"/g, '\\"')})">View All Tokens</button>
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
                <div class="mr-2">${data.trends.coldest.image ? `<img src="${data.trends.coldest.image}" alt="${data.trends.coldest.symbol}" class="w-6 h-6 rounded-full" onerror="this.src='https://cryptologos.cc/logos/aptos-apt-logo.svg?v=026'">` : `<div class="w-6 h-6 bg-red-200 rounded-full flex items-center justify-center text-red-700">${data.trends.coldest.symbol.charAt(0)}</div>`}</div>
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

/**
 * Show a notification popup
 * @param {string} message - Message to display
 * @param {string} type - Type of notification (success, error, info)
 */
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

/**
 * Format a date string to a readable format
 * @param {string} dateString - Date string to format
 * @returns {string} - Formatted date string
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function populateStakingRates(data) {
  const protocolTableBody = document.getElementById('protocol-rates-table');
  const strategiesDiv = document.getElementById('staking-strategies');
  
  if (!protocolTableBody || !data) {
    console.log('Missing DOM elements or data for staking rates');
    return;
  }
  
  try {
    // Clear existing content
    protocolTableBody.innerHTML = '';
    
    // Use fallback data if no protocols available
    if (!data.protocols || Object.keys(data.protocols).length === 0) {
      data.protocols = {
        amnis: {
          staking: { apr: 8.5, product: "stAPT (Staking)" },
          lending: { apr: 8.0, product: "amAPT/stAPT (Lending)" },
          amm: { apr: 10.0, product: "amAPT/APT (AMM)" },
          blendedStrategy: { apr: 8.5 }
        },
        thala: {
          staking: { apr: 7.0, product: "sthAPT (Staking)" },
          lending: { apr: 6.5, product: "MOD CDP (Lending)" },
          blendedStrategy: { apr: 6.8 }
        },
        echo: {
          lending: { apr: 5.0, product: "Echo (Lending)" }
        },
        tortuga: {
          staking: { apr: 6.0, product: "tAPT (Staking)" }
        }
      };
    }
    
    // Add protocols to the table
    Object.entries(data.protocols)
      .sort(([a], [b]) => {
        // Sort by available services (more is better) then alphabetically
        const countServices = protocol => {
          let count = 0;
          if (protocol.staking) count++;
          if (protocol.lending) count++;
          if (protocol.amm) count++;
          if (protocol.blendedStrategy) count++;
          return count;
        };
        
        const countA = countServices(data.protocols[a]);
        const countB = countServices(data.protocols[b]);
        
        if (countB !== countA) return countB - countA;
        return a.localeCompare(b);
      })
      .forEach(([name, protocol]) => {
        // Create table row for each protocol
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        // Protocol name column with capitalized name
        row.innerHTML = `
          <td class="px-6 py-4 whitespace-nowrap border-r border-gray-200">
            <div class="flex items-center">
              <div class="text-lg font-medium text-gray-900 capitalize">${name}</div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-center border-r border-gray-200">
            ${protocol.staking ? 
              `<span class="px-2 py-1 inline-flex text-lg leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                ${protocol.staking.apr}%
               </span>
               <div class="text-xs text-gray-500 mt-1">${protocol.staking.product || ''}</div>` 
              : 
              '<span class="text-gray-400">—</span>'}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-center border-r border-gray-200">
            ${protocol.lending ? 
              `<span class="px-2 py-1 inline-flex text-lg leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                ${protocol.lending.apr}%
               </span>
               <div class="text-xs text-gray-500 mt-1">${protocol.lending.product || ''}</div>` 
              : 
              '<span class="text-gray-400">—</span>'}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-center border-r border-gray-200">
            ${protocol.amm ? 
              `<span class="px-2 py-1 inline-flex text-lg leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                ${protocol.amm.apr}%
               </span>
               <div class="text-xs text-gray-500 mt-1">${protocol.amm.product || ''}</div>` 
              : 
              '<span class="text-gray-400">—</span>'}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-center">
            ${protocol.blendedStrategy ? 
              `<span class="px-2 py-1 inline-flex text-lg leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                ${protocol.blendedStrategy.apr}%
               </span>` 
              : 
              '<span class="text-gray-400">—</span>'}
          </td>
        `;
        
        protocolTableBody.appendChild(row);
      });
    
    // Add fallback strategies if needed
    if (!data.strategies || Object.keys(data.strategies).length === 0) {
      data.strategies = {
        conservative: {
          allocation: [
            { protocol: "amnis", type: "staking", percentage: 70 },
            { protocol: "echo", type: "lending", percentage: 30 }
          ],
          description: "Low-risk approach focusing on staking and stable lending",
          apr: "6.75"
        },
        balanced: {
          allocation: [
            { protocol: "amnis", type: "staking", percentage: 40 },
            { protocol: "thala", type: "lending", percentage: 30 },
            { protocol: "amnis", type: "amm", percentage: 30 }
          ],
          description: "Balanced approach with staking, lending, and AMM",
          apr: "8.35"
        },
        aggressive: {
          allocation: [
            { protocol: "amnis", type: "staking", percentage: 20 },
            { protocol: "thala", type: "lending", percentage: 30 },
            { protocol: "amnis", type: "amm", percentage: 50 }
          ],
          description: "High-risk approach maximizing yield with AMM focus",
          apr: "8.85"
        }
      };
    }
    
    // If strategies div exists, populate it
    if (strategiesDiv) {
      strategiesDiv.innerHTML = '';
      
      Object.entries(data.strategies).forEach(([key, strategy]) => {
        const strategyCard = document.createElement('div');
        strategyCard.className = 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden';
        
        let headerClass = 'bg-gray-100';
        let riskBadge = '';
        
        if (key === 'conservative') {
          headerClass = 'bg-green-50 border-b border-green-100';
          riskBadge = '<span class="bg-green-100 text-green-800 text-xs font-medium rounded-full px-2 py-0.5">Low Risk</span>';
        } else if (key === 'balanced') {
          headerClass = 'bg-blue-50 border-b border-blue-100';
          riskBadge = '<span class="bg-blue-100 text-blue-800 text-xs font-medium rounded-full px-2 py-0.5">Medium Risk</span>';
        } else if (key === 'aggressive') {
          headerClass = 'bg-purple-50 border-b border-purple-100';
          riskBadge = '<span class="bg-purple-100 text-purple-800 text-xs font-medium rounded-full px-2 py-0.5">High Risk</span>';
        }
        
        strategyCard.innerHTML = `
          <div class="${headerClass} px-4 py-3 flex justify-between items-center">
            <div>
              <h3 class="text-md font-semibold capitalize">${key} Strategy</h3>
              <div class="text-xs text-gray-500">${strategy.description}</div>
            </div>
            <div class="text-lg font-bold text-blue-600">${strategy.apr}%</div>
          </div>
          <div class="px-4 py-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-gray-700">Risk Profile</span>
              ${riskBadge}
            </div>
            <div class="space-y-2">
              ${strategy.allocation.map(item => `
                <div class="flex justify-between items-center text-sm">
                  <span class="text-gray-600 capitalize">${item.protocol} ${item.type}</span>
                  <span class="font-medium">${item.percentage}%</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        
        strategiesDiv.appendChild(strategyCard);
      });
    }
  } catch (error) {
    console.error('Error populating staking rates:', error);
    
    // Show error message
    if (protocolTableBody) {
      protocolTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-4 text-center text-red-600">
            <div class="flex items-center justify-center">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Error loading protocol data. Using fallback values.
            </div>
          </td>
        </tr>
      `;
    }
  }
}