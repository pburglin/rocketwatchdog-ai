import { startTransition, useCallback, useEffect, useState } from 'react';
import {
  getConfigStatus,
  getEffectiveConfig,
  getGuardPolicies,
  getHealth,
  getIntegrations,
  getReady,
  getTrafficLogs,
  reloadConfig,
  scanSkill,
} from '../services/api';
import type {
  ConfigStatus,
  EffectiveConfigSnapshot,
  GuardPolicy,
  HealthStatus,
  Integration,
  SkillScanResult,
  TrafficLog,
} from '../types/api';

export interface ControlPlaneState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  health: HealthStatus | null;
  ready: HealthStatus | null;
  configStatus: ConfigStatus | null;
  effectiveConfig: EffectiveConfigSnapshot | null;
  traffic: TrafficLog[];
  policies: GuardPolicy[];
  integrations: Integration[];
  lastUpdated: string | null;
  reloadMessage: string | null;
  scanResult: SkillScanResult | null;
  refresh: () => Promise<void>;
  triggerReload: () => Promise<void>;
  runSkillScan: (content: string, maxRiskScore: number) => Promise<void>;
}

export function useControlPlane(): ControlPlaneState {
  const [state, setState] = useState<Omit<ControlPlaneState, 'refresh' | 'triggerReload' | 'runSkillScan'>>({
    loading: true,
    refreshing: false,
    error: null,
    health: null,
    ready: null,
    configStatus: null,
    effectiveConfig: null,
    traffic: [],
    policies: [],
    integrations: [],
    lastUpdated: null,
    reloadMessage: null,
    scanResult: null,
  });

  const refresh = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: current.lastUpdated === null,
      refreshing: current.lastUpdated !== null,
      error: null,
    }));

    try {
      const [health, ready, configStatus, effectiveConfig] = await Promise.all([
        getHealth(),
        getReady(),
        getConfigStatus(),
        getEffectiveConfig(),
      ]);

      const [traffic, policies, integrations] = await Promise.all([
        getTrafficLogs(120),
        getGuardPolicies(effectiveConfig),
        getIntegrations(effectiveConfig, ready, configStatus),
      ]);

      startTransition(() => {
        setState((current) => ({
          ...current,
          loading: false,
          refreshing: false,
          error: null,
          health,
          ready,
          configStatus,
          effectiveConfig,
          traffic,
          policies,
          integrations,
          lastUpdated: new Date().toISOString(),
        }));
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        refreshing: false,
        error: error instanceof Error ? error.message : 'Unable to load control plane data',
      }));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const intervalId = window.setInterval(() => {
      void refresh();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  const triggerReload = useCallback(async () => {
    try {
      const result = await reloadConfig();
      setState((current) => ({
        ...current,
        reloadMessage: result.message ?? `Reload ${result.status}`,
      }));
      await refresh();
    } catch (error) {
      setState((current) => ({
        ...current,
        reloadMessage: error instanceof Error ? error.message : 'Reload failed',
      }));
    }
  }, [refresh]);

  const runSkillScan = useCallback(
    async (content: string, maxRiskScore: number) => {
      try {
        const result = await scanSkill(content, maxRiskScore);
        setState((current) => ({
          ...current,
          scanResult: result,
        }));
        await refresh();
      } catch (error) {
        setState((current) => ({
          ...current,
          scanResult: {
            allowed: false,
            blocked: true,
            riskScore: maxRiskScore,
            reasons: [error instanceof Error ? error.message : 'Skill scan failed'],
          },
        }));
      }
    },
    [refresh]
  );

  return {
    ...state,
    refresh,
    triggerReload,
    runSkillScan,
  };
}
