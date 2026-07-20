-- Run against the PostgreSQL database connected through DATABASE_URL.

alter table if exists exhibitions add column if not exists country text default 'ایران';
alter table if exists exhibitions add column if not exists city text;
alter table if exists exhibitions add column if not exists venue text;
alter table if exists exhibitions add column if not exists start_date text;
alter table if exists exhibitions add column if not exists end_date text;
alter table if exists exhibitions add column if not exists year text;
alter table if exists exhibitions add column if not exists is_international boolean not null default false;

alter table if exists companies add column if not exists email text;
alter table if exists companies add column if not exists address text;
alter table if exists companies add column if not exists booth text;
alter table if exists companies add column if not exists country text;
alter table if exists companies add column if not exists website_status text default 'unknown';
alter table if exists companies add column if not exists opportunity_score integer default 0;
alter table if exists companies add column if not exists recommended_package text;
alter table if exists companies add column if not exists google_status text not null default 'not_checked';
alter table if exists companies add column if not exists google_place_name text;
alter table if exists companies add column if not exists google_maps_url text;
alter table if exists companies add column if not exists checked_at timestamptz;
alter table if exists companies add column if not exists priority integer not null default 50;
alter table if exists companies add column if not exists notes text;
alter table if exists companies add column if not exists updated_at timestamptz not null default now();

alter table if exists proposals add column if not exists status text not null default 'draft';

create index if not exists exhibitions_international_idx on exhibitions(is_international, created_at desc);
create index if not exists companies_exhibition_idx on companies(exhibition_id);
create index if not exists companies_website_status_idx on companies(website_status);
