const { Pool } = require('pg');

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Missing DATABASE_URL");
  
  const pool = new Pool({ connectionString });
  
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS user_roles (name VARCHAR(255) PRIMARY KEY, permissions JSONB DEFAULT '[]'::jsonb)`);
    await pool.query(`INSERT INTO user_roles (name, permissions) VALUES ('Admin', '["calendar_view", "calendar_book", "gantt_view", "gantt_edit", "admin"]') ON CONFLICT DO NOTHING`);
    await pool.query(`INSERT INTO user_roles (name, permissions) VALUES ('User', '["calendar_view", "calendar_book", "gantt_view"]') ON CONFLICT DO NOTHING`);
    console.log("Roles table and default roles inserted!");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
