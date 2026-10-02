import { test, expect, Page } from '@playwright/test';
import { PROJECT, SPACE } from '../src/app/testing/space-fixtures';
import { STAGES, task, boardPage } from '../src/app/testing/board-fixtures';
async function setup(page: Page, writable = true, count = 27) {
  let tasks = Array.from({ length: count }, (_, i) => task(i));
  let failure = 0;
  const writes: unknown[] = [];
  await page.addInitScript(() => localStorage.setItem('accessToken', 'board-browser'));
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname;
    if (path === '/api/users/me')
      return route.fulfill({ json: { id: 'user', name: 'Test User', email: 'user@example.test' } });
    if (path === '/api/spaces')
      return route.fulfill({ json: [{ id: SPACE.id, name: SPACE.name }] });
    if (path === `/api/spaces/${SPACE.id}`)
      return route.fulfill({
        json: { ...SPACE, capabilities: { ...SPACE.capabilities, canUpdate: writable } },
      });
    if (path === `/api/projects/${PROJECT.id}`) return route.fulfill({ json: PROJECT });
    if (path.endsWith('/workflow-stages')) return route.fulfill({ json: STAGES });
    if (path.endsWith('/work-items')) {
      const page = Number(url.searchParams.get('page'));
      const ordered = STAGES.flatMap((s) => tasks.filter((t) => t.stageId === s.id));
      return route.fulfill({
        json: boardPage(ordered.slice(page * 25, page * 25 + 25), page, tasks.length),
      });
    }
    if (path.endsWith('/move')) {
      const body = req.postDataJSON();
      writes.push(body);
      if (failure) return route.fulfill({ status: failure, json: {} });
      const id = path.split('/').at(-2),
        target = STAGES.find((s) => s.id === body.stageId)!;
      const old = tasks.find((t) => t.id === id)!;
      tasks = tasks.filter((t) => t.id !== id);
      const moved = {
        ...old,
        stageId: target.id,
        stageName: target.name,
        complete: target.complete,
        position: tasks.filter((t) => t.stageId === target.id).length,
      };
      tasks.push(moved);
      return route.fulfill({ json: moved });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  return { writes, fail: (status: number) => (failure = status) };
}
for (const theme of ['light', 'dark'])
  test(`board pagination and keyboard moves in ${theme}`, async ({ page }, info) => {
    const state = await setup(page);
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await page.goto(`/projects/${PROJECT.id}`);
    const board = page.locator('app-project-board');
    await expect(board.getByText('27 tasks', { exact: true })).toBeVisible();
    await expect(board.locator('article')).toHaveCount(25);
    await expect(board.getByText('0 on this page')).toHaveCount(2);
    await board.getByRole('button', { name: 'Next page' }).focus();
    await page.keyboard.press('Enter');
    await expect(board.locator('article')).toHaveCount(2);
    await expect(board.getByRole('button', { name: 'Refresh project' })).toBeFocused();
    const card = board.locator('article').first();
    await card.getByLabel('Move Task 26 to').selectOption(STAGES[1].id);
    await card.getByRole('button', { name: 'Move task' }).focus();
    await page.keyboard.press('Enter');
    await expect(board.getByText('Task moved.', { exact: true })).toBeVisible();
    expect(state.writes[0]).toEqual({ stageId: STAGES[1].id });
    await board.getByRole('button', { name: 'Next page' }).click();
    const done = board.locator(`[data-stage="${STAGES[1].id}"]`);
    await expect(done.locator('article')).toContainText('Task 26');
    await expect(done.getByText('Complete', { exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(`board-${theme}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.reload();
    await expect(board.locator('article')).toHaveCount(25);
  });
test('drag moves append to custom columns and same-column keyboard moves append too', async ({
  page,
}) => {
  const state = await setup(page, true, 2);
  await page.goto(`/projects/${PROJECT.id}`);
  const board = page.locator('app-project-board');
  const card = board.locator('article').first();
  await card.getByRole('button', { name: 'Move task' }).click();
  await expect(board.getByText('Task moved.', { exact: true })).toBeVisible();
  expect(state.writes[0]).toEqual({ stageId: STAGES[0].id });
  await board
    .locator('article h4')
    .last()
    .dragTo(board.locator(`[data-stage="${STAGES[1].id}"] header`));
  await expect(board.locator(`[data-stage="${STAGES[1].id}"] article`)).toHaveCount(1);
  expect(state.writes[1]).toEqual({ stageId: STAGES[1].id });
});
for (const status of [400, 401, 403, 404, 500])
  test(`move failure ${status} is safe`, async ({ page }) => {
    const state = await setup(page, true, 2);
    await page.goto(`/projects/${PROJECT.id}`);
    const board = page.locator('app-project-board');
    await expect(board.locator('article')).toHaveCount(2);
    state.fail(status);
    await board.locator('article').first().getByRole('button', { name: 'Move task' }).click();
    if (status === 401) {
      await expect(page).toHaveURL('/login');
      return;
    }
    await expect(board.getByRole('alert')).toBeVisible();
    if (status === 404) await expect(board.locator('article')).toHaveCount(0);
    else {
      await expect(board.locator('article')).toHaveCount(2);
      if (status === 403)
        await expect(
          board.locator('article').first().getByRole('button', { name: 'Move task' }),
        ).toBeDisabled();
    }
  });
test('empty and read-only boards do not invent tasks or enable moves', async ({ page }) => {
  await setup(page, false, 0);
  await page.goto(`/projects/${PROJECT.id}`);
  const board = page.locator('app-project-board');
  await expect(board.getByText('No tasks yet.', { exact: true })).toBeVisible();
  await expect(board.locator('select')).toHaveCount(0);
  await expect(board.locator('.column')).toHaveCount(3);
});
