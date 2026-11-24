/* ============================================================
   人生剧本卡 · 前端逻辑
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- 题库 ---------------- */
  var Q = [
    { d: 'act', q: '工作上突然被塞了一个不属于你的活，而且明天就要。你会？',
      o: [['先问清楚"这活为什么是我"，再决定接不接', 3], ['接下来，但会明确说一句"这是最后一次"', 2], ['接下来，心里骂了一路', 1], ['接下来，连"为什么是我"都没想过', 0]] },

    { d: 'act', q: '一段关系（恋爱、友情、合伙）让你越来越累，你通常会？',
      o: [['直接说清楚，不行就结束', 3], ['先试着沟通，沟通不了再想办法', 2], ['忍着，等对方自己发现', 1], ['忍着，并且告诉自己"可能是我太敏感"', 0]] },

    { d: 'act', q: '你人生里几个大的决定——专业、城市、工作和谁在一起——主要是谁定的？',
      o: [['我，以自己的判断为主', 3], ['我，但参考了很多人的意见', 2], ['家里人或伴侣的意见占大头', 1], ['顺着走，好像没怎么主动选过', 0]] },

    { d: 'act', q: '遇到一件很难的事，你的第一反应是？',
      o: [['先想办法，边做边调整', 3], ['先找人商量', 2], ['先焦虑一阵，再想办法', 1], ['先希望它自己过去', 0]] },

    { d: 'oth', q: '家里人说"我们都是为你好"，你通常？',
      o: [['会直接说"这不是我要的"', 0], ['嘴上答应，心里不打算照做', 1], ['会解释，但最后往往还是听他们的', 2], ['会照做，因为不想让他们失望', 3]] },

    { d: 'oth', q: '一群人吃饭点菜，你会？',
      o: [['点自己想吃的', 0], ['先问大家想吃什么，再综合', 2], ['说"我都行"，让别人点', 2], ['主动张罗，确保每个人都吃到喜欢的', 3]] },

    { d: 'oth', q: '朋友找你帮忙——搬家、借钱、写文案、陪聊到半夜，你的真实反应是？',
      o: [['看情况，不方便就直接说', 0], ['会帮，但会讲清楚自己的边界', 1], ['会帮，虽然自己也很累', 2], ['会帮，而且做得比对方期待的还多', 3]] },

    { d: 'oth', q: '你难过的时候，会告诉别人吗？',
      o: [['会说，会主动找人聊', 0], ['会跟一两个最亲近的人说', 1], ['想说，但怕给人添麻烦', 2], ['不说，但心里希望有人能看出来', 3]] },

    { d: 'msk', q: '被人当面夸的时候，你的第一反应是？',
      o: [['大方接受，说谢谢', 0], ['有点不好意思，但会道谢', 1], ['赶紧否认，"没有没有"', 2], ['立刻把话题转到对方身上', 3]] },

    { d: 'msk', q: '你现在其实很难过，有人问你"你还好吗"，你会？',
      o: [['直接说"不太好"', 0], ['说"还行吧"，但对方能看出来', 1], ['说"挺好的"，然后换个话题', 2], ['说"挺好的"，还能顺便讲个笑话', 3]] },

    { d: 'msk', q: '发朋友圈之前，你会不会反复想"这条会不会显得……"？',
      o: [['不太想，想发就发', 0], ['偶尔会', 1], ['会，而且经常最后没发', 3], ['我已经很久不发朋友圈了', 2]] },

    { d: 'msk', q: '你生气的时候，通常是什么样子？',
      o: [['直接说出来', 0], ['语气变冷，但还能正常说话', 1], ['不说话，但所有人都知道', 2], ['笑得更客气了，没人看出来', 3]] },

    { d: 'wait', q: '关于"想要的生活"，你现在是什么状态？',
      o: [['正在做，哪怕只是很小的事', 0], ['还没想清楚', 2], ['在准备，快开始了', 2], ['在等一个合适的时机', 3]] },

    { d: 'wait', q: '一段没有回应的关系（消息不回、态度不明），你会？',
      o: [['问清楚，然后决定', 0], ['给自己一个期限，到点就走', 1], ['再等等，也许他只是忙', 3], ['一直等，等到自己都不想等了', 3]] },

    { d: 'wait', q: '你相信"对的人、对的机会总会出现"吗？',
      o: [['不太信，我更信自己去争取', 0], ['半信，但也会主动', 1], ['信，所以我愿意等', 3], ['信，而且我已经等了很久', 3]] },

    { d: 'rep', q: '有没有过"这件事好像以前也发生过"的感觉——连吵架的台词都差不多？',
      o: [['没有，每次都不太一样', 0], ['偶尔有', 1], ['经常有，模式很像', 3], ['有，而且换个人也还是这样', 3]] },

    { d: 'rep', q: '身边人有没有说过"你怎么又这样"？',
      o: [['没有', 0], ['说过一两次', 1], ['说过很多次', 2], ['说过，而且我自己也知道', 3]] },

    { d: 'rep', q: '如果把最近五年反复遇到的困境写成一个标题，你觉得是？',
      o: [['每件事都不太一样', 0], ['大概是运气不太好', 1], ['好像都是同一类人、同一类事', 3], ['我甚至能预测下一次什么时候来', 3]] }
  ];

  var MAXD = { act: 12, oth: 12, msk: 12, wait: 9, rep: 9 };

  var PLAYS = {
    chengxi: {
      name: '逆袭爽剧', genre: '都市 · 励志 · 全员陪跑', role: '那个必须赢的人',
      story: '你的人生像一部爽剧，主角永远在往上爬。你考了证、加了班、把 KPI 做到了部门第一。所有人都说你厉害。但没人知道，你不敢停——因为你隐约觉得，一停下来，那些"你很厉害"就会消失。',
      danmu: ['又是凌晨三点', '这集我看过', '他赢了，然后呢', '别夸他，他会当真'],
      quote: '你不是想赢，你是怕停下来，就会发现自己不值得被爱。',
      curse: '心理学里有个词叫"条件性自我价值"（Crocker & Wolfe, 2001）：当你把自我价值只挂在"成就"这一个挂钩上，成就的波动就等于自我的崩塌。研究发现，这类人成就越高，越容易出现冒名顶替感——明明是自己做到的，却总觉得是运气。',
      turn: '做一件"没有任何产出"的事，并且不告诉任何人。',
      note: '不能发朋友圈，不能拍照，不能成为下一个成就。'
    },
    dongshi: {
      name: '懂事伦理剧', genre: '家庭 · 群像 · 催泪', role: '那个负责让所有人舒服的人',
      story: '你是家里的"懂事孩子"、朋友里的"情绪稳定担当"、公司里的"靠谱的那个"。你调解过爸妈的冷战、劝过分手的闺蜜、接过同事甩的锅。你做得很好，好到没有人想过问你一句：你今天怎么样。',
      danmu: ['她笑了，但她不想笑', '全场只有她没吃上饭', '这角色我熟', '能不能为自己活一集'],
      quote: '你从小就学会了看别人脸色，却从来没人教你看自己的。',
      curse: '这叫"亲职化"（parentification）：小时候被迫成为父母的情绪伴侣或调解员的孩子，长大后会自动接管所有人的情绪。这不是性格好，是童年训练出来的生存技能。代价是——你对自己的情绪，反而最不敏感。',
      turn: '在一件小事上说"我不想"，并且不解释理由。',
      note: '不解释，是这一集最关键的动作。解释就等于把决定权交回去了。'
    },
    kuqing: {
      name: '苦情长剧', genre: '言情 · 虐恋 · 已播三季', role: '那个总在等一个回应的人',
      story: '你发出去的消息，会反复看有没有被回。你等过一个人回头，等过一个 offer，等过一句"对不起"。你告诉自己"再等等"，一等就是好几年。最难受的不是没等到，是你知道大概率等不到，却还是没走。',
      danmu: ['他又没回消息', '第三季了还没走出来', '编剧你出来', '换个男主吧求求了'],
      quote: '你不是放不下他，你是放不下那个"再等一下就好了"的可能性。',
      curse: '这是"间歇性强化"（Skinner）：不确定的奖励比确定的奖励更让人上瘾。赌场和暧昧用的是同一个机制——不是每次都有回应，所以每一次回应都格外珍贵。这就是为什么"他偶尔对你好"，比"他一直对你好"更难戒。',
      turn: '给自己设一个具体日期，到那天不管结果如何，先做一个决定。',
      note: '日期要写下来。写在脑子里的期限，会自己延后。'
    },
    danvzhu: {
      name: '大女主独立剧', genre: '都市 · 女性 · 无男主', role: '那个什么都能自己扛的人',
      story: '搬家你自己搬、生病你自己去医院、深夜加班你自己打车回家。你从不麻烦别人，也不习惯被照顾。有人说你"太独立了"，你听着像夸奖。但偶尔，在某个很普通的瞬间——比如拧不开一瓶水——你会突然很想哭，然后觉得自己莫名其妙。',
      danmu: ['她自己扛了，散了吧', '没人问她累不累', '这集她又要说自己没事', '她哭的时候没开摄像头'],
      quote: '你不是不需要人，你是把"需要"这件事，练成了不会。',
      curse: '这叫"强制性自足"（compulsive self-reliance, Bowlby）——它不是独立，是"不敢依赖"。早年经验告诉你"求助会失望"，于是你把"需要别人"练成了不会。真正的独立是"能依赖也能独立"，而强制性自足是一种防御。',
      turn: '找一件小事，明确地请人帮忙，并且不说"其实我自己也行"。',
      note: '后面那句话，会立刻把求助收回。这一集要忍住。'
    },
    qingxing: {
      name: '清醒旁观剧', genre: '文艺 · 内心独白 · 长镜头', role: '那个永远站在场外的人',
      story: '你什么都看得明白。你知道他为什么那样说、知道这段关系会怎么结束、知道自己该怎么做。你甚至能一边难过，一边分析自己为什么难过。但你很少真的进去。看透了，也就进不去了。',
      danmu: ['他在分析自己的失恋', '看透了，然后呢', '这角色像在看监控', '他连难过都要先分类'],
      quote: '你把一切都看透了，所以你什么都没进去。',
      curse: '这是"情感隔离"（isolation of affect），一种很成熟的防御机制：把"感受"和"事件"切开，只保留分析。它让你在混乱中保持清醒，代价是你也失去了参与的资格。清醒是一种能力，但过量的清醒是一种回避。',
      turn: '做一件你分析不出理由的事，并且不解释它。',
      note: '如果你开始分析"为什么要做这件事"，就说明防御又启动了。'
    },
    xiju: {
      name: '合家欢喜剧', genre: '生活 · 群像 · 每集都笑', role: '那个负责搞笑的人',
      story: '你是那个一开口就能让全场笑的人。朋友失恋找你、同事郁闷找你、家里气氛僵了也是你打圆场。你把所有事都能讲成段子，包括你自己的。你很少让人看到你不笑的样子——因为那个样子的你，你自己也不太熟。',
      danmu: ['全场笑了，除了他', '这段我笑不出来', '他把伤口讲成了段子', '散场后他一个人坐了很久'],
      quote: '你让所有人都笑了，除了散场后的你自己。',
      curse: '这是"防御性幽默"：用笑把痛包起来，是最高级也最孤独的防御。研究发现，自嘲式幽默与更高的抑郁风险相关，但同时它也是最具社交魅力的防御方式。所以往往没人来救你——你看起来太不需要了。',
      turn: '跟一个人说一件你真的很难过的事，全程不许开玩笑。',
      note: '如果中途你想用一句玩笑滑过去，那正是最该停下来的地方。'
    },
    jiushu: {
      name: '救赎英雄剧', genre: '群像 · 热血 · 主角总在救别人', role: '那个总在救别人的人',
      story: '朋友出事你第一个到、同事搞不定你接手、家里有麻烦你顶上。你很擅长"解决问题"，也很享受被需要。但你有没有发现：你救过的人，后来大多没回来救过你。而你自己的那个问题，一直没人问过。',
      danmu: ['又去救人了', '谁来救救他', '这集他被人利用了', '他自己还没上岸'],
      quote: '你救过很多人，但你从来没把自己列进名单。',
      curse: '这是"卡普曼戏剧三角"（Karpman, 1968）：拯救者、迫害者、受害者三个角色会互相轮转。拯救者最危险的地方在于——当付出没有被感激，你会悄悄转到"受害者"的位置，然后开始怨恨。而对方甚至不知道发生过什么。',
      turn: '这一周有一个人找你帮忙，你说"这次我不行"，只此一次。',
      note: '不用给理由。给了理由，就变成了谈判。'
    },
    choubei: {
      name: '筹备中', genre: '未开机 · 剧本已改七稿 · 待定', role: '那个一直在准备、还没开拍的人',
      story: '你有很多计划：想学的、想做的、想去的、想成为的。你一直在准备——等存够钱、等状态好一点、等一个合适的时机。你的剧本改了七稿，演员都换了两轮，就是还没开机。你不是没能力，你是怕开拍之后发现，它没有想象中那么好。',
      danmu: ['第一集什么时候播', '预告片放了十年', '我们都是观众', '开机吧，求你了'],
      quote: '你不是还没开始，你是在等一个不会来的开机日。',
      curse: '这叫"准备性拖延"：拖延的本质常常不是懒，而是保护。只要不开机，"我本可以拍出一部好片"这个可能性就永远成立；一旦开机，就要面对"也许只是一部普通片"。所以你宁可永远筹备。',
      turn: '把"准备好再做"改成"先做最烂的一版"，允许它难看。',
      note: '烂的第一版，比完美的第零版多一个东西：它是真的。'
    }
  };

  var VEC = {
    chengxi: [.9, .25, .55, .15, .75], dongshi: [.35, .95, .9, .5, .8],
    kuqing: [.2, .8, .7, .95, .85], danvzhu: [.95, .4, .85, .1, .6],
    qingxing: [.3, .35, .8, .55, .5], xiju: [.55, .7, .95, .4, .6],
    jiushu: [.9, .9, .45, .3, .75], choubei: [.15, .45, .6, .85, .25]
  };

  var LS_KEY = 'drama_card_session_v1';
  var TOTAL = Q.length;

  var state = {
    mode: 'own',        // own | shared
    session: null,      // { token, code, remaining, max }
    answers: new Array(TOTAL).fill(null),
    idx: 0,
    age: 28,
    playKey: null,
    score: null,
    shareId: null,
    saving: false
  };

  var sb = null;

  /* ---------------- 工具 ---------------- */
  function $(id) { return document.getElementById(id); }

  function go(id) {
    var all = document.querySelectorAll('.screen');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('on');
    var el = $(id);
    if (el) el.classList.add('on');
    window.scrollTo(0, 0);
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 2200);
  }

  function renderQuota() {
    var bar = $('topbar'), q = $('quota');
    if (state.mode === 'shared') { bar.hidden = true; document.body.classList.remove('hasbar'); return; }
    if (!state.session) { bar.hidden = true; document.body.classList.remove('hasbar'); return; }
    bar.hidden = false;
    document.body.classList.add('hasbar');
    q.innerHTML = '本凭证还剩 <b>' + state.session.remaining + '</b> 次';
  }

  function saveSession() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        token: state.session.token,
        code: state.session.code,
        remaining: state.session.remaining,
        max: state.session.max,
        at: Date.now()
      }));
    } catch (e) { /* 隐私模式下忽略 */ }
  }

  function readSession() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.token) return null;
      // 前端只做 6 小时粗筛，真实有效期由数据库 expires_at 决定
      if (Date.now() - (s.at || 0) > 6 * 3600 * 1000) return null;
      return s;
    } catch (e) { return null; }
  }

  function clearSession() {
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
    state.session = null;
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    var cfg = window.DRAMA_CONFIG || {};
    var url = (cfg.SUPABASE_URL || '').trim();
    var key = (cfg.SUPABASE_ANON_KEY || '').trim();

    if (!url || !key || url.indexOf('http') !== 0) {
      $('loadText').innerHTML = '站点还没有接上数据库。<br><span style="font-size:12px;color:#6E6154">请先在 assets/config.js 填入 Supabase 的 URL 与 anon key</span>';
      $('loadText').style.lineHeight = '2';
      return;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      $('loadText').innerHTML = '组件没加载成功。<br><span style="font-size:12px;color:#6E6154">请检查网络后刷新页面</span>';
      $('loadText').style.lineHeight = '2';
      return;
    }

    try {
      sb = window.supabase.createClient(url, key);
    } catch (e) {
      $('loadText').textContent = '数据库连接失败：' + e.message;
      return;
    }

    // 分享链接优先
    var share = new URLSearchParams(location.search).get('r');
    if (share) { loadShared(share); return; }

    // 有未完成的会话就直接进封面（不重复扣次数）
    var s = readSession();
    if (s) {
      state.session = s;
      renderQuota();
      go('s-cover');
    } else {
      go('s-gate');
    }
  }

  /* 把底层错误分成「网络」和「服务端」两类 —— 否则数据库报错会伪装成网络问题，
     让人对着手机排查半天网络，实际是后台没配好 */
  function rpcFail(res) {
    var e = res.error || {};
    var raw = String(e.message || '');
    var code = String(e.code || '');
    var isNet = !raw || /Failed to fetch|NetworkError|Load failed|fetch failed|timeout|aborted|abort/i.test(raw);
    var err = isNet
      ? new Error('连不上服务器，换个网络或稍后再试')
      : new Error('服务暂时不可用' + (code ? '（' + code + '）' : '') + '，请联系发送密码的人');
    err.friendly = true;
    err.raw = raw;
    if (window.console && console.error) console.error('[剧本卡] 调用失败', code, raw);
    return err;
  }

  /* ---------------- 兑换凭证 ---------------- */
  function redeem(code, onOk) {
    return sb.rpc('redeem_code', { p_code: code }).then(function (res) {
      if (res.error) throw rpcFail(res);
      return res.data;
    }).then(function (data) {
      if (!data || !data.ok) {
        var e = new Error((data && data.msg) || '兑换失败');
        e.friendly = true;
        throw e;
      }
      state.session = {
        token: data.token, code: code, remaining: data.remaining, max: data.max
      };
      saveSession();
      renderQuota();
      if (onOk) onOk();
      return data;
    });
  }

  function bindGate() {
    var input = $('codeInput'), btn = $('redeemBtn'), err = $('gateErr');

    function submit() {
      var code = (input.value || '').trim().toUpperCase();
      err.className = 'err';
      if (!code) { err.textContent = '请先输入凭证密码'; return; }
      btn.disabled = true;
      btn.textContent = '正 在 验 票 …';

      redeem(code, function () {
        go('s-cover');
      }).catch(function (e) {
        err.textContent = e.friendly ? e.message : '网络不太顺，稍后再试一次';
      }).then(function () {
        btn.disabled = false;
        btn.textContent = '兑 换 凭 证';
      });
    }

    btn.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    input.addEventListener('input', function () {
      input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });
  }

  /* ---------------- 答题 ---------------- */
  function startQuiz() {
    var v = parseInt($('ageinput').value, 10);
    state.age = (v >= 10 && v <= 99) ? v : 28;
    state.idx = 0;
    state.answers = new Array(TOTAL).fill(null);
    renderQ();
    go('s-quiz');
  }

  function renderQ() {
    var q = Q[state.idx];
    $('qmeta').textContent = pad2(state.idx + 1) + ' / ' + TOTAL;
    $('qtext').textContent = q.q;

    var done = 0;
    for (var k = 0; k < TOTAL; k++) if (state.answers[k] !== null) done++;
    $('prog').hidden = false;
    $('progbar').style.width = (done / TOTAL * 100) + '%';

    var box = $('opts');
    box.innerHTML = '';
    q.o.forEach(function (pair, i) {
      var b = document.createElement('button');
      b.className = 'opt' + (state.answers[state.idx] !== null && state.answers[state.idx] === i ? ' picked' : '');
      b.type = 'button';
      b.textContent = pair[0];
      b.addEventListener('click', function () { pick(i); });
      box.appendChild(b);
    });

    // 分页小点
    var nav = $('dotnav');
    nav.innerHTML = '';
    for (var i = 0; i < TOTAL; i++) {
      var d = document.createElement('i');
      if (state.answers[i] !== null) d.className = 'done';
      if (i === state.idx) d.className = 'cur';
      nav.appendChild(d);
    }

    $('backBtn').disabled = state.idx === 0;
  }

  function pick(optIndex) {
    state.answers[state.idx] = optIndex;

    var btns = document.querySelectorAll('#opts .opt');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('picked');
    btns[optIndex].classList.add('picked');

    setTimeout(function () {
      if (state.idx < TOTAL - 1) {
        state.idx++;
        renderQ();
        window.scrollTo(0, 0);
      } else {
        finish();
      }
    }, 240);
  }

  function backQ() {
    if (state.idx === 0) return;
    state.idx--;
    renderQ();
    window.scrollTo(0, 0);
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  /* ---------------- 计分 ---------------- */
  function computeDims() {
    var s = { act: 0, oth: 0, msk: 0, wait: 0, rep: 0 };
    for (var i = 0; i < TOTAL; i++) {
      if (state.answers[i] === null) continue;
      s[Q[i].d] += Q[i].o[state.answers[i]][1];
    }
    return s;
  }

  function matchPlay(dims) {
    var u = [
      dims.act / MAXD.act, dims.oth / MAXD.oth, dims.msk / MAXD.msk,
      dims.wait / MAXD.wait, dims.rep / MAXD.rep
    ];
    var best = null, bd = 99;
    for (var k in VEC) {
      var d = 0;
      for (var i = 0; i < 5; i++) d += Math.pow(u[i] - VEC[k][i], 2);
      d = Math.sqrt(d);
      if (d < bd) { bd = d; best = k; }
    }
    return { key: best, u: u, dist: bd };
  }

  /* ---------------- 提交 ---------------- */
  function submitResult(playKey, score, dims) {
    if (!state.session) return Promise.resolve(null);
    return sb.rpc('submit_result', {
      p_token: state.session.token,
      p_play: playKey,
      p_age: state.age,
      p_score: score,
      p_dims: dims
    }).then(function (res) {
      if (res.error) throw rpcFail(res);
      if (!res.data || !res.data.ok) throw new Error((res.data && res.data.msg) || 'submit rejected');
      return res.data.share;
    });
  }

  /* ---------------- 计算动画 + 出结果 ---------------- */
  function finish() {
    go('s-calc');
    $('progbar').style.width = '100%';

    var dims = computeDims();
    var m = matchPlay(dims);
    var play = PLAYS[m.key];
    var sc = (6.7 + dims.rep / MAXD.rep * 1.1 + (1 - dims.msk / MAXD.msk) * 0.4).toFixed(1);

    state.playKey = m.key;
    state.score = sc;

    var logs = ['比对剧情模式', '定位主角位置', '调取观众弹幕', '生成剧集卡', '盖章'];
    var i = 0;
    var timer = setInterval(function () {
      $('calclog').textContent = logs[i] || '完成';
      i++;
      if (i >= logs.length) clearInterval(timer);
    }, 330);

    // 提交与动画并行
    submitResult(m.key, parseFloat(sc), dims)
      .then(function (share) { state.shareId = share; })
      .catch(function () { state.shareId = null; })
      .then(function () {
        setTimeout(function () {
          clearInterval(timer);
          renderResult();
          go('s-result');
        }, 1150);
      });
  }

  /* ---------------- 渲染结果 ---------------- */
  function renderResult() {
    var P = PLAYS[state.playKey];
    if (!P) return;

    $('pname').textContent = P.name;
    $('pgenre').textContent = P.genre;
    $('pep').textContent = '第 ' + state.age + ' 集　·　本季集数：未知';
    $('prole').textContent = P.role;
    $('pscore').textContent = state.score;
    $('pdmb').textContent = '「' + P.danmu[0] + '」';
    $('prole2').textContent = P.role;
    $('pstory').textContent = P.story;
    $('pquote').textContent = '「' + P.quote + '」';
    $('pcurse').textContent = P.curse;
    $('pturn').textContent = P.turn;
    $('pnote').textContent = P.note;

    var dbox = $('dmbox');
    dbox.innerHTML = '';
    P.danmu.forEach(function (t, i) {
      var s = document.createElement('span');
      s.className = 'dline in';
      s.textContent = t;
      s.style.animationDelay = (0.1 + i * 0.1) + 's';
      dbox.appendChild(s);
    });

    $('shotSig').textContent = 'NO. ' + (state.shareId || 'LOCAL').toUpperCase();

    if (state.mode === 'shared') {
      if ($('raters')) $('raters').textContent = '1（分享者）';
      $('sharedBanner').hidden = false;
      $('sharedBanner').innerHTML = '这是一张<b>被分享的剧本卡</b>。往下看，是你的朋友反复在演的那一出。';
      $('actions').innerHTML =
        '<p class="share-tip">想知道自己演的是哪一出？</p>' +
        '<button class="btn" id="toGateBtn">我 也 要 测 一 次</button>' +
        '<p class="foot">本测评基于叙事身份理论、依恋理论与防御机制的通俗化改编，<br>仅供自我探索与娱乐参考，不构成心理诊断。</p>';
      $('toGateBtn').addEventListener('click', function () {
        history.replaceState({}, '', location.pathname);
        location.href = location.pathname;
      });
      $('topbar').hidden = true;
      document.body.classList.remove('hasbar');
      document.title = P.name + ' · 你的人生剧本卡';
    } else {
      if ($('raters')) $('raters').textContent = '1（你自己）';
      bindResultActions();
      $('shareTip').textContent = state.shareId
        ? '截图这张剧集卡，发给那个和你演同一部剧的人'
        : '截图这张剧集卡保存下来';
    }
  }

  /* ---------------- 结果页操作 ---------------- */
  function bindResultActions() {
    $('saveBtn').addEventListener('click', saveImage);
    $('copyBtn').addEventListener('click', copyLink);
    $('againBtn').addEventListener('click', again);

    if (!state.shareId) {
      $('copyBtn').disabled = true;
      $('copyBtn').textContent = '链接不可用';
    }
  }

  function shareUrl() {
    if (!state.shareId) return '';
    return location.origin + location.pathname + '?r=' + state.shareId;
  }

  function copyLink() {
    var url = shareUrl();
    if (!url) { toast('这一轮没拿到分享链接'); return; }

    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = url;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      toast(ok ? '链接已复制，去发给朋友吧' : '复制失败，长按下方链接手动复制');
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(function () {
        toast('链接已复制，去发给朋友吧');
      }).catch(fallback);
    } else {
      fallback();
    }
  }

  /* ---------------- 长图 ---------------- */
  function saveImage() {
    if (state.saving) return;
    if (typeof window.html2canvas !== 'function') { toast('图片组件没加载成功，刷新试试'); return; }

    state.saving = true;
    var btn = $('saveBtn');
    var origin = btn.textContent;
    btn.disabled = true;
    btn.textContent = '正 在 生 成 …';

    // 把入场动画收尾，避免截到半透明的弹幕
    var lines = document.querySelectorAll('#dmbox .dline');
    for (var i = 0; i < lines.length; i++) {
      lines[i].classList.remove('in');
      lines[i].style.animation = 'none';
      lines[i].style.opacity = '1';
      lines[i].style.transform = 'none';
    }

    var el = $('shot');

    setTimeout(function () {
      window.html2canvas(el, {
        backgroundColor: '#12100E',
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: document.documentElement.clientWidth,
        scrollX: 0,
        scrollY: -window.scrollY
      }).then(function (canvas) {
        var url = canvas.toDataURL('image/jpeg', 0.92);
        openImageModal(url);
      }).catch(function (e) {
        toast('生成失败，可以直接截屏保存');
      }).then(function () {
        state.saving = false;
        btn.disabled = false;
        btn.textContent = origin;
      });
    }, 60);
  }

  function openImageModal(url) {
    var body = $('modalBody');
    body.innerHTML = '';
    var img = document.createElement('img');
    img.src = url;
    img.alt = '人生剧本卡长图';
    body.appendChild(img);
    body.scrollTop = 0;

    var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    $('modalHint').textContent = isTouch
      ? '长按图片 → 保存到相册（iPhone 选"存储到照片"）'
      : '点击下方按钮下载到电脑';

    $('downloadBtn').onclick = function () {
      var a = document.createElement('a');
      a.href = url;
      a.download = '人生剧本卡_' + (state.shareId || Date.now()) + '.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('已开始下载');
    };

    $('modal').classList.add('on');
    document.body.classList.add('locked');
  }

  function closeModal() {
    $('modal').classList.remove('on');
    document.body.classList.remove('locked');
  }

  /* ---------------- 再测一次 ---------------- */
  function again() {
    var left = state.session ? state.session.remaining : 0;

    if (left <= 0) {
      toast('这个密码的 ' + (state.session ? state.session.max : 3) + ' 次机会用完了');
      setTimeout(function () {
        clearSession();
        renderQuota();
        go('s-gate');
      }, 1200);
      return;
    }

    var ok = window.confirm('再测一次会消耗 1 次机会（这个密码还剩 ' + left + ' 次），继续吗？');
    if (!ok) return;

    var btn = $('againBtn');
    btn.disabled = true;
    btn.textContent = '正 在 重 新 验 票 …';

    redeem(state.session.code, function () {
      state.idx = 0;
      state.answers = new Array(TOTAL).fill(null);
      state.shareId = null;
      state.playKey = null;
      state.score = null;
      $('progbar').style.width = '0%';
      $('sharedBanner').hidden = true;
      go('s-cover');
    }).catch(function (e) {
      toast(e.friendly ? e.message : '重新验票失败，请重新输入密码');
      if (e.friendly) {
        clearSession();
        go('s-gate');
      }
    }).then(function () {
      btn.disabled = false;
      btn.textContent = '再测一次';
    });
  }

  /* ---------------- 分享页 ---------------- */
  function loadShared(shareId) {
    state.mode = 'shared';
    sb.rpc('get_result', { p_share: shareId }).then(function (res) {
      if (res.error) throw rpcFail(res);
      var d = res.data;
      if (!d || !d.ok || !PLAYS[d.play]) {
        $('loadText').innerHTML = '这张剧本卡不存在，或者链接不完整。<br><span style="font-size:12px;color:#6E6154">请向分享者重新索要链接</span>';
        return;
      }
      state.playKey = d.play;
      state.age = d.age || 28;
      state.score = d.score ? Number(d.score).toFixed(1) : '—';
      state.shareId = shareId;
      renderResult();
      go('s-result');
      $('prog').hidden = true;
    }).catch(function () {
      $('loadText').textContent = '读取失败，检查一下网络';
    });
  }

  /* ---------------- 绑定 ---------------- */
  document.addEventListener('DOMContentLoaded', function () {
    bindGate();
    $('startBtn').addEventListener('click', startQuiz);
    $('backBtn').addEventListener('click', backQ);
    $('modalClose').addEventListener('click', closeModal);
    $('modal').addEventListener('click', function (e) {
      if (e.target === $('modal')) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('modal').classList.contains('on')) closeModal();
    });

    // 答题时按键盘 1-4 可直接选
    document.addEventListener('keydown', function (e) {
      if (!$('s-quiz').classList.contains('on')) return;
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) {
        var btns = document.querySelectorAll('#opts .opt');
        if (btns[n - 1]) btns[n - 1].click();
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        backQ();
      }
    });

    boot();
  });

})();
