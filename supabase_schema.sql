-- 1. PROFILES TABLE (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  username TEXT,
  is_admin BOOLEAN DEFAULT false,
  credits INT DEFAULT 0,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. CATALOG TABLE (Films and Series)
CREATE TABLE IF NOT EXISTS public.catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  cover_url TEXT NOT NULL,
  trailer_url TEXT,
  type TEXT DEFAULT 'Série',
  year TEXT DEFAULT '2026',
  rating TEXT DEFAULT '9.5',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. EPISODES TABLE
CREATE TABLE IF NOT EXISTS public.episodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  catalog_id UUID REFERENCES public.catalog(id) ON DELETE CASCADE NOT NULL,
  season_number INT DEFAULT 1,
  episode_number INT NOT NULL,
  title TEXT NOT NULL,
  video_id TEXT NOT NULL, -- Bunny Stream Video ID or Drive ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- 5. UNLOCKED EPISODES TABLE
CREATE TABLE IF NOT EXISTS public.unlocked_episodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, episode_id)
);

-- 6. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INT NOT NULL,
  payment_method TEXT DEFAULT 'PIX',
  status TEXT DEFAULT 'approved',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. MY LIST TABLE (Favorites)
CREATE TABLE IF NOT EXISTS public.my_list (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  catalog_id UUID REFERENCES public.catalog(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, catalog_id)
);

-- 8. WATCH PROGRESS TABLE
CREATE TABLE IF NOT EXISTS public.watch_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
  progress_pct INT DEFAULT 0,
  seconds INT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, episode_id)
);

-- Trigger to automatically create a profile when a new user verifies their email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, credits, is_admin)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    0,
    false
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security (RLS) & Public Read Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unlocked_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.my_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;

-- Allow public read for Catalog, Episodes, Categories
CREATE POLICY "Public catalog read" ON public.catalog FOR SELECT USING (true);
CREATE POLICY "Public episodes read" ON public.episodes FOR SELECT USING (true);
CREATE POLICY "Public categories read" ON public.categories FOR SELECT USING (true);

-- Allow admins to insert/update/delete catalog and episodes
CREATE POLICY "Admin catalog write" ON public.catalog FOR ALL USING (true);
CREATE POLICY "Admin episodes write" ON public.episodes FOR ALL USING (true);

-- User RLS policies
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users unlocked episodes" ON public.unlocked_episodes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users my_list" ON public.my_list FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users progress" ON public.watch_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);

-- Insert Default Categories
INSERT INTO public.categories (name) VALUES 
('Ação'), ('Drama'), ('Romance'), ('Comédia'), ('Policial'), ('Artes Marciais'), ('Paródia')
ON CONFLICT (name) DO NOTHING;
