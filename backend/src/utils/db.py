from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection
def get_database():
    client = MongoClient(os.getenv("MONGODB_URI"))
    return client[os.getenv("MONGODB_DB")]

db = get_database()