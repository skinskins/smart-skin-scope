-- Permet d'enregistrer les demandes de suppression de compte/données dans la table feedback
ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_type_check;
ALTER TABLE public.feedback ADD CONSTRAINT feedback_type_check
  CHECK (type in ('bug', 'suggestion', 'deletion_request'));
