"""
AWS Organizations service for creating and managing tenant AWS accounts.
Handles account creation, status monitoring, and cross-account operations.
"""

import boto3
import os
import asyncio
from datetime import datetime
from typing import Dict, Optional
from botocore.exceptions import ClientError
from src.utils.db import db

# Constants
MANAGEMENT_ACCOUNT_ID = "604332154960"
CORE_ACCOUNT_ID = "941243735028"

class TenantAWSService:
    """Service for managing tenant AWS account lifecycle."""
    
    def __init__(self):
        self.tenants_collection = db["tenants"]
        
    async def create_tenant_account(self, tenant_name: str, tenant_email: str, created_by: str) -> Dict:
        """
        Create AWS account for new tenant.
        
        Args:
            tenant_name: Name of the tenant organization
            tenant_email: Admin email for the tenant
            created_by: Email of user creating the tenant
            
        Returns:
            Dict with success status, tenant_id, and AWS request_id
        """
        try:
            # Generate safe account name and email
            safe_name = self._generate_safe_name(tenant_name)
            aws_account_email = f"devops+rlc-{safe_name}@xantage.co"
            aws_account_name = f"RLC-Tenant-{tenant_name}"
            
            # Get Organizations client via cross-account role assumption
            org_client = await self._get_organizations_client()
            
            # Create AWS account
            print(f"Creating AWS account for tenant: {tenant_name}")
            response = org_client.create_account(
                Email=aws_account_email,
                AccountName=aws_account_name
            )
            
            request_id = response['CreateAccountStatus']['Id']
            print(f"AWS account creation initiated. Request ID: {request_id}")
            
            # Create tenant record in database with CREATING status
            tenant_record = {
                "name": tenant_name,
                "email": tenant_email,
                "description": f"Tenant organization for {tenant_name}",
                "status": "CREATING",
                "aws_account_email": aws_account_email,
                "aws_account_name": aws_account_name,
                "aws_request_id": request_id,
                "aws_account_id": None,  # Will be populated when creation completes
                "bedrock_kb_id": None,   # Will be populated during resource setup
                "s3_bucket": None,       # Will be populated during resource setup
                "resources_setup": False,
                "token_limit_millions": 20,  # Default 20M tokens
                "max_users": 100,            # Default 100 users
                "created_by": created_by,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            result = self.tenants_collection.insert_one(tenant_record)
            tenant_id = str(result.inserted_id)
            
            print(f"Tenant record created with ID: {tenant_id}")
            
            return {
                "success": True,
                "tenant_id": tenant_id,
                "aws_request_id": request_id,
                "message": "Tenant AWS account creation initiated",
                "status": "CREATING"
            }
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_message = e.response.get('Error', {}).get('Message', str(e))
            
            print(f"AWS error creating account: {error_code} - {error_message}")
            
            return {
                "success": False,
                "error": f"AWS Error: {error_code}",
                "message": f"Failed to create AWS account: {error_message}"
            }
            
        except Exception as e:
            print(f"Unexpected error creating tenant account: {str(e)}")
            return {
                "success": False,
                "error": "Internal Error",
                "message": f"Failed to create tenant: {str(e)}"
            }
    
    async def check_account_creation_status(self, tenant_id: str) -> Dict:
        """
        Check the status of AWS account creation for a tenant.
        
        Args:
            tenant_id: Database ID of the tenant
            
        Returns:
            Dict with current status and account details if ready
        """
        try:
            # Get tenant from database
            tenant = self.tenants_collection.find_one({"_id": ObjectId(tenant_id)})
            if not tenant:
                return {
                    "success": False,
                    "error": "Tenant not found",
                    "message": f"No tenant found with ID: {tenant_id}"
                }
            
            # If already completed, return current status
            if tenant.get("status") in ["READY", "FAILED"]:
                return {
                    "success": True,
                    "status": tenant["status"],
                    "aws_account_id": tenant.get("aws_account_id"),
                    "message": f"Tenant status: {tenant['status']}"
                }
            
            # Check AWS account creation status
            aws_request_id = tenant.get("aws_request_id")
            if not aws_request_id:
                return {
                    "success": False,
                    "error": "No AWS request ID",
                    "message": "Tenant missing AWS creation request ID"
                }
            
            # Get Organizations client and check status
            org_client = await self._get_organizations_client()
            response = org_client.describe_create_account_status(
                CreateAccountRequestId=aws_request_id
            )
            
            status_info = response['CreateAccountStatus']
            aws_status = status_info['State']
            
            # Update tenant based on AWS status
            if aws_status == 'SUCCEEDED':
                aws_account_id = status_info['AccountId']
                
                # Update tenant record
                self.tenants_collection.update_one(
                    {"_id": ObjectId(tenant_id)},
                    {
                        "$set": {
                            "aws_account_id": aws_account_id,
                            "status": "SETTING_UP",
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                print(f"AWS account created successfully: {aws_account_id}")
                
                return {
                    "success": True,
                    "status": "SETTING_UP",
                    "aws_account_id": aws_account_id,
                    "message": "AWS account created, setting up resources",
                    "ready_for_setup": True
                }
                
            elif aws_status == 'FAILED':
                failure_reason = status_info.get('FailureReason', 'Unknown failure')
                
                # Update tenant record
                self.tenants_collection.update_one(
                    {"_id": ObjectId(tenant_id)},
                    {
                        "$set": {
                            "status": "FAILED",
                            "error_message": failure_reason,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                print(f"AWS account creation failed: {failure_reason}")
                
                return {
                    "success": False,
                    "status": "FAILED",
                    "error": "AWS Account Creation Failed",
                    "message": f"Account creation failed: {failure_reason}"
                }
                
            else:  # IN_PROGRESS
                return {
                    "success": True,
                    "status": "CREATING",
                    "message": "AWS account creation in progress"
                }
                
        except Exception as e:
            print(f"Error checking account status: {str(e)}")
            return {
                "success": False,
                "error": "Status Check Failed",
                "message": f"Error checking account status: {str(e)}"
            }
    
    async def retry_failed_creation(self, tenant_id: str) -> Dict:
        """
        Retry account creation for a failed tenant.
        
        Args:
            tenant_id: Database ID of the tenant
            
        Returns:
            Dict with retry attempt result
        """
        try:
            # Get tenant from database
            tenant = self.tenants_collection.find_one({"_id": ObjectId(tenant_id)})
            if not tenant:
                return {
                    "success": False,
                    "error": "Tenant not found"
                }
            
            if tenant.get("status") != "FAILED":
                return {
                    "success": False,
                    "error": "Tenant is not in FAILED status"
                }
            
            # Retry account creation
            result = await self.create_tenant_account(
                tenant_name=tenant["name"],
                tenant_email=tenant["email"],
                created_by=tenant["created_by"]
            )
            
            if result["success"]:
                # Update existing tenant record instead of creating new one
                self.tenants_collection.update_one(
                    {"_id": ObjectId(tenant_id)},
                    {
                        "$set": {
                            "status": "CREATING",
                            "aws_request_id": result["aws_request_id"],
                            "error_message": None,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                return {
                    "success": True,
                    "message": "Tenant creation retry initiated",
                    "aws_request_id": result["aws_request_id"]
                }
            else:
                return result
                
        except Exception as e:
            print(f"Error retrying tenant creation: {str(e)}")
            return {
                "success": False,
                "error": "Retry Failed",
                "message": f"Error retrying creation: {str(e)}"
            }
    
    async def _get_organizations_client(self):
        """Get Organizations client by assuming cross-account role."""
        try:
            # Use current IAM role to assume Organizations role
            sts_client = boto3.client('sts')
            
            assumed_role = sts_client.assume_role(
                RoleArn=f"arn:aws:iam::{MANAGEMENT_ACCOUNT_ID}:role/OrganizationAccountAccessRole",
                RoleSessionName=f"TenantCreation-{int(datetime.utcnow().timestamp())}"
            )
            
            credentials = assumed_role['Credentials']
            
            # Create Organizations client with assumed credentials
            org_client = boto3.client(
                'organizations',
                aws_access_key_id=credentials['AccessKeyId'],
                aws_secret_access_key=credentials['SecretAccessKey'],
                aws_session_token=credentials['SessionToken'],
                region_name='us-east-1'
            )
            
            return org_client
            
        except Exception as e:
            print(f"Error assuming Organizations role: {str(e)}")
            raise Exception(f"Failed to get Organizations access: {str(e)}")
    
    def _generate_safe_name(self, tenant_name: str) -> str:
        """Generate AWS-safe name from tenant name."""
        # Convert to lowercase, replace spaces and special chars with hyphens
        safe_name = tenant_name.lower()
        safe_name = ''.join(c if c.isalnum() else '-' for c in safe_name)
        safe_name = '-'.join(filter(None, safe_name.split('-')))  # Remove multiple hyphens
        
        # Limit length
        safe_name = safe_name[:20]
        
        return safe_name

# Import ObjectId here to avoid circular imports
from bson import ObjectId

# Global service instance
tenant_aws_service = TenantAWSService()