#!/usr/bin/env node
// 题库服务：保存投稿与点赞，数据存放在本机 SQLite 文件中，不依赖任何外部服务。
// 需要支持直接加载 node:sqlite 的 Node.js（正式环境为 22.22.1）。
//
// 用法：
//   node server.js --db /var/lib/signplay/bank.sqlite --port 8765
//   可选：--static <目录>  本地测试时同时提供网页（正式环境由 Nginx 提供网页，不需要此参数）
//         --trust-proxy   经过 Nginx 反向代理时，从 X-Forwarded-For 取得访客地址
//
// 接口（均以 /api 开头）：
//   GET  /api/banks/:gid                    读取某游戏的全部题目
//   POST /api/banks/:gid        {text}      投稿
//   POST /api/banks/:gid/:key/like {}       点赞（同一访客对同一题目只计一次）

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

// 与网页共用示例题目，点赞请求不能改写题目文字。
const BANKS = require("../../网站/js/banks.js");
const ALLOWED_GIDS = new Set(Object.keys(BANKS));
const MAX_TEXT = 40;
const MAX_BODY = 4096;
const SUBMIT_LIMIT = 5; // 每个访客每分钟最多投稿次数
const SALT = process.env.BANK_SALT || "signplay-bank";

const args = parseArgs(process.argv.slice(2));
const dbPath = args.db || path.join(process.cwd(), "bank.sqlite");
const port = Number(args.port || 8765);
const staticDir = args.static ? path.resolve(args.static) : null;
const trustProxy = Boolean(args["trust-proxy"]);

fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    gid TEXT NOT NULL,
    key TEXT NOT NULL,
    text TEXT NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    created INTEGER NOT NULL,
    PRIMARY KEY (gid, key)
  );
  CREATE TABLE IF NOT EXISTS votes (
    gid TEXT NOT NULL,
    key TEXT NOT NULL,
    voter TEXT NOT NULL,
    PRIMARY KEY (gid, key, voter)
  );
`);

const stmt = {
  listItems: db.prepare("SELECT key, text, likes FROM items WHERE gid = ? ORDER BY likes DESC, created ASC"),
  getItem: db.prepare("SELECT key, text, likes FROM items WHERE gid = ? AND key = ?"),
  insertItem: db.prepare("INSERT INTO items (gid, key, text, likes, created) VALUES (?, ?, ?, 0, ?)"),
  insertSeed: db.prepare("INSERT OR IGNORE INTO items (gid, key, text, likes, created) VALUES (?, ?, ?, 0, ?)"),
  bumpLikes: db.prepare("UPDATE items SET likes = likes + 1 WHERE gid = ? AND key = ?"),
  hasVote: db.prepare("SELECT 1 FROM votes WHERE gid = ? AND key = ? AND voter = ?"),
  insertVote: db.prepare("INSERT INTO votes (gid, key, voter) VALUES (?, ?, ?)"),
};

const submitLog = new Map(); // 访客 -> [时间戳]

function parseArgs(list) {
  const out = {};
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!a.startsWith("--")) continue;
    const name = a.slice(2);
    const next = list[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[name] = true;
    } else {
      out[name] = next;
      i++;
    }
  }
  return out;
}

function clientAddress(req) {
  if (trustProxy) {
    const fwd = req.headers["x-forwarded-for"];
    if (fwd) return String(fwd).split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

function voterId(req) {
  const ua = String(req.headers["user-agent"] || "");
  return crypto.createHash("sha256").update(clientAddress(req) + "|" + ua + "|" + SALT).digest("hex");
}

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(data),
  });
  res.end(data);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(httpError(413, "内容太长"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          throw httpError(400, "请求格式不正确");
        }
        resolve(body);
      } catch (e) {
        reject(httpError(400, "请求格式不正确"));
      }
    });
    req.on("error", reject);
  });
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function cleanText(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) throw httpError(400, "请先写下题目");
  if ([...text].length > MAX_TEXT) throw httpError(400, "题目最多 " + MAX_TEXT + " 个字");
  return text;
}

function checkGid(gid) {
  if (!ALLOWED_GIDS.has(gid)) throw httpError(404, "该游戏暂未开放题库");
}

function takeSubmitSlot(voter) {
  const now = Date.now();
  const recent = (submitLog.get(voter) || []).filter((t) => now - t < 60000);
  if (recent.length >= SUBMIT_LIMIT) throw httpError(429, "投稿太频繁，请稍后再试");
  recent.push(now);
  submitLog.set(voter, recent);
}

function newKey() {
  return "u" + Date.now().toString(36) + crypto.randomBytes(3).toString("hex");
}

async function handleApi(req, res, pathname) {
  const parts = pathname.split("/").filter(Boolean); // ["api", "banks", gid, key?, action?]
  if (parts[0] !== "api" || parts[1] !== "banks" || !parts[2]) throw httpError(404, "接口不存在");
  const gid = parts[2];
  checkGid(gid);

  if (req.method === "GET" && parts.length === 3) {
    const rows = stmt.listItems.all(gid);
    const data = {};
    for (const r of rows) data[r.key] = { text: r.text, likes: r.likes };
    return json(res, 200, data);
  }

  if (req.method === "POST" && parts.length === 3) {
    const body = await readJson(req);
    const text = cleanText(body.text);
    takeSubmitSlot(voterId(req));
    const key = newKey();
    stmt.insertItem.run(gid, key, text, Date.now());
    return json(res, 201, { key, text, likes: 0 });
  }

  if (req.method === "POST" && parts.length === 5 && parts[4] === "like") {
    const key = parts[3];
    if (!/^[su][A-Za-z0-9]{1,24}$/.test(key)) throw httpError(400, "题目编号不正确");
    await readJson(req);
    const voter = voterId(req);
    if (/^s\d+$/.test(key)) {
      const seed = BANKS[gid].seeds[Number(key.slice(1))];
      if (!seed || key !== "s" + Number(key.slice(1))) throw httpError(404, "题目不存在");
      stmt.insertSeed.run(gid, key, seed, Date.now());
    }
    const row = stmt.getItem.get(gid, key);
    if (!row) throw httpError(404, "题目不存在");
    if (stmt.hasVote.get(gid, key, voter)) {
      return json(res, 200, { likes: row.likes, already: true });
    }
    db.exec("BEGIN IMMEDIATE");
    try {
      stmt.insertVote.run(gid, key, voter);
      stmt.bumpLikes.run(gid, key);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
    const updated = stmt.getItem.get(gid, key);
    return json(res, 200, { likes: updated.likes, already: false });
  }

  throw httpError(405, "不支持的请求方式");
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

function serveStatic(req, res, pathname) {
  if (!staticDir) return json(res, 404, { error: "未找到" });
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.resolve(staticDir, "." + rel);
  if (!file.startsWith(staticDir + path.sep) && file !== staticDir) return json(res, 403, { error: "禁止访问" });
  fs.readFile(file, (err, data) => {
    if (err) return json(res, 404, { error: "未找到" });
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url.pathname);
    } else {
      serveStatic(req, res, url.pathname);
    }
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    if (!res.headersSent) json(res, status, { error: status === 500 ? "服务器错误" : err.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log("bank api listening on 127.0.0.1:" + port + ", db=" + path.resolve(dbPath));
});
