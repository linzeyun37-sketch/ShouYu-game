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

  function fileHref(path) {
    return "../" + encodeURI(path);
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
      '<div class="game-no" style="background:' + (cat ? cat.color : "#9C8C74") + '">' + esc(g.id) + '</div>' +
      '<div class="game-body"><h3>' + esc(g.title) + statusTag(g.status) + '</h3>' +
      '<p>' + esc(g.summary) + '</p>' +
      '<div class="chips">' + chips(g) + '</div></div></a>';
  }

  function renderHome() {
    var scenes = window.SCENES.map(function (s) {
      var cat = catOf(s.cat);
      return '<a class="card scene" href="#/cat/' + s.cat + '" style="border-top-color:' + cat.color + '">' +
        '<h3>' + esc(cat.name) + '</h3>' +
        '<p>活动需要：' + esc(s.name) + '</p>' +
        '<p class="example">例：' + esc(s.example) + '</p></a>';
    }).join("");

    var levels = LEVELS.map(function (l) {
      var items = gamesAtLevel(l.level);
      var preview = items.slice(0, 4).map(function (g) { return esc(g.title); }).join("、");
      return '<a class="card level-card level-' + l.level + '" href="#/level/' + l.level + '">' +
        '<div class="level-head"><span class="level-stars">' + stars(l.level) + '</span>' +
        '<h3>' + esc(l.name) + '</h3></div>' +
        '<p>' + esc(l.desc) + '</p>' +
        '<p class="example">如：' + preview + ' 等</p>' +
        '<div class="count">共 ' + items.length + ' 个游戏</div></a>';
    }).join("");

    var todoCount = gamesIn("8").length;

    app.innerHTML =
      '<section class="hero">' +
        '<h1 class="home-title">' + esc(window.SITE.title) + '</h1>' +
        '<p>按活动需要或难度找到合适的游戏，每个游戏都附有简介、人数、时长、难度和原始资料。</p>' +
        '<span class="notice">' + esc(window.SITE.notice) + '</span>' +
      '</section>' +
      '<h2 class="section-title">按活动需要选游戏</h2>' +
      '<div class="grid">' + scenes + '</div>' +
      '<h2 class="section-title">按难度选游戏</h2>' +
      '<div class="grid">' + levels +
        '<a class="card level-card level-0" href="#/level/0">' +
          '<div class="level-head"><span class="level-stars">☆☆☆</span><h3>待定</h3></div>' +
          '<p>难度尚未评估的游戏，多为 54–66 号待补充条目。</p>' +
          '<div class="count">共 ' + gamesAtLevel(0).length + ' 个游戏</div></a>' +
      '</div>' +
      '<h2 class="section-title">待补充与反馈</h2>' +
      '<div class="grid">' +
        '<a class="card" href="#/todo"><h3>待补充的游戏</h3>' +
          '<p>原始资料只留名称与线索，共 ' + todoCount + ' 条，欢迎补充规则。</p>' +
          '<div class="count">查看列表</div></a>' +
        '<a class="card" href="#/todo"><h3>意见反馈</h3>' +
          '<p>发现规则有误、人数时长不合适，或想补充玩法，都可以在这里留言。</p>' +
          '<div class="count">填写反馈</div></a>' +
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
        '<div class="cat-bar" style="background:' + cat.color + '"></div>' +
        '<h1 class="page-title">' + esc(cat.name) + '</h1>' +
        '<p>' + esc(cat.intro) + '</p>' +
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
        '<div class="cat-bar" style="background:var(--terra)"></div>' +
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
      : '<span class="btn disabled">完整玩法页：预留，待上线</span>';

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

        '<h2 class="major-title">玩法讲解</h2>' + guideHtml +

        '<h2 class="sec-title">完整页面</h2>' +
        '<p>' + pageBtn + '</p>' +
        '<p class="note">完整玩法页上线后，只需在数据中为本游戏填写 page 字段，此按钮即自动启用。</p>' +

        '<h2 class="sec-title">原始资料</h2>' + files +

        (related ? '<h2 class="sec-title">相关游戏</h2><ul class="related-list">' + related + '</ul>' : '') +

        backButton(backHref, backLabel) +
        pager +
      '</article>';
  }

  function renderTodo() {
    var todo = gamesIn("8").map(function (g) {
      return '<a class="game-item" href="#/game/' + g.id + '">' +
        '<div class="game-no" style="background:#9C8C74">' + esc(g.id) + '</div>' +
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
      '<div class="crumb"><a href="#/">首页</a> / 待补充与反馈</div>' +
      '<div class="page-head">' +
        '<div class="cat-bar" style="background:#9C8C74"></div>' +
        '<h1 class="page-title">待补充与反馈</h1>' +
        '<p>这里列出尚未补全规则的游戏，也可以提交意见，帮助我们完善手册。</p>' +
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
      var subject = encodeURIComponent("手语小游戏手册反馈 · " + f.game.value);
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
      '<div class="crumb"><a href="#/">首页</a> / 搜索与筛选</div>' +
      '<div class="page-head"><h1 class="page-title">搜索与筛选</h1>' +
      '<p>可按游戏名、词语、玩法关键词搜索，也可以按分类、难度和状态筛选。</p></div>' +
      '<div class="search-panel">' +
        '<input id="s-q" type="search" aria-label="搜索游戏关键词" placeholder="例如：数字、故事、拆弹、两人" value="' + esc(p.q || "") + '">' +
        '<div class="filters">' +
          '<label>分类<select id="s-cat">' + catOptions + '</select></label>' +
          '<label>难度<select id="s-level">' + levelOptions + '</select></label>' +
          '<label>状态<select id="s-status">' + statusOptions + '</select></label>' +
          '<button type="button" class="btn ghost" id="s-reset">清空条件</button>' +
        '</div>' +
      '</div>' +
      '<p class="note" id="s-count"></p>' +
      '<div class="game-list" id="s-results"></div>' +
      backButton("#/", "首页");

    function refresh() {
      var q = document.getElementById("s-q").value.trim();
      var cat = document.getElementById("s-cat").value;
      var level = document.getElementById("s-level").value;
      var status = document.getElementById("s-status").value;
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
      '<div class="crumb"><a href="#/">首页</a> / 资料下载</div>' +
      '<div class="page-head"><h1 class="page-title">资料下载</h1>' +
      '<p>以下文件均可下载。每个文件后标注了对应的游戏编号，同一文件可能对应多个游戏。</p></div>' +
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
  }

  document.getElementById("site-title").textContent = window.SITE.title;
  document.getElementById("site-subtitle").textContent = window.SITE.subtitle + " · " + window.SITE.updated;
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("hashchange", function () {
    route();
    setTitle();
    window.scrollTo(0, 0);
  });
  route();
  setTitle();
})();
