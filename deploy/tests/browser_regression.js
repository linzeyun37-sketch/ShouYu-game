// Playwright CLI run-code --filename deploy/tests/browser_regression.js
// Open a local release served by bank_api/server.js with a disposable DB first.
async page => {
  const base = new URL(page.url());
  base.hash = ''; base.search = '';
  if (base.hostname !== '127.0.0.1') throw new Error('Use an isolated local server and DB; this test writes submissions and votes.');
  const errors = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const go = async hash => { await page.goto(base.href + hash); await settle(); };
  await page.goto(base.href); await page.reload();
  await page.evaluate(() => { localStorage.clear(); return document.fonts.ready; });

  // Every category, difficulty, game and utility route, at desktop and phone sizes.
  const routes = await page.evaluate(() => [
    ['#/', '手语小游戏手册', null], ['#/search', '搜索与筛选', GAMES.length],
    ['#/files', '资料下载', null], ['#/todo', '待补充与反馈', GAMES.filter(g => g.cat === '8').length],
    ...CATEGORIES.filter(c => c.key !== '8').map(c => ['#/cat/' + c.key, c.name, GAMES.filter(g => g.cat === c.key).length]),
    ...[0, 1, 2, 3].map(level => ['#/level/' + level, ['待定游戏', '入门游戏', '进阶游戏', '挑战游戏'][level], GAMES.filter(g => META[g.id].level === level).length]),
    ...GAMES.map(g => ['#/game/' + g.id, g.id + ' ' + g.title, null])
  ]);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [hash, title, count] of routes) {
      await go(hash);
      assert((await page.locator('#app h1').innerText()).includes(title), 'Wrong title: ' + hash);
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        columns: document.querySelector('.game-list') ? getComputedStyle(document.querySelector('.game-list')).gridTemplateColumns.split(' ').length : null,
        count: document.querySelectorAll('.game-list .game-item').length,
        active: document.querySelectorAll('.top-nav [aria-current=page]').length
      }));
      assert(!layout.overflow && layout.active === 1, JSON.stringify({ width, hash, ...layout }));
      if (count !== null) assert(layout.count === count && layout.columns === (width > 900 ? 2 : 1), 'List layout/count: ' + width + hash);
      checks.push(width + hash);
    }
  }
  for (const width of [1024, 900, 768, 375, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const hash of ['#/', '#/cat/2', '#/level/1', '#/search', '#/files', '#/todo']) {
      await go(hash);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Overflow: ' + width + hash);
      if (await page.locator('.game-list').count()) {
        const columns = await page.locator('.game-list').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length);
        assert(columns === (width > 900 ? 2 : 1), 'Columns: ' + width + hash);
      }
      checks.push(width + hash);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const hash of ['#/cat/404', '#/level/9', '#/game/99', '#/game/01/extra', '#/files/extra', '#/unknown']) {
    await go(hash); assert(await page.locator('#app h1').innerText() === '页面不存在', 'Invalid route: ' + hash);
  }
  await go('#/cat/8'); assert(new URL(page.url()).hash === '#/todo', 'Legacy pending category redirect');

  // Search round-trips reserved characters, malformed encoding and combined filters.
  await go('#/search?q=猫=狗');
  assert(await page.locator('#s-q').inputValue() === '猫=狗', 'Equals was truncated');
  await go('#/search?q=%E0%A4%A');
  assert(await page.locator('#s-count').isVisible(), 'Malformed query broke routing');
  await go('#/search?q=%3Cimg%20src%3Dx%3E%26%2B');
  assert(await page.locator('#s-q').inputValue() === '<img src=x>&+' && await page.locator('#s-results img').count() === 0, 'Search escaping');
  await go('#/search?q=数字&cat=3&level=1&status=' + encodeURIComponent('完整规则'));
  assert(await page.locator('#s-cat').inputValue() === '3' && await page.locator('#s-level').inputValue() === '1', 'Filter round-trip');
  await page.locator('#s-reset').click();
  assert(await page.locator('#s-results .game-item').count() === 67, 'Reset did not restore all games');
  await page.locator('#s-q').fill('一个不存在的游戏名称');
  assert(await page.locator('#s-results .empty').count() === 1, 'Empty search');
  await page.locator('#header-search input').fill('抢数字');
  await page.locator('#header-search button').click(); await settle();
  assert(await page.locator('#s-results a[href="#/game/54"]').count() === 1, 'Header search');

  // Detail return and browser history preserve the chosen list, filters and scroll.
  for (const hash of ['#/search?level=1', '#/level/2', '#/cat/2', '#/todo']) {
    await go(hash);
    const item = page.locator('.game-list .game-item').last();
    await item.scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY), origin = new URL(page.url()).hash;
    await item.click(); await page.locator('.detail').waitFor();
    assert(await page.locator('.back-row a').getAttribute('href') === origin, 'Detail lost list context: ' + origin);
    await page.locator('.back-row a').click(); await settle();
    assert(new URL(page.url()).hash === origin, 'Return URL: ' + origin);
    assert(Math.abs((await page.evaluate(() => scrollY)) - scroll) <= 2, 'Return scroll: ' + origin);
    await page.locator('.game-list .game-item').last().click(); await page.locator('.detail').waitFor();
    await page.goBack(); await settle();
    assert(new URL(page.url()).hash === origin && await page.locator('.game-list').count() === 1, 'Browser back');
    await page.goForward(); await settle();
    assert(await page.locator('.back-row a').getAttribute('href') === origin, 'Browser forward context');
    if (await page.locator('.pager a').count()) {
      await page.locator('.pager a').first().click(); await settle();
      assert(await page.locator('.back-row a').getAttribute('href') === origin, 'Pager lost list context');
    }
  }

  // Feedback validation and editing preserve text; no email is sent.
  await go('#/todo');
  await page.locator('#feedback-form button[type=submit]').click();
  assert(await page.locator('#feedback-text').count() === 0, 'Empty feedback accepted');
  await page.locator('#feedback-form textarea').fill('   ');
  await page.locator('#feedback-form button[type=submit]').click();
  assert(await page.locator('#feedback-text').count() === 0, 'Whitespace feedback accepted');
  const feedback = '请保留原文 <测试> & 问题';
  await page.locator('#feedback-form textarea').fill(feedback);
  await page.locator('#feedback-form input[name=name]').fill('测试者');
  await page.locator('#feedback-form button[type=submit]').click();
  assert((await page.locator('#feedback-text').inputValue()).includes(feedback), 'Feedback text changed');
  const email = new URL(await page.locator('#feedback-result a').getAttribute('href'));
  assert(email.protocol === 'mailto:' && email.searchParams.get('body').includes(feedback), 'Email body encoding');
  await page.locator('#refill-btn').click();
  assert(await page.locator('#feedback-form textarea').inputValue() === feedback, 'Editing lost feedback');

  // Local-only bank writes, double-click protection and failure recovery.
  await go('#/game/01'); await page.locator('#bank-form').waitFor();
  await page.locator('#bank-input').fill('正在写的题目');
  await page.locator('.like-btn[data-key=s0]').click();
  await page.waitForFunction(() => document.querySelector('.like-btn[data-key=s0]').textContent.includes('已点赞'));
  assert(await page.locator('#bank-input').inputValue() === '正在写的题目', 'Like cleared draft');
  await page.route('**/api/banks/01/*/like', r => r.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"请稍后再试"}' }));
  await page.locator('.like-btn[data-key=s1]').click();
  await page.waitForFunction(() => document.querySelector('#bank-msg').textContent.includes('请稍后再试'));
  assert(await page.locator('.like-btn[data-key=s1]').isEnabled(), 'Failed like cannot retry');
  await page.unroute('**/api/banks/01/*/like');
  let submissions = 0;
  await page.route('**/api/banks/01', async r => {
    if (r.request().method() === 'POST') { submissions++; await new Promise(resolve => setTimeout(resolve, 100)); }
    await r.continue();
  });
  await page.locator('#bank-input').fill('防重复投稿测试');
  await page.locator('#bank-form').evaluate(f => { f.requestSubmit(); f.requestSubmit(); });
  await page.waitForFunction(() => document.querySelector('#bank-msg').textContent === '投稿成功。');
  assert(submissions === 1, 'Duplicate submission');
  assert(await page.locator('.bank-text').filter({ hasText: '防重复投稿测试' }).count() === 1, 'Submission not displayed once');
  await page.unroute('**/api/banks/01');
  await page.route('**/api/banks/01', r => r.request().method() === 'POST'
    ? r.fulfill({ status: 429, contentType: 'application/json', body: '{"error":"投稿太频繁，请稍后再试"}' }) : r.continue());
  await page.locator('#bank-input').fill('失败时保留题目'); await page.locator('#bank-form button').click();
  await page.waitForFunction(() => document.querySelector('#bank-msg').textContent.includes('投稿太频繁'));
  assert(await page.locator('#bank-input').inputValue() === '失败时保留题目' && await page.locator('#bank-form button').isEnabled(), 'Failed submission lost draft or locked form');
  await page.unroute('**/api/banks/01');

  // Old responses must not replace a later visit to the SAME game.
  await go('#/game/03');
  let held;
  await page.route('**/api/banks/01', r => { if (!held) held = r; else return r.continue(); });
  await go('#/game/01'); await page.waitForTimeout(100);
  assert(held, 'Request not intercepted');
  await go('#/game/02'); await page.locator('#bank-form').waitFor();
  await go('#/game/01'); await page.locator('#bank-input').fill('新页面草稿');
  await held.fulfill({ status: 200, contentType: 'application/json', body: '{"ustale":{"text":"过期响应","likes":999}}' });
  await page.waitForTimeout(100);
  assert(await page.locator('#bank-input').inputValue() === '新页面草稿' && await page.locator('.bank-text').filter({ hasText: '过期响应' }).count() === 0, 'Stale response replaced current bank');
  await page.unroute('**/api/banks/01');

  // An HTML error response and a hanging connection fall back to seeds, with retry.
  await go('#/game/03');
  await page.route('**/api/banks/01', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<html>Service unavailable</html>' }));
  await go('#/game/01'); await page.locator('#bank-retry').waitFor();
  assert(await page.locator('#bank-form').count() === 0 && await page.locator('.bank-item').count() === 6, 'Invalid JSON treated as online');
  await page.unroute('**/api/banks/01');
  await page.locator('#bank-retry').click(); await page.locator('#bank-form').waitFor();
  await go('#/game/03');
  let hanging;
  await page.route('**/api/banks/01', r => { hanging = r; });
  await go('#/game/01'); await page.locator('#bank-retry').waitFor({ timeout: 13000 });
  await hanging.abort().catch(() => {}); await page.unroute('**/api/banks/01');
  await page.locator('#bank-retry').click(); await page.locator('#bank-form').waitFor();

  assert(errors.length === 0, errors.join('; '));
  return { responsiveRoutes: checks.length, search: true, history: true, feedback: true, bank: true, pageErrors: errors };
}
