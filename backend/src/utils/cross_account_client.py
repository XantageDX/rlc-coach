# #### PHASE 3.2 ####
# """
# Enhanced utility functions for cross-account AWS operations.
# Now includes Bedrock Agent client for Knowledge Base management.
# Handles role assumption and client creation for tenant accounts.
# """

# import boto3
# from datetime import datetime
# from typing import Dict, Any
# from botocore.exceptions import ClientError

# class CrossAccountClient:
#     """Helper class for managing cross-account AWS operations."""
    
#     @staticmethod
#     def assume_tenant_role(aws_account_id: str, session_name_suffix: str = "") -> Dict[str, Any]:
#         """
#         Assume role in tenant AWS account.
        
#         Args:
#             aws_account_id: Target tenant AWS account ID
#             session_name_suffix: Optional suffix for session name
            
#         Returns:
#             Dict containing assumed role credentials
#         """
#         try:
#             sts_client = boto3.client('sts')
            
#             session_name = f"CoreAppAccess-{int(datetime.utcnow().timestamp())}"
#             if session_name_suffix:
#                 session_name += f"-{session_name_suffix}"
            
#             assumed_role = sts_client.assume_role(
#                 RoleArn=f"arn:aws:iam::{aws_account_id}:role/CoreAppAccess",
#                 RoleSessionName=session_name
#             )
            
#             return assumed_role['Credentials']
            
#         except ClientError as e:
#             print(f"Error assuming role in account {aws_account_id}: {str(e)}")
#             raise Exception(f"Failed to assume role in tenant account: {str(e)}")
    
#     @staticmethod
#     def get_tenant_s3_client(aws_account_id: str):
#         """
#         Get S3 client for tenant account.
        
#         Args:
#             aws_account_id: Target tenant AWS account ID
            
#         Returns:
#             boto3 S3 client with tenant account access
#         """
#         credentials = CrossAccountClient.assume_tenant_role(aws_account_id, "s3")
        
#         return boto3.client(
#             's3',
#             aws_access_key_id=credentials['AccessKeyId'],
#             aws_secret_access_key=credentials['SecretAccessKey'],
#             aws_session_token=credentials['SessionToken'],
#             region_name='us-east-1'
#         )
    
#     @staticmethod
#     def get_tenant_bedrock_client(aws_account_id: str):
#         """
#         Get Bedrock client for tenant account.
        
#         Args:
#             aws_account_id: Target tenant AWS account ID
            
#         Returns:
#             boto3 Bedrock client with tenant account access
#         """
#         credentials = CrossAccountClient.assume_tenant_role(aws_account_id, "bedrock")
        
#         return boto3.client(
#             'bedrock-agent-runtime',
#             aws_access_key_id=credentials['AccessKeyId'],
#             aws_secret_access_key=credentials['SecretAccessKey'],
#             aws_session_token=credentials['SessionToken'],
#             region_name='us-east-1'
#         )
    
#     @staticmethod
#     def get_tenant_bedrock_agent_client(aws_account_id: str):
#         """
#         NEW: Get Bedrock Agent client for tenant account (for Knowledge Base management).
        
#         Args:
#             aws_account_id: Target tenant AWS account ID
            
#         Returns:
#             boto3 Bedrock Agent client with tenant account access
#         """
#         credentials = CrossAccountClient.assume_tenant_role(aws_account_id, "bedrock-agent")
        
#         return boto3.client(
#             'bedrock-agent',
#             aws_access_key_id=credentials['AccessKeyId'],
#             aws_secret_access_key=credentials['SecretAccessKey'],
#             aws_session_token=credentials['SessionToken'],
#             region_name='us-east-1'
#         )
    
#     @staticmethod
#     def get_tenant_iam_client(aws_account_id: str):
#         """
#         Get IAM client for tenant account.
        
#         Args:
#             aws_account_id: Target tenant AWS account ID
            
#         Returns:
#             boto3 IAM client with tenant account access
#         """
#         credentials = CrossAccountClient.assume_tenant_role(aws_account_id, "iam")
        
#         return boto3.client(
#             'iam',
#             aws_access_key_id=credentials['AccessKeyId'],
#             aws_secret_access_key=credentials['SecretAccessKey'],
#             aws_session_token=credentials['SessionToken'],
#             region_name='us-east-1'
#         )
    
#     @staticmethod
#     def test_tenant_access(aws_account_id: str) -> Dict[str, Any]:
#         """
#         Test access to tenant account and return basic information.
        
#         Args:
#             aws_account_id: Target tenant AWS account ID
            
#         Returns:
#             Dict with test results and account information
#         """
#         try:
#             credentials = CrossAccountClient.assume_tenant_role(aws_account_id, "test")
            
#             # Create STS client with assumed credentials to verify access
#             sts_client = boto3.client(
#                 'sts',
#                 aws_access_key_id=credentials['AccessKeyId'],
#                 aws_secret_access_key=credentials['SecretAccessKey'],
#                 aws_session_token=credentials['SessionToken'],
#                 region_name='us-east-1'
#             )
            
#             identity = sts_client.get_caller_identity()
            
#             return {
#                 "success": True,
#                 "account_id": identity['Account'],
#                 "assumed_role_arn": identity['Arn'],
#                 "access_verified": True
#             }
            
#         except Exception as e:
#             return {
#                 "success": False,
#                 "error": str(e),
#                 "access_verified": False
#             }

# # Global instance for easy import
# cross_account_client = CrossAccountClient()

#### PHASE 4.1 ####
"""
Enhanced utility functions for cross-account AWS operations.
Now includes Bedrock Agent client for Knowledge Base management.
Handles role assumption and client creation for tenant accounts.
"""

import boto3
from datetime import datetime
from typing import Dict, Any
from botocore.exceptions import ClientError

class CrossAccountClient:
    """Helper class for managing cross-account AWS operations."""
    
    @staticmethod
    def assume_tenant_role(aws_account_id: str, session_name_suffix: str = "") -> Dict[str, Any]:
        """
        Assume role in tenant AWS account with external ID for security.
        
        Args:
            aws_account_id: Target tenant AWS account ID
            session_name_suffix: Optional suffix for session name
            
        Returns:
            Dict containing assumed role credentials
        """
        try:
            sts_client = boto3.client('sts')
            
            #session_name = f"CoreAppAccess-{int(datetime.utcnow().timestamp())}"
            session_name = f"RLCAccess-{int(datetime.utcnow().timestamp())}"
            if session_name_suffix:
                session_name += f"-{session_name_suffix}"
            
            # CHANGE: Add external ID for security (matches our new trust policy)
            assumed_role = sts_client.assume_role(
                #RoleArn=f"arn:aws:iam::{aws_account_id}:role/CoreAppAccess",
                RoleArn=f"arn:aws:iam::{aws_account_id}:role/OrganizationAccountAccessRole",
                RoleSessionName=session_name
                #ExternalId=f"tenant-{aws_account_id}"  # NEW LINE
            )
            
            return assumed_role['Credentials']
            
        except ClientError as e:
            # ENHANCED: Better error messages
            error_code = e.response['Error']['Code']
            if error_code == 'AccessDenied':
                #print(f"❌ Access denied - CoreAppAccess role may not exist in account {aws_account_id}")
                print(f"❌ Access denied - OrganizationAccountAccessRole may not exist in account {aws_account_id}")
            else:
                print(f"❌ Error assuming role in account {aws_account_id}: {str(e)}")
            raise Exception(f"Failed to assume role in tenant account: {str(e)}")
    
    @staticmethod
    def get_tenant_s3_client(aws_account_id: str):
        """
        Get S3 client for tenant account.
        
        Args:
            aws_account_id: Target tenant AWS account ID
            
        Returns:
            boto3 S3 client with tenant account access
        """
        credentials = CrossAccountClient.assume_tenant_role(aws_account_id, "s3")
        
        return boto3.client(
            's3',
            aws_access_key_id=credentials['AccessKeyId'],
            aws_secret_access_key=credentials['SecretAccessKey'],
            aws_session_token=credentials['SessionToken'],
            region_name='us-east-1'
        )
    
    @staticmethod
    def get_tenant_bedrock_client(aws_account_id: str):
        """
        Get Bedrock client for tenant account.
        
        Args:
            aws_account_id: Target tenant AWS account ID
            
        Returns:
            boto3 Bedrock client with tenant account access
        """
        credentials = CrossAccountClient.assume_tenant_role(aws_account_id, "bedrock")
        
        return boto3.client(
            'bedrock-agent-runtime',
            aws_access_key_id=credentials['AccessKeyId'],
            aws_secret_access_key=credentials['SecretAccessKey'],
            aws_session_token=credentials['SessionToken'],
            region_name='us-east-1'
        )
    
    @staticmethod
    def get_tenant_bedrock_agent_client(aws_account_id: str):
        """
        NEW: Get Bedrock Agent client for tenant account (for Knowledge Base management).
        
        Args:
            aws_account_id: Target tenant AWS account ID
            
        Returns:
            boto3 Bedrock Agent client with tenant account access
        """
        credentials = CrossAccountClient.assume_tenant_role(aws_account_id, "bedrock-agent")
        
        return boto3.client(
            'bedrock-agent',
            aws_access_key_id=credentials['AccessKeyId'],
            aws_secret_access_key=credentials['SecretAccessKey'],
            aws_session_token=credentials['SessionToken'],
            region_name='us-east-1'
        )
    
    @staticmethod
    def get_tenant_iam_client(aws_account_id: str):
        """
        Get IAM client for tenant account.
        
        Args:
            aws_account_id: Target tenant AWS account ID
            
        Returns:
            boto3 IAM client with tenant account access
        """
        credentials = CrossAccountClient.assume_tenant_role(aws_account_id, "iam")
        
        return boto3.client(
            'iam',
            aws_access_key_id=credentials['AccessKeyId'],
            aws_secret_access_key=credentials['SecretAccessKey'],
            aws_session_token=credentials['SessionToken'],
            region_name='us-east-1'
        )
    
    @staticmethod
    def test_tenant_access(aws_account_id: str) -> Dict[str, Any]:
        """
        Test access to tenant account and return detailed information.
        
        Args:
            aws_account_id: Target tenant AWS account ID
            
        Returns:
            Dict with test results and account information
        """
        try:
            print(f"🔍 Testing cross-account access to: {aws_account_id}")
            
            credentials = CrossAccountClient.assume_tenant_role(aws_account_id, "test")
            
            # Create STS client with assumed credentials to verify access
            sts_client = boto3.client(
                'sts',
                aws_access_key_id=credentials['AccessKeyId'],
                aws_secret_access_key=credentials['SecretAccessKey'],
                aws_session_token=credentials['SessionToken'],
                region_name='us-east-1'
            )
            
            identity = sts_client.get_caller_identity()
            
            print(f"✅ Cross-account access successful for: {aws_account_id}")
            
            return {
                "success": True,
                "account_id": identity['Account'],
                "assumed_role_arn": identity['Arn'],
                "access_verified": True,
                "test_timestamp": datetime.utcnow().isoformat()  # NEW
            }
            
        except Exception as e:
            print(f"❌ Cross-account access test failed for: {aws_account_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "access_verified": False,
                "account_id": aws_account_id,  # NEW
                "test_timestamp": datetime.utcnow().isoformat()  # NEW
            }

# Global instance for easy import
cross_account_client = CrossAccountClient()