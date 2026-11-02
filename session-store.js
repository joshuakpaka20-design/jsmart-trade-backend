const session = require('express-session');

class SQLiteSessionStore extends session.Store {
  constructor(database) {
    super();
    this.database = database;
    this.getStatement = database.prepare('SELECT session_json, expires_at FROM web_sessions WHERE sid = ?');
    this.setStatement = database.prepare(`
      INSERT INTO web_sessions (sid, session_json, expires_at) VALUES (?, ?, ?)
      ON CONFLICT(sid) DO UPDATE SET session_json = excluded.session_json, expires_at = excluded.expires_at
    `);
    this.touchStatement = database.prepare('UPDATE web_sessions SET expires_at = ? WHERE sid = ?');
    this.destroyStatement = database.prepare('DELETE FROM web_sessions WHERE sid = ?');
    this.pruneStatement = database.prepare('DELETE FROM web_sessions WHERE expires_at <= ?');
  }

  get(sessionId, callback) {
    try {
      const row = this.getStatement.get(sessionId);
      if (!row) return callback(null, null);
      if (row.expires_at <= Date.now()) {
        this.destroyStatement.run(sessionId);
        return callback(null, null);
      }
      return callback(null, JSON.parse(row.session_json));
    } catch (error) {
      return callback(error);
    }
  }

  set(sessionId, sessionData, callback = () => {}) {
    try {
      const maxAge = sessionData.cookie?.maxAge || 24 * 60 * 60 * 1000;
      const expiresAt = sessionData.cookie?.expires
        ? Date.parse(sessionData.cookie.expires)
        : Date.now() + maxAge;
      this.pruneStatement.run(Date.now());
      this.setStatement.run(sessionId, JSON.stringify(sessionData), expiresAt);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  touch(sessionId, sessionData, callback = () => {}) {
    try {
      const maxAge = sessionData.cookie?.maxAge || 24 * 60 * 60 * 1000;
      const expiresAt = sessionData.cookie?.expires
        ? Date.parse(sessionData.cookie.expires)
        : Date.now() + maxAge;
      this.touchStatement.run(expiresAt, sessionId);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  destroy(sessionId, callback = () => {}) {
    try {
      this.destroyStatement.run(sessionId);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }
}

module.exports = SQLiteSessionStore;