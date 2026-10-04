import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Moon,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sliders,
  Sun,
  TrendingUp,
  UserCheck,
  Users,
  Wifi,
  XCircle,
} from 'lucide-react';
import { AdminUserManagementModal } from './components/AdminUserManagementModal';
import {
  CampusArrangerModal,
  CardZoomScale,
  GridColumnsMode,
  TemplateDensityMode,
} from './components/CampusArrangerModal';
import { CampusTelcoManageModal } from './components/CampusTelcoManageModal';
import { CircuitDirectoryModal } from './components/CircuitDirectoryModal';
import { CopLogo } from './components/CopLogo';
import { EscalationEmailCenter } from './components/EscalationEmailCenter';
import { IncidentDetailDrawer } from './components/IncidentDetailDrawer';
import { IncidentLoggerModal } from './components/IncidentLoggerModal';
import { M365EmailSyncModal } from './components/M365EmailSyncModal';
import { NetworkLogWorkbench } from './components/NetworkLogWorkbench';
import { AuthModalMode, NocAuthModal } from './components/NocAuthModal';
import { NocSecurityModal } from './components/NocSecurityModal';
import { ReportExportModal } from './components/ReportExportModal';
import { UptimeAnalyticsSection } from './components/UptimeAnalyticsSection';
import {
  COP_CAMPUS_ORDER,
  INITIAL_CAMPUS_LINKS,
  INITIAL_EMAIL_DISPATCHES,
  INITIAL_ESCALATION_POLICIES,
  INITIAL_INCIDENTS,
  INITIAL_NETWORK_LOGS,
  INITIAL_USERS,
} from './data/initialNocData';
import {
  CampusLink,
  EmailDispatch,
  EscalationPolicy,
  IncidentStatus,
  IncidentTicket,
  NetworkLogEvent,
  NocUser,
  UserRole,
} from './types/noc';

type ActiveTab =
  | 'overview'
  | 'incidents'
  | 'logs'
  | 'uptime'
  | 'escalations';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Core NOC State
  const [campuses, setCampuses] = useState<CampusLink[]>(INITIAL_CAMPUS_LINKS);
  const [logs, setLogs] = useState<NetworkLogEvent[]>(INITIAL_NETWORK_LOGS);
  const [incidents, setIncidents] =
    useState<IncidentTicket[]>(INITIAL_INCIDENTS);
  const [emails, setEmails] = useState<EmailDispatch[]>(
    INITIAL_EMAIL_DISPATCHES
  );
  const [escalationPolicies, setEscalationPolicies] = useState<
    EscalationPolicy[]
  >(INITIAL_ESCALATION_POLICIES);

  // Filters for Incident Table
  const [incidentStatusFilter, setIncidentStatusFilter] = useState<
    'ALL' | IncidentStatus
  >('ALL');
  const [reportedFilter, setReportedFilter] = useState<
    'ALL' | 'REPORTED' | 'UNREPORTED'
  >('ALL');
  const [incidentSearch, setIncidentSearch] = useState<string>('');

  // Filter for Campus Wallboard & Link Matrix
  const [campusStatusFilter, setCampusStatusFilter] = useState<
    'ALL' | 'GOOD_GREEN' | 'DOWN_RED'
  >('ALL');
  const [campusSearch, setCampusSearch] = useState<string>('');

  // Modals & Drawers
  const [isLoggerOpen, setIsLoggerOpen] = useState<boolean>(false);
  const [isCircuitDirectoryOpen, setIsCircuitDirectoryOpen] =
    useState<boolean>(false);
  const [isM365ModalOpen, setIsM365ModalOpen] = useState<boolean>(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] =
    useState<boolean>(false);
  const [maskSensitiveIds, setMaskSensitiveIds] = useState<boolean>(true);
  const [isNocUnlocked, setIsNocUnlocked] = useState<boolean>(false);
  const [activeOperatorEmail, setActiveOperatorEmail] = useState<string>(
    'jmnadado@cathedralofpraise.com.ph'
  );
  const [loggerInitialLog, setLoggerInitialLog] =
    useState<NetworkLogEvent | null>(null);
  const [loggerInitialCampusId, setLoggerInitialCampusId] = useState<
    string | null
  >(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null
  );

  // Campus & Telco Management Modal State
  const [isCampusTelcoModalOpen, setIsCampusTelcoModalOpen] = useState(false);
  const [telcoModalMode, setTelcoModalMode] = useState<'add-branch' | 'edit-telco'>('add-branch');
  const [selectedManageCampus, setSelectedManageCampus] = useState<string>('');

  // Template Layout, Density & Campus Sequence State (4 Layout Options)
  const [templateMode, setTemplateMode] = useState<TemplateDensityMode>(() => {
    try {
      const saved = localStorage.getItem('cop_noc_template_mode');
      if (
        saved === 'ultra-compact' ||
        saved === 'compact' ||
        saved === 'comfortable' ||
        saved === 'executive'
      ) {
        return saved;
      }
    } catch {}
    return 'compact';
  });

  const [gridColumns, setGridColumns] = useState<GridColumnsMode>(() => {
    try {
      const saved = localStorage.getItem('cop_noc_grid_cols');
      if (saved && ['auto', '2', '3', '4', '5'].includes(saved)) {
        return saved as GridColumnsMode;
      }
    } catch {}
    return 'auto';
  });

  const [cardZoom, setCardZoom] = useState<CardZoomScale>(() => {
    try {
      const saved = localStorage.getItem('cop_noc_card_zoom');
      if (saved && ['sm', 'md', 'lg'].includes(saved)) {
        return saved as CardZoomScale;
      }
    } catch {}
    return 'md';
  });

  const [isArrangerModalOpen, setIsArrangerModalOpen] = useState<boolean>(false);

  const [customCampusOrder, setCustomCampusOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cop_noc_campus_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return COP_CAMPUS_ORDER;
  });

  // User Authentication & Admin RBAC State
  const [currentUser, setCurrentUser] = useState<NocUser | null>(() => {
    try {
      const stored = localStorage.getItem('cop_noc_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.email) {
          if (parsed.name && parsed.name.includes('Jonathan')) {
            parsed.name = 'Jeffrey Nadado';
          }
          return parsed;
        }
      }
    } catch {}
    return null; // No auto-login! Requires explicit user authentication
  });
  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cop_noc_guest') === 'true';
    } catch {
      return false;
    }
  });
  const [users, setUsers] = useState<NocUser[]>(INITIAL_USERS);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('LOGIN');
  const [showFullLoginPage, setShowFullLoginPage] = useState<boolean>(false);
  const [isExportReportOpen, setIsExportReportOpen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  const shouldShowLoginPage =
    showFullLoginPage || (!currentUser && !isGuestMode);

  // Toast / Action Banner
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setActionBanner(msg);
    setTimeout(() => {
      setActionBanner((prev) => (prev === msg ? null : prev));
    }, 6000);
  };

  // Sync users list from server
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApproveUser = async (userId: string) => {
    const res = await fetch(`/api/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ACTIVE',
        adminEmail: currentUser?.email || 'admin@cathedralofpraise.com.ph',
      }),
    });
    if (!res.ok) throw new Error('Failed to approve user');
    await fetchUsers();
  };

  const handleSuspendUser = async (userId: string, reason?: string) => {
    const res = await fetch(`/api/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'SUSPENDED',
        suspendedReason: reason || 'Access suspended by NOC Administrator.',
      }),
    });
    if (!res.ok) throw new Error('Failed to suspend user');
    await fetchUsers();
  };

  const handleReactivateUser = async (userId: string) => {
    const res = await fetch(`/api/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'ACTIVE',
        adminEmail: currentUser?.email || 'admin@cathedralofpraise.com.ph',
      }),
    });
    if (!res.ok) throw new Error('Failed to reactivate user');
    await fetchUsers();
  };

  const handleChangeRole = async (userId: string, role: UserRole) => {
    const res = await fetch(`/api/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error('Failed to change role');
    await fetchUsers();
  };

  const handleResetPassword = async (userId: string, newPass: string) => {
    const res = await fetch(`/api/users/${userId}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: newPass }),
    });
    if (!res.ok) throw new Error('Failed to reset password');
  };

  const handleDeleteUser = async (userId: string) => {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete user');
    await fetchUsers();
  };

  const handleCreateUser = async (newUser: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    department: string;
    phone?: string;
  }) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newUser,
        adminEmail: currentUser?.email || 'Admin',
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create user');
    }
    await fetchUsers();
  };

  const handleLoginSuccess = (user: NocUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('cop_noc_user', JSON.stringify(user));
      localStorage.removeItem('cop_noc_guest');
    } catch {}
    setIsGuestMode(false);
    setShowFullLoginPage(false);
    setIsAuthModalOpen(false);
    setActiveOperatorEmail(user.email);
    setIsNocUnlocked(true);
    setMaskSensitiveIds(false);
    showNotice(`Signed in as ${user.name} (${user.role}) — Controls Unlocked.`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('cop_noc_user');
      localStorage.removeItem('cop_noc_guest');
    } catch {}
    setIsGuestMode(false);
    setIsNocUnlocked(false);
    setMaskSensitiveIds(true);
    setIsUserMenuOpen(false);
    setAuthModalMode('LOGIN');
    setShowFullLoginPage(true);
    showNotice('Signed out. Redirected to Cathedral of Praise Login Portal.');
  };

  // Fetch initial state & poll every 8s so inbound M365 Power Automate webhooks update the wallboard automatically
  const fetchNocState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        if (data.campuses) setCampuses(data.campuses);
        if (data.logs) setLogs(data.logs);
        if (data.incidents) setIncidents(data.incidents);
        if (data.emails) setEmails(data.emails);
        if (data.escalationPolicies)
          setEscalationPolicies(data.escalationPolicies);
      }
    } catch {
      // Fallback to initial seeded state if offline
    }
  };

  useEffect(() => {
    fetchNocState();
    const interval = setInterval(fetchNocState, 8000);
    return () => clearInterval(interval);
  }, []);

  const selectedIncident = useMemo(
    () => incidents.find((i) => i.id === selectedIncidentId) || null,
    [incidents, selectedIncidentId]
  );

  // Group all links into campuses, ordered by customCampusOrder + any new branches
  const groupedCampuses = useMemo(() => {
    // Collect all unique campus names from campuses state
    const allUniqueNames = Array.from(new Set(campuses.map((c) => c.campusName)));

    // Order according to customCampusOrder first, then any newly added campuses
    const orderedNames: string[] = [];
    for (const name of customCampusOrder) {
      if (allUniqueNames.includes(name)) {
        orderedNames.push(name);
      }
    }
    for (const name of allUniqueNames) {
      if (!orderedNames.includes(name)) {
        orderedNames.push(name);
      }
    }

    return orderedNames
      .map((campusName) => {
        const links = campuses.filter((c) => c.campusName === campusName);
        const downCount = links.filter((l) => l.status !== 'Operational').length;
        const goodCount = links.filter((l) => l.status === 'Operational').length;
        return {
          campusName,
          region: links[0]?.region || '',
          building: links[0]?.building || '',
          links,
          downCount,
          goodCount,
          allGood: downCount === 0,
        };
      })
      .filter((group) => {
        if (campusStatusFilter === 'GOOD_GREEN' && !group.allGood) return false;
        if (campusStatusFilter === 'DOWN_RED' && group.downCount === 0)
          return false;
        if (!campusSearch.trim()) return true;
        const q = campusSearch.toLowerCase();
        return (
          group.campusName.toLowerCase().includes(q) ||
          group.region.toLowerCase().includes(q) ||
          group.links.some(
            (l) =>
              l.linkName.toLowerCase().includes(q) ||
              l.provider.toLowerCase().includes(q) ||
              l.circuitId.toLowerCase().includes(q)
          )
        );
      });
  }, [campuses, customCampusOrder, campusStatusFilter, campusSearch]);

  const handleUpdateCampusOrder = (newOrder: string[]) => {
    setCustomCampusOrder(newOrder);
    try {
      localStorage.setItem('cop_noc_campus_order', JSON.stringify(newOrder));
    } catch {}
    showNotice('Campus layout sequence updated & saved.');
  };

  const handleResetCampusOrder = () => {
    setCustomCampusOrder(COP_CAMPUS_ORDER);
    setTemplateMode('compact');
    setGridColumns('auto');
    setCardZoom('md');
    try {
      localStorage.removeItem('cop_noc_campus_order');
      localStorage.removeItem('cop_noc_template_mode');
      localStorage.removeItem('cop_noc_grid_cols');
      localStorage.removeItem('cop_noc_card_zoom');
    } catch {}
    showNotice('Layout reset to default Cathedral of Praise configuration.');
  };

  const handleSelectTemplateMode = (mode: TemplateDensityMode) => {
    setTemplateMode(mode);
    try {
      localStorage.setItem('cop_noc_template_mode', mode);
    } catch {}
    showNotice(`Switched to "${mode.toUpperCase()}" template view.`);
  };

  const handleSelectGridColumns = (cols: GridColumnsMode) => {
    setGridColumns(cols);
    try {
      localStorage.setItem('cop_noc_grid_cols', cols);
    } catch {}
  };

  const handleSelectCardZoom = (zoom: CardZoomScale) => {
    setCardZoom(zoom);
    try {
      localStorage.setItem('cop_noc_card_zoom', zoom);
    } catch {}
  };

  const handleShiftCampus = (campusName: string, direction: 'up' | 'down') => {
    const idx = customCampusOrder.indexOf(campusName);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= customCampusOrder.length) return;
    const nextOrder = [...customCampusOrder];
    const temp = nextOrder[idx];
    nextOrder[idx] = nextOrder[targetIdx];
    nextOrder[targetIdx] = temp;
    handleUpdateCampusOrder(nextOrder);
  };

  // Computed KPI Metrics
  const kpiStats = useMemo(() => {
    const downCount = campuses.filter((c) => c.status !== 'Operational').length;
    const goodCount = campuses.filter((c) => c.status === 'Operational').length;

    const openIncidents = incidents.filter((i) => i.status !== 'Resolved');
    const waitingTelcoCount = openIncidents.filter(
      (i) => i.status === 'Waiting for Telco Repair'
    ).length;
    const pendingCount = openIncidents.filter(
      (i) => i.status === 'Pending'
    ).length;
    const unreportedCount = openIncidents.filter(
      (i) => !i.reportedToTelco
    ).length;

    const avgUptime30d =
      campuses.reduce((acc, c) => acc + c.uptime30dPct, 0) /
      (campuses.length || 1);

    const providerEmailsCount = emails.filter(
      (e) => e.recipientType === 'Service Provider (Telco NOC)'
    ).length;

    const unlinkedAlertLogs = logs.filter(
      (l) => !l.linkedIncidentId && l.severity !== 'INFO'
    );

    return {
      downCount,
      goodCount,
      openCount: openIncidents.length,
      waitingTelcoCount,
      pendingCount,
      unreportedCount,
      avgUptime30d: avgUptime30d.toFixed(2),
      providerEmailsCount,
      unlinkedAlertLogs,
    };
  }, [campuses, incidents, emails, logs]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (
        incidentStatusFilter !== 'ALL' &&
        inc.status !== incidentStatusFilter
      ) {
        return false;
      }
      if (reportedFilter === 'REPORTED' && !inc.reportedToTelco) return false;
      if (reportedFilter === 'UNREPORTED' && inc.reportedToTelco) return false;
      if (!incidentSearch.trim()) return true;
      const q = incidentSearch.toLowerCase();
      return (
        inc.campusName.toLowerCase().includes(q) ||
        (inc.linkName && inc.linkName.toLowerCase().includes(q)) ||
        inc.ticketNumber.toLowerCase().includes(q) ||
        inc.telcoTicketNumber.toLowerCase().includes(q) ||
        inc.circuitId.toLowerCase().includes(q) ||
        inc.provider.toLowerCase().includes(q) ||
        inc.problemSummary.toLowerCase().includes(q)
      );
    });
  }, [incidents, incidentStatusFilter, reportedFilter, incidentSearch]);

  // Handlers
  const handleOpenLoggerWithLog = (log: NetworkLogEvent) => {
    setLoggerInitialLog(log);
    setLoggerInitialCampusId(log.campusId);
    setIsLoggerOpen(true);
  };

  const handleOpenLoggerForCampus = (campusId?: string) => {
    setLoggerInitialLog(null);
    setLoggerInitialCampusId(campusId || null);
    setIsLoggerOpen(true);
  };

  const handleSubmitIncident = async (
    payload: Partial<IncidentTicket> & {
      autoSendProviderEmail: boolean;
      autoSendInternalAlert: boolean;
    }
  ) => {
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setCampuses(data.state.campuses);
        setLogs(data.state.logs);
        setIncidents(data.state.incidents);
        setEmails(data.state.emails);
        showNotice(
          payload.autoSendProviderEmail
            ? `Logged Ticket ${data.incident.ticketNumber} (${data.incident.campusName} — ${data.incident.linkName}) & Auto-Emailed ${data.incident.providerNocEmail}`
            : `Logged Ticket ${data.incident.ticketNumber} (${data.incident.campusName} — ${data.incident.linkName})`
        );
      }
    } catch (err) {
      console.error('Error creating incident:', err);
    }
  };

  const handleUpdateIncident = async (
    id: string,
    updates: Partial<IncidentTicket> & {
      actor?: string;
      updateNote?: string;
      sendProviderFollowUp?: boolean;
    }
  ) => {
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setCampuses(data.state.campuses);
        setLogs(data.state.logs);
        setIncidents(data.state.incidents);
        setEmails(data.state.emails);
        showNotice(
          updates.status === 'Resolved'
            ? `Resolved ${data.incident.ticketNumber} — ${data.incident.campusName} (${data.incident.linkName}) restored to GREEN!`
            : updates.sendProviderFollowUp
              ? `Updated ${data.incident.ticketNumber} & Dispatched Follow-Up Email to ${data.incident.providerNocEmail}`
              : `Updated Incident ${data.incident.ticketNumber} (${data.incident.status})`
        );
      }
    } catch (err) {
      console.error('Error updating incident:', err);
    }
  };

  const handleSimulateCampusEvent = async (
    campusId: string,
    mode: 'outage' | 'degraded' | 'restore'
  ) => {
    try {
      const res = await fetch(`/api/campuses/${campusId}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        const data = await res.json();
        setCampuses(data.state.campuses);
        setLogs(data.state.logs);
        setIncidents(data.state.incidents);
        setEmails(data.state.emails);
        showNotice(
          mode === 'restore'
            ? `Restored ${data.campus.campusName} — ${data.campus.linkName} to GREEN (Good & Restored).`
            : `Marked ${data.campus.campusName} — ${data.campus.linkName} RED (DOWN). Click "Log Outage" or use 1-Click Autofill to log Telco ticket.`
        );
      }
    } catch (err) {
      console.error('Simulation failed:', err);
    }
  };

  const handleResetAllGreen = async () => {
    try {
      const res = await fetch('/api/campuses/reset-all-green', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setCampuses(data.state.campuses);
        setIncidents(data.state.incidents);
        showNotice(
          'All 35 links across all 13 Cathedral of Praise campuses restored to GREEN (Good & Restored).'
        );
      }
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  const handleRunEscalationCheck = async (): Promise<string[]> => {
    try {
      const res = await fetch('/api/escalations/evaluate', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setCampuses(data.state.campuses);
        setLogs(data.state.logs);
        setIncidents(data.state.incidents);
        setEmails(data.state.emails);
        if (data.actionsTaken?.length > 0) {
          showNotice(
            `Escalation Workflow Executed: ${data.actionsTaken.length} automated provider dispatches triggered.`
          );
        }
        return data.actionsTaken || [];
      }
    } catch (err) {
      console.error('Error evaluating escalations:', err);
    }
    return [];
  };

  const handleSendManualEmail = async (payload: Partial<EmailDispatch>) => {
    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setEmails(data.state.emails);
        setIncidents(data.state.incidents);
        showNotice(`Dispatched email to ${data.email.to}`);
      }
    } catch (err) {
      console.error('Error sending email:', err);
    }
  };

  const handleUpdateCircuit = async (
    id: string,
    updates: Partial<CampusLink>
  ) => {
    try {
      const res = await fetch(`/api/campuses/${id}/circuit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setCampuses(data.state.campuses);
        setLogs(data.state.logs);
        setIncidents(data.state.incidents);
        showNotice(
          `Updated Circuit ID for ${data.campus.campusName} — ${data.campus.linkName} to ${data.campus.circuitId}`
        );
      }
    } catch (err) {
      console.error('Error updating circuit ID:', err);
    }
  };

  const handleProcessM365Email = async (payload: {
    from: string;
    to: string;
    subject: string;
    body: string;
  }) => {
    try {
      const res = await fetch('/api/webhooks/m365-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setCampuses(data.state.campuses);
        setLogs(data.state.logs);
        setIncidents(data.state.incidents);
        setEmails(data.state.emails);
        showNotice(data.actionSummary);
      }
    } catch (err) {
      console.error('Error processing M365 email:', err);
    }
  };

  const formatEtrDisplay = (
    isoString: string,
    incidentStatus: IncidentStatus
  ) => {
    if (!isoString) return { formatted: 'Awaiting Provider ETR', delta: '' };
    const date = new Date(isoString);
    const formatted = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    if (incidentStatus === 'Resolved') {
      return { formatted, delta: 'Restored (Green)' };
    }
    const diffMs = date.getTime() - Date.now();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 0) {
      return {
        formatted,
        delta: `Overdue by ${Math.abs(diffMins)}m`,
      };
    }
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return {
      formatted,
      delta: hrs > 0 ? `In ${hrs}h ${mins}m` : `In ${mins}m`,
    };
  };

  const renderCampusCard = (group: (typeof groupedCampuses)[number]) => {
    const hasOutage = group.downCount > 0;

    // 1. Ultra-Compact Template (NOC Video Wall Matrix)
    if (templateMode === 'ultra-compact') {
      return (
        <div
          key={group.campusName}
          className={`rounded-xl border transition-colors p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs ${
            hasOutage
              ? isDarkMode
                ? 'border-red-600/90 bg-[#1e0a0a]'
                : 'border-red-500 bg-red-50/70'
              : isDarkMode
              ? 'border-emerald-600/40 bg-[#091527] hover:border-emerald-500/60'
              : 'border-emerald-500 bg-white hover:border-emerald-600'
          }`}
        >
          {/* Campus Title & Region */}
          <div className="flex items-center gap-2 min-w-0 sm:w-52 shrink-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                hasOutage ? 'bg-red-500 animate-pulse' : 'bg-emerald-400'
              }`}
            />
            <div className="truncate min-w-0">
              <span className="text-xs font-bold text-white truncate block">
                {group.campusName}
              </span>
              <span className="text-[10px] text-slate-400 font-mono truncate block">
                {group.region}
              </span>
            </div>
            {/* Quick Shift */}
            <div className="flex items-center gap-0.5 ml-auto sm:ml-0 opacity-60 hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => handleShiftCampus(group.campusName, 'up')}
                className="p-0.5 rounded hover:bg-white/10 text-slate-300"
                title="Shift earlier in layout"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => handleShiftCampus(group.campusName, 'down')}
                className="p-0.5 rounded hover:bg-white/10 text-slate-300"
                title="Shift later in layout"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Inline Link Capsules */}
          <div className="flex-1 flex flex-wrap items-center gap-1.5">
            {group.links.map((link) => {
              const activeTicket = incidents.find(
                (i) => i.campusId === link.id && i.status !== 'Resolved'
              );
              const isGood = !activeTicket && link.status === 'Operational';
              const cidShort = maskSensitiveIds
                ? `••${link.circuitId.slice(-3)}`
                : link.circuitId;

              return (
                <div
                  key={link.id}
                  onClick={() => {
                    if (activeTicket) setSelectedIncidentId(activeTicket.id);
                    else handleOpenLoggerForCampus(link.id);
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 cursor-pointer border transition-colors select-none ${
                    isGood
                      ? isDarkMode
                        ? 'bg-slate-900/90 border-slate-700/80 hover:border-cyan-400 text-slate-200'
                        : 'bg-white border-slate-300 hover:border-emerald-500 text-slate-800'
                      : 'bg-red-950 text-red-100 border-red-700 animate-pulse'
                  }`}
                  title={`${link.linkName} (${link.provider}) — Click to toggle outage / log ticket`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isGood ? 'bg-emerald-400' : 'bg-red-500'
                    }`}
                  />
                  <span className="font-sans font-bold truncate max-w-[100px]">
                    {link.linkName.split(' ')[0]}
                  </span>
                  <span className="opacity-70 truncate max-w-[70px]">
                    {cidShort}
                  </span>
                  <span className="text-cyan-400 font-bold">{link.bandwidthMbps}M</span>
                  <span className="opacity-60">{link.latencyMs}ms</span>
                </div>
              );
            })}
          </div>

          {/* Quick Actions & Status */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSelectedManageCampus(group.campusName);
                setTelcoModalMode('edit-telco');
                setIsCampusTelcoModalOpen(true);
              }}
              className="px-2 py-1 rounded text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
              title="Edit telco details or add circuits"
            >
              ⚙️ Telco
            </button>
            <div
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                hasOutage ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {hasOutage ? `${group.downCount} RED` : `GOOD (${group.links.length})`}
            </div>
          </div>
        </div>
      );
    }

    // Zoom-dependent padding and typography
    const padClass =
      cardZoom === 'sm' ? 'px-2 py-1' : cardZoom === 'lg' ? 'px-3.5 py-2.5' : 'px-2.5 py-1.5';
    const textTitleClass =
      cardZoom === 'sm' ? 'text-xs' : cardZoom === 'lg' ? 'text-sm font-extrabold' : 'text-xs sm:text-sm font-bold';

    // 2. Compact, Comfortable & Executive Cards
    return (
      <div
        key={group.campusName}
        className={`rounded-xl border-2 overflow-hidden flex flex-col transition-colors ${
          hasOutage
            ? isDarkMode
              ? 'border-red-600 bg-[#180909]'
              : 'border-red-500 bg-white'
            : isDarkMode
            ? 'border-emerald-600/60 bg-[#0c1427]'
            : 'border-emerald-500 bg-white'
        }`}
      >
        {/* Campus Card Header */}
        <div
          className={`${padClass} flex items-center justify-between border-b ${
            hasOutage
              ? isDarkMode
                ? 'bg-rose-950/90 text-rose-100 border-rose-800/80'
                : 'bg-red-600 text-white border-red-600'
              : isDarkMode
              ? 'bg-emerald-950/90 text-emerald-100 border-emerald-800/80'
              : 'bg-emerald-600 text-white border-emerald-600'
          }`}
        >
          <div className="flex items-baseline gap-2 min-w-0">
            <h3 className={`${textTitleClass} tracking-tight truncate`}>
              {group.campusName}
            </h3>
            <span
              className={`text-[11px] truncate hidden sm:inline ${
                hasOutage
                  ? isDarkMode
                    ? 'text-rose-300'
                    : 'text-red-100'
                  : isDarkMode
                  ? 'text-emerald-300'
                  : 'text-emerald-100'
              }`}
            >
              {group.region}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {/* Quick Shift Up / Down */}
            <div className="flex items-center gap-0.5 opacity-70 hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShiftCampus(group.campusName, 'up');
                }}
                className="p-0.5 rounded hover:bg-black/30 text-white"
                title="Shift campus earlier in layout"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShiftCampus(group.campusName, 'down');
                }}
                className="p-0.5 rounded hover:bg-black/30 text-white"
                title="Shift campus later in layout"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedManageCampus(group.campusName);
                setTelcoModalMode('edit-telco');
                setIsCampusTelcoModalOpen(true);
              }}
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/25 hover:bg-black/40 text-white flex items-center gap-1 transition-colors"
              title={`Edit telco details or add circuits to ${group.campusName}`}
            >
              <Settings className="w-3 h-3 text-cyan-300" />
              <span>Telco</span>
            </button>
            <div className="text-right font-mono text-[11px] font-bold">
              {hasOutage
                ? `${group.downCount} RED`
                : `GOOD (${group.links.length})`}
            </div>
          </div>
        </div>

        {/* Links inside this Campus */}
        <div className={`divide-y flex-1 ${isDarkMode ? 'divide-slate-800/80' : 'divide-slate-200'}`}>
          {group.links.map((link) => {
            const activeTicket = incidents.find(
              (i) => i.campusId === link.id && i.status !== 'Resolved'
            );
            const lastResolvedTicket = incidents.find(
              (i) => i.campusId === link.id && i.status === 'Resolved'
            );
            const isGood = !activeTicket && link.status === 'Operational';

            const hasPldtAcct =
              link.accountNumber &&
              link.accountNumber !== 'N/A (Circuit ID)' &&
              link.accountNumber !== 'Starlink';

            const maskValue = (val: string) => {
              if (!maskSensitiveIds) return val;
              const clean = val.trim();
              if (clean.length <= 4) return '••••';
              return `••••${clean.slice(-4)}`;
            };

            const idLabel = hasPldtAcct
              ? `Acct #${maskValue(link.accountNumber)}`
              : link.accountNumber === 'Starlink'
                ? `Starlink`
                : `CID: ${maskValue(link.circuitId)}`;

            return (
              <div
                key={link.id}
                onClick={() => {
                  if (activeTicket) {
                    setSelectedIncidentId(activeTicket.id);
                  } else {
                    handleOpenLoggerForCampus(link.id);
                  }
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (activeTicket) setSelectedIncidentId(activeTicket.id);
                    else handleOpenLoggerForCampus(link.id);
                  }
                }}
                className={`${padClass} transition-colors cursor-pointer text-left flex flex-col justify-center ${
                  isGood
                    ? isDarkMode
                      ? 'bg-[#0c1427] hover:bg-[#121f3a] text-slate-100'
                      : 'bg-emerald-50/80 hover:bg-emerald-100/80'
                    : isDarkMode
                    ? 'bg-[#220a0a] hover:bg-[#2d0e0e] text-rose-100'
                    : 'bg-red-50 hover:bg-red-100/90'
                }`}
                title={
                  activeTicket
                    ? `Click to view outage problem, Ticket #${activeTicket.ticketNumber}, and update status`
                    : `Click to record an outage & ticket number for ${group.campusName} — ${link.linkName}`
                }
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isGood
                          ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                          : 'bg-red-500 animate-pulse shadow-sm shadow-red-500/50'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1.5 min-w-0 flex-wrap">
                        <span
                          className={`text-xs font-bold truncate ${
                            isGood
                              ? isDarkMode
                                ? 'text-slate-100'
                                : 'text-emerald-950'
                              : isDarkMode
                              ? 'text-rose-100'
                              : 'text-red-950'
                          }`}
                        >
                          {link.linkName}
                        </span>
                        <span
                          className={`text-[11px] font-mono truncate ${
                            isGood
                              ? isDarkMode
                                ? 'text-cyan-400 font-medium'
                                : 'text-slate-600'
                              : isDarkMode
                              ? 'text-amber-300 font-semibold'
                              : 'text-red-700'
                          }`}
                        >
                          {idLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isGood ? (
                      <>
                        {lastResolvedTicket && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedIncidentId(lastResolvedTicket.id);
                            }}
                            className="px-1.5 py-0.5 text-[10px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 rounded hover:bg-emerald-900 transition-colors"
                            title="View resolved ticket details"
                          >
                            #{lastResolvedTicket.ticketNumber.split('-').pop()}
                          </button>
                        )}
                        <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-600 text-white">
                          GOOD
                        </span>
                      </>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-red-600 text-white animate-pulse">
                        RED
                      </span>
                    )}
                  </div>
                </div>

                {/* TEMPLATE: COMFORTABLE (Detailed Telemetry View) */}
                {templateMode === 'comfortable' && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px] font-mono text-slate-300">
                    <div>
                      <span className="text-slate-500">Opt Rx:</span>{' '}
                      <span className={link.opticalRxDbm > -20 ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                        {link.opticalRxDbm} dBm
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Latency:</span>{' '}
                      <span className={link.latencyMs < 25 ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                        {link.latencyMs} ms
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Loss:</span>{' '}
                      <span className={link.packetLossPct === 0 ? 'text-emerald-400' : 'text-red-400 font-bold'}>
                        {link.packetLossPct}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">BW:</span>{' '}
                      <span className="text-cyan-300 font-semibold">{link.bandwidthMbps} Mbps</span>
                    </div>
                    <div className="col-span-2 truncate">
                      <span className="text-slate-500">Interface:</span>{' '}
                      <span className="text-slate-300">{link.interfaceName}</span>
                    </div>
                    <div className="col-span-2 truncate">
                      <span className="text-slate-500">BGP IP:</span>{' '}
                      <span className="text-slate-300">{link.bgpPeerIp}</span>
                    </div>
                  </div>
                )}

                {/* TEMPLATE: EXECUTIVE (SLA Analytics View) */}
                {templateMode === 'executive' && (
                  <div className="mt-2 pt-2 border-t border-slate-800/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">30d SLA:</span>
                        <span className="font-bold text-emerald-400">{link.uptime30dPct}%</span>
                        <span className="text-slate-500 text-[9px]">(Target: {link.slaTargetPct}%)</span>
                      </div>
                      <div className="text-slate-400 text-[10px]">
                        Hotline: <strong className="text-slate-200">{link.providerHotline}</strong>
                      </div>
                    </div>
                    {/* Mini Sparkline Visualization */}
                    <div className="flex items-center gap-0.5 h-2 w-full bg-slate-950/80 rounded overflow-hidden p-0.5">
                      {link.dailyUptimeHistory.slice(-14).map((d, dIdx) => (
                        <div
                          key={dIdx}
                          className={`h-full flex-1 rounded-xs ${
                            d.uptimePct >= 99.9 ? 'bg-emerald-500' : d.uptimePct > 95 ? 'bg-amber-400' : 'bg-red-500'
                          }`}
                          title={`${d.date}: ${d.uptimePct}% uptime (${d.downtimeMinutes}m down)`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Outage Summary Banner (Shown on All Templates if Outage) */}
                {activeTicket && (
                  <div
                    className={`mt-1.5 pt-1.5 border-t flex items-center justify-between gap-1 text-[11px] ${
                      isDarkMode
                        ? 'border-rose-800/60 text-rose-200'
                        : 'border-red-200 text-red-950'
                    }`}
                  >
                    <div className="truncate font-medium">
                      <span
                        className={`font-mono font-bold ${
                          isDarkMode ? 'text-amber-300' : 'text-red-900'
                        }`}
                      >
                        {activeTicket.ticketNumber}
                      </span>{' '}
                      <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>
                        ({activeTicket.telcoTicketNumber}):
                      </span>{' '}
                      <span className={isDarkMode ? 'text-rose-100' : 'text-red-900'}>
                        {activeTicket.problemSummary}
                      </span>
                    </div>
                    <span
                      className={`font-bold underline shrink-0 ${
                        isDarkMode
                          ? 'text-cyan-400 hover:text-cyan-300'
                          : 'text-red-700'
                      }`}
                    >
                      Update →
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWallboardGrid = () => {
    if (groupedCampuses.length === 0) {
      return (
        <div className="p-12 text-center border border-slate-800 rounded-xl bg-slate-900/50 space-y-2">
          <div className="text-sm font-semibold text-slate-300">No campuses matching filter</div>
          <p className="text-xs text-slate-500">Try changing status filter or search keyword.</p>
        </div>
      );
    }

    if (templateMode === 'ultra-compact') {
      const colClass =
        gridColumns === '2'
          ? 'grid grid-cols-1 lg:grid-cols-2 gap-2'
          : gridColumns === '3'
          ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2'
          : gridColumns === '4'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2'
          : gridColumns === '5'
          ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-1.5'
          : 'grid grid-cols-1 xl:grid-cols-2 gap-1.5';

      return <div className={colClass}>{groupedCampuses.map((g) => renderCampusCard(g))}</div>;
    }

    if (gridColumns === '2') {
      return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{groupedCampuses.map((g) => renderCampusCard(g))}</div>;
    }
    if (gridColumns === '3') {
      return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">{groupedCampuses.map((g) => renderCampusCard(g))}</div>;
    }
    if (gridColumns === '4') {
      return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">{groupedCampuses.map((g) => renderCampusCard(g))}</div>;
    }
    if (gridColumns === '5') {
      return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">{groupedCampuses.map((g) => renderCampusCard(g))}</div>;
    }

    // Auto default split
    const layer1To3 =
      campusSearch.trim() === '' && campusStatusFilter === 'ALL'
        ? groupedCampuses.slice(0, 9)
        : groupedCampuses;
    const layer4 =
      campusSearch.trim() === '' && campusStatusFilter === 'ALL'
        ? groupedCampuses.slice(9)
        : [];

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {layer1To3.map((group) => renderCampusCard(group))}
        </div>
        {layer4.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {layer4.map((group) => renderCampusCard(group))}
          </div>
        )}
      </div>
    );
  };

  const pendingUsersCount = users.filter((u) => u.status === 'PENDING').length;

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        isDarkMode ? 'dark-noc bg-[#060b17] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Compact Top Bar: 1 row, 3 zones */}
      <header
        className={`sticky top-0 z-30 border-b px-4 py-2 flex items-center justify-between gap-3 transition-colors ${
          isDarkMode
            ? 'bg-[#0a1122]/95 border-slate-800 text-slate-100 backdrop-blur-md'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Zone 1: Cathedral of Praise Official Logo & Brand Lockup */}
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('overview');
          }}
          className="flex items-center shrink-0 hover:opacity-95 transition-opacity"
          title="Cathedral of Praise Manila — Network Operations Center"
        >
          <CopLogo variant="full" height={36} showSubtitle={true} />
        </a>

        {/* Zone 2: Navigation Links */}
        <nav
          className="hidden lg:flex items-center gap-5 text-xs font-medium text-slate-400"
          aria-label="Primary Navigation"
        >
          {[
            { id: 'overview', label: 'Campus Wallboard' },
            { id: 'incidents', label: 'Incident Tracker' },
            { id: 'logs', label: 'Log Autofill' },
            { id: 'uptime', label: 'Uptime SLA' },
            { id: 'escalations', label: 'Escalations & Email' },
          ].map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as ActiveTab)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  isActive
                    ? 'text-cyan-400 font-semibold border-cyan-400'
                    : 'text-slate-400 hover:text-slate-200 border-transparent hover:border-slate-600'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Security, Admin Controls, User Status & Theme Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Admin User Management Button */}
          {currentUser?.role === 'ADMIN' && (
            <button
              type="button"
              onClick={() => setIsAdminModalOpen(true)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-950/80 border border-indigo-500/50 text-indigo-300 hover:bg-indigo-900/60 flex items-center gap-1.5 transition-colors shadow-sm"
              title="Manage users, approve registrations, and suspend accounts"
            >
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">User Approvals</span>
              {pendingUsersCount > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 animate-pulse">
                  {pendingUsersCount}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-indigo-400 opacity-80">
                  ({users.length})
                </span>
              )}
            </button>
          )}

          {/* Current User Pill & Dropdown Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 flex items-center gap-1.5 transition-colors"
              title="Click to view account options, change password, or sign in/out"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  currentUser ? 'bg-emerald-400' : 'bg-slate-500'
                }`}
              />
              <span className="font-semibold max-w-[110px] truncate hidden md:inline">
                {currentUser?.name.split(' ')[0] || 'Sign In'}
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                  currentUser?.role === 'ADMIN'
                    ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40'
                    : currentUser?.role === 'OPERATOR'
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {currentUser?.role || 'GUEST'}
              </span>
            </button>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div
                className="absolute right-0 mt-1.5 w-56 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1.5 text-xs z-50 space-y-1"
                onMouseLeave={() => setIsUserMenuOpen(false)}
              >
                <div className="px-3 py-2 border-b border-slate-800 text-slate-400">
                  <div className="font-bold text-white truncate">
                    {currentUser?.name || 'Guest Operator'}
                  </div>
                  <div className="text-[10px] font-mono truncate text-cyan-400">
                    {currentUser?.email || 'Read-Only Mode'}
                  </div>
                </div>

                {currentUser ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setAuthModalMode('CHANGE_PASSWORD');
                        setIsAuthModalOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                      Change Password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left text-rose-300 hover:bg-rose-950/60 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      Sign Out (Go to Login Page)
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setAuthModalMode('LOGIN');
                      setShowFullLoginPage(true);
                    }}
                    className="w-full px-3 py-2 rounded-lg text-left text-cyan-300 hover:bg-slate-800 flex items-center gap-2 font-bold"
                  >
                    <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                    Open Login Page
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Add Campus Branch & Manage Telcos Button */}
          <button
            type="button"
            onClick={() => {
              setTelcoModalMode('add-branch');
              setSelectedManageCampus('');
              setIsCampusTelcoModalOpen(true);
            }}
            className="px-2.5 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-500/50 rounded-lg hover:bg-emerald-900/60 transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm"
            title="Add a new Cathedral of Praise campus branch or configure telco circuits"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Add Campus / Telco</span>
          </button>

          {/* Export Report Center Button */}
          <button
            type="button"
            onClick={() => setIsExportReportOpen(true)}
            className="px-2.5 py-1.5 text-xs font-semibold text-cyan-300 bg-cyan-950/80 border border-cyan-500/50 rounded-lg hover:bg-cyan-900/60 transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm"
            title="Generate official executive PDF SLA report or export CSV data sheets"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Export Report</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-300" />
            )}
          </button>

          {/* Mask IDs Toggle */}
          <button
            type="button"
            onClick={() => {
              if (maskSensitiveIds && !isNocUnlocked) {
                setIsSecurityModalOpen(true);
              } else {
                setMaskSensitiveIds(!maskSensitiveIds);
              }
            }}
            className={`px-2 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              maskSensitiveIds
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/60'
                : 'bg-amber-950/60 text-amber-300 border-amber-700/60 hover:bg-amber-900/60'
            }`}
            title="Mask or reveal confidential PLDT Account Numbers and Circuit IDs"
          >
            {maskSensitiveIds ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Masked</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Visible</span>
              </>
            )}
          </button>

          {/* Restore all green if any down */}
          {kpiStats.downCount > 0 && (
            <button
              type="button"
              onClick={handleResetAllGreen}
              className="hidden sm:inline-flex px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors items-center gap-1 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore All Green ({kpiStats.downCount})
            </button>
          )}

          {/* M365 Email Sync */}
          <button
            type="button"
            onClick={() => setIsM365ModalOpen(true)}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">M365 Sync</span>
          </button>

          {/* Record Outage Button */}
          <button
            type="button"
            onClick={() => {
              if (currentUser?.role === 'VIEWER') {
                showNotice('Read-only viewers cannot record outages. Please contact an Admin.');
                return;
              }
              handleOpenLoggerForCampus();
            }}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm shadow-indigo-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Record Outage</span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Strip */}
      <div className="md:hidden flex items-center gap-2 overflow-x-auto px-4 py-1.5 bg-white border-b border-slate-200">
        {[
          { id: 'overview', label: 'Campus Wallboard' },
          { id: 'incidents', label: 'Incident Tracker' },
          { id: 'logs', label: 'Log Autofill' },
          { id: 'uptime', label: 'Uptime SLA' },
          { id: 'escalations', label: 'Escalations' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id as ActiveTab)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
              activeTab === item.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Live Action Confirmation Toast Bar */}
      {actionBanner && (
        <div className="bg-slate-900 text-white px-5 py-1.5 text-xs flex items-center justify-between gap-4">
          <div className="font-mono truncate">{actionBanner}</div>
          <button
            type="button"
            onClick={() => setActionBanner(null)}
            className="text-slate-300 hover:text-white underline whitespace-nowrap"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Container — Compact padding so all 17 campuses fit on 1 desktop screen */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 py-2 space-y-2">
        {/* Unified Single-Row Status, KPI & Filter Toolbar */}
        <div
          className={`rounded-lg px-3.5 py-1.5 flex flex-col xl:flex-row xl:items-center justify-between gap-2 border ${
            kpiStats.downCount === 0
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-red-600 text-white border-red-700'
          }`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              {kpiStats.downCount === 0 ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="text-xs font-bold tracking-wide">
                {kpiStats.downCount === 0
                  ? `ALL 17 CAMPUSES & ${campuses.length} LINKS GREEN (GOOD)`
                  : `ALERT: ${kpiStats.downCount} LINK(S) CURRENTLY RED (OUTAGE)`}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-mono bg-black/15 px-2.5 py-1 rounded">
              <span>
                <strong>{kpiStats.goodCount}</strong> Green
              </span>
              <span>·</span>
              <span>
                <strong>{kpiStats.downCount}</strong> Red
              </span>
              <span>·</span>
              <button
                type="button"
                onClick={() => setActiveTab('incidents')}
                className="underline hover:text-white/90"
              >
                <strong>{kpiStats.openCount}</strong> Open Tickets
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setActiveTab('uptime')}
                className="underline hover:text-white/90"
              >
                <strong>{kpiStats.avgUptime30d}%</strong> Uptime
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setActiveTab('escalations')}
                className="underline hover:text-white/90"
              >
                <strong>{emails.length}</strong> Emails
              </button>
            </div>
          </div>

          {activeTab === 'overview' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={campusSearch}
                  onChange={(e) => setCampusSearch(e.target.value)}
                  placeholder="Search campus, Circuit ID, Account #..."
                  className={`pl-7 pr-2.5 py-1 text-xs rounded focus:outline-none w-56 font-mono ${
                    isDarkMode
                      ? 'bg-[#080e1c] text-slate-100 border border-slate-700 placeholder-slate-400'
                      : 'bg-white text-slate-900 border border-slate-300'
                  }`}
                />
              </div>

              <div className="flex items-center gap-1 p-0.5 bg-black/15 rounded">
                {[
                  { id: 'ALL', label: 'All 17' },
                  { id: 'GOOD_GREEN', label: 'Green' },
                  { id: 'DOWN_RED', label: 'Red' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() =>
                      setCampusStatusFilter(
                        f.id as 'ALL' | 'GOOD_GREEN' | 'DOWN_RED'
                      )
                    }
                    className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                      campusStatusFilter === f.id
                        ? 'bg-white text-slate-900'
                        : 'text-white/90 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isNocUnlocked) {
                    setIsSecurityModalOpen(true);
                  } else {
                    setIsCircuitDirectoryOpen(true);
                  }
                }}
                className="px-2.5 py-1 text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/30 rounded transition-colors whitespace-nowrap"
              >
                Circuit IDs ({campuses.length})
              </button>

              {/* Template Density Switcher (4 Options: Matrix, Compact, Detailed, Exec) */}
              <div className="flex items-center gap-0.5 p-0.5 bg-black/25 rounded-lg border border-white/10 shadow-xs">
                {(
                  [
                    { id: 'ultra-compact', label: 'Matrix', icon: '⚡' },
                    { id: 'compact', label: 'Compact', icon: '📊' },
                    { id: 'comfortable', label: 'Detailed', icon: '📡' },
                    { id: 'executive', label: 'Exec', icon: '📈' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelectTemplateMode(t.id)}
                    className={`px-2 py-0.5 text-xs font-semibold rounded transition-all flex items-center gap-1 whitespace-nowrap ${
                      templateMode === t.id
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                    title={`Switch template layout to ${t.label}`}
                  >
                    <span>{t.icon}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Layout, Resizing & Arranging Button */}
              <button
                type="button"
                onClick={() => setIsArrangerModalOpen(true)}
                className="px-2.5 py-1 text-xs font-semibold bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/50 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
                title="Arrange campus sequence, change template modes, or resize card grid"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">Arrange &amp; Resize</span>
              </button>
            </div>
          )}
        </div>

        {/* TAB 1: OVERVIEW — SINGLE-SCREEN WALLBOARD WITH DYNAMIC 4-MODE TEMPLATE & GRID */}
        {activeTab === 'overview' && renderWallboardGrid()}

        {/* TAB 2: DEDICATED INCIDENT TRACKER VIEW */}
        {activeTab === 'incidents' && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Cathedral of Praise — Incident & Telco Provider Resolution Console
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Manage manual and log-autofilled tickets across all 13 campuses, record Telco reference numbers, and restore links to Green once resolved.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={incidentSearch}
                    onChange={(e) => setIncidentSearch(e.target.value)}
                    placeholder="Search ticket #, campus, link..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                  {(
                    [
                      { id: 'ALL', label: 'All' },
                      { id: 'REPORTED', label: 'Reported to Telco' },
                      { id: 'UNREPORTED', label: 'Not Yet Reported' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setReportedFilter(f.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                        reportedFilter === f.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenLoggerForCampus()}
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Incident (Log Autofill / Manual)
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
              {filteredIncidents.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="text-sm font-semibold text-slate-900">
                    No matching incident tickets found
                  </div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    All links default to Green (Good & Restored). Log a new connectivity issue manually or autofill technical details from the router syslog stream.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleOpenLoggerForCampus()}
                    className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                  >
                    + Log Incident Ticket
                  </button>
                </div>
              ) : (
                filteredIncidents.map((inc) => {
                  const etr = formatEtrDisplay(
                    inc.expectedResolutionAt,
                    inc.status
                  );
                  return (
                    <div
                      key={inc.id}
                      className="p-6 hover:bg-slate-50/70 transition-colors flex flex-col lg:flex-row lg:items-start justify-between gap-6"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-white ${
                              inc.status === 'Resolved'
                                ? 'bg-emerald-600'
                                : 'bg-red-600'
                            }`}
                          >
                            {inc.status === 'Resolved'
                              ? 'GREEN (RESTORED)'
                              : 'RED (DOWN)'}
                          </span>
                          <span className="font-bold text-slate-900">
                            {inc.ticketNumber}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-700">
                            Telco Ref: <strong>{inc.telcoTicketNumber}</strong>
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="font-sans font-semibold text-slate-900">
                            {inc.campusName} — {inc.linkName}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-600">
                            {inc.circuitId} ({inc.provider})
                          </span>
                        </div>

                        <h3 className="text-sm font-semibold text-slate-900">
                          {inc.problemSummary}
                        </h3>

                        <p className="text-xs text-slate-600">
                          <strong className="text-slate-800">
                            Provider ETR & Repair Notes:
                          </strong>{' '}
                          {inc.etrNotes}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                          <span>
                            Reported to Telco:{' '}
                            <strong
                              className={
                                inc.reportedToTelco
                                  ? 'text-emerald-700'
                                  : 'text-red-700'
                              }
                            >
                              {inc.reportedToTelco
                                ? 'Yes — Reported'
                                : 'No — Pending Telco Dispatch'}
                            </strong>
                          </span>
                          <span>·</span>
                          <span className="font-mono tabular-nums">
                            Expected Resolution: <strong>{etr.formatted}</strong>{' '}
                            ({etr.delta})
                          </span>
                          <span>·</span>
                          <span>{inc.escalationLevel}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap lg:flex-col items-end gap-2 shrink-0">
                        <select
                          value={inc.status}
                          onChange={(e) =>
                            handleUpdateIncident(inc.id, {
                              status: e.target.value as IncidentStatus,
                            })
                          }
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md border ${
                            inc.status === 'Resolved'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-red-50 text-red-800 border-red-300'
                          }`}
                        >
                          <option value="Pending">
                            Status: Pending (Red / Down)
                          </option>
                          <option value="Waiting for Telco Repair">
                            Status: Waiting for Telco Repair (Red / Down)
                          </option>
                          <option value="Resolved">
                            Status: Resolved (Green / Restored)
                          </option>
                        </select>

                        <div className="flex items-center gap-2">
                          {!inc.reportedToTelco && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateIncident(inc.id, {
                                  reportedToTelco: true,
                                  status: 'Waiting for Telco Repair',
                                  sendProviderFollowUp: true,
                                })
                              }
                              className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 whitespace-nowrap"
                            >
                              Auto-Email Telco
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedIncidentId(inc.id)}
                            className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-100 whitespace-nowrap"
                          >
                            Edit Telco Ref & ETR
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LOG AUTOFILL STREAM & SANDBOX */}
        {activeTab === 'logs' && (
          <NetworkLogWorkbench
            logs={logs}
            campuses={campuses}
            incidents={incidents}
            onCreateIncidentFromLog={handleOpenLoggerWithLog}
            onSimulateCampusEvent={handleSimulateCampusEvent}
          />
        )}

        {/* TAB 4: HISTORICAL UPTIME ANALYTICS & SLA */}
        {activeTab === 'uptime' && (
          <UptimeAnalyticsSection campuses={campuses} incidents={incidents} />
        )}

        {/* TAB 5: AUTOMATED ESCALATIONS & EMAIL OUTBOX */}
        {activeTab === 'escalations' && (
          <EscalationEmailCenter
            policies={escalationPolicies}
            emails={emails}
            incidents={incidents}
            onRunEscalationCheck={handleRunEscalationCheck}
            onSendManualEmail={handleSendManualEmail}
          />
        )}
      </main>

      {/* Quiet Compact Footer */}
      <footer
        className={`mt-auto border-t px-4 py-2 transition-colors ${
          isDarkMode
            ? 'border-slate-800 bg-[#080e1c] text-slate-300'
            : 'border-slate-200 bg-white text-slate-600'
        }`}
      >
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <div>
            Cathedral of Praise Campus Network Monitoring — 17 Campuses · {campuses.length} Monitored Links (Green = Good/Restored · Red = Recorded Outage)
          </div>
          <div className="flex items-center gap-4 text-cyan-400">
            <button
              type="button"
              onClick={() => setIsCircuitDirectoryOpen(true)}
              className="hover:text-cyan-300 underline"
            >
              Circuit &amp; Account Directory ({campuses.length})
            </button>
            <span className="text-slate-600">·</span>
            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className="hover:text-cyan-300 underline"
            >
              Syslog Autofill Engine
            </button>
            <span className="text-slate-600">·</span>
            <button
              type="button"
              onClick={() => setActiveTab('escalations')}
              className="hover:text-cyan-300 underline"
            >
              Telco Provider Outbox
            </button>
          </div>
        </div>
      </footer>

      {/* Hybrid Log-Autofill + Manual Telco Tracking Modal */}
      <IncidentLoggerModal
        isOpen={isLoggerOpen}
        onClose={() => setIsLoggerOpen(false)}
        campuses={campuses}
        logs={logs}
        initialLog={loggerInitialLog}
        initialCampusId={loggerInitialCampusId}
        nextSequenceNumber={102 + incidents.length}
        onSubmitIncident={handleSubmitIncident}
      />

      {/* Slide-Over Incident Detail & Telco ETR Editor Drawer */}
      <IncidentDetailDrawer
        incident={selectedIncident}
        onClose={() => setSelectedIncidentId(null)}
        onUpdateIncident={handleUpdateIncident}
      />

      {/* Internet & Transport Circuit ID Directory Modal */}
      <CircuitDirectoryModal
        isOpen={isCircuitDirectoryOpen}
        onClose={() => setIsCircuitDirectoryOpen(false)}
        campuses={campuses}
        onUpdateCircuit={handleUpdateCircuit}
      />

      {/* Microsoft 365 (Outlook) Automatic Email-to-Wallboard Sync Modal */}
      <M365EmailSyncModal
        isOpen={isM365ModalOpen}
        onClose={() => setIsM365ModalOpen(false)}
        campuses={campuses}
        onProcessM365Email={handleProcessM365Email}
      />

      {/* NOC Security & Credential Masking Modal */}
      <NocSecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        isUnlocked={isNocUnlocked}
        activeOperatorEmail={activeOperatorEmail}
        maskSensitiveIds={maskSensitiveIds}
        onToggleMaskSensitiveIds={(val) => {
          if (!val && !isNocUnlocked) {
            return;
          }
          setMaskSensitiveIds(val);
        }}
        onUnlockSuccess={(email) => {
          setIsNocUnlocked(true);
          setActiveOperatorEmail(email);
          setMaskSensitiveIds(false);
          showNotice(
            `NOC Engineer Mode Unlocked (${email}) — Full Circuit IDs & Account Numbers visible.`
          );
        }}
        onLockDashboard={() => {
          setIsNocUnlocked(false);
          setMaskSensitiveIds(true);
          showNotice(
            'Dashboard Locked — Sensitive Account Numbers & Circuit IDs are now masked.'
          );
        }}
        onOpenUserManagement={() => setIsAdminModalOpen(true)}
      />

      {/* Admin User Management & Access Approvals Modal */}
      <AdminUserManagementModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        currentUser={currentUser}
        users={users}
        onRefreshUsers={fetchUsers}
        onApproveUser={handleApproveUser}
        onSuspendUser={handleSuspendUser}
        onReactivateUser={handleReactivateUser}
        onChangeRole={handleChangeRole}
        onResetPassword={handleResetPassword}
        onDeleteUser={handleDeleteUser}
        onCreateUser={handleCreateUser}
      />

      {/* Campus & Telco Network Configuration Modal */}
      <CampusTelcoManageModal
        isOpen={isCampusTelcoModalOpen}
        onClose={() => setIsCampusTelcoModalOpen(false)}
        mode={telcoModalMode}
        campusName={selectedManageCampus}
        allLinks={campuses}
        onRefreshState={fetchNocState}
      />

      {/* Wallboard Layout, Template Modes & Campus Card Arranger Modal */}
      <CampusArrangerModal
        isOpen={isArrangerModalOpen}
        onClose={() => setIsArrangerModalOpen(false)}
        campusOrder={customCampusOrder}
        onUpdateOrder={handleUpdateCampusOrder}
        onResetOrder={handleResetCampusOrder}
        templateMode={templateMode}
        onSelectTemplateMode={handleSelectTemplateMode}
        gridColumns={gridColumns}
        onSelectGridColumns={handleSelectGridColumns}
        cardZoom={cardZoom}
        onSelectCardZoom={handleSelectCardZoom}
        campusesWithStats={groupedCampuses.map((g) => ({
          campusName: g.campusName,
          region: g.region,
          linkCount: g.links.length,
          hasOutage: g.downCount > 0,
        }))}
      />

      {/* Official Executive SLA & Outage Report Export Modal */}
      <ReportExportModal
        isOpen={isExportReportOpen}
        onClose={() => setIsExportReportOpen(false)}
        campuses={campuses}
        incidents={incidents}
        dutyOperatorName={currentUser?.name || 'Jeffrey Nadado'}
      />

      {/* NOC Authentication, Login, Register, Forgot Password & Change Password Gateway */}
      <NocAuthModal
        isOpen={isAuthModalOpen || shouldShowLoginPage}
        onClose={() => {
          setIsAuthModalOpen(false);
          setShowFullLoginPage(false);
        }}
        currentUser={currentUser}
        initialMode={authModalMode}
        isFullScreen={shouldShowLoginPage}
        onLoginSuccess={(user) => {
          handleLoginSuccess(user);
        }}
        onLogout={handleLogout}
        onBypassAsGuest={() => {
          setIsGuestMode(true);
          try {
            localStorage.setItem('cop_noc_guest', 'true');
          } catch {}
          setShowFullLoginPage(false);
          setIsAuthModalOpen(false);
          showNotice('Continuing in Guest Mode (Read-Only Wallboard View).');
        }}
      />
    </div>
  );
}
