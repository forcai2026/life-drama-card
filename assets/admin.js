/* ============ 人生剧本卡 · 管理后台逻辑 ============ */
(function () {
  'use strict';

  var CFG = window.DRAMA_CONFIG || {};
  var TOKEN_KEY = 'drama_admin_token';
  var state = { token: '', codes: [], newCodes: [], uses: 3, keyword: '' };

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------- 依赖兜底 ---------- */
  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    el('loginErr').textContent = '依赖库没有加载出来，刷新一下页面试试';
    return;
  }

  var sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  /* ---------- toast ---------- */
  var toastTimer = null;
  function toast(msg) {
    var t = el('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 2000);
  }

  /* ---------- RPC 封装 ---------- */
  function rpc(fn, args) {
    return sb.rpc(fn, args).then(function (res) {
      if (res.error) {
        var m = res.error.message || '';
        if (/Failed to fetch|NetworkError|Load failed|network/i.test(m)) {
          throw new Error('网络连接不上，检查一下网络再试');
        }
        throw new Error(m || '服务出错了');
      }
      return res.data;
    });
  }

  function guard(d) {
    if (d && d.ok === false && /登录已过期|重新登录/.test(d.msg || '')) {
      doLogout(true);
      throw new Error(d.msg || '登录已过期，请重新登录');
    }
    return d;
  }

  /* ---------- 视图切换 ---------- */
  function showLogin() {
    el('vLogin').hidden = false;
    el('vMain').hidden = true;
  }
  function showMain() {
    el('vLogin').hidden = true;
    el('vMain').hidden = false;
  }

  /* ---------- 登录 ---------- */
  function doLogin() {
    var pwd = el('pwd').value.trim();
    var err = el('loginErr');
    err.textContent = '';
    if (!pwd) { err.textContent = '请输入密码'; return; }

    var btn = el('loginBtn');
    btn.disabled = true;
    btn.textContent = '登录中…';

    rpc('admin_login', { p_pwd: pwd }).then(function (d) {
      if (!d || !d.ok) {
        err.textContent = (d && d.msg) || '登录失败';
        return;
      }
      state.token = d.token;
      try { localStorage.setItem(TOKEN_KEY, d.token); } catch (e) {}
      el('pwd').value = '';
      showMain();
      loadAll();
    }).catch(function (e) {
      err.textContent = e.message;
    }).then(function () {
      btn.disabled = false;
      btn.textContent = '登 录';
    });
  }

  function doLogout(silent) {
    var t = state.token;
    state.token = '';
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    showLogin();
    if (t) { rpc('admin_logout', { p_token: t }).catch(function () {}); }
    if (!silent) toast('已退出登录');
  }

  /* ---------- 加载数据 ---------- */
  function loadAll() {
    if (!state.token) return;
    el('list').innerHTML = '<p class="empty">正在加载…</p>';

    return Promise.all([
      rpc('admin_stats', { p_token: state.token }),
      rpc('admin_list_codes', { p_token: state.token })
    ]).then(function (r) {
      var st = guard(r[0]);
      var ls = guard(r[1]);

      if (st && st.stats) {
        el('stCodes').textContent = st.stats.codes;
        el('stRemain').textContent = st.stats.remaining;
        el('stUsed').textContent = st.stats.used;
        el('stResults').textContent = st.stats.results;
      }
      state.codes = (ls && ls.codes) || [];
      renderList();
    }).catch(function (e) {
      el('list').innerHTML = '<p class="empty">' + esc(e.message) + '</p>';
    });
  }

  /* ---------- 渲染列表 ---------- */
  function fmtTime(s) {
    if (!s) return '';
    var d = new Date(s);
    if (isNaN(d.getTime())) return '';
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return (d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function renderList() {
    var kw = state.keyword.toLowerCase();
    var rows = state.codes.filter(function (c) {
      if (!kw) return true;
      return (c.code || '').toLowerCase().indexOf(kw) >= 0 ||
             (c.note || '').toLowerCase().indexOf(kw) >= 0;
    });

    el('cntLabel').textContent = kw
      ? rows.length + ' / ' + state.codes.length
      : state.codes.length;

    if (!state.codes.length) {
      el('list').innerHTML = '<p class="empty">还没有密码，上面生成一批吧</p>';
      return;
    }
    if (!rows.length) {
      el('list').innerHTML = '<p class="empty">没有匹配的记录</p>';
      return;
    }

    var html = rows.map(function (c) {
      var left = (c.max || 0) - (c.used || 0);
      var cls, label;
      if (left <= 0) { cls = 'done'; label = '已用完'; }
      else if (left < c.max) { cls = 'mid'; label = '剩 ' + left + ' / ' + c.max; }
      else { cls = 'ok'; label = '可用 ' + c.max + ' 次'; }

      return '<div class="row" data-code="' + esc(c.code) + '">' +
        '<div class="code">' + esc(c.code) + '</div>' +
        '<div class="meta">' +
          '<span class="badge ' + cls + '">' + label + '</span>' +
          '<span class="note ' + (c.note ? '' : 'empty') + '" data-act="note">' +
            esc(c.note || '点击加备注') + '</span>' +
          '<span class="time">' + esc(fmtTime(c.created_at)) + '</span>' +
        '</div>' +
        '<div class="acts">' +
          '<button data-act="copy">复制</button>' +
          '<button data-act="bump">加次数</button>' +
          '<button data-act="del" class="danger">删除</button>' +
        '</div>' +
      '</div>';
    }).join('');

    el('list').innerHTML = html;
  }

  /* ---------- 生成 ---------- */
  function doGen() {
    var count = parseInt(el('genCount').value, 10);
    var uses = parseInt(el('genUses').value, 10);

    if (!count || count < 1 || count > 200) { toast('数量请填 1–200'); return; }
    if (!uses || uses < 1 || uses > 99) { toast('次数请填 1–99'); return; }

    var btn = el('genBtn');
    btn.disabled = true;
    btn.textContent = '生成中…';

    rpc('admin_gen_codes', { p_token: state.token, p_count: count, p_uses: uses })
      .then(function (d) {
        guard(d);
        if (!d || !d.ok) { toast((d && d.msg) || '生成失败'); return; }
        state.newCodes = d.codes || [];
        state.uses = d.uses || uses;
        openNewModal();
        return loadAll();
      })
      .catch(function (e) { toast(e.message); })
      .then(function () {
        btn.disabled = false;
        btn.textContent = '生 成';
      });
  }

  /* ---------- 生成结果弹层 ---------- */
  function openNewModal() {
    el('mdNewTitle').textContent = '本次生成 ' + state.newCodes.length + ' 个 · 每个可用 ' + state.uses + ' 次';
    el('newCodes').innerHTML = state.newCodes.map(function (c) {
      return '<span>' + esc(c) + '</span>';
    }).join('');
    el('mdNew').hidden = false;
  }

  /* ---------- 复制 ---------- */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); resolve(); }
      catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  /* ---------- CSV ---------- */
  function csvCell(v) {
    var s = String(v == null ? '' : v);
    if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function buildCSV(rows) {
    var head = ['密码', '可用次数', '已用', '剩余', '状态', '备注', '创建时间', '最后使用'];
    var lines = [head.map(csvCell).join(',')];
    rows.forEach(function (c) {
      var left = (c.max || 0) - (c.used || 0);
      var st = left <= 0 ? '已用完' : (left < c.max ? '使用中' : '未使用');
      lines.push([
        c.code, c.max, c.used, left, st,
        c.note || '',
        c.created_at ? new Date(c.created_at).toLocaleString('zh-CN') : '',
        c.last_used_at ? new Date(c.last_used_at).toLocaleString('zh-CN') : ''
      ].map(csvCell).join(','));
    });
    return '\uFEFF' + lines.join('\r\n');
  }

  function download(filename, text) {
    var blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function stamp() {
    var d = new Date();
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }

  /* ---------- 行内操作 ---------- */
  function onListClick(e) {
    var btn = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!btn) return;
    var row = btn.closest('.row');
    if (!row) return;
    var code = row.getAttribute('data-code');
    var act = btn.getAttribute('data-act');

    if (act === 'copy') {
      copyText(code).then(function () { toast('已复制 ' + code); })
                     .catch(function () { toast('复制失败，长按选中手动复制'); });
    }

    if (act === 'note') {
      var cur = '';
      var found = state.codes.filter(function (c) { return c.code === code; })[0];
      if (found) cur = found.note || '';
      var v = window.prompt('给 ' + code + ' 加个备注（比如卖给了谁）', cur);
      if (v === null) return;
      rpc('admin_set_note', { p_token: state.token, p_code: code, p_note: v })
        .then(function (d) {
          guard(d);
          if (d && d.ok) { toast('备注已保存'); loadAll(); }
          else { toast((d && d.msg) || '保存失败'); }
        }).catch(function (er) { toast(er.message); });
    }

    if (act === 'bump') {
      var n = window.prompt('给 ' + code + ' 增加几次可用机会？', '3');
      if (n === null) return;
      var delta = parseInt(n, 10);
      if (!delta || delta === 0) { toast('请填一个正整数'); return; }
      rpc('admin_bump_uses', { p_token: state.token, p_code: code, p_delta: delta })
        .then(function (d) {
          guard(d);
          if (d && d.ok) { toast('现在共 ' + d.max + ' 次'); loadAll(); }
          else { toast((d && d.msg) || '操作失败'); }
        }).catch(function (er) { toast(er.message); });
    }

    if (act === 'del') {
      if (!window.confirm('删除 ' + code + '？\n\n删除后这个密码立刻失效，已测出的分享链接不受影响。')) return;
      rpc('admin_delete_code', { p_token: state.token, p_code: code })
        .then(function (d) {
          guard(d);
          if (d && d.ok) { toast('已删除'); loadAll(); }
          else { toast((d && d.msg) || '删除失败'); }
        }).catch(function (er) { toast(er.message); });
    }
  }

  /* ---------- 改密码 ---------- */
  function openPwdModal() {
    el('oldPwd').value = '';
    el('newPwd').value = '';
    el('newPwd2').value = '';
    el('pwdErr').textContent = '';
    el('mdPwd').hidden = false;
  }

  function savePwd() {
    var o = el('oldPwd').value;
    var n = el('newPwd').value;
    var n2 = el('newPwd2').value;
    var err = el('pwdErr');
    err.textContent = '';

    if (n.length < 8) { err.textContent = '新密码至少 8 位'; return; }
    if (n !== n2) { err.textContent = '两次输入的新密码不一致'; return; }

    var btn = el('pwdSave');
    btn.disabled = true;
    rpc('admin_change_pwd', { p_token: state.token, p_old: o, p_new: n })
      .then(function (d) {
        if (d && d.ok) {
          el('mdPwd').hidden = true;
          toast('密码已修改，请重新登录');
          doLogout(true);
          showLogin();
        } else {
          err.textContent = (d && d.msg) || '修改失败';
        }
      })
      .catch(function (e) { err.textContent = e.message; })
      .then(function () { btn.disabled = false; });
  }

  /* ---------- 事件绑定 ---------- */
  function bind() {
    el('loginBtn').addEventListener('click', doLogin);
    el('pwd').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doLogin();
    });

    el('logoutBtn').addEventListener('click', function () { doLogout(false); });
    el('pwdBtn').addEventListener('click', openPwdModal);

    el('genBtn').addEventListener('click', doGen);
    el('refreshBtn').addEventListener('click', function () { loadAll(); toast('已刷新'); });

    el('search').addEventListener('input', function (e) {
      state.keyword = e.target.value.trim();
      renderList();
    });

    el('exportBtn').addEventListener('click', function () {
      if (!state.codes.length) { toast('没有可导出的记录'); return; }
      download('剧本卡密码-' + stamp() + '.csv', buildCSV(state.codes));
      toast('已导出 ' + state.codes.length + ' 条');
    });

    el('list').addEventListener('click', onListClick);

    el('mdNewClose').addEventListener('click', function () { el('mdNew').hidden = true; });
    el('copyAllBtn').addEventListener('click', function () {
      if (!state.newCodes.length) return;
      copyText(state.newCodes.join('\n'))
        .then(function () { toast('已复制 ' + state.newCodes.length + ' 个密码'); })
        .catch(function () { toast('复制失败，请手动选中'); });
    });
    el('exportNewBtn').addEventListener('click', function () {
      if (!state.newCodes.length) { toast('没有可导出的记录'); return; }
      var rows = state.newCodes.map(function (c) {
        return { code: c, max: state.uses, used: 0, note: '', created_at: new Date().toISOString() };
      });
      download('剧本卡密码-本批' + state.newCodes.length + '个-' + stamp() + '.csv', buildCSV(rows));
      toast('已导出本批 ' + state.newCodes.length + ' 个');
    });

    el('mdPwdClose').addEventListener('click', function () { el('mdPwd').hidden = true; });
    el('pwdCancel').addEventListener('click', function () { el('mdPwd').hidden = true; });
    el('pwdSave').addEventListener('click', savePwd);

    /* 点遮罩关弹层 */
    ['mdNew', 'mdPwd'].forEach(function (id) {
      el(id).addEventListener('click', function (e) {
        if (e.target === el(id)) el(id).hidden = true;
      });
    });

    /* Esc 关弹层 */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { el('mdNew').hidden = true; el('mdPwd').hidden = true; }
    });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    bind();
    var saved = '';
    try { saved = localStorage.getItem(TOKEN_KEY) || ''; } catch (e) {}
    if (saved) {
      state.token = saved;
      showMain();
      loadAll().then(function () {
        /* 会话失效时 loadAll 内部已踢回登录页 */
      });
    } else {
      showLogin();
      setTimeout(function () { el('pwd').focus(); }, 120);
    }
  }

  boot();
})();
