import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  authRedirectUrl,
  backendConfigured,
  githubAvatar,
  githubName,
  initials,
  supabase,
} from "./lib/supabase";

type Category = "Video generation" | "Robotics";
type AuthProvider = "github" | "google";

type Benchmark = {
  id: string;
  databaseId?: string;
  name: string;
  fullName: string;
  summary: string;
  category: Category;
  tags: string[];
  year: number;
  venue: string;
  repo: string;
  paper: string;
  comments: number;
  updated: string;
};

type Comment = {
  id: string;
  userId?: string;
  parentId?: string;
  author: string;
  initials: string;
  avatar?: string;
  affiliation: string;
  tag: string;
  rating?: number;
  confidence?: number;
  body: string;
  evidence?: string;
  version?: string;
  helpful: number;
  voted: boolean;
  time: string;
};

type PendingBenchmark = {
  id: string;
  name: string;
  url: string;
  submitter: string;
  note?: string;
};

const fallbackBenchmarks: Benchmark[] = [
  {
    id: "vbench",
    name: "VBench",
    fullName: "Comprehensive Benchmark Suite for Video Generative Models",
    summary: "A multi-dimensional evaluation suite for text-to-video and image-to-video generation, with dedicated prompt sets and automatic metrics.",
    category: "Video generation",
    tags: ["Text-to-video", "Image-to-video", "16 dimensions"],
    year: 2024,
    venue: "CVPR",
    repo: "https://github.com/Vchitect/VBench",
    paper: "https://openaccess.thecvf.com/content/CVPR2024/html/Huang_VBench_Comprehensive_Benchmark_Suite_for_Video_Generative_Models_CVPR_2024_paper.html",
    comments: 0,
    updated: "Starter catalog",
  },
  {
    id: "libero",
    name: "LIBERO",
    fullName: "Benchmarking Knowledge Transfer for Lifelong Robot Learning",
    summary: "A lifelong robot learning benchmark with procedurally generated manipulation tasks for studying knowledge transfer across objects, spatial relationships, goals, and long-horizon behaviors.",
    category: "Robotics",
    tags: ["Robot manipulation", "Lifelong learning", "130 tasks"],
    year: 2023,
    venue: "NeurIPS",
    repo: "https://github.com/Lifelong-Robot-Learning/LIBERO",
    paper: "https://arxiv.org/abs/2306.03310",
    comments: 0,
    updated: "Starter catalog",
  },
  {
    id: "robotwin",
    name: "RoboTwin",
    fullName: "Dual-Arm Robot Benchmark with Generative Digital Twins",
    summary: "A scalable benchmark and data-generation platform for robust bimanual robotic manipulation with diverse tasks, objects, and strong domain randomization.",
    category: "Robotics",
    tags: ["Bimanual manipulation", "Digital twins", "50 tasks"],
    year: 2025,
    venue: "CVPR",
    repo: "https://github.com/RoboTwin-Platform/RoboTwin",
    paper: "https://arxiv.org/abs/2506.18088",
    comments: 0,
    updated: "Starter catalog",
  },
];

function relativeTime(value?: string) {
  if (!value) return "No activity yet";
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(elapsed / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

function normalizeSource(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
}

function App() {
  const [hash, setHash] = useState(() => window.location.hash || "#home");
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>(fallbackBenchmarks);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"user" | "admin">("user");
  const [authLoading, setAuthLoading] = useState(backendConfigured);
  const [databaseReady, setDatabaseReady] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4200);
  }, []);

  const loadCatalog = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("benchmarks")
      .select("id, slug, name, full_name, summary, category, tags, year, venue, updated_at, benchmark_sources(source_type, url)")
      .eq("status", "published")
      .in("category", ["Video generation", "Robotics"])
      .order("name");

    if (error) {
      setDatabaseReady(false);
      return;
    }

    const { data: commentRows } = await supabase
      .from("comments")
      .select("benchmark_id")
      .eq("status", "published");
    const counts = new Map<string, number>();
    for (const row of commentRows ?? []) {
      counts.set(row.benchmark_id, (counts.get(row.benchmark_id) ?? 0) + 1);
    }

    const mapped: Benchmark[] = (data ?? []).map((row) => {
      const sources = (row.benchmark_sources ?? []) as Array<{ source_type: string; url: string }>;
      const repo = sources.find((source) => ["github", "huggingface", "project_page"].includes(source.source_type))?.url ?? "";
      const paper = sources.find((source) => source.source_type === "paper")?.url ?? repo;
      return {
        id: row.slug,
        databaseId: row.id,
        name: row.name,
        fullName: row.full_name,
        summary: row.summary,
        category: row.category as Category,
        tags: row.tags ?? [],
        year: row.year ?? new Date().getFullYear(),
        venue: row.venue || "",
        repo,
        paper,
        comments: counts.get(row.id) ?? 0,
        updated: relativeTime(row.updated_at),
      };
    });

    setBenchmarks(mapped);
    setDatabaseReady(true);
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      setHash(window.location.hash || "#home");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !user) {
      setRole("user");
      setPendingCount(0);
      return;
    }
    const client = supabase;
    void client.from("profiles").select("role").eq("id", user.id).maybeSingle().then(({ data }) => {
      const nextRole = data?.role === "admin" ? "admin" : "user";
      setRole(nextRole);
      if (nextRole === "admin") {
        void client.from("benchmarks").select("id", { count: "exact", head: true }).eq("status", "pending").then(({ count }) => setPendingCount(count ?? 0));
      }
    });

    const returnHash = localStorage.getItem("obr-return-hash");
    if (returnHash) {
      localStorage.removeItem("obr-return-hash");
      window.location.hash = returnHash;
    }
    if (localStorage.getItem("obr-open-submit-after-auth") === "true") {
      localStorage.removeItem("obr-open-submit-after-auth");
      setSubmitOpen(true);
    }
  }, [user]);

  const goToLogin = useCallback((returnHash = window.location.hash || "#home") => {
    localStorage.setItem("obr-return-hash", returnHash === "#login" ? "#home" : returnHash);
    window.location.hash = "#login";
  }, []);

  const signIn = useCallback(async (provider: AuthProvider) => {
    if (!supabase) {
      showNotice("The shared backend is not configured yet.");
      return;
    }
    if (!localStorage.getItem("obr-return-hash")) localStorage.setItem("obr-return-hash", "#home");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: authRedirectUrl(),
        ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}),
      },
    });
    if (error) showNotice(error.message);
  }, [showNotice]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (!error) window.location.hash = "#home";
    showNotice(error ? error.message : "Signed out.");
  }, [showNotice]);

  const openSubmit = () => {
    if (!user) {
      localStorage.setItem("obr-open-submit-after-auth", "true");
      showNotice("Please log in to add a benchmark (you don't need to be the author of the benchmark).");
      goToLogin("#home");
      return;
    }
    if (!databaseReady) {
      showNotice("The database tables still need to be initialized in Supabase.");
      return;
    }
    setSubmitOpen(true);
  };

  const selectedId = hash.startsWith("#benchmark/") ? hash.split("/")[1] : null;
  const selected = benchmarks.find((benchmark) => benchmark.id === selectedId);

  return (
    <div className="app-shell">
      <Header
        user={user}
        role={role}
        authLoading={authLoading}
        pendingCount={pendingCount}
        openSubmit={openSubmit}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      {!databaseReady && backendConfigured && (
        <div className="setup-notice">Database setup is pending. The public starter catalog is shown until the Supabase schema is installed.</div>
      )}
      <main>
        {hash === "#login" ? (
          <LoginPage user={user} authLoading={authLoading} signIn={signIn} />
        ) : hash === "#account" ? (
          <AccountPage user={user} role={role} authLoading={authLoading} goToLogin={goToLogin} signOut={signOut} />
        ) : hash === "#admin" ? (
          <AdminView user={user} role={role} goToLogin={goToLogin} showNotice={showNotice} onQueueChange={setPendingCount} />
        ) : selected ? (
          <BenchmarkView
            benchmark={selected}
            user={user}
            role={role}
            databaseReady={databaseReady}
            goToLogin={goToLogin}
            showNotice={showNotice}
            refreshCatalog={loadCatalog}
          />
        ) : (
          <HomeView benchmarks={benchmarks} openSubmit={openSubmit} query={searchQuery} setQuery={setSearchQuery} />
        )}
      </main>
      <Footer />
      {submitOpen && (
        <SubmitDialog
          benchmarks={benchmarks}
          pendingCount={role === "admin" ? pendingCount : undefined}
          onClose={() => setSubmitOpen(false)}
          onSubmit={async ({ name, url, category, note }) => {
            if (!supabase) return false;
            const { error } = await supabase.rpc("submit_benchmark", {
              p_name: name,
              p_source_url: url,
              p_category: category,
              p_note: note || null,
            });
            if (error) {
              showNotice(error.message);
              return false;
            }
            setSubmitOpen(false);
            if (role === "admin") setPendingCount((count) => count + 1);
            showNotice("Submitted for duplicate checking and admin review.");
            return true;
          }}
        />
      )}
      {notice && <div className="toast" role="status">{notice}</div>}
    </div>
  );
}

function Header({
  user,
  role,
  authLoading,
  pendingCount,
  openSubmit,
  searchQuery,
  setSearchQuery,
}: {
  user: User | null;
  role: "user" | "admin";
  authLoading: boolean;
  pendingCount: number;
  openSubmit: () => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}) {
  const name = githubName(user);
  const avatar = githubAvatar(user);
  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#home" aria-label="Open Benchmark Review home"><span className="brand-name">OpenBenchmarkReview</span></a>
          <label className="header-search">
            <input value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); if (window.location.hash !== "#home") window.location.hash = "#home"; }} aria-label="Search benchmarks by name" placeholder="Search benchmark names…" />
            <span>⌕</span>
          </label>
          <nav className="nav-links" aria-label="Primary navigation">
            <button className="text-button" onClick={openSubmit}>Add benchmark</button>
            {role === "admin" && <a href="#admin" className="admin-link">Admin {pendingCount > 0 && <span>{pendingCount}</span>}</a>}
            {user ? (
              <a className="profile-button account-button" href="#account" title="Open account">
                {avatar ? <img src={avatar} alt="" /> : <span className="mini-avatar">{initials(name)}</span>}
                <span>{name}</span>
              </a>
            ) : (
              authLoading ? <span className="auth-loading">Loading…</span> : <a className="sign-in-button" href="#login">Login</a>
            )}
          </nav>
        </div>
      </header>
      <div className="site-subnav">
        <div>
          <span>Open benchmarks. Open discussion. Better evidence.</span>
          <nav><a href="#home">Benchmarks</a><a href="https://github.com/WeihangGuo/open-benchmark-review" target="_blank" rel="noreferrer">Open source</a></nav>
        </div>
      </div>
    </>
  );
}

function LoginPage({ user, authLoading, signIn }: { user: User | null; authLoading: boolean; signIn: (provider: AuthProvider) => Promise<void> }) {
  const name = githubName(user);
  return (
    <div className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Community account</p>
        {user ? (
          <>
            <h1>You are already signed in</h1>
            <p>Continue as <strong>@{name}</strong>, or open your account page to view your activity and account controls.</p>
            <a className="primary-button auth-action" href="#account">Open my account</a>
          </>
        ) : (
          <>
            <h1>Login</h1>
            <p>Use GitHub or Google to submit benchmarks, comment, reply, and vote. Authorization starts only after you choose a provider below.</p>
            <div className="oauth-options">
              <button className="oauth-login-button github-login-button" disabled={authLoading} onClick={() => void signIn("github")}>
                <span className="github-mark" aria-hidden="true">GH</span>
                {authLoading ? "Checking session…" : "Continue with GitHub"}
              </button>
              <button className="oauth-login-button google-login-button" disabled={authLoading} onClick={() => void signIn("google")}>
                <span className="google-mark" aria-hidden="true">G</span>
                Continue with Google
              </button>
            </div>
            <p className="auth-note">Google will ask you to choose an account. GitHub may reuse the account currently signed in within this browser.</p>
          </>
        )}
        <a className="back-link" href="#home">← Back to benchmarks</a>
      </section>
    </div>
  );
}

function AccountPage({ user, role, authLoading, goToLogin, signOut }: {
  user: User | null;
  role: "user" | "admin";
  authLoading: boolean;
  goToLogin: (returnHash?: string) => void;
  signOut: () => Promise<void>;
}) {
  const [activity, setActivity] = useState({ comments: 0, submissions: 0 });
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    if (!supabase || !user) return;
    setActivityLoading(true);
    void Promise.all([
      supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("benchmarks").select("id", { count: "exact", head: true }).eq("submitted_by", user.id),
    ]).then(([commentsResult, submissionsResult]) => {
      setActivity({ comments: commentsResult.count ?? 0, submissions: submissionsResult.count ?? 0 });
      setActivityLoading(false);
    });
  }, [user]);

  if (authLoading) return <div className="account-page access-panel"><p>Checking your account…</p></div>;
  if (!user) return <div className="account-page access-panel"><h1>Account</h1><p>Sign in to view your profile and community activity.</p><button className="primary-button" onClick={() => goToLogin("#account")}>Go to login</button></div>;

  const name = githubName(user);
  const avatar = githubAvatar(user);
  const githubUsername = user.user_metadata?.user_name || user.user_metadata?.preferred_username || "";
  const authProvider = user.app_metadata?.provider === "google" ? "Google" : "GitHub";

  return (
    <div className="account-page">
      <div className="breadcrumbs"><a href="#home">Open Benchmark Review</a><span>/</span><span>Account</span></div>
      <section className="account-heading">
        {avatar ? <img src={avatar} alt="" /> : <span className="account-avatar">{initials(name)}</span>}
        <div><p className="eyebrow">Community account</p><h1>{name}</h1><p>Signed in with {authProvider} · <span className="account-role">{role === "admin" ? "Administrator" : "Community member"}</span></p></div>
      </section>
      <div className="account-layout">
        <section className="account-panel">
          <h2>My activity</h2>
          <div className="account-stats">
            <div><strong>{activityLoading ? "–" : activity.comments}</strong><span>Comments</span></div>
            <div><strong>{activityLoading ? "–" : activity.submissions}</strong><span>Benchmark submissions</span></div>
          </div>
          <p>Your comments and submissions are attributed to this {authProvider} identity.</p>
        </section>
        <aside className="account-panel account-controls">
          <h2>Account</h2>
          {authProvider === "GitHub" && githubUsername && <a href={`https://github.com/${githubUsername}`} target="_blank" rel="noreferrer">View GitHub profile ↗</a>}
          {role === "admin" && <a href="#admin">Open admin queue →</a>}
          <button className="secondary-button sign-out-control" onClick={() => void signOut()}>Sign out</button>
        </aside>
      </div>
    </div>
  );
}

function HomeView({ benchmarks, openSubmit, query, setQuery }: { benchmarks: Benchmark[]; openSubmit: () => void; query: string; setQuery: (value: string) => void }) {
  const [category, setCategory] = useState("All benchmarks");
  const [promptVisible, setPromptVisible] = useState(true);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return benchmarks.filter((benchmark) => {
      const matchesCategory = category === "All benchmarks" || benchmark.category === category;
      const matchesQuery = !normalized || benchmark.name.toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [benchmarks, category, query]);
  const commentCount = benchmarks.reduce((sum, benchmark) => sum + benchmark.comments, 0);

  return (
    <div className="content-page">
      <section className="page-intro"><p className="guest-comment-notice">No login required to comment.</p><button className="primary-button" onClick={openSubmit}>Add a benchmark</button></section>
      {promptVisible && <aside className="community-prompt"><button aria-label="Dismiss" onClick={() => setPromptVisible(false)}>×</button><strong>What do you wish you had known before using this benchmark?</strong><span>Share a specific experience, version, limitation, or piece of evidence. Comments are public and community-moderated.</span></aside>}
      <section className="browse-section" id="browse">
        <div className="section-heading"><div><h2>All benchmarks</h2></div><p>{filtered.length} results · {commentCount} comments</p></div>
        <div className="search-row">
          <label className="search-box"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search benchmark names…" aria-label="Search benchmarks by name" /></label>
          <div className="filter-tabs" role="group" aria-label="Filter by category">
            {["All benchmarks", "Video generation", "Robotics"].map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
          </div>
        </div>
        <div className="benchmark-list">
          {filtered.map((benchmark) => <BenchmarkCard key={benchmark.id} benchmark={benchmark} />)}
          {filtered.length === 0 && <div className="empty-state"><h3>No matching benchmark yet</h3><p>Try a broader search, or help the community by adding it.</p><button className="primary-button" onClick={openSubmit}>Add a benchmark</button></div>}
        </div>
      </section>
    </div>
  );
}

function BenchmarkCard({ benchmark }: { benchmark: Benchmark }) {
  return (
    <article className="benchmark-card">
      <div className="benchmark-main">
        <div className="benchmark-title-row"><div className="benchmark-heading"><div className="benchmark-name-line"><a href={`#benchmark/${benchmark.id}`}><h3>{benchmark.name}</h3></a><span className={`category-badge ${benchmark.category === "Video generation" ? "generation" : "robotics"}`}>{benchmark.category}</span></div><p className="full-name">{benchmark.fullName}</p></div></div>
        <p className="benchmark-summary">{benchmark.summary}</p>
      </div>
      <div className="benchmark-meta">
        <div><span>Introduced</span><strong>{benchmark.venue} {benchmark.year}</strong></div><div><span>Discussion</span><strong>{benchmark.comments} comments</strong></div><div><span>Last activity</span><strong>{benchmark.updated}</strong></div><a className="view-link" href={`#benchmark/${benchmark.id}`}>View discussion <span>→</span></a>
      </div>
    </article>
  );
}

function BenchmarkView({ benchmark, user, role, databaseReady, goToLogin, showNotice, refreshCatalog }: {
  benchmark: Benchmark;
  user: User | null;
  role: "user" | "admin";
  databaseReady: boolean;
  goToLogin: (returnHash?: string) => void;
  showNotice: (message: string) => void;
  refreshCatalog: () => Promise<void>;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [filterTag, setFilterTag] = useState("All comments");
  const [commentTag, setCommentTag] = useState("General");
  const [commentRating, setCommentRating] = useState<number | "">("");
  const [commentConfidence, setCommentConfidence] = useState<number | "">("");
  const [commentText, setCommentText] = useState("");
  const [guestName, setGuestName] = useState("");
  const [posting, setPosting] = useState(false);
  const [activeSection, setActiveSection] = useState<"overview" | "discussion" | "sources">("overview");

  const scrollToSection = (section: "overview" | "discussion" | "sources") => {
    setActiveSection(section);
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const loadComments = useCallback(async () => {
    if (!supabase || !benchmark.databaseId || !databaseReady) {
      setComments([]);
      return;
    }
    const { data: rows, error } = await supabase.from("comments").select("id, user_id, guest_name, parent_id, content, tag, rating, confidence, benchmark_version, evidence_url, created_at").eq("benchmark_id", benchmark.databaseId).eq("status", "published").order("created_at", { ascending: true });
    if (error) {
      showNotice(error.message);
      return;
    }
    const userIds = [...new Set((rows ?? []).map((row) => row.user_id).filter(Boolean))];
    const commentIds = (rows ?? []).map((row) => row.id);
    const [{ data: profiles }, { data: votes }] = await Promise.all([
      userIds.length ? supabase.from("profiles").select("id, username, avatar_url").in("id", userIds) : Promise.resolve({ data: [] }),
      commentIds.length ? supabase.from("comment_votes").select("comment_id, user_id").in("comment_id", commentIds) : Promise.resolve({ data: [] }),
    ]);
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    const voteCount = new Map<string, number>();
    const myVotes = new Set<string>();
    for (const vote of votes ?? []) {
      voteCount.set(vote.comment_id, (voteCount.get(vote.comment_id) ?? 0) + 1);
      if (vote.user_id === user?.id) myVotes.add(vote.comment_id);
    }
    setComments((rows ?? []).map((row) => {
      const profile = profileMap.get(row.user_id);
      const name = profile?.username || row.guest_name || "Guest";
      return {
        id: row.id,
        userId: row.user_id || undefined,
        parentId: row.parent_id || undefined,
        author: name,
        initials: initials(name),
        avatar: profile?.avatar_url || undefined,
        affiliation: profile ? "Community member" : "Guest commenter",
        tag: row.tag,
        rating: row.rating ?? undefined,
        confidence: row.confidence ?? undefined,
        body: row.content,
        evidence: row.evidence_url || undefined,
        version: row.benchmark_version || undefined,
        helpful: voteCount.get(row.id) ?? 0,
        voted: myVotes.has(row.id),
        time: relativeTime(row.created_at),
      };
    }));
  }, [benchmark.databaseId, databaseReady, showNotice, user?.id]);

  useEffect(() => { void loadComments(); }, [loadComments]);
  const visibleComments = filterTag === "All comments" ? comments : comments.filter((comment) => comment.tag === filterTag);

  const submitComment = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !databaseReady || !benchmark.databaseId || commentText.trim().length < 2) return;
    if (!commentRating || !commentConfidence) {
      showNotice("Please select a rating and confidence level.");
      return;
    }
    if (!user && guestName.trim().length < 2) {
      showNotice("Please enter a display name to comment.");
      return;
    }
    setPosting(true);
    const { error } = await supabase.from("comments").insert({ benchmark_id: benchmark.databaseId, user_id: user?.id ?? null, guest_name: user ? null : guestName.trim(), parent_id: null, content: commentText.trim(), tag: commentTag, rating: commentRating, confidence: commentConfidence });
    setPosting(false);
    if (error) {
      showNotice(error.message);
      return;
    }
    setCommentText("");
    setCommentRating("");
    setCommentConfidence("");
    await Promise.all([loadComments(), refreshCatalog()]);
    showNotice("Comment posted.");
  };

  const toggleHelpful = async (comment: Comment) => {
    if (!user) {
      goToLogin(`#benchmark/${benchmark.id}`);
      return;
    }
    if (!supabase) return;
    const request = comment.voted
      ? supabase.from("comment_votes").delete().eq("comment_id", comment.id).eq("user_id", user.id)
      : supabase.from("comment_votes").insert({ comment_id: comment.id, user_id: user.id });
    const { error } = await request;
    if (error) showNotice(error.message); else void loadComments();
  };

  const editComment = async (comment: Comment) => {
    if (!supabase) return;
    const next = window.prompt("Edit your comment", comment.body)?.trim();
    if (!next || next === comment.body) return;
    const { error } = await supabase.from("comments").update({ content: next }).eq("id", comment.id);
    if (error) showNotice(error.message); else void loadComments();
  };

  const deleteComment = async (comment: Comment) => {
    if (!supabase || !window.confirm("Delete this comment?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", comment.id);
    if (error) showNotice(error.message); else {
      await Promise.all([loadComments(), refreshCatalog()]);
      showNotice("Comment deleted.");
    }
  };

  const hideComment = async (comment: Comment) => {
    if (!supabase || !window.confirm("Hide this comment from the public discussion?")) return;
    const { error } = await supabase.from("comments").update({ status: "hidden" }).eq("id", comment.id);
    if (error) showNotice(error.message); else {
      await Promise.all([loadComments(), refreshCatalog()]);
      showNotice("Comment hidden.");
    }
  };

  const reportComment = async (comment: Comment) => {
    if (!user) {
      goToLogin(`#benchmark/${benchmark.id}`);
      return;
    }
    if (!supabase) return;
    const reason = window.prompt("Why are you reporting this comment?")?.trim();
    if (!reason) return;
    const { error } = await supabase.from("reports").insert({ reporter_id: user.id, benchmark_id: benchmark.databaseId, comment_id: comment.id, reason });
    showNotice(error ? error.message : "Report submitted for moderation.");
  };

  return (
    <div className="detail-page">
      <div className="breadcrumbs"><a href="#home">Benchmarks</a><span>/</span><span>{benchmark.name}</span></div>
      <section className="detail-hero">
        <div className="detail-copy"><div className="detail-label-row"><span className={`category-badge ${benchmark.category === "Video generation" ? "generation" : "robotics"}`}>{benchmark.category}</span><span className="status-dot"><i /> Open discussion</span></div><h1>{benchmark.name}</h1>{benchmark.fullName && <p className="detail-full-name">{benchmark.fullName}</p>}<p className="detail-summary">{benchmark.summary}</p><div className="source-links" id="sources">{benchmark.paper && <a href={benchmark.paper} target="_blank" rel="noreferrer">Paper ↗</a>}{benchmark.repo && <a href={benchmark.repo} target="_blank" rel="noreferrer">Official source ↗</a>}</div></div>
        <aside className="fact-card"><h2>Benchmark facts</h2><dl><div><dt>Introduced</dt><dd>{benchmark.venue} {benchmark.year}</dd></div><div><dt>Primary task</dt><dd>{benchmark.category}</dd></div><div><dt>Source status</dt><dd><span className="verified">✓ Indexed</span></dd></div><div><dt>Comments</dt><dd>{comments.length}</dd></div></dl><button className="plain-link" onClick={() => document.getElementById("comment-form")?.scrollIntoView({ behavior: "smooth" })}>Join the discussion →</button></aside>
      </section>
      <nav className="detail-tabs" aria-label="Benchmark sections"><button className={activeSection === "overview" ? "active" : ""} onClick={() => scrollToSection("overview")}>Overview</button><button className={activeSection === "discussion" ? "active" : ""} onClick={() => scrollToSection("discussion")}>Comments <span>{comments.length}</span></button><button className={activeSection === "sources" ? "active" : ""} onClick={() => scrollToSection("sources")}>Sources</button></nav>
      <div className="detail-layout">
        <div className="detail-content">
          <section className="overview-panel" id="overview"><p className="eyebrow">Community overview</p><h2>What this benchmark is useful for</h2><p>Community members can use {benchmark.name} to discuss practical experience in <strong>{benchmark.category.toLowerCase()}</strong>, including failure modes, reproducibility, and metric validity.</p><div className="overview-columns"><div><h3>Useful comment topics</h3><ul><li>Reproduction experience</li><li>Known limitations and failure cases</li></ul></div></div><p className="summary-note">This page is community-maintained and should be read alongside the original documentation.</p></section>
          <section className="discussion-section" id="discussion">
            <div className="discussion-heading"><div><p className="eyebrow">Open discussion</p><h2>Community comments</h2></div><select value={filterTag} onChange={(event) => setFilterTag(event.target.value)} aria-label="Filter comments">{["All comments", "Metric validity", "Reproducibility", "Data quality", "General"].map((item) => <option key={item}>{item}</option>)}</select></div>
            <form className="comment-composer" id="comment-form" onSubmit={submitComment}>
              <div className="composer-top"><span className="avatar">{user ? initials(githubName(user)) : initials(guestName || "Guest")}</span><div><strong>{user ? "Add to the discussion" : "Comment without logging in"}</strong><span>Share what you observed and the context needed to interpret it.</span></div></div>
              {databaseReady && <><div className="composer-options"><div className="comment-fields">{!user && <label className="guest-name-field">Display name <input value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="Your name" minLength={2} maxLength={80} required /></label>}<label>Topic <select value={commentTag} onChange={(event) => setCommentTag(event.target.value)}>{["General", "Metric validity", "Reproducibility", "Data quality"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Rating <select value={commentRating} onChange={(event) => setCommentRating(Number(event.target.value) || "")} required><option value="">Select</option>{Array.from({ length: 5 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}{value === 1 ? " — Very weak" : value === 3 ? " — Mixed" : value === 5 ? " — Excellent" : ""}</option>)}</select></label><label>Confidence <select value={commentConfidence} onChange={(event) => setCommentConfidence(Number(event.target.value) || "")} required><option value="">Select</option>{Array.from({ length: 5 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}{value === 1 ? " — Low" : value === 3 ? " — Medium" : value === 5 ? " — High" : ""}</option>)}</select></label></div></div><textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="What do you wish you had known before using this benchmark?" rows={4} minLength={2} required /></>}
              <div className="composer-footer"><span>Be specific, constructive, and link evidence when possible.</span><button className="primary-button" type="submit" disabled={posting || !databaseReady}>{databaseReady ? (posting ? "Posting…" : "Post comment") : "Database pending"}</button></div>
            </form>
            <div className="comments-list">
              {visibleComments.map((comment) => <CommentCard key={comment.id} comment={comment} own={Boolean(user && comment.userId === user.id)} canModerate={role === "admin"} onHelpful={() => void toggleHelpful(comment)} onEdit={() => void editComment(comment)} onHide={() => void hideComment(comment)} onDelete={() => void deleteComment(comment)} onReport={() => void reportComment(comment)} />)}
              {visibleComments.length === 0 && <div className="empty-comments">No comments in this category yet. Start the discussion.</div>}
            </div>
          </section>
        </div>
        <aside className="side-column"><div className="side-card"><h3>Page history</h3><p>Created from the official source.</p><p>Last activity {benchmark.updated}.</p></div><div className="side-card compact"><h3>See something wrong?</h3><p>Use the comment thread to suggest a correction, or report abusive content.</p></div></aside>
      </div>
    </div>
  );
}

function CommentCard({ comment, own, canModerate, onHelpful, onEdit, onHide, onDelete, onReport }: { comment: Comment; own: boolean; canModerate: boolean; onHelpful: () => void; onEdit: () => void; onHide: () => void; onDelete: () => void; onReport: () => void }) {
  return (
    <article className={`comment-card ${comment.parentId ? "reply" : ""}`}>
      <div className="comment-author">{comment.avatar ? <img className="avatar avatar-image" src={comment.avatar} alt="" /> : <span className="avatar">{comment.initials}</span>}<div><strong>{comment.author}</strong><span>{comment.affiliation}</span></div><time>{comment.time}</time></div>
      <div className="comment-tags"><span>{comment.tag}</span>{comment.rating !== undefined && <span className="score">Rating: {comment.rating}/5</span>}{comment.confidence !== undefined && <span className="confidence">Confidence: {comment.confidence}/5</span>}{comment.version && <span className="version">Used {comment.version}</span>}</div><p>{comment.body}</p>{comment.evidence && <div className="evidence"><strong>Evidence</strong><a href={comment.evidence} target="_blank" rel="noreferrer">{comment.evidence}</a></div>}
      <div className="comment-actions"><button className={comment.voted ? "voted" : ""} onClick={onHelpful}>↑ Helpful <span>{comment.helpful}</span></button>{own && <button onClick={onEdit}>Edit</button>}{canModerate && <button className="moderate" onClick={onHide}>Hide</button>}{(own || canModerate) && <button className={canModerate ? "moderate" : ""} onClick={onDelete}>Delete</button>}{!own && !canModerate && <button className="report" onClick={onReport}>Report</button>}</div>
    </article>
  );
}

function SubmitDialog({ benchmarks, pendingCount, onClose, onSubmit }: { benchmarks: Benchmark[]; pendingCount?: number; onClose: () => void; onSubmit: (submission: { name: string; url: string; category: Category; note: string }) => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<Category>("Video generation");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const normalized = normalizeSource(url);
  const repoDuplicate = benchmarks.find((benchmark) => normalized && normalizeSource(benchmark.repo) === normalized);
  const nameDuplicate = benchmarks.find((benchmark) => name.trim().length > 2 && benchmark.name.toLowerCase() === name.trim().toLowerCase());
  const duplicate = repoDuplicate || nameDuplicate;
  const supportedSource = /^https?:\/\/(www\.)?(github\.com|huggingface\.co)\//i.test(url.trim());

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !url.trim() || !supportedSource || repoDuplicate) return;
    setSubmitting(true);
    await onSubmit({ name: name.trim(), url: url.trim(), category, note: note.trim() });
    setSubmitting(false);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="submit-title">
        <div className="modal-header"><div><p className="eyebrow">Community submission</p><h2 id="submit-title">Add a benchmark</h2></div><button onClick={onClose} aria-label="Close">×</button></div><p>Submit the benchmark’s canonical source. An admin will do a quick duplicate check before the page becomes public.</p>
        <form onSubmit={submit}>
          <label><span>Benchmark name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. VBench" required minLength={2} maxLength={160} /></label>
          <label><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value as Category)}><option>Video generation</option><option>Robotics</option></select></label>
          <label><span>GitHub or Hugging Face repository</span><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://github.com/organization/repository" type="url" required /></label>
          {url && !supportedSource && <div className="duplicate-warning"><strong>Unsupported source</strong><span>Please provide a github.com or huggingface.co repository URL.</span></div>}
          {duplicate && <div className="duplicate-warning"><strong>{repoDuplicate ? "This source is already indexed" : "Possible duplicate name"}</strong><span>{duplicate.name} already uses this {repoDuplicate ? "repository" : "name"}. Review the existing page before submitting.</span><a href={`#benchmark/${duplicate.id}`} onClick={onClose}>View existing page →</a></div>}
          {!duplicate && supportedSource && <div className="clear-check">✓ No exact repository match found</div>}
          <label><span>Description <em>Optional</em></span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Briefly describe this benchmark." /></label>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={submitting || !supportedSource || Boolean(repoDuplicate)}>{submitting ? "Submitting…" : "Submit for review"}</button></div>
        </form>
        <p className="modal-footnote">{pendingCount === undefined ? "Submissions are checked before publication." : `${pendingCount} submission${pendingCount === 1 ? "" : "s"} awaiting review.`}</p>
      </div>
    </div>
  );
}

function AdminView({ user, role, goToLogin, showNotice, onQueueChange }: { user: User | null; role: "user" | "admin"; goToLogin: (returnHash?: string) => void; showNotice: (message: string) => void; onQueueChange: (count: number) => void }) {
  const [pending, setPending] = useState<PendingBenchmark[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPending = useCallback(async () => {
    if (!supabase || role !== "admin") return;
    setLoading(true);
    const { data: rows, error } = await supabase.from("benchmarks").select("id, name, submission_note, submitted_by, created_at").eq("status", "pending").order("created_at");
    if (error) {
      showNotice(error.message);
      setLoading(false);
      return;
    }
    const ids = (rows ?? []).map((row) => row.id);
    const submitterIds = [...new Set((rows ?? []).map((row) => row.submitted_by).filter(Boolean))];
    const [{ data: sources }, { data: profiles }] = await Promise.all([
      ids.length ? supabase.from("benchmark_sources").select("benchmark_id, url").in("benchmark_id", ids) : Promise.resolve({ data: [] }),
      submitterIds.length ? supabase.from("profiles").select("id, username").in("id", submitterIds) : Promise.resolve({ data: [] }),
    ]);
    const sourceMap = new Map((sources ?? []).map((source) => [source.benchmark_id, source.url]));
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.username]));
    const next = (rows ?? []).map((row) => ({ id: row.id, name: row.name, url: sourceMap.get(row.id) ?? "", submitter: profileMap.get(row.submitted_by) ?? "unknown", note: row.submission_note || undefined }));
    setPending(next);
    onQueueChange(next.length);
    setLoading(false);
  }, [onQueueChange, role, showNotice]);

  useEffect(() => { void loadPending(); }, [loadPending]);

  const update = async (item: PendingBenchmark, action: "published" | "rejected" | "merged") => {
    if (!supabase || !user) return;
    const updateValues: Record<string, string | null> = { status: action };
    if (action === "published") updateValues.published_at = new Date().toISOString();
    if (action === "merged") {
      const slug = window.prompt("Canonical benchmark slug to merge into (for example: vbench)")?.trim();
      if (!slug) return;
      const { data: target, error: targetError } = await supabase.from("benchmarks").select("id").eq("slug", slug).eq("status", "published").maybeSingle();
      if (targetError || !target) {
        showNotice(targetError?.message || "Published benchmark not found.");
        return;
      }
      updateValues.merged_into = target.id;
    }
    const { error } = await supabase.from("benchmarks").update(updateValues).eq("id", item.id);
    if (error) {
      showNotice(error.message);
      return;
    }
    await supabase.from("moderation_actions").insert({ admin_id: user.id, action, target_type: "benchmark", target_id: item.id });
    showNotice(`Submission marked ${action}.`);
    void loadPending();
  };

  if (!user) return <div className="admin-page access-panel"><h1>Admin</h1><p>Sign in with the administrator GitHub account to review submissions.</p><button className="primary-button" onClick={() => goToLogin("#admin")}>Go to login</button></div>;
  if (role !== "admin") return <div className="admin-page access-panel"><h1>Admin</h1><p>Your account does not have administrator access.</p><a href="#home" className="view-link">Return to benchmarks →</a></div>;

  return (
    <div className="admin-page">
      <div className="breadcrumbs"><a href="#home">Open Benchmark Review</a><span>/</span><span>Admin</span></div>
      <section className="admin-heading"><div><p className="eyebrow">Moderation</p><h1>Benchmark submissions</h1><p>Keep one canonical page per benchmark. Check the official source, resolve duplicates and publish legitimate entries.</p></div><div className="queue-count"><strong>{pending.length}</strong><span>awaiting review</span></div></section>
      <div className="admin-tabs"><button className="active">Pending <span>{pending.length}</span></button></div>
      <div className="admin-layout">
        <section className="queue-list">
          {pending.map((item) => <article className="queue-card" key={item.id}><div className="queue-top"><div><span className="pending-label">Pending</span><h2>{item.name}</h2><a href={item.url} target="_blank" rel="noreferrer">{item.url} ↗</a></div><div className="submitted-by"><span>Submitted by</span><strong>@{item.submitter}</strong></div></div>{item.note && <div className="submission-note"><strong>Description</strong><p>{item.note}</p></div>}<div className="source-clear"><span>✓</span><div><strong>Source saved</strong><p>Open the repository and search aliases before approving.</p></div></div><div className="queue-actions"><button className="approve" onClick={() => void update(item, "published")}>Approve benchmark</button><button onClick={() => void update(item, "merged")}>Merge duplicate</button><button onClick={() => void update(item, "rejected")}>Reject</button></div></article>)}
          {!loading && pending.length === 0 && <div className="empty-state"><h3>Review queue is clear</h3><p>New benchmark submissions will appear here.</p></div>}{loading && <div className="empty-state">Loading submissions…</div>}
        </section>
        <aside className="admin-guidance"><h2>Quick review checklist</h2><ol><li><span>1</span><p><strong>Open the source</strong>Confirm it is a real benchmark repository or Hugging Face page.</p></li><li><span>2</span><p><strong>Search aliases</strong>Check abbreviations, prior versions and paper titles.</p></li><li><span>3</span><p><strong>Choose one action</strong>Approve a distinct benchmark, merge a duplicate, or reject spam.</p></li></ol><p className="guidance-note">Submitting a benchmark does not grant ownership of its page.</p></aside>
      </div>
    </div>
  );
}

function Footer() {
  return <footer className="site-footer"><div><strong>OpenBenchmarkReview</strong><span>Open source · Community moderated · Independent</span></div><nav><a href="#home">Benchmarks</a><a href="https://github.com/WeihangGuo/open-benchmark-review" target="_blank" rel="noreferrer">GitHub</a></nav></footer>;
}

export default App;
