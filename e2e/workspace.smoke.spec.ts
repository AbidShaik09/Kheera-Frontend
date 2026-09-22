import { SPACE, projectPage } from '../src/app/testing/space-fixtures';
import { test, expect, Page } from '@playwright/test';

const spaces = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'Engineering' },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Design' },
];

async function fixture(page: Page, data: () => { status: number; body: unknown }) {
  await page.addInitScript(() => localStorage.setItem('accessToken', 'workspace-test-token'));
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/users/me') {
      return route.fulfill({
        json: { id: 'test-user', name: 'Test User', email: 'test@example.test' },
      });
    }
    if (path === '/api/spaces') {
      expect(route.request().headers()['authorization']).toBe('Bearer workspace-test-token');
      const result = data();
      return route.fulfill({ status: result.status, json: result.body });
    }
    if (/^\/api\/spaces\/[^/]+\/projects$/.test(path))
      return route.fulfill({ json: projectPage([]) });
    const matched = spaces.find((space) => path === '/api/spaces/' + space.id);
    if (matched) return route.fulfill({ json: { ...SPACE, ...matched } });
    return route.fulfill({ status: 404, json: {} });
  });
}

async function openSpaces(page: Page) {
  const show = page.getByRole('button', { name: 'Show spaces', exact: true });
  if (await show.isVisible()) await show.click();
}

for (const theme of ['light', 'dark']) {
  test(`space selection, Back and reload in ${theme} mode`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await fixture(page, () => ({ status: 200, body: spaces }));
    await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
    await page.goto('/spaces/' + spaces[0].id);
    await openSpaces(page);
    const nav = page.getByRole('navigation', { name: 'Spaces', exact: true });
    await expect(nav.getByRole('link', { name: 'Engineering', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await nav.getByRole('link', { name: 'Design', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp('/spaces/' + spaces[1].id));
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Design');
    await page.goBack();
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Engineering');
    await page.reload();
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Engineering');
    await openSpaces(page);
    await expect(page.getByRole('button', { name: '+ Create space', exact: true })).toBeDisabled();
    await expect(page.locator('app-home-task')).toHaveCount(0);
    await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark).*$/);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: info.outputPath('workspace-' + theme + '.png'), fullPage: true });
    expect(errors).toEqual([]);
  });
}

test('new account sees onboarding, never sample space counts', async ({ page }) => {
  await fixture(page, () => ({ status: 200, body: [] }));
  await page.goto('/dashboard');
  await openSpaces(page);
  await expect(page.getByText('No spaces yet', { exact: true })).toBeVisible();
  await expect(page.getByText('Ask a space administrator to add your account.')).toBeVisible();
  await expect(page.getByText('6 projects', { exact: true })).toHaveCount(0);
});

test('account pages preserve workspace context without a false current-page link', async ({
  page,
}) => {
  await fixture(page, () => ({ status: 200, body: spaces }));
  await page.goto('/dashboard?space=' + spaces[0].id);
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Engineering');
  for (const name of ['Profile', 'Settings']) {
    const menu = page.getByRole('button', { name: 'Account menu' });
    if (await menu.isVisible()) {
      await menu.click();
      await page.getByRole('menuitem', { name, exact: true }).click();
    } else {
      await page.getByRole('button', { name, exact: true }).click();
    }
    await expect(page).toHaveURL(new RegExp('/' + name.toLowerCase() + '\\?space=' + spaces[0].id));
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText(name);
    await openSpaces(page);
    await expect(page.locator('app-workspace-shell [aria-current="page"]')).toHaveCount(0);
  }
  await page
    .getByRole('navigation', { name: 'Spaces', exact: true })
    .getByRole('link', { name: 'Engineering', exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp('/spaces/' + spaces[0].id));
  await expect(page.locator('app-workspace-shell [aria-current="page"]')).toContainText(
    'Engineering',
  );
});

test('failed request can be retried without stale workspace data', async ({ page }) => {
  let failing = true;
  await fixture(page, () => ({ status: failing ? 500 : 200, body: failing ? {} : spaces }));
  await page.goto('/dashboard');
  await openSpaces(page);
  await expect(page.getByRole('alert')).toContainText('Unable to load spaces');
  failing = false;
  await page.getByRole('button', { name: 'Refresh spaces', exact: true }).first().click();
  await expect(page.getByRole('navigation', { name: 'Spaces', exact: true })).toContainText(
    'Engineering',
  );
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('revoked membership and expired session remove private context', async ({ page }) => {
  let status = 200;
  let data = spaces;
  await fixture(page, () => ({ status, body: data }));
  await page.goto('/dashboard?space=' + spaces[0].id);
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Engineering');
  data = [];
  await openSpaces(page);
  await page.getByRole('button', { name: 'Refresh spaces', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'This space is no longer available' }),
  ).toBeVisible();
  await expect(page.getByText('Engineering', { exact: true })).toHaveCount(0);
  status = 401;
  await page.getByRole('button', { name: 'Refresh spaces', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Spaces', exact: true })).toHaveCount(0);
});

test('sign-out returns to login and mobile navigation supports Escape', async ({ page }) => {
  await fixture(page, () => ({ status: 200, body: spaces }));
  await page.goto('/dashboard');
  const show = page.getByRole('button', { name: 'Show spaces', exact: true });
  if (await show.isVisible()) {
    await show.click();
    const link = page
      .getByRole('navigation', { name: 'Spaces', exact: true })
      .getByRole('link', { name: 'Engineering', exact: true });
    await link.focus();
    await page.keyboard.press('Escape');
    await expect(show).toBeFocused();
    await expect(show).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  } else {
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  }
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('app-workspace-shell')).toHaveCount(0);
});

test('an account change in another tab immediately hides workspace data', async ({ page }) => {
  await fixture(page, () => ({ status: 200, body: spaces }));
  await page.goto('/dashboard?space=' + spaces[0].id);
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Engineering');
  const otherTab = await page.context().newPage();
  try {
    // Same-origin static document, with no app bootstrap or test-token initializer.
    await otherTab.goto('/config.js');
    await otherTab.evaluate(() =>
      localStorage.setItem('accessToken', 'another-account-test-token'),
    );
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Engineering', { exact: true })).toHaveCount(0);
  } finally {
    await otherTab.close();
  }
});
