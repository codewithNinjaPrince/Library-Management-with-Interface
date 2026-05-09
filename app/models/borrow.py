from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class BorrowRecord(BaseModel):
    member_id: str
    book_id: str
    borrow_date: datetime
    due_date: datetime
    return_date: Optional[datetime] = None
    status: str = "Borrowed"