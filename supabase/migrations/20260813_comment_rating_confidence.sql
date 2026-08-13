-- Add OpenReview-style rating and confidence fields to new comments.
alter table public.comments
  add column if not exists rating smallint check (rating between 1 and 10);

alter table public.comments
  add column if not exists confidence smallint check (confidence between 1 and 5);

drop policy if exists comments_owner_insert on public.comments;
create policy comments_owner_insert on public.comments for insert
  with check (
    status = 'published'
    and rating between 1 and 10
    and confidence between 1 and 5
    and (
      (auth.uid() is not null and user_id = auth.uid() and guest_name is null)
      or (auth.uid() is null and user_id is null and char_length(trim(guest_name)) between 2 and 80)
    )
    and exists (
      select 1 from public.benchmarks b
      where b.id = benchmark_id and b.status = 'published'
    )
  );
