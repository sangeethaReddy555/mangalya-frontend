import { useCallback, useEffect, useRef, useState } from "react";
import CustomSelect from "./CustomSelect.jsx";

const CONTACT = { name: "Sangeetha", phone: "+91 9087654321" };
const api = async (url, opts) => {
  let r;
  try {
    r = await fetch(url, opts);
  } catch (error) {
    if (error instanceof TypeError) throw new Error("Unable to reach the server. Check your connection and try again.");
    throw error;
  }
  let data;
  try {
    data = await r.json();
  } catch {
    data = {};
  }
  if (!r.ok) {
    const messages = {
      400: "Please check the information and try again.",
      401: "Your session has expired. Please sign in again.",
      403: "You don't have permission to do that.",
      404: "The requested information could not be found.",
      409: "This change conflicts with existing information.",
      429: "Too many requests. Please wait a moment and try again.",
      500: "The server encountered an error. Please try again later.",
      502: "The server is temporarily unavailable.",
      503: "The service is temporarily unavailable.",
    };
    throw new Error(data.error || messages[r.status] || `Request failed (${r.status}). Please try again.`);
  }
  return data;
};

function ToastViewport({ toasts, dismiss }) {
  return (
    <div className="toast-viewport" aria-live="polite" aria-relevant="additions removals">
      {toasts.map((toast) => (
        <div className={`toast toast-${toast.type}`} key={toast.id} role={toast.type === "error" ? "alert" : "status"}>
          <span>{toast.message}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}>×</button>
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, danger = false, busy = false, compactConfirm = false }) {
  return (
    <Modal onClose={() => { if (!busy) onCancel(); }}>
      <h2>{title}</h2>
      <p>{message}</p>
      <div className="confirm-actions">
        <button className="btn ghost" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={`btn${danger ? " danger" : ""}${compactConfirm ? " small" : ""}`} type="button" onClick={onConfirm} disabled={busy}>
          {busy ? "Please wait..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function Reveal({ children, className = "", style }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    if (!("IntersectionObserver" in window)) {
      element.classList.add("is-visible");
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        element.classList.add("is-visible");
        observer.unobserve(element);
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className={`reveal ${className}`} style={style}>{children}</div>;
}

function ProductSkeletons() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4" role="status" aria-label="Loading products">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="card product-skeleton" key={index} aria-hidden="true">
          <div className="skeleton skeleton-image" />
          <div className="skeleton-info">
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-action" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading products...</span>
    </div>
  );
}

function getCategoryIcon(name) {
  const category = name.toLowerCase();
  if (category.includes("coconut")) return "🥥";
  if (category.includes("pooja") || category.includes("prayer")) return "🪔";
  if (category.includes("marriage") || category.includes("wedding")) return "💍";
  if (category.includes("tamboolam")) return "🌺";
  if (category.includes("hamper")) return "🧺";
  if (category.includes("gift")) return "🎁";
  if (category.includes("function") || category.includes("decor")) return "🪷";
  return "✿";
}

function CategoryVisual({ category }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (category.imageUrl && !imageFailed) {
    return <img className="category-image" src={category.imageUrl} alt="" onError={() => setImageFailed(true)} />;
  }
  return <span className="category-icon" aria-hidden="true">{getCategoryIcon(category.name)}</span>;
}

function Modal({ onClose, children, wide }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className={"modal" + (wide ? " wide" : "")} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="close" aria-label="Close" onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
}

function ItemView({ item, onClose, onContact }) {
  return (
    <Modal onClose={onClose} wide>
      <img className="big" src={item.imageUrl} alt={item.name} />
      <h2>{item.name}</h2>
      <p className="muted">{item.category}</p>
      {item.description && <p>{item.description}</p>}
      <button className="btn" type="button" onClick={() => onContact(item)}>Contact Us</button>
    </Modal>
  );
}

function ContactDialog({ item, onClose }) {
  return (
    <Modal onClose={onClose}>
      <h2>Contact Us</h2>
      <p className="muted">For {item.name}, please contact</p>
      <div className="contact">
        <strong>{CONTACT.name}</strong>
        <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}>{CONTACT.phone}</a>
      </div>
    </Modal>
  );
}

function Login({ onClose, onToken, notify }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ username: "", password: "" });
  const [request, setRequest] = useState({ requestedUsername: "", email: "", password: "", reason: "" });
  const [confirmRequestPassword, setConfirmRequestPassword] = useState("");
  const [recovery, setRecovery] = useState({ email: "", code: "", newUsername: "", newPassword: "" });
  const [confirmRecoveryPassword, setConfirmRecoveryPassword] = useState("");
  const [recoveryStep, setRecoveryStep] = useState("email");
  const [recoveredUsername, setRecoveredUsername] = useState("");
  const [recoveryPasswordUpdated, setRecoveryPasswordUpdated] = useState(false);
  const [recoveryUsernameUpdated, setRecoveryUsernameUpdated] = useState(false);
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!f.username.trim() || !f.password) {
      setErr("Enter your email or username and password.");
      return;
    }
    setSubmitting(true);
    setErr("");
    try {
      const { token, isEnvAdmin } = await api("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: f.username.trim(), username: f.username.trim(), password: f.password }),
      });
      onToken(token, isEnvAdmin);
      notify("Signed in successfully.");
    } catch (e2) {
      setErr(e2.message);
      notify(e2.message, "error");
    } finally {
      setSubmitting(false);
    }
  };
  const sendRecoveryCode = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErr("");
    try {
      const result = await api("/api/admin/recovery/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: recovery.email }),
      });
      setRecoveryStep("verify");
      notify(result.message);
    } catch (e2) {
      setErr(e2.message);
      notify(e2.message, "error");
    } finally {
      setSubmitting(false);
    }
  };
  const verifyRecoveryCode = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (recovery.newPassword && recovery.newPassword !== confirmRecoveryPassword) {
      setErr("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setErr("");
    try {
      const result = await api("/api/admin/recovery/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: recovery.email,
          code: recovery.code,
          ...(recovery.newUsername ? { newUsername: recovery.newUsername } : {}),
          ...(recovery.newPassword ? { newPassword: recovery.newPassword } : {}),
        }),
      });
      setRecoveredUsername(result.username);
      setRecoveryPasswordUpdated(result.passwordUpdated);
      setRecoveryUsernameUpdated(result.usernameUpdated);
      setRecoveryStep("complete");
      notify(result.usernameUpdated ? "Username updated." : result.passwordUpdated ? "Password updated." : "Username recovered.");
    } catch (e2) {
      setErr(e2.message);
      notify(e2.message, "error");
    } finally {
      setSubmitting(false);
    }
  };
  const submitRequest = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (request.password !== confirmRequestPassword) {
      setErr("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setErr("");
    try {
      await api("/api/admin/requests", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request),
      });
      setRequestSent(true);
      notify("Your admin access request was sent.");
    } catch (e2) {
      setErr(e2.message);
      notify(e2.message, "error");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal onClose={onClose}>
      {mode === "login" ? (
        <>
          <h2>Admin login</h2>
          <form onSubmit={submit}>
            <input required autoComplete="username" placeholder="Email or username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoFocus />
            <input required autoComplete="current-password" placeholder="Password" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            {err && <p className="err">{err}</p>}
            <button className="btn" disabled={submitting}>{submitting ? "Signing in..." : "Log in"}</button>
          </form>
          <button className="text-button" type="button" onClick={() => {
            setRecovery({ email: f.username.includes("@") ? f.username : "", code: "", newUsername: "", newPassword: "" });
            setConfirmRecoveryPassword("");
            setRecoveryStep("email");
            setErr("");
            setMode("recovery");
          }}>Forgot username or password?</button>
          <button className="text-button" type="button" onClick={() => { setMode("request"); setErr(""); }}>Request admin access</button>
        </>
      ) : mode === "request" ? (
        <>
          <h2>Request admin access</h2>
          {requestSent ? (
            <>
              <p className="muted">Your request was sent for review. You can log in with your email and password after it is approved.</p>
              <button className="btn" type="button" onClick={onClose}>Close</button>
            </>
          ) : (
            <>
              <form className="admin-form" onSubmit={submitRequest}>
                <label htmlFor="requested-username">Username</label>
                <input id="requested-username" required minLength={3} maxLength={50} pattern="[a-zA-Z0-9._-]+" autoComplete="username" value={request.requestedUsername} onChange={(e) => setRequest({ ...request, requestedUsername: e.target.value })} />
                <label htmlFor="requester-email">Email address</label>
                <input id="requester-email" required type="email" maxLength={254} autoComplete="email" value={request.email} onChange={(e) => setRequest({ ...request, email: e.target.value })} />
                <label htmlFor="request-password">Password</label>
                <input id="request-password" required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={request.password} onChange={(e) => setRequest({ ...request, password: e.target.value })} />
                <label htmlFor="confirm-request-password">Confirm password</label>
                <input id="confirm-request-password" required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={confirmRequestPassword} onChange={(e) => setConfirmRequestPassword(e.target.value)} />
                <label htmlFor="request-reason">Reason (optional)</label>
                <textarea id="request-reason" maxLength={1000} rows="3" value={request.reason} onChange={(e) => setRequest({ ...request, reason: e.target.value })} />
                {err && <p className="err">{err}</p>}
                <button className="btn" disabled={submitting}>{submitting ? "Sending..." : "Send request"}</button>
              </form>
              <button className="text-button" type="button" onClick={() => { setMode("login"); setErr(""); }}>Back to admin login</button>
            </>
          )}
        </>
      ) : (
        <>
          <h2>Recover admin account</h2>
          {recoveryStep === "email" ? (
            <>
              <p className="muted">Enter the email address linked to your admin account. We’ll send a 6-digit code valid for 2 minutes.</p>
              <form className="admin-form" onSubmit={sendRecoveryCode}>
                <label htmlFor="recovery-email">Email address</label>
                <input id="recovery-email" required type="email" maxLength={254} autoComplete="email" value={recovery.email} onChange={(e) => setRecovery({ ...recovery, email: e.target.value })} />
                {err && <p className="err">{err}</p>}
                <button className="btn" disabled={submitting}>{submitting ? "Sending code..." : "Send verification code"}</button>
              </form>
            </>
          ) : recoveryStep === "verify" ? (
            <>
              <p className="muted">Enter the code sent to {recovery.email}. It expires in 2 minutes. Leave both change fields blank if you only need to recover your username.</p>
              <form className="admin-form" onSubmit={verifyRecoveryCode}>
                <label htmlFor="recovery-code">6-digit verification code</label>
                <input id="recovery-code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={recovery.code} onChange={(e) => setRecovery({ ...recovery, code: e.target.value.replace(/\D/g, "").slice(0, 6) })} />
                <label htmlFor="recovery-new-username">New username (optional)</label>
                <input id="recovery-new-username" minLength={3} maxLength={50} pattern="[a-zA-Z0-9._-]+" autoComplete="username" value={recovery.newUsername} onChange={(e) => setRecovery({ ...recovery, newUsername: e.target.value })} />
                <label htmlFor="recovery-new-password">New password (optional)</label>
                <input id="recovery-new-password" type="password" minLength={8} maxLength={128} autoComplete="new-password" value={recovery.newPassword} onChange={(e) => setRecovery({ ...recovery, newPassword: e.target.value })} />
                {recovery.newPassword && (
                  <>
                    <label htmlFor="confirm-recovery-password">Confirm new password</label>
                    <input id="confirm-recovery-password" required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={confirmRecoveryPassword} onChange={(e) => setConfirmRecoveryPassword(e.target.value)} />
                  </>
                )}
                {err && <p className="err">{err}</p>}
                <button className="btn" disabled={submitting}>{submitting ? "Verifying..." : "Verify code"}</button>
              </form>
              <button className="text-button" type="button" onClick={() => { setRecoveryStep("email"); setErr(""); }}>Use a different email</button>
            </>
          ) : (
            <>
              <p className="muted">Your username is <strong>{recoveredUsername}</strong>.</p>
              <p className="muted">{recoveryUsernameUpdated ? "Your username was updated." : "Your username was not changed."} {recoveryPasswordUpdated ? "Your password was updated." : "Your password was not changed."} Sign in using your email address.</p>
            </>
          )}
          <button className="text-button" type="button" onClick={() => {
            setF({
              username: recovery.email,
              password: recoveryPasswordUpdated ? recovery.newPassword : "",
            });
            setMode("login");
            setErr("");
          }}>{recoveryStep === "complete" ? "Back to sign in" : "Back to admin login"}</button>
        </>
      )}
    </Modal>
  );
}

function LegacyAdmin({ token, items, reload, logout }) {
  const [f, setF] = useState({ name: "", category: "", description: "" });
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [deleteItemId, setDeleteItemId] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const add = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, v));
    fd.append("image", file);
    try {
      await api("/api/items", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      setF({ name: "", category: "", description: "" }); setFile(null); e.target.reset();
      setMsg("Item added"); reload();
    } catch (e2) { setMsg(e2.message); }
  };
  const del = async (id) => {
    await api(`/api/items/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    reload();
  };

  return (
    <main className="wrap w-full px-2 sm:px-3 lg:px-4">
      <div className="bar"><h2>Admin panel</h2><button className="btn ghost" onClick={logout}>Log out</button></div>
      <form className="panel" onSubmit={add}>
        <h3>Add item</h3>
        <input required placeholder="Item name" value={f.name} onChange={set("name")} />
        <input placeholder="Category (e.g. Necklace)" value={f.category} onChange={set("category")} />
        <textarea placeholder="Description" rows="3" value={f.description} onChange={set("description")} />
        <input required type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
        {msg && <p className="muted">{msg}</p>}
        <button className="btn">Add item</button>
      </form>
      <div className="grid">
        {items.map((it) => (
          <div className="card" key={it.id}>
            <img src={it.imageUrl} alt={it.name} />
            <div className="info"><b>{it.name}</b><button className="btn small danger" onClick={() => setDeleteItemId(it.id)}>Delete</button></div>
          </div>
        ))}
      </div>
      {deleteItemId && (
        <ConfirmDialog
          title="Delete product?"
          message="This action cannot be undone."
          confirmLabel="Delete product"
          danger
          onCancel={() => setDeleteItemId(null)}
          onConfirm={() => del(deleteItemId)}
        />
      )}
    </main>
  );
}

function Admin({ token, isEnvAdmin, theme, onToggleTheme, onViewSite, items, itemsLoading, itemsError, reload, logout, notify, requestLogout }) {
  const [activeTab, setActiveTab] = useState("item");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState("");
  const [requestToApprove, setRequestToApprove] = useState(null);
  const [requestToReject, setRequestToReject] = useState(null);
  const [requestActionLoading, setRequestActionLoading] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryImageUrl, setCategoryImageUrl] = useState("");
  const [categoryMessage, setCategoryMessage] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleteCategoryError, setDeleteCategoryError] = useState("");
  const [targetCategoryId, setTargetCategoryId] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deletingItem, setDeletingItem] = useState(false);
  const [f, setF] = useState({
    name: "", categoryId: "", imageUrl: "", description: "",
  });
  const [msg, setMsg] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const set = (key) => (e) => setF({ ...f, [key]: e.target.value });

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileNavOpen]);

  const reloadCategories = async () => {
    const data = await api("/api/categories");
    setCategories(data);
    setCategoryError("");
    return data;
  };

  const reloadRequests = useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError("");
    try {
      const data = await api("/api/admin/requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(data);
    } catch (error) {
      setRequestsError(error.message);
      notify(error.message, "error");
    } finally {
      setRequestsLoading(false);
    }
  }, [token, notify]);

  const approveRequest = async () => {
    if (!requestToApprove || requestActionLoading) return;
    setRequestActionLoading(true);
    try {
      await api(`/api/admin/requests/${requestToApprove.id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequestToApprove(null);
      await reloadRequests();
      notify("Request approved. The requester can now log in with their chosen password.");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setRequestActionLoading(false);
    }
  };

  const rejectRequest = async () => {
    if (!requestToReject || requestActionLoading) return;
    setRequestActionLoading(true);
    try {
      await api(`/api/admin/requests/${requestToReject.id}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequestToReject(null);
      await reloadRequests();
      notify("Request rejected.");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setRequestActionLoading(false);
    }
  };

  useEffect(() => {
    if (isEnvAdmin) reloadRequests();
  }, [isEnvAdmin, reloadRequests]);

  useEffect(() => {
    reloadCategories().catch((error) => {
      setCategoryError(error.message);
      notify(error.message, "error");
    });
  }, []);

  const addCategory = async (e) => {
    e.preventDefault();
    if (savingCategory) return;
    setCategoryMessage("");
    if (!categoryName.trim()) {
      setCategoryMessage("Enter a category name.");
      return;
    }
    if (!isHttpUrl(categoryImageUrl.trim())) {
      setCategoryMessage("Enter a valid HTTP or HTTPS image URL.");
      return;
    }
    setSavingCategory(true);
    try {
      const saved = await api(editingCategoryId ? `/api/categories/${editingCategoryId}` : "/api/categories", {
        method: editingCategoryId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ name: categoryName.trim(), imageUrl: categoryImageUrl.trim() }),
      });
      await reloadCategories();
      setCategoryName("");
      setCategoryImageUrl("");
      setEditingCategoryId(null);
      if (!editingCategoryId) setF((current) => ({ ...current, categoryId: String(saved.id) }));
      const message = editingCategoryId ? "Category updated." : "Category added.";
      setCategoryMessage(message);
      notify(message);
    } catch (error) {
      setCategoryMessage(error.message);
      notify(error.message, "error");
    } finally {
      setSavingCategory(false);
    }
  };

  const editCategory = (category) => {
    setCategoryName(category.name);
    setCategoryImageUrl(category.imageUrl || "");
    setEditingCategoryId(category.id);
    setCategoryMessage("");
    setActiveTab("category");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelCategoryEdit = () => {
    setCategoryName("");
    setCategoryImageUrl("");
    setEditingCategoryId(null);
    setCategoryMessage("");
  };

  const closeCategoryDelete = (force = false) => {
    if (deletingCategory && !force) return;
    setCategoryToDelete(null);
    setTargetCategoryId("");
    setDeleteCategoryError("");
  };

  const deleteCategory = async (action) => {
    if (!categoryToDelete || deletingCategory) return;
    setDeletingCategory(true);
    setDeleteCategoryError("");
    try {
      await api(`/api/categories/${categoryToDelete.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action,
          ...(action === "move_items" ? { targetCategoryId: Number(targetCategoryId) } : {}),
        }),
      });
      if (editingCategoryId === categoryToDelete.id) cancelCategoryEdit();
      closeCategoryDelete(true);
      await reloadCategories();
      reload();
      notify("Category deleted.");
    } catch (error) {
      setDeleteCategoryError(error.message);
      notify(error.message, "error");
    } finally {
      setDeletingCategory(false);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    if (savingItem) return;
    setMsg("");
    if (!f.categoryId) {
      setMsg("Please select a category");
      return;
    }
    if (!f.name.trim()) {
      setMsg("Enter an item name.");
      return;
    }
    if (!isHttpUrl(f.imageUrl.trim())) {
      setMsg("Enter a valid HTTP or HTTPS image URL.");
      return;
    }
    setSavingItem(true);
    try {
      const itemUrl = editingItemId ? "/api/items/" + editingItemId : "/api/items";
      await api(itemUrl, {
        method: editingItemId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ ...f, name: f.name.trim(), imageUrl: f.imageUrl.trim() }),
      });
      setF({ name: "", categoryId: "", imageUrl: "", description: "" });
      setEditingItemId(null);
      const message = editingItemId ? "Item updated." : "Item added.";
      setMsg(message);
      reload();
      notify(message);
    } catch (error) {
      setMsg(error.message);
      notify(error.message, "error");
    } finally {
      setSavingItem(false);
    }
  };

  const edit = (item) => {
    setF({
      name: item.name,
      categoryId: String(item.categoryId || ""),
      imageUrl: item.imageUrl,
      description: item.description || "",
    });
    setEditingItemId(item.id);
    setMsg("");
    setActiveTab("item");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setF({ name: "", categoryId: "", imageUrl: "", description: "" });
    setEditingItemId(null);
    setMsg("");
  };

  const categoryDeleteItems = categoryToDelete
    ? items.filter((item) => Number(item.categoryId) === categoryToDelete.id)
    : [];
  const deleteDestinations = categoryToDelete
    ? categories.filter((category) => category.id !== categoryToDelete.id)
    : [];
  const selectedCategory = categories.find((category) => String(category.id) === f.categoryId);
  const activeSectionTitle = {
    item: editingItemId ? "Edit item" : "Create item",
    items: "All items",
    category: "All categories",
    requests: "Admin requests",
  }[activeTab];

  const del = async (id) => {
    if (!id || deletingItem) return;
    setDeletingItem(true);
    try {
      await api(`/api/items/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      reload();
      setItemToDelete(null);
      notify("Item deleted.");
    } catch (error) {
      setMsg(error.message);
      notify(error.message, "error");
    } finally {
      setDeletingItem(false);
    }
  };

  return (
    <div className="admin-shell">
      {mobileNavOpen && <button className="admin-mobile-backdrop" type="button" aria-label="Close sidebar" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`admin-sidebar${mobileNavOpen ? " mobile-open" : ""}`}>
        <button className="admin-brand" type="button" onClick={onViewSite} aria-label="Mangalya admin home">
          <img src="/mangalya-logo-light.png" alt="" />
          <span>Mangalya</span>
        </button>
        <nav className="admin-nav" aria-label="Admin sections">
          {[
            { id: "item", label: "Create item" },
            { id: "items", label: "All items" },
            { id: "category", label: "All categories" },
            ...(isEnvAdmin ? [{ id: "requests", label: "Admin account requests" }] : []),
          ].map(({ id: tab, label }) => (
            <button
              className={`admin-nav-link${activeTab === tab ? " active" : ""}`}
              key={tab}
              type="button"
              aria-current={activeTab === tab ? "page" : undefined}
              onClick={() => {
                setActiveTab(tab);
                setMobileNavOpen(false);
              }}
            >
              <span className="admin-nav-icon" aria-hidden="true">
                {tab === "item" ? "+" : tab === "items" ? "▦" : tab === "category" ? "☷" : "♙"}
              </span>
              <span>{label}</span>
              {tab === "requests" && requests.some((request) => request.status === "pending") && (
                <span className="admin-nav-badge">{requests.filter((request) => request.status === "pending").length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <span>Signed in as Admin</span>
          <button className="btn ghost" type="button" onClick={() => {
            setMobileNavOpen(false);
            requestLogout();
          }}>Log out</button>
        </div>
      </aside>
      <main className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              className="admin-mobile-menu-toggle"
              type="button"
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              ☰
            </button>
            <div>
              <p>Admin panel</p>
              <h1>{activeSectionTitle}</h1>
            </div>
          </div>
          <div className="admin-topbar-actions">
            <button
              className="admin-icon-button"
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              title={theme === "dark" ? "Light theme" : "Dark theme"}
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <button
              className="admin-icon-button"
              type="button"
              onClick={onViewSite}
              aria-label="View site"
              title="View site"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </header>
        <section className="admin-stats" aria-label="Store overview">
          <article className="admin-stat">
            <span>Total items</span>
            <strong>{itemsLoading ? "…" : itemsError ? "—" : items.length}</strong>
          </article>
          <article className="admin-stat">
            <span>Categories</span>
            <strong>{categories.length}</strong>
          </article>
          {isEnvAdmin && (
            <article className="admin-stat">
              <span>Pending requests</span>
              <strong>{requestsLoading ? "…" : requests.filter((request) => request.status === "pending").length}</strong>
            </article>
          )}
        </section>
        <Reveal>
          <section className="admin-card" id="admin-tab-panel" aria-label={activeSectionTitle}>
          {activeTab === "category" && (
            <>
              {categoryError && <p className="err">{categoryError}</p>}
              <form className="admin-form" onSubmit={addCategory}>
                <h3>{editingCategoryId ? "Edit category" : "Add category"}</h3>
                <label htmlFor="category-name">Category name</label>
                <input id="category-name" required placeholder="e.g. Jewelry" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
                <label htmlFor="category-image-url">Category image URL</label>
                <input id="category-image-url" required type="url" placeholder="https://..." value={categoryImageUrl} onChange={(e) => setCategoryImageUrl(e.target.value)} />
                {categoryMessage && <p className="form-message">{categoryMessage}</p>}
                <div className="item-form-actions">
                  {editingCategoryId && <button className="btn ghost" type="button" onClick={cancelCategoryEdit}>Cancel edit</button>}
                  <button className="btn" disabled={savingCategory}>{savingCategory ? "Saving..." : editingCategoryId ? "Save category" : "Add category"}</button>
                </div>
              </form>
              <div className="category-admin-list" aria-label="Manage categories">
                <h3>Categories</h3>
                {categories.length === 0 ? (
                  <div className="empty-state"><span aria-hidden="true">✦</span><strong>No categories yet</strong><p>Add a category above to start organizing your products.</p></div>
                ) : categories.map((category) => (
                  <div className="category-admin-row" key={category.id}>
                    <img src={category.imageUrl} alt="" />
                    <strong>{category.name}</strong>
                    <span className="muted">
                      {itemsLoading ? "Loading items..." : itemsError ? "Item count unavailable" : `${items.filter((item) => Number(item.categoryId) === category.id).length} items`}
                    </span>
                    <div className="category-admin-actions">
                      <button className="btn small ghost" type="button" onClick={() => editCategory(category)}>Edit</button>
                      <button
                        className="btn small danger"
                        type="button"
                        onClick={() => {
                          setCategoryToDelete(category);
                          setDeleteCategoryError("");
                          setTargetCategoryId("");
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {activeTab === "item" && (
            <div className="admin-create-grid">
              <form className="admin-form" onSubmit={add}>
              <h3>{editingItemId ? "Edit item" : "Create item"}</h3>
              <label htmlFor="item-name">Item name</label>
              <input id="item-name" required placeholder="e.g. Kalash set" value={f.name} onChange={set("name")} />
              <label htmlFor="item-category">Category</label>
              <CustomSelect
                id="item-category"
                required
                value={f.categoryId}
                placeholder="Select category"
                options={categories.map((category) => ({
                  value: category.id,
                  label: `${category.name} (ID ${category.id})`,
                }))}
                onChange={(categoryId) => setF({ ...f, categoryId: String(categoryId) })}
              />
              <label htmlFor="item-image-url">Public image URL</label>
              <input id="item-image-url" required type="url" placeholder="https://..." value={f.imageUrl} onChange={set("imageUrl")} />
              <label htmlFor="item-description">Description (optional)</label>
              <textarea id="item-description" placeholder="Item description" rows="3" value={f.description} onChange={set("description")} />
              {msg && <p className="form-message">{msg}</p>}
              <div className="item-form-actions">
                {editingItemId && <button className="btn ghost" type="button" onClick={cancelEdit}>Cancel</button>}
                <button className="btn" disabled={!categories.length || savingItem}>{savingItem ? "Saving..." : editingItemId ? "Save changes" : "Add item"}</button>
              </div>
              </form>
              <aside className="admin-preview" aria-label="Live item preview">
                <h3>Live preview</h3>
                <div className="admin-preview-image">
                  {isHttpUrl(f.imageUrl.trim())
                    ? <img src={f.imageUrl.trim()} alt={f.name.trim() || "Item preview"} />
                    : <span>Image appears here</span>}
                </div>
                <strong>{f.name.trim() || "Item name"}</strong>
                <span>{selectedCategory?.name || "Category"}</span>
                {f.description.trim() && <p>{f.description.trim()}</p>}
                <small>This is how the card will look on the user page.</small>
              </aside>
            </div>
          )}
          {activeTab === "requests" && isEnvAdmin && (
            <section className="admin-requests" aria-label="Admin account requests">
              <div className="admin-requests-heading">
                <h3>Admin account requests</h3>
                <button className="btn small ghost" type="button" disabled={requestsLoading} onClick={reloadRequests}>
                  {requestsLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              <p className="muted">Approving a request creates an admin account using the password chosen by the requester. Passwords are never shown here.</p>
              {requestsError ? (
                <div className="load-error" role="alert">
                  <p>{requestsError}</p>
                  <button className="btn small" type="button" onClick={reloadRequests}>Try again</button>
                </div>
              ) : requestsLoading ? (
                <p className="muted" role="status">Loading requests...</p>
              ) : requests.length === 0 ? (
                <div className="empty-state"><span aria-hidden="true">✦</span><strong>No requests yet</strong><p>New admin access requests will appear here.</p></div>
              ) : (
                <div className="admin-request-list">
                  {requests.map((accountRequest) => (
                    <article className="admin-request-row" key={accountRequest.id}>
                      <div className="admin-request-details">
                        <strong>{accountRequest.requestedUsername}</strong>
                        <a href={`mailto:${accountRequest.email}`}>{accountRequest.email}</a>
                        {accountRequest.reason && <p>{accountRequest.reason}</p>}
                        <span className={`admin-request-status status-${accountRequest.status}`}>{accountRequest.status}</span>
                        {accountRequest.status === "pending" && !accountRequest.hasPassword && (
                          <span className="muted">This older request has no password. Ask the requester to submit it again.</span>
                        )}
                        {accountRequest.status === "pending" && (
                          <div className="admin-request-actions">
                            {accountRequest.hasPassword && (
                              <button className="btn small" type="button" onClick={() => setRequestToApprove(accountRequest)}>Approve</button>
                            )}
                            <button className="btn small danger" type="button" onClick={() => setRequestToReject(accountRequest)}>Reject</button>
                          </div>
                        )}
                      </div>
                      <time dateTime={accountRequest.createdAt}>{new Date(accountRequest.createdAt).toLocaleString()}</time>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
          </section>
        </Reveal>
        {requestToApprove && (
          <ConfirmDialog
            title="Approve admin request?"
            message={`Create an admin account for ${requestToApprove.requestedUsername} using the password they provided?`}
            confirmLabel="Approve and create account"
            compactConfirm
            busy={requestActionLoading}
            onCancel={() => setRequestToApprove(null)}
            onConfirm={approveRequest}
          />
        )}
        {requestToReject && (
          <ConfirmDialog
            title="Reject admin request?"
            message={`Reject the request from ${requestToReject.requestedUsername}?`}
            confirmLabel="Reject request"
            danger
            busy={requestActionLoading}
            onCancel={() => setRequestToReject(null)}
            onConfirm={rejectRequest}
          />
        )}
        {activeTab === "items" && <Reveal>
        <section className="admin-items" aria-label="Items">
        <h3>All items</h3>
        {itemsLoading ? (
          <p className="muted" role="status">Loading items...</p>
        ) : itemsError ? (
          <div className="load-error" role="alert">
            <p>{itemsError}</p>
            <button className="btn small" type="button" onClick={reload}>Try again</button>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state"><span aria-hidden="true">✦</span><strong>No products yet</strong><p>Add your first product using the form above.</p></div>
        ) : (
          <div className="admin-item-list">
            {items.map((it) => (
              <article className="admin-item-row" key={it.id}>
                <img className="admin-item-thumbnail" src={it.imageUrl} alt={it.name} />
                <div className="admin-item-details">
                  <strong>{it.name}</strong>
                  <span>{it.category}</span>
                  {it.description && <p>{it.description}</p>}
                </div>
                <div className="admin-item-actions">
                  <button className="item-action edit-action" type="button" aria-label={`Edit ${it.name}`} title="Edit item" onClick={() => edit(it)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
                  </button>
                  <button className="item-action delete-action" type="button" aria-label={`Delete ${it.name}`} title="Delete item" onClick={() => setItemToDelete(it)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        </section>
        </Reveal>}
      {categoryToDelete && (
        <Modal onClose={closeCategoryDelete}>
          <h2>Delete &ldquo;{categoryToDelete.name}&rdquo;?</h2>
          {itemsLoading ? (
            <p className="muted" role="status">Loading items to check whether this category contains products...</p>
          ) : itemsError ? (
            <div className="load-error" role="alert">
              <p>Couldn&apos;t check this category&apos;s items, so it can&apos;t be safely deleted yet: {itemsError}</p>
              <button className="btn small" type="button" onClick={reload}>Try again</button>
            </div>
          ) : categoryDeleteItems.length > 0 ? (
            <>
              <p className="category-delete-warning">
                This category contains {categoryDeleteItems.length} related {categoryDeleteItems.length === 1 ? "item" : "items"}. Choose what to do before deleting it.
              </p>
              <div className="category-delete-options">
                <section className="category-delete-option">
                  <p>Permanently delete this category and all {categoryDeleteItems.length} related {categoryDeleteItems.length === 1 ? "item" : "items"}.</p>
                  <button className="btn danger" type="button" disabled={deletingCategory} onClick={() => deleteCategory("delete_items")}>
                    {deletingCategory ? "Deleting..." : "Delete category and items"}
                  </button>
                </section>
                <section className="category-delete-option">
                  <label htmlFor="move-category-to">Move the items to another category first:</label>
                  <CustomSelect
                    id="move-category-to"
                    value={targetCategoryId}
                    placeholder="Select destination category"
                    options={deleteDestinations.map((category) => ({ value: category.id, label: category.name }))}
                    onChange={(value) => setTargetCategoryId(String(value))}
                  />
                  <button
                    className="btn"
                    type="button"
                    disabled={!targetCategoryId || deletingCategory}
                    onClick={() => deleteCategory("move_items")}
                  >
                    {deletingCategory ? "Deleting..." : "Move items and delete category"}
                  </button>
                </section>
              </div>
            </>
          ) : (
            <>
              <p>This category has no related items.</p>
              <button className="btn danger category-delete-action" type="button" disabled={deletingCategory} onClick={() => deleteCategory("delete_items")}>
                {deletingCategory ? "Deleting..." : "Delete category"}
              </button>
            </>
          )}
          {deleteCategoryError && <p className="err" role="alert">{deleteCategoryError}</p>}
          <button className="btn ghost category-delete-action" type="button" disabled={deletingCategory} onClick={closeCategoryDelete}>Cancel</button>
        </Modal>
      )}
      {itemToDelete && (
        <ConfirmDialog
          title="Delete product?"
          message={`Delete “${itemToDelete.name}”? This action cannot be undone.`}
          confirmLabel="Delete product"
          danger
          busy={deletingItem}
          onCancel={() => setItemToDelete(null)}
          onConfirm={() => del(itemToDelete.id)}
        />
      )}
      </main>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(localStorage.theme || "light");
  const [token, setToken] = useState(localStorage.adminToken || "");
  const [isEnvAdmin, setIsEnvAdmin] = useState(localStorage.adminIsEnvAdmin === "true");
  const [toasts, setToasts] = useState([]);
  const [logoutPrompt, setLogoutPrompt] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState("");
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [view, setView] = useState(() => localStorage.adminToken ? "admin" : "user");
  const [login, setLogin] = useState(false);
  const [open, setOpen] = useState(null);
  const [contactItem, setContactItem] = useState(null);
  const [bannerReadyTheme, setBannerReadyTheme] = useState("");

  const notify = useCallback((message, type = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, type }].slice(-4));
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);
  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const reload = () => {
    setItemsLoading(true);
    setItemsError("");
    return api("/api/items")
      .then(setItems)
      .catch((error) => {
        setItemsError(error.message);
        notify(error.message, "error");
      })
      .finally(() => setItemsLoading(false));
  };
  const reloadCategories = () => {
    setCategoriesLoading(true);
    setCategoriesError("");
    return api("/api/categories")
      .then(setCategories)
      .catch((error) => {
        setCategoriesError(error.message);
        notify(error.message, "error");
      })
      .finally(() => setCategoriesLoading(false));
  };
  useEffect(() => { reload(); }, []);
  useEffect(() => { reloadCategories(); }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.theme = theme; }, [theme]);
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      notify("You’re back online.", "success");
    };
    const handleOffline = () => {
      setOnline(false);
      notify("You’re offline. Some features may not work until you reconnect.", "warning");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [notify]);

  const onToken = (t, envAdmin) => {
    localStorage.adminToken = t;
    localStorage.adminIsEnvAdmin = String(envAdmin);
    setToken(t);
    setIsEnvAdmin(envAdmin);
    setLogin(false);
    setView("admin");
  };
  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminIsEnvAdmin");
    setToken("");
    setIsEnvAdmin(false);
    setSelectedCategory("");
    setView("user");
    reloadCategories();
    notify("You’ve been signed out.");
  };
  const confirmLogout = () => {
    setLogoutPrompt(false);
    logout();
  };
  const adminClick = () => (token ? setView("admin") : setLogin(true));
  const visibleItems = selectedCategory
    ? items.filter((item) => item.category === selectedCategory)
    : items;

  return (
    <>
      <ToastViewport toasts={toasts} dismiss={dismissToast} />
      {!online && <div className="offline-indicator" role="status">You’re offline</div>}
      {view !== "admin" && <header className="top px-3 py-2 sm:px-5">
        <button className="brand" onClick={() => {
          if (view === "admin") reloadCategories();
          setSelectedCategory("");
          setView("user");
        }}>
          <img src={theme === "dark" ? "/mangalya-logo-light.png" : "/mangalya-logo-light.png"} alt="" /><span className="text-xl sm:text-2xl">Mangalya</span>
        </button>
        <div className="actions">
          <button className="icon" aria-label="Toggle theme" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            {theme === "light" ? "☾" : "☀"}
          </button>
          <button className="icon" aria-label="Admin login" title="Admin" onClick={adminClick}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><circle cx="12" cy="10" r="2.5"/><path d="M7.5 17c1-2.5 3-3.5 4.5-3.5s3.5 1 4.5 3.5"/></svg>
          </button>
        </div>
      </header>}

      {view === "admin" && token ? (
        <div className="page-transition" key="admin">
          <Admin
            token={token}
            isEnvAdmin={isEnvAdmin}
            theme={theme}
            onToggleTheme={() => setTheme((current) => current === "light" ? "dark" : "light")}
            onViewSite={() => {
              setSelectedCategory("");
              setView("user");
            }}
            items={items}
            itemsLoading={itemsLoading}
            itemsError={itemsError}
            reload={reload}
            logout={logout}
            notify={notify}
            requestLogout={() => setLogoutPrompt(true)}
          />
        </div>
      ) : (
        <main className="wrap page-transition w-full px-2 sm:px-3 lg:px-4" key="user">
          <section className="hero w-full">
            <a className="hero-link" href="#collections" aria-label="Explore collections">
              <img
                className={`hero-banner${bannerReadyTheme === theme ? " is-loaded" : ""}`}
                src={theme === "dark" ? "/mangalya_burgundy_HD.png" : "/mangalya_cream_HD.png"}
                alt={theme === "dark" ? "Mangalya burgundy and gold celebration banner" : "Mangalya cream and gold celebration banner"}
                width="3548"
                height={theme === "dark" ? "910" : "852"}
                fetchPriority="high"
                onLoad={() => setBannerReadyTheme(theme)}
                onError={() => setBannerReadyTheme(theme)}
              />
            </a>
          </section>
          <Reveal className="category-reveal">
            <section className="category-section" aria-label="Shop by category">
              <div className="category-list">
                {categoriesLoading ? (
                  <p className="muted category-status" role="status">Loading categories...</p>
                ) : categoriesError ? (
                  <div className="category-status" role="alert">
                    <span>Categories couldn&apos;t be loaded: {categoriesError}</span>
                    <button className="category-retry" type="button" onClick={reloadCategories}>Try again</button>
                  </div>
                ) : (
                  <>
                    {categories.map((category) => (
                      <button
                        className={`category-button${selectedCategory === category.name ? " active" : ""}`}
                        key={category.id}
                        type="button"
                        aria-pressed={selectedCategory === category.name}
                        onClick={() => setSelectedCategory((current) => current === category.name ? "" : category.name)}
                      >
                        <CategoryVisual category={category} />
                        <span className="category-name">{category.name}</span>
                      </button>
                    ))}
                    {categories.length > 0 && (
                      <button
                        className={`category-button category-view-all${selectedCategory === "" ? " active" : ""}`}
                        type="button"
                        aria-pressed={selectedCategory === ""}
                        onClick={() => {
                          setSelectedCategory("");
                          document.getElementById("collections")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                      >
                        <span className="category-icon" aria-hidden="true">✦</span>
                        <span className="category-name">View All</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </section>
          </Reveal>
          <div id="collections">
            {itemsLoading ? (
              <ProductSkeletons />
            ) : itemsError ? (
              <div className="load-error center" role="alert">
                <p>Products couldn&apos;t be loaded: {itemsError}</p>
                <button className="btn small" type="button" onClick={reload}>Try again</button>
              </div>
            ) : visibleItems.length === 0 ? (
              selectedCategory ? (
                <div className="muted center category-empty">
                  <p>No items in {selectedCategory} yet.</p>
                  <button className="btn small" type="button" onClick={() => setSelectedCategory("")}>View all items</button>
                </div>
              ) : (
                <div className="empty-state public-empty-state"><span aria-hidden="true">✦</span><strong>Our collection is coming soon</strong><p>Please check back soon for something special.</p></div>
              )
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
                {visibleItems.map((it, index) => (
                  <Reveal key={it.id} style={{ "--reveal-delay": `${Math.min(index, 5) * 70}ms` }}>
                    <article className="card product-card">
                      <button className="product-card-details" type="button" onClick={() => setOpen(it)}>
                        <img src={it.imageUrl} alt={it.name} loading="lazy" />
                        <span className="product-card-name">{it.name}</span>
                      </button>
                      <button className="btn small product-card-contact" type="button" onClick={() => setContactItem(it)}>
                        Contact Us
                      </button>
                    </article>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {open && <ItemView item={open} onClose={() => setOpen(null)} onContact={(item) => { setOpen(null); setContactItem(item); }} />}
      {contactItem && <ContactDialog item={contactItem} onClose={() => setContactItem(null)} />}
      {login && <Login onClose={() => setLogin(false)} onToken={onToken} notify={notify} />}
      {logoutPrompt && (
        <ConfirmDialog
          title="Sign out?"
          message="Are you sure you want to sign out of the admin panel?"
          confirmLabel="Sign out"
          onCancel={() => setLogoutPrompt(false)}
          onConfirm={confirmLogout}
        />
      )}
    </>
  );
}
