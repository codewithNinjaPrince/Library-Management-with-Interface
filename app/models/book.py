from pydantic import BaseModel
from typing import Optional

class Book(BaseModel):
    title: str
    author: str
    isbn: str
    category: str
    quantity: int
    available_copies: int
    shelf_location: Optional[str] = None