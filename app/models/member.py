from pydantic import BaseModel

class Member(BaseModel):
    name: str
    email: str
    phone: str
    course: str