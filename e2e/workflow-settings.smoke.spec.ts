import { test, expect, Page } from '@playwright/test';
import { PROJECT, SPACE } from '../src/app/testing/space-fixtures';
import { boardPage } from '../src/app/testing/board-fixtures';
test('loading and empty workflow remain honest and recoverable', async ({ page }) => {
  await setup(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/workflow-stages', async (route) => {
    await gate;
    await route.fulfill({ json: [] });
  });
  await page.goto(`/projects/${PROJECT.id}/workflow`);
  const editor = page.locator('app-workflow-settings');
  await expect(editor.getByText('Loading workflow…')).toBeVisible();
  await expect(editor.locator('form')).toHaveCount(0);
  release();
  await expect(editor.getByText('No stages yet.')).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Create stage', exact: true })).toBeEnabled();
});
test('stage limit prevents creation but permits existing-stage editing', async ({ page }) => {
  await setup(page);
  const stages = Array.from({ length: 100 }, (_, i) => ({
    ...initial[0],
    id: `00000000-0000-4000-8000-${String(i + 100).padStart(12, '0')}`,
    name: `Stage ${i}`,
    position: i,
  }));
  await page.route('**/workflow-stages', (route) => route.fulfill({ json: stages }));
  await page.goto(`/projects/${PROJECT.id}/workflow`);
  const editor = page.locator('app-workflow-settings');
  await expect(editor.getByRole('button', { name: 'Create stage', exact: true })).toBeDisabled();
  await editor.getByRole('button', { name: 'Edit Stage 0', exact: true }).click();
  await expect(editor.getByRole('button', { name: 'Save stage', exact: true })).toBeEnabled();
});
const initial = [
  {
    id: '00000000-0000-4000-8000-000000000021',
    name: 'Queued',
    icon: null as string | null,
    position: 0,
    complete: false,
  },
  {
    id: '00000000-0000-4000-8000-000000000022',
    name: 'Released',
    icon: '✓',
    position: 1,
    complete: true,
  },
];
async function setup(page: Page, update = true) {
  let stages = initial.map((s) => ({ ...s }));
  let failure = 0,
    code = '',
    reads = 0;
  const writes: { method: string; body: any }[] = [];
  await page.addInitScript(() => localStorage.setItem('accessToken', 'workflow-browser'));
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname,
      method = req.method();
    if (path === '/api/users/me')
      return route.fulfill({ json: { id: 'user', name: 'Test User', email: 'user@example.test' } });
    if (path === '/api/spaces')
      return route.fulfill({ json: [{ id: SPACE.id, name: SPACE.name }] });
    if (path === `/api/spaces/${SPACE.id}`)
      return route.fulfill({
        json: { ...SPACE, capabilities: { ...SPACE.capabilities, canUpdate: update } },
      });
    if (path === `/api/projects/${PROJECT.id}`) return route.fulfill({ json: PROJECT });
    if (path.endsWith('/work-items'))
      return route.fulfill({
        json: { ...boardPage([]), groups: stages.map((stage) => ({ stage, items: [] })) },
      });
    if (path.includes('/workflow-stages')) {
      if (method === 'GET') {
        reads++;
        return route.fulfill({ json: stages });
      }
      const body = req.postData() ? req.postDataJSON() : null;
      writes.push({ method, body });
      if (failure)
        return route.fulfill({
          status: failure,
          json: { code, fieldErrors: failure === 400 ? { name: 'Name rejected' } : {} },
        });
      const id = path.split('/').pop();
      let stage = stages.find((s) => s.id === id);
      if (method === 'DELETE') stages = stages.filter((s) => s.id !== id);
      else {
        if (!stage)
          stage = {
            ...initial[0],
            id: '00000000-0000-4000-8000-000000000023',
            position: stages.length,
          };
        stages = stages.filter((s) => s.id !== stage!.id);
        stage = { ...stage, ...body };
        stages.splice(Math.min(stage!.position, stages.length), 0, stage!);
      }
      stages.forEach((s, i) => (s.position = i));
      return method === 'DELETE'
        ? route.fulfill({ status: 204 })
        : route.fulfill({ status: method === 'POST' ? 201 : 200, json: stage });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  return {
    writes,
    fail: (status: number, value = '') => {
      failure = status;
      code = value;
    },
    reads: () => reads,
  };
}
for (const theme of ['light', 'dark'])
  test(`workflow lifecycle and keyboard in ${theme}`, async ({ page }, info) => {
    const state = await setup(page);
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await page.goto(`/projects/${PROJECT.id}`);
    await page.getByRole('link', { name: 'Workflow settings', exact: true }).click();
    const editor = page.locator('app-workflow-settings');
    await editor.getByRole('button', { name: 'Create stage', exact: true }).click();
    await expect(editor.getByLabel('Name', { exact: true })).toBeFocused();
    await editor.getByLabel('Name', { exact: true }).fill('Waiting');
    await editor.getByLabel('Counts as complete').check();
    await editor.getByRole('button', { name: 'Create stage', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(editor.getByRole('button', { name: 'Edit Waiting', exact: true })).toBeVisible();
    expect(state.writes[0].body).toEqual({ name: 'Waiting', icon: '', complete: true });
    await editor.getByRole('button', { name: 'Edit Released', exact: true }).click();
    await expect(editor.getByLabel('Name', { exact: true })).toBeFocused();
    await editor.getByLabel('Name', { exact: true }).fill('Shipped');
    await editor.getByLabel('Icon', { exact: true }).fill('');
    await editor.getByLabel('Position', { exact: true }).fill('0');
    await expect(editor.getByLabel('Counts as complete')).toBeChecked();
    await editor.getByRole('button', { name: 'Save stage', exact: true }).click();
    expect(state.writes[1].body).toEqual({ name: 'Shipped', icon: '', position: 0 });
    await expect(editor.locator('.stage-list > li').first()).toContainText('Shipped');
    await page.reload();
    await expect(editor.locator('.stage-list > li').first()).toContainText('Complete');
    await page.screenshot({ path: info.outputPath(`workflow-${theme}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await editor.getByRole('button', { name: 'Delete Waiting', exact: true }).click();
    await expect(editor.getByRole('button', { name: 'Cancel deletion' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(editor.getByRole('button', { name: 'Delete Waiting', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await editor.getByRole('button', { name: 'Confirm deletion' }).click();
    await expect(editor.getByText('Stage deleted.', { exact: true })).toBeVisible();
    await expect(editor.getByRole('button', { name: 'Edit Waiting', exact: true })).toHaveCount(0);
    expect(state.reads()).toBeGreaterThanOrEqual(5);
  });
for (const code of ['STAGE_NOT_EMPTY', 'LAST_STAGE', 'STAGE_LIMIT'])
  test(`refreshes on ${code} and preserves draft`, async ({ page }) => {
    const state = await setup(page);
    await page.goto(`/projects/${PROJECT.id}/workflow`);
    const editor = page.locator('app-workflow-settings');
    await editor.getByLabel('Name', { exact: true }).fill('Keep this');
    state.fail(409, code);
    if (code === 'STAGE_LIMIT')
      await editor.getByRole('button', { name: 'Create stage', exact: true }).click();
    else {
      await editor.getByRole('button', { name: 'Delete Queued', exact: true }).click();
      await editor.getByRole('button', { name: 'Confirm deletion' }).click();
    }
    await expect(editor.getByRole('alert')).toContainText(
      code === 'STAGE_LIMIT' ? '100 stages' : code === 'LAST_STAGE' ? 'one stage' : 'tasks',
    );
    await expect(editor.getByLabel('Name', { exact: true })).toHaveValue('Keep this');
    expect(state.reads()).toBeGreaterThanOrEqual(2);
  });
test('read-only permissions hide all mutations', async ({ page }) => {
  const state = await setup(page, false);
  await page.goto(`/projects/${PROJECT.id}/workflow`);
  const editor = page.locator('app-workflow-settings');
  await expect(editor.getByText('Released', { exact: true })).toBeVisible();
  await expect(editor.locator('form')).toHaveCount(0);
  expect(state.writes).toEqual([]);
});
for (const status of [400, 401, 403, 404, 500])
  test(`handles mutation failure ${status}`, async ({ page }) => {
    const state = await setup(page);
    await page.goto(`/projects/${PROJECT.id}/workflow`);
    const editor = page.locator('app-workflow-settings');
    await editor.getByLabel('Name', { exact: true }).fill('Keep this');
    state.fail(status);
    await editor.getByRole('button', { name: 'Create stage', exact: true }).click();
    if (status === 401) {
      await expect(page).toHaveURL('/login');
      return;
    }
    await expect(editor.getByRole('alert').first()).toBeVisible();
    if (status === 404) {
      await expect(editor.locator('form')).toHaveCount(0);
      return;
    }
    await expect(editor.getByLabel('Name', { exact: true })).toHaveValue('Keep this');
    if (status === 403)
      await expect(
        editor.getByRole('button', { name: 'Create stage', exact: true }),
      ).toBeDisabled();
    state.fail(0);
    await editor.getByRole('button', { name: 'Refresh workflow' }).click();
    await expect(editor.getByRole('button', { name: 'Create stage', exact: true })).toBeEnabled();
  });
