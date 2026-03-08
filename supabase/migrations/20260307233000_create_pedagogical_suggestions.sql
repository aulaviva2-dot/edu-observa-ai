
-- Create pedagogical_suggestions table
CREATE TABLE IF NOT EXISTS public.pedagogical_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  observation_id UUID NOT NULL REFERENCES public.observations(id) ON DELETE CASCADE,
  indicator_name TEXT NOT NULL,
  level TEXT NOT NULL, -- Evidencia clara, Evidencia parcial, No observable
  detail TEXT,
  suggestion TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pedagogical_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view suggestions for their own observations" 
ON public.pedagogical_suggestions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.observations 
    WHERE public.observations.id = public.pedagogical_suggestions.observation_id 
    AND public.observations.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert suggestions for their own observations" 
ON public.pedagogical_suggestions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.observations 
    WHERE public.observations.id = public.pedagogical_suggestions.observation_id 
    AND public.observations.user_id = auth.uid()
  )
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_pedagogical_suggestions_observation_id ON public.pedagogical_suggestions(observation_id);
