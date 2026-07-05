#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>
#include <DHT.h>
#include "secrets.h"

// --- Pin Map Definitions ---
#define NEOPIXEL_PIN     2    // Ring 1 — AQI/smoke NeoPixel (12 LEDs)
#define RELAY_PIN        3    // AC bulb relay
#define PIR_PIN          4    // PIR motion sensor input
#define IONIZER_PIN      5    // Ionizer control output
#define PMS_RX_PIN       6    // PMS5003 RX
#define PMS_TX_PIN       7    // PMS5003 TX
#define MQ2_PIN          0    // MQ-2 gas/smoke sensor analog input
#define DHT_PIN          10   // DHT11 temperature/humidity sensor

// --- Constant Parameters ---
#define NUM_LEDS         12
#define OCCUPANCY_TIMEOUT_MS  60000 // 60s exit timer for PIR occupancy
#define TELEMETRY_INTERVAL_MS 3000  // Publish telemetry every 3 seconds
#define DHT_INTERVAL_MS       2000  // Read DHT11 every 2 seconds

// --- State Variables ---
// DHT11 data
float temperature = 0.0;
float humidity = 0.0;
unsigned long lastDhtReadTime = 0;

// PMS5003 PM particulate data
uint16_t pm1_0 = 0;
uint16_t pm2_5 = 0;
uint16_t pm10 = 0;

// MQ-2 Gas data
int gasValue = 0;
bool smokeAlarmActive = false;

// PIR occupancy logic
bool roomOccupied = false;
bool pirState = false;
bool lastRoomOccupied = false;
bool lastPirState = false;
unsigned long lastPirHighTime = 0;

// Relay state and mode
// Mode: 0 = AUTO, 1 = MANUAL ON, 2 = MANUAL OFF
enum RelayMode {
  MODE_AUTO = 0,
  MODE_MANUAL_ON = 1,
  MODE_MANUAL_OFF = 2
};
RelayMode relayMode = MODE_AUTO;
bool relayState = false;
bool lastRelayState = false;
RelayMode lastRelayMode = MODE_AUTO;

// Ionizer
bool ionizerOn = false;

// WiFi / MQTT
int wifiRSSI = 0;
unsigned long lastTelemetryPublish = 0;
unsigned long lastWifiCheckTime = 0;

// MQTT Topic strings (dynamically created in setup)
String topicTelemetry;
String topicOccupancy;
String topicRelayState;
String topicRelaySet;
String topicStatus;

// --- Libraries Instances ---
DHT dht(DHT_PIN, DHT11);
Adafruit_NeoPixel strip(NUM_LEDS, NEOPIXEL_PIN, NEO_GRB + NEO_KHZ800);
WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

// --- Helper Prototypes ---
void checkSensors();
void updateControlLogic();
void updateLEDs();
bool readPMS5003();
void connectWiFi();
void connectMQTT();
void publishTelemetry();
void publishOccupancy(bool force = false);
void publishRelayState(bool force = false);
void mqttCallback(char* topic, byte* payload, unsigned int length);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("--- ARROW AQI Monitor starting ---");

  // Initialize GPIO Pins
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(IONIZER_PIN, OUTPUT);
  pinMode(PIR_PIN, INPUT); // Standard PIR sensor input
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(IONIZER_PIN, LOW);

  // Initialize Sensors & NeoPixel Ring
  dht.begin();
  strip.begin();
  strip.setBrightness(64); // Safe brightness level
  strip.show(); // Initialize all pixels to 'off'

  // Initialize PMS5003 Hardware Serial (Serial1 on ESP32-C3)
  Serial1.begin(9600, SERIAL_8N1, PMS_RX_PIN, PMS_TX_PIN);

  // Define MQTT Topics based on Device ID in secrets.h
  String topicBase = "arrow/aqi/" + String(DEVICE_ID) + "/";
  topicTelemetry = topicBase + "telemetry";
  topicOccupancy = topicBase + "occupancy";
  topicRelayState = topicBase + "relay/state";
  topicRelaySet = topicBase + "relay/set";
  topicStatus = topicBase + "status";

  // Setup Secure TLS client settings
  wifiClient.setInsecure(); // Ignore SSL certificate chain verification for convenience

  // Setup MQTT client
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  
  // Set buffer size large enough for JSON payloads (default 256 bytes)
  mqttClient.setBufferSize(512);

  // Connect to WiFi
  connectWiFi();
}

void loop() {
  unsigned long now = millis();

  // Monitor WiFi connectivity (non-blocking retry check every 10s)
  if (WiFi.status() != WL_CONNECTED) {
    if (now - lastWifiCheckTime > 10000) {
      lastWifiCheckTime = now;
      Serial.println("WiFi disconnected! Attempting reconnect...");
      connectWiFi();
    }
  } else {
    // If WiFi is connected, ensure MQTT is also connected
    if (!mqttClient.connected()) {
      connectMQTT();
    }
    mqttClient.loop();
  }

  // Read sensors, PMS5003 packet stream, and DHT11 (every 2 seconds)
  checkSensors();

  // Process occupancy exit timers and relay logic
  updateControlLogic();

  // Update physical NeoPixel Ring colors
  updateLEDs();

  // Publish telemetry periodically (every 3 seconds)
  if (now - lastTelemetryPublish >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryPublish = now;
    publishTelemetry();
  }

  // Publish occupancy on change
  if (roomOccupied != lastRoomOccupied || pirState != lastPirState) {
    publishOccupancy();
    lastRoomOccupied = roomOccupied;
    lastPirState = pirState;
  }

  // Publish relay state on change
  if (relayState != lastRelayState || relayMode != lastRelayMode) {
    publishRelayState();
    lastRelayState = relayState;
    lastRelayMode = relayMode;
  }
}

// --- Sensor Reading Functions ---

void checkSensors() {
  unsigned long now = millis();

  // 1. Read DHT11 Temperature & Humidity every 2 seconds
  if (now - lastDhtReadTime >= DHT_INTERVAL_MS) {
    lastDhtReadTime = now;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && !isnan(h)) {
      temperature = t;
      humidity = h;
    }
  }

  // 2. Read PMS5003 Particulate Matter stream (non-blocking parsing)
  if (readPMS5003()) {
    Serial.printf("PMS5003 Update: PM1.0=%d, PM2.5=%d, PM10=%d ug/m3\n", pm1_0, pm2_5, pm10);
  }

  // 3. Read MQ-2 gas/smoke sensor
  gasValue = analogRead(MQ2_PIN);

  // 4. Read PIR motion sensor state
  pirState = (digitalRead(PIR_PIN) == HIGH);

  // 5. Update Wifi RSSI
  if (WiFi.status() == WL_CONNECTED) {
    wifiRSSI = WiFi.RSSI();
  }
}

// Custom parser for PMS5003 32-byte frames
bool readPMS5003() {
  static uint8_t buffer[32];
  static uint8_t index = 0;

  while (Serial1.available()) {
    uint8_t ch = Serial1.read();
    
    // Byte 0: Start character 1 (0x42)
    if (index == 0 && ch != 0x42) {
      continue;
    }
    // Byte 1: Start character 2 (0x4D)
    if (index == 1 && ch != 0x4D) {
      index = 0;
      continue;
    }
    
    buffer[index++] = ch;

    if (index == 32) {
      index = 0; // Reset index for the next frame
      
      // Calculate and verify checksum
      uint16_t checksum = 0;
      for (uint8_t i = 0; i < 30; i++) {
        checksum += buffer[i];
      }
      uint16_t expectedChecksum = (buffer[30] << 8) | buffer[31];
      
      if (checksum == expectedChecksum) {
        // Read atmospheric environment measurements (Standard)
        pm1_0 = (buffer[10] << 8) | buffer[11];
        pm2_5 = (buffer[12] << 8) | buffer[13];
        pm10 = (buffer[14] << 8) | buffer[15];
        return true;
      } else {
        Serial.println("PMS5003 checksum error.");
      }
    }
  }
  return false;
}

// --- Control Logic (Preserved operational behavior) ---

void updateControlLogic() {
  unsigned long now = millis();

  // 1. Smoke Alarm logic
  // Trigger smoke alarm mode when gas reading exceeds 1800
  smokeAlarmActive = (gasValue > 1800);

  // 2. Ionizer Control logic
  // Auto ON when PM2.5 > 80, else OFF. Forced OFF during smoke alarm.
  if (smokeAlarmActive) {
    digitalWrite(IONIZER_PIN, LOW);
    ionizerOn = false;
  } else {
    if (pm2_5 > 80) {
      digitalWrite(IONIZER_PIN, HIGH);
      ionizerOn = true;
    } else {
      digitalWrite(IONIZER_PIN, LOW);
      ionizerOn = false;
    }
  }

  // 3. Occupancy/PIR exit timer logic (bug-fixed version)
  // PIR HIGH -> active immediately.
  // PIR LOW -> Starts 60-second exit timer, vacates only if it stays LOW for full duration.
  if (pirState) {
    roomOccupied = true;
    lastPirHighTime = now;
  } else {
    if (roomOccupied && (now - lastPirHighTime >= OCCUPANCY_TIMEOUT_MS)) {
      roomOccupied = false;
    }
  }

  // 4. Relay (AC Bulb) Mode Priority logic
  // AUTO mode: Mirrors roomOccupied
  // MANUAL ON/OFF mode: Always overrides occupancy state until set back to AUTO.
  if (relayMode == MODE_AUTO) {
    relayState = roomOccupied;
  } else if (relayMode == MODE_MANUAL_ON) {
    relayState = true;
  } else if (relayMode == MODE_MANUAL_OFF) {
    relayState = false;
  }

  // Output physical state to relay pin
  digitalWrite(RELAY_PIN, relayState ? HIGH : LOW);
}

// --- NeoPixel Visual Indicator Logic ---

void updateLEDs() {
  static unsigned long lastFlashTime = 0;
  static bool flashToggle = false;
  unsigned long now = millis();

  if (smokeAlarmActive) {
    // Smoke alarm overrides normal color: Ring flashes red every 250ms
    if (now - lastFlashTime >= 250) {
      lastFlashTime = now;
      flashToggle = !flashToggle;
      
      uint32_t flashColor = flashToggle ? strip.Color(255, 0, 0) : strip.Color(0, 0, 0);
      for (int i = 0; i < NUM_LEDS; i++) {
        strip.setPixelColor(i, flashColor);
      }
      strip.show();
    }
  } else {
    // Normal AQI Indicator mapping based on PM2.5 levels
    uint32_t aqiColor;
    if (pm2_5 <= 50) {
      aqiColor = strip.Color(0, 255, 0);     // GREEN - Good
    } else if (pm2_5 <= 100) {
      aqiColor = strip.Color(255, 255, 0);   // YELLOW - Moderate
    } else if (pm2_5 <= 150) {
      aqiColor = strip.Color(255, 128, 0);   // ORANGE - Poor
    } else {
      aqiColor = strip.Color(255, 0, 0);     // RED - Dangerous
    }

    for (int i = 0; i < NUM_LEDS; i++) {
      strip.setPixelColor(i, aqiColor);
    }
    strip.show();
  }
}

// --- WiFi and MQTT Secure Connection Handlers ---

void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  unsigned long startAttempt = millis();
  // 15 seconds connection timeout
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 15000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected successfully!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi Connection failed/timed out. Retrying in loop...");
  }
}

void connectMQTT() {
  // Loop until we connect or give up
  int attempts = 0;
  while (!mqttClient.connected() && attempts < 3) {
    Serial.print("Connecting to MQTT Broker secure TLS...");
    
    // Set Last Will and Testament for offline status representation
    // topicStatus, LWT message="offline", QoS=1, Retained=true
    if (mqttClient.connect(DEVICE_ID, MQTT_USER, MQTT_PASS, 
                           topicStatus.c_str(), 1, true, "offline")) {
      Serial.println("Connected!");
      
      // Publish "online" state (retained) to status topic immediately
      mqttClient.publish(topicStatus.c_str(), "online", true);

      // Subscribe to relay set control topic
      mqttClient.subscribe(topicRelaySet.c_str(), 1);

      // Force republish on connect to refresh values immediately
      publishOccupancy(true);
      publishRelayState(true);
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
      attempts++;
    }
  }
}

// Subscription messages callback handler (commands from mobile app)
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived on topic [");
  Serial.print(topic);
  Serial.print("] Payload: ");

  String command = "";
  for (unsigned int i = 0; i < length; i++) {
    command += (char)payload[i];
  }
  Serial.println(command);

  // Check if topic matches target relay set control topic
  if (String(topic) == topicRelaySet) {
    if (command == "0") {
      relayMode = MODE_MANUAL_OFF;
      Serial.println("Set relay mode: MANUAL OFF");
    } else if (command == "1") {
      relayMode = MODE_MANUAL_ON;
      Serial.println("Set relay mode: MANUAL ON");
    } else if (command == "2") {
      relayMode = MODE_AUTO;
      Serial.println("Set relay mode: AUTO");
    }
    
    // Recalculate states immediately upon command receipt
    updateControlLogic();
  }
}

// --- MQTT Publisher Functions ---

void publishTelemetry() {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<512> doc;
  
  doc["pm1"] = pm1_0;
  doc["pm25"] = pm2_5;
  doc["pm10"] = pm10;
  doc["temperature"] = double(temperature);
  doc["humidity"] = double(humidity);
  doc["gasValue"] = gasValue;
  
  // Set airQuality & color string
  if (smokeAlarmActive) {
    doc["airQuality"] = "SMOKE ALARM";
    doc["rgbColor"] = "#FF0000";
  } else {
    if (pm2_5 <= 50) {
      doc["airQuality"] = "GOOD";
      doc["rgbColor"] = "#00FF00";
    } else if (pm2_5 <= 100) {
      doc["airQuality"] = "MODERATE";
      doc["rgbColor"] = "#FFFF00";
    } else if (pm2_5 <= 150) {
      doc["airQuality"] = "POOR";
      doc["rgbColor"] = "#FF8000";
    } else {
      doc["airQuality"] = "DANGEROUS";
      doc["rgbColor"] = "#FF0000";
    }
  }

  doc["ionizerOn"] = ionizerOn;
  doc["wifiRSSI"] = wifiRSSI;

  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer);
  
  // Publish telemetry (retained = false)
  mqttClient.publish(topicTelemetry.c_str(), jsonBuffer, false);
  Serial.print("Published telemetry: ");
  Serial.println(jsonBuffer);
}

void publishOccupancy(bool force) {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<128> doc;
  doc["roomOccupied"] = roomOccupied;
  doc["pirState"] = pirState;

  char jsonBuffer[128];
  serializeJson(doc, jsonBuffer);

  // Publish occupancy (retained = true)
  mqttClient.publish(topicOccupancy.c_str(), jsonBuffer, true);
  Serial.print("Published occupancy: ");
  Serial.println(jsonBuffer);
}

void publishRelayState(bool force) {
  if (!mqttClient.connected()) return;

  StaticJsonDocument<128> doc;
  doc["relayState"] = relayState;
  
  switch(relayMode) {
    case MODE_AUTO:
      doc["relayMode"] = "auto";
      break;
    case MODE_MANUAL_ON:
      doc["relayMode"] = "manual_on";
      break;
    case MODE_MANUAL_OFF:
      doc["relayMode"] = "manual_off";
      break;
  }

  char jsonBuffer[128];
  serializeJson(doc, jsonBuffer);

  // Publish relay state (retained = true)
  mqttClient.publish(topicRelayState.c_str(), jsonBuffer, true);
  Serial.print("Published relay state: ");
  Serial.println(jsonBuffer);
}
