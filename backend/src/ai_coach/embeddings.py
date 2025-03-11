import os
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_aws import BedrockEmbeddings
from langchain_community.vectorstores import Chroma
import chromadb

def load_and_split_documents(docs_directory):
    """Load documents from a directory and split them into chunks."""
    loader = DirectoryLoader(
        docs_directory,
        glob="**/*.txt",
        loader_cls=TextLoader
    )
    documents = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    
    chunks = text_splitter.split_documents(documents)
    return chunks

def initialize_vector_db(chunks, persist_directory="./chroma_db"):
    """Initialize the vector database with document chunks."""
    # Initialize Bedrock embeddings
    embeddings = BedrockEmbeddings(
        model_id="amazon.titan-embed-text-v1",
        region_name=os.getenv("AWS_REGION", "us-west-2"),
    )
    
    # Create and persist the vector store
    vectordb = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=persist_directory
    )
    
    return vectordb

def get_retriever(persist_directory="./chroma_db"):
    """Get a retriever from an existing vector database."""
    # Initialize Bedrock embeddings
    embeddings = BedrockEmbeddings(
        model_id="amazon.titan-embed-text-v1",
        region_name=os.getenv("AWS_REGION", "us-west-2"),
    )
    
    # Load the existing vector store
    try:
        vectordb = Chroma(
            persist_directory=persist_directory,
            embedding_function=embeddings
        )
        return vectordb.as_retriever(search_kwargs={"k": 4})
    except Exception as e:
        print(f"Error loading vector database: {e}")
        return None