/* ============================================================
   作品集数据层 + 编辑引擎（无依赖）
   - 所有文字直接在页面里改，改完自动保存
   - 数据保存在本机浏览器（localStorage），可导出 / 导入备份
   - 支持上传头像与项目封面（自动压缩）
   ============================================================ */
(function () {
  "use strict";

  var KEY = "lcp_portfolio_v3";
  var OLD_KEYS = ["lcp_portfolio_v2", "lcp_portfolio_v1"];
  var OLD_DEFAULT_INTRO =
    "我是李成蹊，武汉理工大学数字经济2502班的学生。\n这学期在上数智编程技术基础应用课，开始用 AI 编程工具动手做东西。\n下面这些链接就是我做出来的项目，点开就能看，新的会随时加进来。";

  /* ---------------- 默认数据 ---------------- */
  var DEFAULT = {
    profile: {
      name: "李成蹊",
      school: "武汉理工大学",
      className: "数字经济2502",
      avatar: "avatar.jpg",
      intro:
        "李成蹊 · 武汉理工大学数字经济2502班。\n这里是我在数智编程技术基础应用课程中，用 AI 编程工具做出的全部项目——链接点开就能看，新的会随时加进来。"
    },
    /* 简历字段：全部留空，自己在「关于我」页填写 */
    resume: {
      gender: "",
      birth: "",
      native: "",
      polity: "",
      phone: "",
      email: "",
      intent: "",
      edu: "",
      skills: "",
      campus: "",
      awards: "",
      selfEval: ""
    },
    recap: "",
    projects: [
      {
        id: "seed-site",
        name: "个人作品集网站（本站）",
        url: "index.html",
        tools: "HTML / CSS / JavaScript",
        date: "2026-09-10",
        cover: "",
        intro:
          "这个网站本身就是一个项目：用来集中收录我做的所有东西，链接点开就能看。整站是纯静态页面，不依赖外部资源，放到任何服务器上都能跑。",
        idea:
          "老师要求作品集既能长期访问、入口又清晰。我想了想，与其交一堆文档，不如直接做成一个网站——以后做完什么随手加进来，自己也方便找。",
        log:
          "2026-09-07  搭好页面框架与样式，做了 8 个页面。\n2026-09-10  改版：删掉形式化的板块，把项目成果做成主体；每个项目可以自己填内容、自己传图，改完自动保存。\n\n【修改过程】\n原来的版本内容写得像汇报材料，空话多。所以把「阶段作业」整个板块去掉，把日志、迭代、复盘全部收进每个项目卡片里 —— 自己用着顺手才是重点。",
        iter:
          "v0.1  单页草稿，只有自我介绍。\nv1.0  拆成多页面站点，补齐各个板块。\nv2.0  改成可编辑版：内容自己填、链接自己加、图片自己传，数据存在浏览器里，支持导出备份。",
        recap:
          "最直接的收获是：先想清楚这东西是给谁用、什么时候用，再动手写页面。第一版就是没想清楚，做出来好看但自己用不上。",
        featured: false
      },
      {
        id: "seed-demo",
        name: "（示例项目，可直接改成你的）",
        url: "",
        tools: "",
        date: "",
        cover: "",
        intro: "",
        idea: "",
        log: "",
        iter: "",
        recap: "",
        featured: false
      }
    ]
  };

  /* ---------------- 工具函数 ---------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };
  var nl2br = function (s) { return esc(s).replace(/\n/g, "<br>"); };
  var uid = function () { return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };

  /* 支持任意层级的字段路径，如 profile.name / resume.skills */
  function getPath(path) {
    var parts = path.split("."), v = DATA;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return "";
      v = v[parts[i]];
    }
    return v == null ? "" : v;
  }
  function setPath(path, val) {
    var parts = path.split("."), v = DATA;
    for (var i = 0; i < parts.length - 1; i++) {
      if (v[parts[i]] == null) v[parts[i]] = {};
      v = v[parts[i]];
    }
    v[parts[parts.length - 1]] = val;
  }

  function toast(msg) {
    var t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._tm);
    t._tm = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  /* ---------------- 读写 ---------------- */
  var DATA = null;

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    // 迁移旧版本数据（v1 / v2）：只搬用户填过的内容
    if (!raw) {
      for (var i = 0; i < OLD_KEYS.length && !raw; i++) {
        try { raw = localStorage.getItem(OLD_KEYS[i]); } catch (e0) {}
      }
      if (raw) {
        try {
          var od = JSON.parse(raw);
          if (od && od.profile) {
            if (od.profile.className === "数字经济2501") od.profile.className = "数字经济2502";
            if (typeof od.profile.intro === "string") {
              od.profile.intro = od.profile.intro.replace(/数字经济2501/g, "数字经济2502");
              // 旧默认文案自动换成新文案；用户自己改过的保持不变
              if (od.profile.intro === OLD_DEFAULT_INTRO) od.profile.intro = clone(DEFAULT).profile.intro;
            }
          }
          raw = JSON.stringify(od);
        } catch (e1) { raw = null; }
      }
    }
    if (!raw) return clone(DEFAULT);
    try {
      var d = JSON.parse(raw);
      var base = clone(DEFAULT);
      base.profile = Object.assign(base.profile, d.profile || {});
      base.resume = Object.assign(base.resume, d.resume || {});
      base.recap = d.recap || "";
      base.projects = Array.isArray(d.projects) ? d.projects : base.projects;
      base.projects.forEach(function (p) {
        ["name", "url", "tools", "date", "cover", "intro", "idea", "log", "iter", "recap"].forEach(function (k) {
          if (typeof p[k] !== "string") p[k] = "";
        });
        p.featured = !!p.featured;
        if (!p.id) p.id = uid();
      });
      return base;
    } catch (e) {
      return clone(DEFAULT);
    }
  }

  var saveTimer = null;
  function save(silent) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(KEY, JSON.stringify(DATA));
        if (!silent) flashSaved();
      } catch (e) {
        toast("保存失败：浏览器存储空间已满，建议先导出备份或删掉大图");
      }
    }, 320);
  }

  function flashSaved() {
    var f = $(".save-flag");
    if (!f) return;
    f.classList.add("show");
    clearTimeout(f._tm);
    f._tm = setTimeout(function () { f.classList.remove("show"); }, 1600);
  }

  function projectById(id) {
    for (var i = 0; i < DATA.projects.length; i++) if (DATA.projects[i].id === id) return DATA.projects[i];
    return null;
  }

  /* ---------------- 图片：选择 + 压缩 ---------------- */
  var filePicker = null;
  function pickImage(cb) {
    if (!filePicker) {
      filePicker = document.createElement("input");
      filePicker.type = "file";
      filePicker.accept = "image/*";
      filePicker.style.display = "none";
      document.body.appendChild(filePicker);
    }
    filePicker.value = "";
    filePicker.onchange = function () {
      var f = filePicker.files && filePicker.files[0];
      if (!f) return;
      compress(f, 1400, function (dataUrl) { cb(dataUrl); });
    };
    filePicker.click();
  }

  function compress(file, maxW, cb) {
    var fr = new FileReader();
    fr.onerror = function () { toast("图片读取失败，换一张试试"); };
    fr.onload = function () {
      var img = new Image();
      img.onerror = function () { toast("这个格式不支持，建议用 JPG / PNG"); };
      img.onload = function () {
        var scale = Math.min(1, maxW / img.width);
        var c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * scale));
        c.height = Math.max(1, Math.round(img.height * scale));
        var ctx = c.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL("image/jpeg", 0.78));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  /* ---------------- 项目卡模板 ---------------- */
  var ICO = {
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3 1.2-6.8-5-4.9 6.9-1z"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 9 5-5 5 5"/><path d="M12 4v12"/></svg>',
    del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6"/></svg>'
  };

  var openIds = {};

  function fieldHTML(p, k, label, ph, cls, tag) {
    return (
      '<div class="field ' + (cls || "") + '">' +
      '<label>' + label + (tag ? ' <span class="tag">' + tag + '</span>' : "") + "</label>" +
      '<textarea class="ta ' + (cls === "full" ? "" : "short") + '" data-f="' + k + '" data-id="' + esc(p.id) + '" placeholder="' + esc(ph) + '">' +
      esc(p[k] || "") + "</textarea></div>"
    );
  }

  function cardHTML(p, i) {
    var link = (p.url || "").trim();
    var ext = /^https?:/i.test(link);
    var openBtn = link
      ? '<a class="open-link" href="' + esc(link) + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + ICO.out + "打开链接</a>"
      : '<span class="open-link off">未填链接</span>';
    var cover = p.cover ? '<img src="' + esc(p.cover) + '" alt="项目封面">' : "未上传封面";
    var tools = (p.tools || "").split(/[、,，·\/|]+/).map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 3);
    var meta = tools.map(function (t) { return '<span class="chip gray">' + esc(t) + "</span>"; }).join("");

    return (
      '<details class="pcard" data-id="' + esc(p.id) + '"' + (openIds[p.id] ? " open" : "") + ">" +
        "<summary>" +
          '<span class="idx">' + String(i + 1).padStart(2, "0") + "</span>" +
          '<span style="min-width:0">' +
            '<span class="p-title" data-title="' + esc(p.id) + '">' + esc(p.name || "未命名项目") + "</span>" +
            '<span class="p-meta">' + meta + (p.date ? '<span class="mt">' + esc(p.date) + "</span>" : "") + "</span>" +
          "</span>" +
          '<span class="p-head-right">' + openBtn +
            '<button type="button" class="star' + (p.featured ? " on" : "") + '" data-act="star" data-id="' + esc(p.id) + '" title="加入/移出标志性成果">' + ICO.star + (p.featured ? "标志性" : "设为标志性") + "</button>" +
            '<span class="arrow">' + ICO.arrow + "</span>" +
          "</span>" +
        "</summary>" +
        '<div class="p-body">' +
          '<div class="grid-fields">' +
            '<div class="field"><label>项目名称</label><input class="inp" data-f="name" data-id="' + esc(p.id) + '" value="' + esc(p.name) + '" placeholder="给这个项目起个名字"></div>' +
            '<div class="field"><label>项目链接 <span class="tag">点开就能看</span></label><input class="inp" data-f="url" data-id="' + esc(p.id) + '" value="' + esc(p.url) + '" placeholder="https://... 或站内文件 index.html"></div>' +
            '<div class="field"><label>所用工具</label><input class="inp" data-f="tools" data-id="' + esc(p.id) + '" value="' + esc(p.tools) + '" placeholder="例如：Python、剪映"></div>' +
            '<div class="field"><label>完成时间</label><input class="inp" data-f="date" data-id="' + esc(p.id) + '" value="' + esc(p.date) + '" placeholder="2026-09-10"></div>' +
            fieldHTML(p, "intro", "项目介绍", "这个项目是做什么的？做给谁用？一句话说清楚。", "full") +
          "</div>" +

          '<div class="acc-head">设计灵感</div>' +
          fieldHTML(p, "idea", "怎么想到做它的", "当时为什么想做这个？看到什么、听到什么、缺什么……", "full") +

          '<div class="acc-head">日志编写 <span class="tag">含修改过程</span></div>' +
          fieldHTML(p, "log", "写日志（修改过程也写这里）", "例：09-07 做完了首页 / 09-08 把排版改了，因为……（按日期往下写就行）", "full") +

          '<div class="acc-head">迭代记录</div>' +
          fieldHTML(p, "iter", "一版一版往下列", "例：v1 能跑通 → v2 改了配色和排版 → v3 加了新功能", "full") +

          '<div class="acc-head">学习复盘</div>' +
          fieldHTML(p, "recap", "做完之后学到了什么", "自由写：踩了什么坑、下次怎么做、有什么新发现。", "full") +

          '<div class="acc-head">项目封面 / 截图</div>' +
          '<div class="upload-row">' +
            '<div class="cover-thumb" data-cover="' + esc(p.id) + '">' + cover + "</div>" +
            '<div class="upload-tools">' +
              '<button type="button" class="tb-btn" data-act="cover" data-id="' + esc(p.id) + '">' + ICO.up + "上传图片</button>" +
              '<button type="button" class="tb-btn" data-act="cover-del" data-id="' + esc(p.id) + '">移除图片</button>' +
              '<span class="hint">自动压缩后存在本机浏览器里</span>' +
            "</div>" +
          "</div>" +

          '<div style="display:flex;align-items:center;gap:12px;margin-top:22px;flex-wrap:wrap">' +
            '<button type="button" class="tb-btn danger" data-act="del" data-id="' + esc(p.id) + '">' + ICO.del + "删除这个项目</button>" +
            '<span class="hint">改动会自动保存</span>' +
          "</div>" +
        "</div>" +
      "</details>"
    );
  }

  /* ---------------- 渲染 ---------------- */
  function renderProfile() {
    $$("[data-photo]").forEach(function (img) { img.src = DATA.profile.avatar || ""; });
    $$("[data-out]").forEach(function (el) {
      el.textContent = getPath(el.getAttribute("data-out"));
    });
    $$("[data-bind]").forEach(function (el) {
      if (document.activeElement === el) return;
      var v = getPath(el.getAttribute("data-bind"));
      if (el.value !== v) el.value = v;
    });
    // 首页/关于页 简介换行展示
    $$("[data-intro-out]").forEach(function (el) { el.innerHTML = nl2br(DATA.profile.intro || ""); });
    // 统计数字
    var pc = $('[data-count="projects"]');
    if (pc) pc.textContent = DATA.projects.length;
    var lc = $('[data-count="links"]');
    if (lc) lc.textContent = DATA.projects.filter(function (p) { return (p.url || "").trim(); }).length;
  }

  function renderProjects() {
    var featBox = $('[data-projects="featured"]');
    var normBox = $('[data-projects="normal"]');
    if (!featBox && !normBox) return;
    var feat = DATA.projects.filter(function (p) { return p.featured; });
    var norm = DATA.projects.filter(function (p) { return !p.featured; });

    if (featBox) {
      featBox.innerHTML = feat.length
        ? feat.map(function (p, i) { return cardHTML(p, i); }).join("")
        : '<div class="slot">' +
            '<div class="slot-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3 1.2-6.8-5-4.9 6.9-1z"/></svg></div>' +
            "<h3>位置先留着</h3>" +
            "<p>等你做出真正满意的作品，点它卡片上的「设为标志性」，就会自动出现在这里。</p>" +
          "</div>";
    }
    if (normBox) {
      normBox.innerHTML = norm.length
        ? norm.map(function (p, i) { return cardHTML(p, i); }).join("")
        : '<div class="slot"><div class="slot-ic">' + ICO.up + "</div><h3>还没有项目</h3><p>点上面的「新建项目」，把做过的练习、作业、小工具都收进来。</p></div>";
    }
  }

  function renderLinks() {
    var box = $("[data-links]");
    if (!box) return;
    var list = DATA.projects.slice().sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); });
    if (!list.length) { box.innerHTML = '<div class="slot"><h3>还没有收录项目</h3><p>去「项目成果」页新建一个，链接就会出现在这里。</p></div>'; return; }
    box.innerHTML = list.map(function (p) {
      var link = (p.url || "").trim();
      var ext = /^https?:/i.test(link);
      var tag = link
        ? '<a class="' + "link-card" + '" href="' + esc(link) + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">"
        : '<div class="link-card muted">';
      var close = link ? "</a>" : "</div>";
      return tag +
        '<span class="lc-top"><span class="lc-name">' + esc(p.name || "未命名项目") + "</span>" +
        (p.featured ? '<span class="chip amber">标志性</span>' : "") + "</span>" +
        '<span class="lc-intro">' + (esc(p.intro || "还没写介绍，点开「项目成果」页补上。")) + "</span>" +
        (p.tools ? '<span class="chip gray">' + esc(p.tools) + "</span>" : "") +
        '<span class="lc-url">' + (link ? esc(link) + (ext ? " ↗" : " →") : "（暂未填写链接）") + "</span>" +
        close;
    }).join("");
  }

  function renderAggregate(kind) {
    var box = $('[data-aggregate="' + kind + '"]');
    if (!box) return;
    var items = DATA.projects.filter(function (p) { return (p[kind] || "").trim(); });
    if (!items.length) {
      box.innerHTML = '<div class="slot"><h3>这里还是空的</h3><p>去「项目成果」页展开任意项目，在对应的输入框里写，写完整站会自动汇总到这里。</p></div>';
      return;
    }
    var label = kind === "log" ? "日志编写（含修改过程）" : kind === "iter" ? "迭代记录" : "学习复盘";
    box.innerHTML = items.map(function (p) {
      var link = (p.url || "").trim();
      return '<div class="sum-card">' +
        '<div class="sc-head"><h3>' + esc(p.name || "未命名项目") + "</h3>" +
        (p.date ? '<span class="chip gray">' + esc(p.date) + "</span>" : "") +
        (link ? '<a class="open-link" href="' + esc(link) + '"' + (/^https?:/i.test(link) ? ' target="_blank" rel="noopener"' : "") + ">打开项目</a>" : "") +
        "</div>" +
        '<div class="sum-block"><div class="sb-label">' + label + '</div><div class="sb-text">' + nl2br(p[kind]) + "</div></div>" +
        "</div>";
    }).join("");
  }

  function renderSpotlight() {
    var box = $("[data-spotlight]");
    if (!box) return;
    var feat = DATA.projects.filter(function (p) { return p.featured; });
    if (!feat.length) {
      box.innerHTML = '<div class="slot"><div class="slot-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3 1.2-6.8-5-4.9 6.9-1z"/></svg></div>' +
        "<h3>标志性成果的位置已经留好了</h3><p>这是留给以后最满意的作品的。在「项目成果」页点任意项目的「设为标志性」，它就会出现在这个页面。</p></div>";
      return;
    }
    box.innerHTML = feat.map(function (p) {
      var link = (p.url || "").trim();
      var blocks = [["项目介绍", p.intro], ["设计灵感", p.idea], ["日志编写（含修改过程）", p.log], ["迭代记录", p.iter], ["学习复盘", p.recap]];
      return '<div class="sum-card">' +
        '<div class="sc-head"><h3>' + esc(p.name || "未命名项目") + "</h3>" +
        (p.tools ? '<span class="chip">' + esc(p.tools) + "</span>" : "") +
        (p.date ? '<span class="chip gray">' + esc(p.date) + "</span>" : "") +
        (link ? '<a class="open-link" href="' + esc(link) + '"' + (/^https?:/i.test(link) ? ' target="_blank" rel="noopener"' : "") + ">打开项目</a>" : "") +
        "</div>" +
        (p.cover ? '<div style="border-radius:14px;overflow:hidden;margin-bottom:16px;border:1px solid var(--line)"><img src="' + esc(p.cover) + '" alt="" style="width:100%"></div>' : "") +
        blocks.map(function (b) {
          return '<div class="sum-block"><div class="sb-label">' + b[0] + "</div>" +
            (b[1] && b[1].trim() ? '<div class="sb-text">' + nl2br(b[1]) + "</div>" : '<div class="sb-empty">还没写</div>') + "</div>";
        }).join("") +
        "</div>";
    }).join("");
  }

  function render() {
    renderProfile();
    renderProjects();
    renderLinks();
    renderAggregate("log");
    renderAggregate("iter");
    renderAggregate("recap");
    renderSpotlight();
  }

  /* ---------------- 交互：文字编辑 ---------------- */
  function bindEdits() {
    document.addEventListener("input", function (e) {
      var el = e.target;
      if (!el || !el.getAttribute) return;

      // 个人资料 / 简历 / 全局复盘
      if (el.hasAttribute("data-bind")) {
        var path = el.getAttribute("data-bind");
        setPath(path, el.value);
        save();
        if (path === "profile.name") {
          $$("[data-out='profile.name']").forEach(function (n) { n.textContent = el.value || "你的名字"; });
        }
        if (path === "profile.intro") {
          $$("[data-intro-out]").forEach(function (n) { n.innerHTML = nl2br(el.value); });
        }
        return;
      }

      // 项目字段
      var f = el.getAttribute("data-f");
      if (f && el.getAttribute("data-id")) {
        var p = projectById(el.getAttribute("data-id"));
        if (!p) return;
        p[f] = el.value;
        save();
        if (f === "name") {
          var t = $('[data-title="' + p.id + '"]');
          if (t) t.textContent = el.value || "未命名项目";
        }
      }
    }, true);

    document.addEventListener("toggle", function (e) {
      var d = e.target;
      if (d && d.classList && d.classList.contains("pcard")) openIds[d.getAttribute("data-id")] = d.open;
    }, true);

    document.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest("[data-act]") : null;
      if (!btn) return;
      var act = btn.getAttribute("data-act");
      var id = btn.getAttribute("data-id");
      var p = id ? projectById(id) : null;

      if (act === "star" && p) {
        p.featured = !p.featured;
        openIds[p.id] = true;
        save(true);
        render();
        toast(p.featured ? "已放进「标志性个人成果」" : "已移回「普通成果」");
      } else if (act === "del" && p) {
        if (confirm("确定删除「" + (p.name || "未命名项目") + "」吗？\n删除后这项内容会消失，建议先导出备份。")) {
          DATA.projects = DATA.projects.filter(function (x) { return x.id !== p.id; });
          save(true);
          render();
          toast("已删除");
        }
      } else if (act === "cover" && p) {
        pickImage(function (url) {
          try {
            p.cover = url;
            save(true);
            var box = $('[data-cover="' + p.id + '"]');
            if (box) box.innerHTML = '<img src="' + url + '" alt="项目封面">';
            toast("图片已上传并保存");
          } catch (err) { toast("图片太大，保存失败"); }
        });
      } else if (act === "cover-del" && p) {
        p.cover = "";
        save(true);
        var b2 = $('[data-cover="' + p.id + '"]');
        if (b2) b2.textContent = "未上传封面";
        toast("封面已移除");
      } else if (act === "add") {
        var np = { id: uid(), name: "", url: "", tools: "", date: "", cover: "", intro: "", idea: "", log: "", iter: "", recap: "", featured: false };
        DATA.projects.unshift(np);
        openIds[np.id] = true;
        save(true);
        render();
        var card = $('.pcard[data-id="' + np.id + '"]');
        if (card) {
          if (card.scrollIntoView) card.scrollIntoView({ block: "center", behavior: "smooth" });
          var first = $(".inp", card);
          if (first && first.focus) first.focus();
        }
        toast("新建好了，直接在里面打字就行");
      } else if (act === "avatar") {
        pickImage(function (url) {
          DATA.profile.avatar = url;
          save(true);
          $$("[data-photo]").forEach(function (img) { img.src = url; });
          toast("头像已更新");
        });
      } else if (act === "print") {
        window.print();
      } else if (act === "export") {
        var blob = new Blob([JSON.stringify(DATA, null, 2)], { type: "application/json" });
        var a = document.createElement("a");
        var d = new Date();
        a.href = URL.createObjectURL(blob);
        a.download = "作品集数据备份-" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + ".json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast("备份文件已下载");
      } else if (act === "import") {
        var ii = $("[data-import-input]");
        if (ii) ii.click();
        else toast("这个页面没放导入入口，去「项目成果」页操作");
      } else if (act === "reset") {
        if (confirm("确定清空所有自己填写的内容，恢复成初始状态吗？\n此操作不可撤销，建议先导出备份。")) {
          try { localStorage.removeItem(KEY); } catch (err) {}
          location.reload();
        }
      }
    });

    // 导入备份（按钮点击由上面的委托处理）
    var importInput = $("[data-import-input]");
    if (importInput) {
      importInput.addEventListener("change", function () {
        var f = importInput.files && importInput.files[0];
        if (!f) return;
        var fr = new FileReader();
        fr.onload = function () {
          try {
            var d = JSON.parse(fr.result);
            if (!d || !Array.isArray(d.projects)) throw new Error("bad");
            try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (err) { toast("数据太大，导入失败"); return; }
            location.reload();
          } catch (e) { toast("文件格式不对，请选择本网站导出的备份文件"); }
        };
        fr.readAsText(f);
      });
    }
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    DATA = load();
    bindEdits();
    render();
  }

  window.PF = {
    get data() { return DATA; },
    save: function () { save(true); },
    refresh: render,
    toast: toast
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
