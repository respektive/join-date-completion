const { Client } = require('pg');
require('dotenv').config();

class Database {
  constructor() {
    const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    this.client = new Client({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
    });
  }

  async connect() {
    try {
      await this.client.connect();
      console.log('Connected to Postgres');
    } catch (err) {
      console.error(`Error connecting to Postgres: ${err.message}`);
    }
  }

  async disconnect() {
    try {
      await this.client.end();
      console.log('Disconnected from Postgres');
    } catch (err) {
      console.error(`Error disconnecting from Postgres: ${err.message}`);
    }
  }

  async query(sql, values) {
    try {
      const result = await this.client.query(sql, values);
      return result.rows;
    } catch (err) {
      console.error(`Error running query: ${err.message}`);
      return [];
    }
  }
}

module.exports = Database;
