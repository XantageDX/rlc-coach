import json
import boto3
import os
from typing import List
from langchain_core.embeddings import Embeddings

class CohereBedrockEmbeddings(Embeddings):
    """Custom Cohere embeddings for Bedrock that properly formats parameters"""
    
    def __init__(self, model_id: str = "cohere.embed-multilingual-v3", region_name: str = "us-east-1"):
        self.model_id = model_id
        self.region_name = region_name
        self.client = boto3.client('bedrock-runtime', region_name=region_name)
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed documents using Cohere via Bedrock"""
        return self._embed_texts(texts, "search_document")
    
    def embed_query(self, text: str) -> List[float]:
        """Embed query using Cohere via Bedrock"""
        return self._embed_texts([text], "search_query")[0]
    
    def _embed_texts(self, texts: List[str], input_type: str) -> List[List[float]]:
        """Internal method to embed texts"""
        # Process in batches of 96 (Cohere limit)
        batch_size = 96
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            # Prepare request body according to AWS docs
            body = json.dumps({
                "texts": batch,
                "input_type": input_type,
                "truncate": "END"  # Handle long texts
            })
            
            try:
                response = self.client.invoke_model(
                    body=body,
                    modelId=self.model_id,
                    contentType="application/json",
                    accept="*/*"
                )
                
                response_body = json.loads(response['body'].read())
                embeddings = response_body['embeddings']
                all_embeddings.extend(embeddings)
                
            except Exception as e:
                print(f"Error in Cohere embedding batch: {e}")
                raise e
        
        return all_embeddings