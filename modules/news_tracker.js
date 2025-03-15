// modules/news_tracker.js
const axios = require('axios');

/**
 * Fetch latest crypto news with a focus on Aptos
 * @returns {Promise<Object>} News data formatted for the dashboard
 */
async function getLatestNews() {
  try {
    // First attempt to get Aptos-specific news
    const aptosNews = await fetchAptosSpecificNews();
    
    // If we have sufficient Aptos news, return those
    if (aptosNews.articles?.length >= 5) {
      console.log(`Retrieved ${aptosNews.articles.length} Aptos-specific news items`);
      return aptosNews;
    }
    
    // Otherwise, fetch general crypto news
    console.log('Insufficient Aptos news, fetching general crypto news');
    const generalNews = await fetchGeneralCryptoNews();
    
    // Merge both news sources with Aptos news at the top
    const combinedArticles = [
      ...(aptosNews.articles || []),
      ...(generalNews.articles || [])
    ].slice(0, 10); // Limit to 10 articles
    
    return {
      articles: combinedArticles,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error fetching news:", error.message);
    // Return fallback news if everything fails
    return generateFallbackNews();
  }
}

/**
 * Fetch Aptos-specific news from CryptoPanic
 * @returns {Promise<Object>} Aptos news
 */
async function fetchAptosSpecificNews() {
  try {
    const response = await axios.get('https://cryptopanic.com/api/v1/posts/', {
      params: {
        auth_token: process.env.CRYPTOPANIC_API_KEY, // Use API key if available
        public: true,
        kind: 'news',
        currencies: 'aptos',
        filter: 'hot'
      },
      timeout: 5000
    });
    
    if (!response.data?.results) throw new Error("Invalid CryptoPanic API response");
    
    console.log(`Retrieved ${response.data.results.length} Aptos news items from CryptoPanic`);
    const newsArticles = processNewsItems(response.data.results);
    
    return formatNewsData(newsArticles, true);
  } catch (error) {
    console.error("Error fetching Aptos-specific news:", error.message);
    return { articles: [], lastUpdated: new Date().toISOString() };
  }
}

/**
 * Fetch general crypto news from CryptoPanic
 * @returns {Promise<Object>} General crypto news
 */
async function fetchGeneralCryptoNews() {
  try {
    const response = await axios.get('https://cryptopanic.com/api/v1/posts/', {
      params: {
        auth_token: process.env.CRYPTOPANIC_API_KEY, // Use API key if available
        public: true,
        kind: 'news',
        filter: 'hot'
      },
      timeout: 5000
    });
    
    if (!response.data?.results) throw new Error("Invalid CryptoPanic API response");
    
    console.log(`Retrieved ${response.data.results.length} general news items from CryptoPanic`);
    const newsArticles = processNewsItems(response.data.results);
    
    return formatNewsData(newsArticles, false);
  } catch (error) {
    console.error("Error fetching general crypto news:", error.message);
    return { articles: [], lastUpdated: new Date().toISOString() };
  }
}

/**
 * Process raw news items from CryptoPanic API
 * @param {Array} results - Raw results from API
 * @returns {Array} Processed news articles
 */
function processNewsItems(results) {
  return results.map(item => {
    // Extract currency tags
    const currencies = (item.currencies || []).map(c => c.code.toLowerCase());
    
    // Check if it's Aptos-related
    const isAptosRelated = 
      currencies.includes('apt') || 
      currencies.includes('aptos') ||
      (item.title && item.title.toLowerCase().includes('aptos')) ||
      (item.domain && item.domain.toLowerCase().includes('aptos'));
    
    // Format the article
    return {
      date: new Date(item.created_at).toISOString(),
      headline: item.title,
      source: item.source?.title || item.domain || 'Unknown',
      summary: item.currencies?.length > 0 
        ? `Affects: ${item.currencies.map(c => c.code).join(', ')}` 
        : (item.domain || 'Crypto news'),
      relevance: isAptosRelated ? "high" : item.votes?.negative > item.votes?.positive ? "medium" : "normal",
      tags: [
        ...(currencies),
        ...(isAptosRelated ? ['aptos'] : []),
        ...(item.title?.toLowerCase().includes('defi') ? ['defi'] : []),
        ...(item.title?.toLowerCase().includes('staking') ? ['staking'] : [])
      ],
      url: item.url,
      isAptosRelated
    };
  });
}

/**
 * Format news data for dashboard display
 * @param {Array} newsArticles - Processed news articles
 * @param {boolean} isAptosSpecific - Whether this is Aptos-specific news
 * @returns {Object} Formatted news data
 */
function formatNewsData(newsArticles, isAptosSpecific) {
  // Sort articles by date (newest first) and filter out duplicates
  const seen = new Set();
  const uniqueArticles = newsArticles.filter(article => {
    const duplicate = seen.has(article.headline);
    seen.add(article.headline);
    return !duplicate;
  });
  
  const sortedArticles = uniqueArticles.sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );
  
  // If Aptos-specific, prioritize by relevance and Aptos relation
  const prioritizedArticles = isAptosSpecific 
    ? sortedArticles.sort((a, b) => {
        if (a.isAptosRelated && !b.isAptosRelated) return -1;
        if (!a.isAptosRelated && b.isAptosRelated) return 1;
        return 0;
      })
    : sortedArticles;
  
  // Limit to 10 articles
  const finalArticles = prioritizedArticles.slice(0, 10);
  
  return {
    articles: finalArticles,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Generate fallback news if API calls fail
 * @returns {Object} Fallback news data
 */
function generateFallbackNews() {
  const currentDate = new Date().toISOString();
  
  return {
    articles: [
      {
        date: currentDate,
        headline: "Aptos DeFi Ecosystem Continues to Grow in 2025",
        source: "Crypto News",
        summary: "DeFi ecosystem on Aptos attracts more developers and users",
        relevance: "high",
        tags: ["aptos", "defi", "adoption"],
        isAptosRelated: true
      },
      {
        date: currentDate,
        headline: "Liquid Staking Products on Aptos Reach New ATH",
        source: "DeFi Insight",
        summary: "Amnis, Thala, and Tortuga see record TVL",
        relevance: "high",
        tags: ["aptos", "staking", "defi"],
        isAptosRelated: true
      },
      {
        date: currentDate,
        headline: "APT Price Analysis: Technical and On-Chain Indicators",
        source: "Market Analysis",
        summary: "Aptos price movement analysis and predictions",
        relevance: "medium",
        tags: ["aptos", "market", "analysis"],
        isAptosRelated: true
      },
      {
        date: currentDate,
        headline: "New Yield Farming Opportunities Emerge on Aptos",
        source: "DeFi Prime",
        summary: "Latest yield strategies for Aptos holders",
        relevance: "high",
        tags: ["aptos", "yield", "farming"],
        isAptosRelated: true
      },
      {
        date: currentDate,
        headline: "Staking vs. Lending: What's Best for Your APT",
        source: "Crypto Education",
        summary: "Comparing risk-adjusted returns across strategies",
        relevance: "medium",
        tags: ["aptos", "staking", "lending"],
        isAptosRelated: true
      }
    ],
    lastUpdated: currentDate,
    isFallback: true
  };
}

module.exports = { getLatestNews };