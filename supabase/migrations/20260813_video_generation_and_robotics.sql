-- Public taxonomy migration: keep legacy action-understanding rows archived,
-- while exposing only Video generation and Robotics for new submissions.

update public.benchmarks
set status = 'rejected'
where category = 'Action understanding' and status = 'published';

alter table public.benchmarks drop constraint if exists benchmarks_category_check;
alter table public.benchmarks add constraint benchmarks_category_check
  check (category in ('Video generation', 'Robotics', 'Action understanding'));

create or replace function public.submit_benchmark(
  p_name text,
  p_source_url text,
  p_category text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_slug text;
  v_canonical text;
  v_source_type text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if char_length(trim(p_name)) < 2 or char_length(trim(p_name)) > 160 then
    raise exception 'Benchmark name must be between 2 and 160 characters';
  end if;
  if p_category not in ('Video generation', 'Robotics') then
    raise exception 'Invalid benchmark category';
  end if;

  v_canonical := public.canonicalize_source_url(p_source_url);
  if v_canonical ~ '^github\.com/[^/]+/[^/]+' then
    v_source_type := 'github';
  elsif v_canonical ~ '^huggingface\.co/[^/]+/[^/]+' or v_canonical ~ '^huggingface\.co/datasets/[^/]+/[^/]+' then
    v_source_type := 'huggingface';
  else
    raise exception 'A GitHub or Hugging Face repository URL is required';
  end if;

  if exists (select 1 from public.benchmark_sources where canonical_id = v_canonical) then
    raise exception 'This repository is already indexed';
  end if;

  v_slug := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  if v_slug = '' then v_slug := 'benchmark'; end if;
  if exists (select 1 from public.benchmarks where slug = v_slug) then
    v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end if;

  insert into public.benchmarks (
    slug, name, category, status, submitted_by, submission_note
  ) values (
    v_slug, trim(p_name), p_category, 'pending', auth.uid(), nullif(trim(p_note), '')
  ) returning id into v_id;

  insert into public.benchmark_sources (benchmark_id, source_type, url, canonical_id)
  values (v_id, v_source_type, trim(p_source_url), v_canonical);

  return v_id;
end;
$$;

revoke execute on function public.submit_benchmark(text, text, text, text) from public, anon;
grant execute on function public.submit_benchmark(text, text, text, text) to authenticated;
