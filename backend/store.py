"""Local isolated demo storage + Supabase state gateway with optimistic transactions.
Real workspaces NEVER fall back to SQLite. Supabase service key is server-only.
"""

import copy, hashlib, json, os, secrets, sqlite3, threading
from contextlib import contextmanager
from pathlib import Path
import httpx
from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[1]


SCHEMA = {
    "workspaces": "CREATE TABLE IF NOT EXISTS workspaces(id TEXT PRIMARY KEY,state TEXT NOT NULL,rev INTEGER NOT NULL DEFAULT 1)",
    "users": "CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL)",
    "memberships": "CREATE TABLE IF NOT EXISTS memberships(workspace_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL, display_name TEXT NOT NULL, PRIMARY KEY(workspace_id,user_id))",
}


def ensure_schema(c):
    """Idempotent schema creation.

    The database file can be deleted or replaced while the process is running
    (cleanup, redeploys, snapshots). Recreating it on next use keeps the API
    working instead of failing with 'no such table'.
    """
    for statement in SCHEMA.values():
        c.execute(statement)


class Store:
    def __init__(self, path=None):
        self.path = str(path or ROOT / "demo.sqlite3")
        self.lock = threading.RLock()
        with self.db() as c:
            ensure_schema(c)

    @contextmanager
    def db(self):
        c = sqlite3.connect(self.path, timeout=15)
        try:
            c.execute("PRAGMA journal_mode=WAL")
            ensure_schema(c)
            with c:
                yield c
        finally:
            c.close()

    def create(self, wid, state):
        with self.lock, self.db() as c:
            c.execute(
                "INSERT INTO workspaces(id,state) VALUES(?,?)", (wid, json.dumps(state))
            )

    def read(self, wid):
        with self.db() as c:
            row = c.execute(
                "SELECT state,rev FROM workspaces WHERE id=?", (wid,)
            ).fetchone()
        if not row:
            raise HTTPException(404, "Workspace not found")
        return json.loads(row[0]), row[1]

    def mutate(self, wid, fn):
        with self.lock, self.db() as c:
            c.execute("BEGIN IMMEDIATE")
            row = c.execute(
                "SELECT state,rev FROM workspaces WHERE id=?", (wid,)
            ).fetchone()
            if not row:
                raise HTTPException(404, "Workspace not found")
            state = json.loads(row[0])
            result = fn(state)
            c.execute(
                "UPDATE workspaces SET state=?,rev=rev+1 WHERE id=?",
                (json.dumps(state), wid),
            )
            return copy.deepcopy(result)


class Supabase:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self.anon = os.getenv("SUPABASE_ANON_KEY", "")

    @property
    def configured(self):
        return bool(self.url and self.key and self.anon)

    def request(self, method, path, body=None, token=None, anon=False):
        if not self.configured:
            raise HTTPException(
                503,
                "Supabase is not configured. Real workspaces are unavailable; use the labelled local demo.",
            )
        key = self.anon if anon else self.key
        try:
            r = httpx.request(
                method,
                self.url + path,
                headers={
                    "apikey": key,
                    "Authorization": "Bearer " + (token or key),
                    "Prefer": "return=representation",
                },
                json=body,
                timeout=15,
            )
        except httpx.HTTPError:
            raise HTTPException(
                503, "Supabase could not be reached. No local fallback was used."
            )
        if not r.is_success:
            raise HTTPException(
                503 if r.status_code >= 500 else r.status_code,
                "Supabase request failed; check authentication/schema/configuration.",
            )
        return r.json() if r.content else None

    def user(self, token):
        return self.request("GET", "/auth/v1/user", token=token, anon=True)

    def auth(self, path, body, token=None):
        """Auth endpoints return structured errors; surface them honestly."""
        if not self.configured:
            raise HTTPException(503, "Supabase is not configured.")
        try:
            r = httpx.post(
                self.url + path,
                headers={"apikey": self.anon, "Authorization": "Bearer " + (token or self.anon), "Content-Type": "application/json"},
                json=body,
                timeout=20,
            )
        except httpx.HTTPError:
            raise HTTPException(503, "Could not reach Supabase Auth. Check your connection and retry.")
        if r.is_success:
            return r.json() if r.content else {}
        try:
            payload = r.json()
        except ValueError:
            payload = {}
        message = (
            payload.get("msg")
            or payload.get("error_description")
            or payload.get("message")
            or payload.get("error")
            or f"Authentication failed (HTTP {r.status_code})"
        )
        status = r.status_code if r.status_code in (400, 401, 403, 409, 422, 429) else 503
        raise HTTPException(status, str(message))

    def users(self):
        rows = self.request("GET", "/auth/v1/admin/users?per_page=200")
        return (rows or {}).get("users", [])

    def signup(self, email, password):
        """Create a Supabase Auth account. Returns (token, user) when a session is issued."""
        return self.request("POST", "/auth/v1/signup", {"email": email, "password": password}, anon=True)

    def member(self, wid, user_id):
        rows = self.request(
            "GET",
            f"/rest/v1/proofline_members?workspace_id=eq.{wid}&user_id=eq.{user_id}&select=role,display_name",
        )
        if not rows:
            raise HTTPException(403, "You are not a member of this workspace")
        return rows[0]

    def create(self, wid, state, owner):
        self.request(
            "POST",
            "/rest/v1/proofline_workspaces",
            {"id": wid, "owner_id": owner["id"], "state": state},
        )
        self.request(
            "POST",
            "/rest/v1/proofline_members",
            {
                "workspace_id": wid,
                "user_id": owner["id"],
                "role": "manager",
                "display_name": owner["name"],
            },
        )

    def read(self, wid):
        rows = self.request(
            "GET", f"/rest/v1/proofline_workspaces?id=eq.{wid}&select=state,revision"
        )
        if not rows:
            raise HTTPException(404, "Workspace not found")
        return rows[0]["state"], rows[0]["revision"]

    def mutate(self, wid, fn):
        for _ in range(3):
            state, rev = self.read(wid)
            result = fn(state)
            ok = self.request(
                "POST",
                "/rest/v1/rpc/proofline_cas_state",
                {"p_id": wid, "p_expected": rev, "p_state": state},
            )
            if ok:
                return result
        raise HTTPException(
            409,
            "Another action changed the workspace. Reload and retry; nothing was overwritten.",
        )

    def put_file(self, wid, fid, data, ctype):
        bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "proofline-private")
        try:
            r = httpx.post(
                f"{self.url}/storage/v1/object/{bucket}/{wid}/{fid}",
                headers={
                    "apikey": self.key,
                    "Authorization": "Bearer " + self.key,
                    "Content-Type": ctype,
                },
                content=data,
                timeout=20,
            )
            if not r.is_success:
                raise HTTPException(503, "Private storage upload failed")
        except httpx.HTTPError:
            raise HTTPException(503, "Private storage unavailable")

    def file(self, wid, fid):
        bucket = os.getenv("SUPABASE_STORAGE_BUCKET", "proofline-private")
        r = httpx.get(
            f"{self.url}/storage/v1/object/authenticated/{bucket}/{wid}/{fid}",
            headers={"apikey": self.key, "Authorization": "Bearer " + self.key},
            timeout=15,
        )
        if not r.is_success:
            raise HTTPException(404, "Private file unavailable")
        return r.content

    def delete_file(self, wid, fid):
        self.request(
            "DELETE",
            "/storage/v1/object/"
            + os.getenv("SUPABASE_STORAGE_BUCKET", "proofline-private"),
            {"prefixes": [wid + "/" + fid]},
        )


class Accounts:
    """Local development accounts: PBKDF2-hashed passwords, server-side roles.

    Used when Supabase is not configured so a reviewer can genuinely sign in with
    a separate identity. Clearly reported as local by /api/config.
    """

    ITERATIONS = 200_000

    def __init__(self, path=None):
        self.path = str(path or ROOT / "accounts.sqlite3")
        self.lock = threading.RLock()
        with self.db() as c:
            ensure_schema(c)

    @contextmanager
    def db(self):
        c = sqlite3.connect(self.path, timeout=15)
        try:
            c.execute("PRAGMA journal_mode=WAL")
            ensure_schema(c)
            with c:
                yield c
        finally:
            c.close()

    @staticmethod
    def _hash(password, salt=None):
        salt = salt or secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), Accounts.ITERATIONS).hex()
        return f"pbkdf2${Accounts.ITERATIONS}${salt}${digest}"

    @staticmethod
    def _verify(stored, password):
        try:
            _, iterations, salt, digest = stored.split("$")
            candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iterations)).hex()
            return secrets.compare_digest(candidate, digest)
        except Exception:
            return False

    def register(self, email, password, name):
        email = (email or "").strip().lower()
        with self.lock, self.db() as c:
            if c.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone():
                raise ValueError("duplicate")
            uid = secrets.token_hex(16)
            c.execute("INSERT INTO users VALUES(?,?,?,?,?)", (uid, email, self._hash(password), name, __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()))
            return {"id": uid, "email": email, "name": name}

    def authenticate(self, email, password):
        with self.db() as c:
            row = c.execute("SELECT id,password,name FROM users WHERE email=?", ((email or "").strip().lower(),)).fetchone()
        if not row or not self._verify(row[1], password or ""):
            return None
        return {"id": row[0], "email": email.strip().lower(), "name": row[2]}

    def member(self, workspace_id, user_id):
        with self.db() as c:
            row = c.execute("SELECT role,display_name FROM memberships WHERE workspace_id=? AND user_id=?", (workspace_id, user_id)).fetchone()
        return {"role": row[0], "display_name": row[1]} if row else None

    def add_member(self, workspace_id, user_id, role, display_name):
        with self.lock, self.db() as c:
            c.execute("INSERT INTO memberships VALUES(?,?,?,?) ON CONFLICT(workspace_id,user_id) DO UPDATE SET role=excluded.role,display_name=excluded.display_name", (workspace_id, user_id, role, display_name))

    def members(self, workspace_id):
        with self.db() as c:
            rows = c.execute("SELECT m.user_id,u.email,m.role,m.display_name FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=? ORDER BY m.role", (workspace_id,)).fetchall()
        return [{"id": r[0], "email": r[1], "role": r[2], "name": r[3]} for r in rows]

    def workspace_for(self, user_id):
        with self.db() as c:
            row = c.execute("SELECT workspace_id FROM memberships WHERE user_id=? LIMIT 1", (user_id,)).fetchone()
        return row[0] if row else None

    def user_by_email(self, email):
        with self.db() as c:
            row = c.execute("SELECT id,name FROM users WHERE email=?", ((email or "").strip().lower(),)).fetchone()
        return {"id": row[0], "name": row[1]} if row else None
