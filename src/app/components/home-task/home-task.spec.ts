import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { HomeTaskComponent } from './home-task';

describe('HomeTask', () => {
  let component: HomeTaskComponent;
  let fixture: ComponentFixture<HomeTaskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeTaskComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeTaskComponent);
    component = fixture.componentInstance;
    component.task = {
      status: 'done',
      taskId: 'TASK-1',
      title: 'Prepare login page',
      projectKey: 'KHEERA',
      issueNumber: 70,
      projectName: 'Kheera',
      clickable: true,
      updatedAt: new Date(),
    };
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders task title, project metadata, status icon, and relative time', () => {
    expect(textContent()).toContain('TASK-1:');
    expect(textContent()).toContain('Prepare login page');
    expect(textContent()).toContain('KHEERA-70');
    expect(textContent()).toContain('Kheera');
    expect(textContent()).toContain('check_circle');
    expect(textContent()).toContain('second');
  });

  it('emits taskClick when the task is clicked', () => {
    const emit = vi.spyOn(component.taskClick, 'emit');

    taskElement().click();

    expect(emit).toHaveBeenCalledOnce();
  });

  it('emits taskClick when Enter is pressed on a clickable task', () => {
    const emit = vi.spyOn(component.taskClick, 'emit');
    const event = new KeyboardEvent('keydown', { key: 'Enter' });

    taskElement().dispatchEvent(event);

    expect(emit).toHaveBeenCalledOnce();
  });

  it('does not emit when the task is not clickable', () => {
    const emit = vi.spyOn(component.taskClick, 'emit');
    fixture.componentRef.setInput('task', {
      ...component.task,
      clickable: false,
    });
    fixture.detectChanges();

    taskElement().click();

    expect(emit).not.toHaveBeenCalled();
    expect(taskElement().getAttribute('role')).toBeNull();
    expect(taskElement().getAttribute('tabindex')).toBeNull();
  });

  it('maps status values to expected material icons', () => {
    fixture.componentRef.setInput('task', { ...component.task, status: 'blocked' });
    fixture.detectChanges();

    expect(textContent()).toContain('error');

    fixture.componentRef.setInput('task', { ...component.task, status: 'in-progress' });
    fixture.detectChanges();

    expect(textContent()).toContain('radio_button_checked');
  });

  function taskElement(): HTMLElement {
    return fixture.nativeElement.querySelector('.home-task') as HTMLElement;
  }

  function textContent(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});
