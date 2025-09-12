// src/components/SessionWatcher.tsx
import { useRealtimeSession } from "../hooks/useRealtimeSession";
export default function SessionWatcher() {
  useRealtimeSession();
  return null;
}
