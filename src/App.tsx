import { FormEvent, useEffect, useMemo, useState } from "react";

type Benchmark = {
  id: string;
  name: string;
  fullName: string;
  summary: string;
  category: "Video generation" | "Action understanding";
  tags: string[];
  year: number;
  venue: string;
  repo: string;
  paper: string;
  comments: number;
  updated: string;
  maintainer?: string;
};

type Comment = {
  id: number;
  author: string;
  initials: string;
  affiliation: string;
  tag: string;
  body: string;
  evidence?: string;
  version?: string;
  helpful: number;
  time: string;
  reply?: boolean;
};

type PendingBenchmark = {
  id: number;
  name: string;
  url: string;
  submitter: string;
  status: "Pending" | "Approved" | "Merged" | "Rejected";
  possibleDuplicate?: string;
};

const benchmarks: Benchmark[] = [
  {
    id: "vbench",
    name: "VBench",
    fullName: "Comprehensive Benchmark Suite for Video Generative Models",
    summary:
      "A multi-dimensional evaluation suite for text-to-video and image-to-video generation, with dedicated prompt sets and automatic metrics.",
    category: "Video generation",
    tags: ["Text-to-video", "Image-to-video", "16 dimensions"],
    year: 2024,
    venue: "CVPR",
    repo: "https://github.com/Vchitect/VBench",
    paper: "https://openaccess.thecvf.com/content/CVPR2024/html/Huang_VBench_Comprehensive_Benchmark_Suite_for_Video_Generative_Models_CVPR_2024_paper.html",
    comments: 24,
    updated: "2 days ago",
    maintainer: "Vchitect",
  },
  {
    id: "evalcrafter",
    name: "EvalCrafter",
    fullName: "Benchmarking and Evaluating Large Video Generation Models",
    summary:
      "Evaluates visual quality, motion quality, temporal consistency and text-video alignment with objective metrics and user studies.",
    category: "Video generation",
    tags: ["Text-to-video", "Human study", "Motion"],
    year: 2024,
    venue: "CVPR",
    repo: "https://github.com/EvalCrafter/EvalCrafter",
    paper: "https://evalcrafter.github.io/",
    comments: 17,
    updated: "1 week ago",
  },
  {
    id: "t2v-compbench",
    name: "T2V-CompBench",
    fullName: "A Comprehensive Benchmark for Compositional Text-to-video Generation",
    summary:
      "Focuses on compositional generation, including attribute binding, spatial relationships, numeracy, motion binding and complex compositions.",
    category: "Video generation",
    tags: ["Compositionality", "Text-to-video", "Fine-grained"],
    year: 2025,
    venue: "CVPR",
    repo: "https://github.com/KaiyueSun98/T2V-CompBench",
    paper: "https://arxiv.org/abs/2407.14505",
    comments: 11,
    updated: "3 weeks ago",
  },
  {
    id: "kinetics-400",
    name: "Kinetics-400",
    fullName: "The Kinetics Human Action Video Dataset",
    summary:
      "A large-scale collection of human action clips sourced from YouTube, widely used for action recognition training and evaluation.",
    category: "Action understanding",
    tags: ["Action recognition", "YouTube", "400 classes"],
    year: 2017,
    venue: "CVPR",
    repo: "https://github.com/cvdfoundation/kinetics-dataset",
    paper: "https://arxiv.org/abs/1705.06950",
    comments: 38,
    updated: "Yesterday",
  },
  {
    id: "ssv2",
    name: "Something-Something V2",
    fullName: "The Something-Something Video Database, Version 2",
    summary:
      "A crowd-acted dataset emphasizing temporal reasoning and human-object interactions with everyday objects.",
    category: "Action understanding",
    tags: ["Temporal reasoning", "Object interaction", "174 classes"],
    year: 2017,
    venue: "ICCV",
    repo: "https://huggingface.co/datasets/HuggingFaceM4/something_something_v2",
    paper: "https://arxiv.org/abs/1706.04261",
    comments: 29,
    updated: "4 days ago",
  },
  {
    id: "ava",
    name: "AVA",
    fullName: "A Video Dataset of Spatio-temporally Localized Atomic Visual Actions",
    summary:
      "Provides person-centric, spatio-temporal action annotations in movie clips for localized human action understanding.",
    category: "Action understanding",
    tags: ["Action localization", "Atomic actions", "Movies"],
    year: 2018,
    venue: "CVPR",
    repo: "https://research.google.com/ava/",
    paper: "https://arxiv.org/abs/1705.08421",
    comments: 14,
    updated: "2 weeks ago",
  },
];

const seededComments: Record<string, Comment[]> = {
  vbench: [
    {
      id: 1,
      author: "Maya Chen",
      initials: "MC",
      affiliation: "PhD student · Video generation",
      tag: "Metric validity",
      version: "VBench 0.1.2",
      body:
        "The per-dimension breakdown is much more informative than the aggregate score. In our experiments, models with visibly different motion failure modes can still end up close in the final average, so I would strongly recommend reporting the full vector of scores.",
      evidence: "Experiment notes and model outputs available in the linked repository.",
      helpful: 42,
      time: "6 days ago",
    },
    {
      id: 2,
      author: "Arjun Rao",
      initials: "AR",
      affiliation: "Research engineer",
      tag: "Reproducibility",
      version: "VBench 0.1.2",
      body:
        "Reproduction was straightforward after pinning the evaluation model versions. The main source of variance for us was video preprocessing rather than the metric implementation itself. Please report frame rate, resizing behavior and the exact commit used.",
      helpful: 31,
      time: "2 weeks ago",
    },
    {
      id: 3,
      author: "Verified maintainer",
      initials: "VM",
      affiliation: "VBench project · identity verified",
      tag: "Maintainer note",
      body:
        "Thank you for flagging the preprocessing ambiguity. We have expanded the documentation and welcome minimal reproduction cases through the project repository.",
      helpful: 18,
      time: "12 days ago",
      reply: true,
    },
    {
      id: 4,
      author: "Elena Park",
      initials: "EP",
      affiliation: "Assistant professor",
      tag: "Use case",
      body:
        "Useful for broad capability profiling, but I would not use the human-action dimension alone to support a strong claim about physical plausibility. Pair it with a targeted action or physics evaluation.",
      helpful: 27,
      time: "3 weeks ago",
    },
  ],
};

const initialPending: PendingBenchmark[] = [
  {
    id: 1,
    name: "VBench++",
    url: "https://github.com/Vchitect/VBench",
    submitter: "alex-kim",
    status: "Pending",
    possibleDuplicate: "VBench",
  },
  {
    id: 2,
    name: "VideoPhy-2",
    url: "https://github.com/Hritikbansal/videophy",
    submitter: "rli-research",
    status: "Pending",
  },
];

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [hash, setHash] = useState(() => window.location.hash || "#home");
  const [signedIn, setSignedIn] = useState(() => readStored("obr-signed-in", false));
  const [submitOpen, setSubmitOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<PendingBenchmark[]>(() =>
    readStored("obr-pending", initialPending),
  );

  useEffect(() => {
    const onHashChange = () => {
      setHash(window.location.hash || "#home");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    localStorage.setItem("obr-signed-in", JSON.stringify(signedIn));
  }, [signedIn]);

  useEffect(() => {
    localStorage.setItem("obr-pending", JSON.stringify(pending));
  }, [pending]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  };

  const openSubmit = () => {
    if (!signedIn) {
      setSignedIn(true);
      showNotice("Prototype sign-in complete. You can now submit a benchmark.");
    }
    setSubmitOpen(true);
  };

  const selectedId = hash.startsWith("#benchmark/") ? hash.split("/")[1] : null;
  const selected = benchmarks.find((benchmark) => benchmark.id === selectedId);

  return (
    <div className="app-shell">
      <Header
        signedIn={signedIn}
        setSignedIn={setSignedIn}
        openSubmit={openSubmit}
        showNotice={showNotice}
      />
      <main>
        {hash === "#admin" ? (
          <AdminView pending={pending} setPending={setPending} showNotice={showNotice} />
        ) : selected ? (
          <BenchmarkView benchmark={selected} signedIn={signedIn} setSignedIn={setSignedIn} />
        ) : (
          <HomeView openSubmit={openSubmit} />
        )}
      </main>
      <Footer />
      {submitOpen && (
        <SubmitDialog
          pending={pending}
          onClose={() => setSubmitOpen(false)}
          onSubmit={(submission) => {
            setPending((current) => [...current, submission]);
            setSubmitOpen(false);
            showNotice("Submitted for a quick duplicate check and admin review.");
          }}
        />
      )}
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}

function Header({
  signedIn,
  setSignedIn,
  openSubmit,
  showNotice,
}: {
  signedIn: boolean;
  setSignedIn: (value: boolean) => void;
  openSubmit: () => void;
  showNotice: (message: string) => void;
}) {
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#home" aria-label="Open Benchmark Review home">
            <span className="brand-name">OpenBenchmarkReview</span>
          </a>
          <label className="header-search">
            <input aria-label="Search all benchmarks" placeholder="Search benchmarks and comments…" onFocus={() => { if (window.location.hash !== "#home") window.location.hash = "#home"; }} />
            <span>⌕</span>
          </label>
          <nav className="nav-links" aria-label="Primary navigation">
            <button className="text-button" onClick={openSubmit}>Add benchmark</button>
            <a href="#admin" className="admin-link">Admin <span>2</span></a>
            <button
              className={signedIn ? "profile-button" : "sign-in-button"}
              onClick={() => {
                setSignedIn(!signedIn);
                showNotice(signedIn ? "Signed out of the prototype." : "Prototype GitHub sign-in complete.");
              }}
            >
              {signedIn ? "Account" : "Login"}
            </button>
          </nav>
        </div>
      </header>
      <div className="site-subnav">
        <div>
          <span>Open benchmarks. Open discussion. Better evidence.</span>
          <nav><a href="#home">Benchmarks</a><a href="#about">About</a><a href="https://github.com" target="_blank" rel="noreferrer">Open source</a></nav>
        </div>
      </div>
    </>
  );
}

function HomeView({ openSubmit }: { openSubmit: () => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All benchmarks");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return benchmarks.filter((benchmark) => {
      const matchesCategory = category === "All benchmarks" || benchmark.category === category;
      const matchesQuery =
        !normalized ||
        [benchmark.name, benchmark.fullName, benchmark.summary, ...benchmark.tags]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <div className="content-page">
      <section className="page-intro">
        <div>
          <h1>Benchmarks</h1>
          <p>Community discussion and practical context for machine-learning evaluation.</p>
        </div>
        <button className="primary-button" onClick={openSubmit}>Add a benchmark</button>
      </section>

      <aside className="community-prompt">
        <button aria-label="Dismiss">×</button>
        <strong>What do you wish you had known before using this benchmark?</strong>
        <span>Share a specific experience, version, limitation, or piece of evidence. Comments are public and community-moderated.</span>
      </aside>

      <section className="browse-section" id="browse">
        <div className="section-heading">
          <div>
            <h2>All benchmarks</h2>
          </div>
          <p>{filtered.length} results · 146 comments</p>
        </div>
        <div className="search-row">
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by benchmark, task, or capability…"
              aria-label="Search benchmarks"
            />
          </label>
          <div className="filter-tabs" role="group" aria-label="Filter by category">
            {["All benchmarks", "Video generation", "Action understanding"].map((item) => (
              <button
                key={item}
                className={category === item ? "active" : ""}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="benchmark-list">
          {filtered.map((benchmark) => <BenchmarkCard key={benchmark.id} benchmark={benchmark} />)}
          {filtered.length === 0 && (
            <div className="empty-state">
              <h3>No matching benchmark yet</h3>
              <p>Try a broader search, or help the community by adding it.</p>
              <button className="primary-button" onClick={openSubmit}>Add a benchmark</button>
            </div>
          )}
        </div>
      </section>

      <section className="about-strip" id="about">
        <strong>About Open Benchmark Review</strong>
        <p>This prototype keeps one canonical page per benchmark. Anyone can comment; administrators only resolve duplicate pages and moderate abuse. There are no reviewer or area-chair roles.</p>
      </section>
    </div>
  );
}

function BenchmarkCard({ benchmark }: { benchmark: Benchmark }) {
  return (
    <article className="benchmark-card">
      <div className="benchmark-main">
        <div className="benchmark-title-row">
          <div className="benchmark-heading">
            <div className="benchmark-name-line">
              <a href={`#benchmark/${benchmark.id}`}><h3>{benchmark.name}</h3></a>
              <span className={`category-badge ${benchmark.category === "Video generation" ? "generation" : "action"}`}>
                {benchmark.category}
              </span>
            </div>
            <p className="full-name">{benchmark.fullName}</p>
          </div>
        </div>
        <p className="benchmark-summary">{benchmark.summary}</p>
        <div className="tag-row">
          {benchmark.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </div>
      <div className="benchmark-meta">
        <div><span>Introduced</span><strong>{benchmark.venue} {benchmark.year}</strong></div>
        <div><span>Discussion</span><strong>{benchmark.comments} comments</strong></div>
        <div><span>Last activity</span><strong>{benchmark.updated}</strong></div>
        <a className="view-link" href={`#benchmark/${benchmark.id}`}>View discussion <span>→</span></a>
      </div>
    </article>
  );
}

function BenchmarkView({
  benchmark,
  signedIn,
  setSignedIn,
}: {
  benchmark: Benchmark;
  signedIn: boolean;
  setSignedIn: (value: boolean) => void;
}) {
  const [comments, setComments] = useState<Comment[]>(() =>
    readStored(`obr-comments-${benchmark.id}`, seededComments[benchmark.id] || []),
  );
  const [tag, setTag] = useState("All comments");
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    localStorage.setItem(`obr-comments-${benchmark.id}`, JSON.stringify(comments));
  }, [benchmark.id, comments]);

  const visibleComments = tag === "All comments" ? comments : comments.filter((comment) => comment.tag === tag);

  const submitComment = (event: FormEvent) => {
    event.preventDefault();
    if (!signedIn) {
      setSignedIn(true);
      return;
    }
    if (!commentText.trim()) return;
    setComments((current) => [
      {
        id: Date.now(),
        author: "Weihang Guo",
        initials: "WG",
        affiliation: "Community member",
        tag: "General",
        body: commentText.trim(),
        helpful: 0,
        time: "Just now",
      },
      ...current,
    ]);
    setCommentText("");
  };

  return (
    <div className="detail-page">
      <div className="breadcrumbs"><a href="#home">Benchmarks</a><span>/</span><span>{benchmark.name}</span></div>
      <section className="detail-hero">
        <div className="detail-copy">
          <div className="detail-label-row">
            <span className={`category-badge ${benchmark.category === "Video generation" ? "generation" : "action"}`}>{benchmark.category}</span>
            <span className="status-dot"><i /> Actively discussed</span>
          </div>
          <h1>{benchmark.name}</h1>
          <p className="detail-full-name">{benchmark.fullName}</p>
          <p className="detail-summary">{benchmark.summary}</p>
          <div className="source-links">
            <a href={benchmark.paper} target="_blank" rel="noreferrer">Paper ↗</a>
            <a href={benchmark.repo} target="_blank" rel="noreferrer">Official source ↗</a>
          </div>
        </div>
        <aside className="fact-card">
          <h2>Benchmark facts</h2>
          <dl>
            <div><dt>Introduced</dt><dd>{benchmark.venue} {benchmark.year}</dd></div>
            <div><dt>Primary task</dt><dd>{benchmark.category}</dd></div>
            <div><dt>Source status</dt><dd><span className="verified">✓ Verified</span></dd></div>
            <div><dt>Comments</dt><dd>{comments.length || benchmark.comments}</dd></div>
          </dl>
          <button className="plain-link" onClick={() => document.getElementById("comment-form")?.scrollIntoView({ behavior: "smooth" })}>Join the discussion →</button>
        </aside>
      </section>

      <nav className="detail-tabs" aria-label="Benchmark sections">
        <a href="#overview" className="active">Overview</a>
        <a href="#discussion">Comments <span>{comments.length || benchmark.comments}</span></a>
        <a href="#versions">Versions</a>
        <a href="#sources">Sources</a>
      </nav>

      <div className="detail-layout">
        <div className="detail-content">
          <section className="overview-panel" id="overview">
            <p className="eyebrow">Community overview</p>
            <h2>What this benchmark is useful for</h2>
            <p>Community members most often use {benchmark.name} for broad, comparable evaluation within <strong>{benchmark.category.toLowerCase()}</strong>. Its structured setup makes it easier to locate model strengths and failure modes than relying on one aggregate metric.</p>
            <div className="overview-columns">
              <div><h3>Common uses</h3><ul><li>Comparing model capabilities under a shared protocol</li><li>Reporting task-specific performance</li><li>Finding qualitative failure cases</li></ul></div>
              <div className="caution"><h3>Before you use it</h3><ul><li>Report the exact version and preprocessing</li><li>Avoid treating one score as universal quality</li><li>Pair broad evaluation with targeted tests</li></ul></div>
            </div>
            <p className="summary-note">This summary is community-maintained and should be read alongside the comments and original documentation.</p>
          </section>

          <section className="discussion-section" id="discussion">
            <div className="discussion-heading">
              <div><p className="eyebrow">Open discussion</p><h2>Community comments</h2></div>
              <select value={tag} onChange={(event) => setTag(event.target.value)} aria-label="Filter comments">
                <option>All comments</option>
                <option>Metric validity</option>
                <option>Reproducibility</option>
                <option>Use case</option>
                <option>General</option>
              </select>
            </div>
            <form className="comment-composer" id="comment-form" onSubmit={submitComment}>
              <div className="composer-top">
                <span className="avatar">{signedIn ? "WG" : "?"}</span>
                <div><strong>{signedIn ? "Add to the discussion" : "Sign in to comment"}</strong><span>Share what you observed and the context needed to interpret it.</span></div>
              </div>
              {signedIn && <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="What do you wish you had known before using this benchmark?" rows={4} />}
              <div className="composer-footer">
                <span>Be specific, constructive, and link evidence when possible.</span>
                <button className="primary-button" type="submit">{signedIn ? "Post comment" : "Sign in with GitHub"}</button>
              </div>
            </form>
            <div className="comments-list">
              {visibleComments.map((comment) => (
                <CommentCard key={comment.id} comment={comment} onHelpful={() => setComments((current) => current.map((item) => item.id === comment.id ? { ...item, helpful: item.helpful + 1 } : item))} />
              ))}
              {visibleComments.length === 0 && <div className="empty-comments">No comments in this category yet. Start the discussion.</div>}
            </div>
          </section>
        </div>
        <aside className="side-column">
          <div className="side-card"><h3>Topics</h3><div className="topic-list">{benchmark.tags.map((item) => <span key={item}>{item}</span>)}</div></div>
          <div className="side-card"><h3>Page history</h3><p>Created from the official source.</p><p>Last community edit {benchmark.updated}.</p><button className="plain-link">View edit history →</button></div>
          <div className="side-card compact"><h3>See something wrong?</h3><p>Suggest a correction or report duplicate information.</p><button className="plain-link">Suggest an edit →</button></div>
        </aside>
      </div>
    </div>
  );
}

function CommentCard({ comment, onHelpful }: { comment: Comment; onHelpful: () => void }) {
  return (
    <article className={`comment-card ${comment.reply ? "reply" : ""}`}>
      <div className="comment-author"><span className="avatar">{comment.initials}</span><div><strong>{comment.author}</strong><span>{comment.affiliation}</span></div><time>{comment.time}</time></div>
      <div className="comment-tags"><span>{comment.tag}</span>{comment.version && <span className="version">Used {comment.version}</span>}</div>
      <p>{comment.body}</p>
      {comment.evidence && <div className="evidence"><strong>Evidence note</strong><span>{comment.evidence}</span></div>}
      <div className="comment-actions"><button onClick={onHelpful}>↑ Helpful <span>{comment.helpful}</span></button><button>Reply</button><button>Share</button><button className="report">Report</button></div>
    </article>
  );
}

function SubmitDialog({
  pending,
  onClose,
  onSubmit,
}: {
  pending: PendingBenchmark[];
  onClose: () => void;
  onSubmit: (submission: PendingBenchmark) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const normalized = url.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const duplicate = benchmarks.find((benchmark) => benchmark.repo.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "") === normalized) ||
    benchmarks.find((benchmark) => name.length > 2 && benchmark.name.toLowerCase() === name.trim().toLowerCase());

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !url.trim()) return;
    onSubmit({ id: Date.now(), name: name.trim(), url: url.trim(), submitter: "community-user", status: "Pending", possibleDuplicate: duplicate?.name });
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="submit-title">
        <div className="modal-header"><div><p className="eyebrow">Community submission</p><h2 id="submit-title">Add a benchmark</h2></div><button onClick={onClose} aria-label="Close">×</button></div>
        <p>Submit the benchmark’s canonical source. An admin will do a quick duplicate check before the page becomes public.</p>
        <form onSubmit={submit}>
          <label><span>Benchmark name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. VBench" required /></label>
          <label><span>GitHub or Hugging Face repository</span><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://github.com/organization/repository" type="url" required /></label>
          {duplicate && <div className="duplicate-warning"><strong>Possible duplicate found</strong><span>{duplicate.name} already uses this name or repository. You can still submit if this is a distinct benchmark or version.</span><a href={`#benchmark/${duplicate.id}`} onClick={onClose}>View existing page →</a></div>}
          {!duplicate && url.length > 8 && <div className="clear-check">✓ No exact repository match found</div>}
          <label><span>Note for the admin <em>Optional</em></span><textarea rows={3} placeholder="Why is this a distinct benchmark? Anything the admin should know?" /></label>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">Submit for review</button></div>
        </form>
        <p className="modal-footnote">There are currently {pending.filter((item) => item.status === "Pending").length} submissions awaiting review.</p>
      </div>
    </div>
  );
}

function AdminView({ pending, setPending, showNotice }: { pending: PendingBenchmark[]; setPending: (items: PendingBenchmark[]) => void; showNotice: (message: string) => void }) {
  const update = (id: number, status: PendingBenchmark["status"]) => {
    setPending(pending.map((item) => item.id === id ? { ...item, status } : item));
    showNotice(`Submission marked ${status.toLowerCase()}.`);
  };
  const active = pending.filter((item) => item.status === "Pending");

  return (
    <div className="admin-page">
      <div className="breadcrumbs"><a href="#home">Open Benchmark Review</a><span>/</span><span>Admin</span></div>
      <section className="admin-heading"><div><p className="eyebrow">Prototype moderation</p><h1>Benchmark submissions</h1><p>Keep one canonical page per benchmark. Check the official source, resolve duplicates and publish legitimate entries.</p></div><div className="queue-count"><strong>{active.length}</strong><span>awaiting review</span></div></section>
      <div className="admin-tabs"><button className="active">Pending <span>{active.length}</span></button><button>History</button><button>Reported comments</button></div>
      <div className="admin-layout">
        <section className="queue-list">
          {active.map((item) => (
            <article className="queue-card" key={item.id}>
              <div className="queue-top"><div><span className="pending-label">Pending</span><h2>{item.name}</h2><a href={item.url} target="_blank" rel="noreferrer">{item.url} ↗</a></div><div className="submitted-by"><span>Submitted by</span><strong>@{item.submitter}</strong></div></div>
              {item.possibleDuplicate ? <div className="duplicate-panel"><div className="duplicate-icon">!</div><div><strong>Possible duplicate detected</strong><p>This source may already be represented by <a href="#benchmark/vbench">{item.possibleDuplicate}</a>. Confirm whether it is a new benchmark, a version, or an alias.</p></div></div> : <div className="source-clear"><span>✓</span><div><strong>No exact source match</strong><p>The repository and normalized benchmark name are not currently indexed.</p></div></div>}
              <div className="queue-actions"><button className="approve" onClick={() => update(item.id, "Approved")}>Approve benchmark</button>{item.possibleDuplicate && <button onClick={() => update(item.id, "Merged")}>Merge with {item.possibleDuplicate}</button>}<button onClick={() => update(item.id, "Rejected")}>Reject</button></div>
            </article>
          ))}
          {active.length === 0 && <div className="empty-state"><h3>Review queue is clear</h3><p>New benchmark submissions will appear here.</p></div>}
        </section>
        <aside className="admin-guidance"><h2>Quick review checklist</h2><ol><li><span>1</span><p><strong>Open the source</strong>Confirm it is a real benchmark repository or Hugging Face page.</p></li><li><span>2</span><p><strong>Search aliases</strong>Check abbreviations, prior versions and paper titles.</p></li><li><span>3</span><p><strong>Choose one action</strong>Approve a distinct benchmark, merge a duplicate, or reject spam.</p></li></ol><p className="guidance-note">Submitting a benchmark does not grant ownership of its page.</p></aside>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div><strong>OpenBenchmarkReview</strong><span>Open source · Community moderated · Independent</span></div>
      <nav><a href="#home">Benchmarks</a><a href="#about">About</a><a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a></nav>
      <p>Initiated by Weihang Guo.</p>
    </footer>
  );
}

export default App;
