from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.supplier import (
    SupplierCreate, SupplierUpdate, SupplierOut,
    SupplierIngredientCreate, SupplierIngredientUpdate, SupplierIngredientOut,
)
from app.crud import supplier as crud_supplier

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.get("/", response_model=list[SupplierOut])
def list_suppliers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_supplier.get_suppliers(db, skip=skip, limit=limit)


@router.post("/", response_model=SupplierOut, status_code=201)
def create_supplier(supplier_in: SupplierCreate, db: Session = Depends(get_db)):
    return crud_supplier.create_supplier(db, supplier_in)


@router.get("/{supplier_id}", response_model=SupplierOut)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = crud_supplier.get_supplier(db, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    return supplier


@router.patch("/{supplier_id}", response_model=SupplierOut)
def update_supplier(supplier_id: int, supplier_in: SupplierUpdate, db: Session = Depends(get_db)):
    supplier = crud_supplier.get_supplier(db, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    return crud_supplier.update_supplier(db, supplier, supplier_in)


@router.delete("/{supplier_id}", status_code=204)
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)):
    supplier = crud_supplier.get_supplier(db, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")
    crud_supplier.delete_supplier(db, supplier)


# --- Supplier <-> Ingredient pricing / lead-time links ---

@router.post("/ingredient-links", response_model=SupplierIngredientOut, status_code=201)
def link_supplier_to_ingredient(link_in: SupplierIngredientCreate, db: Session = Depends(get_db)):
    return crud_supplier.link_supplier_ingredient(db, link_in)


@router.get("/ingredient-links/by-ingredient/{ingredient_id}", response_model=list[SupplierIngredientOut])
def list_suppliers_for_ingredient(ingredient_id: int, db: Session = Depends(get_db)):
    return crud_supplier.get_suppliers_for_ingredient(db, ingredient_id)


@router.patch("/ingredient-links/{supplier_ingredient_id}", response_model=SupplierIngredientOut)
def update_supplier_ingredient_link(
    supplier_ingredient_id: int, link_in: SupplierIngredientUpdate, db: Session = Depends(get_db)
):
    link = crud_supplier.get_supplier_ingredient(db, supplier_ingredient_id)
    if not link:
        raise HTTPException(status_code=404, detail="Supplier-ingredient link not found.")
    return crud_supplier.update_supplier_ingredient(db, link, link_in)
