from datetime import datetime
from app.database import log_collection

async def create_log(action, entity_type, entity_id):
    await log_collection.insert_one({
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "timestamp": datetime.utcnow()
    })