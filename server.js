require("dotenv").config();

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

const {
  PORT = 10000,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  JWT_SECRET,
  ADMIN_USERNAME = "admin",
  ADMIN_PASSWORD = "change-this-password"
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !JWT_SECRET) {
  console.warn("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or JWT_SECRET.");
}

const db = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

function requireDb(req, res, next) {
  if (!db) return res.status(500).json({ error: "Supabase is not configured." });
  next();
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

function readToken(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

function authUser(req, res, next) {
  try {
    const token = readToken(req);
    if (!token) return res.status(401).json({ error: "Login required." });
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired login." });
  }
}

function authAdmin(req, res, next) {
  try {
    const token = readToken(req);
    if (!token) return res.status(401).json({ error: "Admin login required." });
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== "admin") return res.status(403).json({ error: "Admin access required." });
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired admin login." });
  }
}

function cleanApp(row) {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url || "",
    description: row.description || "",
    homeUrl: row.home_url || "",
    category: row.category || "",
    purchaseVideoUrl: row.purchase_video_url || "",
    active: !!row.active,
    createdAt: row.created_at
  };
}

app.use(express.static(path.join(__dirname, "public")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, database: !!db });
});

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid admin credentials." });
  }
  res.json({ token: signToken({ role: "admin", username }) });
});

app.post("/api/auth/register", requireDb, async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    if (username.length < 3 || password.length < 6) {
      return res.status(400).json({ error: "Username must be 3+ chars and password 6+ chars." });
    }
    const password_hash = await bcrypt.hash(password, 12);
    const { data, error } = await db.from("users").insert({ username, password_hash }).select("id,username,unlocked_apps").single();
    if (error) return res.status(400).json({ error: error.code === "23505" ? "Username already exists." : error.message });
    res.json({ token: signToken({ role: "user", id: data.id, username: data.username }), user: { id: data.id, username: data.username, unlockedApps: data.unlocked_apps || [] } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/auth/login", requireDb, async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    const { data, error } = await db.from("users").select("*").eq("username", username).maybeSingle();
    if (error || !data || !(await bcrypt.compare(password, data.password_hash))) {
      return res.status(401).json({ error: "Invalid username or password." });
    }
    res.json({ token: signToken({ role: "user", id: data.id, username: data.username }), user: { id: data.id, username: data.username, unlockedApps: data.unlocked_apps || [] } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/me", requireDb, authUser, async (req, res) => {
  const { data, error } = await db.from("users").select("id,username,unlocked_apps").eq("id", req.user.id).single();
  if (error) return res.status(404).json({ error: "User not found." });
  res.json({ id: data.id, username: data.username, unlockedApps: data.unlocked_apps || [] });
});

app.get("/api/apps", requireDb, async (req, res) => {
  const { data, error } = await db.from("apps").select("*").eq("active", true).order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(cleanApp));
});

app.get("/api/apps/all", requireDb, authAdmin, async (req, res) => {
  const { data, error } = await db.from("apps").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(cleanApp));
});

app.post("/api/apps", requireDb, authAdmin, async (req, res) => {
  const b = req.body || {};
  const { data, error } = await db.from("apps").insert({
    name: String(b.name || "").trim(),
    logo_url: b.logoUrl || "",
    description: b.description || "",
    home_url: b.homeUrl || "",
    category: b.category || "",
    purchase_video_url: b.purchaseVideoUrl || "",
    active: b.active !== false
  }).select("*").single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(cleanApp(data));
});

app.put("/api/apps/:id", requireDb, authAdmin, async (req, res) => {
  const b = req.body || {};
  const { data, error } = await db.from("apps").update({
    name: String(b.name || "").trim(),
    logo_url: b.logoUrl || "",
    description: b.description || "",
    home_url: b.homeUrl || "",
    category: b.category || "",
    purchase_video_url: b.purchaseVideoUrl || "",
    active: b.active !== false,
    updated_at: new Date().toISOString()
  }).eq("id", req.params.id).select("*").single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(cleanApp(data));
});

app.delete("/api/apps/:id", requireDb, authAdmin, async (req, res) => {
  const { error } = await db.from("apps").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

app.post("/api/keys/generate", requireDb, authAdmin, async (req, res) => {
  const appId = req.body.appId;
  const count = Math.min(Math.max(Number(req.body.count) || 1, 1), 100);
  if (!appId) return res.status(400).json({ error: "appId required." });

  const keys = Array.from({ length: count }, () =>
    "PM-" + crypto.randomBytes(8).toString("hex").toUpperCase()
  );

  const rows = keys.map(key => ({ app_id: appId, key, active: true }));
  const { data, error } = await db.from("app_keys").insert(rows).select("*");
  if (error) return res.status(400).json({ error: error.message });
  res.json({ keys: data.map(x => x.key) });
});

app.get("/api/keys", requireDb, authAdmin, async (req, res) => {
  let q = db.from("app_keys").select("*").order("created_at", { ascending: false });
  if (req.query.appId) q = q.eq("app_id", req.query.appId);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete("/api/keys/:id", requireDb, authAdmin, async (req, res) => {
  const { error } = await db.from("app_keys").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

app.post("/api/keys/verify", requireDb, async (req, res) => {
  try {
    const appId = String(req.body.appId || "");
    const key = String(req.body.key || "").trim();
    const clientId = String(req.headers["x-client-id"] || "").trim();
    const token = readToken(req);
    let user = null;
    if (token) {
      try {
        const p = jwt.verify(token, JWT_SECRET);
        if (p.role === "user") user = p;
      } catch {}
    }

    if (!appId || !key) return res.status(400).json({ error: "App and key are required." });

    const { data: keyRow, error: keyError } = await db.from("app_keys")
      .select("*").eq("app_id", appId).eq("key", key).eq("active", true).maybeSingle();

    if (keyError || !keyRow) return res.status(400).json({ error: "Invalid app key." });

    const binding = user ? `user:${user.id}` : (clientId ? `guest:${clientId}` : null);
    if (!binding) return res.status(400).json({ error: "Client ID required. Refresh the page and try again." });

    if (keyRow.used_by && keyRow.used_by !== binding) {
      return res.status(400).json({ error: "This key has already been used." });
    }

    if (!keyRow.used_by) {
      const { error: updateError } = await db.from("app_keys").update({
        used_by: binding,
        used_at: new Date().toISOString()
      }).eq("id", keyRow.id);
      if (updateError) return res.status(500).json({ error: updateError.message });
    }

    if (user) {
      const { data: u } = await db.from("users").select("unlocked_apps").eq("id", user.id).single();
      const unlocked = Array.from(new Set([...(u?.unlocked_apps || []), appId]));
      const { error: ue } = await db.from("users").update({ unlocked_apps: unlocked }).eq("id", user.id);
      if (ue) return res.status(500).json({ error: ue.message });
    }

    res.json({ ok: true, appId, lifetime: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/notifications", requireDb, async (req, res) => {
  const { data, error } = await db.from("notifications").select("*").order("created_at", { ascending: false }).limit(30);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/notifications", requireDb, authAdmin, async (req, res) => {
  const title = String(req.body.title || "").trim();
  const message = String(req.body.message || "").trim();
  if (!title || !message) return res.status(400).json({ error: "Title and message are required." });
  const { data, error } = await db.from("notifications").insert({ title, message }).select("*").single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.delete("/api/notifications/:id", requireDb, authAdmin, async (req, res) => {
  const { error } = await db.from("notifications").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Prep Master running on port ${PORT}`));
