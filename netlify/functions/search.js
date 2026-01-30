import axios from 'axios';
import * as cheerio from 'cheerio';

// Groq API configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Stopwords
const STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
    'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
    'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you',
    'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where',
    'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'not', 'only', 'same', 'so', 'than', 'too',
    'very', 'just', 'as', 'if', 'because', 'there', 'then', 'now', 'here'
]);

// Website list
const WEBSITES = [
    'https://en.wikipedia.org/wiki/Main_Page',
    'https://www.reddit.com/',
    'https://news.ycombinator.com/',
    'https://www.bbc.com/',
    'https://www.nytimes.com/',
    'https://www.theguardian.com/',
    'https://www.cnn.com/',
    'https://www.reuters.com/',
    'https://www.aljazeera.com/',
    'https://www.forbes.com/',
    'https://www.bloomberg.com/',
    'https://apnews.com/',
    'https://www.npr.org/',
    'https://www.pbs.org/',
    'https://time.com/',
    'https://www.economist.com/',
    'https://www.scientificamerican.com/',
    'https://www.nationalgeographic.com/',
    'https://www.britannica.com/',
    'https://curlie.org/',
    'https://news.google.com/',
    'https://www.bbc.com/news',
    'https://www.foxnews.com/',
    'https://www.msnbc.com/',
    'https://abcnews.go.com/',
    'https://www.cbsnews.com/',
    'https://www.dw.com/en/top-stories/s-9097',
    'https://www.france24.com/en/',
    'https://www.nbcnews.com/',
    'https://www.washingtonpost.com/',
    'https://www.wsj.com/',
    'https://techcrunch.com/',
    'https://www.theverge.com/',
    'https://arstechnica.com/',
    'https://www.wired.com/',
    'https://www.nature.com/',
    'https://www.science.org/',
    'https://www.newscientist.com/',
    'https://spectrum.ieee.org/',
    'https://www.technologyreview.com/',
    'https://www.zdnet.com/',
    'https://www.cnet.com/',
    'https://www.tomshardware.com/',
    'https://phys.org/',
    'https://www.space.com/',
    'https://www.nasa.gov/',
    'https://www.sciencedaily.com/',
    'https://www.livescience.com/',
    'https://hackaday.com/',
    'https://www.reddit.com/r/all',
    'https://stackoverflow.com/',
    'https://medium.com/',
    'https://dev.to/',
    'https://www.quora.com/',
    'https://www.producthunt.com/',
    'https://www.lesswrong.com/',
    'https://www.metafilter.com/',
    'https://slashdot.org/',
    'https://www.digg.com/',
    'https://forums.macrumors.com/',
    'https://www.avsforum.com/',
    'https://www.reddit.com/r/science',
    'https://www.reddit.com/r/technology',
    'https://blog.google/',
    'https://aws.amazon.com/blogs/',
    'https://opensource.com/',
    'https://www.khanacademy.org/',
    'https://www.coursera.org/',
    'https://www.edx.org/',
    'https://www.merriam-webster.com/',
    'https://www.ted.com/',
    'https://ocw.mit.edu/',
    'https://www.libretexts.org/',
    'https://www.gutenberg.org/',
    'https://archive.org/',
    'https://www.pubmed.ncbi.nlm.nih.gov/',
    'https://arxiv.org/',
    'https://www.nationalgeographic.com/education',
    'https://www.bbc.co.uk/bitesize',
    'https://www.duolingo.com/',
    'https://www.instructables.com/',
    'https://howstuffworks.com/'
];

function extractKeywords(query) {
    query = query.toLowerCase().replace(/^(who\s+is|what\s+is|where\s+is|when\s+is|why\s+is|how\s+is|tell\s+me|find|search|looking\s+for)\s+/, '');
    const words = query.match(/\b\w+\b/g) || [];
    const keywords = words.filter(word => !STOPWORDS.has(word) && word.length > 2);
    return keywords.length > 0 ? keywords : words;
}

async function fetchAndSearch(url, keywords) {
    try {
        const response = await axios.get(url, {
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            validateStatus: () => true
        });

        if (response.status !== 200) return null;

        const $ = cheerio.load(response.data);
        $('script, style').remove();
        
        let text = $.text();
        text = text.replace(/\s+/g, ' ').trim();
        
        const title = $('title').text() || url;
        const textLower = text.toLowerCase();
        
        let matchCount = 0;
        let matchedKeywords = [];
        
        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            const regex = new RegExp(keywordLower, 'g');
            const matches = textLower.match(regex);
            if (matches) {
                matchCount += matches.length;
                matchedKeywords.push(keyword);
            }
        }
        
        if (matchCount > 0 && matchedKeywords.length > 0) {
            const firstKeyword = matchedKeywords[0].toLowerCase();
            const index = textLower.indexOf(firstKeyword);
            const start = Math.max(0, index - 75);
            const end = Math.min(text.length, index + 225);
            let snippet = text.substring(start, end);
            
            snippet = snippet.replace(/\s+/g, ' ').trim();
            if (snippet.length > 150) {
                snippet = snippet.substring(0, 150) + '...';
            }
            
            return {
                title: title.substring(0, 100),
                url: url,
                snippet: snippet,
                relevance: matchCount,
                matched_keywords: matchedKeywords.length
            };
        }
        
        return null;
    } catch (err) {
        return null;
    }
}

async function searchWikipedia(keywords) {
    try {
        const searchQuery = keywords.join(' ');
        const response = await axios.get('https://en.wikipedia.org/w/api.php', {
            params: {
                action: 'query',
                list: 'search',
                srsearch: searchQuery,
                format: 'json',
                srlimit: 1
            },
            timeout: 5000
        });
        
        const results = response.data.query?.search || [];
        if (results.length > 0) {
            const result = results[0];
            let snippet = result.snippet.replace(/<span class="searchmatch">|<\/span>/g, '');
            snippet = snippet.replace(/<[^>]+>/g, '');
            
            if (snippet.length > 150) {
                snippet = snippet.substring(0, 150) + '...';
            }
            
            const wikiUrl = `https://en.wikipedia.org/wiki/${result.title.replace(/ /g, '_')}`;
            
            return {
                title: `Wikipedia: ${result.title}`,
                url: wikiUrl,
                snippet: snippet,
                relevance: keywords.length,
                matched_keywords: keywords.length
            };
        }
    } catch (err) {
        // Silent fail
    }
    
    return null;
}

async function rankResultsWithAI(query, results) {
    if (results.length === 0 || !GROQ_API_KEY) {
        return { results, summary: '', explanations: {} };
    }
    
    let resultsText = 'Search Results:\n';
    for (let i = 0; i < Math.min(10, results.length); i++) {
        resultsText += `${i + 1}. Title: ${results[i].title}\n   Snippet: ${results[i].snippet}\n\n`;
    }
    
    const prompt = `You are an expert at ranking search results by relevance and quality. 
    
User Query: "${query}"

${resultsText}

Rank these results by relevance. Return ONLY valid JSON:
{
    "ranked_order": [0, 1, 2, ...],
    "summary": "2-3 sentence summary of the best results"
}`;
    
    try {
        const response = await axios.post(GROQ_API_URL, {
            model: 'mixtral-8x7b-32768',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            temperature: 0.5
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        
        if (response.status === 200) {
            const rankingJson = response.data.choices[0].message.content;
            const rankingData = JSON.parse(rankingJson);
            const rankedIndices = rankingData.ranked_order || [];
            
            const rankedResults = [];
            for (const idx of rankedIndices) {
                if (idx >= 0 && idx < results.length) {
                    rankedResults.push(results[idx]);
                }
            }
            
            for (let i = 0; i < results.length; i++) {
                if (!rankedIndices.includes(i)) {
                    rankedResults.push(results[i]);
                }
            }
            
            return {
                results: rankedResults,
                summary: rankingData.summary || '',
                explanations: {}
            };
        }
    } catch (err) {
        console.error('AI Ranking error:', err.message);
    }
    
    return { results, summary: '', explanations: {} };
}

exports.handler = async (event) => {
    // Handle CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    const query = (event.queryStringParameters?.q || '').trim();

    if (!query || query.length < 2) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                error: 'Query too short',
                results: []
            })
        };
    }

    try {
        const keywords = extractKeywords(query);
        let results = [];

        // Search Wikipedia
        const wikiResult = await searchWikipedia(keywords);
        if (wikiResult) {
            results.push(wikiResult);
        }

        // Fetch all websites in parallel
        const searchPromises = WEBSITES.map(url => fetchAndSearch(url, keywords));
        const searchResults = await Promise.all(searchPromises);

        for (const result of searchResults) {
            if (result) {
                results.push(result);
            }
        }

        // Sort by basic relevance
        results.sort((a, b) => (b.matched_keywords - a.matched_keywords) || (b.relevance - a.relevance));

        // Use AI to rank
        const ranking = await rankResultsWithAI(query, results.slice(0, 15));
        const rankedResults = ranking.results;
        const summary = ranking.summary;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                query: query,
                keywords: keywords,
                results: rankedResults.slice(0, 20),
                count: Math.min(20, rankedResults.length),
                ai_summary: summary
            })
        };
    } catch (err) {
        console.error('Search error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Search failed',
                message: err.message
            })
        };
    }
};
