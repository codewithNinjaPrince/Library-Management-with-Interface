from fastapi import APIRouter, Depends
from app.database import borrow_collection
from app.auth import require_roles

router = APIRouter()


@router.get("/top-books")
async def top_books(
    current_user: dict = Depends(require_roles("admin", "user"))
):

    pipeline = [
        {
            "$group": {
                "_id": "$book_id",
                "total": {"$sum": 1}
            }
        },
        {
            "$sort": {"total": -1}
        },
        {
            "$limit": 5
        }
    ]

    results = []

    async for item in borrow_collection.aggregate(pipeline):
        results.append(item)

    return results
