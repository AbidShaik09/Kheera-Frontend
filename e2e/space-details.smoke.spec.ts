import { test, expect, Page } from '@playwright/test';
import { SPACE, PROJECT, projectPage } from '../src/app/testing/space-fixtures';
async function fixture(
  page: Page,
  result?: (path: string, page: number) => { status: number; body: unknown } | undefined,
) {
  await page.addInitScript(() => localStorage.setItem('accessToken', 'space-browser-test'));
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/users/me')
      return route.fulfill({ json: { id: 'user', name: 'Test User', email: 'test@example.test' } });
    expect(route.request().headers()['authorization']).toBe('Bearer space-browser-test');
    const override = result?.(url.pathname, Number(url.searchParams.get('page') ?? 0));
    if (override) return route.fulfill({ status: override.status, json: override.body });
    if (url.pathname === '/api/spaces')
      return route.fulfill({ json: [{ id: SPACE.id, name: SPACE.name }] });
    if (url.pathname === '/api/spaces/' + SPACE.id) return route.fulfill({ json: SPACE });
    if (url.pathname.endsWith('/projects')) return route.fulfill({ json: projectPage() });
    if (url.pathname === '/api/projects/' + PROJECT.id) return route.fulfill({ json: PROJECT });
    return route.fulfill({ status: 404, json: {} });
  });
}
for (const theme of ['light', 'dark']) {
  test(`space metadata, project navigation and keyboard in ${theme}`, async ({ page }, info) => {
    await fixture(page);
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await page.goto('/spaces/' + SPACE.id);
    const details = page.locator('app-space-details');
    await expect(details.getByRole('heading', { name: SPACE.name, exact: true })).toBeVisible();
    await expect(details.getByText('8 open tasks', { exact: true })).toBeVisible();
    await expect(details.getByRole('progressbar')).toHaveAttribute('value', '45');
    const refresh = details.getByRole('button', { name: 'Refresh space', exact: true });
    await refresh.focus();
    await page.keyboard.press('Enter');
    await expect(details.getByRole('link', { name: PROJECT.name })).toBeVisible();
    await expect(refresh).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath('space-' + theme + '.png'), fullPage: true });
    await details.getByRole('link', { name: PROJECT.name }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/projects/' + PROJECT.id);
    await expect(page.getByRole('heading', { name: PROJECT.name })).toBeVisible();
    await page.reload();
    await expect(page.getByText('The task board is coming soon.')).toBeVisible();
    await page.goBack();
    await expect(details.getByRole('heading', { name: SPACE.name, exact: true })).toBeVisible();
  });
}
test('paginated projects survive back and reload without invented counts', async ({ page }) => {
  const items = Array.from({ length: 12 }, (_, i) => ({
    ...PROJECT,
    id: '00000000-0000-4000-8000-' + String(i + 100).padStart(12, '0'),
    name: 'Project ' + i,
  }));
  await fixture(page, (path, pageNumber) =>
    path.endsWith('/projects')
      ? {
          status: 200,
          body: {
            items: pageNumber === 0 ? items : [PROJECT],
            page: pageNumber,
            size: 12,
            totalItems: 13,
            totalPages: 2,
          },
        }
      : undefined,
  );
  await page.goto('/spaces/' + SPACE.id);
  const details = page.locator('app-space-details');
  await expect(details.getByText('13 projects', { exact: true })).toBeVisible();
  await details.getByRole('button', { name: 'Next page' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/spaces/' + SPACE.id + '?page=1');
  await expect(details.getByRole('heading', { name: 'Projects', exact: true })).toBeFocused();
  await expect(details.getByRole('link', { name: PROJECT.name, exact: true })).toBeVisible();
  await page.reload();
  await expect(details.getByText('Page 2 of 2')).toBeVisible();
  await page.goBack();
  await expect(details.getByText('Page 1 of 2')).toBeVisible();
});
for (const status of [403, 404, 503]) {
  test(`project ${status} preserves metadata and supports retry`, async ({ page }) => {
    let failing = true;
    await fixture(page, (path) =>
      path.endsWith('/projects') && failing ? { status, body: {} } : undefined,
    );
    await page.goto('/spaces/' + SPACE.id);
    const details = page.locator('app-space-details');
    await expect(details.getByRole('alert')).toContainText('Projects are unavailable');
    await expect(details.getByText(SPACE.description)).toBeVisible();
    await expect(details.getByText('No projects yet')).toHaveCount(0);
    failing = false;
    await details.getByRole('button', { name: 'Refresh space' }).click();
    await expect(details.getByRole('link', { name: PROJECT.name })).toBeVisible();
  });
}
test('genuine empty projects and permission-restricted metadata', async ({ page }) => {
  await fixture(page, (path) =>
    path.endsWith('/projects')
      ? { status: 200, body: projectPage([]) }
      : path === '/api/spaces/' + SPACE.id
        ? {
            status: 200,
            body: {
              ...SPACE,
              description: null,
              capabilities: { canUpdate: false, canDelete: false, canManageMembers: false },
            },
          }
        : undefined,
  );
  await page.goto('/spaces/' + SPACE.id);
  const details = page.locator('app-space-details');
  await expect(details.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
  await expect(details.getByText('No description provided.')).toBeVisible();
  await expect(details.getByRole('button', { name: /coming soon/ })).toHaveCount(0);
});
test('deleted space and session expiry discard previously displayed children', async ({ page }) => {
  let status = 200;
  await fixture(page, (path) =>
    path === '/api/spaces/' + SPACE.id && status !== 200 ? { status, body: {} } : undefined,
  );
  await page.goto('/spaces/' + SPACE.id);
  const details = page.locator('app-space-details');
  await expect(details.getByRole('link', { name: PROJECT.name })).toBeVisible();
  status = 404;
  await details.getByRole('button', { name: 'Refresh space' }).click();
  await expect(details.getByRole('heading', { name: 'Space unavailable' })).toBeVisible();
  await expect(details.getByText(PROJECT.name)).toHaveCount(0);
  status = 401;
  await details.getByRole('button', { name: 'Refresh space' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(PROJECT.name)).toHaveCount(0);
});

test('switching spaces and accounts cannot reveal a delayed prior resource', async ({ page }) => {
  const next = { ...SPACE, id: '00000000-0000-4000-8000-000000000002', name: 'Design' };
  await fixture(page, (path) =>
    path === '/api/spaces'
      ? { status: 200, body: [SPACE, next].map(({ id, name }) => ({ id, name })) }
      : path === '/api/spaces/' + next.id
        ? { status: 200, body: next }
        : path === '/api/spaces/' + next.id + '/projects'
          ? { status: 200, body: projectPage([]) }
          : undefined,
  );
  await page.goto('/spaces/' + SPACE.id);
  const details = page.locator('app-space-details');
  await expect(details.getByRole('link', { name: PROJECT.name })).toBeVisible();
  let release!: () => void;
  const barrier = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/api/spaces/' + SPACE.id, async (route) => {
    await barrier;
    await route.fulfill({ json: SPACE });
  });
  await details.getByRole('button', { name: 'Refresh space' }).click();
  await expect(details.getByRole('status')).toContainText('Loading space');
  const toggle = page.getByRole('button', { name: 'Show spaces', exact: true });
  if (await toggle.isVisible()) await toggle.click();
  await page
    .getByRole('navigation', { name: 'Spaces', exact: true })
    .getByRole('link', { name: next.name, exact: true })
    .click();
  await expect(details.getByRole('heading', { name: next.name, exact: true })).toBeVisible();
  release();
  await expect(details.getByText(PROJECT.name, { exact: true })).toHaveCount(0);
  const other = await page.context().newPage();
  await other.goto('/config.js');
  await other.evaluate(() => localStorage.setItem('accessToken', 'new-account-token'));
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('app-space-details')).toHaveCount(0);
  await other.close();
});
