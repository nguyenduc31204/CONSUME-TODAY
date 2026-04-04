# PHASE 9b: Circles — Social Memory Sharing

## Tổng quan

Phase 9b hoàn thành tính năng **Circles** — nhóm kỷ niệm chia sẻ với bạn bè và gia đình. Backend entities + repository đã tồn tại từ Phase 7. Phase này bổ sung: **use cases → API routes → frontend pages + components**.

---

## 9b.1 Backend — Use Cases

### Cấu trúc file

```
src/application/use_cases/
├── circles/
│   ├── create_circle.py       # POST — tạo Circle mới
│   ├── list_circles.py       # GET — danh sách Circle của user
│   ├── get_circle.py         # GET /:id — chi tiết Circle
│   ├── update_circle.py      # PATCH /:id — sửa Circle (owner only)
│   ├── delete_circle.py      # DELETE /:id — xóa Circle (owner only)
│   ├── invite_member.py      # POST /:id/invite — mời thành viên
│   ├── remove_member.py      # DELETE /:id/members/:userId — xóa thành viên
│   ├── leave_circle.py       # POST /:id/leave — rời nhóm
│   ├── list_members.py       # GET /:id/members — danh sách thành viên
│   ├── create_post.py        # POST /:id/posts — tạo bài viết trong Circle
│   ├── list_posts.py         # GET /:id/posts — feed Circle
│   ├── delete_post.py        # DELETE /:id/posts/:postId — xóa bài viết
│   ├── add_comment.py        # POST /:id/posts/:postId/comments — bình luận
│   ├── list_comments.py      # GET /:id/posts/:postId/comments
│   ├── delete_comment.py     # DELETE /:id/comments/:commentId
│   ├── toggle_like.py        # POST /:id/posts/:postId/like
│   └── generate_link.py      # POST /:id/link — tạo shared link (link_shared visibility)
```

### DTOs

**Request DTOs** (`src/application/dtos/request/circle_dto.py`):
```python
class CreateCircleRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    visibility: str = Field(default="members_only")  # "members_only" | "link_shared"
    circle_type: str = Field(default="private")       # "private" | "family" | "friends"
    max_members: int = Field(default=10, ge=2, le=50)
    cover_image_url: str | None = None

class UpdateCircleRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    visibility: str | None = None
    cover_image_url: str | None = None

class CreatePostRequest(BaseModel):
    image_url: str
    caption: str | None = Field(default=None, max_length=500)
    ocr_data: dict | None = None
    is_visible_link: bool = False

class CreateCommentRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)
```

**Response DTOs** (`src/application/dtos/response/circle_dto.py`):
```python
class MemberItem(BaseModel):
    user_id: str
    name: str
    avatar_url: str | None
    role: str  # "owner" | "member"
    joined_at: datetime

    model_config = {"from_attributes": True}

class CircleItem(BaseModel):
    id: str
    name: str
    description: str | None
    cover_image_url: str | None
    owner_id: str
    visibility: str
    circle_type: str
    max_members: int
    member_count: int
    post_count: int
    is_member: bool
    my_role: str | None  # "owner" | "member" | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class CircleListResponse(BaseModel):
    items: list[CircleItem]
    total: int

class CircleDetailResponse(BaseModel):
    circle: CircleItem
    members: list[MemberItem]

class PostItem(BaseModel):
    id: str
    circle_id: str
    author_id: str
    author_name: str
    author_avatar: str | None
    image_url: str
    thumbnail_url: str | None
    caption: str | None
    like_count: int
    comment_count: int
    is_liked: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class PostListResponse(BaseModel):
    items: list[PostItem]
    total: int
    has_more: bool

class CommentItem(BaseModel):
    id: str
    post_id: str
    author_id: str
    author_name: str
    author_avatar: str | None
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

### API Endpoints Summary

```
POST   /api/v1/circles                        Tạo Circle mới
GET    /api/v1/circles                        Danh sách Circle của tôi
GET    /api/v1/circles/:id                    Chi tiết Circle
PATCH  /api/v1/circles/:id                   Sửa Circle (owner)
DELETE /api/v1/circles/:id                   Xóa Circle (owner)
POST   /api/v1/circles/:id/invite            Tạo invite link (owner)
DELETE /api/v1/circles/:id/members/:userId   Xóa thành viên (owner)
POST   /api/v1/circles/:id/leave             Rời nhóm
GET    /api/v1/circles/:id/members           Danh sách thành viên
POST   /api/v1/circles/:id/join/:code        Tham gia qua invite code
GET    /api/v1/circles/:id/posts             Feed bài viết
POST   /api/v1/circles/:id/posts             Tạo bài viết
DELETE /api/v1/circles/:id/posts/:postId     Xóa bài viết (author/owner)
POST   /api/v1/circles/:id/posts/:postId/like   Toggle like
GET    /api/v1/circles/:id/posts/:postId/comments
POST   /api/v1/circles/:id/posts/:postId/comments
DELETE /api/v1/circles/:id/comments/:commentId
GET    /api/v1/circles/link/:shareCode       Xem Circle qua shared link
```

---

## 9b.2 Backend — Routes

**File**: `src/infrastructure/adapters/driving/routes/circles.py`

- All routes require JWT Bearer auth
- Owner-only endpoints: update, delete, remove_member, invite, update_post
- Member check middleware: user must be member to access circle content
- Link-shared circles: anyone with link can view posts (no auth required for feed)

### Key route patterns

```python
@router.post("/circles", response_model=dict, status_code=201)
async def create_circle(...): ...

@router.get("/circles", response_model=dict)
async def list_circles(...): ...

@router.get("/circles/{circle_id}", response_model=dict)
async def get_circle(circle_id: UUID, ...): ...

@router.post("/circles/{circle_id}/posts", response_model=dict, status_code=201)
async def create_post(circle_id: UUID, ...): ...

@router.get("/circles/{circle_id}/posts", response_model=dict)
async def list_posts(
    circle_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    ...): ...

@router.post("/circles/{circle_id}/posts/{post_id}/like", response_model=dict)
async def toggle_like(...): ...
```

---

## 9b.3 Frontend — Pages & Components

### Navigation

- Bottom nav thêm tab **Circles** (thay thế hoặc thêm icon Group)
- Hoặc: tab **Cá nhân** → sub-link "Nhóm kỷ niệm"

### Route: `/circles`

```
/circles                      Danh sách Circle của tôi
/circles/create               Tạo Circle mới
/circles/:id                  Chi tiết Circle + feed
/circles/:id/members          Danh sách thành viên
/circles/:id/settings         Cài đặt Circle (owner)
/circles/:id/posts/:postId    Chi tiết bài viết + comments
/circles/shared/:code         Xem Circle qua shared link
```

### Component Tree

```
pages/
└── CirclesPage.tsx            Layout + list view
pages/
└── CircleDetailPage.tsx       Feed + members + settings tabs

components/circles/
├── CircleCard.tsx              Card trong danh sách
├── CreateCircleSheet.tsx       Modal tạo Circle
├── CircleHeader.tsx            Avatar + name + member count
├── CircleTabs.tsx              Feed | Thành viên | Cài đặt
├── PostGrid.tsx               Grid 2-column feed
├── PostCard.tsx                1 bài viết (author avatar, image, caption, like/comment counts)
├── PostDetailSheet.tsx         Chi tiết bài viết + comments + like toggle
├── CommentItem.tsx             1 comment
├── CommentInput.tsx            Input bình luận
├── MemberList.tsx              Danh sách thành viên
├── MemberItem.tsx              1 thành viên
├── InviteSheet.tsx             Tạo/copy invite link (owner)
├── CircleSettings.tsx           Sửa tên, xóa, quản lý thành viên (owner)
└── ShareLinkBanner.tsx         Banner hiển thị khi xem qua shared link

api/
└── circles.ts                  API client + typed interfaces

hooks/
└── useCircles.ts              React Query hooks
```

### Key UI Screens

**CirclesPage** (list):
```
┌──────────────────────────────────────┐
│  👥 Nhóm kỷ niệm            [+ Tạo] │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │ 🖼️ Ảnh cover                  │  │
│  │ Gia đình Nguyễn               │  │
│  │ 👥 5 thành viên · 42 bài viết │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ 🖼️ Ảnh cover                  │  │
│  │ Bạn bè Sài Gòn                │  │
│  │ 👥 8 thành viên · 23 bài viết │  │
│  └────────────────────────────────┘  │
│                                      │
│  [+ Tạo nhóm] (nếu chưa có)        │
└──────────────────────────────────────┘
```

**CircleDetailPage** (feed + tabs):
```
┌──────────────────────────────────────┐
│  ◀  Gia đình Nguyễn      [•••]    │
│  👥 5 thành viên · 🔒 Riêng tư    │
├──────────────────────────────────────┤
│  [Feed] [Thành viên] [Cài đặt]    │
├──────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐  │
│  │ 📷 img      │ │ 📷 img       │  │
│  │ ❤️ 12 💬 3  │ │ ❤️ 5 💬 1    │  │
│  └──────────────┘ └──────────────┘  │
│  ┌──────────────────────────────┐   │
│  │ 📷 img (full width)          │   │
│  │ 👤 An · "Kỷ niệm Noel..."   │   │
│  │ ❤️ 23 💬 7   [Comment]      │   │
│  └──────────────────────────────┘   │
│                        [+ Đăng ảnh] │
└──────────────────────────────────────┘
```

**PostDetailSheet** (bottom sheet):
```
┌──────────────────────────────────────┐
│  An · 2 giờ trước           [✕]    │
├──────────────────────────────────────┤
│  📷 full-width image               │
│                                      │
│  An                                 │
│  Kỷ niệm Giáng Sinh 2025! 🎄       │
│                                      │
│  ❤️ 23 lượt thích                   │
├──────────────────────────────────────┤
│  [❤️ Thích]  [💬 7 bình luận]      │
├──────────────────────────────────────┤
│  👤 Bình: Chúc mừng gia đình! 🎁    │
│  👤 Minh: Đẹp quá!                  │
│  ────────────────────────────────── │
│  💬 Viết bình luận...          [Gửi] │
└──────────────────────────────────────┘
```

### Feature Gating

- **Free**: tối đa **3 Circle**, mỗi Circle tối đa **10 thành viên**
- Tạo Circle thứ 4+: hiển thị `PremiumUpsell`
- Kiểm tra tại `CreateCircleSheet` trước khi submit

---

## 9b.4 Files to Create

### Backend
```
src/application/dtos/request/circle_dto.py         Create/Update/Post/Comment DTOs
src/application/dtos/response/circle_dto.py        All response DTOs
src/application/use_cases/circles/                 16 use case files
src/infrastructure/adapters/driving/routes/circles.py
src/infrastructure/adapters/driving/main.py         (register router)
```

### Frontend
```
src/api/circles.ts                                  API client
src/hooks/useCircles.ts                             React Query hooks
src/pages/CirclesPage.tsx                           List + create
src/pages/CircleDetailPage.tsx                       Feed + tabs
src/components/circles/CircleCard.tsx
src/components/circles/CreateCircleSheet.tsx
src/components/circles/CircleHeader.tsx
src/components/circles/CircleTabs.tsx
src/components/circles/PostGrid.tsx
src/components/circles/PostCard.tsx
src/components/circles/PostDetailSheet.tsx
src/components/circles/CommentItem.tsx
src/components/circles/CommentInput.tsx
src/components/circles/MemberList.tsx
src/components/circles/MemberItem.tsx
src/components/circles/InviteSheet.tsx
src/components/circles/CircleSettings.tsx
src/components/circles/ShareLinkBanner.tsx
src/components/common/PremiumUpsell.tsx              (hoặc mở rộng nếu đã có)
```

---

## 9b.5 Key Business Rules

1. **Owner rights**: Chỉ owner mới sửa/xóa Circle, xóa thành viên, cập nhật ảnh bìa
2. **Member rights**: Thành viên đăng được ảnh, xóa bài của mình, bình luận, thích
3. **Link shared**: Ai có link đều xem được feed (không cần login); muốn tham gia → tạo account
4. **Leave**: Rời nhóm → ảnh vẫn ở lại, gắn tên người đóng góp
5. **Free limit**: 3 Circle, 10 members mỗi Circle
6. **Soft delete**: Circle + posts/comments dùng soft delete
7. **OCR data**: Post từ ảnh hóa đơn → lưu `ocr_data` để hiển thị thông tin chi tiêu
