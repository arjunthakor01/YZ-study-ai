# YZ Study: free-tier deploy guide

## 1. Get a free AI key (Google Gemini)
1. Go to aistudio.google.com, sign in, click "Get API key".
2. Check the free limits shown there. They change, and the free tier is shared by all your visitors.

## 2. Put the site online (free, Netlify)
1. Upload this whole folder to a new repository on github.com.
2. On netlify.com choose Add new site > Import from Git > pick the repository. Keep the default settings.
3. Site configuration > Environment variables:
   - GEMINI_API_KEY = your key
   - GEMINI_MODEL = a current Flash model name from AI Studio (default is gemini-2.5-flash; change it if answers fail with a model error)
   - HOURLY_LIMIT = 20 and DAILY_LIMIT = 300 (optional; keeps you under the free limits)
4. Deploy and test every tool once.
(You can use Claude instead: set ANTHROPIC_API_KEY and leave GEMINI_API_KEY empty. That costs money per answer.)

## 3. Your domain
Netlify > Domain management > Add a domain. A free .netlify.app address works until you buy one.

## 4. Replace the placeholder
Replace YOURDOMAIN.com in public/index.html, robots.txt, sitemap.xml. Add your email to public/privacy.html.

## 5. Visitors and search
Submit https://YOURDOMAIN.com/sitemap.xml in Google Search Console and Bing Webmaster Tools.

## 6. Count visitors (free)
Create a Google Analytics property, copy its ID (G-...), and put it in window.YZ.GA near the bottom of public/index.html.

## 7. Ads (after you have real traffic)
Apply at adsense.google.com with your own domain. When approved, put your ca-pub ID in window.YZ.ADS and your ad unit ID in window.YZ.SLOT. Two ad spots are already placed between sections. Some regions need a cookie-consent banner for ads and analytics. Check the current rules for your audience.

## Notes
- When the free daily limit ends, visitors see a friendly "come back tomorrow" message.
- The limits in ai.js are in memory, so they are a basic guard only.
- Quiz scores and progress stay in each visitor's browser.
