"use client";

import { useEffect, useState } from "react";
import type { NeptunAlertRegion, NeptunLiveThreat } from "@/lib/neptun";
import { localizeNeptunAlertName, localizeNeptunThreatCopy } from "@/lib/neptunDisplay";

type ThreatCopy = {
  title: string;
  location: string;
  explanation: string | null;
};

export function useNeptunLocalizedCopy(
  threats: NeptunLiveThreat[],
  alerts: NeptunAlertRegion[],
  translateKo: boolean,
) {
  const [threatCopy, setThreatCopy] = useState<Record<string, ThreatCopy>>({});
  const [alertNames, setAlertNames] = useState<Record<string, string>>({});
  const [alertOblasts, setAlertOblasts] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const nextThreat: Record<string, ThreatCopy> = {};
      for (const threat of threats) {
        nextThreat[threat.id] = await localizeNeptunThreatCopy(threat, translateKo);
      }

      const nextAlert: Record<string, string> = {};
      const nextOblast: Record<string, string> = {};
      for (const alert of alerts) {
        nextAlert[alert.key] = await localizeNeptunAlertName(alert.name, translateKo);
        if (alert.oblast) {
          nextOblast[alert.key] = await localizeNeptunAlertName(alert.oblast, translateKo);
        }
      }

      if (!cancelled) {
        setThreatCopy(nextThreat);
        setAlertNames(nextAlert);
        setAlertOblasts(nextOblast);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [alerts, threats, translateKo]);

  return { threatCopy, alertNames, alertOblasts };
}
