CREATE TABLE IF NOT EXISTS public.user_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  open_beauty_facts_id text,
  product_name text NOT NULL,
  brand text,
  product_type text,
  morning_use boolean DEFAULT false,
  evening_use boolean DEFAULT false,
  photo_url text,
  ingredients text,
  added_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own products"
  ON public.user_products FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own products"
  ON public.user_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON public.user_products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON public.user_products FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_products_user_type
  ON public.user_products (user_id, product_type);
