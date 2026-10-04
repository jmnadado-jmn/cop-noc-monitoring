import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  COP_CAMPUS_ORDER,
  INITIAL_CAMPUS_LINKS,
  INITIAL_EMAIL_DISPATCHES,
  INITIAL_ESCALATION_POLICIES,
  INITIAL_INCIDENTS,
  INITIAL_NETWORK_LOGS,
  INITIAL_USERS,
} from './src/data/initialNocData.ts';
import type {
  CampusLink,
  EmailDispatch,
  EscalationPolicy,
  IncidentTicket,
  NetworkLogEvent,
  NocUser,
} from './src/types/noc.ts';
import {
  buildInternalNotificationEmail,
  buildProviderDispatchEmail,
  parseM365Email,
  parseNetworkLogForIncident,
} from './src/utils/logParser.ts';

interface NocStore {
  storeVersion: string;
  campuses: CampusLink[];
  logs: NetworkLogEvent[];
  incidents: IncidentTicket[];
  emails: EmailDispatch[];
  escalationPolicies: EscalationPolicy[];
  users: NocUser[];
}

const CURRENT_STORE_VERSION = 'cop-v9';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'cop-noc-store-v9.json');

function syncCampusStatusesWithIncidents(store: NocStore): void {
  const nowIso = new Date().toISOString();
  for (const campus of store.campuses) {
    const hasActiveOutage = store.incidents.some(
      (inc) => inc.campusId === campus.id && inc.status !== 'Resolved'
    );
    if (hasActiveOutage) {
      campus.status = 'Outage';
      campus.packetLossPct = 100;
      campus.latencyMs = 0;
      campus.opticalRxDbm = -38.8;
    } else {
      if (campus.status !== 'Operational') {
        campus.lastRestoredAt = nowIso;
      }
      campus.status = 'Operational';
      campus.packetLossPct = 0;
      if (campus.latencyMs === 0) campus.latencyMs = 8.4;
      if (campus.opticalRxDbm < -25) campus.opticalRxDbm = -10.4;
    }
  }
}

function loadStore(): NocStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as NocStore;
      if (
        parsed.storeVersion === CURRENT_STORE_VERSION &&
        Array.isArray(parsed.campuses) &&
        parsed.campuses.length === INITIAL_CAMPUS_LINKS.length &&
        Array.isArray(parsed.users)
      ) {
        parsed.campuses.sort((a, b) => {
          const idxA = COP_CAMPUS_ORDER.indexOf(a.campusName);
          const idxB = COP_CAMPUS_ORDER.indexOf(b.campusName);
          return idxA - idxB;
        });
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read store file, initializing defaults:', err);
  }

  const initial: NocStore = {
    storeVersion: CURRENT_STORE_VERSION,
    campuses: JSON.parse(JSON.stringify(INITIAL_CAMPUS_LINKS)),
    logs: JSON.parse(JSON.stringify(INITIAL_NETWORK_LOGS)),
    incidents: JSON.parse(JSON.stringify(INITIAL_INCIDENTS)),
    emails: JSON.parse(JSON.stringify(INITIAL_EMAIL_DISPATCHES)),
    escalationPolicies: JSON.parse(JSON.stringify(INITIAL_ESCALATION_POLICIES)),
    users: JSON.parse(JSON.stringify(INITIAL_USERS)),
  };
  saveStore(initial);
  return initial;
}

function saveStore(store: NocStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save store file:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.urlencoded({ extended: true }));
  app.use(
    express.json({
      limit: '5mb',
      verify: (req: express.Request & { rawBody?: string }, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
    })
  );
  // Forgiving fallback if Power Automate sends unescaped newlines inside JSON strings
  app.use(
    (
      err: Error & { type?: string; body?: string },
      req: express.Request & { rawBody?: string },
      _res: express.Response,
      next: express.NextFunction
    ) => {
      if (err && (err instanceof SyntaxError || err.type === 'entity.parse.failed')) {
        const raw = err.body || req.rawBody || '';
        try {
          const sanitized = raw.replace(/[\r\n\t]+/g, ' ');
          req.body = JSON.parse(sanitized);
          next();
          return;
        } catch {
          const extractField = (key: string) => {
            const m = raw.match(
              new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*,\\s*"|\\s*\\})`, 'i')
            );
            return m ? m[1] : '';
          };
          req.body = {
            from: extractField('from') || 'jmnadado@cathedralofpraise.com.ph',
            to: extractField('to') || extractField('toRecipients'),
            subject: extractField('subject'),
            body: extractField('body') || extractField('bodyPreview') || raw,
          };
          next();
          return;
        }
      }
      next(err);
    }
  );

  let store = loadStore();

  // GET /api/state
  app.get('/api/state', (_req, res) => {
    res.json(store);
  });

  // GET /api/users - Return all registered users
  app.get('/api/users', (_req, res) => {
    const sanitized = store.users.map((u) => {
      const { password, ...rest } = u;
      return { ...rest, hasPassword: Boolean(password) };
    });
    res.json(sanitized);
  });

  // POST /api/auth/login - Email + Password Authentication
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = store.users.find(
      (u) =>
        u.email.toLowerCase() === normalizedEmail ||
        (u.id === 'user-admin-1' &&
          (normalizedEmail === 'cop.jmnadado@gmail.com' ||
            normalizedEmail === 'jmnadado@cathedralofpraise.com.ph'))
    );

    if (!user) {
      res.status(401).json({
        error: 'No user account found matching this email address.',
      });
      return;
    }

    if (user.password && user.password !== password.trim()) {
      res.status(401).json({
        error: 'Invalid password. Please check your credentials.',
      });
      return;
    }

    if (user.status === 'SUSPENDED') {
      res.status(403).json({
        error: `Account Suspended: ${
          user.suspendedReason ||
          'Access has been revoked by a Cathedral of Praise NOC Administrator.'
        }`,
        suspended: true,
      });
      return;
    }

    if (user.status === 'PENDING') {
      res.status(403).json({
        error:
          'Account Pending Approval: Your registration is awaiting review by a Cathedral of Praise NOC Administrator.',
        pending: true,
      });
      return;
    }

    const nowIso = new Date().toISOString();
    user.lastLoginAt = nowIso;
    saveStore(store);

    const { password: _, ...userSafe } = user;
    res.json({
      user: userSafe,
      token: `token-${user.id}-${Date.now()}`,
      message: `Signed in successfully as ${user.name} (${user.role})`,
    });
  });

  // POST /api/auth/register - User Sign-up (Creates PENDING user requiring Admin Approval)
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, department, phone, requestedRole } =
      req.body as {
        name?: string;
        email?: string;
        password?: string;
        department?: string;
        phone?: string;
        requestedRole?: 'OPERATOR' | 'VIEWER';
      };

    if (!name || !email || !password) {
      res.status(400).json({
        error: 'Full name, email, and password are required.',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = store.users.find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
    if (existing) {
      res.status(409).json({
        error: 'An account with this email address already exists.',
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const newUser: NocUser = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      password: password.trim(),
      role: requestedRole || 'OPERATOR',
      status: 'PENDING', // Requires Admin Approval
      department: department?.trim() || 'General Operations',
      phone: phone?.trim() || '',
      createdAt: nowIso,
      lastLoginAt: null,
      approvedBy: null,
      approvedAt: null,
    };

    store.users.unshift(newUser);
    saveStore(store);

    const { password: _, ...userSafe } = newUser;
    res.status(201).json({
      message:
        'Account created successfully! Your account is currently PENDING approval by an Admin.',
      user: userSafe,
    });
  });

  // In-memory reset tokens store: email -> { code, expiresAt }
  const resetTokens: Record<string, { code: string; expiresAt: number }> = {};

  // POST /api/auth/forgot-password - Step 1: Request reset code / Step 2: Set new password with code
  app.post('/api/auth/forgot-password', (req, res) => {
    const { email, code, newPassword } = req.body as {
      email?: string;
      code?: string;
      newPassword?: string;
    };

    if (!email) {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = store.users.find(
      (u) =>
        u.email.toLowerCase() === normalizedEmail ||
        (u.id === 'user-admin-1' &&
          (normalizedEmail === 'cop.jmnadado@gmail.com' ||
            normalizedEmail === 'jmnadado@cathedralofpraise.com.ph'))
    );

    if (!user) {
      res.status(404).json({
        error: 'No registered user found with that email address.',
      });
      return;
    }

    // Step 2: If code and newPassword provided, verify and reset password
    if (code && newPassword) {
      if (newPassword.trim().length < 6) {
        res.status(400).json({
          error: 'New password must be at least 6 characters.',
        });
        return;
      }
      const tokenRecord = resetTokens[user.email.toLowerCase()];
      if (
        !tokenRecord ||
        tokenRecord.code !== code.trim() ||
        Date.now() > tokenRecord.expiresAt
      ) {
        res.status(400).json({
          error: 'Invalid or expired 6-digit verification code.',
        });
        return;
      }

      user.password = newPassword.trim();
      saveStore(store);
      delete resetTokens[user.email.toLowerCase()];
      res.json({
        success: true,
        message:
          'Your password has been successfully reset! You can now sign in with your new password.',
      });
      return;
    }

    // Step 1: Generate 6-digit reset code
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    resetTokens[user.email.toLowerCase()] = {
      code: generatedCode,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    res.json({
      success: true,
      message: `Password reset verification code generated for ${user.email}.`,
      code: generatedCode, // Sent directly in response for immediate confirmation
      expiresInMinutes: 15,
    });
  });

  // POST /api/auth/change-password - User changes their own password with old password verification
  app.post('/api/auth/change-password', (req, res) => {
    const { userId, currentPassword, newPassword } = req.body as {
      userId?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    if (!userId || !currentPassword || !newPassword) {
      res.status(400).json({
        error: 'User ID, current password, and new password are required.',
      });
      return;
    }

    if (newPassword.trim().length < 6) {
      res.status(400).json({
        error: 'New password must be at least 6 characters long.',
      });
      return;
    }

    const user = store.users.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (user.password && user.password !== currentPassword.trim()) {
      res.status(401).json({ error: 'Current password does not match.' });
      return;
    }

    user.password = newPassword.trim();
    saveStore(store);
    res.json({ success: true, message: 'Password updated successfully!' });
  });

  // PATCH /api/users/:id/status - Admin Approve, Suspend, or Reactivate
  app.patch('/api/users/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, adminEmail, suspendedReason } = req.body as {
      status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
      adminEmail?: string;
      suspendedReason?: string;
    };

    const user = store.users.find((u) => u.id === id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const nowIso = new Date().toISOString();
    user.status = status;

    if (status === 'ACTIVE') {
      user.approvedBy = adminEmail || 'Jeffrey Nadado (Admin)';
      user.approvedAt = nowIso;
      user.suspendedReason = null;
    } else if (status === 'SUSPENDED') {
      user.suspendedReason =
        suspendedReason || 'Suspended by Cathedral of Praise NOC Administrator.';
    }

    saveStore(store);
    const { password: _, ...userSafe } = user;
    res.json({ user: userSafe, state: store });
  });

  // PATCH /api/users/:id/role - Admin update user role
  app.patch('/api/users/:id/role', (req, res) => {
    const { id } = req.params;
    const { role } = req.body as { role: 'ADMIN' | 'OPERATOR' | 'VIEWER' };

    const user = store.users.find((u) => u.id === id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    user.role = role;
    saveStore(store);
    const { password: _, ...userSafe } = user;
    res.json({ user: userSafe, state: store });
  });

  // PATCH /api/users/:id/password - Reset or Change User Password
  app.patch('/api/users/:id/password', (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body as { newPassword?: string };

    if (!newPassword || newPassword.trim().length < 6) {
      res.status(400).json({
        error: 'Password must be at least 6 characters.',
      });
      return;
    }

    const user = store.users.find((u) => u.id === id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    user.password = newPassword.trim();
    saveStore(store);
    res.json({
      success: true,
      message: `Password for ${user.email} updated successfully.`,
    });
  });

  // DELETE /api/users/:id - Admin Delete User
  app.delete('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const index = store.users.findIndex((u) => u.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (
      store.users[index].role === 'ADMIN' &&
      store.users.filter((u) => u.role === 'ADMIN').length <= 1
    ) {
      res.status(400).json({
        error: 'Cannot delete the only remaining Admin account.',
      });
      return;
    }
    const [deleted] = store.users.splice(index, 1);
    saveStore(store);
    res.json({ success: true, deletedId: deleted.id });
  });

  // POST /api/users - Admin directly creates a pre-approved User
  app.post('/api/users', (req, res) => {
    const { name, email, password, role, department, phone, adminEmail } =
      req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }
    const normalized = email.trim().toLowerCase();
    if (store.users.some((u) => u.email.toLowerCase() === normalized)) {
      res.status(409).json({ error: 'User with this email already exists.' });
      return;
    }
    const nowIso = new Date().toISOString();
    const newUser: NocUser = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: normalized,
      password: password.trim(),
      role: role || 'OPERATOR',
      status: 'ACTIVE',
      department: department?.trim() || 'Cathedral of Praise NOC',
      phone: phone?.trim() || '',
      createdAt: nowIso,
      lastLoginAt: null,
      approvedBy: adminEmail || 'Admin',
      approvedAt: nowIso,
    };
    store.users.unshift(newUser);
    saveStore(store);
    const { password: _, ...userSafe } = newUser;
    res.status(201).json({ user: userSafe, state: store });
  });

  // POST /api/logs/parse
  app.post('/api/logs/parse', (req, res) => {
    const { rawLog } = req.body as { rawLog?: string };
    if (!rawLog || typeof rawLog !== 'string') {
      res.status(400).json({ error: 'rawLog string is required' });
      return;
    }
    const parsed = parseNetworkLogForIncident(rawLog, store.campuses);
    res.json(parsed);
  });

  // POST /api/incidents
  app.post('/api/incidents', (req, res) => {
    const body = req.body as Partial<IncidentTicket> & {
      autoSendProviderEmail?: boolean;
      autoSendInternalAlert?: boolean;
    };

    const campus =
      store.campuses.find((c) => c.id === body.campusId) ||
      store.campuses[0];

    const nowIso = new Date().toISOString();
    const seqNum = 102 + store.incidents.length;
    const ticketNumber =
      body.ticketNumber?.trim() || `COP-INC-2026-0${seqNum}`;

    const newIncident: IncidentTicket = {
      id: `inc-${Date.now()}`,
      ticketNumber,
      telcoTicketNumber:
        body.telcoTicketNumber?.trim() || 'Pending Telco Ref',
      campusId: campus.id,
      campusName: campus.campusName,
      linkName: body.linkName || campus.linkName,
      circuitId: body.circuitId || campus.circuitId,
      provider: body.provider || campus.provider,
      providerNocEmail: body.providerNocEmail || campus.providerNocEmail,
      accountNumber: body.accountNumber || campus.accountNumber,
      routerHostname: body.routerHostname || campus.routerHostname,
      interfaceName: body.interfaceName || campus.interfaceName,
      problemSummary:
        body.problemSummary?.trim() ||
        `${campus.campusName} — ${campus.linkName} DOWN (${campus.circuitId})`,
      technicalDetails:
        body.technicalDetails?.trim() ||
        `Campus: ${campus.campusName} | Link: ${campus.linkName}\nRouter: ${campus.routerHostname} (${campus.interfaceName}) | Circuit: ${campus.circuitId}`,
      rawLogSnippet: body.rawLogSnippet || '',
      creationMode: body.creationMode || 'Hybrid Log + Manual',
      sourceLogId: body.sourceLogId,
      status: body.status || 'Waiting for Telco Repair',
      reportedToTelco: Boolean(body.reportedToTelco || body.autoSendProviderEmail),
      reportedToTelcoAt:
        body.reportedToTelco || body.autoSendProviderEmail ? nowIso : null,
      reportedBy: body.reportedBy || 'Cathedral of Praise NOC',
      expectedResolutionAt:
        body.expectedResolutionAt ||
        new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      etrNotes:
        body.etrNotes ||
        'Awaiting field dispatch confirmation and line test results from Telco NOC.',
      escalationLevel: body.escalationLevel || 'L1 - Campus NOC',
      createdAt: nowIso,
      updatedAt: nowIso,
      resolvedAt: body.status === 'Resolved' ? nowIso : null,
      timeline: [
        {
          id: `tl-${Date.now()}-1`,
          timestamp: nowIso,
          actor:
            body.creationMode === 'Manual Entry'
              ? body.reportedBy || 'Cathedral of Praise NOC'
              : 'Syslog Autofill + NOC Engineer',
          action: `Incident Ticket ${ticketNumber} Created for ${campus.campusName} — ${campus.linkName}`,
          note: `Status: ${body.status || 'Waiting for Telco Repair'} | Telco Ref: ${body.telcoTicketNumber || 'Pending Telco Ref'} | Link State: ${body.status === 'Resolved' ? 'GREEN (Restored)' : 'RED (Down)'}`,
          automated: body.creationMode !== 'Manual Entry',
        },
      ],
    };

    if (body.sourceLogId) {
      const logItem = store.logs.find((l) => l.id === body.sourceLogId);
      if (logItem) {
        logItem.linkedIncidentId = newIncident.id;
      }
    }

    // Update campus link status: RED ('Outage') if unresolved, GREEN ('Operational') if resolved
    if (newIncident.status !== 'Resolved') {
      campus.status = 'Outage';
      campus.packetLossPct = 100;
      campus.latencyMs = 0;
      campus.opticalRxDbm = -38.8;
      campus.lastCheckedAt = nowIso;
    } else {
      campus.status = 'Operational';
      campus.packetLossPct = 0;
      campus.latencyMs = 8.4;
      campus.opticalRxDbm = -10.2;
      campus.lastCheckedAt = nowIso;
      campus.lastRestoredAt = nowIso;
    }

    const generatedEmails: EmailDispatch[] = [];

    if (body.autoSendProviderEmail) {
      const providerDraft = buildProviderDispatchEmail(
        newIncident,
        'Auto-Created on Ticket Log'
      );
      const emailRecord: EmailDispatch = {
        ...providerDraft,
        id: `email-${Date.now()}-prov`,
        timestamp: nowIso,
      };
      store.emails.unshift(emailRecord);
      generatedEmails.push(emailRecord);

      newIncident.timeline.push({
        id: `tl-${Date.now()}-2`,
        timestamp: nowIso,
        actor: 'Automated Email Dispatcher',
        action: `Auto-Dispatched Outage Report to ${newIncident.provider}`,
        note: `Sent to ${newIncident.providerNocEmail} for ${newIncident.campusName} — ${newIncident.linkName}.`,
        automated: true,
      });
    }

    if (body.autoSendInternalAlert !== false) {
      const internalDraft = buildInternalNotificationEmail(
        newIncident,
        `New Incident Logged (${newIncident.creationMode})`,
        'Status Update Notification'
      );
      const internalRecord: EmailDispatch = {
        ...internalDraft,
        id: `email-${Date.now()}-int`,
        timestamp: nowIso,
      };
      store.emails.unshift(internalRecord);
      generatedEmails.push(internalRecord);
    }

    store.incidents.unshift(newIncident);
    syncCampusStatusesWithIncidents(store);
    saveStore(store);

    res.status(201).json({
      incident: newIncident,
      generatedEmails,
      state: store,
    });
  });

  // PATCH /api/incidents/:id
  app.patch('/api/incidents/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body as Partial<IncidentTicket> & {
      actor?: string;
      updateNote?: string;
      sendProviderFollowUp?: boolean;
    };

    const incident = store.incidents.find((inc) => inc.id === id);
    if (!incident) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    const nowIso = new Date().toISOString();
    const changes: string[] = [];

    if (
      updates.problemSummary !== undefined &&
      updates.problemSummary.trim() !== incident.problemSummary
    ) {
      changes.push(`Updated Problem Description`);
      incident.problemSummary = updates.problemSummary.trim();
    }

    if (
      updates.status !== undefined &&
      updates.status !== incident.status
    ) {
      changes.push(`Status: ${incident.status} → ${updates.status}`);
      incident.status = updates.status;

      if (updates.status === 'Resolved') {
        incident.resolvedAt = nowIso;
      } else {
        incident.resolvedAt = null;
      }
    }

    if (
      updates.ticketNumber !== undefined &&
      updates.ticketNumber !== incident.ticketNumber
    ) {
      changes.push(
        `Ticket #: ${incident.ticketNumber} → ${updates.ticketNumber}`
      );
      incident.ticketNumber = updates.ticketNumber;
    }

    if (
      updates.telcoTicketNumber !== undefined &&
      updates.telcoTicketNumber !== incident.telcoTicketNumber
    ) {
      changes.push(
        `Telco Ref #: ${incident.telcoTicketNumber} → ${updates.telcoTicketNumber}`
      );
      incident.telcoTicketNumber = updates.telcoTicketNumber;
    }

    if (
      updates.reportedToTelco !== undefined &&
      updates.reportedToTelco !== incident.reportedToTelco
    ) {
      changes.push(
        `Reported to Telco: ${incident.reportedToTelco ? 'Yes' : 'No'} → ${updates.reportedToTelco ? 'Yes' : 'No'}`
      );
      incident.reportedToTelco = updates.reportedToTelco;
      if (updates.reportedToTelco && !incident.reportedToTelcoAt) {
        incident.reportedToTelcoAt = nowIso;
      }
    }

    if (
      updates.expectedResolutionAt !== undefined &&
      updates.expectedResolutionAt !== incident.expectedResolutionAt
    ) {
      changes.push(`Updated Provider ETR timeline`);
      incident.expectedResolutionAt = updates.expectedResolutionAt;
    }

    if (
      updates.etrNotes !== undefined &&
      updates.etrNotes !== incident.etrNotes
    ) {
      changes.push(`Updated Provider / Repair notes`);
      incident.etrNotes = updates.etrNotes;
    }

    if (
      updates.escalationLevel !== undefined &&
      updates.escalationLevel !== incident.escalationLevel
    ) {
      changes.push(`Escalated to ${updates.escalationLevel}`);
      incident.escalationLevel = updates.escalationLevel;
    }

    incident.updatedAt = nowIso;

    if (changes.length > 0 || updates.updateNote) {
      incident.timeline.push({
        id: `tl-${Date.now()}`,
        timestamp: nowIso,
        actor: updates.actor || 'Cathedral of Praise NOC',
        action: changes.join(' · ') || 'Incident Updated',
        note:
          updates.updateNote ||
          `Telco Ref: ${incident.telcoTicketNumber} | Status: ${incident.status}`,
        automated: false,
      });
    }

    if (updates.sendProviderFollowUp) {
      const followUpDraft = buildProviderDispatchEmail(
        incident,
        'Telco Escalation Chaser'
      );
      const emailRecord: EmailDispatch = {
        ...followUpDraft,
        id: `email-${Date.now()}-chaser`,
        timestamp: nowIso,
      };
      store.emails.unshift(emailRecord);
      incident.reportedToTelco = true;
      if (!incident.reportedToTelcoAt) {
        incident.reportedToTelcoAt = nowIso;
      }
      incident.timeline.push({
        id: `tl-${Date.now()}-email`,
        timestamp: nowIso,
        actor: 'Automated Email Dispatcher',
        action: `Dispatched Provider Follow-Up to ${incident.provider}`,
        note: `Sent to ${incident.providerNocEmail}`,
        automated: true,
      });
    }

    if (changes.some((c) => c.startsWith('Status:'))) {
      const internalEmail = buildInternalNotificationEmail(
        incident,
        changes.join(', '),
        'Status Update Notification'
      );
      store.emails.unshift({
        ...internalEmail,
        id: `email-${Date.now()}-status`,
        timestamp: nowIso,
      });
    }

    syncCampusStatusesWithIncidents(store);
    saveStore(store);
    res.json({ incident, state: store });
  });

  // POST /api/emails/send
  app.post('/api/emails/send', (req, res) => {
    const body = req.body as Partial<EmailDispatch>;
    const nowIso = new Date().toISOString();

    const newEmail: EmailDispatch = {
      id: `email-${Date.now()}`,
      timestamp: nowIso,
      incidentId: body.incidentId || '',
      ticketNumber: body.ticketNumber || 'N/A',
      campusName: body.campusName || 'All Campuses',
      linkName: body.linkName,
      provider: body.provider || 'Service Provider',
      recipientType: body.recipientType || 'Service Provider (Telco NOC)',
      to: body.to || 'linkgold@etpi.com.ph',
      cc: body.cc || 'lcmojal@cathedralofpraise.com.ph, jffernandez@cathedralofpraise.com.ph, jcjara@cathedralofpraise.com.ph, jmnadado@cathedralofpraise.com.ph',
      subject: body.subject || 'Cathedral of Praise NOC Dispatch',
      body: body.body || '',
      triggerSource: body.triggerSource || 'Manual Dispatch',
      deliveryStatus: 'Dispatched',
    };

    store.emails.unshift(newEmail);

    if (body.incidentId) {
      const inc = store.incidents.find((i) => i.id === body.incidentId);
      if (inc) {
        if (newEmail.recipientType === 'Service Provider (Telco NOC)') {
          inc.reportedToTelco = true;
          if (!inc.reportedToTelcoAt) inc.reportedToTelcoAt = nowIso;
        }
        inc.timeline.push({
          id: `tl-${Date.now()}`,
          timestamp: nowIso,
          actor: 'NOC Email Dispatcher',
          action: `Email Dispatched to ${newEmail.to}`,
          note: `Subject: ${newEmail.subject}`,
          automated: false,
        });
      }
    }

    saveStore(store);
    res.status(201).json({ email: newEmail, state: store });
  });

  // ALL (GET/POST) /api/webhooks/m365-email
  // Receives inbound/outbound M365 emails from jmnadado@cathedralofpraise.com.ph (via Power Automate, URL Query, or M365 Sync Tester)
  app.all('/api/webhooks/m365-email', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    const payload = {
      ...(typeof req.body === 'object' && req.body !== null ? req.body : {}),
      ...(req.query || {}),
    } as Record<string, unknown>;

    const from = String(
      payload.from ||
        payload.sender ||
        'jmnadado@cathedralofpraise.com.ph'
    ).trim();

    const lowerFrom = from.toLowerCase();
    const isAuthorizedSender =
      lowerFrom.endsWith('@cathedralofpraise.com.ph') ||
      lowerFrom.endsWith('@etpi.com.ph') ||
      lowerFrom.endsWith('@convergeict.com') ||
      lowerFrom.endsWith('@pldt.com.ph') ||
      lowerFrom.endsWith('@starlink.com');

    if (!isAuthorizedSender) {
      res.status(403).json({
        error:
          'Unauthorized sender. Only @cathedralofpraise.com.ph or official Telco NOC emails are permitted to update tickets.',
      });
      return;
    }
    const to = String(
      payload.to ||
        payload.toRecipients ||
        ''
    ).trim();
    const cc = String(
      payload.cc ||
        payload.ccRecipients ||
        'lcmojal@cathedralofpraise.com.ph, jffernandez@cathedralofpraise.com.ph, jcjara@cathedralofpraise.com.ph'
    ).trim();
    const subject = String(payload.subject || '').trim();
    const rawBodyVal =
      payload.bodyPreview ||
      payload.body ||
      (typeof req.body === 'string' ? req.body : '') ||
      '';
    const emailBody = String(rawBodyVal)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!subject && !emailBody) {
      res.status(400).json({
        error: 'Please include at least an Email Subject with the Account Number or Circuit ID.',
      });
      return;
    }

    const parsed = parseM365Email(subject, emailBody, store.campuses, to);
    if (!parsed.matchedCampus) {
      res.status(422).json({
        error:
          'Could not match an Account Number (e.g. 657871060) or Circuit ID (e.g. 930473671, MC12984) in the email subject or body.',
        parsed,
      });
      return;
    }

    const campus = parsed.matchedCampus;
    const nowIso = new Date().toISOString();
    let targetIncident = store.incidents.find(
      (inc) =>
        inc.campusId === campus.id &&
        inc.status !== 'Resolved'
    );

    if (!targetIncident && parsed.extractedInternalTicket) {
      targetIncident = store.incidents.find(
        (inc) =>
          inc.ticketNumber.toUpperCase() ===
          parsed.extractedInternalTicket?.toUpperCase()
      );
    }

    let actionSummary = '';

    if (parsed.detectedAction === 'RESOLVE_TO_GREEN') {
      if (targetIncident) {
        targetIncident.status = 'Resolved';
        targetIncident.resolvedAt = nowIso;
        targetIncident.updatedAt = nowIso;
        if (parsed.extractedTelcoTicket) {
          targetIncident.telcoTicketNumber = parsed.extractedTelcoTicket;
        }
        targetIncident.etrNotes = `M365 Email Confirmed Resolved: ${parsed.extractedProblemSummary}`;
        targetIncident.timeline.push({
          id: `tl-${Date.now()}-m365-res`,
          timestamp: nowIso,
          actor: `M365 Email (${from})`,
          action: `Status Auto-Updated to Resolved via M365 Email — Link Turned GREEN`,
          note: `Subject: "${subject}" | Telco Ref: ${targetIncident.telcoTicketNumber}`,
          automated: true,
        });
        actionSummary = `Resolved ticket ${targetIncident.ticketNumber} via M365 email — ${campus.campusName} (${campus.linkName}) is now GREEN (GOOD).`;
      } else {
        // Even if no open ticket existed, ensure link is GREEN and record resolved ticket
        const seqNum = 101 + store.incidents.length;
        const ticketNumber =
          parsed.extractedInternalTicket || `COP-INC-2026-0${seqNum}`;
        targetIncident = {
          id: `inc-${Date.now()}`,
          ticketNumber,
          telcoTicketNumber:
            parsed.extractedTelcoTicket || 'Resolved via M365',
          campusId: campus.id,
          campusName: campus.campusName,
          linkName: campus.linkName,
          circuitId: campus.circuitId,
          provider: campus.provider,
          providerNocEmail: campus.providerNocEmail,
          accountNumber: campus.accountNumber,
          routerHostname: campus.routerHostname,
          interfaceName: campus.interfaceName,
          problemSummary: parsed.extractedProblemSummary,
          technicalDetails: `M365 Email Sync (${from} -> ${to})\nCampus: ${campus.campusName} | Link: ${campus.linkName} | Circuit/Acct: ${campus.circuitId}`,
          rawLogSnippet: emailBody,
          creationMode: 'Hybrid Log + Manual',
          status: 'Resolved',
          reportedToTelco: true,
          reportedToTelcoAt: nowIso,
          reportedBy: from,
          expectedResolutionAt: nowIso,
          etrNotes: `Restored & verified via M365 Email.`,
          escalationLevel: 'L1 - Campus NOC',
          createdAt: nowIso,
          updatedAt: nowIso,
          resolvedAt: nowIso,
          timeline: [
            {
              id: `tl-${Date.now()}-m365`,
              timestamp: nowIso,
              actor: `M365 Email (${from})`,
              action: `Recorded Resolved Notice via M365 Email — Link GREEN`,
              note: `Subject: "${subject}"`,
              automated: true,
            },
          ],
        };
        store.incidents.unshift(targetIncident);
        actionSummary = `Verified ${campus.campusName} (${campus.linkName}) GREEN (Resolved) from M365 email.`;
      }
    } else {
      // CREATE_OUTAGE_RED or update existing open outage
      if (targetIncident) {
        if (parsed.extractedTelcoTicket) {
          targetIncident.telcoTicketNumber = parsed.extractedTelcoTicket;
        }
        targetIncident.reportedToTelco = true;
        if (!targetIncident.reportedToTelcoAt) {
          targetIncident.reportedToTelcoAt = nowIso;
        }
        targetIncident.updatedAt = nowIso;
        targetIncident.timeline.push({
          id: `tl-${Date.now()}-m365-upd`,
          timestamp: nowIso,
          actor: `M365 Email (${from})`,
          action: `Updated Outage Ticket via M365 Email (Telco Ref: ${targetIncident.telcoTicketNumber})`,
          note: `Subject: "${subject}"`,
          automated: true,
        });
        actionSummary = `Updated active outage ticket ${targetIncident.ticketNumber} from M365 email — ${campus.campusName} (${campus.linkName}) remains RED.`;
      } else {
        const seqNum = 101 + store.incidents.length;
        const ticketNumber =
          parsed.extractedInternalTicket || `COP-INC-2026-0${seqNum}`;
        targetIncident = {
          id: `inc-${Date.now()}`,
          ticketNumber,
          telcoTicketNumber:
            parsed.extractedTelcoTicket || 'Pending Telco Ref',
          campusId: campus.id,
          campusName: campus.campusName,
          linkName: campus.linkName,
          circuitId: campus.circuitId,
          provider: campus.provider,
          providerNocEmail: campus.providerNocEmail,
          accountNumber: campus.accountNumber,
          routerHostname: campus.routerHostname,
          interfaceName: campus.interfaceName,
          problemSummary: parsed.extractedProblemSummary,
          technicalDetails: `Synced from M365 Email\nFrom: ${from}\nTo: ${to || campus.providerNocEmail}\nCampus: ${campus.campusName} | Link: ${campus.linkName} | Circuit/Acct: ${campus.circuitId}`,
          rawLogSnippet: `Subject: ${subject}\n\n${emailBody}`,
          creationMode: 'Hybrid Log + Manual',
          status: 'Waiting for Telco Repair',
          reportedToTelco: true,
          reportedToTelcoAt: nowIso,
          reportedBy: from,
          expectedResolutionAt: new Date(
            Date.now() + 4 * 3600 * 1000
          ).toISOString(),
          etrNotes: `Auto-created from M365 email ("${subject}").`,
          escalationLevel: 'L1 - Campus NOC',
          createdAt: nowIso,
          updatedAt: nowIso,
          resolvedAt: null,
          timeline: [
            {
              id: `tl-${Date.now()}-m365-new`,
              timestamp: nowIso,
              actor: `M365 Email Auto-Sync (${from})`,
              action: `Outage Ticket ${ticketNumber} Auto-Created from M365 Email — Link Turned RED`,
              note: `Matched ${campus.campusName} — ${campus.linkName} (${campus.circuitId}) | Telco Ref: ${parsed.extractedTelcoTicket || 'Pending Telco Ref'}`,
              automated: true,
            },
          ],
        };
        store.incidents.unshift(targetIncident);
        actionSummary = `Auto-created Ticket ${ticketNumber} from M365 email — ${campus.campusName} (${campus.linkName}) automatically turned RED (OUTAGE).`;
      }
    }

    // Record the M365 email in the Email Dispatch log
    const emailRecord: EmailDispatch = {
      id: `email-${Date.now()}-m365`,
      timestamp: nowIso,
      incidentId: targetIncident.id,
      ticketNumber: targetIncident.ticketNumber,
      campusName: campus.campusName,
      linkName: campus.linkName,
      provider: campus.provider,
      recipientType: 'Service Provider (Telco NOC)',
      to: to || campus.providerNocEmail,
      cc: cc || 'lcmojal@cathedralofpraise.com.ph, jffernandez@cathedralofpraise.com.ph, jcjara@cathedralofpraise.com.ph',
      subject,
      body: emailBody,
      triggerSource: 'Auto-Created on Ticket Log',
      deliveryStatus: 'Dispatched',
    };
    store.emails.unshift(emailRecord);

    syncCampusStatusesWithIncidents(store);
    saveStore(store);

    res.status(200).json({
      actionSummary,
      incident: targetIncident,
      parsed,
      state: store,
    });
  });

  // PATCH /api/campuses/:id/circuit
  app.patch('/api/campuses/:id/circuit', (req, res) => {
    const { id } = req.params;
    const {
      circuitId,
      accountNumber,
      providerNocEmail,
      routerHostname,
      interfaceName,
    } = req.body as Partial<CampusLink>;

    const campus = store.campuses.find((c) => c.id === id);
    if (!campus) {
      res.status(404).json({ error: 'Campus link not found' });
      return;
    }

    if (circuitId !== undefined && circuitId.trim()) {
      campus.circuitId = circuitId.trim();
    }
    if (accountNumber !== undefined && accountNumber.trim()) {
      campus.accountNumber = accountNumber.trim();
    }
    if (providerNocEmail !== undefined && providerNocEmail.trim()) {
      campus.providerNocEmail = providerNocEmail.trim();
    }
    if (routerHostname !== undefined && routerHostname.trim()) {
      campus.routerHostname = routerHostname.trim();
    }
    if (interfaceName !== undefined && interfaceName.trim()) {
      campus.interfaceName = interfaceName.trim();
    }

    // Also sync active incidents for this link
    for (const inc of store.incidents) {
      if (inc.campusId === campus.id) {
        inc.circuitId = campus.circuitId;
        inc.accountNumber = campus.accountNumber;
        inc.providerNocEmail = campus.providerNocEmail;
      }
    }

    saveStore(store);
    res.json({ campus, state: store });
  });

  // POST /api/campuses/new-branch (Add a new Campus or Branch with Telco links)
  app.post('/api/campuses/new-branch', (req, res) => {
    const {
      campusName,
      campusCode,
      region,
      building,
      links,
    } = req.body as {
      campusName: string;
      campusCode?: string;
      region?: string;
      building?: string;
      links: Array<Partial<CampusLink>>;
    };

    if (!campusName || !campusName.trim()) {
      res.status(400).json({ error: 'Campus Name is required' });
      return;
    }

    const trimmedName = campusName.trim();
    const existing = store.campuses.some(
      (c) => c.campusName.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      res.status(400).json({ error: `Campus "${trimmedName}" already exists. Use "Add Link" to add more circuits to it.` });
      return;
    }

    const code =
      (campusCode && campusCode.trim()) ||
      `COP-${trimmedName.replace(/\s+campus/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`;
    const reg = (region && region.trim()) || 'National Branch';
    const bldg = (building && building.trim()) || `${trimmedName} Sanctuary & IT Rack`;

    const nowIso = new Date().toISOString();
    const newLinks: CampusLink[] = [];

    const rawLinks = links && links.length > 0 ? links : [
      {
        linkName: 'Primary Dedicated Internet',
        provider: 'Eastern Communications',
        linkRole: 'Dedicated Internet' as const,
        bandwidthMbps: 500,
        circuitId: 'NEW-CIRCUIT-01',
        accountNumber: 'N/A',
      },
    ];

    for (let i = 0; i < rawLinks.length; i++) {
      const l = rawLinks[i];
      const provider = l.provider || 'Eastern Communications';
      const role = l.linkRole || 'Dedicated Internet';
      const bw = Number(l.bandwidthMbps) || 500;
      const linkName = l.linkName || `${provider} ${role === 'Dedicated Internet' ? 'Internet' : 'Transport'}`;
      const suffix = linkName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const linkId = `${code.toLowerCase()}-${suffix || `link-${i + 1}`}`;

      const link: CampusLink = {
        id: linkId,
        campusName: trimmedName,
        campusCode: code,
        region: reg,
        building: bldg,
        linkName,
        linkRole: role,
        provider,
        providerNocEmail: l.providerNocEmail || (provider.includes('Converge') ? 'enterprisesupport@convergeict.com' : provider.includes('PLDT') ? 'enterprisecare@pldt.com.ph' : provider.includes('Starlink') ? 'enterprise-support@starlink.com' : 'linkgold@etpi.com.ph'),
        providerHotline: l.providerHotline || (provider.includes('Converge') ? '+63 (2) 8667-0848' : provider.includes('PLDT') ? '+63 (2) 8888-1777' : provider.includes('Starlink') ? 'Priority Portal' : '+63 (2) 5300-7000'),
        accountNumber: (l.accountNumber && l.accountNumber.trim()) || 'N/A',
        circuitId: (l.circuitId && l.circuitId.trim()) || `CID-${Math.floor(100000 + Math.random() * 900000)}`,
        routerHostname: l.routerHostname || `${code.toLowerCase()}-rtr-01`,
        interfaceName: l.interfaceName || `GigabitEthernet0/0/${i}`,
        bgpPeerIp: l.bgpPeerIp || `10.${Math.floor(Math.random() * 200 + 10)}.${Math.floor(Math.random() * 250 + 1)}.1`,
        bandwidthMbps: bw,
        status: 'Operational',
        latencyMs: 12.4,
        packetLossPct: 0,
        opticalRxDbm: -11.5,
        uptime30dPct: 99.98,
        uptime90dPct: 99.95,
        slaTargetPct: 99.9,
        lastCheckedAt: nowIso,
        lastRestoredAt: nowIso,
        dailyUptimeHistory: Array.from({ length: 30 }, (_, dayIdx) => ({
          date: new Date(Date.now() - (29 - dayIdx) * 86400000).toISOString().split('T')[0],
          uptimePct: 100,
          downtimeMinutes: 0,
          incidentCount: 0,
        })),
      };
      newLinks.push(link);
      store.campuses.push(link);
    }

    saveStore(store);
    res.json({ message: `Campus "${trimmedName}" created with ${newLinks.length} circuit(s).`, newLinks, state: store });
  });

  // PUT /api/campuses/links/:id (Update full telco details for a link)
  app.put('/api/campuses/links/:id', (req, res) => {
    const { id } = req.params;
    const patch = req.body as Partial<CampusLink>;

    const link = store.campuses.find((c) => c.id === id);
    if (!link) {
      res.status(404).json({ error: 'Circuit link not found' });
      return;
    }

    if (patch.linkName !== undefined && patch.linkName.trim()) link.linkName = patch.linkName.trim();
    if (patch.provider !== undefined && patch.provider.trim()) link.provider = patch.provider.trim();
    if (patch.linkRole !== undefined) link.linkRole = patch.linkRole;
    if (patch.circuitId !== undefined && patch.circuitId.trim()) link.circuitId = patch.circuitId.trim();
    if (patch.accountNumber !== undefined && patch.accountNumber.trim()) link.accountNumber = patch.accountNumber.trim();
    if (patch.bandwidthMbps !== undefined) link.bandwidthMbps = Number(patch.bandwidthMbps) || link.bandwidthMbps;
    if (patch.interfaceName !== undefined && patch.interfaceName.trim()) link.interfaceName = patch.interfaceName.trim();
    if (patch.bgpPeerIp !== undefined && patch.bgpPeerIp.trim()) link.bgpPeerIp = patch.bgpPeerIp.trim();
    if (patch.providerNocEmail !== undefined && patch.providerNocEmail.trim()) link.providerNocEmail = patch.providerNocEmail.trim();
    if (patch.providerHotline !== undefined && patch.providerHotline.trim()) link.providerHotline = patch.providerHotline.trim();
    if (patch.routerHostname !== undefined && patch.routerHostname.trim()) link.routerHostname = patch.routerHostname.trim();
    if (patch.status !== undefined) link.status = patch.status;
    if (patch.region !== undefined && patch.region.trim()) {
      const cName = link.campusName;
      for (const cl of store.campuses) {
        if (cl.campusName === cName) cl.region = patch.region.trim();
      }
    }
    if (patch.building !== undefined && patch.building.trim()) {
      const cName = link.campusName;
      for (const cl of store.campuses) {
        if (cl.campusName === cName) cl.building = patch.building.trim();
      }
    }

    // Sync incidents
    for (const inc of store.incidents) {
      if (inc.campusId === link.id) {
        inc.circuitId = link.circuitId;
        inc.accountNumber = link.accountNumber;
        inc.provider = link.provider;
        inc.providerNocEmail = link.providerNocEmail;
      }
    }

    saveStore(store);
    res.json({ link, state: store });
  });

  // POST /api/campuses/:campusName/add-link (Add a new circuit to an existing campus)
  app.post('/api/campuses/:campusName/add-link', (req, res) => {
    const { campusName } = req.params;
    const existing = store.campuses.filter((c) => c.campusName.toLowerCase() === campusName.toLowerCase());
    if (existing.length === 0) {
      res.status(404).json({ error: `Campus "${campusName}" not found.` });
      return;
    }

    const template = existing[0];
    const l = req.body as Partial<CampusLink>;
    const provider = l.provider || 'Starlink Enterprise';
    const role = l.linkRole || 'LEO Satellite Backup';
    const linkName = l.linkName || `${provider} Backup`;
    const bw = Number(l.bandwidthMbps) || 250;
    const nowIso = new Date().toISOString();
    const suffix = linkName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const linkId = `${template.campusCode.toLowerCase()}-${suffix || `link-${Date.now()}`}`;

    const newLink: CampusLink = {
      id: linkId,
      campusName: template.campusName,
      campusCode: template.campusCode,
      region: template.region,
      building: template.building,
      linkName,
      linkRole: role,
      provider,
      providerNocEmail: l.providerNocEmail || (provider.includes('Converge') ? 'enterprisesupport@convergeict.com' : provider.includes('PLDT') ? 'enterprisecare@pldt.com.ph' : provider.includes('Starlink') ? 'enterprise-support@starlink.com' : 'linkgold@etpi.com.ph'),
      providerHotline: l.providerHotline || (provider.includes('Converge') ? '+63 (2) 8667-0848' : provider.includes('PLDT') ? '+63 (2) 8888-1777' : provider.includes('Starlink') ? 'Priority Portal' : '+63 (2) 5300-7000'),
      accountNumber: (l.accountNumber && l.accountNumber.trim()) || 'N/A',
      circuitId: (l.circuitId && l.circuitId.trim()) || `CID-${Math.floor(100000 + Math.random() * 900000)}`,
      routerHostname: template.routerHostname,
      interfaceName: l.interfaceName || `GigabitEthernet0/0/${existing.length}`,
      bgpPeerIp: l.bgpPeerIp || `10.${Math.floor(Math.random() * 200 + 10)}.1.1`,
      bandwidthMbps: bw,
      status: 'Operational',
      latencyMs: 14.2,
      packetLossPct: 0,
      opticalRxDbm: -10.2,
      uptime30dPct: 99.98,
      uptime90dPct: 99.95,
      slaTargetPct: 99.9,
      lastCheckedAt: nowIso,
      lastRestoredAt: nowIso,
      dailyUptimeHistory: Array.from({ length: 30 }, (_, dayIdx) => ({
        date: new Date(Date.now() - (29 - dayIdx) * 86400000).toISOString().split('T')[0],
        uptimePct: 100,
        downtimeMinutes: 0,
        incidentCount: 0,
      })),
    };

    store.campuses.push(newLink);
    saveStore(store);
    res.json({ newLink, state: store });
  });

  // DELETE /api/campuses/links/:id (Remove an individual circuit)
  app.delete('/api/campuses/links/:id', (req, res) => {
    const { id } = req.params;
    const idx = store.campuses.findIndex((c) => c.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Circuit not found' });
      return;
    }
    const removed = store.campuses.splice(idx, 1)[0];
    saveStore(store);
    res.json({ message: `Circuit ${removed.linkName} (${removed.circuitId}) removed.`, state: store });
  });

  // DELETE /api/campuses/branch/:campusName (Remove an entire branch)
  app.delete('/api/campuses/branch/:campusName', (req, res) => {
    const { campusName } = req.params;
    const initialCount = store.campuses.length;
    store.campuses = store.campuses.filter(
      (c) => c.campusName.toLowerCase() !== campusName.toLowerCase()
    );
    const removedCount = initialCount - store.campuses.length;
    if (removedCount === 0) {
      res.status(404).json({ error: `Campus branch "${campusName}" not found.` });
      return;
    }
    saveStore(store);
    res.json({ message: `Campus "${campusName}" and its ${removedCount} circuits removed.`, state: store });
  });

  // POST /api/campuses/:id/simulate
  app.post('/api/campuses/:id/simulate', (req, res) => {
    const { id } = req.params;
    const { mode } = req.body as {
      mode: 'outage' | 'degraded' | 'restore';
    };

    const campus = store.campuses.find((c) => c.id === id);
    if (!campus) {
      res.status(404).json({ error: 'Campus link not found' });
      return;
    }

    const nowIso = new Date().toISOString();
    let newLog: NetworkLogEvent | null = null;

    if (mode === 'outage' || mode === 'degraded') {
      // Mark link RED (Down)
      campus.status = 'Outage';
      campus.packetLossPct = 100;
      campus.latencyMs = 0;
      campus.opticalRxDbm = -38.9;
      campus.lastCheckedAt = nowIso;

      newLog = {
        id: `log-${Date.now()}`,
        timestamp: nowIso,
        routerHostname: campus.routerHostname,
        interfaceName: campus.interfaceName,
        campusId: campus.id,
        campusName: campus.campusName,
        linkName: campus.linkName,
        circuitId: campus.circuitId,
        provider: campus.provider,
        protocol: 'OPTICAL',
        severity: 'CRITICAL',
        rawSyslog: `<187>${new Date().toLocaleTimeString('en-US', { hour12: false })} ${campus.routerHostname} %OPTICAL-3-RXLOS: Interface ${campus.interfaceName} (Circuit: ${campus.circuitId} - ${campus.linkName}), Rx power -38.9 dBm below threshold. %BGP-5-ADJCHANGE: neighbor ${campus.bgpPeerIp} Down (100% packet loss)`,
        parsedSummary: `${campus.campusName} — ${campus.linkName} DOWN (RED): Optical LOS (-38.9 dBm) & BGP Peer ${campus.bgpPeerIp} Down`,
        detectedIssueType: 'Link Down / Total Connectivity Loss',
        metrics: {
          packetLossPct: 100,
          latencyMs: 0,
          opticalRxDbm: -38.9,
        },
      };
      store.logs.unshift(newLog);
    } else {
      // Restore link to GREEN (Good & Restored)
      campus.status = 'Operational';
      campus.packetLossPct = 0;
      campus.latencyMs = 8.6;
      campus.opticalRxDbm = -10.2;
      campus.lastCheckedAt = nowIso;
      campus.lastRestoredAt = nowIso;

      // Also mark any open incidents for this link as Resolved
      for (const inc of store.incidents) {
        if (inc.campusId === campus.id && inc.status !== 'Resolved') {
          inc.status = 'Resolved';
          inc.resolvedAt = nowIso;
          inc.updatedAt = nowIso;
          inc.timeline.push({
            id: `tl-${Date.now()}-${inc.id}`,
            timestamp: nowIso,
            actor: 'Cathedral of Praise NOC',
            action: 'Link Restored to GREEN (Good) — Incident Auto-Resolved',
            note: `${campus.campusName} — ${campus.linkName} restored and verified operational.`,
            automated: true,
          });
        }
      }

      newLog = {
        id: `log-${Date.now()}`,
        timestamp: nowIso,
        routerHostname: campus.routerHostname,
        interfaceName: campus.interfaceName,
        campusId: campus.id,
        campusName: campus.campusName,
        linkName: campus.linkName,
        circuitId: campus.circuitId,
        provider: campus.provider,
        protocol: 'SNMP-TRAP',
        severity: 'INFO',
        rawSyslog: `<190>${new Date().toLocaleTimeString('en-US', { hour12: false })} ${campus.routerHostname} %LINEPROTO-5-UPDOWN: Interface ${campus.interfaceName} (Circuit ${campus.circuitId} - ${campus.linkName}) changed state to up. packet-loss=0% latency=8.6ms optical-rx=-10.2dBm`,
        parsedSummary: `${campus.campusName} — ${campus.linkName} RESTORED (GREEN): BGP Established, 0% Packet Loss`,
        detectedIssueType: 'Link Restored / Good Status',
        metrics: {
          packetLossPct: 0,
          latencyMs: 8.6,
          opticalRxDbm: -10.2,
        },
      };
      store.logs.unshift(newLog);
    }

    saveStore(store);
    res.json({ campus, newLog, state: store });
  });

  // POST /api/campuses/reset-all-green
  app.post('/api/campuses/reset-all-green', (_req, res) => {
    const nowIso = new Date().toISOString();
    for (const c of store.campuses) {
      c.status = 'Operational';
      c.packetLossPct = 0;
      if (c.latencyMs === 0) c.latencyMs = 8.4;
      if (c.opticalRxDbm < -24) c.opticalRxDbm = -10.5;
      c.lastCheckedAt = nowIso;
      c.lastRestoredAt = nowIso;
    }
    for (const inc of store.incidents) {
      if (inc.status !== 'Resolved') {
        inc.status = 'Resolved';
        inc.resolvedAt = nowIso;
        inc.updatedAt = nowIso;
        inc.timeline.push({
          id: `tl-${Date.now()}-${inc.id}`,
          timestamp: nowIso,
          actor: 'Cathedral of Praise NOC',
          action: 'All Links Restored to GREEN (Good)',
          note: 'Bulk link restoration confirmed.',
          automated: true,
        });
      }
    }
    saveStore(store);
    res.json({ state: store });
  });

  // POST /api/escalations/evaluate
  app.post('/api/escalations/evaluate', (_req, res) => {
    const nowIso = new Date().toISOString();
    const actionsTaken: string[] = [];

    for (const inc of store.incidents) {
      if (inc.status === 'Resolved') continue;

      if (!inc.reportedToTelco) {
        inc.reportedToTelco = true;
        inc.reportedToTelcoAt = nowIso;
        inc.status = 'Waiting for Telco Repair';
        inc.updatedAt = nowIso;

        const emailDraft = buildProviderDispatchEmail(
          inc,
          'Auto-Created on Ticket Log'
        );
        store.emails.unshift({
          ...emailDraft,
          id: `email-${Date.now()}-${inc.id}`,
          timestamp: nowIso,
        });

        inc.timeline.push({
          id: `tl-${Date.now()}-${inc.id}`,
          timestamp: nowIso,
          actor: 'Automated Escalation Workflow (L1 Policy)',
          action: `Auto-Dispatched Unreported Ticket to ${inc.provider} NOC`,
          note: `Marked Reported to Telco = Yes and status updated to Waiting for Telco Repair.`,
          automated: true,
        });

        actionsTaken.push(
          `${inc.ticketNumber} (${inc.campusName} — ${inc.linkName}): Auto-sent Telco Outage Email to ${inc.providerNocEmail} & moved to Waiting for Telco Repair.`
        );
      } else if (
        inc.status === 'Waiting for Telco Repair' &&
        inc.escalationLevel === 'L1 - Campus NOC'
      ) {
        inc.escalationLevel =
          'L2 - Regional Network Lead & Telco Account Mgr';
        inc.updatedAt = nowIso;
        const chaser = buildProviderDispatchEmail(
          inc,
          'Telco Escalation Chaser'
        );
        store.emails.unshift({
          ...chaser,
          id: `email-${Date.now()}-${inc.id}-l2`,
          timestamp: nowIso,
        });
        inc.timeline.push({
          id: `tl-${Date.now()}-${inc.id}-l2`,
          timestamp: nowIso,
          actor: 'Automated Escalation Workflow (L2 Policy)',
          action:
            'Escalated to L2 Regional Lead & Dispatched Provider ETR Chaser',
          note: `Chaser email sent to ${inc.providerNocEmail}.`,
          automated: true,
        });
        actionsTaken.push(
          `${inc.ticketNumber} (${inc.campusName} — ${inc.linkName}): Escalated to L2 & sent ETR follow-up chaser to ${inc.provider}.`
        );
      }
    }

    saveStore(store);
    res.json({ actionsTaken, state: store });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Cathedral of Praise NOC server running on http://localhost:${PORT}`
    );
  });
}

startServer();
