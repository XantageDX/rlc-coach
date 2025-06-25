# Standardized AI Model Constants for Phase 2
# Location: backend/src/config/model_constants.py

# Standardized Models (Phase 2 - Single models for all operations)
LLM_MODEL = "us.meta.llama3-3-70b-instruct-v1:0"
EMBEDDING_MODEL = "cohere.embed-multilingual-v3"

# Model configuration for Llama 3.3 70B
LLAMA_MODEL_KWARGS = {
    "temperature": 0,
    "top_p": 0.9,
    "max_tokens": 4000
}

# Model configuration for Cohere embeddings
COHERE_EMBEDDING_KWARGS = {
    "input_type": "search_document",  # For document indexing
    "truncate": "END"  # Truncate from end if too long
}

# Available models list (simplified for Phase 2)
AVAILABLE_MODELS = [
    {
        "id": LLM_MODEL,
        "name": "Llama 3.3 70B (Standardized)",
        "description": "High-quality standardized model for all operations",
        "standardized": True
    }
]

# Deprecated models (Phase 1 - Remove these in frontend)
DEPRECATED_MODELS = [
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "anthropic.claude-3-haiku-20240307-v1:0", 
    "meta.llama3-8b-instruct-v1:0",
    "meta.llama3-70b-instruct-v1:0",
    "amazon.titan-embed-text-v1"
]