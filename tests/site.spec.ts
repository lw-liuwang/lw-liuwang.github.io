import { test, expect } from '@playwright/test';

test('English homepage, selected contributions, and project navigation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#profile-name')).toHaveText('liu wang');
  await expect(page.locator('.wordmark')).toHaveText('liu wang');
  await expect(page).toHaveTitle(/ · liu wang$/);
  await expect(page.locator('.contribution-entry')).toHaveCount(5);
  const pullLinks = await page.locator('.contribution-pr').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(pullLinks).toEqual([
    'https://github.com/googlecolab/google-colab-cli/pull/181',
    'https://github.com/googlecolab/google-colab-cli/pull/172',
    'https://github.com/vllm-project/vllm/pull/52243',
    'https://github.com/sgl-project/sglang-jax/pull/1806',
    'https://github.com/D-Robotics/openpi_runtime/pull/5',
  ]);
  expect(await page.locator('.profile-avatar').evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.contribution-entry h3')).toHaveText(['Colab CLI', 'Colab CLI', 'vLLM', 'SGLang JAX', 'OpenPI Runtime']);
  await expect(page.locator('.contribution-entry .project-organization')).toHaveText(['Google Colaboratory', 'Google Colaboratory', 'vLLM Project', 'SGLang', 'D-Robotics']);
  const contributionLogos = page.locator('.contribution-entry .personal-project-logo');
  await expect(contributionLogos).toHaveCount(5);
  for (const logo of await contributionLogos.all()) {
    expect(await logo.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await page.locator('.contribution-title a').first().click();
  await expect(page).toHaveURL(/\/contributions\/windows-ssh\/$/);
  await expect(page.locator('.prose')).toContainText('115 SSH tests passed');
  await page.getByRole('link', { name: 'All contributions', exact: true }).click();
  await expect(page).toHaveURL('/contributions/');
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(page).toHaveURL('/#projects');
  const project = page.locator('#projects .personal-project');
  await expect(project).toHaveCount(1);
  await expect(project.getByRole('heading')).toHaveText('RoboRT');
  await expect(project.getByRole('link')).toHaveCount(1);
  await expect(project.getByRole('link', { name: 'RoboRT', exact: true })).toHaveAttribute('href', 'https://github.com/lw-liuwang/RoboRT');
  await expect(project.locator('img')).toBeVisible();
  expect(await project.locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('contribution search, combined filters, empty state and reset', async ({ page }) => {
  await page.goto('/contributions/');
  await expect(page.locator('[data-pr]:visible')).toHaveCount(5);
  await page.getByRole('searchbox').fill('172');
  await expect(page.locator('[data-pr]:visible')).toHaveCount(1);
  await expect(page.locator('[data-pr]:visible')).toContainText('#172');
  await page.locator('#pr-status').selectOption('open');
  await expect(page.locator('#no-results')).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page.locator('[data-pr]:visible')).toHaveCount(5);
  await expect(page.locator('#no-results')).toBeHidden();
  await page.locator('#pr-status').selectOption('open');
  await expect(page.locator('[data-pr]:visible')).toHaveCount(2);
  await page.locator('#pr-project').selectOption('sgl-project/sglang-jax');
  await expect(page.locator('[data-pr]:visible')).toHaveCount(1);
  await expect(page.locator('[data-pr]:visible')).toContainText('SGLang JAX');
  await page.locator('#pr-project').selectOption('D-Robotics/openpi_runtime');
  await expect(page.locator('#no-results')).toBeVisible();
  await page.locator('#pr-status').selectOption('merged');
  await expect(page.locator('[data-pr]:visible')).toHaveCount(1);
  await expect(page.locator('[data-pr]:visible')).toContainText('D-Robotics');
});

test('all public pages are English with working links and no overflow', async ({ page, request }, testInfo) => {
  const paths = [
    '/', '/contributions/', '/writing/',
    '/contributions/windows-ssh/', '/contributions/allocation-recovery/',
    '/contributions/vllm-rmsnorm-rounding/', '/contributions/sglang-jax-cache-relocation/',
    '/contributions/openpi-s600-pipeline/',
  ];
  const checkedLinks = new Set<string>();
  for (const path of paths) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.language-switch, a[href^="/zh"], link[hreflang]')).toHaveCount(0);
    await page.evaluate(() => document.fonts.ready);
    const dimensions = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
    expect(dimensions.content, `Overflow at ${path}`).toBeLessThanOrEqual(dimensions.width);
    const links = await page.locator('a[href^="/"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')!));
    for (const link of links) {
      if (checkedLinks.has(link)) continue;
      checkedLinks.add(link);
      expect((await request.get(link)).status(), link).toBe(200);
    }
    expect((await request.get(`/zh${path}`)).status()).toBe(404);
    if (path === '/' || path.startsWith('/contributions')) {
      const name = path === '/' ? 'home' : path === '/contributions/' ? 'contributions' : path.split('/')[2];
      await page.screenshot({ path: `test-results/screenshots/${testInfo.project.name}-en-${name}.png`, fullPage: true });
    }
  }
});

test('new case studies preserve PR status and validation limits', async ({ page }) => {
  await page.goto('/contributions/vllm-rmsnorm-rounding/');
  await expect(page.locator('.article-meta .status')).toHaveText('Open');
  await expect(page.locator('.prose')).toContainText('Those CUDA results were not reproduced on the current rebased revision.');
  await page.goto('/contributions/sglang-jax-cache-relocation/');
  await expect(page.locator('.article-meta .status')).toHaveText('Open');
  await expect(page.locator('.article-meta')).toContainText('sgl-project/sglang-jax');
  await expect(page.locator('.prose')).toContainText('entries generated under the previous');
  await page.goto('/contributions/openpi-s600-pipeline/');
  await expect(page.locator('.article-meta .status')).toHaveText('Merged');
  await expect(page.locator('.prose')).toContainText('does not attach a complete automated test run');
});

test('experience and two first prizes are displayed inline without print controls', async ({ page, request }) => {
  await page.goto('/');
  const experience = page.locator('.home-profile .work-entry');
  await expect(experience).toHaveCount(2);
  await expect(experience.first().getByRole('heading')).toHaveText('Baidu');
  await expect(experience.first()).toContainText('LLM Infrastructure Engineer');
  await expect(experience.last()).toContainText('Horizon Robotics');
  await expect(experience.last()).toContainText('Robotics Algorithm Application Intern');
  expect(await experience.locator('time').evaluateAll(nodes => nodes.map(node => node.getAttribute('datetime')))).toEqual(['2026-03', '2026-09', '2025-08', '2026-03']);
  for (const logo of await experience.locator('img').all()) {
    expect(await logo.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  const awards = page.locator('.resume-awards li');
  await expect(awards).toHaveCount(2);
  await expect(awards).toHaveText([
    'China Graduate Electronics Design Contest -- First Prize',
    'China Collegiate Embedded Chip and System Design Competition -- First Prize',
  ]);
  await expect(page.locator('.profile-resume button')).toHaveCount(0);
  await expect(page.locator('a[href*="/resume"]')).toHaveCount(0);
  expect((await request.get('/resume/')).status()).toBe(404);
  await page.goto('/writing/');
  await expect(page.getByRole('heading', { name: 'A notebook in progress' })).toBeVisible();
  const draft = await request.get('/writing/first-note/');
  expect(draft.status()).toBe(404);
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const sitemapContent = await sitemap.text();
  expect(sitemapContent).not.toContain('first-note');
  expect(sitemapContent).not.toContain('/resume/');
  expect(sitemapContent).not.toContain('/zh/');
});

