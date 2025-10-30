# Schedulator Deployment Guide

## 🚀 Vercel Deployment (Recommended)

Your app is now configured with the Vercel adapter and ready for deployment!

### Prerequisites
- Your Supabase project is set up and configured
- Your database schema is applied (from `DATABASE_SCHEMA.sql`)
- Your environment variables are ready

### Environment Variables Needed
Create these in your Vercel dashboard:

```env
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Deploy Steps

1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login with GitHub
   - Click "New Project"
   - Import your schedulator repository
   - Vercel will auto-detect it's a SvelteKit project

3. **Add Environment Variables**:
   - In Vercel dashboard → Project → Settings → Environment Variables
   - Add your Supabase URL and anon key
   - Make sure to add them for Production, Preview, and Development

4. **Deploy**:
   - Vercel will automatically build and deploy
   - Your app will be live at `https://your-project-name.vercel.app`

### Database Setup
Make sure your Supabase database has:
- ✅ All tables created (from `DATABASE_SCHEMA.sql`)
- ✅ Row Level Security enabled
- ✅ Policies configured for user access
- ✅ Authentication enabled

## 🌐 Alternative: Netlify

If you prefer Netlify:

1. **Install Netlify adapter**:
   ```bash
   npm install -D @sveltejs/adapter-netlify
   ```

2. **Update svelte.config.js**:
   ```javascript
   import adapter from '@sveltejs/adapter-netlify';
   ```

3. **Deploy via Netlify dashboard** similar to Vercel

## 🔧 Environment Variables

Your app needs these environment variables:

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API |
| `PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Supabase Dashboard → Settings → API |

## 🎯 Pre-Deployment Checklist

- [ ] Database schema applied to Supabase
- [ ] Environment variables configured
- [ ] RLS policies enabled and tested
- [ ] Authentication working locally
- [ ] All features tested locally
- [ ] Requirements and courses can be added
- [ ] Semester planning works
- [ ] Course scheduling persists to database

## 🐛 Troubleshooting

### Common Issues:

1. **Build Fails**: Check that all imports are correct and no server-side code runs in browser
2. **Database Errors**: Verify RLS policies allow user operations
3. **Auth Issues**: Check Supabase auth settings and environment variables
4. **CORS Errors**: Ensure your deployment domain is added to Supabase allowed origins

### Build Command
The default build command should work: `npm run build`

### Node Version
Vercel uses Node 18+ by default, which should work fine.

## 🚀 Going Live

Once deployed:
1. Test all functionality on the live site
2. Add some sample requirements
3. Test the semester planning drag-and-drop
4. Verify data persists between sessions
5. Share with users!

Your Schedulator app is ready for production! 🎉