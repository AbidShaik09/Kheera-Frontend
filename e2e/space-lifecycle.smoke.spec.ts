import { test, expect, Page } from '@playwright/test';
import { SPACE, projectPage } from '../src/app/testing/space-fixtures';
async function setup(
  page: Page,
  options: { update?: boolean; remove?: boolean; failure?: number; empty?: boolean } = {},
) {
  let space = {
    ...SPACE,
    capabilities: {
      ...SPACE.capabilities,
      canUpdate: options.update ?? true,
      canDelete: options.remove ?? true,
    },
  };
  let exists = !options.empty;
  let failure = options.failure ?? 0;
  const writes: { method: string; body: unknown }[] = [];
  await page.addInitScript(() => localStorage.setItem('accessToken', 'lifecycle-browser'));
  await page.route('**/api/**', async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname,
      method = request.method();
    if (path === '/api/users/me')
      return route.fulfill({ json: { id: 'user', name: 'Test User', email: 'test@example.test' } });
    expect(request.headers()['authorization']).toBe('Bearer lifecycle-browser');
    if (method !== 'GET') {
      writes.push({ method, body: request.postData() ? request.postDataJSON() : null });
      if (failure)
        return route.fulfill({
          status: failure,
          json: { fieldErrors: failure === 400 ? { name: 'This name is unavailable.' } : {} },
        });
      if (method === 'DELETE') {
        exists = false;
        return route.fulfill({ status: 204 });
      }
      space = { ...space, ...request.postDataJSON() };
      exists = true;
      return route.fulfill({ status: method === 'POST' ? 201 : 200, json: space });
    }
    if (path === '/api/spaces')
      return route.fulfill({ json: exists ? [{ id: space.id, name: space.name }] : [] });
    if (!exists) return route.fulfill({ status: 404, json: {} });
    if (path.endsWith('/projects')) return route.fulfill({ json: projectPage([]) });
    if (path === '/api/spaces/' + SPACE.id) return route.fulfill({ json: space });
    return route.fulfill({ status: 404, json: {} });
  });
  return { writes, recover: () => (failure = 0) };
}
for (const theme of ['light', 'dark']) {
  test(`create, edit, confirm and delete a space in ${theme}`, async ({ page }, info) => {
    const state = await setup(page, { empty: true });
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await page.goto('/dashboard');
    const toggle = page.getByRole('button', { name: 'Show spaces' });
    if (await toggle.isVisible()) await toggle.click();
    await page.getByRole('link', { name: '+ Create space', exact: true }).click();
    const editor = page.locator('app-space-editor');
    await editor.getByRole('button', { name: 'Create space', exact: true }).click();
    await expect(editor.getByLabel('Name', { exact: true })).toBeFocused();
    await editor.getByLabel('Name', { exact: true }).fill('  New workspace  ');
    await editor.getByRole('button', { name: 'Create space', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/spaces/' + SPACE.id);
    expect(state.writes[0]).toEqual({ method: 'POST', body: { name: 'New workspace' } });
    await expect(page.getByRole('heading', { name: 'New workspace', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Space settings', exact: true }).click();
    await expect(editor.getByLabel('Name', { exact: true })).toHaveValue('New workspace');
    await editor.getByLabel('Description (optional)').fill('A shared home');
    await editor.getByRole('button', { name: 'Save changes' }).click();
    await expect(editor.getByRole('status')).toHaveText('Space saved.');
    expect(state.writes[1]).toEqual({ method: 'PATCH', body: { description: 'A shared home' } });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath('settings-' + theme + '.png'), fullPage: true });
    await editor.getByLabel('Description (optional)').fill('');
    await editor.getByRole('button', { name: 'Save changes' }).click();
    await expect(editor.getByRole('status')).toHaveText('Space saved.');
    expect(state.writes[2]).toEqual({ method: 'PATCH', body: { description: null } });
    await editor.getByRole('button', { name: 'Delete space', exact: true }).click();
    await expect(editor.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(editor.getByRole('button', { name: 'Delete space', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(editor.getByRole('group', { name: 'Confirm space deletion' })).toContainText(
      SPACE.id,
    );
    await expect(editor.getByRole('group', { name: 'Confirm space deletion' })).toContainText(
      'projects and tasks',
    );
    await editor.getByRole('button', { name: 'Confirm deletion' }).click();
    await expect(page).toHaveURL('/dashboard');
    expect(state.writes[3].method).toBe('DELETE');
    if (await toggle.isVisible()) await toggle.click();
    await expect(page.getByText('No spaces yet', { exact: true })).toBeVisible();
  });
}
for (const status of [400, 403, 404, 500]) {
  test(`edit ${status} preserves drafts or clears unavailable space`, async ({ page }) => {
    const state = await setup(page, { failure: status });
    await page.goto('/spaces/' + SPACE.id + '/settings');
    const editor = page.locator('app-space-editor');
    await editor.getByLabel('Name', { exact: true }).fill('Draft name');
    await editor.getByRole('button', { name: 'Save changes' }).click();
    await expect(editor.getByRole('alert')).toBeVisible();
    if (status === 404) {
      await expect(editor.getByLabel('Name', { exact: true })).toHaveCount(0);
      return;
    }
    await expect(editor.getByLabel('Name', { exact: true })).toHaveValue('Draft name');
    if (status === 400) await expect(editor.getByText('This name is unavailable.')).toBeVisible();
    if (status === 403)
      await expect(editor.getByRole('button', { name: 'Save changes' })).toHaveCount(0);
    state.recover();
    if (status === 403) await editor.getByRole('button', { name: 'Refresh permissions' }).click();
    await editor.getByRole('button', { name: 'Save changes' }).click();
    await expect(editor.getByRole('status')).toHaveText('Space saved.');
  });
}
test('delete failure keeps identity and supports retry', async ({ page }) => {
  const state = await setup(page, { failure: 500 });
  await page.goto('/spaces/' + SPACE.id + '/settings');
  const editor = page.locator('app-space-editor');
  await editor.getByRole('button', { name: 'Delete space', exact: true }).click();
  await editor.getByRole('button', { name: 'Confirm deletion' }).click();
  await expect(editor.getByRole('alert')).toBeVisible();
  await expect(editor.getByRole('group', { name: 'Confirm space deletion' })).toContainText(
    SPACE.name,
  );
  state.recover();
  await editor.getByRole('button', { name: 'Confirm deletion' }).click();
  await expect(page).toHaveURL('/dashboard');
});
test('separates delete permission from update and redirects current 401', async ({ page }) => {
  await setup(page, { update: false, remove: true, failure: 401 });
  await page.goto('/spaces/' + SPACE.id + '/settings');
  const editor = page.locator('app-space-editor');
  await expect(editor.getByLabel('Name', { exact: true })).toBeDisabled();
  await expect(editor.getByRole('button', { name: 'Save changes' })).toHaveCount(0);
  await editor.getByRole('button', { name: 'Delete space', exact: true }).click();
  await editor.getByRole('button', { name: 'Confirm deletion' }).click();
  await expect(page).toHaveURL('/login');
});

test('read failure retries and read-only capabilities hide mutation controls', async ({ page }) => {
  await setup(page, { update: false, remove: false });
  let failing = true;
  await page.route('**/api/spaces/' + SPACE.id, (route) =>
    failing ? route.fulfill({ status: 503, json: {} }) : route.fallback(),
  );
  await page.goto('/spaces/' + SPACE.id + '/settings');
  const editor = page.locator('app-space-editor');
  await expect(editor.getByRole('alert')).toBeVisible();
  await expect(editor.getByLabel('Name', { exact: true })).toHaveCount(0);
  failing = false;
  await editor.getByRole('button', { name: 'Refresh permissions' }).click();
  await expect(editor.getByLabel('Name', { exact: true })).toHaveValue(SPACE.name);
  await expect(editor.getByLabel('Name', { exact: true })).toBeDisabled();
  await expect(editor.getByRole('button', { name: 'Save changes' })).toHaveCount(0);
  await expect(editor.getByRole('button', { name: 'Delete space', exact: true })).toHaveCount(0);
});
test('create errors preserve input and invalid picture URLs never submit', async ({ page }) => {
  const state = await setup(page, { empty: true, failure: 400 });
  await page.goto('/spaces/new');
  const editor = page.locator('app-space-editor');
  await editor.getByLabel('Name', { exact: true }).fill('New space');
  await editor
    .getByLabel('Profile picture URL (optional)')
    .fill('https://user:password@example.test/image');
  await editor.getByRole('button', { name: 'Create space', exact: true }).click();
  expect(state.writes).toHaveLength(0);
  await expect(editor.getByLabel('Profile picture URL (optional)')).toBeFocused();
  await editor.getByLabel('Profile picture URL (optional)').fill('https://example.test/image');
  await editor.getByRole('button', { name: 'Create space', exact: true }).click();
  await expect(editor.getByText('This name is unavailable.')).toBeVisible();
  await expect(editor.getByLabel('Name', { exact: true })).toHaveValue('New space');
  state.recover();
  await editor.getByRole('button', { name: 'Create space', exact: true }).click();
  await expect(page).toHaveURL('/spaces/' + SPACE.id);
});

test('forbidden creation retains its draft and disables repeated requests', async ({ page }) => {
  const state = await setup(page, { empty: true, failure: 403 });
  await page.goto('/spaces/new');
  const editor = page.locator('app-space-editor');
  await editor.getByLabel('Name', { exact: true }).fill('Preserved draft');
  const create = editor.getByRole('button', { name: 'Create space', exact: true });
  await create.click();
  await expect(editor.getByRole('alert')).toContainText('You do not have permission');
  await expect(create).toBeDisabled();
  await expect(editor.getByLabel('Name', { exact: true })).toHaveValue('Preserved draft');
  expect(state.writes).toHaveLength(1);
});
