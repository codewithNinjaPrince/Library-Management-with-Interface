from pydantic import BaseModel, Field
from typing import Literal

UserRole = Literal["admin", "user", "member"]

class User(BaseModel):

    username: str = Field(
        min_length=3,
        max_length=30
    )

    password: str = Field(
        min_length=6,
        max_length=50
    )

    role: UserRole = "member"
