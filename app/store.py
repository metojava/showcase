from __future__ import annotations

import itertools
import threading
from datetime import datetime, timezone

from app.schemas import Item, ItemCreate, ItemUpdate


class ItemStore:
    def __init__(self) -> None:
        self._items: dict[int, Item] = {}
        self._id_counter = itertools.count(1)
        self._lock = threading.Lock()

    def create(self, payload: ItemCreate) -> Item:
        item = Item(
            id=next(self._id_counter),
            created_at=datetime.now(timezone.utc),
            **payload.model_dump(),
        )
        with self._lock:
            self._items[item.id] = item
        return item

    def get(self, item_id: int) -> Item | None:
        return self._items.get(item_id)

    def list(
        self,
        q: str | None = None,
        tag: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Item], int]:
        items = list(self._items.values())
        if q:
            needle = q.lower()
            items = [
                i for i in items
                if needle in i.name.lower()
                or (i.description is not None and needle in i.description.lower())
            ]
        if tag:
            lowered = tag.lower()
            items = [i for i in items if lowered in (t.lower() for t in i.tags)]
        items.sort(key=lambda i: i.id)
        total = len(items)
        return items[offset : offset + limit], total

    def update(self, item_id: int, payload: ItemUpdate) -> Item | None:
        with self._lock:
            item = self._items.get(item_id)
            if item is None:
                return None
            updated = item.model_copy(update=payload.model_dump(exclude_unset=True))
            self._items[item_id] = updated
            return updated

    def delete(self, item_id: int) -> bool:
        with self._lock:
            return self._items.pop(item_id, None) is not None


store = ItemStore()
