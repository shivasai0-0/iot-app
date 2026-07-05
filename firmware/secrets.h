#ifndef SECRETS_H
#define SECRETS_H

// WiFi Credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// MQTT Broker Details
// For HiveMQ Cloud: "xxxxxx.s1.eu.hivemq.cloud"
// For EMQX Cloud: "xxxxxx.emqxsl.com"
const char* MQTT_BROKER = "YOUR_MQTT_BROKER_HOST"; 
const int MQTT_PORT = 8883; // Standard secure TLS port

// MQTT Auth
const char* MQTT_USER = "YOUR_MQTT_USERNAME";
const char* MQTT_PASS = "YOUR_MQTT_PASSWORD";

// Unique Device ID (used for topic names and client ID)
const char* DEVICE_ID = "arrow_aqi_monitor_01";

#endif
