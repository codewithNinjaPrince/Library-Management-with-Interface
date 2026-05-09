from fastapi import APIRouter, Depends
from bson import ObjectId
from app.models.member import Member
from app.database import member_collection
from app.auth import require_roles

router = APIRouter()


@router.post("/")
async def add_member(
    member: Member,
    current_user: dict = Depends(require_roles("admin", "user"))
):

    result = await member_collection.insert_one(member.dict())

    return {
        "message": "Member added successfully",
        "id": str(result.inserted_id)
    }


@router.get("/")
async def get_members(
    current_user: dict = Depends(require_roles("admin", "user"))
):

    members = []

    async for member in member_collection.find():
        member["_id"] = str(member["_id"])
        members.append(member)

    return members


@router.delete("/{member_id}")
async def delete_member(
    member_id: str,
    current_user: dict = Depends(require_roles("admin"))
):

    await member_collection.delete_one({"_id": ObjectId(member_id)})

    return {"message": "Member deleted successfully"}
