import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '..' });

const { PGUSER, PGPASSWORD, PGHOST, PGPORT, PGDATABASE } = process.env;

const pool = new pg.Pool({
  host: PGHOST,
  port: Number(PGPORT),
  user: PGUSER,
  password: PGPASSWORD,
  database: PGDATABASE,
});
const query = (text: string, params: string[]) => pool.query(text, params);

export {};
