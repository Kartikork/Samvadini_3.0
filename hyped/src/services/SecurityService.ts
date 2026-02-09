import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/axios.instance';

const { SecurityModule } = NativeModules;

interface SecurityResult {
  riskLevel: string;
  riskScore?: number;
  threats: string[];
  details?: Record<string, any>;
}

interface ThreatPayload {
  threats: string[];
  riskLevel: string;
  details?: Record<string, any>;
  timestamp: string;
}

class SecurityServiceClass {
  private eventEmitter = SecurityModule ? new NativeEventEmitter(SecurityModule) : null;
  private securityCheckInterval: ReturnType<typeof setInterval> | null = null;
  private onThreatDetected: ((result: SecurityResult) => void) | null = null;
  private onShowModal: ((payload: ThreatPayload | null) => void) | null = null;

  async performSecurityCheck(): Promise<SecurityResult> {
    if (!SecurityModule) {
      return {
        riskLevel: 'UNKNOWN',
        riskScore: 0,
        threats: [],
        details: {},
      };
    }
    try {
      const result = await SecurityModule.performSecurityCheck();
      const allThreats = result.threats || [];
      const visibleThreats = allThreats.filter((t: string) => t !== 'EMULATOR_DETECTED');

      if (allThreats.length > 0) {
        if (visibleThreats.length > 0 && this.onShowModal) {
          this.onShowModal({
            threats: visibleThreats,
            riskLevel: result.riskLevel,
            details: result.details || {},
            timestamp: new Date().toISOString(),
          });
        } else if (this.onShowModal) {
          this.onShowModal(null);
        }
        for (const threatType of allThreats) {
          this.reportIndividualThreat({
            threatType,
            riskLevel: result.riskLevel,
            details: result.details || {},
            timestamp: new Date().toISOString(),
          }).catch(() => { });
        }
      } else {
        if (this.onShowModal) this.onShowModal(null);
      }
      return result;
    } catch (error) {
      console.error('[Security] Error performing security check:', error);
      throw error;
    }
  }

  enableScreenshotProtection(): void {
    SecurityModule?.enableScreenshotProtection?.();
  }

  disableScreenshotProtection(): void {
    SecurityModule?.disableScreenshotProtection?.();
  }

  setModalCallback(onShowModal: (payload: ThreatPayload | null) => void): void {
    this.onShowModal = onShowModal;
  }

  startSecurityMonitoring(
    onThreatDetected?: (result: SecurityResult) => void,
    intervalMs = 30000
  ): void {
    if (this.securityCheckInterval) return;
    this.onThreatDetected = onThreatDetected || null;
    this.performSecurityCheck().then((result) => {
      if (result.threats?.length > 0 && this.onThreatDetected) {
        this.onThreatDetected(result);
      }
    });
    this.securityCheckInterval = setInterval(async () => {
      try {
        const result = await this.performSecurityCheck();
        if (result.threats?.length > 0 && this.onThreatDetected) {
          this.onThreatDetected(result);
        }
      } catch { }
    }, intervalMs);
  }

  stopSecurityMonitoring(): void {
    if (this.securityCheckInterval) {
      clearInterval(this.securityCheckInterval);
      this.securityCheckInterval = null;
      this.onThreatDetected = null;
    }
  }

  getDefensiveAction(securityResult: SecurityResult): {
    action: string;
    message: string;
    severity: string;
  } {
    const { riskLevel, threats } = securityResult;
    const criticalThreats = threats.filter(
      (t) => t === 'HOOKING_DETECTED' || t === 'MITM_DETECTED' || t === 'APP_REPACKAGED'
    );
    if (criticalThreats.length > 0 || riskLevel === 'CRITICAL') {
      return {
        action: 'TERMINATE_SESSION',
        message: 'Critical security threat detected. Session terminated.',
        severity: 'CRITICAL',
      };
    }
    if (riskLevel === 'HIGH') {
      return {
        action: 'FORCE_RE_VERIFICATION',
        message: 'High security risk detected. Please verify your identity.',
        severity: 'HIGH',
      };
    }
    if (riskLevel === 'MEDIUM') {
      return {
        action: 'RESTRICT_SENSITIVE_FEATURES',
        message: 'Security risk detected. Some features may be restricted.',
        severity: 'MEDIUM',
      };
    }
    return {
      action: 'ALLOW',
      message: 'Security check passed.',
      severity: 'LOW',
    };
  }

  async reportIndividualThreat(threat: {
    threatType: string;
    riskLevel?: string;
    details?: Record<string, any>;
    timestamp?: string;
  }): Promise<void> {
    try {
      const userId =
        (await AsyncStorage.getItem('userId')) || (await AsyncStorage.getItem('uniqueId'));
      if (!userId) return;
      await api.post('/security/report-event', {
        userId,
        threatType: threat.threatType,
        riskLevel: threat.riskLevel || 'MEDIUM',
        details: threat.details || {},
        timestamp: threat.timestamp || new Date().toISOString(),
      });
    } catch { }
  }
}

export default new SecurityServiceClass();
