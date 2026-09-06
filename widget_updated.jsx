import React, { useState } from 'react';
import { Loader, TrendingUp, AlertCircle } from 'lucide-react';

export default function EconomicsTopicScorer() {
  const [topic, setTopic] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Change this to your backend URL
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

  const researchTopic = async () => {
    if (!topic.trim()) {
      setError('Please enter an economics topic');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(`Error: ${err.message}. Make sure the backend server is running at ${BACKEND_URL}`);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const ScoreBar = ({ score, label }) => (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold" style={{ color: getScoreColor(score) }}>
          {score}/100
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-300"
          style={{ width: `${score}%`, backgroundColor: getScoreColor(score) }}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            📊 Economics Topic Scorer
          </h1>
          <p className="text-gray-600">Direct YouTube, Reddit, News API & Google Trends research</p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Enter an Economics Topic
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && researchTopic()}
              placeholder="e.g., 'Inflation trends 2026', 'Cryptocurrency regulation', 'AI impact on jobs'"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={researchTopic}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              {loading ? <Loader className="animate-spin" size={20} /> : <TrendingUp size={20} />}
              {loading ? 'Researching...' : 'Research'}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Results Section */}
        {results && (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{results.topic}</h2>
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full" 
                     style={{ backgroundColor: `${getScoreColor(results.overallScore)}20`, 
                              borderWidth: '3px', 
                              borderColor: getScoreColor(results.overallScore) }}>
                  <span className="text-4xl font-bold" style={{ color: getScoreColor(results.overallScore) }}>
                    {results.overallScore}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-4 font-medium">VIRALITY SCORE</p>
              </div>

              <p className="text-gray-700 text-center mb-6 italic">{results.reasoning}</p>

              {/* Individual Scores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-bold text-red-900 mb-2">📹 YouTube API</h4>
                    <ScoreBar score={results.youtubeScore} label="Trend Score" />
                    <p className="text-sm text-gray-600">{results.youtubeInsight}</p>
                  </div>
                </div>
                <div>
                  <div className="mb-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <h4 className="font-bold text-orange-900 mb-2">🔗 Reddit API</h4>
                    <ScoreBar score={results.redditScore} label="Activity Score" />
                    <p className="text-sm text-gray-600">{results.redditInsight}</p>
                  </div>
                </div>
                <div>
                  <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-bold text-green-900 mb-2">📈 Google Trends</h4>
                    <ScoreBar score={results.trendScore} label="Trend Score" />
                    <p className="text-sm text-gray-600">{results.trendInsight}</p>
                  </div>
                </div>
                <div>
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-bold text-blue-900 mb-2">📰 News API</h4>
                    <ScoreBar score={results.newsScore} label="Coverage Score" />
                    <p className="text-sm text-gray-600">{results.newsInsight}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Subtopics */}
            {results.subtopics && results.subtopics.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Related Angles</h3>
                <div className="flex flex-wrap gap-2">
                  {results.subtopics.map((subtopic, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                      {subtopic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {results.recommendations && results.recommendations.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Video Ideas</h3>
                <ul className="space-y-3">
                  {results.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex gap-3">
                      <span className="text-blue-600 font-bold">✓</span>
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Raw Data */}
            {results.rawData && (
              <div className="bg-gray-50 rounded-lg shadow-lg p-6 text-xs">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Raw Data</h3>
                <pre className="bg-white p-3 rounded border border-gray-200 overflow-auto max-h-60">
                  {JSON.stringify(results.rawData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !results && !error && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <TrendingUp size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Enter a topic to see virality scores from YouTube, Reddit, News & Trends</p>
          </div>
        )}
      </div>
    </div>
  );
}