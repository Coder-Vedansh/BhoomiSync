import {
  DroneMission,
  Drone,
  TelemetryRecord,
  MissionHealth,
  SimulatorStatus,
  R2StorageStats,
} from "../types/droneMission";

const API_BASE = "/api/v1/drone";

export const droneMissionApi = {
  async listDrones(): Promise<Drone[]> {
    const res = await fetch(`${API_BASE}/drones`);
    if (!res.ok) throw new Error("Failed to fetch drones");
    return res.json();
  },

  async listMissions(): Promise<DroneMission[]> {
    const res = await fetch(`${API_BASE}/missions`);
    if (!res.ok) throw new Error("Failed to fetch missions");
    return res.json();
  },

  async getMission(missionId: string): Promise<DroneMission> {
    const res = await fetch(`${API_BASE}/missions/${missionId}`);
    if (!res.ok) throw new Error(`Failed to fetch mission ${missionId}`);
    return res.json();
  },

  async createMission(payload: {
    drone_id: string;
    mission_name: string;
    survey_id: string;
  }): Promise<DroneMission> {
    const res = await fetch(`${API_BASE}/missions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create mission");
    return res.json();
  },

  async startMission(missionId: string): Promise<DroneMission> {
    const res = await fetch(`${API_BASE}/missions/${missionId}/start`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to start mission");
    return res.json();
  },

  async pauseMission(missionId: string): Promise<DroneMission> {
    const res = await fetch(`${API_BASE}/missions/${missionId}/pause`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to pause mission");
    return res.json();
  },

  async resumeMission(missionId: string): Promise<DroneMission> {
    const res = await fetch(`${API_BASE}/missions/${missionId}/resume`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to resume mission");
    return res.json();
  },

  async endMission(missionId: string): Promise<DroneMission> {
    const res = await fetch(`${API_BASE}/missions/${missionId}/end`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to end mission");
    return res.json();
  },

  async cancelMission(missionId: string): Promise<DroneMission> {
    const res = await fetch(`${API_BASE}/missions/${missionId}/cancel`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to cancel mission");
    return res.json();
  },

  async stopMission(missionId: string): Promise<DroneMission> {
    const res = await fetch(`${API_BASE}/missions/${missionId}/stop`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to stop mission");
    return res.json();
  },

  async getTelemetry(missionId: string, limit = 500): Promise<TelemetryRecord[]> {
    const res = await fetch(`${API_BASE}/missions/${missionId}/telemetry?limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch telemetry");
    return res.json();
  },

  async getHealth(missionId: string): Promise<MissionHealth> {
    const res = await fetch(`${API_BASE}/missions/${missionId}/health`);
    if (!res.ok) throw new Error("Failed to fetch mission health");
    return res.json();
  },

  async triggerProcessing(missionId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/missions/${missionId}/trigger-processing`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to trigger processing");
    return res.json();
  },

  async startSimulator(payload: {
    survey_id?: string;
    drone_id?: string;
    mission_id?: string;
    speed_factor?: number;
    total_frames?: number;
  }): Promise<SimulatorStatus> {
    const res = await fetch(`${API_BASE}/simulator/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to start flight simulator");
    return res.json();
  },

  async stopSimulator(): Promise<SimulatorStatus> {
    const res = await fetch(`${API_BASE}/simulator/stop`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to stop simulator");
    return res.json();
  },

  async getSimulatorStatus(): Promise<SimulatorStatus> {
    const res = await fetch(`${API_BASE}/simulator/status`);
    if (!res.ok) throw new Error("Failed to fetch simulator status");
    return res.json();
  },

  async getR2StorageStats(refresh = false): Promise<R2StorageStats> {
    const res = await fetch(`${API_BASE}/storage/stats?refresh=${refresh}`);
    if (!res.ok) throw new Error("Failed to fetch R2 storage stats");
    return res.json();
  },

  createWebSocket(
    missionId: string,
    onMessage: (data: any) => void,
    onError?: (err: any) => void
  ): { close: () => void } {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/missions/${missionId}`;
    
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isClosed = false;

    const connect = () => {
      if (isClosed) return;
      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          console.log(`[WebSocket] Connected to mission: ${missionId}`);
        };
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            onMessage(data);
          } catch (e) {
            // Text pong or non-json message
          }
        };
        ws.onerror = (error) => {
          if (onError) onError(error);
        };
        ws.onclose = () => {
          if (!isClosed) {
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };
      } catch (e) {
        if (!isClosed) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      }
    };

    connect();

    return {
      close: () => {
        isClosed = true;
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        if (ws) ws.close();
      },
    };
  },
};
