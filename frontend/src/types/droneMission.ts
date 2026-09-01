export type DroneStatus = "IDLE" | "CONNECTED" | "TRANSMITTING" | "RETURNING" | "OFFLINE" | "MAINTENANCE";

export type MissionStatus = "INITIALIZED" | "ACTIVE" | "RECEIVING_DATA" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type SensorDataType = "RGB" | "LIDAR" | "GNSS" | "IMU" | "TELEMETRY";

export type ObjectStatus = "PENDING_UPLOAD" | "UPLOADED" | "VERIFIED" | "CORRUPTED" | "PROCESSED" | "FAILED";

export type JobStageStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "RETRYING";

export interface Drone {
  id: number;
  drone_id: string;
  name: string;
  model: string;
  status: DroneStatus;
  battery_percent: number;
  firmware_version: string;
  last_seen?: string;
  meta_info: Record<string, any>;
  created_at: string;
}

export interface ProcessingStageDTO {
  stage_number: number;
  stage_name: string;
  status: JobStageStatus;
  progress: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

export interface DroneMission {
  id: number;
  mission_id: string;
  mission_name: string;
  survey_id: string;
  drone_id: string;
  status: MissionStatus;
  started_at?: string;
  ended_at?: string;
  last_data_at?: string;
  total_objects: number;
  processed_objects: number;
  failed_objects: number;
  total_bytes: number;
  meta_info: Record<string, any>;
  created_at: string;
  updated_at: string;
  stages: ProcessingStageDTO[];
}

export interface TelemetryRecord {
  id: number;
  mission_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  pitch: number;
  roll: number;
  rtk_status: string;
  satellites: number;
  hdop: number;
  speed: number;
  battery_percent: number;
  sequence_number: number;
}

export interface MissionHealth {
  mission_status: MissionStatus;
  drone_connected: boolean;
  last_telemetry_seconds: number;
  upload_rate_mbps: number;

  objects_received: number;
  processing_queue: number;
  failed_objects: number;
  storage_size_bytes: number;
  rtk_fix_rate: number;
  current_stage?: string;
  overall_progress: number;
}

export interface SimulatorStatus {
  is_running: boolean;
  mission_id?: string;
  survey_id?: string;
  drone_id?: string;
  frames_sent: number;
  total_frames: number;
  current_lat: number;
  current_lon: number;
  current_alt: number;
  current_heading: number;
  battery: number;
  status: string;
}
