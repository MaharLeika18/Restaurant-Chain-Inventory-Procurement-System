from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut, UserCreate, UserUpdate, UserOut
from app.crud import employee as crud_employee

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get("/", response_model=list[EmployeeOut])
def list_employees(branch_id: int | None = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud_employee.get_employees(db, branch_id=branch_id, skip=skip, limit=limit)


@router.post("/", response_model=EmployeeOut, status_code=201)
def create_employee(employee_in: EmployeeCreate, db: Session = Depends(get_db)):
    return crud_employee.create_employee(db, employee_in)


@router.get("/{employee_id}", response_model=EmployeeOut)
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    employee = crud_employee.get_employee(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")
    return employee


@router.patch("/{employee_id}", response_model=EmployeeOut)
def update_employee(employee_id: int, employee_in: EmployeeUpdate, db: Session = Depends(get_db)):
    employee = crud_employee.get_employee(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")
    return crud_employee.update_employee(db, employee, employee_in)


@router.delete("/{employee_id}", status_code=204)
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    employee = crud_employee.get_employee(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")
    crud_employee.delete_employee(db, employee)


# --- Login accounts (one per employee) ---

@router.post("/accounts", response_model=UserOut, status_code=201)
def create_user_account(user_in: UserCreate, db: Session = Depends(get_db)):
    return crud_employee.create_user(db, user_in)


@router.patch("/accounts/{user_id}", response_model=UserOut)
def update_user_account(user_id: int, user_in: UserUpdate, db: Session = Depends(get_db)):
    user = crud_employee.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User account not found.")
    return crud_employee.update_user(db, user, user_in)
