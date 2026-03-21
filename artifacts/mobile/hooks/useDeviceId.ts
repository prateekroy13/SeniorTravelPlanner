import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const DEVICE_ID_KEY = "@seniortravel_device_id";

function generateId() {
  return "dev_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState<string>("");

  useEffect(() => {
    AsyncStorage.getItem(DEVICE_ID_KEY).then((existing) => {
      if (existing) {
        setDeviceId(existing);
      } else {
        const newId = generateId();
        AsyncStorage.setItem(DEVICE_ID_KEY, newId);
        setDeviceId(newId);
      }
    });
  }, []);

  return deviceId;
}
