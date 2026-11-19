import re
from datetime import datetime

from bson import ObjectId
from fastapi import HTTPException, status


def now() -> datetime:
    
    return datetime.now().replace(microsecond=0)


def to_naive_local(value: datetime) -> datetime:
    if value.tzinfo is not None:
        value = value.astimezone().replace(tzinfo=None)
    return value.replace(second=0, microsecond=0)


def to_object_id(value: str, label: str = "Item") -> ObjectId:
    if not value or not ObjectId.is_valid(value):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{label} not found.")
    return ObjectId(value)


def clean_doc(doc):
    if isinstance(doc, list):
        return [clean_doc(item) for item in doc]
    if isinstance(doc, ObjectId):
        return str(doc)
    if not isinstance(doc, dict):
        return doc

    result = {}
    for key, value in doc.items():
        if key == "_id":
            result["id"] = str(value)
        else:
            result[key] = clean_doc(value)
    return result


def contains_text(text: str) -> dict:
    return {"$regex": re.escape(text.strip()), "$options": "i"}


def clean_tags(values: list[str]) -> list[str]:
    result = []
    for value in values:
        value = value.strip()
        if value and value.lower() not in [v.lower() for v in result]:
            result.append(value)
    return result


def not_found(label: str = "Item"):
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{label} not found.")


def bad_request(message: str):
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)


def forbidden(message: str = "You don't have permission to do this."):
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=message)


def conflict(message: str):
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message)
