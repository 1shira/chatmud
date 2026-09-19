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

const genPlaceholderString = (param_amount: number, count: number) => {
  let s = "";
  for (let i = 0; i < count; i++) {
    s += "("
    for (let j = 1; j <= param_amount; j++) {
      s += `$${i * param_amount + j}`
      if (j < param_amount) s += ","
    }
    s += "),"
  }
  return s
}

const dbInsertMessage = (...messages: Message[]) => query(`
  INSERT INTO messages
  (mId, msg, t, from_user, channel, to_user, is_join, is_leave)
  VALUES 
  ${genPlaceholderString(7, messages.length)}
  `,
  messages.map(el => [
    el.id,
    el.msg,
    new Date(el.t * 1000).toISOString(),
    el.from_user,
    el.channel || "NULL",
    el.to_user || "NULL",
    el.is_join ? "TRUE" : "DEFAULT",
    el.is_leave ? "TRUE" : "DEFAULT",
  ]).flat())

export {
  dbInsertMessage,
 };
