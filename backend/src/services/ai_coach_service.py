# # ai_coach_service.py
# from src.ai_coach.rag_chain import create_rag_chain
# import os

# # Keep the chain in memory for reuse
# _rag_chain = None
# _current_model_id = None

# def get_rag_chain(model_id=None):
#     """Get or create the RAG chain, optionally with a specific model."""
#     global _rag_chain, _current_model_id
#     # If model changed or no chain exists, create a new one
#     if _rag_chain is None or (model_id and model_id != _current_model_id):
#         chroma_db_path = os.path.join(os.path.dirname(__file__), "../../chroma_db")
#         _rag_chain = create_rag_chain(persist_directory=chroma_db_path, model_id=model_id)
#         _current_model_id = model_id
        
#     return _rag_chain

# async def ask_ai_coach(question: str, conversation_id: str = None, model_id: str = None):
#     """Ask a question to the AI Coach."""
#     try:
#         chain = get_rag_chain(model_id)
#         result = chain({"question": question})
#         return {
#             "answer": result["answer"],
#             "conversation_id": conversation_id or "default"
#         }
#     except Exception as e:
#         print(f"Error in AI Coach: {e}")
#         return {
#             "error": "An error occurred while processing your question.",
#             "details": str(e)
#         }

### CLEAR CONVERSATION MEMORY ###
# ai_coach_service.py
from src.ai_coach.rag_chain import create_rag_chain
import os

# Keep multiple chains in memory, one per conversation
_rag_chains = {}

def get_rag_chain(conversation_id=None, model_id=None):
    """Get or create the RAG chain for a specific conversation."""
    global _rag_chains
    
    # Use default conversation if none provided
    if not conversation_id:
        conversation_id = "default"
    
    # Create a unique key for this conversation and model combination
    chain_key = f"{conversation_id}_{model_id or 'default'}"
    
    # If chain doesn't exist or model changed, create a new one
    if chain_key not in _rag_chains:
        chroma_db_path = os.path.join(os.path.dirname(__file__), "../../chroma_db")
        _rag_chains[chain_key] = create_rag_chain(persist_directory=chroma_db_path, model_id=model_id)
        print(f"Created new RAG chain for conversation: {conversation_id}")
    
    return _rag_chains[chain_key]

def clear_conversation_memory(conversation_id):
    """Clear the memory for a specific conversation."""
    global _rag_chains
    
    # Remove all chains for this conversation (all models)
    keys_to_remove = [key for key in _rag_chains.keys() if key.startswith(f"{conversation_id}_")]
    for key in keys_to_remove:
        del _rag_chains[key]
        print(f"Cleared memory for conversation chain: {key}")

async def ask_ai_coach(question: str, conversation_id: str = None, model_id: str = None):
    """Ask a question to the AI Coach."""
    try:
        # Ensure we have a conversation ID
        if not conversation_id:
            conversation_id = "default"
            
        chain = get_rag_chain(conversation_id, model_id)
        result = chain({"question": question})
        return {
            "answer": result["answer"],
            "conversation_id": conversation_id
        }
    except Exception as e:
        print(f"Error in AI Coach: {e}")
        return {
            "error": "An error occurred while processing your question.",
            "details": str(e)
        }