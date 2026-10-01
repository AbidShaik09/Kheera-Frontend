import { PROJECT } from './space-fixtures';
import { BoardPage, BoardTask } from '../services/project-board-service';
export const STAGES = [
  {
    id: '00000000-0000-4000-8000-000000000031',
    name: 'Ready',
    icon: null,
    position: 0,
    complete: false,
  },
  {
    id: '00000000-0000-4000-8000-000000000032',
    name: 'Shipped',
    icon: '✓',
    position: 1,
    complete: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000033',
    name: 'Waiting',
    icon: null,
    position: 2,
    complete: false,
  },
];
export const task = (i = 0, stage = STAGES[0]): BoardTask => ({
  id: `00000000-0000-4000-8000-${String(i + 100).padStart(12, '0')}`,
  projectId: PROJECT.id,
  title: `Task ${i + 1}`,
  stageId: stage.id,
  stageName: stage.name,
  complete: stage.complete,
  position: i,
});
export const boardPage = (
  items: BoardTask[] = [task()],
  page = 0,
  total = items.length,
): BoardPage => ({
  items,
  page,
  size: 25,
  totalItems: total,
  totalPages: Math.ceil(total / 25),
  groups: STAGES.map((stage) => ({ stage, items: items.filter((t) => t.stageId === stage.id) })),
});
