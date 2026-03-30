# Card Scout Backend — Deploy to Render

## Quick Deploy (5 minutes)

### Option A: Deploy via GitHub (recommended)

1. Create a new GitHub repo called `card-scout-backend`
2. Push these 3 files to it:
   - `package.json`
   - `server.js`
   - `README.md` (this file)
3. Go to [dashboard.render.com](https://dashboard.render.com)
4. Click **New → Web Service**
5. Connect your `card-scout-backend` GitHub repo
6. Settings:
   - **Name:** card-scout-backend
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free (or Starter $7/mo for always-on)
7. Add **Environment Variables:**

   | Key | Value |
   |-----|-------|
   | `EBAY_CLIENT_ID` | `NickPfei-CardScou-PRD-9f61be8bd-fdd185ba` |
   | `EBAY_CLIENT_SECRET` | *(your Cert ID from developer.ebay.com)* |
   | `REFRESH_KEY` | *(any random password to protect refresh endpoint)* |

8. Click **Deploy**

### Option B: Deploy without GitHub

1. Install Render CLI: `npm i -g @render/cli`
2. Or just use the Render dashboard "Deploy from URL" with a zip of these files

## Test It

Once deployed, test these URLs (replace with your actual Render URL):

```
# Health check
curl https://card-scout-backend.onrender.com/api/health

# eBay status
curl https://card-scout-backend.onrender.com/api/ebay/status

# Get Charizard price
curl https://card-scout-backend.onrender.com/api/price/1

# Get all cards
curl https://card-scout-backend.onrender.com/api/cards

# Search
curl https://card-scout-backend.onrender.com/api/search?q=charizard

# Trigger price refresh
curl -X POST "https://card-scout-backend.onrender.com/api/prices/refresh?key=YOUR_REFRESH_KEY"
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server status |
| GET | `/api/cards` | All cards (optional `?era=vintage\|modern\|hyper`) |
| GET | `/api/cards/:id` | Single card |
| GET | `/api/search?q=term` | Search cards |
| GET | `/api/trending?era=hyper` | Top cards by price |
| GET | `/api/price/:id` | Live eBay NM price (auto-caches) |
| GET | `/api/prices` | All cards with cached eBay prices |
| POST | `/api/prices/refresh` | Bulk refresh all eBay prices |
| GET | `/api/ebay/status` | eBay connection + cache stats |
