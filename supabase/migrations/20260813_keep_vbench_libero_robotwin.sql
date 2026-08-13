-- Deliberately remove every benchmark except VBench, then add LIBERO and RoboTwin.
-- Related sources, comments, votes, and reports are removed by foreign-key cascades.

delete from public.benchmarks where slug <> 'vbench';

insert into public.benchmarks (
  slug, name, full_name, summary, category, tags, year, venue, status, published_at
)
values
  (
    'libero',
    'LIBERO',
    'Benchmarking Knowledge Transfer for Lifelong Robot Learning',
    'A lifelong robot learning benchmark with procedurally generated manipulation tasks for studying knowledge transfer across objects, spatial relationships, goals, and long-horizon behaviors.',
    'Robotics',
    array['Robot manipulation','Lifelong learning','130 tasks'],
    2023,
    'NeurIPS',
    'published',
    now()
  ),
  (
    'robotwin',
    'RoboTwin',
    'Dual-Arm Robot Benchmark with Generative Digital Twins',
    'A scalable benchmark and data-generation platform for robust bimanual robotic manipulation with diverse tasks, objects, and strong domain randomization.',
    'Robotics',
    array['Bimanual manipulation','Digital twins','50 tasks'],
    2025,
    'CVPR',
    'published',
    now()
  );

insert into public.benchmark_sources (benchmark_id, source_type, url, canonical_id)
select b.id, s.source_type, s.url, public.canonicalize_source_url(s.url)
from (values
  ('libero','github','https://github.com/Lifelong-Robot-Learning/LIBERO'),
  ('libero','paper','https://arxiv.org/abs/2306.03310'),
  ('libero','project_page','https://libero-project.github.io/main.html'),
  ('robotwin','github','https://github.com/RoboTwin-Platform/RoboTwin'),
  ('robotwin','paper','https://arxiv.org/abs/2506.18088'),
  ('robotwin','project_page','https://robotwin-platform.github.io/')
) as s(slug, source_type, url)
join public.benchmarks b on b.slug = s.slug;
