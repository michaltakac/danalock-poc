import { DanalockClient, Lock, Device } from './danalock-client';
import { danalockConfig } from './config';

let cachedClient: DanalockClient | null = null;
const lockCache = new Map<string, Lock>();
const bridgeCache = new Map<string, Device>();

export function getDanalockClient(): DanalockClient {
  if (!cachedClient) {
    cachedClient = new DanalockClient({
      username: danalockConfig.username,
      password: danalockConfig.password
    });
  }
  return cachedClient;
}

export async function getLockByName(lockName: string): Promise<Lock> {
  if (lockCache.has(lockName)) {
    return lockCache.get(lockName)!;
  }

  const client = getDanalockClient();
  const locks = await client.getLocks();
  
  const lock = locks.find(l => l.name === lockName);
  
  if (!lock) {
    throw new Error(`Lock "${lockName}" not found`);
  }

  lockCache.set(lockName, lock);
  return lock;
}

export async function getBridgeForLock(lockName: string): Promise<Device> {
  if (bridgeCache.has(lockName)) {
    return bridgeCache.get(lockName)!;
  }

  const client = getDanalockClient();
  const lock = await getLockByName(lockName);
  
  if (!lock.afi?.serial_number) {
    throw new Error(`Lock "${lockName}" does not have a serial number`);
  }

  const devices = await client.getPairedDevices(lock.afi.serial_number);
  const bridge = devices.find(device => device.device.device_type === 'danabridgev3');
  
  if (!bridge) {
    throw new Error(`No Danabridge V3 found paired with lock "${lockName}"`);
  }

  bridgeCache.set(lockName, bridge);
  return bridge;
}

export async function getLockSerialNumber(lockName: string): Promise<string> {
  const lock = await getLockByName(lockName);
  
  if (!lock.afi?.serial_number) {
    throw new Error(`Lock "${lockName}" does not have a serial number`);
  }

  return lock.afi.serial_number;
}