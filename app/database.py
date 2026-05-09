import os

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME")

client = AsyncIOMotorClient(MONGO_URI)

database = client[DATABASE_NAME]

book_collection = database.books
member_collection = database.members
borrow_collection = database.borrow_records
log_collection = database.audit_logs
user_collection = database.users