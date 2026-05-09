from fastapi import APIRouter, Depends, UploadFile, File
import pandas as pd
from app.database import book_collection
from app.auth import require_roles

router = APIRouter()


@router.post("/books-csv")
async def upload_books_csv(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_roles("admin", "user"))
):

    df = pd.read_csv(file.file)

    inserted = 0

    for _, row in df.iterrows():

        existing = await book_collection.find_one({"isbn": str(row['isbn'])})

        if existing:
            continue

        await book_collection.insert_one({
            "title": row['title'],
            "author": row['author'],
            "isbn": str(row['isbn']),
            "category": row['category'],
            "quantity": int(row['quantity']),
            "available_copies": int(row['quantity'])
        })

        inserted += 1

    return {
        "message": "CSV uploaded successfully",
        "inserted_records": inserted
    }
