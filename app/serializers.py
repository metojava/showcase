from __future__ import annotations

from typing import Any

import marshmallow as ma
from fastapi import HTTPException
from marshmallow import Schema, fields, post_load, validate

DISC_TRUE = {"1", 1, True, "true", "True", "yes"}


def disc_to_str(value: Any) -> str:
    return "1" if value in DISC_TRUE else "0"


class CustomerOut(Schema):
    customer_id = fields.String()
    company_name = fields.String()
    contact_name = fields.String(dump_default=None)
    contact_title = fields.String(dump_default=None)
    address = fields.String(dump_default=None)
    city = fields.String(dump_default=None)
    region = fields.String(dump_default=None)
    postal_code = fields.String(dump_default=None)
    country = fields.String(dump_default=None)
    phone = fields.String(dump_default=None)
    fax = fields.String(dump_default=None)


_customer_fields = dict(
    company_name=fields.String(validate=validate.Length(max=40)),
    contact_name=fields.String(validate=validate.Length(max=30)),
    contact_title=fields.String(validate=validate.Length(max=30)),
    address=fields.String(validate=validate.Length(max=60)),
    city=fields.String(validate=validate.Length(max=15)),
    region=fields.String(validate=validate.Length(max=15)),
    postal_code=fields.String(validate=validate.Length(max=10)),
    country=fields.String(validate=validate.Length(max=15)),
    phone=fields.String(validate=validate.Length(max=24)),
    fax=fields.String(validate=validate.Length(max=24)),
)


class CustomerCreateSchema(Schema):
    customer_id = fields.String(required=True, validate=validate.Regexp(r"^[A-Z]{5}$"))
    company_name = _customer_fields["company_name"]
    contact_name = _customer_fields["contact_name"]
    contact_title = _customer_fields["contact_title"]
    address = _customer_fields["address"]
    city = _customer_fields["city"]
    region = _customer_fields["region"]
    postal_code = _customer_fields["postal_code"]
    country = _customer_fields["country"]
    phone = _customer_fields["phone"]
    fax = _customer_fields["fax"]


class CustomerUpdateSchema(Schema):
    company_name = _customer_fields["company_name"]
    contact_name = _customer_fields["contact_name"]
    contact_title = _customer_fields["contact_title"]
    address = _customer_fields["address"]
    city = _customer_fields["city"]
    region = _customer_fields["region"]
    postal_code = _customer_fields["postal_code"]
    country = _customer_fields["country"]
    phone = _customer_fields["phone"]
    fax = _customer_fields["fax"]


class CategoryOut(Schema):
    category_id = fields.Integer()
    category_name = fields.String()
    description = fields.String(dump_default=None)
    product_count = fields.Integer(required=False, dump_default=None)


class SupplierOut(Schema):
    supplier_id = fields.Integer()
    company_name = fields.String()
    contact_name = fields.String(dump_default=None)
    city = fields.String(dump_default=None)
    country = fields.String(dump_default=None)
    phone = fields.String(dump_default=None)


class ProductOut(Schema):
    product_id = fields.Integer()
    product_name = fields.String()
    supplier_id = fields.Integer(dump_default=None)
    category_id = fields.Integer(dump_default=None)
    quantity_per_unit = fields.String(dump_default=None)
    unit_price = fields.Float(dump_default=None)
    units_in_stock = fields.Integer(dump_default=None)
    units_on_order = fields.Integer(dump_default=None)
    reorder_level = fields.Integer(dump_default=None)
    discontinued = fields.Method(serialize="_dump_discontinued")

    @staticmethod
    def _dump_discontinued(obj: Any) -> bool:
        return str(getattr(obj, "discontinued", "0")) == "1"


class ProductDetailOut(ProductOut):
    category_name = fields.String(dump_default=None)
    supplier_name = fields.String(dump_default=None)


_product_numeric = dict(
    supplier_id=fields.Integer(allow_none=True),
    category_id=fields.Integer(allow_none=True),
    quantity_per_unit=fields.String(validate=validate.Length(max=20), allow_none=True),
    unit_price=fields.Float(validate=validate.Range(min=0.01), allow_none=True),
    units_in_stock=fields.Integer(validate=validate.Range(min=0), allow_none=True),
    units_on_order=fields.Integer(validate=validate.Range(min=0), allow_none=True),
    reorder_level=fields.Integer(validate=validate.Range(min=0), allow_none=True),
)


class ProductCreateSchema(Schema):
    product_name = fields.String(required=True, validate=validate.Length(1, 40))
    supplier_id = _product_numeric["supplier_id"]
    category_id = _product_numeric["category_id"]
    quantity_per_unit = _product_numeric["quantity_per_unit"]
    unit_price = _product_numeric["unit_price"]
    units_in_stock = _product_numeric["units_in_stock"]
    units_on_order = _product_numeric["units_on_order"]
    reorder_level = _product_numeric["reorder_level"]
    discontinued = fields.Boolean(load_default=False)

    @post_load
    def finalize(self, data: dict, **kwargs: Any) -> dict:
        data["discontinued"] = disc_to_str(data.get("discontinued", False))
        return data


class ProductUpdateSchema(Schema):
    product_name = fields.String(validate=validate.Length(1, 40))
    supplier_id = _product_numeric["supplier_id"]
    category_id = _product_numeric["category_id"]
    quantity_per_unit = _product_numeric["quantity_per_unit"]
    unit_price = _product_numeric["unit_price"]
    units_in_stock = _product_numeric["units_in_stock"]
    units_on_order = _product_numeric["units_on_order"]
    reorder_level = _product_numeric["reorder_level"]
    discontinued = fields.Boolean()

    @post_load
    def finalize(self, data: dict, **kwargs: Any) -> dict:
        if "discontinued" in data:
            data["discontinued"] = disc_to_str(data["discontinued"])
        return data


class OrderSummaryOut(Schema):
    order_id = fields.Integer()
    customer_id = fields.String(dump_default=None)
    order_date = fields.Date(dump_default=None)
    required_date = fields.Date(dump_default=None)
    shipped_date = fields.Date(dump_default=None)
    freight = fields.Float(dump_default=None)
    ship_country = fields.String(dump_default=None)
    customer_name = fields.String(dump_default=None)


def validate_body(schema: Schema, payload: Any) -> dict:
    try:
        return schema.load(payload)
    except ma.ValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail={"message": "Validation failed", "errors": exc.messages},
        ) from exc


class OrderItemInSchema(Schema):
    product_id = fields.Integer(required=True)
    quantity = fields.Integer(required=True, validate=validate.Range(min=1, max=999))


class OrderCreateSchema(Schema):
    ship_country = fields.String(load_default=None, validate=validate.Length(max=15))
    items = fields.List(
        fields.Nested(OrderItemInSchema),
        required=True,
        validate=validate.Length(min=1, max=50),
    )


def page(items: list, total: int, limit: int, offset: int) -> dict:
    return {"total": total, "limit": limit, "offset": offset, "items": items}
