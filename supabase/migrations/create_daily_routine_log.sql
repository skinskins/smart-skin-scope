CREATE TABLE daily_routine_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  period text CHECK (period IN ('morning', 'evening')),
  product_ids uuid[] NOT NULL,
  inci_message text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date, period)
);

ALTER TABLE daily_routine_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own daily routine"
ON daily_routine_log FOR ALL
USING (auth.uid() = user_id);
