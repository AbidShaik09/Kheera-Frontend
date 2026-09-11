import { ComponentFixture, TestBed } from '@angular/core/testing';

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
      taskStatus: 'todo',
      taskId: 'TASK-1',
      title: 'Prepare login page',
      projectKey: 'KHEERA',
      issueNumber: 70,
      projectName: 'Kheera',
      clickable: true,
      updatedAt: new Date(),
    };
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
