from __future__ import annotations

from fastapi import APIRouter, Body, Depends, Path, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.errors import AppError, NotFoundError
from app.models import Customer, Order
from app.serializers import (
    CustomerCreateSchema,
    CustomerOut,
    CustomerUpdateSchema,
    OrderSummaryOut,
    page,
    validate_body,
)

router = APIRouter(prefix="/customers", tags=["customers"])


def _get_customer(db: Session, customer_id: str) -> Customer:
    customer = db.get(Customer, customer_id.upper())
    if customer is None:
        raise NotFoundError("Customer", customer_id)
    return customer


@router.get("", summary="List customers (search + pagination)")
def list_customers(
    q: str | None = Query(default=None, min_length=1, max_length=50),
    country: str | None = Query(default=None, max_length=15),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    filters = []
    if q:
        needle = f"%{q.lower()}%"
        filters.append(
            or_(
                func.lower(Customer.company_name).like(needle),
                func.lower(Customer.contact_name).like(needle),
                func.lower(Customer.customer_id).like(needle),
            )
        )
    if country:
        filters.append(func.lower(Customer.country) == country.lower())

    total = db.scalar(select(func.count()).select_from(Customer).where(*filters)) or 0
    rows = db.scalars(
        select(Customer).where(*filters).order_by(Customer.customer_id).limit(limit).offset(offset)
    ).all()
    return page(CustomerOut().dump(rows, many=True), total, limit, offset)


@router.get("/{customer_id}", summary="Get one customer")
def get_customer(
    customer_id: str = Path(min_length=5, max_length=5),
    db: Session = Depends(get_db),
):
    return CustomerOut().dump(_get_customer(db, customer_id))


@router.get("/{customer_id}/orders", summary="Orders placed by a customer")
def list_customer_orders(
    customer_id: str = Path(min_length=5, max_length=5),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    _get_customer(db, customer_id)
    cid = customer_id.upper()
    base = [Order.customer_id == cid]
    total = db.scalar(select(func.count()).select_from(Order).where(*base)) or 0
    rows = db.scalars(
        select(Order).where(*base).order_by(Order.order_date.desc()).limit(limit).offset(offset)
    ).all()
    items = []
    for o in rows:
        d = OrderSummaryOut().dump(o)
        d["customer_name"] = _get_customer(db, o.customer_id).company_name
        items.append(d)
    return page(items, total, limit, offset)


@router.post("", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)], summary="Create a customer (admin)")
def create_customer(payload: dict = Body(...), db: Session = Depends(get_db)):
    data = validate_body(CustomerCreateSchema(), payload)
    cid = data.pop("customer_id")
    if db.get(Customer, cid) is not None:
        raise AppError(f"Customer {cid} already exists", status_code=status.HTTP_409_CONFLICT)
    customer = Customer(customer_id=cid, **data)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return CustomerOut().dump(customer)


@router.patch("/{customer_id}", dependencies=[Depends(require_admin)], summary="Partially update a customer (admin)")
def update_customer(
    payload: dict = Body(...),
    customer_id: str = Path(min_length=5, max_length=5),
    db: Session = Depends(get_db),
):
    customer = _get_customer(db, customer_id)
    data = validate_body(CustomerUpdateSchema(partial=True), payload)
    for field, value in data.items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return CustomerOut().dump(customer)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)], summary="Delete a customer (admin)")
def delete_customer(
    customer_id: str = Path(min_length=5, max_length=5),
    db: Session = Depends(get_db),
):
    customer = _get_customer(db, customer_id)
    orders = (
        db.scalar(select(func.count()).select_from(Order).where(Order.customer_id == customer.customer_id))
        or 0
    )
    if orders:
        raise AppError(
            f"Customer {customer.customer_id} has {orders} order(s) and cannot be deleted",
            status_code=status.HTTP_409_CONFLICT,
        )
    db.delete(customer)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

