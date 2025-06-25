import os
import argparse
from src.ai_coach.embeddings import load_and_split_documents, initialize_vector_db
from langchain_community.vectorstores import Chroma
from langchain_aws import BedrockEmbeddings
from src.config.model_constants import EMBEDDING_MODEL
from src.ai_coach.cohere_embeddings import CohereBedrockEmbeddings  # ADD THIS

def main():
    parser = argparse.ArgumentParser(description='Index RLC methodology documents in batches')
    parser.add_argument('--docs_dir', type=str, required=True, help='Directory containing RLC documents')
    parser.add_argument('--db_dir', type=str, default='./chroma_db', help='Directory to store the vector database')
    args = parser.parse_args()
    
    if not os.path.exists(args.docs_dir):
        print(f"Error: Documents directory '{args.docs_dir}' does not exist")
        return
    
    os.makedirs(args.db_dir, exist_ok=True)
    
    print(f"Loading documents from {args.docs_dir}...")
    chunks = load_and_split_documents(args.docs_dir)
    print(f"Loaded {len(chunks)} document chunks")
    
    # Initialize embeddings
    embeddings = CohereBedrockEmbeddings(
        model_id=EMBEDDING_MODEL,
        region_name=os.getenv("AWS_REGION", "us-east-1")
        #model_kwargs={"input_type": "search_document"}  # ADD THIS LINE
    )
    
    # Create empty vector store first
    vectordb = Chroma(
        persist_directory=args.db_dir,
        embedding_function=embeddings
    )
    
    # Process in batches of 100 (well under 128 limit)
    batch_size = 100
    total_batches = (len(chunks) + batch_size - 1) // batch_size
    
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        
        print(f"Processing batch {batch_num}/{total_batches} ({len(batch)} chunks)...")
        
        try:
            vectordb.add_documents(batch)
            print(f"✅ Batch {batch_num} added successfully")
        except Exception as e:
            print(f"❌ Error in batch {batch_num}: {e}")
            return
    
    print("✅ All documents indexed successfully!")

if __name__ == "__main__":
    main()