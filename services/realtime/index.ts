/**
 * FlowDeck Real-Time Collaboration Service
 * -----------------------------------------
 * Socket.IO server providing:
 *   - Presence / cursor awareness per project & task
 *   - Live task mutations (update, move, create, delete)
 *   - Real-time comments
 *   - Typing indicators
 *   - Activity feed broadcasting
 *   - Room-based project collaboration
 *
 * Port: 3010
 * Caddy path: / (forwarded via XTransformPort=3010)
 */

import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConnectedUser {
  id: string;
  name: string;
  avatar?: string;
  socketId: string;
  currentProjectId: string | null;
  currentTaskId: string | null;
  joinedAt: number;
}

interface CursorPosition {
  userId: string;
  taskId: string;
  field: string;
  cursorOffset?: number;
  selectionStart?: number;
  selectionEnd?: number;
}

interface TypingIndicator {
  userId: string;
  userName: string;
  taskId: string;
  field: string;
}

// Event payloads from clients
interface JoinProjectPayload {
  userId: string;
  userName: string;
  avatar?: string;
  projectId: string;
}

interface LeaveProjectPayload {
  projectId: string;
}

interface FocusTaskPayload {
  taskId: string;
}

interface BlurTaskPayload {
  taskId: string;
}

interface CursorMovePayload {
  taskId: string;
  field: string;
  cursorOffset?: number;
  selectionStart?: number;
  selectionEnd?: number;
}

interface TypingPayload {
  taskId: string;
  field: string;
}

interface StopTypingPayload {
  taskId: string;
  field: string;
}

interface TaskUpdatePayload {
  taskId: string;
  projectId: string;
  changes: Record<string, unknown>;
}

interface TaskMovePayload {
  taskId: string;
  projectId: string;
  newStatus?: string;
  newIndex?: number;
  newStartDate?: string;
  newDuration?: number;
}

interface TaskCreatePayload {
  taskId: string;
  projectId: string;
  task: Record<string, unknown>;
}

interface TaskDeletePayload {
  taskId: string;
  projectId: string;
}

interface CommentPayload {
  commentId: string;
  taskId: string;
  projectId: string;
  authorId: string;
  authorName: string;
  text: string;
  parentId?: string | null;
}

interface CommentDeletePayload {
  commentId: string;
  taskId: string;
  projectId: string;
}

interface ReactionPayload {
  commentId: string;
  taskId: string;
  projectId: string;
  userId: string;
  emoji: string;
}

interface ActivityPayload {
  projectId: string;
  taskId: string;
  activity: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------

const httpServer = createServer();
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const PORT = 3010;

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

/** Map<socketId, ConnectedUser> */
const users = new Map<string, ConnectedUser>();

/** Map<projectId, Set<socketId>> */
const projectRooms = new Map<string, Set<string>>();

/** Map<taskId, Map<socketId, CursorPosition>> */
const taskCursors = new Map<string, Map<string, CursorPosition>>();

/** Map<taskId, Map<socketId, TypingIndicator>> */
const typingUsers = new Map<string, Map<string, TypingIndicator>>();

/** Typing throttle timers per user-field combination */
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const genId = (): string =>
  Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

function getUser(socketId: string): ConnectedUser | undefined {
  return users.get(socketId);
}

function getProjectMembers(projectId: string): ConnectedUser[] {
  const sockets = projectRooms.get(projectId);
  if (!sockets) return [];
  return Array.from(sockets)
    .map((sid) => users.get(sid))
    .filter((u): u is ConnectedUser => !!u);
}

function joinProjectRoom(socketId: string, projectId: string) {
 const socket = io.sockets.sockets.get(socketId);
 if (!socket) return;
  socket.join(projectId);
  if (!projectRooms.has(projectId)) {
    projectRooms.set(projectId, new Set());
  }
  projectRooms.get(projectId)!.add(socketId);
}

function leaveProjectRoom(socketId: string, projectId: string) {
  const socket = io.sockets.sockets.get(socketId);
  if (!socket) return;
  socket.leave(projectId);
  const room = projectRooms.get(projectId);
  if (room) {
    room.delete(socketId);
    if (room.size === 0) projectRooms.delete(projectId);
  }
}

function broadcastProjectPresence(projectId: string) {
  const members = getProjectMembers(projectId);
  io.to(projectId).emit('presence:members', {
    projectId,
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      currentTaskId: m.currentTaskId,
    })),
  });
}

function broadcastTaskFocusers(taskId: string, projectId: string) {
  const roomSockets = projectRooms.get(projectId);
  if (!roomSockets) return;
  const focusers: { userId: string; userName: string; avatar?: string }[] = [];
  for (const sid of roomSockets) {
    const u = users.get(sid);
    if (u && u.currentTaskId === taskId) {
      focusers.push({ userId: u.id, userName: u.name, avatar: u.avatar });
    }
  }
  io.to(projectId).emit('task:focusers', { taskId, focusers });
}

// ---------------------------------------------------------------------------
// Connection lifecycle
// ---------------------------------------------------------------------------

io.on('connection', (socket: Socket) => {
  console.log(`[realtime] connected: ${socket.id}`);

  // ---- Auth / Identify ----
  socket.on('user:identify', (data: { userId: string; userName: string; avatar?: string }) => {
    const user: ConnectedUser = {
      id: data.userId,
      name: data.userName,
      avatar: data.avatar,
      socketId: socket.id,
      currentProjectId: null,
      currentTaskId: null,
      joinedAt: Date.now(),
    };
    users.set(socket.id, user);
    console.log(`[realtime] user identified: ${data.userName} (${data.userId})`);
    socket.emit('user:identified', { success: true, userId: data.userId });
  });

  // ---- Project rooms ----
  socket.on('project:join', (data: JoinProjectPayload) => {
    const user = getUser(socket.id);
    if (!user) return;

    // Leave previous project if any
    if (user.currentProjectId) {
      leaveProjectRoom(socket.id, user.currentProjectId);
      io.to(user.currentProjectId).emit('presence:left', {
        projectId: user.currentProjectId,
        userId: user.id,
        userName: user.name,
      });
      broadcastProjectPresence(user.currentProjectId);
    }

    user.currentProjectId = data.projectId;
    user.currentTaskId = null;
    joinProjectRoom(socket.id, data.projectId);

    // Send current presence to the joining user
    const members = getProjectMembers(data.projectId);
    socket.emit('presence:members', {
      projectId: data.projectId,
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        avatar: m.avatar,
        currentTaskId: m.currentTaskId,
      })),
    });

    // Notify others
    socket.to(data.projectId).emit('presence:joined', {
      projectId: data.projectId,
      user: { id: user.id, name: user.name, avatar: user.avatar },
    });
    broadcastProjectPresence(data.projectId);

    console.log(`[realtime] ${user.name} joined project ${data.projectId}`);
  });

  socket.on('project:leave', (data: LeaveProjectPayload) => {
    const user = getUser(socket.id);
    if (!user || user.currentProjectId !== data.projectId) return;

    // Clear task focus
    if (user.currentTaskId) {
      broadcastTaskFocusers(user.currentTaskId, data.projectId);
      // Clear cursors & typing
      clearUserStateForTask(socket.id, user.currentTaskId, data.projectId);
    }

    io.to(data.projectId).emit('presence:left', {
      projectId: data.projectId,
      userId: user.id,
      userName: user.name,
    });

    leaveProjectRoom(socket.id, data.projectId);
    user.currentProjectId = null;
    user.currentTaskId = null;
    broadcastProjectPresence(data.projectId);

    console.log(`[realtime] ${user.name} left project ${data.projectId}`);
  });

  // ---- Task focus / blur ----
  socket.on('task:focus', (data: FocusTaskPayload) => {
    const user = getUser(socket.id);
    if (!user || !user.currentProjectId) return;

    user.currentTaskId = data.taskId;
    broadcastTaskFocusers(data.taskId, user.currentProjectId);
    broadcastProjectPresence(user.currentProjectId);
  });

  socket.on('task:blur', (data: BlurTaskPayload) => {
    const user = getUser(socket.id);
    if (!user || !user.currentProjectId) return;

    const prevTaskId = user.currentTaskId;
    user.currentTaskId = null;

    if (prevTaskId) {
      // Clear cursors & typing for the blurred task
      clearUserStateForTask(socket.id, prevTaskId, user.currentProjectId);
      broadcastTaskFocusers(prevTaskId, user.currentProjectId);
    }
    broadcastProjectPresence(user.currentProjectId);
  });

  // ---- Cursor positions ----
  socket.on('cursor:move', (data: CursorMovePayload) => {
    const user = getUser(socket.id);
    if (!user || !user.currentProjectId) return;

    if (!taskCursors.has(data.taskId)) {
      taskCursors.set(data.taskId, new Map());
    }
    const cursors = taskCursors.get(data.taskId)!;
    cursors.set(socket.id, {
      userId: user.id,
      taskId: data.taskId,
      field: data.field,
      cursorOffset: data.cursorOffset,
      selectionStart: data.selectionStart,
      selectionEnd: data.selectionEnd,
    });

    socket.to(user.currentProjectId).emit('cursor:update', {
      taskId: data.taskId,
      userId: user.id,
      userName: user.name,
      field: data.field,
      cursorOffset: data.cursorOffset,
      selectionStart: data.selectionStart,
      selectionEnd: data.selectionEnd,
    });
  });

  // ---- Typing indicators ----
  socket.on('typing:start', (data: TypingPayload) => {
    const user = getUser(socket.id);
    if (!user || !user.currentProjectId) return;

    const key = `${socket.id}:${data.taskId}:${data.field}`;

    // Clear any existing timer
    const existing = typingTimers.get(key);
    if (existing) clearTimeout(existing);

    // Set auto-stop timer (3 seconds of inactivity)
    const timer = setTimeout(() => {
      removeTypingUser(socket.id, data.taskId, data.field, user.currentProjectId!);
      typingTimers.delete(key);
    }, 3000);
    typingTimers.set(key, timer);

    // Add to typing map
    if (!typingUsers.has(data.taskId)) {
      typingUsers.set(data.taskId, new Map());
    }
    const taskTyping = typingUsers.get(data.taskId)!;
    const fieldKey = `${socket.id}:${data.field}`;
    taskTyping.set(fieldKey, {
      userId: user.id,
      userName: user.name,
      taskId: data.taskId,
      field: data.field,
    });

    // Broadcast typing list for this task
    emitTypingUsers(data.taskId, user.currentProjectId);
  });

  socket.on('typing:stop', (data: StopTypingPayload) => {
    const user = getUser(socket.id);
    if (!user || !user.currentProjectId) return;
    removeTypingUser(socket.id, data.taskId, data.field, user.currentProjectId);
  });

  // ---- Task mutations ----
  socket.on('task:update', (data: TaskUpdatePayload) => {
    const user = getUser(socket.id);
    if (!user) return;

    // Broadcast to all in the project room (including sender for consistency)
    io.to(data.projectId).emit('task:updated', {
      taskId: data.taskId,
      projectId: data.projectId,
      changes: data.changes,
      actorId: user.id,
      actorName: user.name,
      timestamp: new Date().toISOString(),
    });

    console.log(`[realtime] task:update ${data.taskId} by ${user.name}`);
  });

  socket.on('task:move', (data: TaskMovePayload) => {
    const user = getUser(socket.id);
    if (!user) return;

    io.to(data.projectId).emit('task:moved', {
      taskId: data.taskId,
      projectId: data.projectId,
      newStatus: data.newStatus,
      newIndex: data.newIndex,
      newStartDate: data.newStartDate,
      newDuration: data.newDuration,
      actorId: user.id,
      actorName: user.name,
      timestamp: new Date().toISOString(),
    });

    console.log(`[realtime] task:move ${data.taskId} by ${user.name}`);
  });

  socket.on('task:create', (data: TaskCreatePayload) => {
    const user = getUser(socket.id);
    if (!user) return;

    io.to(data.projectId).emit('task:created', {
      taskId: data.taskId,
      projectId: data.projectId,
      task: data.task,
      actorId: user.id,
      actorName: user.name,
      timestamp: new Date().toISOString(),
    });

    console.log(`[realtime] task:create ${data.taskId} by ${user.name}`);
  });

  socket.on('task:delete', (data: TaskDeletePayload) => {
    const user = getUser(socket.id);
    if (!user) return;

    io.to(data.projectId).emit('task:deleted', {
      taskId: data.taskId,
      projectId: data.projectId,
      actorId: user.id,
      actorName: user.name,
      timestamp: new Date().toISOString(),
    });

    console.log(`[realtime] task:delete ${data.taskId} by ${user.name}`);
  });

  // ---- Comments ----
  socket.on('comment:add', (data: CommentPayload) => {
    const user = getUser(socket.id);
    if (!user) return;

    io.to(data.projectId).emit('comment:added', {
      commentId: data.commentId,
      taskId: data.taskId,
      projectId: data.projectId,
      authorId: data.authorId,
      authorName: data.authorName,
      text: data.text,
      parentId: data.parentId ?? null,
      timestamp: new Date().toISOString(),
    });

    console.log(`[realtime] comment:add on ${data.taskId} by ${user.name}`);
  });

  socket.on('comment:edit', (data: CommentPayload & { edited: boolean }) => {
    const user = getUser(socket.id);
    if (!user) return;

    io.to(data.projectId).emit('comment:edited', {
      commentId: data.commentId,
      taskId: data.taskId,
      projectId: data.projectId,
      text: data.text,
      edited: data.edited,
      actorId: user.id,
      actorName: user.name,
      timestamp: new Date().toISOString(),
    });

    console.log(`[realtime] comment:edit ${data.commentId} by ${user.name}`);
  });

  socket.on('comment:delete', (data: CommentDeletePayload) => {
    const user = getUser(socket.id);
    if (!user) return;

    io.to(data.projectId).emit('comment:deleted', {
      commentId: data.commentId,
      taskId: data.taskId,
      projectId: data.projectId,
      actorId: user.id,
      actorName: user.name,
      timestamp: new Date().toISOString(),
    });

    console.log(`[realtime] comment:delete ${data.commentId} by ${user.name}`);
  });

  // ---- Reactions ----
  socket.on('reaction:toggle', (data: ReactionPayload) => {
    const user = getUser(socket.id);
    if (!user) return;

    io.to(data.projectId).emit('reaction:toggled', {
      commentId: data.commentId,
      taskId: data.taskId,
      projectId: data.projectId,
      userId: data.userId,
      emoji: data.emoji,
      timestamp: new Date().toISOString(),
    });

    console.log(`[realtime] reaction:toggle ${data.emoji} on ${data.commentId} by ${user.name}`);
  });

  // ---- Activity feed ----
  socket.on('activity:broadcast', (data: ActivityPayload) => {
    const user = getUser(socket.id);
    if (!user) return;

    io.to(data.projectId).emit('activity:new', {
      id: genId(),
      projectId: data.projectId,
      taskId: data.taskId,
      ...data.activity,
      actorId: user.id,
      actorName: user.name,
      timestamp: new Date().toISOString(),
    });
  });

  // ---- Heartbeat / ping-pong for connection quality ----
  socket.on('ping', () => {
    socket.emit('pong', { ts: Date.now() });
  });

  // ---- Disconnect ----
  socket.on('disconnect', (reason) => {
    const user = getUser(socket.id);
    if (!user) {
      console.log(`[realtime] disconnected (unidentified): ${socket.id} (${reason})`);
      return;
    }

    console.log(`[realtime] disconnected: ${user.name} (${reason})`);

    // Clean up project presence
    if (user.currentProjectId) {
      io.to(user.currentProjectId).emit('presence:left', {
        projectId: user.currentProjectId,
        userId: user.id,
        userName: user.name,
      });

      // Clean up task focus & cursors
      if (user.currentTaskId) {
        clearUserStateForTask(socket.id, user.currentTaskId, user.currentProjectId);
        broadcastTaskFocusers(user.currentTaskId, user.currentProjectId);
      }

      leaveProjectRoom(socket.id, user.currentProjectId);
      broadcastProjectPresence(user.currentProjectId);
    }

    // Clean up typing timers
    for (const [key, timer] of typingTimers.entries()) {
      if (key.startsWith(socket.id)) {
        clearTimeout(timer);
        typingTimers.delete(key);
      }
    }

    users.delete(socket.id);
  });

  socket.on('error', (err) => {
    console.error(`[realtime] socket error (${socket.id}):`, err);
  });
});

// ---------------------------------------------------------------------------
// Helpers (continued)
// ---------------------------------------------------------------------------

function removeTypingUser(socketId: string, taskId: string, field: string, projectId: string) {
  const taskTyping = typingUsers.get(taskId);
  if (!taskTyping) return;

  const fieldKey = `${socketId}:${field}`;
  taskTyping.delete(fieldKey);

  if (taskTyping.size === 0) {
    typingUsers.delete(taskId);
  }

  // Clear timer
  const timerKey = `${socketId}:${taskId}:${field}`;
  const timer = typingTimers.get(timerKey);
  if (timer) {
    clearTimeout(timer);
    typingTimers.delete(timerKey);
  }

  emitTypingUsers(taskId, projectId);
}

function emitTypingUsers(taskId: string, projectId: string) {
  const taskTyping = typingUsers.get(taskId);
  const typingList = taskTyping
    ? Array.from(taskTyping.values()).map((t) => ({
        userId: t.userId,
        userName: t.userName,
        field: t.field,
      }))
    : [];

  io.to(projectId).emit('typing:users', {
    taskId,
    users: typingList,
  });
}

function clearUserStateForTask(socketId: string, taskId: string, projectId: string) {
  // Clear cursors
  const cursors = taskCursors.get(taskId);
  if (cursors) {
    cursors.delete(socketId);
    if (cursors.size === 0) taskCursors.delete(taskId);
    else {
      io.to(projectId).emit('cursor:clear', { taskId, userId: socketId });
    }
  }

  // Clear all typing for this user on this task
  const taskTyping = typingUsers.get(taskId);
  if (taskTyping) {
    for (const [fieldKey] of taskTyping) {
      if (fieldKey.startsWith(socketId)) {
        const field = fieldKey.split(':').slice(1).join(':');
        const timerKey = `${socketId}:${taskId}:${field}`;
        const timer = typingTimers.get(timerKey);
        if (timer) {
          clearTimeout(timer);
          typingTimers.delete(timerKey);
        }
      }
    }
    // Remove all entries for this socket
    for (const [fieldKey] of taskTyping) {
      if (fieldKey.startsWith(socketId)) taskTyping.delete(fieldKey);
    }
    if (taskTyping.size === 0) typingUsers.delete(taskId);
    emitTypingUsers(taskId, projectId);
  }
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

httpServer.listen(PORT, () => {
  console.log(`[realtime] FlowDeck real-time collaboration service running on port ${PORT}`);
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`[realtime] Received ${signal}, shutting down...`);

  // Clear all typing timers
  for (const [, timer] of typingTimers) clearTimeout(timer);
  typingTimers.clear();

  io.close(() => {
    console.log('[realtime] Socket.IO closed');
    httpServer.close(() => {
      console.log('[realtime] HTTP server closed');
      process.exit(0);
    });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
