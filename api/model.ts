import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.' });

const pool = new pg.Pool();
const query = (text: string, params: string[]) => pool.query(text, params);

export {};
