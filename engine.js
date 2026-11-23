import { chapters, seed } from './content.js';

function lastTable(results) {
  return results.findLast(result => result.fields.length);
}

function signature(result, ordered) {
  if (!result) return '';
  const rows = result.rows.map(row => JSON.stringify(row, (_, value) =>
    typeof value === 'bigint' ? String(value) : value));
  return JSON.stringify([result.fields.map(field => field.name), ordered ? rows : rows.sort()]);
}

async function inspect(db, rule) {
  const query = typeof rule === 'string' ? rule : rule.query;
  if (query) return lastTable(await db.exec(query, {rowMode:'array'}));
  const columns = await db.query(
    'select column_name, data_type, is_nullable from information_schema.columns where table_schema=$1 and table_name=$2',
    ['public', rule.table], {rowMode:'array'});
  for (const statement of rule.valid) await db.exec(statement);
  for (const [statement, expectedCode] of rule.invalid) {
    let code;
    try { await db.exec(statement); } catch (error) { code = error.code; }
    if (code !== expectedCode) throw new Error('Ограничение пропускает недопустимые данные или срабатывает по другой причине.');
  }
  return columns;
}

export async function evaluate(db, chapter, task, sql, verify) {
  const [, , , answer, rule] = chapters[chapter][3][task];
  const stateCheck = typeof rule === 'string' || (rule && typeof rule === 'object');
  const reset = async () => {
    await db.exec('ROLLBACK; RESET ALL; DROP SCHEMA IF EXISTS workshop CASCADE;');
    await db.exec(seed);
  };
  let expected;
  let expectedOutput;
  if (verify) {
    await reset();
    const example = await db.exec(answer, {rowMode:'array'});
    expected = stateCheck ? await inspect(db, rule) : lastTable(example);
    if (rule?.output) expectedOutput = lastTable(example);
  }
  await reset();
  const results = await db.exec(sql, {rowMode:'array'});
  let passed = false;
  let detail = '';
  if (verify) {
    try {
      const actual = stateCheck ? await inspect(db, rule) : lastTable(results);
      passed = signature(actual, rule === true) === signature(expected, rule === true);
      if (passed && rule?.output) {
        passed = signature(lastTable(results), rule.ordered) === signature(expectedOutput, rule.ordered);
        if (!passed) detail = 'Изменения в таблице верные. Проверь итоговый SELECT.';
      }
    } catch (error) {
      detail = error.message;
    }
  }
  return {results, passed, detail};
}
