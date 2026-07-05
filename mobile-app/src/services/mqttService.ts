import mqtt from 'mqtt';

export interface MqttConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  deviceId: string;
}

export interface TelemetryData {
  pm1: number;
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
  gasValue: number;
  airQuality: string;
  rgbColor: string;
  ionizerOn: boolean;
  wifiRSSI: number;
}

export interface OccupancyData {
  roomOccupied: boolean;
  pirState: boolean;
}

export interface RelayData {
  relayState: boolean;
  relayMode: 'auto' | 'manual_on' | 'manual_off';
}

export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';

class MqttService {
  private client: any = null;
  private config: MqttConfig | null = null;
  private statusCallback: ((status: ConnectionStatus) => void) | null = null;
  private errorCallback: ((error: string) => void) | null = null;
  private telemetryCallback: ((data: TelemetryData) => void) | null = null;
  private occupancyCallback: ((data: OccupancyData) => void) | null = null;
  private relayCallback: ((data: RelayData) => void) | null = null;
  private deviceStatusCallback: ((status: 'online' | 'offline') => void) | null = null;

  configure(config: MqttConfig) {
    this.config = config;
  }

  connect(
    onStatusChange: (status: ConnectionStatus) => void,
    onError: (error: string) => void,
    onTelemetry: (data: TelemetryData) => void,
    onOccupancy: (data: OccupancyData) => void,
    onRelay: (data: RelayData) => void,
    onDeviceStatus: (status: 'online' | 'offline') => void
  ) {
    if (!this.config) {
      onError('MQTT Service not configured.');
      return;
    }

    this.statusCallback = onStatusChange;
    this.errorCallback = onError;
    this.telemetryCallback = onTelemetry;
    this.occupancyCallback = onOccupancy;
    this.relayCallback = onRelay;
    this.deviceStatusCallback = onDeviceStatus;

    if (this.client) {
      console.log('Disconnecting existing MQTT client...');
      this.client.end(true);
    }

    const { host, port, username, password, deviceId } = this.config;
    
    // Construct the WSS URL (e.g. wss://xxxx.s1.eu.hivemq.cloud:8884/mqtt)
    // Secure WebSockets connection is required for cloud brokers over TLS
    const cleanHost = host.replace(/^(wss:\/\/|ws:\/\/)/, '');
    
    const wsUrl = `wss://${cleanHost}:${port}/mqtt`;

    console.log(`Connecting to MQTT Broker WSS: ${wsUrl}`);
    onStatusChange('CONNECTING');

    const clientId = `arrow_app_${Math.random().toString(16).substring(2, 10)}`;

    try {
      this.client = mqtt.connect(wsUrl, {
        clientId,
        username: username || undefined,
        password: password || undefined,
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 4000, // Automatic reconnect period
      });

      this.client.on('connect', () => {
        console.log('MQTT Client connected successfully!');
        onStatusChange('CONNECTED');

        // Subscribe to relevant topics for the configured device
        const topicBase = `arrow/aqi/${deviceId}/`;
        const topics = [
          `${topicBase}telemetry`,
          `${topicBase}occupancy`,
          `${topicBase}relay/state`,
          `${topicBase}status`,
        ];

        topics.forEach((topic) => {
          this.client?.subscribe(topic, { qos: 1 }, (err: Error | null) => {
            if (err) {
              console.error(`Subscription failed for topic: ${topic}`, err);
            } else {
              console.log(`Subscribed to topic: ${topic}`);
            }
          });
        });
      });

      this.client.on('reconnect', () => {
        console.log('MQTT Client reconnecting...');
        onStatusChange('RECONNECTING');
      });

      this.client.on('offline', () => {
        console.log('MQTT Client went offline.');
        onStatusChange('DISCONNECTED');
      });

      this.client.on('error', (err: any) => {
        console.error('MQTT Client connection error:', err);
        onStatusChange('ERROR');
        onError(err.message || 'MQTT Connection Error');
      });

      this.client.on('message', (topic: string, payload: any) => {
        const messageStr = payload.toString();
        const baseTopic = `arrow/aqi/${deviceId}`;

        try {
          if (topic === `${baseTopic}/telemetry`) {
            const data: TelemetryData = JSON.parse(messageStr);
            this.telemetryCallback?.(data);
          } else if (topic === `${baseTopic}/occupancy`) {
            const data: OccupancyData = JSON.parse(messageStr);
            this.occupancyCallback?.(data);
          } else if (topic === `${baseTopic}/relay/state`) {
            const data: RelayData = JSON.parse(messageStr);
            this.relayCallback?.(data);
          } else if (topic === `${baseTopic}/status`) {
            const status = messageStr as 'online' | 'offline';
            this.deviceStatusCallback?.(status);
          }
        } catch (parseError) {
          console.error(`Failed to parse JSON payload on topic ${topic}:`, parseError, messageStr);
        }
      });
    } catch (e: any) {
      console.error('Failed to initiate MQTT client connection:', e);
      onStatusChange('ERROR');
      onError(e.message || 'Client initialization failed.');
    }
  }

  setRelayMode(mode: '0' | '1' | '2') {
    if (!this.client || !this.config) {
      console.warn('Cannot publish command: MQTT Client not connected.');
      return false;
    }
    const topic = `arrow/aqi/${this.config.deviceId}/relay/set`;
    console.log(`Publishing command to ${topic}: ${mode}`);
    this.client.publish(topic, mode, { qos: 1 });
    return true;
  }

  disconnect() {
    if (this.client) {
      console.log('Closing MQTT Client connection...');
      this.client.end(true);
      this.client = null;
      this.statusCallback?.('DISCONNECTED');
    }
  }
}

export const mqttService = new MqttService();
