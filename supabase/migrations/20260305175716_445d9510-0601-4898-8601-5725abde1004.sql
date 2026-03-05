
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create observations table
CREATE TABLE public.observations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school TEXT NOT NULL,
  teacher TEXT NOT NULL,
  grade TEXT NOT NULL,
  group_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  observation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vistazo_1 TEXT,
  vistazo_2 TEXT,
  vistazo_3 TEXT,
  vistazo_4 TEXT,
  vistazo_5 TEXT,
  vistazo_6 TEXT,
  vistazo_7 TEXT,
  vistazo_8 TEXT,
  vistazo_9 TEXT,
  vistazo_10 TEXT,
  ai_analysis JSONB,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'analyzed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own observations" ON public.observations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own observations" ON public.observations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own observations" ON public.observations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own observations" ON public.observations FOR DELETE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_observations_updated_at BEFORE UPDATE ON public.observations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
