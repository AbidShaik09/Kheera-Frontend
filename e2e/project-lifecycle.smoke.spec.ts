import { test, expect, Page } from '@playwright/test';
import { SPACE, PROJECT, projectPage } from '../src/app/testing/space-fixtures';
async function setup(
  page: Page,
  options: { update?: boolean; remove?: boolean; exists?: boolean } = {},
) {
  let project = { ...PROJECT };
  let exists = options.exists ?? true;
  let failure = 0;
  const writes: { method: string; path: string; body: unknown }[] = [];
  await page.addInitScript(() => localStorage.setItem('accessToken', 'project-browser'));
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname,
      method = req.method();
    if (path === '/api/users/me')
      return route.fulfill({
        json: { id: 'test-user', name: 'Test User', email: 'user@example.test' },
      });
    if (method !== 'GET') {
      writes.push({ method, path, body: req.postData() ? req.postDataJSON() : null });
      if (failure)
        return route.fulfill({
          status: failure,
          json: { fieldErrors: failure === 400 ? { name: 'Name rejected' } : {} },
        });
      if (method === 'DELETE') {
        exists = false;
        return route.fulfill({ status: 204 });
      }
      project = { ...project, ...req.postDataJSON() };
      exists = true;
      return route.fulfill({ status: method === 'POST' ? 201 : 200, json: project });
    }
    if (path === '/api/spaces')
      return route.fulfill({ json: [{ id: SPACE.id, name: SPACE.name }] });
    if (path === `/api/spaces/${SPACE.id}`)
      return route.fulfill({
        json: {
          ...SPACE,
          capabilities: {
            ...SPACE.capabilities,
            canUpdate: options.update ?? true,
            canDelete: options.remove ?? true,
          },
        },
      });
    if (path.endsWith('/projects'))
      return route.fulfill({ json: projectPage(exists ? [project] : []) });
    if (path === `/api/projects/${PROJECT.id}`)
      return exists ? route.fulfill({ json: project }) : route.fulfill({ status: 404, json: {} });
    return route.fulfill({ status: 404, json: {} });
  });
  return { writes, fail: (status: number) => (failure = status) };
}
for (const theme of ['light', 'dark'])
  test(`project lifecycle and keyboard in ${theme}`, async ({ page }, info) => {
    const state = await setup(page, { exists: false });
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await page.goto(`/spaces/${SPACE.id}`);
    await page.getByRole('link', { name: 'Create project', exact: true }).click();
    const editor = page.locator('app-project-editor');
    await editor.getByRole('button', { name: 'Create project', exact: true }).click();
    await expect(editor.getByLabel('Name', { exact: true })).toBeFocused();
    await editor.getByLabel('Name', { exact: true }).fill('  New project  ');
    await editor.getByLabel('Sprint cycle days', { exact: true }).fill('14');
    await editor.getByRole('button', { name: 'Create project', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`/projects/${PROJECT.id}`);
    expect(state.writes[0]).toEqual({
      method: 'POST',
      path: `/api/spaces/${SPACE.id}/projects`,
      body: { name: 'New project', sprintCycleDays: 14 },
    });
    await page.getByRole('link', { name: 'Project settings', exact: true }).click();
    await expect(editor.getByText('8 open tasks · 45% complete')).toBeVisible();
    await editor.getByLabel('Description', { exact: false }).fill('Project description');
    await editor.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(editor.getByText('Project saved.', { exact: true })).toBeVisible();
    expect(state.writes[1].body).toEqual({ description: 'Project description' });
    await page.reload();
    await expect(editor.getByLabel('Description', { exact: false })).toHaveValue(
      'Project description',
    );
    await page.screenshot({ path: info.outputPath(`project-${theme}.png`), fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await editor.getByRole('button', { name: 'Delete project', exact: true }).click();
    await expect(editor.getByRole('button', { name: 'Cancel deletion' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(editor.getByRole('button', { name: 'Delete project', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await editor.getByRole('button', { name: 'Confirm deletion' }).click();
    await expect(page).toHaveURL(`/spaces/${SPACE.id}`);
    await expect(page.getByText('No projects yet', { exact: true })).toBeVisible();
  });
for (const status of [400, 403, 404, 500])
  test(`project write ${status} preserves draft or clears unavailable data`, async ({ page }) => {
    const state = await setup(page);
    state.fail(status);
    await page.goto(`/projects/${PROJECT.id}/settings`);
    const editor = page.locator('app-project-editor');
    await editor.getByLabel('Name', { exact: true }).fill('Draft name');
    await editor.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(editor.getByRole('alert').first()).toBeVisible();
    if (status === 404) {
      await expect(editor.getByLabel('Name', { exact: true })).toHaveCount(0);
      return;
    }
    await expect(editor.getByLabel('Name', { exact: true })).toHaveValue('Draft name');
    if (status === 403) {
      await expect(
        editor.getByRole('button', { name: 'Save changes', exact: true }),
      ).toBeDisabled();
    }
    state.fail(0);
    if (status === 403)
      await editor.getByRole('button', { name: 'Refresh project access' }).click();
    await editor.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(editor.getByText('Project saved.', { exact: true })).toBeVisible();
  });
test('read-only project settings cannot mutate and creation is permission-aware', async ({
  page,
}) => {
  await setup(page, { update: false, remove: false });
  await page.goto(`/spaces/${SPACE.id}`);
  await expect(page.getByRole('link', { name: 'Create project', exact: true })).toHaveCount(0);
  await page.goto(`/projects/${PROJECT.id}/settings`);
  const editor = page.locator('app-project-editor');
  await expect(editor.getByLabel('Name', { exact: true })).toBeDisabled();
  await expect(editor.getByRole('button', { name: 'Save changes', exact: true })).toHaveCount(0);
  await expect(editor.getByRole('button', { name: 'Delete project', exact: true })).toHaveCount(0);
});
test('expired session during project save removes private data', async ({ page }) => {
  const state = await setup(page);
  state.fail(401);
  await page.goto(`/projects/${PROJECT.id}/settings`);
  const editor = page.locator('app-project-editor');
  await editor.getByLabel('Name', { exact: true }).fill('Draft');
  await editor.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page).toHaveURL('/login');
});
