"""
AWS Bedrock Knowledge Base Creation and Management Service.
Handles Knowledge Base creation in tenant accounts with Cohere embeddings.
Uses standardized models from Phase 2 and cross-account framework from existing infrastructure.
"""

import boto3
import json
import time
from datetime import datetime
from typing import Dict, Optional
from botocore.exceptions import ClientError
from src.utils.db import db
from src.utils.cross_account_client import CrossAccountClient
from src.config.model_constants import EMBEDDING_MODEL  # From Phase 2
from bson import ObjectId

class KnowledgeBaseService:
    """Service for creating and managing AWS Bedrock Knowledge Bases in tenant accounts."""
    
    def __init__(self):
        self.tenants_collection = db["tenants"]
        
    async def create_knowledge_base(self, tenant_id: str) -> Dict:
        """
        Create Bedrock Knowledge Base in tenant account with Cohere embeddings.
        
        Args:
            tenant_id: Database ID of the tenant
            
        Returns:
            Dict with creation results and Knowledge Base information
        """
        try:
            # Get tenant from database
            tenant = self.tenants_collection.find_one({"_id": ObjectId(tenant_id)})
            if not tenant:
                return {
                    "success": False,
                    "error": "Tenant not found"
                }
            
            aws_account_id = tenant.get("aws_account_id")
            s3_bucket_name = tenant.get("s3_bucket_name")
            tenant_name = tenant["name"]
            
            if not aws_account_id:
                return {
                    "success": False,
                    "error": "Tenant has no AWS account"
                }
            
            if not s3_bucket_name:
                return {
                    "success": False,
                    "error": "Tenant has no S3 bucket configured"
                }
            
            print(f"Creating Knowledge Base for tenant: {tenant_name} in account: {aws_account_id}")
            
            # Step 1: Create Knowledge Base execution role in tenant account
            role_result = await self._create_kb_execution_role(aws_account_id, tenant_name, s3_bucket_name)
            if not role_result["success"]:
                return role_result
            
            # Step 2: Create the Knowledge Base
            kb_result = await self._create_bedrock_knowledge_base(
                aws_account_id, 
                tenant_name, 
                s3_bucket_name,
                role_result["role_arn"]
            )
            if not kb_result["success"]:
                return kb_result
            
            # Step 3: Create data source for the Knowledge Base
            ds_result = await self._create_knowledge_base_data_source(
                aws_account_id,
                kb_result["knowledge_base_id"],
                s3_bucket_name,
                tenant_name
            )
            if not ds_result["success"]:
                return ds_result
            
            # Step 4: Update tenant record with Knowledge Base information
            self.tenants_collection.update_one(
                {"_id": ObjectId(tenant_id)},
                {
                    "$set": {
                        "bedrock_kb_id": kb_result["knowledge_base_id"],
                        "kb_status": "READY",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            print(f"Successfully created Knowledge Base for tenant: {tenant_name}")
            
            return {
                "success": True,
                "message": "Knowledge Base created successfully",
                "knowledge_base_id": kb_result["knowledge_base_id"],
                "data_source_id": ds_result["data_source_id"],
                "status": "READY"
            }
            
        except Exception as e:
            print(f"Error creating Knowledge Base: {str(e)}")
            # Update tenant with error status
            self.tenants_collection.update_one(
                {"_id": ObjectId(tenant_id)},
                {
                    "$set": {
                        "kb_status": "FAILED",
                        "error_message": f"KB creation failed: {str(e)}",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            return {
                "success": False,
                "error": "Knowledge Base Creation Failed",
                "message": str(e)
            }
    
    async def _create_kb_execution_role(self, aws_account_id: str, tenant_name: str, s3_bucket_name: str) -> Dict:
        """
        Create IAM execution role for Bedrock Knowledge Base.
        
        Args:
            aws_account_id: Tenant AWS account ID
            tenant_name: Name of the tenant
            s3_bucket_name: S3 bucket for the data source
            
        Returns:
            Dict with role creation result and ARN
        """
        try:
            print(f"Creating KB execution role for tenant: {tenant_name}")
            
            # Get IAM client for tenant account
            iam_client = CrossAccountClient.get_tenant_iam_client(aws_account_id)
            
            # Define trust policy for Bedrock service
            trust_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "bedrock.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }
            
            # Define permissions policy for S3 access
            permissions_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": [
                            "s3:GetObject",
                            "s3:ListBucket"
                        ],
                        "Resource": [
                            f"arn:aws:s3:::{s3_bucket_name}",
                            f"arn:aws:s3:::{s3_bucket_name}/*"
                        ]
                    },
                    {
                        "Effect": "Allow",
                        "Action": [
                            "bedrock:InvokeModel"
                        ],
                        "Resource": f"arn:aws:bedrock:us-east-1::foundation-model/{EMBEDDING_MODEL}"
                    }
                ]
            }
            
            role_name = f"AmazonBedrockExecutionRoleForKnowledgeBase_{tenant_name.replace(' ', '')}"
            
            # Create the IAM role
            try:
                iam_client.create_role(
                    RoleName=role_name,
                    AssumeRolePolicyDocument=json.dumps(trust_policy),
                    Description=f"Execution role for {tenant_name} Knowledge Base",
                    MaxSessionDuration=3600
                )
                print(f"Created KB execution role: {role_name}")
            except ClientError as e:
                if e.response['Error']['Code'] == 'EntityAlreadyExists':
                    print(f"KB execution role already exists: {role_name}")
                else:
                    raise e
            
            # Create and attach permissions policy
            policy_name = f"KnowledgeBaseExecutionPolicy_{tenant_name.replace(' ', '')}"
            try:
                iam_client.create_policy(
                    PolicyName=policy_name,
                    PolicyDocument=json.dumps(permissions_policy),
                    Description=f"Permissions for {tenant_name} Knowledge Base execution"
                )
                print(f"Created KB execution policy: {policy_name}")
            except ClientError as e:
                if e.response['Error']['Code'] == 'EntityAlreadyExists':
                    print(f"KB execution policy already exists: {policy_name}")
                else:
                    raise e
            
            # Attach policy to role
            iam_client.attach_role_policy(
                RoleName=role_name,
                PolicyArn=f"arn:aws:iam::{aws_account_id}:policy/{policy_name}"
            )
            
            role_arn = f"arn:aws:iam::{aws_account_id}:role/{role_name}"
            
            # Wait a bit for role propagation
            time.sleep(10)
            
            print(f"Successfully configured KB execution role: {role_arn}")
            
            return {
                "success": True,
                "role_arn": role_arn,
                "role_name": role_name
            }
            
        except Exception as e:
            print(f"Error creating KB execution role: {str(e)}")
            return {
                "success": False,
                "error": f"KB execution role creation failed: {str(e)}"
            }
    
    async def _create_bedrock_knowledge_base(self, aws_account_id: str, tenant_name: str, 
                                           s3_bucket_name: str, execution_role_arn: str) -> Dict:
        """
        Create the actual Bedrock Knowledge Base.
        
        Args:
            aws_account_id: Tenant AWS account ID
            tenant_name: Name of the tenant
            s3_bucket_name: S3 bucket for data source
            execution_role_arn: ARN of the execution role
            
        Returns:
            Dict with Knowledge Base creation result
        """
        try:
            print(f"Creating Bedrock Knowledge Base for tenant: {tenant_name}")
            
            # Get Bedrock Agent client for tenant account
            credentials = CrossAccountClient.assume_tenant_role(aws_account_id, "bedrock-agent")
            
            bedrock_agent_client = boto3.client(
                'bedrock-agent',
                aws_access_key_id=credentials['AccessKeyId'],
                aws_secret_access_key=credentials['SecretAccessKey'],
                aws_session_token=credentials['SessionToken'],
                region_name='us-east-1'
            )
            
            # Generate safe name for Knowledge Base
            safe_name = self._generate_safe_name(tenant_name)
            kb_name = f"tenant-{safe_name}-kb"
            
            # Knowledge Base configuration using Phase 2 standardized embedding model
            kb_config = {
                'name': kb_name,
                'description': f'Knowledge Base for {tenant_name} tenant documents',
                'roleArn': execution_role_arn,
                'knowledgeBaseConfiguration': {
                    'type': 'VECTOR',
                    'vectorKnowledgeBaseConfiguration': {
                        'embeddingModelArn': f'arn:aws:bedrock:us-east-1::foundation-model/{EMBEDDING_MODEL}',
                        'embeddingModelConfiguration': {
                            'bedrockEmbeddingModelConfiguration': {
                                'dimensions': 1024  # Cohere Multilingual v3 dimensions
                            }
                        }
                    }
                },
                'storageConfiguration': {
                    'type': 'OPENSEARCH_SERVERLESS',
                    'opensearchServerlessConfiguration': {
                        'collectionArn': f'arn:aws:aoss:us-east-1:{aws_account_id}:collection/{safe_name}-kb-collection',
                        'vectorIndexName': f'{safe_name}-kb-index',
                        'fieldMapping': {
                            'vectorField': 'vector',
                            'textField': 'text',
                            'metadataField': 'metadata'
                        }
                    }
                }
            }
            
            # Create the Knowledge Base
            response = bedrock_agent_client.create_knowledge_base(**kb_config)
            
            knowledge_base_id = response['knowledgeBase']['knowledgeBaseId']
            
            print(f"Successfully created Knowledge Base: {knowledge_base_id} for tenant: {tenant_name}")
            
            return {
                "success": True,
                "knowledge_base_id": knowledge_base_id,
                "name": kb_name
            }
            
        except Exception as e:
            print(f"Error creating Bedrock Knowledge Base: {str(e)}")
            return {
                "success": False,
                "error": f"Bedrock Knowledge Base creation failed: {str(e)}"
            }
    
    async def _create_knowledge_base_data_source(self, aws_account_id: str, knowledge_base_id: str,
                                                s3_bucket_name: str, tenant_name: str) -> Dict:
        """
        Create data source for the Knowledge Base.
        
        Args:
            aws_account_id: Tenant AWS account ID
            knowledge_base_id: ID of the created Knowledge Base
            s3_bucket_name: S3 bucket containing documents
            tenant_name: Name of the tenant
            
        Returns:
            Dict with data source creation result
        """
        try:
            print(f"Creating data source for Knowledge Base: {knowledge_base_id}")
            
            # Get Bedrock Agent client for tenant account
            credentials = CrossAccountClient.assume_tenant_role(aws_account_id, "bedrock-agent")
            
            bedrock_agent_client = boto3.client(
                'bedrock-agent',
                aws_access_key_id=credentials['AccessKeyId'],
                aws_secret_access_key=credentials['SecretAccessKey'],
                aws_session_token=credentials['SessionToken'],
                region_name='us-east-1'
            )
            
            # Generate safe name for data source
            safe_name = self._generate_safe_name(tenant_name)
            ds_name = f"tenant-{safe_name}-documents"
            
            # Data source configuration
            ds_config = {
                'knowledgeBaseId': knowledge_base_id,
                'name': ds_name,
                'description': f'Document source for {tenant_name} tenant',
                'dataSourceConfiguration': {
                    'type': 'S3',
                    's3Configuration': {
                        'bucketArn': f'arn:aws:s3:::{s3_bucket_name}',
                        'inclusionPrefixes': [''],  # Include all files
                        'bucketOwnerAccountId': aws_account_id
                    }
                },
                'vectorIngestionConfiguration': {
                    'chunkingConfiguration': {
                        'chunkingStrategy': 'FIXED_SIZE',
                        'fixedSizeChunkingConfiguration': {
                            'maxTokens': 512,
                            'overlapPercentage': 20
                        }
                    },
                    'parsingConfiguration': {
                        'parsingStrategy': 'BEDROCK_FOUNDATION_MODEL',
                        'bedrockFoundationModelConfiguration': {
                            'modelArn': 'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
                            'parsingPrompt': {
                                'parsingPromptText': 'Extract and preserve all text content from this document, maintaining structure and context.'
                            }
                        }
                    }
                }
            }
            
            # Create the data source
            response = bedrock_agent_client.create_data_source(**ds_config)
            
            data_source_id = response['dataSource']['dataSourceId']
            
            print(f"Successfully created data source: {data_source_id} for Knowledge Base: {knowledge_base_id}")
            
            return {
                "success": True,
                "data_source_id": data_source_id,
                "name": ds_name
            }
            
        except Exception as e:
            print(f"Error creating Knowledge Base data source: {str(e)}")
            return {
                "success": False,
                "error": f"Knowledge Base data source creation failed: {str(e)}"
            }
    
    async def get_knowledge_base_status(self, tenant_id: str) -> Dict:
        """
        Get the status of tenant's Knowledge Base.
        
        Args:
            tenant_id: Database ID of the tenant
            
        Returns:
            Dict with Knowledge Base status information
        """
        try:
            # Get tenant from database
            tenant = self.tenants_collection.find_one({"_id": ObjectId(tenant_id)})
            if not tenant:
                return {
                    "success": False,
                    "error": "Tenant not found"
                }
            
            kb_id = tenant.get("bedrock_kb_id")
            if not kb_id:
                return {
                    "success": True,
                    "status": "NOT_CREATED",
                    "message": "Knowledge Base not yet created"
                }
            
            aws_account_id = tenant.get("aws_account_id")
            
            # Get Bedrock Agent client for tenant account
            credentials = CrossAccountClient.assume_tenant_role(aws_account_id, "bedrock-agent")
            
            bedrock_agent_client = boto3.client(
                'bedrock-agent',
                aws_access_key_id=credentials['AccessKeyId'],
                aws_secret_access_key=credentials['SecretAccessKey'],
                aws_session_token=credentials['SessionToken'],
                region_name='us-east-1'
            )
            
            # Get Knowledge Base details
            response = bedrock_agent_client.get_knowledge_base(knowledgeBaseId=kb_id)
            kb_status = response['knowledgeBase']['status']
            
            return {
                "success": True,
                "kb_id": kb_id,
                "status": kb_status,
                "name": response['knowledgeBase']['name'],
                "created_at": response['knowledgeBase']['createdAt'],
                "updated_at": response['knowledgeBase']['updatedAt']
            }
            
        except Exception as e:
            print(f"Error getting Knowledge Base status: {str(e)}")
            return {
                "success": False,
                "error": f"Knowledge Base status check failed: {str(e)}"
            }
    
    async def start_ingestion_job(self, tenant_id: str) -> Dict:
        """
        Start an ingestion job to index documents in the Knowledge Base.
        
        Args:
            tenant_id: Database ID of the tenant
            
        Returns:
            Dict with ingestion job result
        """
        try:
            # Get tenant from database
            tenant = self.tenants_collection.find_one({"_id": ObjectId(tenant_id)})
            if not tenant:
                return {
                    "success": False,
                    "error": "Tenant not found"
                }
            
            kb_id = tenant.get("bedrock_kb_id")
            aws_account_id = tenant.get("aws_account_id")
            
            if not kb_id:
                return {
                    "success": False,
                    "error": "No Knowledge Base configured for tenant"
                }
            
            # Get Bedrock Agent client for tenant account
            credentials = CrossAccountClient.assume_tenant_role(aws_account_id, "bedrock-agent")
            
            bedrock_agent_client = boto3.client(
                'bedrock-agent',
                aws_access_key_id=credentials['AccessKeyId'],
                aws_secret_access_key=credentials['SecretAccessKey'],
                aws_session_token=credentials['SessionToken'],
                region_name='us-east-1'
            )
            
            # List data sources to get the first one
            ds_response = bedrock_agent_client.list_data_sources(knowledgeBaseId=kb_id)
            if not ds_response['dataSourceSummaries']:
                return {
                    "success": False,
                    "error": "No data sources configured for Knowledge Base"
                }
            
            data_source_id = ds_response['dataSourceSummaries'][0]['dataSourceId']
            
            # Start ingestion job
            ingestion_response = bedrock_agent_client.start_ingestion_job(
                knowledgeBaseId=kb_id,
                dataSourceId=data_source_id,
                description=f"Document ingestion for tenant {tenant['name']}"
            )
            
            job_id = ingestion_response['ingestionJob']['ingestionJobId']
            
            print(f"Started ingestion job: {job_id} for tenant: {tenant['name']}")
            
            return {
                "success": True,
                "job_id": job_id,
                "status": "STARTING",
                "message": "Document ingestion started"
            }
            
        except Exception as e:
            print(f"Error starting ingestion job: {str(e)}")
            return {
                "success": False,
                "error": f"Ingestion job failed to start: {str(e)}"
            }
    
    def _generate_safe_name(self, tenant_name: str) -> str:
        """
        Generate AWS-safe name from tenant name (matching existing pattern).
        
        Args:
            tenant_name: Original tenant name
            
        Returns:
            Safe name for AWS resources
        """
        # Convert to lowercase, replace spaces and special chars with hyphens
        safe_name = tenant_name.lower()
        safe_name = ''.join(c if c.isalnum() else '-' for c in safe_name)
        safe_name = '-'.join(filter(None, safe_name.split('-')))  # Remove multiple hyphens
        
        # Limit length for AWS resource naming requirements
        safe_name = safe_name[:20]
        
        return safe_name

# Global service instance
knowledge_base_service = KnowledgeBaseService()