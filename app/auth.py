from __future__ import annotations

import os
import re
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from marshmallow import Schema, fields, validate
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import AppError, NotFoundError
from app.models import Customer, Order, OrderDetail, Product, User
from app.serializers import OrderSummaryOut, page, validate_body

SECRET_KEY = os.environ.get("JWT_SECRET", "dev-secret-change-me")
ALGORITHM = "HS256"
TOKEN_TTL_MINUTES = 60 * 24

bearer_scheme = HTTPBearer(auto_error=False)


class LoginSchema(Schema):
    username = fields.String(required=True)
    password = fields.String(required=True)


class RegisterSchema(Schema):
    username = fields.String(
        required=True, validate=validate.Regexp(r"^[a-zA-Z0-9_.-]{3,30}$")
    )
    password = fields.String(required=True, validate=validate.Length(min=6, max=72))
    full_name = fields.String(load_default="", validate=validate.Length(max=60))


class PasswordChangeSchema(Schema):
    current_password = fields.String(required=True)
    new_password = fields.String(required=True, validate=validate.Length(min=6, max=72))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def create_access_token(user: User) -> str:
    payload = {
        "sub": user.username,
        "role": user.role,
        "cid": user.customer_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=TOKEN_TTL_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _credentials_error(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=message,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise _credentials_error("Not authenticated. Please log in.")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise _credentials_error("Token has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise _credentials_error("Invalid authentication token.")
    user = db.scalar(select(User).where(User.username == payload.get("sub")))
    if user is None:
        raise _credentials_error("User no longer exists.")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise AppError("Admin privileges required.", status_code=status.HTTP_403_FORBIDDEN)
    return user


def _user_out(user: User) -> dict:
    return {
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role,
        "customer_id": user.customer_id,
    }


def _unique_customer_id(db: Session, username: str) -> str:
    base = re.sub(r"[^A-Z0-9]", "", username.upper())[:5].ljust(5, "X")
    candidate, counter = base, 0
    while db.get(Customer, candidate) is not None:
        counter += 1
        suffix = str(counter % 100).zfill(2)
        candidate = f"{base[:3]}{suffix}"
    return candidate


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED, summary="Create a customer account")
def register(payload: dict = Body(...), db: Session = Depends(get_db)):
    data = validate_body(RegisterSchema(), payload)
    if db.scalar(select(User).where(User.username == data["username"])):
        raise AppError("Username is already taken.", status_code=status.HTTP_409_CONFLICT)

    cid = _unique_customer_id(db, data["username"])
    db.add(
        Customer(
            customer_id=cid,
            company_name=data["full_name"].strip() or data["username"],
            contact_name=data["full_name"].strip() or None,
            country=None,
        )
    )
    user = User(
        username=data["username"],
        full_name=data["full_name"].strip(),
        role="customer",
        password_hash=hash_password(data["password"]),
        customer_id=cid,
    )
    db.add(user)
    db.commit()
    token = create_access_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": TOKEN_TTL_MINUTES * 60,
        "user": _user_out(user),
    }


@router.post("/login", summary="Exchange credentials for a JWT")
def login(payload: dict = Body(...), db: Session = Depends(get_db)):
    data = validate_body(LoginSchema(), payload)
    user = db.scalar(select(User).where(User.username == data["username"]))
    if user is None or not verify_password(data["password"], user.password_hash):
        raise _credentials_error("Incorrect username or password.")
    token = create_access_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": TOKEN_TTL_MINUTES * 60,
        "user": _user_out(user),
    }


@router.get("/me", summary="Current user profile")
def me(user: User = Depends(get_current_user)):
    return _user_out(user)


@router.put("/password", summary="Change password (authenticated)")
def update_password(
    payload: dict = Body(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = validate_body(PasswordChangeSchema(), payload)
    if not verify_password(data["current_password"], user.password_hash):
        raise AppError(
            "Current password is incorrect.", status_code=status.HTTP_400_BAD_REQUEST
        )
    user.password_hash = hash_password(data["new_password"])
    db.commit()
    return {"message": "Password updated successfully."}


@router.get("/me/orders", summary="Order history for the logged-in user")
def my_orders(
    limit: int = 20,
    offset: int = 0,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user.customer_id:
        return page([], 0, limit, offset)
    base = [Order.customer_id == user.customer_id]
    total = db.scalar(select(func.count()).select_from(Order).where(*base)) or 0
    rows = (
        db.execute(
            select(Order, func.count(OrderDetail.product_id), func.sum(OrderDetail.unit_price * OrderDetail.quantity))
            .outerjoin(OrderDetail, Order.order_id == OrderDetail.order_id)
            .where(*base)
            .group_by(Order.order_id)
            .order_by(Order.order_date.desc())
            .limit(limit)
            .offset(offset)
        ).all()
    )
    items = []
    for order, line_count, subtotal in rows:
        d = OrderSummaryOut().dump(order)
        d["item_count"] = line_count or 0
        d["subtotal"] = round(float(subtotal or 0), 2)
        items.append(d)
    return page(items, total, limit, offset)
