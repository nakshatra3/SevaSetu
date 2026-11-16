import re

from fastapi import APIRouter, Depends, status
from pymongo.errors import DuplicateKeyError

from app.auth import require_role
from app.database import get_db
from app.schemas import CategoryCreate
from app.utils.helpers import bad_request, conflict, not_found, now, to_object_id

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("")
def list_categories():
    db = get_db()
    return [
        {
            "id": str(c["_id"]),
            "name": c["name"],
            "event_count": db.events.count_documents({"category": c["name"]}),
        }
        for c in db.categories.find().sort("name", 1)
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_category(data: CategoryCreate, user: dict = Depends(require_role("admin"))):
    db = get_db()
    name = data.name.strip()
    same_name = {"$regex": "^" + re.escape(name) + "$", "$options": "i"}
    if db.categories.find_one({"name": same_name}):
        raise conflict("This category already exists.")
    try:
        result = db.categories.insert_one({"name": name, "created_at": now()})
    except DuplicateKeyError:
        raise conflict("This category already exists.")
    return {"id": str(result.inserted_id), "name": name, "event_count": 0}


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: str, user: dict = Depends(require_role("admin"))):
    db = get_db()
    category = db.categories.find_one({"_id": to_object_id(category_id, "Category")})
    if category is None:
        raise not_found("Category")
    if db.events.count_documents({"category": category["name"]}) > 0:
        raise bad_request("This category is used by events, so it can't be deleted.")
    db.categories.delete_one({"_id": category["_id"]})
