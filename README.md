# Schedulator

A college class scheduling webapp built with SvelteKit and Supabase. Manage your Core, Major, and Pre-graduate school requirements with ease.

## Features

- 🔐 **Email/OTP Authentication** - Secure login using Supabase Auth
- 📚 **Requirements Management** - Add, edit, and track Core, Major, and Pre-graduate requirements
- ✅ **Progress Tracking** - Mark requirements as completed
- 🎯 **Priority System** - Set priorities for your requirements (1-5 scale)
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🔒 **Row Level Security** - Your data is private and secure

## Tech Stack

- **Frontend**: SvelteKit 2.0, Svelte 5
- **Backend**: Supabase (Database + Auth)
- **Styling**: Custom CSS with modern design principles
- **Deployment**: Ready for Vercel, Netlify, or any static host

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd schedulator
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Copy `.env.local` and add your Supabase credentials:

```env
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set up Database

Run the SQL commands from `DATABASE_SCHEMA.md` in your Supabase SQL editor:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the SQL commands from `DATABASE_SCHEMA.md`
4. Execute the commands to create the requirements table and policies

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to see your app.

## Database Schema

The app uses a single `requirements` table with the following structure:

- User authentication and authorization via Supabase Auth
- Row Level Security (RLS) ensures users only see their own data
- Categories: Core, Major, Pre-graduate
- Priority levels: 1 (Lowest) to 5 (Highest)
- Completion tracking and timestamps

See `DATABASE_SCHEMA.md` for the complete SQL schema.

## Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── Auth.svelte              # Authentication component
│   │   ├── Dashboard.svelte         # Main dashboard layout
│   │   ├── RequirementsForm.svelte  # Form to add requirements
│   │   └── RequirementsList.svelte  # List and manage requirements
│   ├── auth.js                      # Authentication store and helpers  
│   ├── requirements.js              # Requirements CRUD operations
│   └── supabaseClient.js           # Supabase client configuration
├── routes/
│   ├── +layout.svelte              # Global layout and styles
│   └── +page.svelte                # Main app entry point
└── app.html                        # HTML template
```

## Usage

1. **Sign Up/Login**: Enter your email to receive a magic link for authentication
2. **Add Requirements**: Use the form to add Core, Major, or Pre-graduate requirements
3. **Manage Requirements**: Edit, delete, or mark requirements as complete
4. **Filter & Organize**: Filter by category and sort by priority
5. **Track Progress**: See your completion status for each requirement

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Deployment

The app is ready to deploy to any static hosting platform:

### Vercel
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Upload the `build` folder to Netlify
```

### Environment Variables

Make sure to set your environment variables in your deployment platform:
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

## Roadmap

- [ ] Class scheduling interface
- [ ] Semester planning
- [ ] Course conflict detection
- [ ] GPA calculator
- [ ] Export/import functionality
- [ ] Dark mode support

## License

This project is licensed under the MIT License - see the LICENSE file for details.
