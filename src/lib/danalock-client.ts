export interface DanalockCredentials {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface Lock {
  id: string;
  name: string;
  type: string;
  address: string;
  timezone: string;
  afi?: {
    serial_number: string;
    device_type: string;
  };
}

export interface Device {
  type: string;
  device: {
    serial_number: string;
    name: string;
    device_type: string;
    timezone: string;
  };
}

export interface JobResponse {
  id: string;
}

export interface LockStateResponse {
  id: string;
  status: string;
  result?: {
    state: string;
    lock_status: string;
    is_blocked: boolean;
    afi_status: number;
    afi_status_text: string;
    dmi_status: number;
    dmi_status_text: string;
  };
}

export interface LockOperateResponse {
  id: string;
  status: string;
  result?: {
    afi_status: number;
    afi_status_text: string;
    dmi_status: number;
    dmi_status_text: string;
  };
}

export interface BatteryLevelResponse {
  id: string;
  status: string;
  result?: {
    battery_level: number;
    afi_status: number;
    afi_status_text: string;
    dmi_status: number;
    dmi_status_text: string;
  };
}

export class DanalockClient {
  private baseUrl = 'https://api.danalock.com';
  private bridgeUrl = 'https://bridge.danalockservices.com';
  private accessToken: string | null = null;

  constructor(private credentials: DanalockCredentials) {}

  private async authenticate(): Promise<void> {
    const formData = new URLSearchParams({
      grant_type: 'password',
      username: this.credentials.username,
      password: this.credentials.password,
      client_id: 'danalock-web',
      client_secret: '',
      scope: ''
    });

    const response = await fetch(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.statusText}`);
    }

    const data: TokenResponse = await response.json();
    this.accessToken = data.access_token;
  }

  private async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      await this.authenticate();
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
    }

    return response;
  }

  async getLocks(): Promise<Lock[]> {
    const response = await this.makeAuthenticatedRequest(`${this.baseUrl}/locks/v1`);
    
    if (!response.ok) {
      throw new Error(`Failed to get locks: ${response.statusText}`);
    }

    return response.json();
  }

  async getPairedDevices(lockSerialNumber: string): Promise<Device[]> {
    const response = await this.makeAuthenticatedRequest(
      `${this.baseUrl}/devices/v1/${lockSerialNumber}/paired_devices`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get paired devices: ${response.statusText}`);
    }

    return response.json();
  }

  private async executeBridgeCommand(body: any): Promise<JobResponse> {
    const response = await this.makeAuthenticatedRequest(
      `${this.bridgeUrl}/bridge/v1/execute`,
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to execute bridge command: ${response.statusText}`);
    }

    return response.json();
  }

  private async pollBridgeCommand(jobId: string): Promise<any> {
    const response = await this.makeAuthenticatedRequest(
      `${this.bridgeUrl}/bridge/v1/poll`,
      {
        method: 'POST',
        body: JSON.stringify({ id: jobId })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to poll bridge command: ${response.statusText}`);
    }

    return response.json();
  }

  private async waitForBridgeResponse(jobId: string, maxRetries: number = 10): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 7000));

    for (let i = 0; i < maxRetries; i++) {
      const response = await this.pollBridgeCommand(jobId);
      
      if (response.status === 'Succeeded' || response.status === 'Failed') {
        return response;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Bridge command timeout');
  }

  async getLockState(lockSerialNumber: string): Promise<LockStateResponse> {
    const job = await this.executeBridgeCommand({
      device: lockSerialNumber,
      operation: 'afi.lock.get-state'
    });

    return this.waitForBridgeResponse(job.id);
  }

  async operateLock(lockSerialNumber: string, operation: 'lock' | 'unlock'): Promise<LockOperateResponse> {
    const job = await this.executeBridgeCommand({
      device: lockSerialNumber,
      operation: 'afi.lock.operate',
      arguments: [operation]
    });

    return this.waitForBridgeResponse(job.id);
  }

  async getBatteryLevel(lockSerialNumber: string): Promise<BatteryLevelResponse> {
    const job = await this.executeBridgeCommand({
      device: lockSerialNumber,
      operation: 'afi.power-source.get-information2'
    });

    return this.waitForBridgeResponse(job.id);
  }
}