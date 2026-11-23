import { evaluate } from './engine.js';

let connection;
self.onmessage = async ({data}) => {
  try {
    connection ??= import('./vendor/index.js').then(({PGlite}) => PGlite.create());
    const db = await connection;
    const value = await evaluate(db, data.chapter, data.task, data.sql, data.verify);
    self.postMessage(value);
  } catch (error) {
    self.postMessage({error: error.message, hint: error.hint});
  }
};
