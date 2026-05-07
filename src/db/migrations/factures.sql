-- factures.sql  (référence locale — à exécuter sur Supabase uniquement)

create table if not exists factures (
  id                bigint generated always as identity primary key,
  orthophoniste_id  uuid references auth.users not null,
  patient_id        bigint references patients(id) on delete set null,
  date_seance       date not null,
  type_seance       text not null,
  montant           numeric(8,2) not null default 0,
  statut_paiement   text not null default 'attente',
  moyen_paiement    text,
  notes_paiement    text,
  created_at        timestamptz default now()
);

alter table factures enable row level security;

create policy "ortho voit ses factures"
  on factures for all
  using (auth.uid() = orthophoniste_id);