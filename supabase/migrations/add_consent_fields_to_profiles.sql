ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS personalized_recommendations_consent boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_learning_consent boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS product_research_consent boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_share_consent boolean DEFAULT false;
