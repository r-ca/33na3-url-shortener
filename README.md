# 33na3 URL Shortener

A URL shortening service built with Cloudflare Workers and React.

## Features

- URL shortening with custom slugs
- Google OAuth authentication
- User-specific URL management
- Modern React frontend with Ant Design

## Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Cloudflare account
- Google OAuth credentials

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd 33na3-url-shortener
```

2. Install dependencies:
```bash
npm install
cd frontend && npm install && cd ..
```

3. Set up environment variables:
```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and add your actual values:
```bash
# Google OAuth Client ID
GOOGLE_CLIENT_ID=your_actual_google_client_id

# Cloudflare KV Namespace ID
KV_NAMESPACE_ID=your_actual_kv_namespace_id

# Domain configuration
DOMAIN_PATTERN=url.yourdomain.com/*
ZONE_NAME=yourdomain.com

# Additional allowed origins for CORS (comma separated)
CORS_ALLOWED_ORIGINS=https://url.yourdomain.com,https://alt.yourdomain.com
```

4. Create a Cloudflare KV namespace (if you don't have one):
```bash
wrangler kv:namespace create PRIMARY_KV
```
Copy the returned namespace ID to your `.dev.vars` file.

5. Deploy to Cloudflare Workers:
```bash
npm run deploy
```

## Multiple Domain Support

To serve the same Worker under additional domains:
- Add a new entry to the `routes` array in `wrangler.jsonc` (and the matching `env.production.routes` block) for each domain/zone pair you want to attach.
- Include every frontend origin in the `CORS_ALLOWED_ORIGINS` variable (comma separated). Any domain that serves the Worker directly is automatically allowed, so list only external origins that must call the API.
- Update DNS so the new hostname is proxied (orange-cloud) to Cloudflare and points to the same zone.
- Redeploy the Worker after making these changes.

## Development

Start the development server:
```bash
npm run dev
```

Start the frontend development server:
```bash
npm run dev:frontend
```

## Security Notes

- Never commit `.dev.vars` file to version control
- Keep your Google OAuth credentials secure
- The configuration uses environment variables for all environment-specific values
