from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Float, Integer, String, types
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NorthwindDate(types.TypeDecorator):
    """Northwind stores dates inconsistently: some rows are plain YYYY-MM-DD,
    others carry a trailing time component."""

    impl = types.String
    cache_ok = True

    def process_result_value(self, value: str | None, dialect) -> date | None:
        if not value:
            return None
        try:
            return datetime.strptime(value[:10], "%Y-%m-%d").date()
        except ValueError:
            return None

    def process_bind_param(self, value: date | None, dialect) -> str | None:
        return value.isoformat() if value is not None else None


class Customer(Base):
    __tablename__ = "Customers"

    customer_id: Mapped[str] = mapped_column("CustomerID", String(5), primary_key=True)
    company_name: Mapped[str] = mapped_column("CompanyName", String(40))
    contact_name: Mapped[str | None] = mapped_column("ContactName", String(30))
    contact_title: Mapped[str | None] = mapped_column("ContactTitle", String(30))
    address: Mapped[str | None] = mapped_column("Address", String(60))
    city: Mapped[str | None] = mapped_column("City", String(15))
    region: Mapped[str | None] = mapped_column("Region", String(15))
    postal_code: Mapped[str | None] = mapped_column("PostalCode", String(10))
    country: Mapped[str | None] = mapped_column("Country", String(15))
    phone: Mapped[str | None] = mapped_column("Phone", String(24))
    fax: Mapped[str | None] = mapped_column("Fax", String(24))


class Category(Base):
    __tablename__ = "Categories"

    category_id: Mapped[int] = mapped_column("CategoryID", Integer, primary_key=True)
    category_name: Mapped[str] = mapped_column("CategoryName", String(15))
    description: Mapped[str | None] = mapped_column("Description", String)


class Supplier(Base):
    __tablename__ = "Suppliers"

    supplier_id: Mapped[int] = mapped_column("SupplierID", Integer, primary_key=True)
    company_name: Mapped[str] = mapped_column("CompanyName", String(40))
    contact_name: Mapped[str | None] = mapped_column("ContactName", String(30))
    city: Mapped[str | None] = mapped_column("City", String(15))
    country: Mapped[str | None] = mapped_column("Country", String(15))
    phone: Mapped[str | None] = mapped_column("Phone", String(24))


class Product(Base):
    __tablename__ = "Products"

    product_id: Mapped[int] = mapped_column("ProductID", Integer, primary_key=True)
    product_name: Mapped[str] = mapped_column("ProductName", String(40), nullable=False)
    supplier_id: Mapped[int | None] = mapped_column("SupplierID", Integer)
    category_id: Mapped[int | None] = mapped_column("CategoryID", Integer)
    quantity_per_unit: Mapped[str | None] = mapped_column("QuantityPerUnit", String(20))
    unit_price: Mapped[float | None] = mapped_column("UnitPrice", Float)
    units_in_stock: Mapped[int | None] = mapped_column("UnitsInStock", Integer)
    units_on_order: Mapped[int | None] = mapped_column("UnitsOnOrder", Integer)
    reorder_level: Mapped[int | None] = mapped_column("ReorderLevel", Integer)
    discontinued: Mapped[str] = mapped_column("Discontinued", String(1), default="0")


class Order(Base):
    __tablename__ = "Orders"

    order_id: Mapped[int] = mapped_column("OrderID", Integer, primary_key=True)
    customer_id: Mapped[str | None] = mapped_column("CustomerID", String(5))
    employee_id: Mapped[int | None] = mapped_column("EmployeeID", Integer)
    order_date: Mapped[date | None] = mapped_column("OrderDate", NorthwindDate)
    required_date: Mapped[date | None] = mapped_column("RequiredDate", NorthwindDate)
    shipped_date: Mapped[date | None] = mapped_column("ShippedDate", NorthwindDate)
    ship_via: Mapped[int | None] = mapped_column("ShipVia", Integer)
    freight: Mapped[float | None] = mapped_column("Freight", Float)
    ship_name: Mapped[str | None] = mapped_column("ShipName", String(40))
    ship_city: Mapped[str | None] = mapped_column("ShipCity", String(15))
    ship_country: Mapped[str | None] = mapped_column("ShipCountry", String(15))


class OrderDetail(Base):
    __tablename__ = "Order Details"

    order_id: Mapped[int] = mapped_column("OrderID", Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column("ProductID", Integer, primary_key=True)
    unit_price: Mapped[float] = mapped_column("UnitPrice", Float, nullable=False)
    quantity: Mapped[int] = mapped_column("Quantity", Integer, nullable=False)
    discount: Mapped[float] = mapped_column("Discount", Float, nullable=False, default=0.0)


class User(Base):
    __tablename__ = "Users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    full_name: Mapped[str] = mapped_column(String(60), default="")
    role: Mapped[str] = mapped_column(String(20), default="customer")
    customer_id: Mapped[str | None] = mapped_column("CustomerID", String(5))
