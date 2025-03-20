# backend/src/services/archive_service.py
from bson import ObjectId
from typing import List
from src.models.archive_models import (
    ProjectCreate, ProjectResponse, 
    KeyDecisionCreate, KeyDecisionResponse, 
    KnowledgeGapCreate, KnowledgeGapResponse,
    convert_object_id
)
from src.utils.db import db

# Collection references
projects_collection = db["archive_projects"]
key_decisions_collection = db["archive_key_decisions"]
knowledge_gaps_collection = db["archive_knowledge_gaps"]

# Project operations
async def get_all_projects() -> List[dict]:
    """Get all projects with their key decisions and knowledge gaps."""
    projects = []
    
    # Get all projects
    project_cursor = projects_collection.find()
    for project_doc in project_cursor:
        # Convert ObjectId to string
        project_doc = convert_object_id(project_doc)
        project = ProjectResponse(**project_doc)
        
        # Get key decisions for this project
        kd_cursor = key_decisions_collection.find({"project_id": project.id})
        key_decisions = []
        
        for kd_doc in kd_cursor:
            # Convert ObjectId to string
            kd_doc = convert_object_id(kd_doc)
            kd = KeyDecisionResponse(**kd_doc)
            
            # Get knowledge gaps for this key decision
            kg_cursor = knowledge_gaps_collection.find({"key_decision_id": kd.id})
            knowledge_gaps = []
            
            for kg_doc in kg_cursor:
                # Convert ObjectId to string
                kg_doc = convert_object_id(kg_doc)
                knowledge_gaps.append(KnowledgeGapResponse(**kg_doc))
            
            # Add knowledge gaps to the key decision
            kd_dict = kd.model_dump()
            kd_dict["knowledgeGaps"] = [kg.model_dump() for kg in knowledge_gaps]
            key_decisions.append(kd_dict)
        
        # Add key decisions to the project
        project_dict = project.model_dump()
        project_dict["keyDecisions"] = key_decisions
        projects.append(project_dict)
    
    return projects

async def create_project(project_data: ProjectCreate) -> ProjectResponse:
    """Create a new project."""
    try:
        print(f"Creating project in service: {project_data}")
        project_dict = project_data.model_dump()
        print(f"Project dict after model_dump: {project_dict}")
        
        result = projects_collection.insert_one(project_dict)
        print(f"MongoDB insert result: {result.inserted_id}")
        
        # Get the created project
        created_project = projects_collection.find_one({"_id": result.inserted_id})
        print(f"Retrieved project from DB: {created_project}")
        
        # Convert ObjectId to string
        created_project = convert_object_id(created_project)
        print(f"Project after ID conversion: {created_project}")
        
        return ProjectResponse(**created_project)
    except Exception as e:
        print(f"Exception in create_project: {e}")
        raise ValueError(f"Failed to create project: {e}")

async def delete_project(project_id: str) -> bool:
    """Delete a project and all its key decisions and knowledge gaps."""
    try:
        # First, get all key decisions for this project
        kds = key_decisions_collection.find({"project_id": project_id})
        
        # For each key decision, delete all its knowledge gaps
        for kd in kds:
            kd_id = str(kd["_id"])
            knowledge_gaps_collection.delete_many({"key_decision_id": kd_id})
        
        # Now delete all key decisions for this project
        key_decisions_collection.delete_many({"project_id": project_id})
        
        # Finally, delete the project itself
        result = projects_collection.delete_one({"_id": ObjectId(project_id)})
        return result.deleted_count > 0
    except Exception as e:
        print(f"Error deleting project: {e}")
        return False

# Key Decision operations
async def create_key_decision(project_id: str, kd_data: KeyDecisionCreate) -> KeyDecisionResponse:
    """Create a new key decision for a project."""
    # Check if project exists
    try:
        object_id = ObjectId(project_id)
        project = projects_collection.find_one({"_id": object_id})
        if not project:
            raise ValueError(f"Project with ID {project_id} not found")
    except Exception as e:
        raise ValueError(f"Invalid project ID: {e}")
    
    # Add project_id to key decision data
    kd_dict = kd_data.model_dump()
    kd_dict["project_id"] = project_id
    result = key_decisions_collection.insert_one(kd_dict)
    
    # Get the created key decision
    created_kd = key_decisions_collection.find_one({"_id": result.inserted_id})
    # Convert ObjectId to string
    created_kd = convert_object_id(created_kd)
    
    return KeyDecisionResponse(**created_kd)

async def delete_key_decision(kd_id: str) -> bool:
    """Delete a key decision and all its knowledge gaps."""
    try:
        # First, delete all knowledge gaps for this key decision
        knowledge_gaps_collection.delete_many({"key_decision_id": kd_id})
        
        # Then delete the key decision
        result = key_decisions_collection.delete_one({"_id": ObjectId(kd_id)})
        return result.deleted_count > 0
    except Exception as e:
        print(f"Error deleting key decision: {e}")
        return False

# Knowledge Gap operations
async def create_knowledge_gap(kd_id: str, kg_data: KnowledgeGapCreate) -> KnowledgeGapResponse:
    """Create a new knowledge gap for a key decision."""
    # Check if key decision exists
    try:
        object_id = ObjectId(kd_id)
        kd = key_decisions_collection.find_one({"_id": object_id})
        if not kd:
            raise ValueError(f"Key Decision with ID {kd_id} not found")
    except Exception as e:
        raise ValueError(f"Invalid key decision ID: {e}")
    
    # Add key_decision_id to knowledge gap data
    kg_dict = kg_data.model_dump()
    kg_dict["key_decision_id"] = kd_id
    result = knowledge_gaps_collection.insert_one(kg_dict)
    
    # Get the created knowledge gap
    created_kg = knowledge_gaps_collection.find_one({"_id": result.inserted_id})
    # Convert ObjectId to string
    created_kg = convert_object_id(created_kg)
    
    return KnowledgeGapResponse(**created_kg)

async def delete_knowledge_gap(kg_id: str) -> bool:
    """Delete a knowledge gap."""
    try:
        result = knowledge_gaps_collection.delete_one({"_id": ObjectId(kg_id)})
        return result.deleted_count > 0
    except Exception as e:
        print(f"Error deleting knowledge gap: {e}")
        return False