from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timedelta

from app.database import borrow_collection, book_collection
from app.auth import require_roles

router = APIRouter()


@router.post("/borrow")
async def borrow_book(
    member_id: str,
    book_id: str,
    current_user: dict = Depends(require_roles("admin", "user", "member"))
):

    book = await book_collection.find_one({"_id": ObjectId(book_id)})

    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    if book["available_copies"] <= 0:
        raise HTTPException(status_code=400, detail="Book unavailable")

    await borrow_collection.insert_one({
        "member_id": member_id,
        "book_id": book_id,
        "borrow_date": datetime.utcnow(),
        "due_date": datetime.utcnow() + timedelta(days=7),
        "status": "Borrowed"
    })

    await book_collection.update_one(
        {"_id": ObjectId(book_id)},
        {"$inc": {"available_copies": -1}}
    )

    return {"message": "Book borrowed successfully"}


@router.post("/return")
async def return_book(
    book_id: str,
    current_user: dict = Depends(require_roles("admin", "user", "member"))
):

    record = await borrow_collection.find_one({
        "book_id": book_id,
        "status": "Borrowed"
    })

    if not record:
        raise HTTPException(status_code=404, detail="Borrow record not found")

    await borrow_collection.update_one(
        {"_id": record["_id"]},
        {
            "$set": {
                "status": "Returned",
                "return_date": datetime.utcnow()
            }
        }
    )

    await book_collection.update_one(
        {"_id": ObjectId(book_id)},
        {"$inc": {"available_copies": 1}}
    )

    return {"message": "Book returned successfully"}


@router.get("/history")
async def borrow_history(
    current_user: dict = Depends(require_roles("admin", "user"))
):

    records = []

    async for record in borrow_collection.find():
        record["_id"] = str(record["_id"])
        records.append(record)

    return records
