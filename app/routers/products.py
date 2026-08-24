from __future__ import annotations

from fastapi import APIRouter, Body, Depends, Path, Query, Response, status
from app.auth import require_admin
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import AppError, NotFoundError
from app.models import Category, OrderDetail, Product, Supplier
from app.serializers import (
    ProductCreateSchema,
    ProductDetailOut,
    ProductOut,
    ProductUpdateSchema,
    page,
    validate_body,
)

router = APIRouter(prefix="/products", tags=["products"])

SORTS = {
    "name": Product.product_name.asc(),
    "price_asc": Product.unit_price.asc(),
    "price_desc": Product.unit_price.desc(),
    "stock": Product.units_in_stock.desc(),
}


def _get_product(db: Session, product_id: int) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise NotFoundError("Product", product_id)
    return product


@router.get("", summary="List products (filters + sorting + pagination)")
def list_products(
    q: str | None = Query(default=None, min_length=1, max_length=50),
    category_id: int | None = None,
    supplier_id: int | None = None,
    discontinued: bool | None = None,
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    sort: str = Query(default="name", description=f"one of: {', '.join(SORTS)}"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    order_by = SORTS.get(sort)
    if order_by is None:
        raise AppError(
            f"Unknown sort '{sort}'. Valid options: {', '.join(SORTS)}",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    filters = []
    if q:
        filters.append(func.lower(Product.product_name).like(f"%{q.lower()}%"))
    if category_id is not None:
        filters.append(Product.category_id == category_id)
    if supplier_id is not None:
        filters.append(Product.supplier_id == supplier_id)
    if discontinued is not None:
        filters.append(Product.discontinued == ("1" if discontinued else "0"))
    if min_price is not None:
        filters.append(Product.unit_price >= min_price)
    if max_price is not None:
        filters.append(Product.unit_price <= max_price)

    total = db.scalar(select(func.count()).select_from(Product).where(*filters)) or 0
    rows = db.scalars(
        select(Product).where(*filters).order_by(order_by).limit(limit).offset(offset)
    ).all()
    return page(ProductOut().dump(rows, many=True), total, limit, offset)


@router.get("/{product_id}", summary="Get one product with category and supplier names")
def get_product(product_id: int, db: Session = Depends(get_db)):
    row = db.execute(
        select(Product, Category.category_name, Supplier.company_name)
        .join(Category, Product.category_id == Category.category_id, isouter=True)
        .join(Supplier, Product.supplier_id == Supplier.supplier_id, isouter=True)
        .where(Product.product_id == product_id)
    ).first()
    if row is None:
        raise NotFoundError("Product", product_id)
    product, category_name, supplier_name = row
    setattr(product, "category_name", category_name)
    setattr(product, "supplier_name", supplier_name)
    return ProductDetailOut().dump(product)


@router.post("", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)], summary="Create a product (admin)")
def create_product(payload: dict = Body(...), db: Session = Depends(get_db)):
    data = validate_body(ProductCreateSchema(), payload)
    if data.get("supplier_id") is not None and db.get(Supplier, data["supplier_id"]) is None:
        raise NotFoundError("Supplier", data["supplier_id"])
    if data.get("category_id") is not None and db.get(Category, data["category_id"]) is None:
        raise NotFoundError("Category", data["category_id"])
    product = Product(**data)
    db.add(product)
    db.commit()
    db.refresh(product)
    return _detail_dump(db, product)


@router.patch("/{product_id}", dependencies=[Depends(require_admin)], summary="Partially update a product (admin)")
def update_product(
    payload: dict = Body(...),
    product_id: int = Path(...),
    db: Session = Depends(get_db),
):
    product = _get_product(db, product_id)
    data = validate_body(ProductUpdateSchema(partial=True), payload)
    for field, value in data.items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return _detail_dump(db, product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)], summary="Delete a product (admin)")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = _get_product(db, product_id)
    refs = (
        db.scalar(select(func.count()).select_from(OrderDetail).where(OrderDetail.product_id == product_id))
        or 0
    )
    if refs:
        raise AppError(
            f"Product {product_id} appears in {refs} order line(s) and cannot be deleted",
            status_code=status.HTTP_409_CONFLICT,
        )
    db.delete(product)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _detail_dump(db: Session, product: Product) -> dict:
    row = db.execute(
        select(Category.category_name, Supplier.company_name)
        .select_from(Product)
        .join(Category, Product.category_id == Category.category_id, isouter=True)
        .join(Supplier, Product.supplier_id == Supplier.supplier_id, isouter=True)
        .where(Product.product_id == product.product_id)
    ).first()
    category_name, supplier_name = row if row else (None, None)
    out = ProductDetailOut().dump(product)
    out["category_name"] = category_name
    out["supplier_name"] = supplier_name
    return out

