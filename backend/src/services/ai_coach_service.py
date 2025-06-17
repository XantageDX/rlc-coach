# ### CLEAR CONVERSATION MEMORY ###
# # ai_coach_service.py
# from src.ai_coach.rag_chain import create_rag_chain
# import os

# # Keep multiple chains in memory, one per conversation
# _rag_chains = {}

# def get_rag_chain(conversation_id=None, model_id=None):
#     """Get or create the RAG chain for a specific conversation."""
#     global _rag_chains
    
#     # Use default conversation if none provided
#     if not conversation_id:
#         conversation_id = "default"
    
#     # Create a unique key for this conversation and model combination
#     chain_key = f"{conversation_id}_{model_id or 'default'}"
    
#     # If chain doesn't exist or model changed, create a new one
#     if chain_key not in _rag_chains:
#         chroma_db_path = os.path.join(os.path.dirname(__file__), "../../chroma_db")
#         _rag_chains[chain_key] = create_rag_chain(persist_directory=chroma_db_path, model_id=model_id)
#         print(f"Created new RAG chain for conversation: {conversation_id}")
    
#     return _rag_chains[chain_key]

# def clear_conversation_memory(conversation_id):
#     """Clear the memory for a specific conversation."""
#     global _rag_chains
    
#     # Remove all chains for this conversation (all models)
#     keys_to_remove = [key for key in _rag_chains.keys() if key.startswith(f"{conversation_id}_")]
#     for key in keys_to_remove:
#         del _rag_chains[key]
#         print(f"Cleared memory for conversation chain: {key}")

# async def ask_ai_coach(question: str, conversation_id: str = None, model_id: str = None):
#     """Ask a question to the AI Coach."""
#     try:
#         # Ensure we have a conversation ID
#         if not conversation_id:
#             conversation_id = "default"
            
#         chain = get_rag_chain(conversation_id, model_id)
#         result = chain({"question": question})
#         return {
#             "answer": result["answer"],
#             "conversation_id": conversation_id
#         }
#     except Exception as e:
#         print(f"Error in AI Coach: {e}")
#         return {
#             "error": "An error occurred while processing your question.",
#             "details": str(e)
#         }

# ### TENANTS

# # ai_coach_service.py
# from src.ai_coach.rag_chain import create_rag_chain
# from src.config.model_constants import LLM_MODEL
# import os

# # Tenant-scoped conversation storage for Phase 2 (preparing for Phase 5 isolation)
# _rag_chains = {}

# def get_rag_chain(conversation_id=None, tenant_id=None):
#     """
#     Get or create the RAG chain for a specific conversation with tenant scoping.
#     Model is now standardized to Llama 3.3 - no model selection needed.
#     """
#     global _rag_chains
    
#     # Use default conversation if none provided
#     if not conversation_id:
#         conversation_id = "default"
    
#     # Create tenant-scoped conversation key (Phase 5 preparation)
#     if tenant_id:
#         chain_key = f"tenant_{tenant_id}_{conversation_id}"
#     else:
#         # Super admin or system operations use global scope
#         chain_key = f"global_{conversation_id}"
    
#     # Create chain if it doesn't exist
#     if chain_key not in _rag_chains:
#         chroma_db_path = os.path.join(os.path.dirname(__file__), "../../chroma_db")
        
#         # Always use standardized Llama 3.3 model (no model selection)
#         _rag_chains[chain_key] = create_rag_chain(
#             persist_directory=chroma_db_path, 
#             model_id=LLM_MODEL  # Force Llama 3.3 70B
#         )
        
#         print(f"Created new RAG chain for conversation: {chain_key} using {LLM_MODEL}")
    
#     return _rag_chains[chain_key]

# def clear_conversation_memory(conversation_id, tenant_id=None):
#     """
#     Clear the memory for a specific conversation with tenant scoping.
#     """
#     global _rag_chains
    
#     # Create the same key format as get_rag_chain
#     if tenant_id:
#         chain_key = f"tenant_{tenant_id}_{conversation_id}"
#     else:
#         chain_key = f"global_{conversation_id}"
    
#     # Remove the specific chain
#     if chain_key in _rag_chains:
#         del _rag_chains[chain_key]
#         print(f"Cleared memory for conversation chain: {chain_key}")
#     else:
#         print(f"No conversation chain found for: {chain_key}")

# def get_conversation_history(conversation_id: str, tenant_id=None):
#     """
#     Get conversation history for a specific conversation with tenant scoping.
#     """
#     try:
#         # Get the chain (this will create it if it doesn't exist)
#         chain = get_rag_chain(conversation_id, tenant_id)
        
#         # Extract conversation history from the chain's memory
#         if hasattr(chain, 'memory') and hasattr(chain.memory, 'chat_memory'):
#             messages = chain.memory.chat_memory.messages
            
#             # Convert to a more readable format
#             history = []
#             for i in range(0, len(messages), 2):
#                 if i + 1 < len(messages):
#                     history.append({
#                         "question": messages[i].content,
#                         "answer": messages[i + 1].content,
#                         "timestamp": getattr(messages[i], 'timestamp', None)
#                     })
            
#             return history
        
#         return []
        
#     except Exception as e:
#         print(f"Error getting conversation history: {e}")
#         return []

# async def ask_ai_coach(question: str, conversation_id: str = None, model_id: str = None, tenant_id: str = None):
#     """
#     Ask a question to the AI Coach with standardized model and tenant scoping.
    
#     Args:
#         question: The user's question
#         conversation_id: Conversation identifier for memory
#         model_id: IGNORED - always uses standardized Llama 3.3
#         tenant_id: Tenant identifier for conversation isolation
#     """
#     try:
#         # Ensure we have a conversation ID
#         if not conversation_id:
#             conversation_id = "default"
        
#         # Get RAG chain with tenant scoping (model is standardized)
#         chain = get_rag_chain(conversation_id, tenant_id)
        
#         # Process the question
#         result = chain({"question": question})
        
#         return {
#             "answer": result["answer"],
#             "conversation_id": conversation_id,
#             "model_used": LLM_MODEL,  # Always Llama 3.3
#             "tenant_id": tenant_id,
#             "sources": result.get("source_documents", [])
#         }
        
#     except Exception as e:
#         print(f"Error in AI Coach: {e}")
#         return {
#             "error": "An error occurred while processing your question.",
#             "details": str(e),
#             "model_used": LLM_MODEL,
#             "conversation_id": conversation_id,
#             "tenant_id": tenant_id
#         }

# def clear_all_conversations(tenant_id=None):
#     """
#     Clear all conversations for a specific tenant (or all global conversations).
#     Useful for testing or admin operations.
#     """
#     global _rag_chains
    
#     if tenant_id:
#         # Clear all conversations for a specific tenant
#         prefix = f"tenant_{tenant_id}_"
#         keys_to_remove = [key for key in _rag_chains.keys() if key.startswith(prefix)]
#     else:
#         # Clear all global conversations
#         keys_to_remove = [key for key in _rag_chains.keys() if key.startswith("global_")]
    
#     for key in keys_to_remove:
#         del _rag_chains[key]
    
#     print(f"Cleared {len(keys_to_remove)} conversation chains for tenant: {tenant_id or 'global'}")

# def get_active_conversations():
#     """
#     Get list of active conversations (for debugging/admin purposes).
#     """
#     global _rag_chains
    
#     conversations = {
#         "total_chains": len(_rag_chains),
#         "conversations": []
#     }
    
#     for chain_key in _rag_chains.keys():
#         if chain_key.startswith("tenant_"):
#             # Parse tenant conversation
#             parts = chain_key.split("_", 2)
#             if len(parts) >= 3:
#                 conversations["conversations"].append({
#                     "type": "tenant",
#                     "tenant_id": parts[1],
#                     "conversation_id": parts[2],
#                     "chain_key": chain_key
#                 })
#         elif chain_key.startswith("global_"):
#             # Parse global conversation
#             conversation_id = chain_key.replace("global_", "")
#             conversations["conversations"].append({
#                 "type": "global",
#                 "tenant_id": None,
#                 "conversation_id": conversation_id,
#                 "chain_key": chain_key
#             })
    
#     return conversations

#### PHASE 5.1 ####

# ai_coach_service.py
from src.ai_coach.rag_chain import create_rag_chain
from src.config.model_constants import LLM_MODEL
import os
from datetime import datetime

# Tenant-scoped conversation storage for Phase 2 (preparing for Phase 5 isolation)
_rag_chains = {}

def get_rag_chain(conversation_id=None, tenant_id=None):
    """
    Get or create the RAG chain for a specific conversation with tenant scoping.
    Model is now standardized to Llama 3.3 - no model selection needed.
    """
    global _rag_chains
    
    # Use default conversation if none provided
    if not conversation_id:
        conversation_id = "default"
    
    # Create tenant-scoped conversation key (Phase 5 preparation)
    if tenant_id:
        chain_key = f"tenant_{tenant_id}_{conversation_id}"
    else:
        # Super admin or system operations use global scope
        chain_key = f"global_{conversation_id}"
    
    # Create chain if it doesn't exist
    if chain_key not in _rag_chains:
        chroma_db_path = os.path.join(os.path.dirname(__file__), "../../chroma_db")
        
        # Always use standardized Llama 3.3 model (no model selection)
        _rag_chains[chain_key] = create_rag_chain(
            persist_directory=chroma_db_path, 
            model_id=LLM_MODEL  # Force Llama 3.3 70B
        )
        
        print(f"Created new RAG chain for conversation: {chain_key} using {LLM_MODEL}")
    
    return _rag_chains[chain_key]

def clear_conversation_memory(conversation_id, tenant_id=None):
    """
    Clear the memory for a specific conversation with tenant scoping.
    """
    global _rag_chains
    
    # Create the same key format as get_rag_chain
    if tenant_id:
        chain_key = f"tenant_{tenant_id}_{conversation_id}"
    else:
        chain_key = f"global_{conversation_id}"
    
    # Remove the specific chain
    if chain_key in _rag_chains:
        del _rag_chains[chain_key]
        print(f"Cleared memory for conversation chain: {chain_key}")
        return True  # NEW: Return success status
    else:
        print(f"No conversation chain found for: {chain_key}")
        return False  # NEW: Return failure status

def get_conversation_history(conversation_id: str, tenant_id=None):
    """
    Get conversation history for a specific conversation with tenant scoping.
    """
    try:
        # Get the chain (this will create it if it doesn't exist)
        chain = get_rag_chain(conversation_id, tenant_id)
        
        # Extract conversation history from the chain's memory
        if hasattr(chain, 'memory') and hasattr(chain.memory, 'chat_memory'):
            messages = chain.memory.chat_memory.messages
            
            # Convert to a more readable format
            history = []
            for i in range(0, len(messages), 2):
                if i + 1 < len(messages):
                    history.append({
                        "question": messages[i].content,
                        "answer": messages[i + 1].content,
                        "timestamp": getattr(messages[i], 'timestamp', None)
                    })
            
            return history
        
        return []
        
    except Exception as e:
        print(f"Error getting conversation history: {e}")
        return []

async def ask_ai_coach(question: str, conversation_id: str = None, model_id: str = None, tenant_id: str = None):
    """
    Ask a question to the AI Coach with standardized model and tenant scoping.
    
    Args:
        question: The user's question
        conversation_id: Conversation identifier for memory
        model_id: IGNORED - always uses standardized Llama 3.3
        tenant_id: Tenant identifier for conversation isolation
    """
    try:
        # Ensure we have a conversation ID
        if not conversation_id:
            conversation_id = "default"
        
        # Get RAG chain with tenant scoping (model is standardized)
        chain = get_rag_chain(conversation_id, tenant_id)
        
        # Process the question
        result = chain({"question": question})
        
        return {
            "answer": result["answer"],
            "conversation_id": conversation_id,
            "model_used": LLM_MODEL,  # Always Llama 3.3
            "tenant_id": tenant_id,
            "sources": result.get("source_documents", [])
        }
        
    except Exception as e:
        print(f"Error in AI Coach: {e}")
        return {
            "error": "An error occurred while processing your question.",
            "details": str(e),
            "model_used": LLM_MODEL,
            "conversation_id": conversation_id,
            "tenant_id": tenant_id
        }

def clear_all_conversations(tenant_id=None):
    """
    Clear all conversations for a specific tenant (or all global conversations).
    Useful for testing or admin operations.
    """
    global _rag_chains
    
    if tenant_id:
        # Clear all conversations for a specific tenant
        prefix = f"tenant_{tenant_id}_"
        keys_to_remove = [key for key in _rag_chains.keys() if key.startswith(prefix)]
    else:
        # Clear all global conversations
        keys_to_remove = [key for key in _rag_chains.keys() if key.startswith("global_")]
    
    for key in keys_to_remove:
        del _rag_chains[key]
    
    print(f"Cleared {len(keys_to_remove)} conversation chains for tenant: {tenant_id or 'global'}")

def get_active_conversations(requesting_tenant_id=None):
    """
    Get list of active conversations with optional tenant filtering.
    """
    global _rag_chains
    
    conversations = {
        "total_chains": len(_rag_chains),
        "conversations": [],
        "requesting_tenant": requesting_tenant_id  # NEW: Track who's requesting
    }
    
    for chain_key in _rag_chains.keys():
        include_conversation = False
        
        if chain_key.startswith("tenant_"):
            # Parse tenant conversation
            parts = chain_key.split("_", 2)
            if len(parts) >= 3:
                conversation_tenant_id = parts[1]
                conversation_id = parts[2]
                
                conversation_info = {
                    "type": "tenant",
                    "tenant_id": conversation_tenant_id,
                    "conversation_id": conversation_id,
                    "chain_key": chain_key
                }
                
                # NEW: Only show conversations the requester can access
                if requesting_tenant_id is None or requesting_tenant_id == conversation_tenant_id:
                    include_conversation = True
                    
        elif chain_key.startswith("global_"):
            # Parse global conversation
            conversation_id = chain_key.replace("global_", "")
            conversation_info = {
                "type": "global",
                "tenant_id": None,
                "conversation_id": conversation_id,
                "chain_key": chain_key
            }
            
            # Only super admin (requesting_tenant_id=None) can see global conversations
            if requesting_tenant_id is None:
                include_conversation = True
        
        if include_conversation:
            conversations["conversations"].append(conversation_info)
    
    conversations["total_chains"] = len(conversations["conversations"])  # NEW: Update count
    return conversations