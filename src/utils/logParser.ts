import type {
  CampusLink,
  EmailDispatch,
  IncidentStatus,
  IncidentTicket,
  ParsedLogExtraction,
} from '../types/noc.ts';

export interface SampleRawLogPreset {
  id: string;
  label: string;
  campusHint: string;
  rawText: string;
}

export const SAMPLE_RAW_LOG_PRESETS: SampleRawLogPreset[] = [
  {
    id: 'preset-main-eastern-pdes',
    label: 'Main Campus — Eastern Internet PDES (Circuit 930473671) Optical LOS',
    campusHint: 'Main Campus · Eastern Internet PDES (930473671)',
    rawText: `<187>Sep 26 02:28:14 cop-main-core-01 %OPTICAL-3-RXLOS: Interface TenGigE0/0/0 (Circuit: 930473671 - Eastern Internet PDES), Rx optical power -38.9 dBm below alarm threshold (-24.0 dBm).
<189>Sep 26 02:28:15 cop-main-core-01 %LINEPROTO-5-UPDOWN: Line protocol on Interface TenGigE0/0/0, changed state to down.
<187>Sep 26 02:28:18 cop-main-core-01 %BGP-5-ADJCHANGE: neighbor 116.50.100.1 Down Interface flap (100% packet loss)`,
  },
  {
    id: 'preset-east-converge-trans',
    label: 'East Campus — Converge Transport (Circuit MC003576) BGP Down',
    campusHint: 'East Campus · Converge Transport (MC003576)',
    rawText: `Sep 26 02:26:51 cop-east-rtr-01 rpd[1842]: RPD_BGP_NEIGHBOR_STATE_CHANGED: BGP peer 136.158.12.1 (Circuit MC003576 - Converge Transport) changed state from Established to Idle (Hold Timer Expired) on interface GigabitEthernet0/0/1 packet-loss=100% rx-power=-29.4dBm`,
  },
  {
    id: 'preset-south-converge-dia',
    label: 'South Campus — Converge DIA (Circuit MC019487) Down',
    campusHint: 'South Campus · Converge DIA (MC019487)',
    rawText: `date=2026-09-26 time=02:24:10 devname="cop-south-rtr-01" type="event" subtype="sdwan" level="critical" interface="GigabitEthernet0/0/3" circuit="MC019487" msg="Link Converge DIA DOWN on peer 136.158.14.9. latency=0ms packet-loss=100% optical-rx=-35.8dBm"`,
  },
  {
    id: 'preset-cebu-pldt',
    label: 'Cebu — PLDT Internet (Account #220776581) Fiber Cut',
    campusHint: 'Cebu · PLDT Internet (220776581)',
    rawText: `<187>Sep 26 02:29:02 cop-cebu-rtr-01 %OPTICAL-3-RXLOS: Interface GigabitEthernet0/0/0 (Account 220776581 - PLDT Internet) neighbor 203.177.71.1 Down: Physical Fiber LOS (loss=100%, rtt=0ms, rx=-39.5dBm)`,
  },
];

/**
 * Deterministically parses a raw syslog / SNMP / router log string and correlates
 * it against the Cathedral of Praise campus link inventory to autofill incident fields.
 */
export function parseNetworkLogForIncident(
  rawLog: string,
  campuses: CampusLink[]
): ParsedLogExtraction {
  const normalized = rawLog.trim();

  let matchedCampus: CampusLink | null = null;
  let confidence: ParsedLogExtraction['confidence'] = 'Manual Selection Needed';

  // 1. Exact circuit ID, Account Number, or BGP peer match first
  for (const campus of campuses) {
    const circuitMatch =
      campus.circuitId &&
      normalized.toLowerCase().includes(campus.circuitId.toLowerCase());
    const acctMatch =
      campus.accountNumber &&
      campus.accountNumber !== 'N/A (Circuit ID)' &&
      campus.accountNumber !== 'Starlink' &&
      normalized.toLowerCase().includes(campus.accountNumber.toLowerCase());
    const bgpMatch =
      campus.bgpPeerIp && normalized.includes(campus.bgpPeerIp);

    if (circuitMatch || acctMatch || bgpMatch) {
      matchedCampus = campus;
      confidence = 'Exact Router/Circuit Match';
      break;
    }
  }

  // 2. Hostname + interface or linkName match
  if (!matchedCampus) {
    for (const campus of campuses) {
      const hostMatch =
        campus.routerHostname &&
        normalized.toLowerCase().includes(campus.routerHostname.toLowerCase());
      const ifaceMatch =
        campus.interfaceName &&
        normalized.toLowerCase().includes(campus.interfaceName.toLowerCase());
      const linkMatch =
        campus.linkName &&
        normalized.toLowerCase().includes(campus.linkName.toLowerCase());
      if (hostMatch && (ifaceMatch || linkMatch)) {
        matchedCampus = campus;
        confidence = 'Exact Router/Circuit Match';
        break;
      }
    }
  }

  // 3. Fallback campus name or hostname match
  if (!matchedCampus) {
    for (const campus of campuses) {
      const hostMatch =
        campus.routerHostname &&
        normalized.toLowerCase().includes(campus.routerHostname.toLowerCase());
      const nameMatch = normalized
        .toLowerCase()
        .includes(campus.campusName.toLowerCase());
      if (hostMatch || nameMatch) {
        matchedCampus = campus;
        confidence = 'Heuristic Interface Match';
        break;
      }
    }
  }

  const hostRegex =
    /(?:devname="|Sep\s+\d+\s+\d+:\d+:\d+\s+)([a-zA-Z0-9_-]+-[0-9]{2})/i;
  const hostMatch = normalized.match(hostRegex);
  const extractedHostname =
    hostMatch?.[1] || matchedCampus?.routerHostname || 'cop-rtr-01';

  const ifaceRegex =
    /(?:Interface\s+|interface=|interface\s+|on\s+)([A-Za-z0-9/-]+(?:\.\d+)?)/i;
  const ifaceMatch = normalized.match(ifaceRegex);
  const extractedInterface =
    ifaceMatch?.[1]?.replace(/"/g, '') ||
    matchedCampus?.interfaceName ||
    'GigabitEthernet0/0/0';

  const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
  const ipMatch = normalized.match(ipRegex);
  const extractedBgpPeer =
    ipMatch?.[0] || matchedCampus?.bgpPeerIp || '0.0.0.0';

  let extractedPacketLossPct = matchedCampus?.packetLossPct ?? 100;
  const directLossMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*%\s*packet\s*loss/i
  );
  const kvLossMatch = normalized.match(/(?:packet-loss|loss)=(\d+(?:\.\d+)?)%/i);
  if (directLossMatch) {
    extractedPacketLossPct = parseFloat(directLossMatch[1]);
  } else if (kvLossMatch) {
    extractedPacketLossPct = parseFloat(kvLossMatch[1]);
  } else if (/down|rxlos|idle/i.test(normalized)) {
    extractedPacketLossPct = 100;
  }

  const latencyMatch = normalized.match(/(?:latency|rtt)=(\d+(?:\.\d+)?)ms/i);
  const extractedLatencyMs = latencyMatch
    ? parseFloat(latencyMatch[1])
    : extractedPacketLossPct >= 100
      ? 0
      : matchedCampus?.latencyMs || 180;

  const opticalMatch = normalized.match(/(-?\d+(?:\.\d+)?)\s*dBm/i);
  const extractedOpticalRxDbm = opticalMatch
    ? parseFloat(opticalMatch[1])
    : matchedCampus?.opticalRxDbm || -38.5;

  let extractedProtocol: ParsedLogExtraction['extractedProtocol'] = 'SNMP-TRAP';
  let extractedSeverity: ParsedLogExtraction['extractedSeverity'] = 'CRITICAL';
  let extractedProblemSummary = '';
  let suggestedStatus: IncidentStatus = 'Waiting for Telco Repair';
  let suggestedEtrHours = 4;

  const targetLinkLabel = matchedCampus
    ? `${matchedCampus.campusName} — ${matchedCampus.linkName}`
    : `${extractedHostname} (${extractedInterface})`;

  if (/RXLOS|OPTICAL|dBm below/i.test(normalized)) {
    extractedProtocol = 'OPTICAL';
    extractedSeverity = 'CRITICAL';
    extractedProblemSummary = `${targetLinkLabel} DOWN: Optical Loss of Signal (Rx ${extractedOpticalRxDbm} dBm) on ${extractedInterface}`;
    suggestedStatus = 'Waiting for Telco Repair';
    suggestedEtrHours = 4;
  } else if (/BGP|ADJCHANGE|Hold Timer Expired/i.test(normalized)) {
    extractedProtocol = 'BGP';
    extractedSeverity = 'CRITICAL';
    extractedProblemSummary = `${targetLinkLabel} DOWN: BGP Peer ${extractedBgpPeer} Down (${extractedPacketLossPct}% Packet Loss)`;
    suggestedStatus = 'Waiting for Telco Repair';
    suggestedEtrHours = 4;
  } else if (/sdwan|latency|packet-loss|ICMP-SLA/i.test(normalized)) {
    extractedProtocol = 'ICMP-SLA';
    extractedSeverity = 'CRITICAL';
    extractedProblemSummary = `${targetLinkLabel} DOWN: ${extractedPacketLossPct}% Packet Loss on ${extractedInterface}`;
    suggestedStatus = 'Pending';
    suggestedEtrHours = 3;
  } else {
    extractedProblemSummary = `${targetLinkLabel} Connectivity Outage Detected on ${extractedInterface}`;
    extractedSeverity = 'CRITICAL';
  }

  const extractedTechnicalDetails = [
    matchedCampus
      ? `Campus & Link: ${matchedCampus.campusName} — ${matchedCampus.linkName} (${matchedCampus.linkRole})`
      : `Router / Interface: ${extractedHostname} (${extractedInterface})`,
    matchedCampus
      ? `Circuit ID: ${matchedCampus.circuitId} (${matchedCampus.provider} · Acct #${matchedCampus.accountNumber})`
      : `Detected Peer IP: ${extractedBgpPeer}`,
    `CE Router / Port: ${extractedHostname} (${extractedInterface})`,
    `Telemetry Snapshot: Packet Loss ${extractedPacketLossPct}% | Latency ${extractedLatencyMs}ms | Optical Rx ${extractedOpticalRxDbm} dBm`,
  ].join('\n');

  const autoExtractedFields = [
    matchedCampus
      ? `Campus & Link (${matchedCampus.campusName} — ${matchedCampus.linkName})`
      : 'Router Hostname',
    matchedCampus
      ? `Telco Provider (${matchedCampus.provider})`
      : 'WAN Interface',
    matchedCampus ? `Circuit ID (${matchedCampus.circuitId})` : 'BGP Peer IP',
    'Problem Summary & Optical/BGP Telemetry',
    'Internal NOC Ticket # (Auto-Sequenced)',
  ];

  const manualRequiredFields = [
    'Telco Reference Ticket # (Once issued by provider desk, or leave "Pending Telco Ref")',
    'Reported to Telco Status (Yes / No — or auto-send provider outage email)',
    'Provider Expected Resolution Timeline (ETR)',
    'Incident Status (Pending / Waiting for Telco Repair / Resolved)',
  ];

  return {
    matchedCampus,
    confidence,
    extractedHostname,
    extractedInterface,
    extractedBgpPeer,
    extractedProtocol,
    extractedSeverity,
    extractedProblemSummary,
    extractedTechnicalDetails,
    extractedPacketLossPct,
    extractedLatencyMs,
    extractedOpticalRxDbm,
    suggestedStatus,
    suggestedEtrHours,
    autoExtractedFields,
    manualRequiredFields,
  };
}

/**
 * Generates an RFC-ready Telco Service Provider Outage Dispatch Email
 * for Cathedral of Praise Campus Network Monitoring.
 */
export function buildProviderDispatchEmail(
  incident: Pick<
    IncidentTicket,
    | 'id'
    | 'ticketNumber'
    | 'telcoTicketNumber'
    | 'campusName'
    | 'linkName'
    | 'circuitId'
    | 'provider'
    | 'providerNocEmail'
    | 'accountNumber'
    | 'routerHostname'
    | 'interfaceName'
    | 'problemSummary'
    | 'technicalDetails'
    | 'rawLogSnippet'
    | 'expectedResolutionAt'
    | 'reportedBy'
  >,
  triggerSource: EmailDispatch['triggerSource'] = 'Auto-Created on Ticket Log'
): Omit<EmailDispatch, 'id' | 'timestamp'> {
  const subjectPrefix =
    triggerSource === 'SLA Breach Escalation'
      ? '[SLA BREACH ESCALATION - P1]'
      : triggerSource === 'Telco Escalation Chaser'
        ? '[URGENT FOLLOW-UP / ETR REQUEST]'
        : '[URGENT LINK DOWN]';

  const linkLabel = incident.linkName
    ? `${incident.campusName} (${incident.linkName})`
    : incident.campusName;

  const subjectIdTag =
    incident.accountNumber &&
    incident.accountNumber !== 'N/A (Circuit ID)' &&
    incident.accountNumber !== 'Starlink'
      ? `Account #: ${incident.accountNumber}`
      : `Circuit ID: ${incident.circuitId}`;

  const subject = `${subjectPrefix} Cathedral of Praise — ${linkLabel} | ${subjectIdTag} | Ref: ${incident.ticketNumber}`;

  const formattedEtr = incident.expectedResolutionAt
    ? new Date(incident.expectedResolutionAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : 'Awaiting Provider ETR Confirmation';

  const body = `Dear ${incident.provider} Enterprise NOC Support Team,

Please be advised that Cathedral of Praise Campus Network Monitoring has detected that our link is currently RED (DOWN). Kindly log a Priority-1 fault ticket immediately or update existing Telco Ref (${incident.telcoTicketNumber || 'Pending Assignment'}):

====================================================================
CATHEDRAL OF PRAISE — CIRCUIT & CAMPUS IDENTIFICATION
====================================================================
• Organization          : Cathedral of Praise
• Affected Campus       : ${incident.campusName}
• Affected Link         : ${incident.linkName || incident.provider}
• Service Provider      : ${incident.provider}
• Circuit / Service ID  : ${incident.circuitId}
• Enterprise Account #  : ${incident.accountNumber}
• Internal NOC Ticket # : ${incident.ticketNumber}
• Telco Reference #     : ${incident.telcoTicketNumber || 'REQUESTING IMMEDIATE TICKET NUMBER'}

====================================================================
FAULT SUMMARY & CE ROUTER TELEMETRY
====================================================================
• Problem Description   : ${incident.problemSummary}
• CE Router / Interface : ${incident.routerHostname} (${incident.interfaceName})
• Target / Expected ETR : ${formattedEtr}

${incident.technicalDetails}

--- Raw CE Router Log Excerpt ---
${incident.rawLogSnippet || 'N/A (Logged via Cathedral of Praise NOC Console)'}
---------------------------------

REQUIRED ACTIONS FROM ${incident.provider.toUpperCase()} NOC:
1. Confirm receipt and provide your official Telco Fault Reference Number.
2. Perform line / transport testing to our ${incident.campusName} demarcation.
3. Provide an official Expected Time to Resolution (ETR) so we can restore the link to GREEN.

Dispatched by: ${incident.reportedBy || 'jmnadado@cathedralofpraise.com.ph'}
Cathedral of Praise IT & Network Operations · jmnadado@cathedralofpraise.com.ph · lcmojal@cathedralofpraise.com.ph · jffernandez@cathedralofpraise.com.ph · jcjara@cathedralofpraise.com.ph`;

  return {
    incidentId: incident.id,
    ticketNumber: incident.ticketNumber,
    campusName: incident.campusName,
    linkName: incident.linkName,
    provider: incident.provider,
    recipientType: 'Service Provider (Telco NOC)',
    to: incident.providerNocEmail,
    cc: 'lcmojal@cathedralofpraise.com.ph, jffernandez@cathedralofpraise.com.ph, jcjara@cathedralofpraise.com.ph, jmnadado@cathedralofpraise.com.ph',
    subject,
    body,
    triggerSource,
    deliveryStatus: 'Dispatched',
  };
}

/**
 * Generates an internal stakeholder / escalation email notification
 */
export function buildInternalNotificationEmail(
  incident: IncidentTicket,
  reason: string,
  triggerSource: EmailDispatch['triggerSource'] = 'Status Update Notification'
): Omit<EmailDispatch, 'id' | 'timestamp'> {
  const formattedEtr = incident.expectedResolutionAt
    ? new Date(incident.expectedResolutionAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Pending Telco ETR';

  const isRestored = incident.status === 'Resolved';
  const statusBanner = isRestored
    ? 'GREEN — RESTORED & GOOD'
    : 'RED — LINK DOWN';

  const subject = `[COP NOC: ${statusBanner}] ${incident.campusName} — ${incident.linkName} (${incident.ticketNumber})`;

  const body = `Cathedral of Praise Campus Network Operations Advisory
--------------------------------------------------------------------
Update Trigger : ${reason}
Link State     : ${statusBanner}
Incident ID    : ${incident.ticketNumber}
Telco Ref #    : ${incident.telcoTicketNumber || 'Not Yet Assigned'}
Campus         : ${incident.campusName}
Link / Circuit : ${incident.linkName} (${incident.circuitId} · ${incident.provider})
Current Status : ${incident.status}
Reported Telco : ${incident.reportedToTelco ? 'YES — Reported to Provider' : 'NO — Pending Telco Notification'}
Provider ETR   : ${formattedEtr}
Escalation Tier: ${incident.escalationLevel}

Summary:
${incident.problemSummary}

Provider / Repair Notes:
${incident.etrNotes || 'No additional field notes recorded.'}
--------------------------------------------------------------------
Cathedral of Praise Automated NOC Alerting`;

  return {
    incidentId: incident.id,
    ticketNumber: incident.ticketNumber,
    campusName: incident.campusName,
    linkName: incident.linkName,
    provider: incident.provider,
    recipientType:
      triggerSource === 'SLA Breach Escalation'
        ? 'Internal Escalation Alert'
        : 'Campus IT Advisory',
    to: 'lcmojal@cathedralofpraise.com.ph, jffernandez@cathedralofpraise.com.ph, jcjara@cathedralofpraise.com.ph',
    cc: 'jmnadado@cathedralofpraise.com.ph',
    subject,
    body,
    triggerSource,
    deliveryStatus: 'Dispatched',
  };
}

export interface ParsedM365EmailResult {
  matchedCampus: CampusLink | null;
  confidence: 'Exact Circuit/Account Match' | 'Campus + Link Name Match' | 'Unmatched';
  detectedAction: 'CREATE_OUTAGE_RED' | 'RESOLVE_TO_GREEN';
  extractedInternalTicket: string | null;
  extractedTelcoTicket: string | null;
  extractedProblemSummary: string;
  extractedNotes: string;
  suggestedStatus: IncidentStatus;
}

export interface M365EmailSamplePreset {
  id: string;
  label: string;
  from: string;
  to: string;
  subject: string;
  body: string;
}

export const SAMPLE_M365_EMAIL_PRESETS: M365EmailSamplePreset[] = [
  {
    id: 'm365-etpi-outage',
    label: '1. Send to ETPI (linkgold@etpi.com.ph) — Subject has Circuit ID 930473671 → Turns RED',
    from: 'jmnadado@cathedralofpraise.com.ph',
    to: 'linkgold@etpi.com.ph',
    subject: 'Link Down: Main Campus Eastern Internet PDES - Circuit ID 930473671',
    body: `Hi ETPI LinkGold Support,

Please create an urgent trouble ticket for our Main Campus Eastern Internet PDES link.
Circuit ID: 930473671
Problem: Total loss of internet connectivity / Optical LOS on CE router.

Please provide your ETPI Reference Ticket Number and ETR.

Regards,
jmnadado@cathedralofpraise.com.ph`,
  },
  {
    id: 'm365-converge-outage',
    label: '2. Send to Converge (enterprisesupport@convergeict.com) — Subject has Circuit ID MC12984 → Turns RED',
    from: 'jmnadado@cathedralofpraise.com.ph',
    to: 'enterprisesupport@convergeict.com',
    subject: 'Outage Report: Main Campus Converge Internet - Circuit ID MC12984',
    body: `Hi Converge Enterprise Support,

Please log a fault ticket for Cathedral of Praise Main Campus Converge Internet.
Circuit ID: MC12984
Problem: Link down / 100% packet loss on WAN interface.

Kindly reply with the Converge Ticket Number and ETR.

Regards,
jmnadado@cathedralofpraise.com.ph`,
  },
  {
    id: 'm365-pldt-outage',
    label: '3. Send to PLDT (enterprisecare@pldt.com.ph) — Subject has Account # 657871060 → Turns RED',
    from: 'jmnadado@cathedralofpraise.com.ph',
    to: 'enterprisecare@pldt.com.ph',
    subject: 'Urgent Outage: Santa Rosa Campus PLDT Internet - Account Number 657871060',
    body: `Hi PLDT Enterprise Care,

Please log a trouble ticket for our Santa Rosa Campus PLDT Internet line.
Account Number: 657871060
Problem: Physical fiber LOS / Link Down on CE router.

Kindly provide the PLDT Ticket Number and ETR.

Regards,
jmnadado@cathedralofpraise.com.ph`,
  },
  {
    id: 'm365-resolve-green',
    label: '4. Resolve Update — Subject has Account # / Circuit ID + "RESOLVED" → Turns GREEN',
    from: 'jmnadado@cathedralofpraise.com.ph',
    to: 'enterprisecare@pldt.com.ph',
    subject: 'RESOLVED: Santa Rosa Campus PLDT Internet - Account Number 657871060',
    body: `Hi PLDT Enterprise Care,

Confirming that Account Number 657871060 (Santa Rosa Campus PLDT Internet) is now RESOLVED and back online. Closing ticket.`,
  },
];

export function parseM365Email(
  subject: string,
  body: string,
  campuses: CampusLink[],
  to: string = ''
): ParsedM365EmailResult {
  const combined = `${subject}\n${body}`.trim();
  const lower = combined.toLowerCase();
  const compactCombined = lower.replace(/[\s#-]/g, '');
  const lowerTo = (to || '').toLowerCase();

  const recipientProviderHint: CampusLink['provider'] | null =
    lowerTo.includes('etpi.com.ph') || lowerTo.includes('linkgold')
      ? 'Eastern Communications'
      : lowerTo.includes('convergeict.com')
        ? 'Converge ICT'
        : lowerTo.includes('pldt.com.ph')
          ? 'PLDT Enterprise'
          : lowerTo.includes('starlink.com')
            ? 'Starlink Enterprise'
            : null;

  let matchedCampus: CampusLink | null = null;
  let confidence: ParsedM365EmailResult['confidence'] = 'Unmatched';

  const matchesCircuitOrAccount = (c: CampusLink): boolean => {
    const rawCircuit = (c.circuitId || '')
      .replace(/^Acct\s*#/i, '')
      .trim()
      .toLowerCase();
    const compactCircuit = rawCircuit.replace(/[\s#-]/g, '');

    const hasCircuit =
      rawCircuit.length >= 4 &&
      !rawCircuit.startsWith('starlink-') &&
      (lower.includes(rawCircuit) || compactCombined.includes(compactCircuit));

    const rawAccount = (c.accountNumber || '').trim().toLowerCase();
    const compactAccount = rawAccount.replace(/[\s#-]/g, '');
    const hasAccount =
      rawAccount.length >= 4 &&
      rawAccount !== 'n/a (circuit id)' &&
      rawAccount !== 'starlink' &&
      (lower.includes(rawAccount) || compactCombined.includes(compactAccount));

    return Boolean(hasCircuit || hasAccount);
  };

  // 1. Check Campus Name + Circuit/Account first (handles shared circuit IDs like 930473671 on Main vs South)
  for (const c of campuses) {
    const campusTokens = c.campusName
      .toLowerCase()
      .replace('campus', '')
      .trim();
    const hasCampusName =
      lower.includes(c.campusName.toLowerCase()) ||
      (campusTokens.length >= 4 && lower.includes(campusTokens));

    if (hasCampusName && matchesCircuitOrAccount(c)) {
      matchedCampus = c;
      confidence = 'Exact Circuit/Account Match';
      break;
    }
  }

  // 2. Check exact Circuit ID or PLDT Account Number anywhere in email subject or body
  if (!matchedCampus) {
    for (const c of campuses) {
      if (matchesCircuitOrAccount(c)) {
        matchedCampus = c;
        confidence = 'Exact Circuit/Account Match';
        break;
      }
    }
  }

  // 3. Fallback: Match Campus Name + Link Name (or Campus Name + Telco Recipient email)
  if (!matchedCampus) {
    for (const c of campuses) {
      const campusShort = c.campusName
        .toLowerCase()
        .replace('campus', '')
        .trim();
      const hasCampus =
        lower.includes(c.campusName.toLowerCase()) ||
        (campusShort.length >= 4 && lower.includes(campusShort));
      const hasLink = lower.includes(c.linkName.toLowerCase());
      const matchesRecipientProvider =
        recipientProviderHint && c.provider === recipientProviderHint;
      if (hasCampus && (hasLink || matchesRecipientProvider)) {
        matchedCampus = c;
        confidence = 'Campus + Link Name Match';
        break;
      }
    }
  }

  // Extract internal ticket if present (e.g., COP-INC-2026-0101)
  const internalMatch = combined.match(/COP-INC-\d{4}-\d+/i);
  const extractedInternalTicket = internalMatch
    ? internalMatch[0].toUpperCase()
    : null;

  // Extract Telco Ticket / Reference #
  let extractedTelcoTicket: string | null = null;
  const telcoPatterns = [
    /(?:Telco\s*(?:Ticket|Ref(?:erence)?)|Reference\s*(?:Ticket|No\.?|#)?|Ticket\s*(?:No\.?|#|Number)?|SR\s*#|Case\s*#|Fault\s*#)\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{3,24})/i,
    /\b((?:ETPI|PLDT|CNVRG|CONVERGE|SL|INC|SR|TT)-[A-Z0-9-]{3,20})\b/i,
  ];
  for (const pat of telcoPatterns) {
    const m = combined.match(pat);
    if (
      m &&
      m[1] &&
      !/^(NUMBER|ID|REF|OUTAGE|DOWN|STATUS|RESOLVED)$/i.test(m[1]) &&
      !m[1].toUpperCase().startsWith('COP-INC')
    ) {
      extractedTelcoTicket = m[1].trim();
      break;
    }
  }

  // Detect whether email is resolving/restoring the link or reporting/updating an outage
  const isResolved =
    /\b(resolved|restored|service\s+up|link\s+up|back\s+online|cleared|closed|issue\s+fixed)\b/i.test(
      combined
    );

  const detectedAction: ParsedM365EmailResult['detectedAction'] = isResolved
    ? 'RESOLVE_TO_GREEN'
    : 'CREATE_OUTAGE_RED';

  const suggestedStatus: IncidentStatus = isResolved
    ? 'Resolved'
    : 'Waiting for Telco Repair';

  // Extract Problem Summary
  const problemLineMatch = body.match(
    /(?:Problem|Issue|Reason|Details|Symptoms)\s*:\s*([^\n\r]+)/i
  );
  const cleanSubject = subject
    .replace(/^(?:RE|FW|FWD)\s*:\s*/gi, '')
    .replace(/\[[^\]]*\]\s*/g, '')
    .trim();

  const extractedProblemSummary = problemLineMatch
    ? problemLineMatch[1].trim()
    : cleanSubject ||
      (matchedCampus
        ? `${matchedCampus.campusName} — ${matchedCampus.linkName} Outage (${matchedCampus.circuitId})`
        : 'Link Outage Reported via M365 Email');

  return {
    matchedCampus,
    confidence,
    detectedAction,
    extractedInternalTicket,
    extractedTelcoTicket,
    extractedProblemSummary,
    extractedNotes: body.trim().slice(0, 500),
    suggestedStatus,
  };
}
