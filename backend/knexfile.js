const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Use absolute path for database location
const dbPath = process.env.DATABASE_URL || path.resolve('./data/git-folder.db');

// Ensure the directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch (error) {
    console.log('Warning: Could not create database directory:', error.message);
  }
}

const config = {
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: dbPath
    },
    migrations: {
      directory: './src/database/migrations',
      extension: 'js'
    },
    seeds: {
      directory: './src/database/seeds'
    },
    useNullAsDefault: true
  },

  production: {
    client: 'better-sqlite3',
    connection: {
      filename: dbPath
    },
    migrations: {
      directory: './dist/database/migrations',
      extension: 'js'
    },
    useNullAsDefault: true,
    pool: {
      min: 1,
      max: 1  // SQLite doesn't support multiple connections
    }
  }
};

module.exports = config;