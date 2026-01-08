# 🚀 Deploying Henkel WMS to Vercel

## Step 1: Push to GitHub

### 1.1 Create a GitHub Repository
1. Go to https://github.com/new
2. Create a new repository (e.g., `henkel-wms-v2`)
3. **Don't** initialize with README (you already have code)

### 1.2 Push Your Code
Run these commands in your terminal:

```bash
# Make sure you're on master branch
git checkout master

# Add GitHub remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/henkel-wms-v2.git

# Push to GitHub
git push -u origin master
```

## Step 2: Deploy to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. **Go to Vercel**: https://vercel.com
2. **Sign in** with your GitHub account
3. **Click "Add New Project"**
4. **Import your repository**:
   - Select your `henkel-wms-v2` repository
   - Click "Import"
5. **Configure Project**:
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)
6. **Environment Variables** (if needed):
   - Currently, MQTT URL is hardcoded in `src/mqttConfig.js`
   - If you want to use env vars, add:
     - `VITE_MQTT_URL` = `wss://supos-ce-instance1.supos.app:8084/mqtt`
7. **Click "Deploy"**

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from project root)
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: henkel-wms-v2
# - Directory: ./
# - Override settings? No
```

## Step 3: Post-Deployment

### 3.1 Update MQTT Config (Optional)
If you want to use environment variables for MQTT:

1. **Update `src/mqttConfig.js`**:
```js
export const MQTT_URL = import.meta.env.VITE_MQTT_URL || "wss://supos-ce-instance1.supos.app:8084/mqtt";
```

2. **Add to Vercel Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add: `VITE_MQTT_URL` = `wss://supos-ce-instance1.supos.app:8084/mqtt`

### 3.2 Custom Domain (Optional)
- Go to Project Settings → Domains
- Add your custom domain

## Troubleshooting

### Build Fails
- Check Vercel build logs
- Ensure `package.json` has correct build script
- Check Node.js version (Vercel uses Node 18+ by default)

### MQTT Connection Issues
- MQTT broker must allow connections from Vercel's IPs
- Check CORS settings on MQTT broker
- Consider using environment variables for MQTT URL

### Routing Issues
- Vite SPA needs redirect rules
- Vercel auto-handles this, but if issues occur, add `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Quick Commands Reference

```bash
# Check current branch
git branch --show-current

# Push to GitHub
git push origin master

# Deploy to Vercel (CLI)
vercel --prod
```

