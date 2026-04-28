/**
 * Security Monitoring and Alerting System
 * 
 * This module provides comprehensive security monitoring for the Riskon application,
 * including anomaly detection, threat intelligence, and automated alerting.
 */

interface SecurityEvent {
  timestamp: string;
  type: 'csrf_failure' | 'rate_limit_exceeded' | 'xss_attempt' | 'injection_attempt' | 'unauthorized_access' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  ip?: string;
  userAgent?: string;
  url?: string;
}

interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  recentEvents: SecurityEvent[];
  blockedRequests: number;
  suspiciousIPs: string[];
}

class SecurityMonitor {
  private static instance: SecurityMonitor;
  private events: SecurityEvent[] = [];
  private blockedIPs: Set<string> = new Set();
  private suspiciousIPs: Map<string, number> = new Map();
  private readonly MAX_EVENTS = 1000;
  private readonly IP_THRESHOLD = 10; // Block IP after 10 suspicious events

  private constructor() {
    // Initialize monitoring
    this.loadStoredEvents();
    this.startPeriodicCleanup();
  }

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  /**
   * Log a security event
   */
  logEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.events.push(securityEvent);
    this.trackSuspiciousActivity(securityEvent);
    this.trimEvents();
    this.persistEvents();
    
    // Trigger alerts for critical events
    if (event.severity === 'critical' || event.severity === 'high') {
      this.triggerAlert(securityEvent);
    }
  }

  /**
   * Track suspicious activity by IP
   */
  private trackSuspiciousActivity(event: SecurityEvent): void {
    if (!event.ip) return;

    const count = this.suspiciousIPs.get(event.ip) || 0;
    this.suspiciousIPs.set(event.ip, count + 1);

    // Block IP if threshold exceeded
    if (count + 1 >= this.IP_THRESHOLD) {
      this.blockedIPs.add(event.ip);
      this.addEventDirectly({
        type: 'suspicious_activity',
        severity: 'high',
        details: { reason: 'IP blocked due to excessive suspicious activity' },
        ip: event.ip,
      });
    }
  }

  /**
   * Add event directly without triggering tracking (to avoid infinite recursion)
   */
  private addEventDirectly(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.events.push(securityEvent);
    this.trimEvents();
    this.persistEvents();
    
    // Trigger alerts for critical events
    if (event.severity === 'critical' || event.severity === 'high') {
      this.triggerAlert(securityEvent);
    }
  }

  /**
   * Check if an IP is blocked
   */
  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  /**
   * Get security metrics
   */
  getMetrics(): SecurityMetrics {
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};

    this.events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
    });

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsBySeverity,
      recentEvents: this.events.slice(-50),
      blockedRequests: this.blockedIPs.size,
      suspiciousIPs: Array.from(this.suspiciousIPs.keys()),
    };
  }

  /**
   * Detect anomalies in request patterns
   */
  detectAnomaly(request: {
    ip: string;
    userAgent: string;
    url: string;
    method: string;
  }): { isAnomalous: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const recentEvents = this.events.slice(-100);

    // Check for unusual request frequency
    const ipEvents = recentEvents.filter(e => e.ip === request.ip);
    if (ipEvents.length > 20) {
      reasons.push('High request frequency from IP');
    }

    // Check for suspicious user agents
    const suspiciousAgents = [/bot/i, /crawler/i, /scanner/i, /curl/i, /wget/i];
    if (suspiciousAgents.some(agent => agent.test(request.userAgent))) {
      reasons.push('Suspicious user agent detected');
    }

    // Check for unusual URL patterns
    const suspiciousPaths = [/admin/i, /config/i, /\.env/i, /\.git/i];
    if (suspiciousPaths.some(path => path.test(request.url))) {
      reasons.push('Suspicious URL path accessed');
    }

    // Check for repeated access to sensitive endpoints
    const sensitiveEndpoints = ['/api/', '/admin', '/config'];
    const sensitiveAccess = ipEvents.filter(e => 
      sensitiveEndpoints.some(endpoint => e.url?.includes(endpoint))
    );
    if (sensitiveAccess.length > 10) {
      reasons.push('Excessive access to sensitive endpoints');
    }

    return {
      isAnomalous: reasons.length > 0,
      reasons
    };
  }

  /**
   * Generate security report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const now = new Date().toISOString();
    
    return `
Security Report - ${now}
========================

Summary:
- Total Events: ${metrics.totalEvents}
- Blocked IPs: ${metrics.blockedRequests}
- Suspicious IPs: ${metrics.suspiciousIPs.length}

Events by Type:
${Object.entries(metrics.eventsByType).map(([type, count]) => 
  `- ${type}: ${count}`
).join('\n')}

Events by Severity:
${Object.entries(metrics.eventsBySeverity).map(([severity, count]) => 
  `- ${severity}: ${count}`
).join('\n')}

Recent Critical Events:
${metrics.recentEvents
  .filter(e => e.severity === 'critical' || e.severity === 'high')
  .slice(-10)
  .map(e => `- ${e.timestamp}: ${e.type} from ${e.ip}`)
  .join('\n')}

Blocked IPs:
${Array.from(this.blockedIPs).join(', ')}

Recommendations:
${this.generateRecommendations(metrics)}
    `.trim();
  }

  /**
   * Generate security recommendations based on metrics
   */
  private generateRecommendations(metrics: SecurityMetrics): string {
    const recommendations: string[] = [];

    if (metrics.eventsByType['csrf_failure'] > 5) {
      recommendations.push('Review CSRF protection implementation');
    }

    if (metrics.eventsByType['rate_limit_exceeded'] > 10) {
      recommendations.push('Consider tightening rate limits');
    }

    if (metrics.eventsBySeverity['critical'] > 0) {
      recommendations.push('Immediate investigation required for critical events');
    }

    if (metrics.blockedRequests > 50) {
      recommendations.push('Consider implementing additional IP blocking mechanisms');
    }

    return recommendations.length > 0 
      ? recommendations.join('\n')
      : 'No immediate security concerns detected';
  }

  /**
   * Trigger security alert
   */
  private triggerAlert(event: SecurityEvent): void {
    // In production, send to external monitoring service
    console.error('SECURITY ALERT:', {
      type: event.type,
      severity: event.severity,
      details: event.details,
      timestamp: event.timestamp,
    });

    // Store alert for dashboard
    const alerts = JSON.parse(localStorage.getItem('riskon-security-alerts') || '[]');
    alerts.push({
      ...event,
      acknowledged: false,
    });
    
    // Keep only last 50 alerts
    if (alerts.length > 50) {
      alerts.splice(0, alerts.length - 50);
    }
    
    localStorage.setItem('riskon-security-alerts', JSON.stringify(alerts));
  }

  /**
   * Load stored events from localStorage
   */
  private loadStoredEvents(): void {
    try {
      const stored = localStorage.getItem('riskon-security-events');
      if (stored) {
        this.events = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load stored security events:', error);
    }
  }

  /**
   * Persist events to localStorage
   */
  private persistEvents(): void {
    try {
      localStorage.setItem('riskon-security-events', JSON.stringify(this.events));
    } catch (error) {
      console.warn('Failed to persist security events:', error);
    }
  }

  /**
   * Trim old events to prevent memory issues
   */
  private trimEvents(): void {
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }
  }

  /**
   * Start periodic cleanup of old data
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.trimEvents();
      
      // Clean up old IP tracking data
      const now = Date.now();
      const entries = Array.from(this.suspiciousIPs.entries());
      for (const [ip, count] of entries) {
        if (count < 2 && Math.random() < 0.1) { // 10% chance to clean low-count entries
          this.suspiciousIPs.delete(ip);
        }
      }
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Clear all security data
   */
  clearData(): void {
    this.events = [];
    this.blockedIPs.clear();
    this.suspiciousIPs.clear();
    localStorage.removeItem('riskon-security-events');
    localStorage.removeItem('riskon-security-alerts');
  }
}

// Export singleton instance
export const securityMonitor = SecurityMonitor.getInstance();

// Export types and utilities
export type { SecurityEvent, SecurityMetrics };
export { SecurityMonitor };

// Convenience functions for common security events
export const logSecurityEvent = (type: SecurityEvent['type'], severity: SecurityEvent['severity'], details: Record<string, any>, context?: { ip?: string; userAgent?: string; url?: string }) => {
  securityMonitor.logEvent({
    type,
    severity,
    details,
    ...context,
  });
};

export const checkSecurityAnomaly = (request: { ip: string; userAgent: string; url: string; method: string }) => {
  return securityMonitor.detectAnomaly(request);
};

export const isIPBlocked = (ip: string) => {
  return securityMonitor.isIPBlocked(ip);
};
