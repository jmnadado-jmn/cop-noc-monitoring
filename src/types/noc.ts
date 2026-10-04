export type LinkStatus = 'Operational' | 'Degraded' | 'Outage';

export type IncidentStatus = 'Pending' | 'Waiting for Telco Repair' | 'Resolved';

export type EscalationLevel =
  | 'L1 - Campus NOC'
  | 'L2 - Regional Network Lead & Telco Account Mgr'
  | 'L3 - VP Infrastructure & Telco Executive Desk';

export interface DailyUptimePoint {
  date: string; // YYYY-MM-DD
  uptimePct: number;
  downtimeMinutes: number;
  incidentCount: number;
}

export interface CampusLink {
  id: string;
  campusName: string; // e.g., "Main Campus", "East Campus", "Cebu"
  linkName: string; // Exact link name e.g., "Eastern Internet", "Converge Transport", "PLDT Internet", "Starlink"
  campusCode: string;
  region: string;
  building: string;
  linkRole:
    | 'Dedicated Internet'
    | 'Metro-E Transport'
    | 'LEO Satellite Backup';
  provider: string;
  providerNocEmail: string;
  providerHotline: string;
  accountNumber: string;
  circuitId: string;
  routerHostname: string;
  interfaceName: string;
  bgpPeerIp: string;
  bandwidthMbps: number;
  status: LinkStatus; // 'Operational' = GREEN (Good & Restored), 'Outage' = RED (Down)
  latencyMs: number;
  packetLossPct: number;
  opticalRxDbm: number;
  uptime30dPct: number;
  uptime90dPct: number;
  slaTargetPct: number;
  lastCheckedAt: string;
  lastRestoredAt?: string;
  dailyUptimeHistory: DailyUptimePoint[];
}

export interface NetworkLogEvent {
  id: string;
  timestamp: string;
  routerHostname: string;
  interfaceName: string;
  campusId: string;
  campusName: string;
  linkName: string;
  circuitId: string;
  provider: string;
  protocol: 'BGP' | 'OPTICAL' | 'ICMP-SLA' | 'SNMP-TRAP' | 'STARLINK-TLM';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  rawSyslog: string;
  parsedSummary: string;
  detectedIssueType: string;
  metrics: {
    packetLossPct: number;
    latencyMs: number;
    opticalRxDbm: number;
  };
  linkedIncidentId?: string;
}

export interface IncidentTimelineEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  note: string;
  automated: boolean;
}

export interface IncidentTicket {
  id: string;
  ticketNumber: string;
  telcoTicketNumber: string;
  campusId: string; // ID of the specific CampusLink
  campusName: string;
  linkName: string;
  circuitId: string;
  provider: string;
  providerNocEmail: string;
  accountNumber: string;
  routerHostname: string;
  interfaceName: string;
  problemSummary: string;
  technicalDetails: string;
  rawLogSnippet: string;
  creationMode: 'Log Autofill' | 'Hybrid Log + Manual' | 'Manual Entry';
  sourceLogId?: string;
  status: IncidentStatus;
  reportedToTelco: boolean;
  reportedToTelcoAt: string | null;
  reportedBy: string;
  expectedResolutionAt: string;
  etrNotes: string;
  escalationLevel: EscalationLevel;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  timeline: IncidentTimelineEntry[];
}

export interface EmailDispatch {
  id: string;
  timestamp: string;
  incidentId: string;
  ticketNumber: string;
  campusName: string;
  linkName?: string;
  provider: string;
  recipientType:
    | 'Service Provider (Telco NOC)'
    | 'Internal Escalation Alert'
    | 'Campus IT Advisory';
  to: string;
  cc: string;
  subject: string;
  body: string;
  triggerSource:
    | 'Auto-Created on Ticket Log'
    | 'Telco Escalation Chaser'
    | 'SLA Breach Escalation'
    | 'Status Update Notification'
    | 'Manual Dispatch';
  deliveryStatus: 'Dispatched' | 'Draft Ready';
}

export interface EscalationPolicy {
  id: string;
  level: EscalationLevel;
  name: string;
  triggerCondition: string;
  thresholdMinutes: number;
  notifyTargets: string;
  autoAction: string;
  active: boolean;
  triggeredCount30d: number;
}

export interface ParsedLogExtraction {
  matchedCampus: CampusLink | null;
  confidence:
    | 'Exact Router/Circuit Match'
    | 'Heuristic Interface Match'
    | 'Manual Selection Needed';
  extractedHostname: string;
  extractedInterface: string;
  extractedBgpPeer: string;
  extractedProtocol:
    | 'BGP'
    | 'OPTICAL'
    | 'ICMP-SLA'
    | 'SNMP-TRAP'
    | 'STARLINK-TLM';
  extractedSeverity: 'CRITICAL' | 'WARNING' | 'INFO';
  extractedProblemSummary: string;
  extractedTechnicalDetails: string;
  extractedPacketLossPct: number;
  extractedLatencyMs: number;
  extractedOpticalRxDbm: number;
  suggestedStatus: IncidentStatus;
  suggestedEtrHours: number;
  autoExtractedFields: string[];
  manualRequiredFields: string[];
}

export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';
export type UserStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED';

export interface NocUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  department: string;
  phone?: string;
  createdAt: string;
  lastLoginAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  suspendedReason?: string | null;
}

export interface AuthSession {
  user: NocUser;
  token: string;
}

