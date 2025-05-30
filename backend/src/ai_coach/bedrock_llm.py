import os
from langchain_aws import ChatBedrock
from dotenv import load_dotenv

load_dotenv()

def get_bedrock_llm(model_id=None):
    """
    Initialize AWS Bedrock LLM client with the specified model.
    
    Args:
        model_id (str, optional): The model ID to use. If None, defaults to Llama 3.1 8B.
    """
    # If no model_id is provided, use default
    if not model_id:
        model_id = "meta.llama3-8b-instruct-v1:0"
    
    # Base parameters that work for all models
    model_kwargs = {
        "temperature": 0,
        "top_p": 0.9,
    }
    
    # Add model-specific parameters based on model family
    if "llama" in model_id:
        model_kwargs["max_tokens"] = 1000
    elif "mistral" in model_id or "mixtral" in model_id:
        model_kwargs["max_tokens"] = 1000
        # Mistral/Mixtral might use slightly different parameter formatting,
        # but LangChain's ChatBedrock adapts these automatically
    
    llm = ChatBedrock(
        model_id=model_id,
        region_name=os.getenv("AWS_REGION", "us-east-1"),
        model_kwargs=model_kwargs
    )
    return llm