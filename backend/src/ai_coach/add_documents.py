# add_documents.py
import os
import argparse
from src.ai_coach.embeddings import load_and_split_documents, add_to_vector_db
#from backend.src.ai_coach.embeddings import load_and_split_documents, add_to_vector_db

def main():
    parser = argparse.ArgumentParser(description='Add new documents to the RLC methodology vector database')
    parser.add_argument('--docs_dir', type=str, required=True, help='Directory containing new RLC documents')
    parser.add_argument('--db_dir', type=str, default='./chroma_db', help='Directory of the existing vector database')
    args = parser.parse_args()
    
    # Check if the documents directory exists
    if not os.path.exists(args.docs_dir):
        print(f"Error: Documents directory '{args.docs_dir}' does not exist")
        return
    
    # Check if the database directory exists
    if not os.path.exists(args.db_dir):
        print(f"Error: Database directory '{args.db_dir}' does not exist")
        return
    
    print(f"Loading new documents from {args.docs_dir}...")
    chunks = load_and_split_documents(args.docs_dir)
    print(f"Loaded {len(chunks)} document chunks")
    
    print(f"Adding to existing vector database in {args.db_dir}...")
    success = add_to_vector_db(chunks, args.db_dir)
    if success:
        print("Documents added successfully to the vector database")
    else:
        print("Error adding documents to the vector database")

if __name__ == "__main__":
    main()