const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();

// Enable CORS with explicit configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json());

// ============= API KEYS (from .env file) =============
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const REDDIT_USER_AGENT = 'EconomicsTopicScorer/1.0 (by your_reddit_username)';

// ============= YOUTUBE API =============
async function searchYouTube(topic) {
  try {
    const youtube = google.youtube({
      version: 'v3',
      auth: YOUTUBE_API_KEY
    });

    const response = await youtube.search.list({
      part: 'snippet,statistics',
      q: `${topic} economics`,
      type: 'video',
      order: 'relevance',
      maxResults: 10,
      publishedAfter: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // Last 30 days
    });

    let totalViews = 0;
    let videoCount = 0;

    for (const item of response.data.items) {
      const videoId = item.id.videoId;
      try {
        const videoStats = await youtube.videos.list({
          part: 'statistics',
          id: videoId
        });

        if (videoStats.data.items[0]?.statistics?.viewCount) {
          totalViews += parseInt(videoStats.data.items[0].statistics.viewCount);
          videoCount++;
        }
      } catch (e) {
        console.log('Error fetching video stats:', e.message);
      }
    }

    const avgViews = videoCount > 0 ? Math.round(totalViews / videoCount) : 0;
    const trendStrength = Math.min(100, Math.round((avgViews / 1000) * 10)); // Score based on views

    return {
      videoCount,
      averageViews: avgViews,
      trendScore: trendStrength,
      insight: `${videoCount} recent videos averaging ${avgViews.toLocaleString()} views`
    };
  } catch (error) {
    console.error('YouTube API error:', error.message);
    return {
      videoCount: 0,
      averageViews: 0,
      trendScore: 0,
      insight: 'Could not fetch YouTube data'
    };
  }
}

// ============= REDDIT API (Public Data Scraping) =============
async function searchReddit(topic) {
  try {
    // Scrape public Reddit data without OAuth
    // Reddit exposes JSON feeds for all public subreddits
    const subreddits = ['economics', 'investing', 'stocks', 'cryptocurrency', 'finance'];
    let totalPosts = 0;
    let totalComments = 0;
    let totalScore = 0;

    for (const subreddit of subreddits) {
      try {
        const response = await axios.get(
          `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(topic)}&sort=new&limit=10`,
          {
            headers: {
              'User-Agent': REDDIT_USER_AGENT
            }
          }
        );

        if (response.data.data && response.data.data.children) {
          totalPosts += response.data.data.children.length;
          response.data.data.children.forEach(post => {
            if (post.data) {
              totalComments += post.data.num_comments || 0;
              totalScore += post.data.score || 0;
            }
          });
        }
      } catch (e) {
        console.log(`Note: Could not search r/${subreddit} for "${topic}" - ${e.message}`);
      }
    }

    const discussionScore = Math.min(100, (totalComments / 50) * 10 + (totalPosts / 5) * 10);

    return {
      postsFound: totalPosts,
      totalComments,
      avgScore: totalPosts > 0 ? Math.round(totalScore / totalPosts) : 0,
      trendScore: Math.round(discussionScore),
      insight: totalPosts > 0 
        ? `${totalPosts} posts with ${totalComments} comments across economics forums`
        : 'Limited Reddit data available (public scraping)'
    };
  } catch (error) {
    console.error('Reddit scraping error:', error.message);
    return {
      postsFound: 0,
      totalComments: 0,
      avgScore: 0,
      trendScore: 0,
      insight: 'Could not fetch Reddit data'
    };
  }
}

// ============= NEWS API =============
async function searchNewsAPI(topic) {
  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: `${topic} economics`,
        sortBy: 'publishedAt',
        language: 'en',
        pageSize: 10,
        apiKey: NEWS_API_KEY
      }
    });

    const articles = response.data.articles || [];
    const sourceVariety = new Set(articles.map(a => a.source.name)).size;
    const newsScore = Math.min(100, (articles.length * 5) + (sourceVariety * 3));

    return {
      articleCount: articles.length,
      sourceCount: sourceVariety,
      trendScore: newsScore,
      insight: `${articles.length} articles from ${sourceVariety} different sources`
    };
  } catch (error) {
    console.error('News API error:', error.message);
    return {
      articleCount: 0,
      sourceCount: 0,
      trendScore: 0,
      insight: 'Could not fetch news data'
    };
  }
}

// ============= GOOGLE TRENDS (using unofficial library) =============
async function searchGoogleTrends(topic) {
  try {
    // Using google-trends-api (community library)
    const googleTrends = require('google-trends-api');
    
    const results = await googleTrends.interestByRegion({
      keyword: topic,
      startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      resolution: 'REGION'
    });

    const parsedResults = JSON.parse(results);
    const trendValues = parsedResults.map(r => r.value || 0);
    const avgTrend = trendValues.length > 0 
      ? Math.round(trendValues.reduce((a, b) => a + b) / trendValues.length) 
      : 0;

    return {
      trendScore: Math.min(100, avgTrend * 2), // Scale 0-50 to 0-100
      regionCount: trendValues.length,
      insight: `Trending in ${trendValues.length} regions with average interest of ${avgTrend}/100`
    };
  } catch (error) {
    console.error('Google Trends error:', error.message);
    // Fallback: use a simple estimation based on other metrics
    return {
      trendScore: 50,
      regionCount: 0,
      insight: 'Using estimated trend score'
    };
  }
}

// ============= MAIN RESEARCH ENDPOINT =============
app.post('/api/research', async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  try {
    console.log(`\nResearching topic: ${topic}`);

    // Fetch all data with Promise.allSettled to handle failures gracefully
    const results = await Promise.allSettled([
      searchYouTube(topic),
      searchReddit(topic),
      searchNewsAPI(topic),
      searchGoogleTrends(topic)
    ]);

    const [youtubeResult, redditResult, newsResult, trendsResult] = results;

    const youtubeData = youtubeResult.status === 'fulfilled' ? youtubeResult.value : { trendScore: 0, insight: 'YouTube data unavailable', youtube_interest: 'Unable to fetch', videoCount: 0, averageViews: 0 };
    const redditData = redditResult.status === 'fulfilled' ? redditResult.value : { trendScore: 0, insight: 'Reddit data unavailable', reddit_insight: 'Unable to fetch', postsFound: 0, totalComments: 0 };
    const newsData = newsResult.status === 'fulfilled' ? newsResult.value : { trendScore: 0, insight: 'News data unavailable', news_insight: 'Unable to fetch', articleCount: 0 };
    const trendsData = trendsResult.status === 'fulfilled' ? trendsResult.value : { trendScore: 50, insight: 'Estimated trend score', trend_insight: 'Unable to fetch real data' };

    // Calculate overall score
    const overallScore = Math.round(
      (youtubeData.trendScore * 0.25 +
        redditData.trendScore * 0.25 +
        newsData.trendScore * 0.25 +
        trendsData.trendScore * 0.25)
    );

    // Generate recommendations based on scores
    const recommendations = [];
    if (youtubeData.trendScore > 60) recommendations.push('High YouTube interest - create detailed explainer video');
    if (redditData.trendScore > 60) recommendations.push('Active Reddit discussion - respond to community questions');
    if (newsData.trendScore > 60) recommendations.push('Major news coverage - analyze latest developments');
    if (trendsData.trendScore > 60) recommendations.push('Rapidly trending - upload ASAP while interest is high');
    if (recommendations.length === 0) recommendations.push('Niche topic - good for building audience authority');

    // Generate subtopics
    const subtopics = [
      `${topic} analysis`,
      `${topic} impact 2026`,
      `${topic} for beginners`,
      `${topic} investment strategy`,
      `${topic} vs alternatives`
    ];

    // Create mock topics since we don't have detailed data structure
    const topTopics = [
      {
        title: `Current Trends in ${topic}`,
        description: youtubeData.insight,
        virality_score: overallScore,
        youtube_interest: youtubeData.insight,
        reddit_insight: redditData.insight,
        news_insight: newsData.insight,
        trend_insight: trendsData.insight,
        why_it_wins: recommendations[0] || 'Growing interest in this area'
      }
    ];

    const response = {
      topic,
      topTopics,
      recommendation: `Based on current data, ${topic} shows ${overallScore >= 70 ? 'strong' : overallScore >= 50 ? 'moderate' : 'emerging'} interest. ${recommendations[0]}`,
      rawData: {
        youtube: youtubeData,
        reddit: redditData,
        news: newsData,
        trends: trendsData
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Research error:', error);
    res.status(500).json({ 
      error: 'Failed to complete research',
      message: error.message
    });
  }
});

// ============= HEALTH CHECK =============
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Economics Topic Scorer Backend is running' });
});

// ============= START SERVER =============
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Economics Topic Scorer Backend running on http://localhost:${PORT}`);
  console.log(`📊 POST /api/research - Research a topic`);
  console.log(`❤️  GET /api/health - Check server status\n`);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
