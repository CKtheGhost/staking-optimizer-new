// modules/news_tracker.js
const axios = require('axios');

async function getLatestNews() {
  try {
    const response = await axios.get('https://cryptopanic.com/api/v1/posts/?public=true&kind=news', {
      timeout: 5000
    });
    
    if (!response.data?.results) throw new Error("Invalid CryptoPanic API response");
    
    console.log(`Retrieved ${response.data.results.length} news items from CryptoPanic (public API)`);
    const newsArticles = response.data.results.map(item => ({
      date: new Date(item.created_at).toISOString().split('T')[0],
      headline: item.title,
      source: item.source.title,
      summary: item.currencies?.length > 0 ? `Affects: ${item.currencies.map(c => c.code).join(', ')}` : item.domain,
      relevance: item.votes.negative > item.votes.positive ? "medium" : "high",
      tags: (item.currencies || []).map(c => c.code.toLowerCase()),
      url: item.url
    }));
    
    return formatNewsData(newsArticles);
  } catch (error) {
    console.error("Error fetching crypto news from CryptoPanic (public API):", error.message);
    throw error;
  }
}

function formatNewsData(newsArticles) {
  const sortedArticles = [...newsArticles].sort((a, b) => new Date(b.date) - new Date(a.date));
  const finalArticles = sortedArticles.slice(0, 10); // Take top 10 articles, no Aptos filter
  
  return {
    articles: finalArticles,
    lastUpdated: new Date().toISOString()
  };
}

module.exports = { getLatestNews };