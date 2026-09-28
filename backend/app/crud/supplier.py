from sqlalchemy.orm import Session

from app.models.supplier import Supplier, SupplierIngredient
from app.schemas.supplier import (
    SupplierCreate, SupplierUpdate,
    SupplierIngredientCreate, SupplierIngredientUpdate,
)


def get_supplier(db: Session, supplier_id: int) -> Supplier | None:
    return db.get(Supplier, supplier_id)


def get_suppliers(db: Session, skip: int = 0, limit: int = 100) -> list[Supplier]:
    return db.query(Supplier).offset(skip).limit(limit).all()


def create_supplier(db: Session, supplier_in: SupplierCreate) -> Supplier:
    supplier = Supplier(**supplier_in.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


def update_supplier(db: Session, supplier: Supplier, supplier_in: SupplierUpdate) -> Supplier:
    for field, value in supplier_in.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return supplier


def delete_supplier(db: Session, supplier: Supplier) -> None:
    db.delete(supplier)
    db.commit()


def get_suppliers_for_ingredient(db: Session, ingredient_id: int) -> list[SupplierIngredient]:
    return (
        db.query(SupplierIngredient)
        .filter(SupplierIngredient.ingredient_id == ingredient_id)
        .order_by(SupplierIngredient.is_preferred.desc(), SupplierIngredient.unit_cost.asc())
        .all()
    )


def link_supplier_ingredient(db: Session, link_in: SupplierIngredientCreate) -> SupplierIngredient:
    link = SupplierIngredient(**link_in.model_dump())
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


def update_supplier_ingredient(
    db: Session, link: SupplierIngredient, link_in: SupplierIngredientUpdate
) -> SupplierIngredient:
    for field, value in link_in.model_dump(exclude_unset=True).items():
        setattr(link, field, value)
    db.commit()
    db.refresh(link)
    return link


def get_supplier_ingredient(db: Session, supplier_ingredient_id: int) -> SupplierIngredient | None:
    return db.get(SupplierIngredient, supplier_ingredient_id)
