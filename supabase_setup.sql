-- Create coaching_logs table
CREATE TABLE public.coaching_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id TEXT NOT NULL,
    situation TEXT NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security) if needed in the future, for now allow all operations
ALTER TABLE public.coaching_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON public.coaching_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select" ON public.coaching_logs FOR SELECT USING (true);
