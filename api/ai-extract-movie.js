import { GoogleGenAI } from "@google/genai";

// Intelligent Fallback Regex & Heuristic Extractor in case AI key is rate-limited or unavailable
function fallbackExtractMovies(rawText, pageUrl = "") {
  const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
  
  // Extract images
  const imgRegex = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?/gi;
  const allImages = Array.from(new Set(rawText.match(imgRegex) || [])).filter(url => 
    !url.includes("avatar") && !url.includes("icon") && !url.includes("logo") && !url.includes("badge")
  );

  const poster = allImages[0] || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop";
  const screenshots = allImages.slice(1, 6);

  // Extract Title
  let title = "";
  for (const line of lines) {
    if (line.match(/\b(19\d\d|20\d\d)\b/) && line.length > 10 && line.length < 150) {
      title = line.replace(/^(Download|Watch)\s+/i, "").trim();
      break;
    }
  }
  if (!title && lines.length > 0) {
    title = lines.find(l => l.length > 5 && l.length < 100) || "Untitled Movie";
  }

  // Extract Year
  const yearMatch = (title + " " + rawText).match(/\b(20[0-2]\d|19\d\d)\b/);
  const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();

  // Extract Rating
  const ratingMatch = rawText.match(/(?:IMDb|Rating|⭐|★)[:\s]*([0-9](?:\.[0-9])?)/i);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 7.2;

  // Extract Categories
  const categoryKeywords = [
    "action", "comedy", "drama", "horror", "romance", "thriller", 
    "sci-fi", "animation", "adventure", "crime", "fantasy", "mystery"
  ];
  const detectedCategories = categoryKeywords.filter(cat => 
    new RegExp(`\\b${cat}\\b`, "i").test(rawText)
  );
  const categories = detectedCategories.length > 0 ? detectedCategories : ["action", "thriller"];

  // Extract Download Links
  const linkRegex = /https?:\/\/[^\s"'<>]+/gi;
  const allUrls = rawText.match(linkRegex) || [];
  const downloadCandidateUrls = allUrls.filter(u => 
    !u.match(/\.(jpg|jpeg|png|webp|svg|css|js)$/i) &&
    (u.includes("drive") || u.includes("hub") || u.includes("cloud") || u.includes("link") || u.includes("fast") || u.includes("download") || u.includes("file") || u.includes("mega"))
  );

  const qualities = ["480p", "720p", "1080p", "4k"];
  const links = [];

  for (const q of qualities) {
    const qRegex = new RegExp(`\\b${q}\\b[^\\n]{0,80}(https?:\\/\\/[^\\s"'<>]+)`, "i");
    const match = rawText.match(qRegex);
    
    // Find size near quality
    const sizeRegex = new RegExp(`\\b${q}\\b[^\\n]{0,50}?(\\d+(?:\\.\\d+)?\\s*(?:MB|GB))`, "i");
    const sizeMatch = rawText.match(sizeRegex);
    const size = sizeMatch ? sizeMatch[1].toUpperCase() : (q === "480p" ? "450MB" : q === "720p" ? "1.2GB" : q === "1080p" ? "2.6GB" : "6.5GB");

    if (match && match[1]) {
      links.push({ quality: q, size, url: match[1] });
    } else if (downloadCandidateUrls.length > links.length) {
      links.push({ quality: q, size, url: downloadCandidateUrls[links.length] });
    }
  }

  // If no links found, provide template links with current page or placeholder
  if (links.length === 0) {
    links.push({ quality: "480p", size: "450MB", url: pageUrl || "https://example.com/download/480p" });
    links.push({ quality: "720p", size: "1.2GB", url: pageUrl || "https://example.com/download/720p" });
    links.push({ quality: "1080p", size: "2.5GB", url: pageUrl || "https://example.com/download/1080p" });
  }

  // Description
  const descLines = lines.filter(l => 
    l.length > 40 && 
    !l.includes("http") && 
    !l.includes("480p") && 
    !l.includes("720p") && 
    !l.includes("1080p")
  );
  const description = descLines.slice(0, 3).join("\n\n") || `Watch & Download ${title} in Full HD Dual Audio on Sigma-flix 4US. High speed fast direct cloud download servers.`;

  const isSeries = /season|episode|s0\d|e0\d/i.test(title + " " + rawText);

  return [{
    title,
    year,
    rating,
    categories,
    image: poster,
    screenshots,
    description,
    links,
    isSeries,
    streamingUrl: links[0]?.url || ""
  }];
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = { text: body };
      }
    }

    const { url, text, bulk } = body || {};

    if (!url && !text) {
      return res.status(400).json({ error: "Please provide either a movie page 'url' or raw 'text' to extract." });
    }

    let rawContent = text || "";
    let pageUrl = url || "";

    // If a URL was provided, attempt to fetch the webpage content
    if (url) {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,hi;q=0.8"
          },
          signal: AbortSignal.timeout(12000)
        });

        if (response.ok) {
          const html = await response.text();
          // Extract text and images from HTML
          const textOnly = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
            .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
            // Preserve image src and link href
            .replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, "\n[IMAGE: $1]\n")
            .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, "\n[LINK: $1 TEXT: $2]\n")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          rawContent = textOnly.slice(0, 30000) + "\n\n" + (text || "");
        } else {
          console.warn(`URL fetch returned status ${response.status}`);
        }
      } catch (fetchErr) {
        console.warn("Could not fetch remote URL, relying on text input if provided:", fetchErr.message);
      }
    }

    if (!rawContent && !text) {
      return res.status(400).json({ 
        error: "Could not fetch content from that URL (it may have bot protection). Please copy and paste the page text directly into the AI Importer box!" 
      });
    }

    // Try Gemini AI first if API key is present
    let extractedMovies = null;
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            }
          }
        });

        const prompt = `You are an expert movie content extractor for a movie website called "Sigma-flix 4US".
Analyze the following webpage content or text and extract the movie or web series details into valid JSON format.

Source URL: ${pageUrl || "Direct Text"}
Bulk mode requested: ${bulk ? "YES (extract all movies detected)" : "NO (extract primary movie)"}

Extracted Content:
${rawContent.slice(0, 25000)}

Output MUST be a valid JSON array of movie objects matching this exact structure:
[
  {
    "title": "Clean, descriptive title with Year, Quality and Language (e.g., Inception (2010) Dual Audio [Hindi-English] WEB-DL 1080p 720p 480p)",
    "year": "2024",
    "rating": 7.5,
    "categories": ["action", "thriller"],
    "image": "Direct poster image URL (high quality)",
    "screenshots": ["Screenshot URL 1", "Screenshot URL 2", "Screenshot URL 3"],
    "description": "Engaging movie synopsis and details. Mention available on Sigma-flix 4US.",
    "links": [
      { "quality": "480p", "size": "450MB", "url": "Download link or page link" },
      { "quality": "720p", "size": "1.2GB", "url": "Download link or page link" },
      { "quality": "1080p", "size": "2.8GB", "url": "Download link or page link" }
    ],
    "isSeries": false,
    "streamingUrl": "Streaming or fast link if available",
    "seasons": []
  }
]

Categories must only use lowercase values from: action, comedy, drama, horror, romance, thriller, sci-fi, animation, adventure, crime, fantasy, mystery, web-series, dual-audio, bollywood, hollywood, south-indian.
DO NOT wrap in markdown \`\`\`json. Return pure JSON only.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
        });

        const replyText = response.text || "";
        const jsonMatch = replyText.match(/\[\s*\{[\s\S]*\}\s*\]/) || replyText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          extractedMovies = Array.isArray(parsed) ? parsed : [parsed];
        }
      } catch (aiErr) {
        console.warn("Gemini AI extraction encountered an issue, falling back to smart heuristic extractor:", aiErr.message);
      }
    }

    // Fallback if AI was unavailable or failed
    if (!extractedMovies || extractedMovies.length === 0) {
      extractedMovies = fallbackExtractMovies(rawContent, pageUrl);
    }

    return res.status(200).json({
      success: true,
      count: extractedMovies.length,
      movies: extractedMovies,
      source: apiKey ? "gemini-ai" : "smart-extractor",
      message: `Successfully extracted ${extractedMovies.length} title(s)!`
    });

  } catch (error) {
    console.error("AI Extractor error:", error);
    return res.status(500).json({
      error: "Extraction failed: " + (error.message || "Unknown error")
    });
  }
}
