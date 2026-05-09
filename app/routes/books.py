from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.models.book import Book
from app.database import book_collection
from app.utils.logger import create_log
from app.auth import require_roles

router = APIRouter()


@router.post("/")
async def add_book(
    book: Book,
    current_user: dict = Depends(require_roles("admin", "user"))
):

    existing = await book_collection.find_one({"isbn": book.isbn})

    if existing:
        raise HTTPException(status_code=400, detail="Duplicate ISBN found")

    result = await book_collection.insert_one(book.dict())

    await create_log("ADD_BOOK", "BOOK", str(result.inserted_id))

    return {
        "message": "Book added successfully",
        "id": str(result.inserted_id)
    }


@router.get("/")
async def get_books(
    current_user: dict = Depends(require_roles("admin", "user", "member"))
):

    books = []

    async for book in book_collection.find():
        book["_id"] = str(book["_id"])
        books.append(book)

    return books


@router.get("/{book_id}")
async def get_book(
    book_id: str,
    current_user: dict = Depends(require_roles("admin", "user", "member"))
):

    book = await book_collection.find_one({"_id": ObjectId(book_id)})

    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    book["_id"] = str(book["_id"])

    return book


@router.put("/{book_id}")
async def update_book(
    book_id: str,
    updated_book: Book,
    current_user: dict = Depends(require_roles("admin", "user"))
):

    return {"message": "Book deleted successfully"}
