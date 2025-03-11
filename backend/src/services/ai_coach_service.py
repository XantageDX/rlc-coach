# ai_coach_service.py
from src.ai_coach.rag_chain import create_rag_chain
import os

# Keep the chain in memory for reuse
_rag_chain = None

def get_rag_chain():
    """Get or create the RAG chain."""
    global _rag_chain
    if _rag_chain is None:
        chroma_db_path = os.path.join(os.path.dirname(__file__), "../../chroma_db")
        _rag_chain = create_rag_chain(persist_directory=chroma_db_path)
    return _rag_chain

async def ask_ai_coach(question: str, conversation_id: str = None):
    """Ask a question to the AI Coach."""
    try:
        chain = get_rag_chain()
        result = chain({"question": question})
        return {
            "answer": result["answer"],
            "conversation_id": conversation_id or "default"
        }
    except Exception as e:
        print(f"Error in AI Coach: {e}")
        return {
            "error": "An error occurred while processing your question.",
            "details": str(e)
        }