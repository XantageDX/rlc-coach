import os
from langchain_aws import ChatBedrock
from dotenv import load_dotenv

load_dotenv()

def get_bedrock_llm():
    """Initialize AWS Bedrock LLM client."""
    # For Claude 3 Sonnet
    llm = ChatBedrock(
        #model_id="us.meta.llama3-3-70b-instruct-v1:0", #meta.llama3-1-8b-instruct-v1:0
        model_id="us.meta.llama3-1-8b-instruct-v1:0",
        region_name=os.getenv("AWS_REGION", "us-west-2"),
        model_kwargs={
            "temperature": 0,
            "max_gen_len": 1000,
            "top_p": 0.9,
        }
    )
    return llm