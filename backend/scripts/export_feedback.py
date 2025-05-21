import csv
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

# MongoDB connection
def get_database():
    client = MongoClient(os.getenv("MONGODB_URI"))
    return client[os.getenv("MONGODB_DB")]

def export_feedback_to_csv(output_file="feedback_export.csv"):
    """Export feedback data to CSV file."""
    db = get_database()
    feedback_collection = db["feedback"]
    
    # Get all feedback documents
    feedback_docs = list(feedback_collection.find({}))
    
    if not feedback_docs:
        print("No feedback data found.")
        return
    
    # Define CSV fields
    fieldnames = [
        'timestamp', 'userEmail', 'component', 'modelId', 
        'conversationId', 'userInput', 'aiOutput', 
        'ragPrompt', 'rating', 'feedbackText'
    ]
    
    # Write to CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for doc in feedback_docs:
            # Convert ObjectId to string and format datetime
            if '_id' in doc:
                del doc['_id']
            
            if 'timestamp' in doc and isinstance(doc['timestamp'], datetime):
                doc['timestamp'] = doc['timestamp'].isoformat()
                
            writer.writerow(doc)
    
    print(f"Exported {len(feedback_docs)} feedback records to {output_file}")

if __name__ == "__main__":
    export_feedback_to_csv()