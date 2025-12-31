const { Pool } = require("pg");


const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "academic_platform",
  password: "Baricho85",
  port: 5432,
});

module.exports = pool;
