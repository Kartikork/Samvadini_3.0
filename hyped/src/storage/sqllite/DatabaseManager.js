import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

/**
 * Singleton Database Manager for centralized database handling
 * Provides lazy initialization, PRAGMA settings, and migration management
 */
class DatabaseManager {
  constructor() {
    this._dbPromise = null;
    this._isInitialized = false;
    this._currentVersion = 1; // Update this when schema changes
    this._dbConfig = {
      name: 'td_delhi_10.db',
      location: 'default',
    };
  }

  /**
   * Get the database instance (lazy initialization)
   * @returns {Promise<SQLiteDatabase>} Database instance
   */
  async getDatabase() {
    if (!this._dbPromise) {
      this._dbPromise = this._initializeDatabase();
    }
    try {
      return await this._dbPromise;
    } catch (error) {
      // Reset the promise so we can try again
      this._dbPromise = null;
      this._isInitialized = false;
      throw error;
    }
  }

  /**
   * Private method to initialize database with PRAGMAs and migrations
   * @returns {Promise<SQLiteDatabase>} Initialized database instance
   */
  async _initializeDatabase() {
    try {

      // Open database connection
      const db = await SQLite.openDatabase(this._dbConfig);

      // First, try to set critical PRAGMAs that must be set outside transactions
      await this._setCriticalPragmas(db);

      // Set other PRAGMAs for performance and data integrity
      await this._setPragmas(db);

      // Run any necessary migrations
      await this._runMigrations(db);

      this._isInitialized = true;

      return db;
    } catch (error) {
      console.error('❌ Error initializing database:', error);
      this._dbPromise = null; // Reset promise on failure
      throw error;
    }
  }

  /**
   * Set critical PRAGMAs that must be set before any transactions
   * @param {SQLiteDatabase} db Database instance
   */
  async _setCriticalPragmas(db) {
    const criticalPragmas = [
      'PRAGMA journal_mode = WAL;',
      'PRAGMA synchronous = NORMAL;',
    ];

    for (const pragma of criticalPragmas) {
      try {
        await db.executeSql(pragma);
      } catch (error) {
        console.warn(`⚠️ Failed to set critical PRAGMA: ${pragma}`, error.message);
        // Continue with other PRAGMAs even if one fails
      }
    }
  }

  /**
   * Set database PRAGMAs for optimal performance and data integrity
   * @param {SQLiteDatabase} db Database instance
   */
  async _setPragmas(db) {
    // PRAGMAs that can be set anytime
    const safePragmas = [
      'PRAGMA foreign_keys = ON;',
      'PRAGMA cache_size = -8192;', // 8MB cache
      'PRAGMA automatic_index = ON;',
      'PRAGMA temp_store = MEMORY;',
    ];

    // PRAGMAs that can only be set outside transactions
    const transactionSensitivePragmas = [
      'PRAGMA journal_mode = WAL;',
      'PRAGMA synchronous = NORMAL;',
    ];

    try {
      // Set safe PRAGMAs first
      for (const pragma of safePragmas) {
        try {
          await db.executeSql(pragma);
        } catch (error) {
          console.warn(`⚠️ Failed to set PRAGMA: ${pragma}`, error.message);
        }
      }

      // Set transaction-sensitive PRAGMAs with special handling
      for (const pragma of transactionSensitivePragmas) {
        try {
          await db.executeSql(pragma);
        } catch (error) {
          if (error.message && error.message.includes('inside a transaction')) {
            console.warn(`⚠️ Skipping PRAGMA (in transaction): ${pragma}`);
          } else {
            console.warn(`⚠️ Failed to set PRAGMA: ${pragma}`, error.message);
          }
        }
      }

      // Run optimize at the end
      try {
        await db.executeSql('PRAGMA optimize;');
      } catch (error) {
        console.warn('⚠️ Failed to optimize database:', error.message);
      }

    } catch (error) {
      console.error('❌ Error setting PRAGMAs:', error);
      // Don't throw here - continue with database initialization even if some PRAGMAs fail
    }
  }

  /**
   * Run database migrations
   * @param {SQLiteDatabase} db Database instance
   */
  async _runMigrations(db) {
    try {
      // Create user_version table if it doesn't exist to track schema version
      await db.executeSql(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Get current schema version
      const [result] = await db.executeSql('SELECT MAX(version) as version FROM schema_version;');
      const currentVersion = result.rows.item(0).version || 0;

      // Run migrations if needed
      if (currentVersion < this._currentVersion) {
        await this._performMigrations(db, currentVersion);

        // Update schema version
        await db.executeSql(
          'INSERT INTO schema_version (version) VALUES (?);',
          [this._currentVersion]
        );

      }
    } catch (error) {
      console.error('❌ Error during migrations:', error);
      throw error;
    }
  }

  /**
   * Perform actual migrations based on version
   * @param {SQLiteDatabase} db Database instance
   * @param {number} fromVersion Current version
   */
  async _performMigrations(db, fromVersion) {
    // Add migration logic here as schema evolves
    // Example:
    // if (fromVersion < 1) {
    //   // Migration from version 0 to 1
    //   await db.executeSql('ALTER TABLE...');
    // }
    // if (fromVersion < 2) {
    //   // Migration from version 1 to 2
    //   await db.executeSql('CREATE INDEX...');
    // }

  }

  /**
   * Execute a transaction with automatic retry logic
   * @param {Function} transactionFn Function containing transaction logic
   * @param {number} retries Number of retry attempts
   * @returns {Promise<any>} Transaction result
   */
  async executeTransaction(transactionFn, retries = 3) {
    // Ensure database is initialized outside of transaction context
    const db = await this.getDatabase();

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await new Promise((resolve, reject) => {
          db.transaction(
            transactionFn,
            (error) => {
              console.error(`❌ Transaction failed (attempt ${attempt}/${retries}):`, error);
              if (attempt === retries) {
                reject(error);
              }
            },
            (result) => {
              resolve(result);
            }
          );
        });
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, attempt * 100));
      }
    }
  }

  /**
   * Ensure database is properly initialized
   * Call this before any critical operations
   * @returns {Promise<void>}
   */
  async ensureInitialized() {
    await this.getDatabase();
    return this._isInitialized;
  }

  /**
   * Execute a SQL query with parameters
   * @param {string} query SQL query
   * @param {Array} params Query parameters
   * @returns {Promise<Array>} Query results
   */
  async executeSql(query, params = []) {
    const db = await this.getDatabase();

    try {
      const [result] = await db.executeSql(query, params);
      return result;
    } catch (error) {
      console.error('❌ SQL execution error:', error, { query, params });
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async closeDatabase() {
    if (this._dbPromise) {
      try {
        const db = await this._dbPromise;
        await db.close();
      } catch (error) {
        console.error('❌ Error closing database:', error);
      } finally {
        this._dbPromise = null;
        this._isInitialized = false;
      }
    }
  }

  /**
   * Delete the entire database
   */
  async deleteDatabase() {
    try {
      // Close existing connection first
      await this.closeDatabase();

      // Delete the database file
      await SQLite.deleteDatabase(this._dbConfig);
    } catch (error) {
      console.error('❌ Error deleting database:', error);
      throw error;
    }
  }

  /**
   * Get database status information
   * @returns {Object} Database status
   */
  getStatus() {
    return {
      isInitialized: this._isInitialized,
      hasConnection: !!this._dbPromise,
      version: this._currentVersion,
      config: this._dbConfig
    };
  }

  /**
   * Perform database maintenance operations
   */
  async performMaintenance() {
    const db = await this.getDatabase();

    try {
      await db.executeSql('ANALYZE;');

      // Optimize database
      await db.executeSql('PRAGMA optimize;');

    } catch (error) {
      console.error('❌ Error during database maintenance:', error);
      throw error;
    }
  }

  /**
   * Initialize the database early in the app lifecycle
   * Call this in your App.js or main component before any database operations
   * 
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initializeDatabase() {
    try {
      await this.ensureInitialized();

      // Get the status to verify everything is working
      const status = this.getStatus();

      if (status.isInitialized) {
        return true;
      } else {
        console.warn('⚠️ Database initialization may not be complete');
        return false;
      }
    } catch (error) {
      console.error('❌ Database pre-initialization failed:', error);
      return false;
    }
  }

  /**
   * Initialize database with table creation
   * This ensures the database is ready and creates essential tables
   * 
   * @param {Array<Function>} tableCreators Array of table creation functions
   * @returns {Promise<boolean>} True if all tables created successfully
   */
  async initializeDatabaseWithTables(tableCreators = []) {
    try {
      // First ensure basic database initialization
      const initialized = await this.initializeDatabase();
      if (!initialized) {
        throw new Error('Basic database initialization failed');
      }

      // Create tables if provided
      if (tableCreators.length > 0) {

        for (const createTable of tableCreators) {
          try {
            await createTable();
          } catch (error) {
            console.error('❌ Failed to create table:', error);
            // Continue with other tables
          }
        }

      }

      return true;
    } catch (error) {
      console.error('❌ Database initialization with tables failed:', error);
      return false;
    }
  }

  /**
   * Safe database operation wrapper
   * Ensures database is initialized before executing operation
   * 
   * @param {Function} operation Database operation function
   * @param {string} operationName Name for logging
   * @returns {Promise<any>} Operation result
   */
  async safeExecute(operation, operationName = 'Database Operation') {
    try {
      // Ensure database is ready
      await this.ensureInitialized();

      // Execute the operation
      return await operation();
    } catch (error) {
      console.error(`❌ ${operationName} failed:`, error);

      // If it's a PRAGMA error, try to reinitialize
      if (error.message && error.message.includes('PRAGMA')) {
        try {
          await this.closeDatabase();
          await this.ensureInitialized();
          return await operation();
        } catch (retryError) {
          console.error(`❌ ${operationName} retry failed:`, retryError);
          throw retryError;
        }
      }

      throw error;
    }
  }

  /**
   * Check if database is properly initialized and healthy
   * 
   * @returns {Promise<Object>} Health check result
   */
  async checkDatabaseHealth() {
    try {
      const status = this.getStatus();

      // Try a simple query to verify database is working
      const result = await this.executeSql('SELECT 1 as test;');
      const isWorking = result.rows.length > 0;

      return {
        isHealthy: status.isInitialized && isWorking,
        status,
        testQuery: isWorking,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        isHealthy: false,
        error: error.message,
        status: this.getStatus(),
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create and export singleton instance
const databaseManager = new DatabaseManager();

export default databaseManager;

// Export convenience methods for easier migration
export const getDatabase = () => databaseManager.getDatabase();
export const executeSql = (query, params) => databaseManager.executeSql(query, params);
export const executeTransaction = (transactionFn, retries) => databaseManager.executeTransaction(transactionFn, retries);
export const ensureInitialized = () => databaseManager.ensureInitialized();
export const initializeDatabase = () => databaseManager.initializeDatabase();
export const initializeDatabaseWithTables = (tableCreators) => databaseManager.initializeDatabaseWithTables(tableCreators);
export const safeExecute = (operation, operationName) => databaseManager.safeExecute(operation, operationName);
export const checkDatabaseHealth = () => databaseManager.checkDatabaseHealth();
export const closeDatabase = () => databaseManager.closeDatabase();
export const deleteDatabase = () => databaseManager.deleteDatabase();
export const performMaintenance = () => databaseManager.performMaintenance();
export const getDatabaseStatus = () => databaseManager.getStatus();
