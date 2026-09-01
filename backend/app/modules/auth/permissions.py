from typing import Dict, List, Set


# ==============================================================================
# Canonical Permission Definitions
# ==============================================================================

class Permissions:
    # Parcel Permissions
    PARCEL_READ_PUBLIC = "parcel.read.public"
    PARCEL_READ_PRIVATE = "parcel.read.private"
    PARCEL_UPDATE = "parcel.update"
    PARCEL_VERIFY = "parcel.verify"
    PARCEL_REJECT = "parcel.reject"
    PARCEL_EDIT_BOUNDARY = "parcel.edit_boundary"

    # Owner Permissions
    OWNER_READ_PUBLIC = "owner.read.public"
    OWNER_READ_FULL = "owner.read.full"
    OWNER_UPDATE = "owner.update"

    # Land Record Permissions
    LAND_RECORD_READ = "land_record.read"
    LAND_RECORD_IMPORT = "land_record.import"
    LAND_RECORD_DELETE = "land_record.delete"

    # Cadastral Permissions
    CADASTRAL_READ = "cadastral.read"
    CADASTRAL_UPDATE = "cadastral.update"

    # AI Intelligence Permissions
    AI_READ = "ai.read"
    AI_VERIFY = "ai.verify"
    AI_MANAGE_MODELS = "ai.manage_models"

    # Survey Permissions
    SURVEY_CREATE = "survey.create"
    SURVEY_READ = "survey.read"
    SURVEY_UPDATE = "survey.update"

    # Document Permissions
    DOCUMENT_READ = "document.read"
    DOCUMENT_UPLOAD = "document.upload"
    DOCUMENT_DELETE = "document.delete"

    # Ingestion & Processing Permissions
    PROCESSING_READ = "processing.read"
    PROCESSING_CREATE = "processing.create"

    # User & RBAC Management Permissions
    USER_READ = "user.read"
    USER_CREATE = "user.create"
    USER_UPDATE = "user.update"
    USER_DISABLE = "user.disable"

    # Audit & System Admin Permissions
    AUDIT_READ = "audit.read"
    SYSTEM_ADMIN = "system.admin"
    ALL = "*"


# Permission Metadata (Resource type and description)
ALL_PERMISSIONS_METADATA: List[Dict[str, str]] = [
    {"name": Permissions.PARCEL_READ_PUBLIC, "description": "View public parcel geometry and generalized attributes", "resource_type": "parcel"},
    {"name": Permissions.PARCEL_READ_PRIVATE, "description": "View complete operational parcel data and Khasra details", "resource_type": "parcel"},
    {"name": Permissions.PARCEL_UPDATE, "description": "Update parcel attributes and metadata", "resource_type": "parcel"},
    {"name": Permissions.PARCEL_VERIFY, "description": "Authorize and sign off on surveyor-verified parcel boundaries", "resource_type": "parcel"},
    {"name": Permissions.PARCEL_REJECT, "description": "Reject detected boundary candidates", "resource_type": "parcel"},
    {"name": Permissions.PARCEL_EDIT_BOUNDARY, "description": "Manually adjust parcel boundary vertices in GIS", "resource_type": "parcel"},
    
    {"name": Permissions.OWNER_READ_PUBLIC, "description": "View masked title-holder references", "resource_type": "owner"},
    {"name": Permissions.OWNER_READ_FULL, "description": "View full legal names and ownership details", "resource_type": "owner"},
    {"name": Permissions.OWNER_UPDATE, "description": "Modify ownership records and share allocations", "resource_type": "owner"},
    
    {"name": Permissions.LAND_RECORD_READ, "description": "View Jamabandi and official land record documents", "resource_type": "land_record"},
    {"name": Permissions.LAND_RECORD_IMPORT, "description": "Batch import revenue cadastre datasets (CSV, GeoJSON)", "resource_type": "land_record"},
    {"name": Permissions.LAND_RECORD_DELETE, "description": "Remove or archive imported land record batches", "resource_type": "land_record"},
    
    {"name": Permissions.CADASTRAL_READ, "description": "View historical and revenue cadastral layers", "resource_type": "cadastral"},
    {"name": Permissions.CADASTRAL_UPDATE, "description": "Publish new cadastral revisions and settlement versions", "resource_type": "cadastral"},
    
    {"name": Permissions.AI_READ, "description": "View AI land classification, boundaries, and change detection", "resource_type": "ai"},
    {"name": Permissions.AI_VERIFY, "description": "Accept or adjust AI-generated boundary inferences", "resource_type": "ai"},
    {"name": Permissions.AI_MANAGE_MODELS, "description": "Register, evaluate, and switch AI model versions", "resource_type": "ai"},
    
    {"name": Permissions.SURVEY_CREATE, "description": "Initiate new agricultural survey projects", "resource_type": "survey"},
    {"name": Permissions.SURVEY_READ, "description": "View survey mission details and flight data", "resource_type": "survey"},
    {"name": Permissions.SURVEY_UPDATE, "description": "Update survey parameters and status", "resource_type": "survey"},
    
    {"name": Permissions.DOCUMENT_READ, "description": "Download and inspect attached property deeds and PDFs", "resource_type": "document"},
    {"name": Permissions.DOCUMENT_UPLOAD, "description": "Attach survey reports and revenue documents", "resource_type": "document"},
    {"name": Permissions.DOCUMENT_DELETE, "description": "Delete attached parcel documents", "resource_type": "document"},
    
    {"name": Permissions.PROCESSING_READ, "description": "Inspect photogrammetry and processing pipeline jobs", "resource_type": "processing"},
    {"name": Permissions.PROCESSING_CREATE, "description": "Trigger orthomosaic, DEM, and LiDAR fusion jobs", "resource_type": "processing"},
    
    {"name": Permissions.USER_READ, "description": "List and inspect user accounts and active sessions", "resource_type": "user"},
    {"name": Permissions.USER_CREATE, "description": "Create new user accounts and invite surveyors", "resource_type": "user"},
    {"name": Permissions.USER_UPDATE, "description": "Modify user roles, permissions, and status", "resource_type": "user"},
    {"name": Permissions.USER_DISABLE, "description": "Suspend, lock, or deactivate user accounts", "resource_type": "user"},
    
    {"name": Permissions.AUDIT_READ, "description": "View immutable security and activity audit logs", "resource_type": "audit"},
    {"name": Permissions.SYSTEM_ADMIN, "description": "Full administrative privileges across the platform", "resource_type": "system"},
]


# ==============================================================================
# Role-to-Permission Mapping Policy
# ==============================================================================

ROLE_PERMISSIONS_MAP: Dict[str, List[str]] = {
    "PUBLIC": [
        Permissions.PARCEL_READ_PUBLIC,
        Permissions.OWNER_READ_PUBLIC,
        Permissions.CADASTRAL_READ,
        Permissions.AI_READ,
        Permissions.SURVEY_READ,
    ],
    "SURVEYOR": [
        Permissions.PARCEL_READ_PUBLIC,
        Permissions.PARCEL_READ_PRIVATE,
        Permissions.PARCEL_UPDATE,
        Permissions.PARCEL_VERIFY,
        Permissions.PARCEL_REJECT,
        Permissions.PARCEL_EDIT_BOUNDARY,
        Permissions.OWNER_READ_PUBLIC,
        Permissions.OWNER_READ_FULL,
        Permissions.CADASTRAL_READ,
        Permissions.AI_READ,
        Permissions.AI_VERIFY,
        Permissions.SURVEY_CREATE,
        Permissions.SURVEY_READ,
        Permissions.SURVEY_UPDATE,
        Permissions.DOCUMENT_READ,
        Permissions.DOCUMENT_UPLOAD,
        Permissions.PROCESSING_READ,
        Permissions.PROCESSING_CREATE,
        Permissions.AUDIT_READ,
    ],
    "GOVERNMENT_OFFICIAL": [
        # All Surveyor permissions plus official administration:
        Permissions.PARCEL_READ_PUBLIC,
        Permissions.PARCEL_READ_PRIVATE,
        Permissions.PARCEL_UPDATE,
        Permissions.PARCEL_VERIFY,
        Permissions.PARCEL_REJECT,
        Permissions.PARCEL_EDIT_BOUNDARY,
        Permissions.OWNER_READ_PUBLIC,
        Permissions.OWNER_READ_FULL,
        Permissions.OWNER_UPDATE,
        Permissions.LAND_RECORD_READ,
        Permissions.LAND_RECORD_IMPORT,
        Permissions.LAND_RECORD_DELETE,
        Permissions.CADASTRAL_READ,
        Permissions.CADASTRAL_UPDATE,
        Permissions.AI_READ,
        Permissions.AI_VERIFY,
        Permissions.AI_MANAGE_MODELS,
        Permissions.SURVEY_CREATE,
        Permissions.SURVEY_READ,
        Permissions.SURVEY_UPDATE,
        Permissions.DOCUMENT_READ,
        Permissions.DOCUMENT_UPLOAD,
        Permissions.DOCUMENT_DELETE,
        Permissions.PROCESSING_READ,
        Permissions.PROCESSING_CREATE,
        Permissions.AUDIT_READ,
    ],
    "ADMIN": [
        Permissions.ALL,
        Permissions.SYSTEM_ADMIN,
        Permissions.USER_READ,
        Permissions.USER_CREATE,
        Permissions.USER_UPDATE,
        Permissions.USER_DISABLE,
        Permissions.AUDIT_READ,
        Permissions.LAND_RECORD_IMPORT,
        Permissions.LAND_RECORD_DELETE,
        Permissions.AI_MANAGE_MODELS,
    ],
}


def get_permissions_for_role(role_name: str) -> List[str]:
    """
    Returns the list of permissions associated with a given role name.
    """
    return ROLE_PERMISSIONS_MAP.get(role_name.upper(), [])


def get_permissions_for_roles(role_names: List[str]) -> List[str]:
    """
    Aggregates permissions across multiple assigned roles.
    """
    if any(r.upper() == "ADMIN" for r in role_names):
        return [Permissions.ALL]
    perms: Set[str] = set()
    for r in role_names:
        perms.update(get_permissions_for_role(r))
    return sorted(list(perms))
