-- Enable PostGIS and spatial extensions for BhoomiSync
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schema creation and spatial indexing for Drone Ingestion & Cadastral Mapping
CREATE TABLE IF NOT EXISTS surveys (
    id SERIAL PRIMARY KEY,
    survey_id VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    district VARCHAR(128),
    state VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'PLANNED',
    survey_date TIMESTAMP WITH TIME ZONE NOT NULL,
    center_latitude DOUBLE PRECISION NOT NULL,
    center_longitude DOUBLE PRECISION NOT NULL,
    boundary_geojson JSONB,
    total_area_hectares DOUBLE PRECISION DEFAULT 0.0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_surveys_survey_id ON surveys(survey_id);

CREATE TABLE IF NOT EXISTS datasets (
    id SERIAL PRIMARY KEY,
    dataset_id VARCHAR(64) UNIQUE NOT NULL,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    parent_dataset_id INTEGER REFERENCES datasets(id) ON DELETE SET NULL,
    dataset_type VARCHAR(32) NOT NULL,
    source VARCHAR(32) NOT NULL DEFAULT 'DRONE_ACQUISITION',
    status VARCHAR(32) NOT NULL DEFAULT 'READY',
    is_immutable BOOLEAN DEFAULT TRUE,
    metadata_json JSONB DEFAULT '{}'::jsonb,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_datasets_survey ON datasets(survey_id);

CREATE TABLE IF NOT EXISTS sensors (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    sensor_type VARCHAR(32) NOT NULL,
    model VARCHAR(128),
    serial_number VARCHAR(128),
    specifications_json JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS upload_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) UNIQUE NOT NULL,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    device_id VARCHAR(64) NOT NULL,
    gateway_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'CREATED',
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    total_files INTEGER DEFAULT 0,
    uploaded_files INTEGER DEFAULT 0,
    failed_files INTEGER DEFAULT 0,
    total_bytes BIGINT DEFAULT 0,
    uploaded_bytes BIGINT DEFAULT 0,
    meta_info JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_upload_sessions_survey ON upload_sessions(survey_id);
CREATE INDEX IF NOT EXISTS ix_upload_sessions_status ON upload_sessions(status);

CREATE TABLE IF NOT EXISTS uploaded_files (
    id SERIAL PRIMARY KEY,
    file_id VARCHAR(64) UNIQUE NOT NULL,
    session_id INTEGER REFERENCES upload_sessions(id) ON DELETE SET NULL,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    dataset_id INTEGER REFERENCES datasets(id) ON DELETE SET NULL,
    sensor_id INTEGER REFERENCES sensors(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    file_format VARCHAR(32) NOT NULL,
    file_size_bytes BIGINT DEFAULT 0,
    mime_type VARCHAR(128) NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    storage_provider VARCHAR(32) NOT NULL DEFAULT 'MOCK',
    storage_key VARCHAR(512) NOT NULL,
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of_file_id VARCHAR(64),
    upload_status VARCHAR(32) NOT NULL DEFAULT 'UPLOADED',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    altitude DOUBLE PRECISION,
    gps_accuracy DOUBLE PRECISION,
    rtk_fix_status VARCHAR(32),
    satellite_count INTEGER,
    capture_timestamp TIMESTAMP WITH TIME ZONE,
    exif_metadata_json JSONB DEFAULT '{}'::jsonb,
    lidar_metadata_json JSONB DEFAULT '{}'::jsonb,
    validation_errors JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_uploaded_files_survey_status ON uploaded_files(survey_id, upload_status);
CREATE INDEX IF NOT EXISTS ix_uploaded_files_checksum ON uploaded_files(checksum_sha256);

CREATE TABLE IF NOT EXISTS position_records (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES upload_sessions(id) ON DELETE CASCADE,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION DEFAULT 0.0,
    accuracy_horizontal_m DOUBLE PRECISION,
    accuracy_vertical_m DOUBLE PRECISION,
    fix_status VARCHAR(32) NOT NULL DEFAULT 'FIXED_RTK',
    satellite_count INTEGER DEFAULT 12,
    hdop DOUBLE PRECISION,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_position_records_survey_time ON position_records(survey_id, timestamp);

CREATE TABLE IF NOT EXISTS processing_jobs (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(64) UNIQUE NOT NULL,
    job_type VARCHAR(64) NOT NULL,
    file_id INTEGER REFERENCES uploaded_files(id) ON DELETE CASCADE,
    dataset_id INTEGER REFERENCES datasets(id) ON DELETE SET NULL,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
    progress_percentage DOUBLE PRECISION DEFAULT 0.0,
    error_message TEXT,
    parameters_json JSONB DEFAULT '{}'::jsonb,
    result_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS ix_processing_jobs_survey_status ON processing_jobs(survey_id, status);
CREATE INDEX IF NOT EXISTS ix_processing_jobs_type ON processing_jobs(job_type);

CREATE TABLE IF NOT EXISTS parcels (
    id SERIAL PRIMARY KEY,
    parcel_id VARCHAR(64) UNIQUE NOT NULL,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    dataset_id INTEGER REFERENCES datasets(id) ON DELETE SET NULL,
    geometry_geojson JSONB NOT NULL,
    crs VARCHAR(32) NOT NULL DEFAULT 'EPSG:4326',
    area_m2 DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    area_hectares DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    perimeter_m DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    centroid_lat DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    centroid_lon DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    surface_area_m2 DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    surface_area_hectares DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    slope_degrees DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    elevation_min_m DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    elevation_max_m DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    land_use VARCHAR(32) NOT NULL DEFAULT 'AGRICULTURAL_CROP',
    source VARCHAR(32) NOT NULL DEFAULT 'AI_SEGMENTATION',
    confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'AI_DETECTED',
    version INTEGER NOT NULL DEFAULT 1,
    attributes_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_parcels_survey ON parcels(survey_id);

CREATE TABLE IF NOT EXISTS detected_boundaries (
    id SERIAL PRIMARY KEY,
    boundary_id VARCHAR(64) UNIQUE NOT NULL,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    geometry_geojson JSONB NOT NULL,
    confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0.90,
    detection_method VARCHAR(64) NOT NULL DEFAULT 'LIDAR_ELEVATION_RIDGE',
    source_dataset VARCHAR(64) NOT NULL DEFAULT 'DS-2026-001-ORTHO',
    status VARCHAR(32) NOT NULL DEFAULT 'DETECTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_detected_boundaries_survey ON detected_boundaries(survey_id);

CREATE TABLE IF NOT EXISTS ai_models (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(64) UNIQUE NOT NULL,
    model_name VARCHAR(128) NOT NULL,
    model_type VARCHAR(64) NOT NULL,
    version VARCHAR(32) NOT NULL,
    framework VARCHAR(64) DEFAULT 'PyTorch / ONNX / Ultralytics',
    classes JSONB NOT NULL,
    input_requirements JSONB DEFAULT '[]'::jsonb,
    sensor_requirements JSONB DEFAULT '[]'::jsonb,
    model_path VARCHAR(256),
    checksum VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ai_models_model_id ON ai_models(model_id);

CREATE TABLE IF NOT EXISTS ai_inference_results (
    id SERIAL PRIMARY KEY,
    inference_id VARCHAR(64) UNIQUE NOT NULL,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    dataset_id INTEGER REFERENCES datasets(id) ON DELETE SET NULL,
    job_id INTEGER REFERENCES processing_jobs(id) ON DELETE SET NULL,
    model_id VARCHAR(64) NOT NULL,
    model_version VARCHAR(32) NOT NULL,
    inference_type VARCHAR(64) NOT NULL,
    execution_time_ms DOUBLE PRECISION DEFAULT 0.0,
    confidence_overall DOUBLE PRECISION DEFAULT 0.0,
    summary_metrics_json JSONB DEFAULT '{}'::jsonb,
    parameters_json JSONB DEFAULT '{}'::jsonb,
    is_demo_simulation BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ai_inferences_survey ON ai_inference_results(survey_id);

CREATE TABLE IF NOT EXISTS ai_classification_results (
    id SERIAL PRIMARY KEY,
    result_id VARCHAR(64) UNIQUE NOT NULL,
    inference_id INTEGER NOT NULL REFERENCES ai_inference_results(id) ON DELETE CASCADE,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    class_name VARCHAR(64) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    area_m2 DOUBLE PRECISION NOT NULL,
    area_hectares DOUBLE PRECISION NOT NULL,
    percentage DOUBLE PRECISION DEFAULT 0.0,
    geometry_geojson JSONB NOT NULL,
    crs VARCHAR(32) DEFAULT 'EPSG:4326',
    source_dataset_id VARCHAR(64),
    model_version VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ai_classifications_survey ON ai_classification_results(survey_id);
CREATE INDEX IF NOT EXISTS ix_ai_classifications_class ON ai_classification_results(class_name);

CREATE TABLE IF NOT EXISTS ai_boundary_results (
    id SERIAL PRIMARY KEY,
    boundary_id VARCHAR(64) UNIQUE NOT NULL,
    inference_id INTEGER NOT NULL REFERENCES ai_inference_results(id) ON DELETE CASCADE,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    boundary_type VARCHAR(64) DEFAULT 'FIELD_BUND_RIDGE',
    confidence DOUBLE PRECISION NOT NULL,
    sources_json JSONB DEFAULT '[]'::jsonb,
    geometry_geojson JSONB NOT NULL,
    crs VARCHAR(32) DEFAULT 'EPSG:4326',
    length_m DOUBLE PRECISION DEFAULT 0.0,
    estimated_area_m2 DOUBLE PRECISION DEFAULT 0.0,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'CANDIDATE',
    surveyor_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS ix_ai_boundaries_survey ON ai_boundary_results(survey_id);

CREATE TABLE IF NOT EXISTS ai_change_results (
    id SERIAL PRIMARY KEY,
    change_id VARCHAR(64) UNIQUE NOT NULL,
    inference_id INTEGER NOT NULL REFERENCES ai_inference_results(id) ON DELETE CASCADE,
    survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    change_type VARCHAR(64) NOT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
    old_value VARCHAR(128) NOT NULL,
    new_value VARCHAR(128) NOT NULL,
    area_affected_m2 DOUBLE PRECISION DEFAULT 0.0,
    percentage_change DOUBLE PRECISION DEFAULT 0.0,
    confidence DOUBLE PRECISION NOT NULL,
    geometry_geojson JSONB NOT NULL,
    crs VARCHAR(32) DEFAULT 'EPSG:4326',
    historical_dataset_id VARCHAR(64),
    current_dataset_id VARCHAR(64),
    audit_status VARCHAR(32) DEFAULT 'PENDING_SURVEYOR_REVIEW',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ai_changes_survey ON ai_change_results(survey_id);

CREATE TABLE IF NOT EXISTS ai_audit_logs (
    id SERIAL PRIMARY KEY,
    target_type VARCHAR(32) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    user_action VARCHAR(32) NOT NULL,
    original_ai_result_json JSONB NOT NULL,
    edited_geometry_geojson JSONB,
    reason TEXT,
    surveyor_id VARCHAR(64) DEFAULT 'SURVEYOR_OFFICIAL',
    model_version VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_ai_audit_target ON ai_audit_logs(target_id);

-- =============================================================================
-- PROMPT 5: Land Records, Ownership & Cadastral Intelligence Models
-- =============================================================================

CREATE TABLE IF NOT EXISTS land_record_import_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) UNIQUE NOT NULL,
    source_name VARCHAR(128) NOT NULL,
    source_type VARCHAR(32) DEFAULT 'CSV',
    filename VARCHAR(256),
    checksum VARCHAR(64),
    total_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    duplicate_records INTEGER DEFAULT 0,
    validation_errors_json JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(32) DEFAULT 'COMPLETED',
    imported_by VARCHAR(64) DEFAULT 'SYSTEM_ADMIN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS land_parcels (
    id SERIAL PRIMARY KEY,
    parcel_id VARCHAR(64) UNIQUE NOT NULL,
    survey_id INTEGER REFERENCES surveys(id) ON DELETE SET NULL,
    survey_number VARCHAR(64) NOT NULL,
    subdivision_number VARCHAR(32),
    state VARCHAR(64) DEFAULT 'Rajasthan',
    district VARCHAR(64) DEFAULT 'Udaipur',
    tehsil VARCHAR(64) DEFAULT 'Girwa',
    village VARCHAR(64) DEFAULT 'Haripura',
    land_record_source VARCHAR(128) DEFAULT 'Rajasthan Revenue Department (Apna Khata / Bhunaksha)',
    official_area_m2 DOUBLE PRECISION NOT NULL,
    official_area_hectares DOUBLE PRECISION NOT NULL,
    cadastral_geometry JSONB NOT NULL,
    current_geometry JSONB,
    verified_geometry JSONB,
    geometry_source VARCHAR(64) DEFAULT 'REVENUE_CADASTRAL_MAP',
    land_status VARCHAR(32) DEFAULT 'ACTIVE',
    land_use VARCHAR(64) DEFAULT 'AGRICULTURAL',
    ai_detected_land_use VARCHAR(64),
    classification_confidence DOUBLE PRECISION DEFAULT 0.92,
    drone_measured_area_m2 DOUBLE PRECISION,
    verified_area_m2 DOUBLE PRECISION,
    historical_area_m2 DOUBLE PRECISION,
    ownership_status VARCHAR(64) DEFAULT 'CLEAR_TITLED',
    record_status VARCHAR(32) DEFAULT 'OFFICIAL',
    verification_status VARCHAR(32) DEFAULT 'PENDING',
    match_status VARCHAR(32) DEFAULT 'MATCHED',
    match_confidence DOUBLE PRECISION DEFAULT 0.95,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_land_parcels_survey_no ON land_parcels(survey_number);
CREATE INDEX IF NOT EXISTS ix_land_parcels_village ON land_parcels(village);
CREATE INDEX IF NOT EXISTS ix_land_parcels_status ON land_parcels(verification_status);

CREATE TABLE IF NOT EXISTS land_owners (
    id SERIAL PRIMARY KEY,
    owner_id VARCHAR(64) UNIQUE NOT NULL,
    owner_reference VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    ownership_type VARCHAR(32) DEFAULT 'INDIVIDUAL',
    ownership_percentage DOUBLE PRECISION DEFAULT 100.0,
    contact_reference VARCHAR(64),
    record_source VARCHAR(128) DEFAULT 'Apna Khata Land Registry',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parcel_ownerships (
    id SERIAL PRIMARY KEY,
    parcel_id INTEGER NOT NULL REFERENCES land_parcels(id) ON DELETE CASCADE,
    owner_id INTEGER NOT NULL REFERENCES land_owners(id) ON DELETE CASCADE,
    ownership_percentage DOUBLE PRECISION DEFAULT 100.0,
    ownership_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ownership_end_date TIMESTAMP WITH TIME ZONE,
    ownership_status VARCHAR(32) DEFAULT 'ACTIVE',
    source_record_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS land_records (
    id SERIAL PRIMARY KEY,
    record_id VARCHAR(64) UNIQUE NOT NULL,
    parcel_id INTEGER NOT NULL REFERENCES land_parcels(id) ON DELETE CASCADE,
    import_session_id INTEGER REFERENCES land_record_import_sessions(id) ON DELETE SET NULL,
    record_type VARCHAR(64) DEFAULT 'KHASRA_RECORD',
    source VARCHAR(128) NOT NULL,
    document_reference VARCHAR(128),
    record_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checksum VARCHAR(64),
    metadata_json JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS cadastral_versions (
    id SERIAL PRIMARY KEY,
    parcel_id INTEGER NOT NULL REFERENCES land_parcels(id) ON DELETE CASCADE,
    version_number VARCHAR(32) NOT NULL,
    geometry JSONB NOT NULL,
    source VARCHAR(128) NOT NULL,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    captured_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    area_m2 DOUBLE PRECISION NOT NULL,
    created_by VARCHAR(64) DEFAULT 'REVENUE_AUTHORITY',
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parcel_change_records (
    id SERIAL PRIMARY KEY,
    change_record_id VARCHAR(64) UNIQUE NOT NULL,
    parcel_id INTEGER NOT NULL REFERENCES land_parcels(id) ON DELETE CASCADE,
    change_type VARCHAR(64) NOT NULL,
    severity VARCHAR(32) DEFAULT 'MEDIUM',
    old_geometry JSONB,
    new_geometry JSONB,
    area_difference_m2 DOUBLE PRECISION DEFAULT 0.0,
    boundary_shift_m DOUBLE PRECISION DEFAULT 0.0,
    confidence DOUBLE PRECISION DEFAULT 0.90,
    detection_job_id VARCHAR(64),
    verification_status VARCHAR(32) DEFAULT 'PENDING_SURVEYOR',
    surveyor_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parcel_documents (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(64) UNIQUE NOT NULL,
    parcel_id INTEGER NOT NULL REFERENCES land_parcels(id) ON DELETE CASCADE,
    title VARCHAR(128) NOT NULL,
    document_type VARCHAR(64) DEFAULT 'OWNERSHIP_RECORD',
    file_format VARCHAR(16) DEFAULT 'PDF',
    storage_path VARCHAR(256) NOT NULL,
    file_size_bytes INTEGER DEFAULT 0,
    checksum VARCHAR(64),
    source VARCHAR(128) DEFAULT 'Sub-Registrar Office / Tehsil Record Room',
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata_json JSONB DEFAULT '{}'::jsonb
);

-- ==============================================================================
-- Prompt 6: Authentication, RBAC, Sessions & Security Audit
-- ==============================================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_reference VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS ix_users_username ON users(username);
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    is_system_role BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_roles_name ON roles(name);

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(255),
    resource_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_permissions_name ON permissions(name);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    family_id VARCHAR(50) NOT NULL,
    device_reference VARCHAR(255),
    is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS ix_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS ix_refresh_tokens_family_id ON refresh_tokens(family_id);

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_reference VARCHAR(100),
    user_agent VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS ix_user_sessions_user_id ON user_sessions(user_id);

CREATE TABLE IF NOT EXISTS security_audit_logs (
    id SERIAL PRIMARY KEY,
    audit_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username_snapshot VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    result VARCHAR(20) DEFAULT 'SUCCESS' NOT NULL,
    ip_address VARCHAR(100),
    user_agent VARCHAR(255),
    metadata_json JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_security_audit_action ON security_audit_logs(action);
CREATE INDEX IF NOT EXISTS ix_security_audit_timestamp ON security_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS ix_security_audit_resource ON security_audit_logs(resource_type, resource_id);

-- Verify PostGIS Version
DO $$
BEGIN
    RAISE NOTICE 'PostGIS Version: %', PostGIS_Full_Version();
END $$;



