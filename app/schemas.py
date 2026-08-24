from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ItemBase(BaseModel):
    name: str = Field(min_length=1, max_length=100, examples=["Mechanical Keyboard"])
    description: str | None = Field(default=None, max_length=500)
    price: float = Field(gt=0, examples=[49.99])
    in_stock: bool = True
    tags: list[str] = Field(default_factory=list)


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    price: float | None = Field(default=None, gt=0)
    in_stock: bool | None = None
    tags: list[str] | None = None


class Item(ItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class ItemList(BaseModel):
    total: int
    items: list[Item]
