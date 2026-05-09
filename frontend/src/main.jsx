import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Library,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Shield,
  Upload,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const roleAccess = {
  admin: ["books", "members", "borrowing", "analytics", "upload", "users", "tests"],
  user: ["books", "members", "borrowing", "analytics", "upload", "tests"],
  member: ["books", "borrowing", "tests"],
};

const navItems = [
  { id: "books", label: "Books", icon: BookOpen },
  { id: "members", label: "Members", icon: Users },
  { id: "borrowing", label: "Borrowing", icon: Library },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "upload", label: "CSV Upload", icon: Upload },
  { id: "users", label: "Users", icon: Shield },
  { id: "tests", label: "API Tests", icon: ClipboardCheck },
];

function App() {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem("libtrack_auth");
    return saved ? JSON.parse(saved) : null;
  });
  const [active, setActive] = useState("books");
  const [toast, setToast] = useState(null);

  const allowedTabs = useMemo(() => roleAccess[auth?.role] || [], [auth]);

  useEffect(() => {
    if (auth) {
      localStorage.setItem("libtrack_auth", JSON.stringify(auth));
    } else {
      localStorage.removeItem("libtrack_auth");
    }
  }, [auth]);

  useEffect(() => {
    if (auth && !allowedTabs.includes(active)) {
      setActive(allowedTabs[0] || "books");
    }
  }, [active, allowedTabs, auth]);

  function notify(message, type = "success") {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2600);
  }

  if (!auth) {
    return <AuthScreen onAuth={setAuth} notify={notify} toast={toast} />;
  }

  const ActiveIcon = navItems.find((item) => item.id === active)?.icon || BookOpen;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-zinc-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-emerald-700 text-white">
            <Library size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold">LibTrack</p>
            <p className="text-xs text-zinc-500">Library Control</p>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {navItems
            .filter((item) => allowedTabs.includes(item.id))
            .map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  className={`flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm font-medium ${
                    active === item.id
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                  }`}
                  title={item.label}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-900 text-white lg:hidden">
                <ActiveIcon size={20} />
              </div>
              <div>
                <h1 className="text-lg font-semibold">{navItems.find((item) => item.id === active)?.label}</h1>
                <p className="text-sm text-zinc-500">{auth.username} · {auth.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="h-10 rounded border border-zinc-300 bg-white px-3 text-sm lg:hidden"
                value={active}
                onChange={(event) => setActive(event.target.value)}
              >
                {navItems
                  .filter((item) => allowedTabs.includes(item.id))
                  .map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
              </select>
              <button
                onClick={() => setAuth(null)}
                className="inline-flex h-10 items-center gap-2 rounded border border-zinc-300 bg-white px-3 text-sm font-medium hover:bg-zinc-100"
                title="Log out"
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8">
          {active === "books" && <BooksPanel auth={auth} notify={notify} />}
          {active === "members" && <MembersPanel auth={auth} notify={notify} />}
          {active === "borrowing" && <BorrowingPanel auth={auth} notify={notify} />}
          {active === "analytics" && <AnalyticsPanel auth={auth} />}
          {active === "upload" && <UploadPanel auth={auth} notify={notify} />}
          {active === "users" && <UsersPanel auth={auth} notify={notify} />}
          {active === "tests" && <ApiTestsPanel auth={auth} />}
        </main>
      </div>
      {toast && <Toast toast={toast} />}
    </div>
  );
}

function AuthScreen({ onAuth, notify, toast }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    username: "dixitprince895@gmail.com",
    password: "Pd27482@",
    role: "member",
  });
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const path = mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
      const data = await apiRequest(path, {
        method: "POST",
        body: JSON.stringify(form),
      });

      if (mode === "register") {
        notify(`Registered as ${data.role}. Login now.`);
        setMode("login");
      } else {
        onAuth({
          token: data.access_token,
          role: data.role,
          username: form.username,
        });
      }
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between bg-[linear-gradient(135deg,#064e3b,#0f766e_48%,#18181b)] p-8 lg:p-12">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded bg-white text-emerald-800">
              <Library size={24} />
            </div>
            <div>
              <p className="font-semibold">LibTrack</p>
              <p className="text-sm text-emerald-100">Smart Library Console</p>
            </div>
          </div>
          <div className="max-w-2xl py-16">
            <h1 className="text-4xl font-semibold leading-tight lg:text-6xl">LibTrack API Console</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-emerald-50">
              Manage books, members, borrowing, uploads, analytics, users, and endpoint validation from one role-aware workspace.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-emerald-50 sm:grid-cols-3">
            <Metric label="Roles" value="3" />
            <Metric label="Protected APIs" value="All" />
            <Metric label="Tests" value="Built in" />
          </div>
        </section>

        <section className="flex items-center justify-center bg-white p-6 text-zinc-950">
          <div className="w-full max-w-md">
            <div className="mb-6 flex rounded border border-zinc-200 bg-zinc-100 p-1">
              <button
                className={`h-10 flex-1 rounded text-sm font-semibold ${mode === "login" ? "bg-white shadow-sm" : "text-zinc-500"}`}
                onClick={() => setMode("login")}
              >
                Login
              </button>
              <button
                className={`h-10 flex-1 rounded text-sm font-semibold ${mode === "register" ? "bg-white shadow-sm" : "text-zinc-500"}`}
                onClick={() => setMode("register")}
              >
                Register
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <TextInput label="Username" value={form.username} onChange={(value) => setForm({ ...form, username: value })} />
              <TextInput label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
              {mode === "register" && (
                <InfoBox>
                  Public registration creates a member account. Admin and staff users must be created by an admin.
                </InfoBox>
              )}
              <button
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                <LogIn size={18} />
                {loading ? "Please wait" : mode === "login" ? "Login" : "Create Member Account"}
              </button>
            </form>
          </div>
        </section>
      </div>
      {toast && <Toast toast={toast} />}
    </div>
  );
}

function BooksPanel({ auth, notify }) {
  const [books, setBooks] = useState([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "",
    quantity: 1,
    available_copies: 1,
    shelf_location: "",
  });

  const canManage = ["admin", "user"].includes(auth.role);
  const visibleBooks = filterRows(books, query, ["_id", "title", "author", "isbn", "category", "shelf_location"]);

  async function load() {
    setBooks(await apiRequest("/api/v1/books/", {}, auth));
  }

  useEffect(() => {
    load().catch((error) => notify(error.message, "error"));
  }, []);

  async function addBook(event) {
    event.preventDefault();
    try {
      await apiRequest("/api/v1/books/", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity),
          available_copies: Number(form.available_copies),
          shelf_location: form.shelf_location || null,
        }),
      }, auth);
      notify("Book added");
      setForm({ title: "", author: "", isbn: "", category: "", quantity: 1, available_copies: 1, shelf_location: "" });
      await load();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      {canManage && (
        <Panel title="Add Book" icon={Plus}>
          <form onSubmit={addBook} className="grid gap-3">
            {["title", "author", "isbn", "category", "shelf_location"].map((key) => (
              <TextInput key={key} label={labelize(key)} value={form[key]} onChange={(value) => setForm({ ...form, [key]: value })} />
            ))}
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Quantity" type="number" value={form.quantity} onChange={(value) => setForm({ ...form, quantity: value, available_copies: value })} />
              <TextInput label="Available" type="number" value={form.available_copies} onChange={(value) => setForm({ ...form, available_copies: value })} />
            </div>
            <PrimaryButton icon={Plus}>Add Book</PrimaryButton>
          </form>
        </Panel>
      )}
      <Panel title="Book Inventory" icon={BookOpen} wide={!canManage}>
        <Toolbar onRefresh={load} query={query} onQueryChange={setQuery} placeholder="Search books by title, author, ISBN, category, or ID" />
        <DataTable
          columns={["_id", "title", "author", "isbn", "category", "available_copies", "shelf_location"]}
          rows={visibleBooks}
          empty="No books found"
        />
      </Panel>
    </div>
  );
}

function MembersPanel({ auth, notify }) {
  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", course: "" });
  const visibleMembers = filterRows(members, query, ["_id", "name", "email", "phone", "course"]);

  async function load() {
    setMembers(await apiRequest("/api/v1/members/", {}, auth));
  }

  useEffect(() => {
    load().catch((error) => notify(error.message, "error"));
  }, []);

  async function addMember(event) {
    event.preventDefault();
    try {
      await apiRequest("/api/v1/members/", { method: "POST", body: JSON.stringify(form) }, auth);
      notify("Member added");
      setForm({ name: "", email: "", phone: "", course: "" });
      await load();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function deleteMember(id) {
    try {
      await apiRequest(`/api/v1/members/${id}`, { method: "DELETE" }, auth);
      notify("Member deleted");
      await load();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <Panel title="Add Member" icon={UserPlus}>
        <form onSubmit={addMember} className="grid gap-3">
          {Object.keys(form).map((key) => (
            <TextInput key={key} label={labelize(key)} value={form[key]} onChange={(value) => setForm({ ...form, [key]: value })} />
          ))}
          <PrimaryButton icon={UserPlus}>Add Member</PrimaryButton>
        </form>
      </Panel>
      <Panel title="Member Directory" icon={Users}>
        <Toolbar onRefresh={load} query={query} onQueryChange={setQuery} placeholder="Search members by name, email, phone, course, or ID" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <tr>
                {["id", "name", "email", "phone", "course", "action"].map((column) => <th key={column} className="px-3 py-3">{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {visibleMembers.map((member) => (
                <tr key={member._id} className="border-b border-zinc-100">
                  <td className="max-w-[210px] break-all px-3 py-3 font-mono text-xs text-zinc-500">{member._id}</td>
                  <td className="px-3 py-3">{member.name}</td>
                  <td className="px-3 py-3">{member.email}</td>
                  <td className="px-3 py-3">{member.phone}</td>
                  <td className="px-3 py-3">{member.course}</td>
                  <td className="px-3 py-3">
                    {auth.role === "admin" && (
                      <button className="rounded border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50" onClick={() => deleteMember(member._id)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function BorrowingPanel({ auth, notify }) {
  const [form, setForm] = useState({ member_id: "", book_id: "" });
  const [history, setHistory] = useState([]);
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [bookQuery, setBookQuery] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const availableBooks = filterRows(books, bookQuery, ["_id", "title", "author", "isbn", "category"]);
  const visibleMembers = filterRows(members, memberQuery, ["_id", "name", "email", "phone", "course"]);
  const selectedBook = books.find((book) => book._id === form.book_id);
  const selectedMember = members.find((member) => member._id === form.member_id);

  async function borrowBook(event) {
    event.preventDefault();
    try {
      await apiRequest(`/api/v1/library/borrow?member_id=${encodeURIComponent(form.member_id)}&book_id=${encodeURIComponent(form.book_id)}`, { method: "POST" }, auth);
      notify("Book borrowed");
      await loadHistory();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function returnBook() {
    try {
      await apiRequest(`/api/v1/library/return?book_id=${encodeURIComponent(form.book_id)}`, { method: "POST" }, auth);
      notify("Book returned");
      await loadHistory();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function loadHistory() {
    if (["admin", "user"].includes(auth.role)) {
      setHistory(await apiRequest("/api/v1/library/history", {}, auth));
    }
  }

  async function loadOptions() {
    const loadedBooks = await apiRequest("/api/v1/books/", {}, auth);
    setBooks(loadedBooks);

    if (["admin", "user"].includes(auth.role)) {
      setMembers(await apiRequest("/api/v1/members/", {}, auth));
    }
  }

  useEffect(() => {
    loadOptions().catch((error) => notify(error.message, "error"));
    loadHistory().catch(() => {});
  }, []);

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <Panel title="Borrow / Return" icon={Library}>
        <form onSubmit={borrowBook} className="grid gap-3">
          {["admin", "user"].includes(auth.role) ? (
            <SearchSelect
              label="Member"
              query={memberQuery}
              onQueryChange={setMemberQuery}
              selected={selectedMember ? `${selectedMember.name} · ${selectedMember.email}` : ""}
              placeholder="Search member by name, email, phone, course, or ID"
              items={visibleMembers}
              getKey={(member) => member._id}
              renderItem={(member) => (
                <>
                  <span className="font-medium">{member.name}</span>
                  <span className="text-zinc-500">{member.email}</span>
                  <span className="break-all font-mono text-xs text-zinc-400">{member._id}</span>
                </>
              )}
              onSelect={(member) => {
                setForm({ ...form, member_id: member._id });
                setMemberQuery("");
              }}
            />
          ) : (
            <TextInput label="Member ID" value={form.member_id} onChange={(value) => setForm({ ...form, member_id: value })} />
          )}
          <SearchSelect
            label="Book"
            query={bookQuery}
            onQueryChange={setBookQuery}
            selected={selectedBook ? `${selectedBook.title} · ${selectedBook.available_copies} available` : ""}
            placeholder="Search book by title, author, ISBN, category, or ID"
            items={availableBooks}
            getKey={(book) => book._id}
            renderItem={(book) => (
              <>
                <span className="font-medium">{book.title}</span>
                <span className="text-zinc-500">{book.author} · ISBN {book.isbn}</span>
                <span className="break-all font-mono text-xs text-zinc-400">{book._id}</span>
                <span className={book.available_copies > 0 ? "text-emerald-700" : "text-red-700"}>{book.available_copies} available</span>
              </>
            )}
            onSelect={(book) => {
              setForm({ ...form, book_id: book._id });
              setBookQuery("");
            }}
          />
          <PrimaryButton icon={BookOpen}>Borrow Book</PrimaryButton>
          <button type="button" onClick={returnBook} className="inline-flex h-11 items-center justify-center gap-2 rounded border border-zinc-300 px-4 text-sm font-semibold hover:bg-zinc-100">
            <RefreshCw size={18} />
            Return Book
          </button>
        </form>
      </Panel>
      <Panel title="Borrow History" icon={Activity}>
        {["admin", "user"].includes(auth.role) ? (
          <>
            <Toolbar onRefresh={async () => { await loadOptions(); await loadHistory(); }} />
            <DataTable columns={["member_id", "book_id", "status", "borrow_date", "due_date", "return_date"]} rows={history} empty="No borrow records" />
          </>
        ) : (
          <InfoBox>Members can borrow and return books, while history is available to admin and staff users.</InfoBox>
        )}
      </Panel>
    </div>
  );
}

function AnalyticsPanel({ auth }) {
  const [rows, setRows] = useState([]);

  async function load() {
    setRows(await apiRequest("/api/v1/analytics/top-books", {}, auth));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <Panel title="Top Borrowed Books" icon={BarChart3}>
      <Toolbar onRefresh={load} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row, index) => (
          <div key={row._id || index} className="rounded border border-zinc-200 bg-white p-4">
            <p className="text-xs uppercase text-zinc-500">Book ID</p>
            <p className="mt-1 break-all font-mono text-sm">{row._id}</p>
            <p className="mt-4 text-3xl font-semibold">{row.total}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function UploadPanel({ auth, notify }) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  async function upload(event) {
    event.preventDefault();
    if (!file) return notify("Choose a CSV file", "error");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const data = await apiRequest("/api/v1/upload/books-csv", {
        method: "POST",
        body: formData,
      }, auth, true);
      setResult(data);
      notify("CSV uploaded");
    } catch (error) {
      notify(error.message, "error");
    }
  }

  return (
    <Panel title="Upload Books CSV" icon={Upload}>
      <form onSubmit={upload} className="grid max-w-xl gap-4">
        <input className="rounded border border-dashed border-zinc-300 bg-white p-4 text-sm" type="file" accept=".csv" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        <PrimaryButton icon={Upload}>Upload CSV</PrimaryButton>
        {result && <InfoBox>Inserted records: {result.inserted_records}</InfoBox>}
      </form>
    </Panel>
  );
}

function UsersPanel({ auth, notify }) {
  const [form, setForm] = useState({ username: "", password: "", role: "member" });

  async function createUser(event) {
    event.preventDefault();
    try {
      await apiRequest("/api/v1/auth/users", { method: "POST", body: JSON.stringify(form) }, auth);
      notify(`${form.role} user created`);
      setForm({ username: "", password: "", role: "member" });
    } catch (error) {
      notify(error.message, "error");
    }
  }

  return (
    <Panel title="Create Auth User" icon={Shield}>
      <form onSubmit={createUser} className="grid max-w-xl gap-3">
        <TextInput label="Username" value={form.username} onChange={(value) => setForm({ ...form, username: value })} />
        <TextInput label="Password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
        <label className="grid gap-1 text-sm font-medium">
          Role
          <select className="h-11 rounded border border-zinc-300 bg-white px-3" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            <option value="member">member</option>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <PrimaryButton icon={UserPlus}>Create User</PrimaryButton>
      </form>
    </Panel>
  );
}

function ApiTestsPanel({ auth }) {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);

  async function runTests() {
    setRunning(true);
    const checks = [
      ["Root", "/", {}],
      ["Health", "/health", {}],
      ["Books list", "/api/v1/books/", { auth: true }],
      ["Analytics", "/api/v1/analytics/top-books", { auth: true, roles: ["admin", "user"] }],
      ["Members list", "/api/v1/members/", { auth: true, roles: ["admin", "user"] }],
      ["Borrow history", "/api/v1/library/history", { auth: true, roles: ["admin", "user"] }],
    ];

    const nextResults = [];
    for (const [name, path, options] of checks) {
      if (options.roles && !options.roles.includes(auth.role)) {
        nextResults.push({ name, status: "skipped", detail: `Requires ${options.roles.join(" or ")}` });
        continue;
      }
      try {
        const response = await fetch(`${API_BASE}${path}`, {
          headers: options.auth ? { Authorization: `Bearer ${auth.token}` } : {},
        });
        nextResults.push({ name, status: response.ok ? "passed" : "failed", detail: `${response.status} ${response.statusText}` });
      } catch (error) {
        nextResults.push({ name, status: "failed", detail: error.message });
      }
      setResults([...nextResults]);
    }
    setRunning(false);
  }

  return (
    <Panel title="Browser API Checks" icon={ClipboardCheck}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <PrimaryButton icon={running ? RefreshCw : ClipboardCheck} onClick={runTests} type="button">
          {running ? "Running" : "Run API Checks"}
        </PrimaryButton>
        <p className="text-sm text-zinc-500">Base URL: {API_BASE}</p>
      </div>
      <div className="grid gap-3">
        {results.map((result) => (
          <div key={result.name} className="flex items-center justify-between rounded border border-zinc-200 bg-white p-4">
            <div>
              <p className="font-medium">{result.name}</p>
              <p className="text-sm text-zinc-500">{result.detail}</p>
            </div>
            <StatusBadge status={result.status} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

async function apiRequest(path, options = {}, auth = null, isFormData = false) {
  const headers = { ...(options.headers || {}) };
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (auth?.token) headers.Authorization = `Bearer ${auth.token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(data?.message || data?.detail || "Request failed");
  }

  return data;
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="rounded border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded bg-zinc-100 text-zinc-700">
          <Icon size={18} />
        </div>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function TextInput({ label, value, onChange, type = "text" }) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      <input
        className="h-11 rounded border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  );
}

function PrimaryButton({ children, icon: Icon, ...props }) {
  return (
    <button {...props} className="inline-flex h-11 items-center justify-center gap-2 rounded bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
      <Icon size={18} />
      {children}
    </button>
  );
}

function Toolbar({ onRefresh, query, onQueryChange, placeholder = "Search" }) {
  return (
    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {onQueryChange ? (
        <input
          className="h-10 w-full rounded border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 sm:max-w-md"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <span />
      )}
      <button onClick={onRefresh} className="inline-flex h-9 items-center gap-2 rounded border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-100" title="Refresh">
        <RefreshCw size={16} />
        Refresh
      </button>
    </div>
  );
}

function SearchSelect({ label, query, onQueryChange, selected, placeholder, items, getKey, renderItem, onSelect }) {
  const showItems = query.trim().length > 0 || !selected;

  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {selected && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Selected: {selected}
        </div>
      )}
      <input
        className="h-11 rounded border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={placeholder}
      />
      {showItems && (
        <div className="max-h-72 overflow-auto rounded border border-zinc-200 bg-white">
          {items.length ? (
            items.slice(0, 12).map((item) => (
              <button
                type="button"
                key={getKey(item)}
                onClick={() => onSelect(item)}
                className="grid w-full gap-1 border-b border-zinc-100 px-3 py-2 text-left text-sm hover:bg-zinc-50"
              >
                {renderItem(item)}
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-sm text-zinc-500">No matches found</div>
          )}
        </div>
      )}
    </label>
  );
}

function DataTable({ columns, rows, empty }) {
  if (!rows.length) return <InfoBox>{empty}</InfoBox>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
          <tr>
            {columns.map((column) => <th key={column} className="px-3 py-3">{labelize(column)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row._id || index} className="border-b border-zinc-100">
              {columns.map((column) => (
                <td key={column} className="max-w-[260px] break-words px-3 py-3">{String(row[column] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InfoBox({ children }) {
  return <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{children}</div>;
}

function Metric({ label, value }) {
  return (
    <div className="rounded border border-white/20 bg-white/10 p-4">
      <p className="text-xs uppercase tracking-wide text-emerald-100">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const passed = status === "passed";
  const skipped = status === "skipped";
  const Icon = passed ? CheckCircle2 : skipped ? Activity : XCircle;
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold ${
      passed ? "bg-emerald-50 text-emerald-700" : skipped ? "bg-zinc-100 text-zinc-600" : "bg-red-50 text-red-700"
    }`}>
      <Icon size={14} />
      {status}
    </span>
  );
}

function Toast({ toast }) {
  return (
    <div className={`fixed bottom-4 right-4 z-50 rounded border px-4 py-3 text-sm shadow-lg ${
      toast.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
    }`}>
      {toast.message}
    </div>
  );
}

function labelize(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function filterRows(rows, query, keys) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return rows;

  return rows.filter((row) =>
    keys.some((key) => String(row[key] ?? "").toLowerCase().includes(normalizedQuery))
  );
}

createRoot(document.getElementById("root")).render(<App />);
