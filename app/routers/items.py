from __future__ import annotations

from fastapi import APIRouter, Query, status
from fastapi.responses import JSONResponse, Response

from app.errors import NotFoundError
from app.schemas import Item, ItemCreate, ItemList, ItemUpdate
from app.store import store

router = APIRouter(prefix="/items", tags=["items"])


@router.post(
    "",
    response_model=Item,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new item",
)
async def create_item(payload: ItemCreate) -> Item:
    return store.create(payload)


@router.get("", response_model=ItemList, summary="List items with search and pagination")
async def list_items(
    q: str | None = Query(default=None, min_length=1, max_length=50, description="Search text"),
    tag: str | None = Query(default=None, description="Filter by tag"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> ItemList:
    items, total = store.list(q=q, tag=tag, limit=limit, offset=offset)
    return ItemList(total=total, items=items)


@router.get("/{item_id}", response_model=Item, summary="Get a single item")
async def get_item(item_id: int) -> Item:
    item = store.get(item_id)
    if item is None:
        raise NotFoundError("Item", item_id)
    return item


@router.put("/{item_id}", response_model=Item, summary="Replace an item entirely")
async def replace_item(item_id: int, payload: ItemCreate) -> Item:
    if store.get(item_id) is None:
        raise NotFoundError("Item", item_id)
    full_update = ItemUpdate(**payload.model_dump())
    return store.update(item_id, full_update)


@router.patch("/{item_id}", response_model=Item, summary="Partially update an item")
async def update_item(item_id: int, payload: ItemUpdate) -> Item:
    item = store.update(item_id, payload)
    if item is None:
        raise NotFoundError("Item", item_id)
    return item


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an item",
)
async def delete_item(item_id: int) -> Response:
    if not store.delete(item_id):
        raise NotFoundError("Item", item_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/health-check", include_in_schema=False)
async def router_health() -> JSONResponse:
    return JSONResponse(content={"router": "items", "ok": True})
