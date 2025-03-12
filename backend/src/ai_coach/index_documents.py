# index_documents.py
import os
import argparse
from src.ai_coach.embeddings import load_and_split_documents, initialize_vector_db

def main():
    parser = argparse.ArgumentParser(description='Index RLC methodology documents')
    parser.add_argument('--docs_dir', type=str, required=True, help='Directory containing RLC documents')
    parser.add_argument('--db_dir', type=str, default='./chroma_db', help='Directory to store the vector database')
    args = parser.parse_args()
    
    # Check if the documents directory exists
    if not os.path.exists(args.docs_dir):
        print(f"Error: Documents directory '{args.docs_dir}' does not exist")
        return
    
    # Create the database directory if it doesn't exist
    os.makedirs(args.db_dir, exist_ok=True)
    
    print(f"Loading documents from {args.docs_dir}...")
    chunks = load_and_split_documents(args.docs_dir)
    print(f"Loaded {len(chunks)} document chunks")
    
    print(f"Initializing vector database in {args.db_dir}...")
    vectordb = initialize_vector_db(chunks, args.db_dir)
    vectordb.persist()
    print("Vector database created and persisted successfully")

if __name__ == "__main__":
    main()