-- 1. On crée la table 'profiles' qui va stocker les données métier
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  email text,
  age integer,
  skin_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Sécurité : Chaque utilisateur ne peut voir ou modifier QUE son propre profil
alter table public.profiles enable row level security;
create policy "Profiles : gestion personnelle" 
on public.profiles for all using (auth.uid() = id);

-- 3. Fonction technique (Déclencheur)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, age, skin_type)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'first_name',
    (new.raw_user_meta_data->>'age')::integer,
    new.raw_user_meta_data->>'skin_type'
  );
  return new;
end;
$$ language plpgsql security definer;

-- 4. Finalisation du Déclencheur : il sera appelé à chaque nouvelle inscription (auth.users)
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
