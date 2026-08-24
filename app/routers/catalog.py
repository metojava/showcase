from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import NotFoundError
from app.models import Category, Product, Supplier
from app.serializers import CategoryOut, SupplierOut

router = APIRouter(tags=["catalog"])


@router.get("/categories", summary="List categories with product counts")
def list_categories(db: Session = Depends(get_db)):
    counts = (
        select(Product.category_id, func.count().label("cnt"))
        .group_by(Product.category_id)
        .subquery()
    )
    rows = db.execute(
        select(Category, func.coalesce(counts.c.cnt, 0))
        .join(counts, Category.category_id == counts.c.category_id, isouter=True)
        .order_by(Category.category_name)
    ).all()
    items = []
    for category, count in rows:
        out = CategoryOut().dump(category)
        out["product_count"] = count
        items.append(out)
    return {"items": items}


@router.get("/categories/{category_id}", summary="Get one category")
def get_category(category_id: int, db: Session = Depends(get_db)):
    category = db.get(Category, category_id)
    if category is None:
        raise NotFoundError("Category", category_id)
    count = db.scalar(
        select(func.count()).select_from(Product).where(Product.category_id == category_id)
    )
    out = CategoryOut().dump(category)
    out["product_count"] = count or 0
    return out


@router.get("/suppliers", summary="List suppliers")
def list_suppliers(
    country: str | None = Query(default=None, max_length=15),
    db: Session = Depends(get_db),
):
    filters = []
    if country:
        filters.append(func.lower(Supplier.country) == country.lower())
    rows = db.scalars(
        select(Supplier).where(*filters).order_by(Supplier.company_name)
    ).all()
    return {"total": len(rows), "items": SupplierOut().dump(rows, many=True)}


@router.get("/suppliers/{supplier_id}", summary="Get one supplier")
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = db.get(Supplier, supplier_id)
    if supplier is None:
        raise NotFoundError("Supplier", supplier_id)
    return SupplierOut().dump(supplier)
