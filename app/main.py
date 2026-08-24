from __future__ import annotations

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.auth import hash_password, router as auth_router
from app.database import Base, SessionLocal, engine
from app.errors import register_exception_handlers
from app.models import Customer, Order, OrderDetail, Product, User
from app.routers import catalog, customers, items, orders, products
from app.schemas import ItemCreate
from app.store import store

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine, tables=[User.__table__])
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.username == "admin")) is None:
            db.add(
                User(
                    username="admin",
                    full_name="Administrator",
                    role="admin",
                    password_hash=hash_password("admin123"),
                )
            )
            db.commit()
    with engine.connect() as conn:
        conn.execute(select(1))
    store.create(ItemCreate(name="Sample Item", price=9.99, tags=["demo"]))
    with SessionLocal() as db:
        app.state.nw_counts = {
            "customers": db.query(Customer).count(),
            "products": db.query(Product).count(),
            "orders": db.query(Order).count(),
            "order_details": db.query(OrderDetail).count(),
        }
    yield


app = FastAPI(
    title="Northwind Storefront API",
    description=(
        "FastAPI + SQLAlchemy + Marshmallow over the Northwind SQLite database.\n\n"
        "- Public: browse products, categories, suppliers, orders\n"
        "- Authenticated (JWT): place orders (`POST /orders`), order history, "
        "change password (`PUT /auth/password`)\n"
        "- Admin: manage products/customers\n\n"
        "Seeded admin account: **admin / admin123**"
    ),
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

for router in (items.router, auth_router, customers.router, products.router, catalog.router, orders.router):
    app.include_router(router)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.2f}"
    return response


@app.get("/health", tags=["health"], summary="Liveness probe")
async def health_check() -> dict[str, str | int]:
    return {"status": "ok", **app.state.nw_counts}
