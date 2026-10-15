(function () {
  var app = document.getElementById("app");
  var STATUS_CLASS = { "完整规则": "complete", "复玩方案": "replay", "待补充": "todo" };
  var TODO_NOTE = {
    "完整规则": "原始资料有完整规则",
    "复玩方案": "由索引整理的复玩方案，使用前请带领人确认",
    "待补充": "原始资料只留名称与线索，规则待补录"
  };
  var LEVELS = [
    { level: 1, name: "入门", desc: "零基础也能上手，适合新孩子和第一次带领。" },
    { level: 2, name: "进阶", desc: "需要一定手语基础，规则稍多，适合熟悉后的小团。" },
    { level: 3, name: "挑战", desc: "规则复杂或时间较长，适合熟练成员和总复习。" }
  ];

  function esc(s) {
    if (s == null) return "";
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }

  function catOf(key) {
    return window.CATEGORIES.filter(function (c) { return c.key === key; })[0];
  }

  function gamesIn(key) {
    return window.GAMES.filter(function (g) { return g.cat === key; });
  }

  function gameIndex(id) {
    for (var i = 0; i < window.GAMES.length; i++) {
      if (window.GAMES[i].id === id) return i;
    }
    return -1;
  }

  function gameById(id) {
    var i = gameIndex(id);
    return i === -1 ? null : window.GAMES[i];
  }

  function metaOf(g) {
    return (window.META || {})[g.id] || { players: "待补充", duration: "待补充", level: 0 };
  }

  function gamesAtLevel(level) {
    return window.GAMES.filter(function (g) { return metaOf(g).level === level; });
  }

  function stars(level) {
    var s = "";
    for (var i = 1; i <= 3; i++) s += i <= level ? "★" : "☆";
    return s;
  }

  function levelName(level) {
    return LEVELS.filter(function (l) { return l.level === level; })[0].name;
  }

  function levelChip(level) {
    if (!level) return '<span class="chip chip-todo">难度：待定</span>';
    return '<span class="chip chip-level">' + stars(level) + ' ' + levelName(level) + '</span>';
  }

  function chips(g) {
    var m = metaOf(g);
    return '<span class="chip">人数：' + esc(m.players) + '</span>' +
      '<span class="chip">时长：' + esc(m.duration) + '</span>' +
      levelChip(m.level);
  }

  // 网页在线打开时用相对路径；单独下载 HTML 到本地打开时，改用线上地址
  function fileHref(path) {
    var base = location.protocol === "file:" && window.SITE.remoteBase ? window.SITE.remoteBase : (window.SITE.resourceBase || "../");
    return base + encodeURI(path);
  }

  function fileName(path) {
    return path.split("/").pop();
  }

  function statusTag(status) {
    return '<span class="status ' + STATUS_CLASS[status] + '">' + esc(status) + "</span>";
  }

  function list(items, tag) {
    return "<" + tag + ' class="guide-list">' + items.map(function (t) {
      return "<li>" + esc(t) + "</li>";
    }).join("") + "</" + tag + ">";
  }

  function backButton(href, label) {
    return '<p class="back-row"><a class="btn ghost" href="' + href + '">← 返回 ' + esc(label) + '</a></p>';
  }

  // 资料文件 → 对应的游戏编号
  function fileIndex() {
    var map = {};
    window.GAMES.forEach(function (g) {
      g.resources.forEach(function (p) {
        (map[p] = map[p] || []).push(g.id);
      });
    });
    return map;
  }

  function gameLink(g) {
    var cat = catOf(g.cat);
    return '<a class="game-item" href="#/game/' + esc(g.id) + '">' +
      '<div class="game-no tone-' + (cat ? cat.key : '8') + '">' + esc(g.id) + '</div>' +
      '<div class="game-body"><h3>' + esc(g.title) + statusTag(g.status) + '</h3>' +
      '<p>' + esc(g.summary) + '</p>' +
      '<div class="chips">' + chips(g) + '</div></div></a>';
  }

  function categoryIcon(key) {
    var paths = {
      "1": '<path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/><path d="M8 9h8M8 13h5"/>',
      "2": '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2"/>',
      "3": '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/><path d="M17 3v8M13 7h8M3 17h8M7 13v8"/>',
      "4": '<path d="M12 6C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 2Zm0 0v15M5 8h3M5 12h3M16 8h3M16 12h3"/>',
      "5": '<path d="M9 3H4v6c4-2 5 0 5 2s-2 3-5 2v7h7c-1-4 1-5 3-5s3 2 2 5h5v-7c-4 1-5-1-5-3s2-3 5-2V3h-6c2 4 0 5-2 5s-3-2-2-5Z"/>',
      "6": '<rect x="8" y="4" width="13" height="17" rx="3"/><path d="M5 18H4a2 2 0 0 1-2-2V5a3 3 0 0 1 3-3h10M14.5 9l3 3.5-3 3.5-3-3.5Z"/>',
      "7": '<path d="M8 11V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v9c0 5-3 7-7 7-3 0-5-1-7-4l-3-4a2 2 0 0 1 3-3l2 2"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[key] || '') + '</svg>';
  }

  function renderHome() {
    var scenes = window.SCENES.map(function (s) {
      var cat = catOf(s.cat);
      return '<a class="card scene tone-' + s.cat + '" href="#/cat/' + s.cat + '">' +
        '<div class="scene-top"><span class="category-icon">' + categoryIcon(s.cat) + '</span>' +
        '<span class="scene-count">' + gamesIn(s.cat).length + ' 个游戏</span></div>' +
        '<h3>' + esc(cat.short) + '<span class="card-arrow" aria-hidden="true">↗</span></h3>' +
        '<p class="example">' + esc(s.example) + '</p></a>';
    }).join("");

    var levels = LEVELS.map(function (l) {
      return '<a class="level-card level-' + l.level + '" href="#/level/' + l.level + '">' +
        '<div class="level-head"><span class="level-stars" aria-hidden="true">' + stars(l.level) + '</span>' +
        '<h3>' + esc(l.name) + '</h3><span class="level-count">' + gamesAtLevel(l.level).length + ' 个</span></div>' +
        '<p>' + esc(l.desc) + '</p></a>';
    }).join("");

    var todoCount = gamesIn("8").length;
    app.innerHTML =
      '<section class="hero">' +
        '<div class="hero-copy"><h1 class="home-title">手语小游戏手册</h1>' +
        '<p class="hero-meta"><span><strong>' + window.GAMES.length + '</strong> 个游戏</span>' +
          '<span><strong>' + window.SCENES.length + '</strong> 类活动</span>' +
          '<a href="#/search">浏览全部 <span aria-hidden="true">↗</span></a></p></div>' +
        '<div class="hero-art" aria-hidden="true"><img src="' + document.getElementById("brand-icon").src + '" alt="" width="176" height="176"></div>' +
      '</section>' +
      '<div class="home-layout"><section aria-labelledby="scenes-title">' +
        '<div class="section-heading"><h2 id="scenes-title">按活动需要</h2></div>' +
        '<div class="scene-grid">' + scenes +
          '<a class="card scene all-games" href="#/search"><div class="scene-top"><span class="category-icon" aria-hidden="true">⌕</span>' +
          '<span class="scene-count">' + window.GAMES.length + ' 个游戏</span></div><h3>全部游戏<span class="card-arrow" aria-hidden="true">↗</span></h3>' +
          '<p class="example">按关键词、分类与难度筛选</p></a>' +
        '</div></section>' +
        '<aside class="home-aside" aria-label="按难度与资料状态查找">' +
          '<section class="difficulty-panel"><div class="section-heading"><h2>按难度选择</h2></div>' +
          '<div class="level-list">' + levels +
            '<a class="level-card level-0" href="#/level/0"><div class="level-head"><span class="level-stars" aria-hidden="true">☆☆☆</span>' +
            '<h3>待定</h3><span class="level-count">' + gamesAtLevel(0).length + ' 个</span></div>' +
            '<p>难度尚未评估，多为 54–66 号待补充条目。</p></a></div>' +
          '<p class="level-note">人数、时长与难度为初步评估，带领前请结合规则确认。</p></section>' +
          '<section class="contribute-panel"><h2>待补充与反馈</h2>' +
            '<p>还有 ' + todoCount + ' 个游戏待补充规则。发现内容有误，或想分享玩法，欢迎告诉我们。</p>' +
            '<a href="#/todo">补充规则或反馈 <span aria-hidden="true">↗</span></a></section>' +
          '<details class="edition-note"><summary>资料收录说明</summary><p>' + esc(window.SITE.notice) + '</p></details>' +
        '</aside>' +
      '</div>';
  }

  function renderCategory(key) {
    if (key === "8") return (location.hash = "#/todo");
    var cat = catOf(key);
    if (!cat) return renderNotFound();
    var items = gamesIn(key).map(function (g) { return gameLink(g); }).join("");

    app.innerHTML =
      '<div class="crumb"><a href="#/">首页</a> / ' + esc(cat.name) + '</div>' +
      '<div class="page-head">' +
        '<h1 class="page-title">' + esc(cat.name) + '</h1>' +
      '</div>' +
      '<div class="game-list">' + items + '</div>' +
      backButton("#/", "首页");
  }

  function renderLevel(n) {
    var lvl = n === "0"
      ? { level: 0, name: "待定", desc: "难度尚未评估，主要是 54–66 号待补充游戏。" }
      : LEVELS.filter(function (l) { return String(l.level) === n; })[0];
    if (!lvl) return renderNotFound();
    var items = gamesAtLevel(lvl.level).map(function (g) { return gameLink(g); }).join("");
    app.innerHTML =
      '<div class="crumb"><a href="#/">首页</a> / 按难度：' + esc(lvl.name) + '</div>' +
      '<div class="page-head">' +
        '<h1 class="page-title">' + esc(lvl.name) + '游戏' + (lvl.level ? ' ' + stars(lvl.level) : '') + '</h1>' +
        '<p>' + esc(lvl.desc) + '</p>' +
      '</div>' +
      '<div class="game-list">' + items + '</div>' +
      backButton("#/", "首页");
  }

  function renderGame(id) {
    var idx = gameIndex(id);
    if (idx === -1) return renderNotFound();
    var g = window.GAMES[idx];
    var cat = catOf(g.cat);
    var m = metaOf(g);
    var idmap = fileIndex();

    var files = g.resources.length
      ? '<ul class="file-list">' + g.resources.map(function (p) {
          return '<li><a class="dl" href="' + fileHref(p) + '" download aria-label="下载 ' + esc(fileName(p)) + '">下载</a>' +
            '<a href="' + fileHref(p) + '">' + esc(fileName(p)) + '</a></li>';
        }).join("") + '</ul>'
      : '<p class="empty">暂未找到对应的原始文件，待补充。</p>';

    var pageBtn = g.page
      ? '<a class="btn" href="' + esc(g.page) + '">打开完整玩法页</a>'
      : '';

    var guide = (window.GUIDES || {})[g.id];
    var guideHtml;
    if (guide) {
      guideHtml =
        '<h3 class="sub-title">适用场景</h3><p>' + esc(guide.scene) + '</p>' +
        '<h3 class="sub-title">准备</h3>' + list(guide.prep, "ul") +
        '<h3 class="sub-title">玩法步骤</h3>' + list(guide.steps, "ol") +
        '<h3 class="sub-title">结束和计分</h3><p>' + esc(guide.scoring) + '</p>' +
        '<h3 class="sub-title">带领时注意</h3>' + list(guide.notes, "ul") +
        (guide.versions && guide.versions.length
          ? '<h3 class="sub-title">版本说明</h3>' + list(guide.versions, "ul")
          : '');
    } else {
      guideHtml =
        '<div class="placeholder">此处日后补充：准备、玩法步骤、结束和计分、带领时注意。<br>' +
          '<small>' + esc(TODO_NOTE[g.status]) + '</small></div>';
    }

    var related = (guide && guide.related ? guide.related : []).map(function (rid) {
      var r = gameById(rid);
      return r ? '<li><a href="#/game/' + r.id + '">' + esc(r.id + " " + r.title) + '</a></li>' : "";
    }).join("");

    var backHref = cat ? "#/cat/" + cat.key : "#/todo";
    var backLabel = cat ? cat.name : "待补充与反馈";

    var prev = idx > 0 ? window.GAMES[idx - 1] : null;
    var next = idx < window.GAMES.length - 1 ? window.GAMES[idx + 1] : null;
    var pager = '<nav class="pager" aria-label="游戏切换">' +
      (prev ? '<a href="#/game/' + prev.id + '">← 上一个：' + esc(prev.id + " " + prev.title) + '</a>' : '<span></span>') +
      (next ? '<a href="#/game/' + next.id + '">下一个：' + esc(next.id + " " + next.title) + ' →</a>' : '<span></span>') +
      '</nav>';

    app.innerHTML =
      '<div class="crumb"><a href="#/">首页</a> / <a href="' + backHref + '">' + esc(backLabel) + '</a> / ' + esc(g.id) + '</div>' +
      '<article class="detail">' +
        '<span class="status ' + STATUS_CLASS[g.status] + '">' + esc(g.status) + '</span>' +
        '<h1 class="page-title">' + esc(g.id) + ' ' + esc(g.title) + '</h1>' +
        '<p class="summary">' + esc(g.summary) + '</p>' +

        '<div class="info-grid">' +
          '<div class="info-cell"><span>人数</span><strong>' + esc(m.players) + '</strong></div>' +
          '<div class="info-cell"><span>时长</span><strong>' + esc(m.duration) + '</strong></div>' +
          '<div class="info-cell"><span>难度</span><strong>' + (m.level ? stars(m.level) + ' ' + levelName(m.level) : "待定") + '</strong></div>' +
        '</div>' +
        '<p class="note">人数、时长与难度为依据规则的初步评估，正式开团前请带领人确认。</p>' +

        '<h2 class="major-title">玩法讲解</h2>' + guideHtml + bankSection(g.id) +

        (pageBtn ? '<h2 class="sec-title">完整页面</h2><p>' + pageBtn + '</p>' : '') +

        '<h2 class="sec-title">原始资料</h2>' + files +

        (related ? '<h2 class="sec-title">相关游戏</h2><ul class="related-list">' + related + '</ul>' : '') +

        backButton(backHref, backLabel) +
        pager +
      '</article>';
    loadBank(g.id);
  }

  // ===== 题库：示例题目 + 在线投稿与点赞（需要配置 SITE.dbUrl） =====
  function dbUrl() {
    return window.SITE.dbUrl || "";
  }

  function dbCall(path, method, body) {
    var opts = { method: method || "GET", headers: { "Content-Type": "application/json" } };
    if (body !== undefined) opts.body = JSON.stringify(body);
    return fetch(dbUrl() + "/" + path + ".json", opts).then(function (r) {
      if (!r.ok) throw new Error("数据库请求失败：" + r.status);
      return r.json();
    });
  }

  function hasVoted(gid, key) {
    try { return localStorage.getItem("vote:" + gid + ":" + key) === "1"; } catch (e) { return false; }
  }

  function markVoted(gid, key) {
    try { localStorage.setItem("vote:" + gid + ":" + key, "1"); } catch (e) {}
  }

  function bankSection(gid) {
    var b = (window.BANKS || {})[gid];
    if (!b) return "";
    return '<h2 class="major-title">题库</h2>' +
      '<p class="bank-hint">' + esc(b.title) + '：' + esc(b.hint) + '</p>' +
      '<div id="bank-box"><p class="note">加载中……</p></div>';
  }

  function loadBank(gid) {
    var b = (window.BANKS || {})[gid];
    if (!b || !document.getElementById("bank-box")) return;
    if (!dbUrl()) {
      renderBank(gid, b, {}, false);
      return;
    }
    dbCall("banks/" + gid, "GET").then(function (data) {
      renderBank(gid, b, data || {}, true);
    }).catch(function (e) {
      document.getElementById("bank-box").innerHTML = '<p class="note">题库暂时无法加载：' + esc(e.message) + '</p>';
    });
  }

  function renderBank(gid, b, data, online) {
    var box = document.getElementById("bank-box");
    if (!box) return;
    var items = b.seeds.map(function (t, i) {
      var rec = data["s" + i] || {};
      return { key: "s" + i, text: t, likes: rec.likes || 0 };
    });
    Object.keys(data).filter(function (k) { return k.charAt(0) === "u" && data[k]; }).forEach(function (k) {
      items.push({ key: k, text: data[k].text, likes: data[k].likes || 0 });
    });
    items.sort(function (x, y) { return y.likes - x.likes; });

    var list = items.map(function (it) {
      var voted = hasVoted(gid, it.key);
      var disabled = !online || voted;
      return '<li class="bank-item"><span class="bank-text">' + esc(it.text) + '</span>' +
        '<button type="button" class="like-btn" data-key="' + esc(it.key) + '" data-text="' + esc(it.text) + '"' +
        (disabled ? ' disabled' : '') + '>' + (voted ? '已点赞' : '点赞') + ' · ' + it.likes + '</button></li>';
    }).join("");

    var form = online
      ? '<form class="bank-form" id="bank-form"><input type="text" id="bank-input" maxlength="40" placeholder="写下你想投稿的题目">' +
        '<button type="submit" class="btn">投稿</button></form><p class="note" id="bank-msg"></p>'
      : '<p class="note">在线题库尚未开通，目前只显示示例题目，暂不能投稿和点赞。</p>';

    box.innerHTML = '<ul class="bank-list">' + list + '</ul>' + form;
    if (!online) return;

    box.querySelectorAll(".like-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        like(gid, btn.getAttribute("data-key"), btn.getAttribute("data-text"));
      });
    });
    document.getElementById("bank-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var text = document.getElementById("bank-input").value.trim();
      var msg = document.getElementById("bank-msg");
      if (!text) { msg.textContent = "请先写下题目。"; return; }
      var key = "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      dbCall("banks/" + gid + "/" + key, "PUT", { text: text, likes: 0 }).then(function () {
        loadBank(gid);
      }).catch(function (err) { msg.textContent = err.message; });
    });
  }

  function like(gid, key, text) {
    if (hasVoted(gid, key)) return;
    var path = "banks/" + gid + "/" + key;
    dbCall(path, "GET").then(function (rec) {
      var n = (rec && rec.likes) || 0;
      return dbCall(path, "PUT", { text: (rec && rec.text) || text, likes: n + 1 });
    }).then(function () {
      markVoted(gid, key);
      loadBank(gid);
    }).catch(function () {});
  }

  function renderTodo() {
    var todo = gamesIn("8").map(function (g) {
      return '<a class="game-item" href="#/game/' + g.id + '">' +
        '<div class="game-no tone-8">' + esc(g.id) + '</div>' +
        '<div class="game-body"><h3>' + esc(g.title) + statusTag(g.status) + '</h3>' +
        '<p>' + esc(g.summary) + '</p></div></a>';
    }).join("");

    var options = '<option value="通用或其他">通用或其他</option>' + window.CATEGORIES.map(function (c) {
      var items = gamesIn(c.key).map(function (g) {
        return '<option value="' + esc(g.id + " " + g.title) + '">' + esc(g.id + " " + g.title) + '</option>';
      }).join("");
      return '<optgroup label="' + esc(c.name) + '">' + items + '</optgroup>';
    }).join("");

    app.innerHTML =
      '<div class="page-head">' +
        '<h1 class="page-title">待补充与反馈</h1>' +
      '</div>' +

      '<h2 class="sec-title">一、待补充的游戏</h2>' +
      '<div class="game-list">' + todo + '</div>' +

      '<h2 class="sec-title">二、意见反馈</h2>' +
      '<form class="feedback" id="feedback-form">' +
        '<label>相关游戏<select name="game">' + options + '</select></label>' +
        '<label>反馈类型<select name="type">' +
          '<option>补充规则</option><option>修正内容</option><option>人数、时长或难度</option><option>其他建议</option>' +
        '</select></label>' +
        '<label>反馈内容<textarea name="content" rows="5" placeholder="请写下你的意见或补充的规则"></textarea></label>' +
        '<label>您的称呼（可不填）<input name="name" type="text"></label>' +
        '<div class="form-actions"><button type="submit" class="btn">生成反馈</button></div>' +
      '</form>' +
      '<div id="feedback-result"></div>' +
      backButton("#/", "首页");

    document.getElementById("feedback-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target;
      var text = "游戏：" + f.game.value + "\n类型：" + f.type.value + "\n称呼：" + (f.name.value || "未填写") + "\n\n" + f.content.value;
      var email = window.SITE.feedbackEmail;
      var subject = encodeURIComponent(window.SITE.title + "反馈 · " + f.game.value);
      var body = encodeURIComponent(text);
      var mailBtn = email
        ? '<a class="btn" href="mailto:' + esc(email) + '?subject=' + subject + '&body=' + body + '">用邮件发送</a>'
        : '<span class="note">尚未设置接收邮箱，请复制下方内容发送给负责人。</span>';
      document.getElementById("feedback-result").innerHTML =
        '<div class="feedback-result"><h3 class="sub-title">反馈内容</h3>' +
        '<textarea readonly rows="7" id="feedback-text">' + esc(text) + '</textarea>' +
        '<p class="form-actions">' + mailBtn + ' <button type="button" class="btn ghost" id="copy-btn">复制内容</button>' +
        ' <button type="button" class="btn ghost" id="refill-btn">重新填写</button></p></div>';
      f.style.display = "none";
      document.getElementById("refill-btn").addEventListener("click", function () {
        document.getElementById("feedback-result").innerHTML = "";
        f.reset();
        f.style.display = "";
      });
      document.getElementById("copy-btn").addEventListener("click", function () {
        var btn = this;
        var box = document.getElementById("feedback-text");
        function done() { btn.textContent = "已复制"; }
        function fallback() {
          box.select();
          var ok = false;
          try { ok = document.execCommand("copy"); } catch (err) {}
          if (ok) done(); else btn.textContent = "复制失败，请手动选中复制";
        }
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(box.value).then(done, fallback);
        } else {
          fallback();
        }
      });
    });
  }

  function parseQuery(qs) {
    var out = {};
    (qs || "").split("&").forEach(function (pair) {
      if (!pair) return;
      var kv = pair.split("=");
      out[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || "").replace(/\+/g, " "));
    });
    return out;
  }

  function haystack(g) {
    var m = metaOf(g);
    var cat = catOf(g.cat);
    var guide = (window.GUIDES || {})[g.id] || {};
    var parts = [
      g.id, g.title, g.summary, g.status,
      cat ? cat.name : "", m.players, m.duration, m.level ? levelName(m.level) : "待定",
      guide.scene || "", (guide.prep || []).join(" "), (guide.steps || []).join(" "),
      guide.scoring || "", (guide.notes || []).join(" "), (guide.versions || []).join(" ")
    ];
    return parts.join(" ").toLowerCase();
  }

  function renderSearch(qs) {
    var p = parseQuery(qs);
    var catOptions = '<option value="">全部分类</option>' + window.CATEGORIES.map(function (c) {
      return '<option value="' + c.key + '"' + (p.cat === c.key ? " selected" : "") + '>' + esc(c.name) + '</option>';
    }).join("");
    var levelOptions = '<option value="">全部难度</option>' +
      LEVELS.map(function (l) {
        return '<option value="' + l.level + '"' + (p.level === String(l.level) ? " selected" : "") + '>' + stars(l.level) + ' ' + esc(l.name) + '</option>';
      }).join("") +
      '<option value="0"' + (p.level === "0" ? " selected" : "") + '>待定</option>';
    var statusOptions = '<option value="">全部状态</option>' + ["完整规则", "复玩方案", "待补充"].map(function (s) {
      return '<option value="' + s + '"' + (p.status === s ? " selected" : "") + '>' + s + '</option>';
    }).join("");

    app.innerHTML =
      '<div class="page-head"><h1 class="page-title">搜索与筛选</h1></div>' +
      '<div class="search-panel">' +
        '<input id="s-q" type="search" aria-label="搜索游戏关键词" placeholder="例如：数字、故事、拆弹、两人" value="' + esc(p.q || "") + '">' +
        '<div class="filters">' +
          '<label>分类<select id="s-cat">' + catOptions + '</select></label>' +
          '<label>难度<select id="s-level">' + levelOptions + '</select></label>' +
          '<label>状态<select id="s-status">' + statusOptions + '</select></label>' +
          '<button type="button" class="btn ghost" id="s-reset">清空条件</button>' +
        '</div>' +
      '</div>' +
      '<p class="note" id="s-count" role="status" aria-live="polite"></p>' +
      '<div class="game-list" id="s-results"></div>' +
      backButton("#/", "首页");

    function refresh() {
      var q = document.getElementById("s-q").value.trim();
      var cat = document.getElementById("s-cat").value;
      var level = document.getElementById("s-level").value;
      var status = document.getElementById("s-status").value;
      document.getElementById("header-search").elements.q.value = q;
      var terms = q.toLowerCase().split(/\s+/).filter(Boolean);

      var results = window.GAMES.filter(function (g) {
        if (cat && g.cat !== cat) return false;
        if (level !== "" && String(metaOf(g).level) !== level) return false;
        if (status && g.status !== status) return false;
        var h = haystack(g);
        return terms.every(function (t) { return h.indexOf(t) !== -1; });
      });

      document.getElementById("s-count").textContent = "共找到 " + results.length + " 个游戏";
      document.getElementById("s-results").innerHTML = results.length
        ? results.map(function (g) { return gameLink(g); }).join("")
        : '<p class="empty">没有符合条件的游戏，换个关键词或放宽筛选条件试试。</p>';

      var qs = [];
      if (q) qs.push("q=" + encodeURIComponent(q));
      if (cat) qs.push("cat=" + cat);
      if (level !== "") qs.push("level=" + level);
      if (status) qs.push("status=" + encodeURIComponent(status));
      try {
        history.replaceState(null, "", "#/search" + (qs.length ? "?" + qs.join("&") : ""));
      } catch (err) {
        // 本地 file:// 打开时浏览器可能禁止修改地址，此时忽略即可
      }
    }

    ["s-q", "s-cat", "s-level", "s-status"].forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener(id === "s-q" ? "input" : "change", refresh);
    });
    document.getElementById("s-reset").addEventListener("click", function () {
      document.getElementById("s-q").value = "";
      document.getElementById("s-cat").value = "";
      document.getElementById("s-level").value = "";
      document.getElementById("s-status").value = "";
      refresh();
    });
    refresh();
  }

  function renderFiles() {
    var idmap = fileIndex();
    var sections = window.CATEGORIES.map(function (c) {
      var files = [];
      gamesIn(c.key).forEach(function (g) {
        g.resources.forEach(function (p) {
          if (files.indexOf(p) === -1) files.push(p);
        });
      });
      var body = files.length
        ? '<ul class="file-list">' + files.map(function (p) {
            var ids = (idmap[p] || []).join("、");
            return '<li><a class="dl" href="' + fileHref(p) + '" download aria-label="下载 ' + esc(fileName(p)) + '">下载</a>' +
              '<a href="' + fileHref(p) + '">' + esc(fileName(p)) + '</a>' +
              '<span class="file-ids">对应游戏：' + esc(ids) + '</span></li>';
          }).join("") + '</ul>'
        : '<p class="empty">暂无文件</p>';
      return '<h2 class="sec-title">' + esc(c.name) + '</h2>' + body;
    }).join("");

    app.innerHTML =
      '<div class="page-head"><h1 class="page-title">资料下载</h1></div>' +
      sections +
      backButton("#/", "首页");
  }

  function renderNotFound() {
    app.innerHTML = '<div class="detail"><h1 class="page-title">页面不存在</h1><p><a href="#/">返回首页</a></p></div>';
  }

  function route() {
    var hash = location.hash.replace(/^#\/?/, "");
    var parts = hash.split("/");
    if (!hash) return renderHome();
    var search = hash.match(/^search(?:\?(.*))?$/);
    if (search) return renderSearch(search[1] || "");
    if (parts[0] === "cat" && parts[1]) return renderCategory(parts[1]);
    if (parts[0] === "level" && parts[1]) return renderLevel(parts[1]);
    if (parts[0] === "game" && parts[1]) return renderGame(parts[1]);
    if (parts[0] === "todo") return renderTodo();
    if (parts[0] === "files") return renderFiles();
    renderNotFound();
  }

  function setTitle() {
    var h1 = app.querySelector("h1");
    document.title = (h1 ? h1.textContent + " · " : "") + window.SITE.title;
    var section = location.hash.replace(/^#\/?/, "").split(/[/?]/)[0];
    var active = section === "files" || section === "todo" ? "#/" + section :
      (section ? "#/search" : "#/");
    document.querySelectorAll(".top-nav a").forEach(function (link) {
      if (link.getAttribute("href") === active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  document.getElementById("site-title").textContent = window.SITE.title;
  document.getElementById("site-subtitle").textContent = window.SITE.subtitle;
  document.querySelector(".skip-link").addEventListener("click", function (e) {
    e.preventDefault();
    app.focus();
  });
  document.getElementById("header-search").addEventListener("submit", function (e) {
    e.preventDefault();
    var q = this.q.value.trim();
    var target = "#/search" + (q ? "?q=" + encodeURIComponent(q) : "");
    if (location.hash === target) { route(); setTitle(); } else { location.hash = target; }
  });

  var toTop = document.getElementById("to-top");
  window.addEventListener("scroll", function () {
    toTop.classList.toggle("show", window.scrollY > 400);
  });
  toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });

  window.addEventListener("hashchange", function () {
    route();
    setTitle();
    window.scrollTo(0, 0);
  });
  route();
  setTitle();
})();
