import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { withSocietyQuery } from './visitorApi';

type TransportState = 'connecting' | 'sse' | 'polling' | 'disconnected';

export function useVisitorRealtime(params: {
  enabled: boolean;
  societyId?: string;
  onEvent: (event: { type: string; data: any }) => void;
}) {
  const { accessToken } = useAuthStore();
  const [transport, setTransport] = useState<TransportState>('connecting');
  const onEventRef = useRef(params.onEvent);

  useEffect(() => {
    onEventRef.current = params.onEvent;
  }, [params.onEvent]);

  useEffect(() => {
    if (!params.enabled || !accessToken) {
      setTransport('disconnected');
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    let reconnectTimer: number | undefined;

    const connect = async () => {
      try {
        setTransport('connecting');
        const response = await fetch(withSocietyQuery('/api/visitor/events', params.societyId), {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error('SSE unavailable');

        setTransport('sse');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!cancelled) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          const frames = buffer.split('\n\n');
          buffer = frames.pop() || '';
          frames.forEach((frame) => {
            const eventType = frame.split('\n').find((line) => line.startsWith('event:'))?.replace('event:', '').trim();
            const dataLine = frame.split('\n').find((line) => line.startsWith('data:'))?.replace('data:', '').trim();
            if (eventType && dataLine) onEventRef.current({ type: eventType, data: JSON.parse(dataLine) });
          });
        }

        if (!cancelled) {
          setTransport('polling');
          reconnectTimer = window.setTimeout(connect, 3000);
        }
      } catch {
        if (!cancelled) setTransport('polling');
      }
    };

    void connect();
    return () => {
      cancelled = true;
      controller.abort();
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      setTransport('disconnected');
    };
  }, [accessToken, params.enabled, params.societyId]);

  return { transport };
}
