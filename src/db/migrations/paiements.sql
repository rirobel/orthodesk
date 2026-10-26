-- paiements.sql  (à exécuter dans Supabase SQL Editor)

create table if not exists paiements (
  id bigint generated always as identity primary key,
  patient_id bigint not null references patients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  montant numeric(10,2) not null check (montant > 0),
  date_paiement date not null default current_date,
  mode_paiement text not null default 'cash',
  note text default '',
  created_at timestamptz default now()
);

alter table paiements enable row level security;

create policy "ortho voit ses paiements"
  on paiements for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_paiements_patient_id
  on paiements (patient_id);

create index if not exists idx_paiements_user_id
  on paiements (user_id);
