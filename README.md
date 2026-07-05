# ARROW AQI Monitor — MQTT Migration

This project replaces the direct HTTP WebServer of the ESP32-C3 based "ARROW AQI Monitor" (firmware Rev 9.0) with an **MQTT transport layer** and a **React Native mobile application** (built with Expo). This migration enables monitoring and controlling the device from anywhere in the world over the internet, while keeping the critical operational controls (AUTO mode logic, smoke alarm safety override, and occupancy exit timers) on the ESP32 hardware itself.

---

## 📂 Project Structure

```text
iot-app/
├── README.md                 # This documentation
├── .gitignore                # Git ignore patterns
├── firmware/
│   ├── firmware.ino          # ESP32-C3 firmware source code
│   └── secrets.h             # WiFi & MQTT Credentials (gitignored template)
└── mobile-app/               # React Native Expo Mobile App
    ├── App.tsx               # Main entry point and tab navigation
    ├── package.json          # Dependency configurations
    ├── tsconfig.json         # TypeScript compiler configurations
    └── src/
        ├── components/       # UI Screens (Dashboard, Occupancy, Relay, Config)
        ├── services/         # MQTT client WebSockets service
        └── types/            # TypeScript module declarations
```

---

## 🌐 1. MQTT Broker Setup

To communicate over the internet, you will need a managed cloud MQTT broker. 

### Recommended Broker: HiveMQ Cloud (Free Tier)
1. Go to [HiveMQ Cloud](https://www.hivemq.com/downloads/hivemq-cloud/) and register for a free account.
2. Create a new cluster. Note your cluster **host address** (e.g. `xxxxxx.s1.eu.hivemq.cloud`).
3. Under the **Access Management** tab, add credentials (a username and password) for the device and mobile application.
4. Note the connection ports:
   - **Port 8883** (TLS) is used by the ESP32-C3 firmware.
   - **Port 8884** (Secure WebSockets - WSS) is used by the React Native app.

---

## 🔌 2. Hardware & Firmware Compilation

### Hardware Pin Map (ESP32-C3)
| Function | GPIO | Notes |
|---|---|---|
| Ring 1 (WS2812B NeoPixel - 12 LEDs) | 2 | AQI and Smoke Alarm visual indicator |
| Relay Control | 3 | Output (HIGH = bulb ON, LOW = bulb OFF) |
| PIR Motion Sensor | 4 | Input (HIGH = occupancy active) |
| Ionizer | 5 | Output (ON when PM2.5 > 80, OFF when smoke alarm active) |
| DHT11 Temp/Humidity | 10 | Input (Read every 2s) |
| PMS5003 Serial RX | 6 | Connects to PMS5003 TX |
| PMS5003 Serial TX | 7 | Connects to PMS5003 RX |
| MQ-2 Gas/Smoke Sensor | 0 | Analog input |

### Arduino IDE Setup
1. Open Arduino IDE. Go to **Settings** > **Additional Board Manager URLs** and add:
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
2. Search for and install the **esp32** board package (select **ESP32-C3 Dev Module** under boards).
3. Search for and install the following libraries in the **Library Manager**:
   - **PubSubClient** by Nick O'Leary
   - **ArduinoJson** by Benoit Blanchon
   - **Adafruit NeoPixel** by Adafruit
   - **DHT sensor library** by Adafruit
   - **Adafruit Unified Sensor** by Adafruit (dependency of DHT)

### Deploying the Firmware
1. Open the [firmware/secrets.h](file:///c:/Users/ShivaSai/Desktop/Learn/iot-app/firmware/secrets.h) file.
2. Edit the placeholders with your **WiFi credentials**, **MQTT broker host** (from step 1), **username**, **password**, and a unique **Device ID** (e.g. `arrow_monitor_living_room`).
3. Open [firmware/firmware.ino](file:///c:/Users/ShivaSai/Desktop/Learn/iot-app/firmware/firmware.ino).
4. Compile and flash the code to your ESP32-C3.

---

## 📱 3. Running the React Native Mobile App

The mobile application is built using Expo. We use standard **Secure WebSockets (WSS)** to communicate with the broker, allowing the app to run in standard **Expo Go** on your iOS/Android phone without requiring native compilations.

### Setup and Start
1. Navigate to the `mobile-app` directory:
   ```bash
   cd mobile-app
   ```
2. Start the Expo developer server:
   ```bash
   npm run start
   ```
3. A QR code will display in your terminal. Install the **Expo Go** application on your mobile phone, open it, and scan the QR code to run the application live!

### Configuring the App Connection
Upon launching the mobile app for the first time, you will be shown the **Settings** screen.
1. Enter your MQTT Broker Host (e.g., `xxxxxx.s1.eu.hivemq.cloud`). **Do not prefix it with `wss://` or `ws://`**.
2. Enter the WebSocket Secure Port (default: `8884` for HiveMQ, or `8084` for EMQX).
3. Enter the target Device ID that matches the value in your firmware's `secrets.h`.
4. Enter your MQTT Username and Password.
5. Tap **SAVE & CONNECT**. 
6. The app will save these credentials securely on your device using `AsyncStorage` and automatically redirect you to the live **Dashboard**.

---

## 💬 4. MQTT Topic Architecture

All communications are published under a device-scoped prefix `arrow/aqi/<device_id>/`:

*   **`.../telemetry`** (retained: `false`): Published by device every 3 seconds.
    ```json
    {
      "pm1": 12,
      "pm25": 45,
      "pm10": 58,
      "temperature": 24.5,
      "humidity": 55.2,
      "gasValue": 312,
      "airQuality": "GOOD",
      "rgbColor": "#00FF00",
      "ionizerOn": false,
      "wifiRSSI": -64
    }
    ```
*   **`.../occupancy`** (retained: `true`): Published by device on transition.
    ```json
    {
      "roomOccupied": true,
      "pirState": true
    }
    ```
*   **`.../relay/state`** (retained: `true`): Published by device on transition. Represents the device shadow state for the lightbulb.
    ```json
    {
      "relayState": true,
      "relayMode": "auto" // Options: "auto" | "manual_on" | "manual_off"
    }
    ```
*   **`.../status`** (retained: `true`): Published as Last Will and Testament. Shows `offline` if device disconnects unexpectedly, and `online` on connection.
*   **`.../relay/set`** (QoS 1): Subscribed to by the device. Published by the app to control the lightbulb.
    - Payload: `"0"` (MANUAL OFF)
    - Payload: `"1"` (MANUAL ON)
    - Payload: `"2"` (AUTO Mode)
