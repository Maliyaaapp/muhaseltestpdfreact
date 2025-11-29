const sqlite3 = require('sqlite3');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

/**
 * SQLite Database Service for offline capabilities
 * Manages local database operations and structure
 */
class SQLiteService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.dbPath = path.join(app.getPath('userData'), 'offline-database.sqlite');
  }

  /**
   * Initialize the SQLite database
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Ensure directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Create/open database
      await new Promise((resolve, reject) => {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            console.error('SQLite database error:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Enable foreign keys
      await this.run('PRAGMA foreign_keys = ON');

      // Create database schema
      await this.setupSchema();
      
      this.isInitialized = true;
      console.log('SQLite database initialized successfully');
    } catch (error) {
      console.error('SQLite initialization error:', error);
      throw error;
    }
  }

  /**
   * Create database tables based on MongoDB schema
   */
  async setupSchema() {
    // Users table - mirrors MongoDB User model
    await this.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        schoolId TEXT,
        gradeLevels TEXT,
        lastLogin TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        syncStatus TEXT DEFAULT 'synced',
        lastSynced TEXT
      )
    `);

    // Schools table - mirrors MongoDB School model
    await this.run(`
      CREATE TABLE IF NOT EXISTS schools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        phoneWhatsapp TEXT,
        phoneCall TEXT,
        address TEXT NOT NULL,
        location TEXT,
        active INTEGER DEFAULT 1,
        subscriptionStart TEXT NOT NULL,
        subscriptionEnd TEXT NOT NULL,
        logo TEXT,
        -- stamp TEXT, -- Stamp functionality removed
        settings TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        syncStatus TEXT DEFAULT 'synced',
        lastSynced TEXT
      )
    `);

    // Sync queue for offline operations
    await this.run(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity TEXT NOT NULL,
        entityId TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending'
      )
    `);

    // Index for faster sync operations
    await this.run('CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue (status)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_users_schoolId ON users (schoolId)');
  }

  /**
   * Execute SQL query and return all results
   */
  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('SQLite query error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Execute SQL query and return single result
   */
  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('SQLite query error:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Execute SQL command (INSERT, UPDATE, DELETE)
   */
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('SQLite run error:', err);
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Execute multiple statements in a transaction
   */
  async transaction(callback) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        try {
          const result = callback();
          this.db.run('COMMIT');
          resolve(result);
        } catch (error) {
          this.db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.isInitialized = false;
    }
  }

  // ----- User Operations ----- //

  /**
   * Get all users with optional filter
   */
  async getUsers(filter = {}) {
    await this.initialize();
    
    let sql = 'SELECT * FROM users';
    const values = [];
    
    if (Object.keys(filter).length > 0) {
      const conditions = [];
      
      // Build WHERE clause
      for (const [key, value] of Object.entries(filter)) {
        if (value === null) {
          conditions.push(`${key} IS NULL`);
        } else {
          conditions.push(`${key} = ?`);
          values.push(value);
        }
      }
      
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }
    
    const users = await this.all(sql, values);
    
    // Parse JSON fields
    return users.map(user => ({
      ...user,
      gradeLevels: user.gradeLevels ? JSON.parse(user.gradeLevels) : []
    }));
  }

  /**
   * Get user by ID
   */
  async getUserById(id) {
    await this.initialize();
    
    const user = await this.get('SELECT * FROM users WHERE id = ?', [id]);
    
    if (user) {
      return {
        ...user,
        gradeLevels: user.gradeLevels ? JSON.parse(user.gradeLevels) : []
      };
    }
    
    return null;
  }

  /**
   * Find user by email or username
   */
  async findUserByCredentials(emailOrUsername) {
    await this.initialize();
    
    const user = await this.get(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [emailOrUsername, emailOrUsername]
    );
    
    if (user) {
      return {
        ...user,
        gradeLevels: user.gradeLevels ? JSON.parse(user.gradeLevels) : []
      };
    }
    
    return null;
  }

  /**
   * Create new user
   */
  async createUser(userData) {
    await this.initialize();
    
    const timestamp = new Date().toISOString();
    const id = userData.id || uuidv4();
    
    const user = {
      id,
      name: userData.name,
      email: userData.email,
      username: userData.username,
      password: userData.password,
      role: userData.role,
      schoolId: userData.schoolId || null,
      gradeLevels: JSON.stringify(userData.gradeLevels || []),
      lastLogin: userData.lastLogin || null,
      createdAt: userData.createdAt || timestamp,
      updatedAt: userData.updatedAt || timestamp,
      syncStatus: 'pending',
      lastSynced: null
    };
    
    await this.run(
      `INSERT INTO users 
       (id, name, email, username, password, role, schoolId, gradeLevels, lastLogin, createdAt, updatedAt, syncStatus, lastSynced) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id, user.name, user.email, user.username, user.password, user.role,
        user.schoolId, user.gradeLevels, user.lastLogin, user.createdAt, user.updatedAt,
        user.syncStatus, user.lastSynced
      ]
    );
    
    // Add to sync queue
    await this.addToSyncQueue('users', user.id, 'create', user);
    
    return {
      ...user,
      gradeLevels: userData.gradeLevels || []
    };
  }

  /**
   * Update user
   */
  async updateUser(id, userData) {
    await this.initialize();
    
    const user = await this.getUserById(id);
    
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    const timestamp = new Date().toISOString();
    const updatedUser = {
      ...user,
      ...userData,
      gradeLevels: JSON.stringify(userData.gradeLevels || user.gradeLevels || []),
      updatedAt: timestamp,
      syncStatus: 'pending',
      lastSynced: user.lastSynced
    };
    
    const fields = Object.keys(updatedUser)
      .filter(key => key !== 'id') // Exclude id from update
      .map(field => `${field} = ?`).join(', ');
    
    const values = Object.keys(updatedUser)
      .filter(key => key !== 'id')
      .map(key => updatedUser[key]);
    
    values.push(id); // Add ID for WHERE clause
    
    await this.run(`UPDATE users SET ${fields} WHERE id = ?`, values);
    
    // Add to sync queue
    await this.addToSyncQueue('users', id, 'update', updatedUser);
    
    return {
      ...updatedUser,
      gradeLevels: userData.gradeLevels || user.gradeLevels || []
    };
  }

  /**
   * Delete user
   */
  async deleteUser(id) {
    await this.initialize();
    
    const user = await this.getUserById(id);
    
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    await this.run('DELETE FROM users WHERE id = ?', [id]);
    
    // Add to sync queue
    await this.addToSyncQueue('users', id, 'delete', { id });
    
    return true;
  }

  // ----- School Operations ----- //

  /**
   * Get all schools with optional filter
   */
  async getSchools(filter = {}) {
    await this.initialize();
    
    let sql = 'SELECT * FROM schools';
    const values = [];
    
    if (Object.keys(filter).length > 0) {
      const conditions = [];
      
      for (const [key, value] of Object.entries(filter)) {
        if (value === null) {
          conditions.push(`${key} IS NULL`);
        } else {
          conditions.push(`${key} = ?`);
          values.push(value);
        }
      }
      
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
    }
    
    const schools = await this.all(sql, values);
    
    // Parse JSON fields
    return schools.map(school => ({
      ...school,
      settings: school.settings ? JSON.parse(school.settings) : {},
      active: !!school.active
    }));
  }

  /**
   * Get school by ID
   */
  async getSchoolById(id) {
    await this.initialize();
    
    const school = await this.get('SELECT * FROM schools WHERE id = ?', [id]);
    
    if (school) {
      return {
        ...school,
        settings: school.settings ? JSON.parse(school.settings) : {},
        active: !!school.active
      };
    }
    
    return null;
  }

  /**
   * Create new school
   */
  async createSchool(schoolData) {
    await this.initialize();
    
    const timestamp = new Date().toISOString();
    const id = schoolData.id || uuidv4();
    
    const school = {
      id,
      name: schoolData.name,
      email: schoolData.email,
      phone: schoolData.phone,
      phoneWhatsapp: schoolData.phoneWhatsapp || '',
      phoneCall: schoolData.phoneCall || '',
      address: schoolData.address,
      location: schoolData.location || '',
      active: schoolData.active !== undefined ? schoolData.active ? 1 : 0 : 1,
      subscriptionStart: schoolData.subscriptionStart,
      subscriptionEnd: schoolData.subscriptionEnd,
      logo: schoolData.logo || '',
      stamp: '', // Stamp functionality removed
      settings: JSON.stringify(schoolData.settings || {}),
      createdAt: schoolData.createdAt || timestamp,
      updatedAt: schoolData.updatedAt || timestamp,
      syncStatus: 'pending',
      lastSynced: null
    };
    
    await this.run(
      `INSERT INTO schools 
       (id, name, email, phone, phoneWhatsapp, phoneCall, address, location, active, 
        subscriptionStart, subscriptionEnd, logo, stamp, settings, createdAt, updatedAt, syncStatus, lastSynced) -- stamp column kept for compatibility 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        school.id, school.name, school.email, school.phone, school.phoneWhatsapp,
        school.phoneCall, school.address, school.location, school.active,
        school.subscriptionStart, school.subscriptionEnd, school.logo, '', -- school.stamp removed
        school.settings, school.createdAt, school.updatedAt, school.syncStatus, school.lastSynced
      ]
    );
    
    // Add to sync queue
    await this.addToSyncQueue('schools', school.id, 'create', school);
    
    return {
      ...school,
      settings: schoolData.settings || {},
      active: !!school.active
    };
  }

  /**
   * Update school
   */
  async updateSchool(id, schoolData) {
    await this.initialize();
    
    const school = await this.getSchoolById(id);
    
    if (!school) {
      throw new Error(`School with ID ${id} not found`);
    }
    
    const timestamp = new Date().toISOString();
    
    // Prepare settings
    let settings = school.settings;
    if (schoolData.settings) {
      settings = { ...settings, ...schoolData.settings };
    }
    
    const updatedSchool = {
      ...school,
      ...schoolData,
      settings: JSON.stringify(settings),
      active: schoolData.active !== undefined ? schoolData.active ? 1 : 0 : school.active ? 1 : 0,
      updatedAt: timestamp,
      syncStatus: 'pending',
      lastSynced: school.lastSynced
    };
    
    const fields = Object.keys(updatedSchool)
      .filter(key => key !== 'id') // Exclude id from update
      .map(field => `${field} = ?`).join(', ');
    
    const values = Object.keys(updatedSchool)
      .filter(key => key !== 'id')
      .map(key => updatedSchool[key]);
    
    values.push(id); // Add ID for WHERE clause
    
    await this.run(`UPDATE schools SET ${fields} WHERE id = ?`, values);
    
    // Add to sync queue
    await this.addToSyncQueue('schools', id, 'update', updatedSchool);
    
    return {
      ...updatedSchool,
      settings: settings,
      active: !!updatedSchool.active
    };
  }

  /**
   * Delete school
   */
  async deleteSchool(id) {
    await this.initialize();
    
    const school = await this.getSchoolById(id);
    
    if (!school) {
      throw new Error(`School with ID ${id} not found`);
    }
    
    await this.run('DELETE FROM schools WHERE id = ?', [id]);
    
    // Add to sync queue
    await this.addToSyncQueue('schools', id, 'delete', { id });
    
    return true;
  }

  // ----- Sync Queue Operations ----- //

  /**
   * Add operation to sync queue
   */
  async addToSyncQueue(entity, entityId, operation, data) {
    await this.initialize();
    
    const timestamp = new Date().toISOString();
    
    await this.run(
      `INSERT INTO sync_queue (entity, entityId, operation, data, timestamp, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [entity, entityId, operation, JSON.stringify(data), timestamp, 'pending']
    );
  }

  /**
   * Get pending sync operations
   */
  async getPendingSyncOperations() {
    await this.initialize();
    
    const operations = await this.all(
      "SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY timestamp ASC"
    );
    
    return operations.map(op => ({
      ...op,
      data: JSON.parse(op.data)
    }));
  }

  /**
   * Update sync operation status
   */
  async updateSyncOperationStatus(id, status) {
    await this.initialize();
    
    await this.run(
      "UPDATE sync_queue SET status = ?, attempts = attempts + 1 WHERE id = ?",
      [status, id]
    );
  }

  /**
   * Mark entity as synced
   */
  async markEntitySynced(entity, entityId) {
    await this.initialize();
    
    const timestamp = new Date().toISOString();
    
    await this.run(
      `UPDATE ${entity} SET syncStatus = 'synced', lastSynced = ? WHERE id = ?`,
      [timestamp, entityId]
    );
  }

  /**
   * Count users by role
   */
  async countUsersByRole(role) {
    await this.initialize();
    
    const result = await this.get(
      'SELECT COUNT(*) as count FROM users WHERE role = ?',
      [role]
    );
    
    return result.count;
  }

  /**
   * Clear sync queue
   */
  async clearSyncQueue() {
    await this.initialize();
    
    await this.run('DELETE FROM sync_queue');
  }
}

module.exports = new SQLiteService();