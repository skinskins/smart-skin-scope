-- Décrément atomique des crédits de scan hebdomadaires (évite une race condition entre
-- deux scans concurrents qui liraient tous les deux "1 crédit restant" avant de décrémenter).
-- Retourne le solde restant après décrément, ou NULL si aucun crédit n'était disponible
-- (le scan doit alors être refusé — blocage dur, cf. product-scan edge function).
CREATE OR REPLACE FUNCTION decrement_scan_credit(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining integer;
BEGIN
  UPDATE profiles
  SET scan_credits_remaining = scan_credits_remaining - 1
  WHERE id = p_user_id AND scan_credits_remaining > 0
  RETURNING scan_credits_remaining INTO v_remaining;

  RETURN v_remaining;
END;
$$;
