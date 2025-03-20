# backend/src/ai_archive/embeddings.py
import os
from langchain_aws import BedrockEmbeddings
from langchain_community.vectorstores import Chroma
import chromadb

def initialize_archive_vector_db(persist_directory="./archive_chroma_db"):
    """Initialize a separate vector database for archive documents."""
    # Create the directory if it doesn't exist
    os.makedirs(persist_directory, exist_ok=True)
    
    # Initialize Bedrock embeddings (same as AI Coach)
    embeddings = BedrockEmbeddings(
        model_id="amazon.titan-embed-text-v2:0",
        region_name=os.getenv("AWS_REGION", "us-west-2"),
    )
    
    # Create the client
    client = chromadb.PersistentClient(path=persist_directory)
    
    # Create the vector store
    vectordb = Chroma(
        client=client,
        embedding_function=embeddings,
        collection_name="archive_documents"
    )
    
    return vectordb

def get_archive_retriever(persist_directory="./archive_chroma_db"):
    """Get a retriever from the archive vector database."""
    # Initialize Bedrock embeddings
    embeddings = BedrockEmbeddings(
        model_id="amazon.titan-embed-text-v2:0",
        region_name=os.getenv("AWS_REGION", "us-west-2"),
    )
    
    # Load the existing vector store
    try:
        vectordb = Chroma(
            persist_directory=persist_directory,
            embedding_function=embeddings,
            collection_name="archive_documents"
        )
        return vectordb.as_retriever(search_kwargs={"k": 4})
    except Exception as e:
        print(f"Error loading archive vector database: {e}")
        return None

def add_document_to_vectordb(docs, persist_directory="./archive_chroma_db"):
    """
    Add document chunks to the vector database.
    
    Args:
        docs: List of dictionaries with text and metadata
        persist_directory: Directory for the vector database
    """
    try:
        # Initialize Bedrock embeddings
        embeddings = BedrockEmbeddings(
            model_id="amazon.titan-embed-text-v2:0",
            region_name=os.getenv("AWS_REGION", "us-west-2"),
        )
        
        # Get the vector database
        vectordb = Chroma(
            persist_directory=persist_directory,
            embedding_function=embeddings,
            collection_name="archive_documents"
        )
        
        # Format documents for Chroma
        texts = [doc["text"] for doc in docs]
        metadatas = [doc["metadata"] for doc in docs]
        ids = [f"{doc['metadata']['source']}_{doc['metadata']['chunk']}" for doc in docs]
        
        # Add documents to Chroma
        vectordb.add_texts(texts=texts, metadatas=metadatas, ids=ids)
        
        # Persist the changes
        vectordb.persist()
        
        return True
    except Exception as e:
        print(f"Error adding document to vector database: {e}")
        return False