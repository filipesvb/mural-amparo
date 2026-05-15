-- coluna gerada com tsvector em português; backfill é automático
-- e a coluna se mantém sincronizada via STORED em todo INSERT/UPDATE.
alter table posts add column search tsvector
  generated always as (to_tsvector('portuguese', coalesce(content, ''))) stored;

create index posts_search_idx on posts using gin(search);
