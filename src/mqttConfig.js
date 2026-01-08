// A robust configuration that forces the correct WSS protocol
export const MQTT_URL = "wss://supos-ce-instance1.supos.app:8084/mqtt";

export const MQTT_OPTIONS = {
  // Generate a random Client ID so the broker doesn't kick us off for being a duplicate
  clientId: "henkel_web_" + Math.random().toString(16).substr(2, 8),
  username: "", // Keep empty for anonymous
  password: "", // Keep empty for anonymous
  clean: true,
  reconnectPeriod: 1000, // Try to reconnect every second if lost
  connectTimeout: 30 * 1000,
};
