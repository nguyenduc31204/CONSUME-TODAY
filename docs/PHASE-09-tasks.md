# Phase 9: Todo/Task — Personal Task Management

## Mục tiêu
Danh sách công việc cá nhân gắn ngày/ảnh. Mỗi task có thể gắn một kỷ niệm liên quan.

## 9.1 Database Schema

```sql
CREATE TABLE tasks (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id),
    title                   VARCHAR(255) NOT NULL,
    description             TEXT,
    due_date                DATE,
    priority                VARCHAR(20) NOT NULL DEFAULT 'medium',
    -- 'low' | 'medium' | 'high' | 'urgent'
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending' | 'in_progress' | 'completed' | 'cancelled'
    related_transaction_id  UUID REFERENCES transactions(id),
    related_circle_post_id  UUID REFERENCES circle_posts(id),
    reminder_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at            TIMESTAMPTZ,
    deleted_at              TIMESTAMPTZ
);

CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_due_date ON tasks(user_id, due_date);
```

## 9.2 Domain Entity: Task

```python
class Task(BaseEntity):
    STATUS_PENDING = "pending"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"
    PRIORITY_LOW = "low"
    PRIORITY_MEDIUM = "medium"
    PRIORITY_HIGH = "high"
    PRIORITY_URGENT = "urgent"

    def __init__(self, *, user_id, title, description=None, due_date=None,
                 priority="medium", status="pending", related_transaction_id=None,
                 related_circle_post_id=None, reminder_at=None, ...):
        ...

    def complete(self) -> None:
        self.status = self.STATUS_COMPLETED
        self.completed_at = datetime.utcnow()
        self.touch()

    def uncomplete(self) -> None:
        self.status = self.STATUS_PENDING
        self.completed_at = None
        self.touch()

    def update_status(self, status: str) -> None:
        self.status = status
        self.touch()
```

## 9.3 Repository Interface

```python
# src/domain/repositories/task_repository.py
class TaskRepository(ABC):
    async def save(self, task: Task) -> Task: ...
    async def get_by_id(self, task_id: UUID) -> Task | None: ...
    async def list_by_user(self, user_id: UUID, *, status=None, due_date=None,
                           skip=0, limit=50) -> tuple[list[Task], int]: ...
    async def update(self, task: Task) -> Task: ...
    async def soft_delete(self, task_id: UUID) -> None: ...
```

## 9.4 Use Cases

1. `CreateTaskUseCase` — tạo task mới
2. `ListTasksUseCase` — danh sách task (filter: status, due_date)
3. `UpdateTaskUseCase` — update task (chỉ owner)
4. `CompleteTaskUseCase` — đánh dấu hoàn thành
5. `DeleteTaskUseCase` — soft delete

## 9.5 API Endpoints

```
POST   /api/v1/tasks                          # Tạo task
GET    /api/v1/tasks                          # Danh sách (filter: status, due_date)
GET    /api/v1/tasks/:id                      # Chi tiết
PATCH  /api/v1/tasks/:id                      # Update task
PATCH  /api/v1/tasks/:id/complete             # Đánh dấu hoàn thành
DELETE /api/v1/tasks/:id                      # Soft delete
```

## 9.6 Frontend UI Design

```
┌──────────────────────────────────────┐
│  📋 Nhiệm vụ              [+ Thêm]  │
├──────────────────────────────────────┤
│  Hôm nay — 4 nhiệm vụ               │
│  ┌──────────────────────────────┐   │
│  │ ☐ Mua quà sinh nhật mẹ      │   │
│  │   📅 04/04/2026 · 🔴 Cao     │   │
│  │   💳 💰 150.000đ             │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ ☑ Gửi báo cáo tuần          │   │
│  │   ✅ Hoàn thành 02/04        │   │
│  └──────────────────────────────┘   │
│  Sắp tới — 2 nhiệm vụ              │
│  ...                                │
└──────────────────────────────────────┘
```

## 9.7 Frontend Files

```
src/features/tasks/
├── api/
│   └── useTasks.ts                  # useTasks, useCreateTask, useCompleteTask
├── components/
│   ├── TaskCard.tsx                 # Card task với checkbox
│   ├── TaskCreateDialog.tsx         # Modal tạo task
│   ├── TaskDetailSheet.tsx          # Chi tiết + edit
│   └── TaskList.tsx                 # Grouped list (Hôm nay / Sắp tới / Hoàn thành)
└── pages/
    └── TasksPage.tsx
```

## 9.8 Navigation Update

- Tab **Nhìn lại** (Reports) → rename thành **Nhìn lại** (Reports + Tasks + Calendar)
- Sub-navigation: [Báo cáo] [Lịch] [Việc] — horizontal scroll tabs
- Reuse existing Reports tab cho "Báo cáo"

## 9.9 Verification

1. Tạo task mới → hiển thị trong danh sách
2. Đánh dấu hoàn thành → checkbox, strikethrough text
3. Filter theo status → chỉ hiển thị task đúng filter
4. Gắn transaction vào task → hiển thị transaction info trong card
5. Xem offline → cached tasks hiển thị
