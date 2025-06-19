# #### PHASE 3.2 ####
# """
# AWS Resource Provisioning Service for Tenant Accounts.
# Handles S3 bucket creation, IAM role setup, and resource management in tenant AWS accounts.
# Builds on existing tenant_aws_service.py patterns and cross_account_client.py framework.
# Enhanced with Phase 3.2 Knowledge Base integration.
# """

# import boto3
# import json
# from datetime import datetime
# from typing import Dict, Optional
# from botocore.exceptions import ClientError
# from src.utils.db import db
# from src.utils.cross_account_client import CrossAccountClient
# from bson import ObjectId

# class TenantResourceService:
#     """Service for provisioning AWS resources in tenant accounts."""
    
#     def __init__(self):
#         self.tenants_collection = db["tenants"]
        
#     async def setup_tenant_resources(self, tenant_id: str) -> Dict:
#         """
#         Set up all required AWS resources in tenant account.
        
#         Args:
#             tenant_id: Database ID of the tenant
            
#         Returns:
#             Dict with setup results and resource information
#         """
#         try:
#             # Get tenant from database
#             tenant = self.tenants_collection.find_one({"_id": ObjectId(tenant_id)})
#             if not tenant:
#                 return {
#                     "success": False,
#                     "error": "Tenant not found"
#                 }
            
#             if not tenant.get("aws_account_id"):
#                 return {
#                     "success": False,
#                     "error": "Tenant does not have AWS account"
#                 }
            
#             # Update status to SETTING_UP
#             self._update_tenant_status(tenant_id, "SETTING_UP", "Setting up AWS resources...")
            
#             aws_account_id = tenant["aws_account_id"]
#             tenant_name = tenant["name"]
            
#             print(f"Setting up resources for tenant: {tenant_name} in account: {aws_account_id}")
            
#             # Step 1: Create IAM role for Core App access
#             iam_result = await self._create_core_app_access_role(aws_account_id, tenant_name)
#             if not iam_result["success"]:
#                 self._update_tenant_status(tenant_id, "FAILED", f"IAM setup failed: {iam_result['error']}")
#                 return iam_result
            
#             # Step 2: Create S3 bucket for tenant documents
#             s3_result = await self._create_tenant_s3_bucket(aws_account_id, tenant_name)
#             if not s3_result["success"]:
#                 self._update_tenant_status(tenant_id, "FAILED", f"S3 setup failed: {s3_result['error']}")
#                 return s3_result
            
#             # Step 3: Update tenant record with resource information
#             self.tenants_collection.update_one(
#                 {"_id": ObjectId(tenant_id)},
#                 {
#                     "$set": {
#                         "s3_bucket_name": s3_result["bucket_name"],
#                         "resources_setup": True,
#                         "status": "READY",
#                         "error_message": None,
#                         "updated_at": datetime.utcnow()
#                     }
#                 }
#             )
            
#             print(f"Successfully set up resources for tenant: {tenant_name}")
            
#             return {
#                 "success": True,
#                 "message": "All resources created successfully",
#                 "resources": {
#                     "s3_bucket": s3_result["bucket_name"],
#                     "iam_role": "CoreAppAccess",
#                     "account_id": aws_account_id
#                 }
#             }
            
#         except Exception as e:
#             print(f"Error setting up tenant resources: {str(e)}")
#             self._update_tenant_status(tenant_id, "FAILED", f"Resource setup failed: {str(e)}")
#             return {
#                 "success": False,
#                 "error": "Resource Setup Failed",
#                 "message": str(e)
#             }
    
#     async def setup_tenant_resources_with_kb(self, tenant_id: str) -> Dict:
#         """
#         NEW: Set up all AWS resources including Knowledge Base (Sub-Phase 3.2).
#         Enhanced version that includes Knowledge Base creation after S3/IAM setup.
        
#         Args:
#             tenant_id: Database ID of the tenant
            
#         Returns:
#             Dict with complete setup results including Knowledge Base
#         """
#         try:
#             # First, set up basic resources (S3, IAM)
#             basic_setup = await self.setup_tenant_resources(tenant_id)
#             if not basic_setup["success"]:
#                 return basic_setup
            
#             # Get tenant info for Knowledge Base creation
#             tenant = self.tenants_collection.find_one({"_id": ObjectId(tenant_id)})
#             tenant_name = tenant["name"]
            
#             print(f"Setting up Knowledge Base for tenant: {tenant_name}")
            
#             # Import here to avoid circular imports
#             from src.services.knowledge_base_service import knowledge_base_service
            
#             # Create Knowledge Base
#             kb_result = await knowledge_base_service.create_knowledge_base(tenant_id)
            
#             if kb_result["success"]:
#                 print(f"Complete resource setup successful for tenant: {tenant_name}")
#                 return {
#                     "success": True,
#                     "message": "All resources and Knowledge Base created successfully",
#                     "resources": {
#                         **basic_setup["resources"],
#                         "knowledge_base_id": kb_result["knowledge_base_id"],
#                         "kb_status": "READY"
#                     }
#                 }
#             else:
#                 # KB creation failed, but basic resources are OK
#                 print(f"Knowledge Base creation failed for tenant: {tenant_name}: {kb_result['error']}")
#                 return {
#                     "success": False,
#                     "error": "Knowledge Base Creation Failed",
#                     "message": f"S3/IAM setup succeeded, but KB failed: {kb_result['error']}",
#                     "partial_success": True,
#                     "resources": basic_setup["resources"]
#                 }
                
#         except Exception as e:
#             print(f"Error in complete resource setup: {str(e)}")
#             return {
#                 "success": False,
#                 "error": "Complete Resource Setup Failed",
#                 "message": str(e)
#             }
    
#     async def _create_core_app_access_role(self, aws_account_id: str, tenant_name: str) -> Dict:
#         """
#         Create IAM role in tenant account for Core App cross-account access.
        
#         Args:
#             aws_account_id: Tenant AWS account ID
#             tenant_name: Name of the tenant (for logging)
            
#         Returns:
#             Dict with creation result
#         """
#         try:
#             print(f"Creating CoreAppAccess IAM role for tenant: {tenant_name}")
            
#             # Get IAM client for tenant account
#             iam_client = CrossAccountClient.get_tenant_iam_client(aws_account_id)
            
#             # Define trust policy (allows Core App to assume this role)
#             trust_policy = {
#                 "Version": "2012-10-17",
#                 "Statement": [
#                     {
#                         "Effect": "Allow",
#                         "Principal": {
#                             "AWS": "arn:aws:iam::941243735028:role/RLC-TenantManager-Role"
#                         },
#                         "Action": "sts:AssumeRole",
#                         "Condition": {
#                             "StringEquals": {
#                                 "sts:ExternalId": f"tenant-{aws_account_id}"
#                             }
#                         }
#                     }
#                 ]
#             }
            
#             # Define permissions policy for S3, Bedrock, and IAM operations
#             permissions_policy = {
#                 "Version": "2012-10-17",
#                 "Statement": [
#                     {
#                         "Effect": "Allow",
#                         "Action": [
#                             "s3:GetObject",
#                             "s3:PutObject", 
#                             "s3:DeleteObject",
#                             "s3:ListBucket",
#                             "s3:GetBucketLocation"
#                         ],
#                         "Resource": [
#                             f"arn:aws:s3:::tenant-*-documents",
#                             f"arn:aws:s3:::tenant-*-documents/*"
#                         ]
#                     },
#                     {
#                         "Effect": "Allow",
#                         "Action": [
#                             "bedrock:Retrieve",
#                             "bedrock:InvokeModel",
#                             "bedrock:StartIngestionJob",
#                             "bedrock:GetKnowledgeBase",
#                             "bedrock:ListDataSources",
#                             "bedrock:CreateKnowledgeBase",
#                             "bedrock:CreateDataSource",
#                             "bedrock:GetDataSource",
#                             "bedrock:StartIngestionJob",
#                             "bedrock:GetIngestionJob"
#                         ],
#                         "Resource": "*"
#                     },
#                     {
#                         "Effect": "Allow",
#                         "Action": [
#                             "iam:PassRole"
#                         ],
#                         "Resource": f"arn:aws:iam::{aws_account_id}:role/service-role/AmazonBedrockExecutionRoleForKnowledgeBase*"
#                     }
#                 ]
#             }
            
#             # Create the IAM role
#             try:
#                 iam_client.create_role(
#                     RoleName="CoreAppAccess",
#                     AssumeRolePolicyDocument=json.dumps(trust_policy),
#                     Description=f"Allows Core App access to tenant {tenant_name} resources",
#                     MaxSessionDuration=3600  # 1 hour sessions
#                 )
#                 print(f"Created CoreAppAccess role for tenant: {tenant_name}")
#             except ClientError as e:
#                 if e.response['Error']['Code'] == 'EntityAlreadyExists':
#                     print(f"CoreAppAccess role already exists for tenant: {tenant_name}")
#                 else:
#                     raise e
            
#             # Create and attach permissions policy
#             policy_name = "CoreAppAccessPolicy"
#             try:
#                 iam_client.create_policy(
#                     PolicyName=policy_name,
#                     PolicyDocument=json.dumps(permissions_policy),
#                     Description="Permissions for Core App to access tenant resources"
#                 )
#                 print(f"Created {policy_name} for tenant: {tenant_name}")
#             except ClientError as e:
#                 if e.response['Error']['Code'] == 'EntityAlreadyExists':
#                     print(f"{policy_name} already exists for tenant: {tenant_name}")
#                 else:
#                     raise e
            
#             # Attach policy to role
#             iam_client.attach_role_policy(
#                 RoleName="CoreAppAccess",
#                 PolicyArn=f"arn:aws:iam::{aws_account_id}:policy/{policy_name}"
#             )
            
#             print(f"Successfully configured IAM access for tenant: {tenant_name}")
            
#             return {
#                 "success": True,
#                 "role_name": "CoreAppAccess",
#                 "role_arn": f"arn:aws:iam::{aws_account_id}:role/CoreAppAccess"
#             }
            
#         except Exception as e:
#             print(f"Error creating IAM role for tenant {tenant_name}: {str(e)}")
#             return {
#                 "success": False,
#                 "error": f"IAM role creation failed: {str(e)}"
#             }
    
#     async def _create_tenant_s3_bucket(self, aws_account_id: str, tenant_name: str) -> Dict:
#         """
#         Create S3 bucket in tenant account for document storage.
        
#         Args:
#             aws_account_id: Tenant AWS account ID
#             tenant_name: Name of the tenant
            
#         Returns:
#             Dict with creation result and bucket name
#         """
#         try:
#             # Generate bucket name from tenant name (following existing naming pattern)
#             safe_name = self._generate_safe_name(tenant_name)
#             bucket_name = f"tenant-{safe_name}-documents"
            
#             print(f"Creating S3 bucket: {bucket_name} for tenant: {tenant_name}")
            
#             # Get S3 client for tenant account
#             s3_client = CrossAccountClient.get_tenant_s3_client(aws_account_id)
            
#             # Create bucket with proper configuration
#             bucket_config = {
#                 'Bucket': bucket_name
#             }
            
#             # Add location constraint if not us-east-1
#             region = 'us-east-1'
#             if region != 'us-east-1':
#                 bucket_config['CreateBucketConfiguration'] = {
#                     'LocationConstraint': region
#                 }
            
#             try:
#                 s3_client.create_bucket(**bucket_config)
#                 print(f"Created S3 bucket: {bucket_name}")
#             except ClientError as e:
#                 if e.response['Error']['Code'] == 'BucketAlreadyOwnedByYou':
#                     print(f"S3 bucket already exists: {bucket_name}")
#                 else:
#                     raise e
            
#             # Configure bucket versioning
#             s3_client.put_bucket_versioning(
#                 Bucket=bucket_name,
#                 VersioningConfiguration={'Status': 'Enabled'}
#             )
            
#             # Configure bucket lifecycle (optional - clean up old versions)
#             lifecycle_config = {
#                 'Rules': [
#                     {
#                         'ID': 'DeleteOldVersions',
#                         'Status': 'Enabled',
#                         'NoncurrentVersionExpiration': {
#                             'NoncurrentDays': 90
#                         }
#                     }
#                 ]
#             }
            
#             s3_client.put_bucket_lifecycle_configuration(
#                 Bucket=bucket_name,
#                 LifecycleConfiguration=lifecycle_config
#             )
            
#             # Configure bucket public access block (security)
#             s3_client.put_public_access_block(
#                 Bucket=bucket_name,
#                 PublicAccessBlockConfiguration={
#                     'BlockPublicAcls': True,
#                     'IgnorePublicAcls': True,
#                     'BlockPublicPolicy': True,
#                     'RestrictPublicBuckets': True
#                 }
#             )
            
#             print(f"Successfully configured S3 bucket: {bucket_name} for tenant: {tenant_name}")
            
#             return {
#                 "success": True,
#                 "bucket_name": bucket_name,
#                 "region": region
#             }
            
#         except Exception as e:
#             print(f"Error creating S3 bucket for tenant {tenant_name}: {str(e)}")
#             return {
#                 "success": False,
#                 "error": f"S3 bucket creation failed: {str(e)}"
#             }
    
#     def _generate_safe_name(self, tenant_name: str) -> str:
#         """
#         Generate AWS-safe name from tenant name (matching existing pattern).
        
#         Args:
#             tenant_name: Original tenant name
            
#         Returns:
#             Safe name for AWS resources
#         """
#         # Convert to lowercase, replace spaces and special chars with hyphens
#         safe_name = tenant_name.lower()
#         safe_name = ''.join(c if c.isalnum() else '-' for c in safe_name)
#         safe_name = '-'.join(filter(None, safe_name.split('-')))  # Remove multiple hyphens
        
#         # Limit length for S3 bucket naming requirements
#         safe_name = safe_name[:20]
        
#         return safe_name
    
#     def _update_tenant_status(self, tenant_id: str, status: str, message: Optional[str] = None):
#         """
#         Update tenant status in database (following existing pattern).
        
#         Args:
#             tenant_id: Database ID of the tenant
#             status: New status value
#             message: Optional error or status message
#         """
#         update_data = {
#             "status": status,
#             "updated_at": datetime.utcnow()
#         }
        
#         if message:
#             if status == "FAILED":
#                 update_data["error_message"] = message
#             else:
#                 update_data["error_message"] = None
        
#         self.tenants_collection.update_one(
#             {"_id": ObjectId(tenant_id)},
#             {"$set": update_data}
#         )
    
#     async def verify_tenant_resources(self, tenant_id: str) -> Dict:
#         """
#         Verify that all tenant resources are properly configured.
        
#         Args:
#             tenant_id: Database ID of the tenant
            
#         Returns:
#             Dict with verification results
#         """
#         try:
#             # Get tenant from database
#             tenant = self.tenants_collection.find_one({"_id": ObjectId(tenant_id)})
#             if not tenant:
#                 return {
#                     "success": False,
#                     "error": "Tenant not found"
#                 }
            
#             aws_account_id = tenant.get("aws_account_id")
#             if not aws_account_id:
#                 return {
#                     "success": False,
#                     "error": "Tenant has no AWS account"
#                 }
            
#             # Test cross-account access
#             access_test = CrossAccountClient.test_tenant_access(aws_account_id)
#             if not access_test["success"]:
#                 return {
#                     "success": False,
#                     "error": f"Cross-account access failed: {access_test['error']}"
#                 }
            
#             # Verify S3 bucket exists
#             s3_bucket = tenant.get("s3_bucket_name")
#             if s3_bucket:
#                 try:
#                     s3_client = CrossAccountClient.get_tenant_s3_client(aws_account_id)
#                     s3_client.head_bucket(Bucket=s3_bucket)
#                     s3_accessible = True
#                     s3_error = None
#                 except Exception as e:
#                     s3_accessible = False
#                     s3_error = str(e)
#             else:
#                 s3_accessible = False
#                 s3_error = "No S3 bucket configured"
            
#             # NEW: Verify Knowledge Base if it exists
#             kb_id = tenant.get("bedrock_kb_id")
#             if kb_id:
#                 try:
#                     from src.services.knowledge_base_service import knowledge_base_service
#                     kb_status_result = await knowledge_base_service.get_knowledge_base_status(str(tenant["_id"]))
#                     kb_accessible = kb_status_result["success"]
#                     kb_error = kb_status_result.get("error") if not kb_accessible else None
#                 except Exception as e:
#                     kb_accessible = False
#                     kb_error = str(e)
#             else:
#                 kb_accessible = None  # Not applicable - no KB configured
#                 kb_error = "No Knowledge Base configured"
            
#             return {
#                 "success": True,
#                 "verification": {
#                     "cross_account_access": access_test["access_verified"],
#                     "s3_bucket_accessible": s3_accessible,
#                     "s3_error": s3_error,
#                     "knowledge_base_accessible": kb_accessible,  # NEW
#                     "kb_error": kb_error,  # NEW
#                     "iam_role_arn": access_test.get("assumed_role_arn"),
#                     "account_id": aws_account_id
#                 }
#             }
            
#         except Exception as e:
#             return {
#                 "success": False,
#                 "error": f"Verification failed: {str(e)}"
#             }

# # Global service instance
# tenant_resource_service = TenantResourceService()

#### PHASE 4.1 ####
"""
AWS Resource Provisioning Service for Tenant Accounts.
Handles S3 bucket creation, IAM role setup, and resource management in tenant AWS accounts.
Builds on existing tenant_aws_service.py patterns and cross_account_client.py framework.
Enhanced with Phase 3.2 Knowledge Base integration.
"""

import boto3
import json
from datetime import datetime
from typing import Dict, Optional
from botocore.exceptions import ClientError
from src.utils.db import db
from src.utils.cross_account_client import CrossAccountClient
from bson import ObjectId

class TenantResourceService:
    """Service for provisioning AWS resources in tenant accounts."""
    
    def __init__(self):
        self.tenants_collection = db["tenants"]
        
    async def setup_tenant_resources(self, tenant_id: str) -> Dict:
        """
        Set up all required AWS resources in tenant account.
        
        Args:
            tenant_id: Database ID of the tenant
            
        Returns:
            Dict with setup results and resource information
        """
        try:
            # Get tenant from database
            tenant = self.tenants_collection.find_one({"_id": ObjectId(tenant_id)})
            if not tenant:
                return {
                    "success": False,
                    "error": "Tenant not found"
                }
            
            if not tenant.get("aws_account_id"):
                return {
                    "success": False,
                    "error": "Tenant does not have AWS account"
                }
            
            # Update status to SETTING_UP
            self._update_tenant_status(tenant_id, "SETTING_UP", "Setting up AWS resources...")
            
            aws_account_id = tenant["aws_account_id"]
            tenant_name = tenant["name"]
            
            print(f"Setting up resources for tenant: {tenant_name} in account: {aws_account_id}")
            
            # Step 1: Create IAM role for Core App access
            iam_result = await self._create_core_app_access_role(aws_account_id, tenant_name)
            if not iam_result["success"]:
                self._update_tenant_status(tenant_id, "FAILED", f"IAM setup failed: {iam_result['error']}")
                return iam_result
            
            # Step 2: Create S3 bucket for tenant documents
            s3_result = await self._create_tenant_s3_bucket(aws_account_id, tenant_name)
            if not s3_result["success"]:
                self._update_tenant_status(tenant_id, "FAILED", f"S3 setup failed: {s3_result['error']}")
                return s3_result
            
            # Step 3: Update tenant record with resource information
            self.tenants_collection.update_one(
                {"_id": ObjectId(tenant_id)},
                {
                    "$set": {
                        "s3_bucket_name": s3_result["bucket_name"],
                        "resources_setup": True,
                        "status": "READY",
                        "error_message": None,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            print(f"Successfully set up resources for tenant: {tenant_name}")
            
            return {
                "success": True,
                "message": "All resources created successfully",
                "resources": {
                    "s3_bucket": s3_result["bucket_name"],
                    "iam_role": "CoreAppAccess",
                    "account_id": aws_account_id
                }
            }
            
        except Exception as e:
            print(f"Error setting up tenant resources: {str(e)}")
            self._update_tenant_status(tenant_id, "FAILED", f"Resource setup failed: {str(e)}")
            return {
                "success": False,
                "error": "Resource Setup Failed",
                "message": str(e)
            }
    
    async def setup_tenant_resources_with_kb(self, tenant_id: str) -> Dict:
        """
        NEW: Set up all AWS resources including Knowledge Base (Sub-Phase 3.2).
        Enhanced version that includes Knowledge Base creation after S3/IAM setup.
        
        Args:
            tenant_id: Database ID of the tenant
            
        Returns:
            Dict with complete setup results including Knowledge Base
        """
        try:
            # First, set up basic resources (S3, IAM)
            basic_setup = await self.setup_tenant_resources(tenant_id)
            if not basic_setup["success"]:
                return basic_setup
            
            # Get tenant info for Knowledge Base creation
            tenant = self.tenants_collection.find_one({"_id": ObjectId(tenant_id)})
            tenant_name = tenant["name"]
            
            print(f"Setting up Knowledge Base for tenant: {tenant_name}")
            
            # Import here to avoid circular imports
            from src.services.knowledge_base_service import knowledge_base_service
            
            # Create Knowledge Base
            kb_result = await knowledge_base_service.create_knowledge_base(tenant_id)
            
            if kb_result["success"]:
                print(f"Complete resource setup successful for tenant: {tenant_name}")
                return {
                    "success": True,
                    "message": "All resources and Knowledge Base created successfully",
                    "resources": {
                        **basic_setup["resources"],
                        "knowledge_base_id": kb_result["knowledge_base_id"],
                        "kb_status": "READY"
                    }
                }
            else:
                # KB creation failed, but basic resources are OK
                print(f"Knowledge Base creation failed for tenant: {tenant_name}: {kb_result['error']}")
                return {
                    "success": False,
                    "error": "Knowledge Base Creation Failed",
                    "message": f"S3/IAM setup succeeded, but KB failed: {kb_result['error']}",
                    "partial_success": True,
                    "resources": basic_setup["resources"]
                }
                
        except Exception as e:
            print(f"Error in complete resource setup: {str(e)}")
            return {
                "success": False,
                "error": "Complete Resource Setup Failed",
                "message": str(e)
            }
    
    async def _create_core_app_access_role(self, aws_account_id: str, tenant_name: str) -> Dict:
        """
        Create IAM role in tenant account for Core App cross-account access.
        
        This method creates the "CoreAppAccess" role that allows the Core App 
        (running in account 941243735028) to securely access tenant resources
        in their dedicated AWS account.
        
        Args:
            aws_account_id: Tenant AWS account ID
            tenant_name: Name of the tenant (for logging and resource naming)
            
        Returns:
            Dict with creation result and role information
        """
        try:
            print(f"Creating CoreAppAccess IAM role for tenant: {tenant_name} in account: {aws_account_id}")
            
            # Get IAM client for tenant account using cross-account access
            try:
                iam_client = CrossAccountClient.get_tenant_iam_client(aws_account_id)
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Failed to get IAM client for tenant account: {str(e)}",
                    "details": "This usually means the RLC-TenantManager-Role doesn't have sufficient permissions or the tenant account isn't properly set up"
                }
            
            # Define trust policy (allows Core App to assume this role)
            trust_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "AWS": "arn:aws:iam::941243735028:role/RLC-TenantManager-Role"
                        },
                        "Action": "sts:AssumeRole",
                        "Condition": {
                            "StringEquals": {
                                "sts:ExternalId": f"tenant-{aws_account_id}"
                            }
                        }
                    }
                ]
            }
            
            # Define permissions policy for S3, Bedrock, and Knowledge Base operations
            tenant_bucket_name = f"tenant-{tenant_name.lower().replace(' ', '').replace('_', '').replace('-', '')}-documents"
            
            permissions_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "S3BucketAccess",
                        "Effect": "Allow",
                        "Action": [
                            "s3:GetObject",
                            "s3:PutObject", 
                            "s3:DeleteObject",
                            "s3:ListBucket",
                            "s3:GetBucketLocation",
                            "s3:GetBucketVersioning"
                        ],
                        "Resource": [
                            f"arn:aws:s3:::{tenant_bucket_name}",
                            f"arn:aws:s3:::{tenant_bucket_name}/*"
                        ]
                    },
                    {
                        "Sid": "BedrockAccess",
                        "Effect": "Allow",
                        "Action": [
                            "bedrock:Retrieve",
                            "bedrock:InvokeModel",
                            "bedrock:StartIngestionJob",
                            "bedrock:GetKnowledgeBase",
                            "bedrock:ListDataSources",
                            "bedrock:CreateKnowledgeBase",
                            "bedrock:CreateDataSource",
                            "bedrock:GetDataSource",
                            "bedrock:GetIngestionJob",
                            "bedrock:ListIngestionJobs"
                        ],
                        "Resource": "*"
                    },
                    {
                        "Sid": "IAMPassRoleForBedrock",
                        "Effect": "Allow",
                        "Action": [
                            "iam:PassRole"
                        ],
                        "Resource": f"arn:aws:iam::{aws_account_id}:role/service-role/AmazonBedrockExecutionRoleForKnowledgeBase*"
                    },
                    {
                        "Sid": "OpenSearchServerlessAccess",
                        "Effect": "Allow",
                        "Action": [
                            "aoss:APIAccessAll"
                        ],
                        "Resource": f"arn:aws:aoss:us-east-1:{aws_account_id}:collection/*"
                    }
                ]
            }
            
            # Create the IAM role
            role_name = "CoreAppAccess"
            try:
                create_role_response = iam_client.create_role(
                    RoleName=role_name,
                    AssumeRolePolicyDocument=json.dumps(trust_policy),
                    Description=f"Allows Core App access to tenant {tenant_name} resources",
                    MaxSessionDuration=3600,  # 1 hour sessions
                    Tags=[
                        {
                            'Key': 'TenantName',
                            'Value': tenant_name
                        },
                        {
                            'Key': 'Purpose',
                            'Value': 'CoreAppCrossAccountAccess'
                        },
                        {
                            'Key': 'CreatedBy',
                            'Value': 'RLC-TenantManager'
                        }
                    ]
                )
                print(f"✅ Created CoreAppAccess role for tenant: {tenant_name}")
                
            except ClientError as e:
                if e.response['Error']['Code'] == 'EntityAlreadyExists':
                    print(f"⚠️ CoreAppAccess role already exists for tenant: {tenant_name}")
                    # Continue to create/attach policy
                else:
                    return {
                        "success": False,
                        "error": f"Failed to create IAM role: {e.response['Error']['Message']}",
                        "error_code": e.response['Error']['Code']
                    }
            
            # Create and attach permissions policy
            policy_name = "CoreAppAccessPolicy"
            policy_arn = f"arn:aws:iam::{aws_account_id}:policy/{policy_name}"
            
            try:
                iam_client.create_policy(
                    PolicyName=policy_name,
                    PolicyDocument=json.dumps(permissions_policy),
                    Description=f"Permissions for Core App to access tenant {tenant_name} resources",
                    Tags=[
                        {
                            'Key': 'TenantName',
                            'Value': tenant_name
                        },
                        {
                            'Key': 'Purpose',
                            'Value': 'CoreAppPermissions'
                        }
                    ]
                )
                print(f"✅ Created {policy_name} for tenant: {tenant_name}")
                
            except ClientError as e:
                if e.response['Error']['Code'] == 'EntityAlreadyExists':
                    print(f"⚠️ {policy_name} already exists for tenant: {tenant_name}")
                    # Continue to attach policy
                else:
                    return {
                        "success": False,
                        "error": f"Failed to create IAM policy: {e.response['Error']['Message']}",
                        "error_code": e.response['Error']['Code']
                    }
            
            # Attach policy to role
            try:
                iam_client.attach_role_policy(
                    RoleName=role_name,
                    PolicyArn=policy_arn
                )
                print(f"✅ Attached {policy_name} to {role_name} for tenant: {tenant_name}")
                
            except ClientError as e:
                return {
                    "success": False,
                    "error": f"Failed to attach policy to role: {e.response['Error']['Message']}",
                    "error_code": e.response['Error']['Code']
                }
            
            # Test role assumption to verify it works
            role_arn = f"arn:aws:iam::{aws_account_id}:role/{role_name}"
            try:
                test_result = CrossAccountClient.test_tenant_access(aws_account_id)
                if not test_result["success"]:
                    print(f"⚠️ Role created but access test failed for tenant: {tenant_name}")
                    print(f"Test error: {test_result.get('error', 'Unknown error')}")
            except Exception as e:
                print(f"⚠️ Could not test role assumption for tenant: {tenant_name}: {str(e)}")
            
            print(f"🎉 Successfully configured IAM access for tenant: {tenant_name}")
            
            return {
                "success": True,
                "role_name": role_name,
                "role_arn": role_arn,
                "policy_name": policy_name,
                "policy_arn": policy_arn,
                "tenant_bucket": tenant_bucket_name,
                "account_id": aws_account_id
            }
            
        except Exception as e:
            print(f"❌ Error creating IAM role for tenant {tenant_name}: {str(e)}")
            return {
                "success": False,
                "error": f"IAM role creation failed: {str(e)}",
                "tenant_name": tenant_name,
                "account_id": aws_account_id
            }
    
    async def _create_tenant_s3_bucket(self, aws_account_id: str, tenant_name: str) -> Dict:
        """
        Create S3 bucket in tenant account for document storage.
        
        Args:
            aws_account_id: Tenant AWS account ID
            tenant_name: Name of the tenant
            
        Returns:
            Dict with creation result and bucket name
        """
        try:
            # Generate bucket name from tenant name (following existing naming pattern)
            safe_name = self._generate_safe_name(tenant_name)
            bucket_name = f"tenant-{safe_name}-documents"
            
            print(f"Creating S3 bucket: {bucket_name} for tenant: {tenant_name}")
            
            # Get S3 client for tenant account
            s3_client = CrossAccountClient.get_tenant_s3_client(aws_account_id)
            
            # Create bucket with proper configuration
            bucket_config = {
                'Bucket': bucket_name
            }
            
            # Add location constraint if not us-east-1
            region = 'us-east-1'
            if region != 'us-east-1':
                bucket_config['CreateBucketConfiguration'] = {
                    'LocationConstraint': region
                }
            
            try:
                s3_client.create_bucket(**bucket_config)
                print(f"Created S3 bucket: {bucket_name}")
            except ClientError as e:
                if e.response['Error']['Code'] == 'BucketAlreadyOwnedByYou':
                    print(f"S3 bucket already exists: {bucket_name}")
                else:
                    raise e
            
            # Configure bucket versioning
            s3_client.put_bucket_versioning(
                Bucket=bucket_name,
                VersioningConfiguration={'Status': 'Enabled'}
            )
            
            # Configure bucket lifecycle (optional - clean up old versions)
            lifecycle_config = {
                'Rules': [
                    {
                        'ID': 'DeleteOldVersions',
                        'Status': 'Enabled',
                        'Filter': {'Prefix': ''},  # Apply to all objects
                        'NoncurrentVersionExpiration': {
                            'NoncurrentDays': 90
                        }
                    }
                ]
            }
            
            s3_client.put_bucket_lifecycle_configuration(
                Bucket=bucket_name,
                LifecycleConfiguration=lifecycle_config
            )
            
            # Configure bucket public access block (security)
            s3_client.put_public_access_block(
                Bucket=bucket_name,
                PublicAccessBlockConfiguration={
                    'BlockPublicAcls': True,
                    'IgnorePublicAcls': True,
                    'BlockPublicPolicy': True,
                    'RestrictPublicBuckets': True
                }
            )
            
            print(f"Successfully configured S3 bucket: {bucket_name} for tenant: {tenant_name}")
            
            return {
                "success": True,
                "bucket_name": bucket_name,
                "region": region
            }
            
        except Exception as e:
            print(f"Error creating S3 bucket for tenant {tenant_name}: {str(e)}")
            return {
                "success": False,
                "error": f"S3 bucket creation failed: {str(e)}"
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
        
        # Limit length for S3 bucket naming requirements
        safe_name = safe_name[:20]
        
        return safe_name
    
    def _update_tenant_status(self, tenant_id: str, status: str, message: Optional[str] = None):
        """
        Update tenant status in database (following existing pattern).
        
        Args:
            tenant_id: Database ID of the tenant
            status: New status value
            message: Optional error or status message
        """
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow()
        }
        
        if message:
            if status == "FAILED":
                update_data["error_message"] = message
            else:
                update_data["error_message"] = None
        
        self.tenants_collection.update_one(
            {"_id": ObjectId(tenant_id)},
            {"$set": update_data}
        )
    
    async def verify_tenant_resources(self, tenant_id: str) -> Dict:
        """
        Verify that all tenant resources are properly configured.
        
        Args:
            tenant_id: Database ID of the tenant
            
        Returns:
            Dict with verification results
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
            if not aws_account_id:
                return {
                    "success": False,
                    "error": "Tenant has no AWS account"
                }
            
            # Test cross-account access
            access_test = CrossAccountClient.test_tenant_access(aws_account_id)
            if not access_test["success"]:
                return {
                    "success": False,
                    "error": f"Cross-account access failed: {access_test['error']}"
                }
            
            # Verify S3 bucket exists
            s3_bucket = tenant.get("s3_bucket_name")
            if s3_bucket:
                try:
                    s3_client = CrossAccountClient.get_tenant_s3_client(aws_account_id)
                    s3_client.head_bucket(Bucket=s3_bucket)
                    s3_accessible = True
                    s3_error = None
                except Exception as e:
                    s3_accessible = False
                    s3_error = str(e)
            else:
                s3_accessible = False
                s3_error = "No S3 bucket configured"
            
            # NEW: Verify Knowledge Base if it exists
            kb_id = tenant.get("bedrock_kb_id")
            if kb_id:
                try:
                    from src.services.knowledge_base_service import knowledge_base_service
                    kb_status_result = await knowledge_base_service.get_knowledge_base_status(str(tenant["_id"]))
                    kb_accessible = kb_status_result["success"]
                    kb_error = kb_status_result.get("error") if not kb_accessible else None
                except Exception as e:
                    kb_accessible = False
                    kb_error = str(e)
            else:
                kb_accessible = None  # Not applicable - no KB configured
                kb_error = "No Knowledge Base configured"
            
            return {
                "success": True,
                "verification": {
                    "cross_account_access": access_test["access_verified"],
                    "s3_bucket_accessible": s3_accessible,
                    "s3_error": s3_error,
                    "knowledge_base_accessible": kb_accessible,  # NEW
                    "kb_error": kb_error,  # NEW
                    "iam_role_arn": access_test.get("assumed_role_arn"),
                    "account_id": aws_account_id
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Verification failed: {str(e)}"
            }

# Global service instance
tenant_resource_service = TenantResourceService()