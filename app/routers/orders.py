from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Body, Depends, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.errors import AppError, NotFoundError
from app.models import Customer, Order, OrderDetail, Product, User
from app.serializers import OrderCreateSchema, OrderSummaryOut, page, validate_body

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Place an order (registration + login required)",
)
def place_order(
    payload: dict = Body(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user.customer_id:
        raise AppError(
            "This account is not linked to a customer profile and cannot place orders.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    data = validate_body(OrderCreateSchema(), payload)

    product_ids = [item["product_id"] for item in data["items"]]
    products = db.scalars(select(Product).where(Product.product_id.in_(product_ids))).all()
    by_id = {p.product_id: p for p in products}
    missing = [pid for pid in product_ids if pid not in by_id]
    if missing:
        raise AppError(f"Unknown product id(s): {missing}", status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)

    shortages = [
        f"{by_id[item['product_id']].product_name} (requested {item['quantity']}, "
        f"in stock {by_id[item['product_id']].units_in_stock})"
        for item in data["items"]
        if by_id[item["product_id"]].units_in_stock is not None
        and by_id[item["product_id"]].units_in_stock < item["quantity"]
    ]
    if shortages:
        raise AppError(f"Insufficient stock: {'; '.join(shortages)}", status_code=status.HTTP_409_CONFLICT)

    next_id = (db.scalar(select(func.max(Order.order_id))) or 10247) + 1
    order = Order(order_id=next_id, customer_id=user.customer_id, order_date=date.today(), ship_country=data.get("ship_country"))
    db.add(order)
    total = 0.0
    for item in data["items"]:
        product = by_id[item["product_id"]]
        line_total = (product.unit_price or 0) * item["quantity"]
        total += line_total
        db.add(
            OrderDetail(
                order_id=next_id,
                product_id=product.product_id,
                unit_price=product.unit_price or 0,
                quantity=item["quantity"],
                discount=0.0,
            )
        )
        if product.units_in_stock is not None:
            product.units_in_stock -= item["quantity"]

    db.commit()
    return {
        "order_id": next_id,
        "customer_id": user.customer_id,
        "order_date": date.today().isoformat(),
        "item_count": len(data["items"]),
        "total": round(total, 2),
        "message": "Order placed successfully.",
    }


@router.get("/stats/top-products", summary="Best selling products by revenue")
def top_products(
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    revenue = func.sum(OrderDetail.unit_price * OrderDetail.quantity * (1 - OrderDetail.discount))
    rows = db.execute(
        select(
            Product.product_id,
            Product.product_name,
            revenue.label("revenue"),
            func.sum(OrderDetail.quantity).label("units_sold"),
        )
        .join(Product, OrderDetail.product_id == Product.product_id)
        .group_by(Product.product_id, Product.product_name)
        .order_by(revenue.desc())
        .limit(limit)
    ).all()
    return {
        "items": [
            {
                "product_id": r.product_id,
                "product_name": r.product_name,
                "units_sold": int(r.units_sold),
                "revenue": round(float(r.revenue), 2),
            }
            for r in rows
        ]
    }


@router.get("/stats/by-country", summary="Revenue grouped by ship country")
def sales_by_country(
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    revenue = func.sum(OrderDetail.unit_price * OrderDetail.quantity * (1 - OrderDetail.discount))
    rows = db.execute(
        select(Order.ship_country, revenue.label("revenue"), func.count(func.distinct(Order.order_id)).label("orders"))
        .join(Order, OrderDetail.order_id == Order.order_id)
        .where(Order.ship_country.isnot(None))
        .group_by(Order.ship_country)
        .order_by(revenue.desc())
        .limit(limit)
    ).all()
    return {
        "items": [
            {"ship_country": r.ship_country, "orders": r.orders, "revenue": round(float(r.revenue), 2)}
            for r in rows
        ]
    }


@router.get("", summary="List orders (filter by customer, country, date range)")
def list_orders(
    customer_id: str | None = Query(default=None, min_length=5, max_length=5),
    country: str | None = Query(default=None, max_length=15),
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    filters = []
    if customer_id:
        filters.append(Order.customer_id == customer_id.upper())
    if country:
        filters.append(func.lower(Order.ship_country) == country.lower())
    if date_from:
        filters.append(Order.order_date >= date_from)
    if date_to:
        filters.append(Order.order_date <= date_to)

    total = db.scalar(select(func.count()).select_from(Order).where(*filters)) or 0
    rows = db.execute(
        select(Order, Customer.company_name)
        .join(Customer, Order.customer_id == Customer.customer_id, isouter=True)
        .where(*filters)
        .order_by(Order.order_date.desc(), Order.order_id.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    items = []
    for order, company in rows:
        d = OrderSummaryOut().dump(order)
        d["customer_name"] = company
        items.append(d)
    return page(items, total, limit, offset)


@router.get("/{order_id}", summary="Get one order with line items and totals")
def get_order(order_id: int, db: Session = Depends(get_db)):
    row = db.execute(
        select(Order, Customer.company_name)
        .join(Customer, Order.customer_id == Customer.customer_id, isouter=True)
        .where(Order.order_id == order_id)
    ).first()
    if row is None:
        raise NotFoundError("Order", order_id)
    order, company = row

    lines = db.execute(
        select(OrderDetail, Product.product_name)
        .join(Product, OrderDetail.product_id == Product.product_id, isouter=True)
        .where(OrderDetail.order_id == order_id)
        .order_by(OrderDetail.product_id)
    ).all()

    items, order_total = [], 0.0
    for detail, product_name in lines:
        line_total = round(detail.unit_price * detail.quantity * (1 - detail.discount), 2)
        order_total += line_total
        items.append(
            {
                "product_id": detail.product_id,
                "product_name": product_name,
                "unit_price": detail.unit_price,
                "quantity": detail.quantity,
                "discount": detail.discount,
                "line_total": line_total,
            }
        )

    out = OrderSummaryOut().dump(order)
    out["customer_name"] = company
    out["item_count"] = len(items)
    out["total"] = round(order_total, 2)
    out["items"] = items
    return out
