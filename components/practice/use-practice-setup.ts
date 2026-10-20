"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sessionsAPI } from "@/lib/api/sessions";
import { getAPIErrorMessage } from "@/lib/api-client";
import { PracticeSessionConfig } from "@/lib/types/practice";
import { toSessionRequest } from "@/lib/types/session-api";

export function usePracticeSetup() {
  const router = useRouter();
  const creating = useRef(false);
  const createdId = useRef<string | null>(null);
  const mounted = useRef(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const startSession = async (config: PracticeSessionConfig) => {
    // Creation is an explicit user action, never a mount effect. The ref also
    // blocks repeated clicks before React has rendered the disabled button.
    if (creating.current) return;
    creating.current = true;
    setIsStarting(true);
    setStartError(null);
    try {
      if (!createdId.current) {
        const session = await sessionsAPI.createSession(toSessionRequest(config));
        createdId.current = session.id;
      }
      try {
        sessionStorage.removeItem("practiceSessionConfig");
        sessionStorage.removeItem("practiceSessionState");
        sessionStorage.setItem("practiceSessionId", createdId.current);
      } catch {
        // The UUID in the URL also supports browsers that block sessionStorage.
      }
      if (mounted.current) router.push(`/practice/room?session=${encodeURIComponent(createdId.current)}`);
    } catch (error) {
      creating.current = false;
      if (mounted.current) {
        setStartError(getAPIErrorMessage(error));
        setIsStarting(false);
      }
    }
  };

  return { startSession, isStarting, startError };
}
