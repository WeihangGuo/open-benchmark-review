-- Allow public guest comments while keeping benchmark submissions authenticated.
alter table public.comments add column if not exists guest_name text;
alter table public.comments alter column user_id drop not null;

alter table public.comments drop constraint if exists comments_identity_check;
alter table public.comments add constraint comments_identity_check check (
  (user_id is not null and guest_name is null)
  or (user_id is null and char_length(trim(guest_name)) between 2 and 80)
);

drop policy if exists comments_owner_insert on public.comments;
create policy comments_owner_insert on public.comments for insert
  with check (
    status = 'published'
    and (
      (auth.uid() is not null and user_id = auth.uid() and guest_name is null)
      or (auth.uid() is null and user_id is null and char_length(trim(guest_name)) between 2 and 80)
    )
    and exists (
      select 1 from public.benchmarks b
      where b.id = benchmark_id and b.status = 'published'
    )
  );

grant insert on public.comments to anon;
