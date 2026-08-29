from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel

from backend.core.dependencies import (
    db_manager,
    memory_store,
    current_user,
    admin_required
)
from backend.core.auth_helper import get_current_user_profile

router = APIRouter(tags=["Community & Forum"])

class CommunityCreateRequest(BaseModel):
    name: str
    description: str
    privacy_mode: str = "public"

class JoinRequestActionRequest(BaseModel):
    status: str

class ForumPostCreateRequest(BaseModel):
    title: str
    content: str
    category: str = "general"
    tags: Optional[str] = ""
    community_id: Optional[int] = None

class ForumPostUpdateRequest(BaseModel):
    title: str
    content: str
    category: Optional[str] = "general"
    tags: Optional[str] = ""

class CommentCreateRequest(BaseModel):
    content: str
    post_id: Optional[int] = None
    problem_code: Optional[str] = None
    parent_id: Optional[int] = None

class ForumReactionRequest(BaseModel):
    target_type: str
    target_id: int
    reaction_type: str = "up"

# ── COMMUNITIES & GROUPS ──────────────────────────────────────────────────
@router.get("/api/communities")
async def list_communities(user: Dict[str, Any] = Depends(current_user)):
    communities = memory_store.list_communities(
        viewer_user_id=user["id"],
        viewer_role=user.get("role", "user"),
    )
    return {"communities": communities}

@router.post("/api/communities")
async def create_community(req: CommunityCreateRequest, user: Dict[str, Any] = Depends(current_user)):
    try:
        community = memory_store.create_community(
            name=req.name.strip(),
            description=req.description.strip(),
            privacy_mode=req.privacy_mode,
            created_by=user["id"],
        )
        return {"success": True, "community": community}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/api/communities/{community_id}")
async def get_community(community_id: int, user: Dict[str, Any] = Depends(current_user)):
    community = memory_store.get_community(community_id)
    if not community:
        raise HTTPException(status_code=404, detail="Community không tồn tại.")
    role = user.get("role", "user")
    if community["privacy_mode"] == "private" and role not in memory_store.PRIVILEGED_ROLES:
        with db_manager.get_connection() as conn:
            is_member = conn.execute(
                "SELECT 1 FROM community_members WHERE community_id = ? AND user_id = ?",
                (community_id, user["id"]),
            ).fetchone()
        if not is_member:
            raise HTTPException(status_code=403, detail="Community riêng tư. Bạn cần tham gia trước.")
    return {"community": community}

@router.post("/api/communities/{community_id}/join")
async def join_community(community_id: int, user: Dict[str, Any] = Depends(current_user)):
    try:
        result = memory_store.join_community(community_id=community_id, user_id=user["id"])
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/api/communities/{community_id}/members")
async def list_community_members(community_id: int, user: Dict[str, Any] = Depends(current_user)):
    try:
        members = memory_store.list_community_members(
            community_id=community_id,
            viewer_user_id=user["id"],
            viewer_role=user.get("role", "user"),
        )
        return {"members": members}
    except (PermissionError, ValueError) as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.get("/api/communities/{community_id}/requests")
async def list_join_requests(community_id: int, user: Dict[str, Any] = Depends(current_user)):
    try:
        requests = memory_store.list_join_requests(
            community_id=community_id,
            reviewer_user_id=user["id"],
            reviewer_role=user.get("role", "user"),
        )
        return {"requests": requests}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.post("/api/communities/requests/{request_id}/process")
async def process_join_request(request_id: int, req: JoinRequestActionRequest, user: Dict[str, Any] = Depends(current_user)):
    try:
        memory_store.process_join_request(
            request_id=request_id,
            status=req.status,
            reviewer_user_id=user["id"],
            reviewer_role=user.get("role", "user"),
        )
        return {"success": True, "status": req.status}
    except (PermissionError, ValueError) as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.delete("/api/communities/{community_id}")
async def delete_community(community_id: int, user: Dict[str, Any] = Depends(current_user)):
    try:
        memory_store.delete_community(
            community_id=community_id,
            requester_user_id=user["id"],
            requester_role=user.get("role", "user"),
        )
        return {"success": True}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

# ── FORUM POSTS & DISCUSSIONS ─────────────────────────────────────────────
@router.get("/api/forum/posts")
async def list_forum_posts_api(
    category: Optional[str] = None,
    q: Optional[str] = None,
    community_id: Optional[int] = None,
    page: int = 1,
    limit: int = 20
):
    return memory_store.list_forum_posts(
        category=category,
        q=q,
        community_id=community_id,
        page=max(1, page),
        limit=min(100, max(1, limit))
    )

@router.post("/api/forum/posts")
async def create_forum_post_api(req: ForumPostCreateRequest, user: Dict[str, Any] = Depends(current_user)):
    if not req.title.strip() or not req.content.strip():
        raise HTTPException(status_code=400, detail="Tiêu đề và nội dung bài viết không được để trống.")
    post = memory_store.create_forum_post(
        title=req.title,
        content=req.content,
        author_id=user["id"],
        category=req.category,
        tags=req.tags or "",
        community_id=req.community_id
    )
    return {"success": True, "post": post}

@router.get("/api/forum/posts/{post_id}")
async def get_forum_post_api(post_id: int, request: Request):
    user_id = None
    try:
        u = await get_current_user_profile(request)
        if u:
            user_id = u.get("id")
    except Exception:
        pass
    post = memory_store.get_forum_post(post_id, increment_view=True, viewer_user_id=user_id)
    if not post:
        raise HTTPException(status_code=404, detail="Bài viết không tồn tại.")
    return {"post": post}

@router.put("/api/forum/posts/{post_id}")
async def update_forum_post_api(post_id: int, req: ForumPostUpdateRequest, user: Dict[str, Any] = Depends(current_user)):
    try:
        updated = memory_store.update_forum_post(
            post_id=post_id,
            requester_user_id=user["id"],
            user_role=user.get("role", "user"),
            title=req.title,
            content=req.content,
            category=req.category,
            tags=req.tags
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Bài viết không tồn tại.")
        return {"success": True, "id": post_id}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.delete("/api/forum/posts/{post_id}")
async def delete_forum_post_api(post_id: int, user: Dict[str, Any] = Depends(current_user)):
    try:
        deleted = memory_store.delete_forum_post(
            post_id=post_id,
            requester_user_id=user["id"],
            user_role=user.get("role", "user")
        )
        if not deleted:
            raise HTTPException(status_code=404, detail="Bài viết không tồn tại.")
        return {"success": True, "id": post_id}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.post("/api/forum/posts/{post_id}/pin")
async def toggle_pin_post_api(post_id: int, user: Dict[str, Any] = Depends(admin_required)):
    memory_store.toggle_post_pin(post_id)
    return {"success": True}

@router.post("/api/forum/posts/{post_id}/lock")
async def toggle_lock_post_api(post_id: int, user: Dict[str, Any] = Depends(admin_required)):
    memory_store.toggle_post_lock(post_id)
    return {"success": True}

@router.get("/api/forum/posts/{post_id}/comments")
async def list_post_comments_api(post_id: int, request: Request):
    user_id = None
    try:
        u = await get_current_user_profile(request)
        if u:
            user_id = u.get("id")
    except Exception:
        pass
    comments = memory_store.list_post_comments(post_id, viewer_user_id=user_id)
    return {"comments": comments}

@router.post("/api/forum/posts/{post_id}/comments")
async def add_post_comment_api(post_id: int, req: CommentCreateRequest, user: Dict[str, Any] = Depends(current_user)):
    try:
        comment = memory_store.create_comment(
            author_id=user["id"],
            content=req.content,
            post_id=post_id,
            parent_id=req.parent_id
        )
        return {"success": True, "comment": comment}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/api/forum/comments/{comment_id}")
async def delete_comment_api(comment_id: int, user: Dict[str, Any] = Depends(current_user)):
    try:
        deleted = memory_store.delete_comment(
            comment_id=comment_id,
            requester_user_id=user["id"],
            user_role=user.get("role", "user")
        )
        if not deleted:
            raise HTTPException(status_code=404, detail="Bình luận không tồn tại.")
        return {"success": True, "id": comment_id}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.post("/api/forum/react")
async def forum_reaction_api(req: ForumReactionRequest, user: Dict[str, Any] = Depends(current_user)):
    try:
        res = memory_store.toggle_reaction(
            user_id=user["id"],
            target_type=req.target_type,
            target_id=req.target_id,
            reaction_type=req.reaction_type
        )
        return {"success": True, **res}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
