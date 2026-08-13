-- Change comment ratings from a 10-point scale to a 5-point scale.
alter table public.comments drop constraint if exists comments_rating_check;
alter table public.comments
  add constraint comments_rating_check check (rating between 1 and 5);

drop policy if exists comments_owner_insert on public.comments;
create policy comments_owner_insert on public.comments for insert
  with check (
    status = 'published'
    and rating between 1 and 5
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
