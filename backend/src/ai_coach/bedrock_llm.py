# import os
# from langchain_aws import ChatBedrock
# from dotenv import load_dotenv

# load_dotenv()

# def get_bedrock_llm():
#     """Initialize AWS Bedrock LLM client."""
#     # For Claude 3 Sonnet
#     llm = ChatBedrock(
#         #model_id="us.meta.llama3-3-70b-instruct-v1:0",
#         model_id="us.meta.llama3-1-8b-instruct-v1:0",
#         region_name=os.getenv("AWS_REGION", "us-west-2"),
#         model_kwargs={
#             "temperature": 0,
#             "max_gen_len": 1000,
#             "top_p": 0.9,
#         }
#     )
#     return llm

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
        model_id = "us.meta.llama3-1-8b-instruct-v1:0"
    
    # Configure appropriate parameters based on model
    if "llama" in model_id:
        model_kwargs = {
            "temperature": 0,
            "max_gen_len": 1000,
            "top_p": 0.9,
        }
    else:  # For Mistral models
        model_kwargs = {
            "temperature": 0,
            "top_p": 0.9,
            "max_tokens": 1000
        }
    
    llm = ChatBedrock(
        model_id=model_id,
        region_name=os.getenv("AWS_REGION", "us-east-1"),
        model_kwargs=model_kwargs
    )
    return llm