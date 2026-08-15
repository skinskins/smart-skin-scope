-- Audit des scans produits, pour anti-abus (soft cap fenêtre gratuite 24h) et traçabilité crédits.
CREATE TABLE product_scans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  within_free_window boolean NOT NULL DEFAULT false,
  credit_consumed boolean NOT NULL DEFAULT false
);

CREATE INDEX product_scans_user_id_scanned_at_idx ON product_scans (user_id, scanned_at);

ALTER TABLE product_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scans"
ON product_scans FOR SELECT
USING (auth.uid() = user_id);
