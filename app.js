import { chapters, legacyPages, seed } from './content.js';
import { theoryLessons, taskHints } from './study.js';

const byId = id => document.getElementById(id);
const editor = byId('sql');
const tasks = byId('tasks');
const output = byId('results');
const feedback = byId('feedback');
const key = 'postgres-notebook-v1';
const isReview = task => task[0].startsWith('Повторение');
const pages = chapters.flatMap(([, , , list], c) => list.map((task, t) => [c, t])
  .sort(([, a], [, b]) => Number(isReview(list[b])) - Number(isReview(list[a]))));
const validIds = new Set(pages.map(([c,t]) => `${c}:${t}`));
let state = {page:0, drafts:{}, completed:{}};
let worker;
let busy = false;
try {
  const saved = localStorage.getItem(key);
  if (saved) state = parseBackup(saved);
} catch {}

function parseBackup(raw) {
  const value = JSON.parse(raw);
  const step = value?.step ?? legacyPages[value?.page]?.join(':');
  const page = pages.findIndex(pair => pair.join(':') === step);
  if (page === -1 ||
      !value.drafts || !value.completed || typeof value.drafts !== 'object' ||
      typeof value.completed !== 'object') throw new Error('Файл прогресса имеет неверный формат.');
  return {
    page,
    drafts:Object.fromEntries(Object.entries(value.drafts).filter(([id, draft]) => validIds.has(id) && typeof draft === 'string')),
    completed:Object.fromEntries(Object.entries(value.completed).filter(([id, done]) => validIds.has(id) && done === true)),
  };
}

function save() {
  try { localStorage.setItem(key, serialize()); }
  catch { byId('backup-status').textContent = 'Браузер не сохранил изменения. Можно скачать файл прогресса.'; }
}

function serialize() {
  const step = pages[state.page].join(':');
  const oldPage = legacyPages.findIndex(pair => pair.join(':') === step);
  return JSON.stringify({...state, page:Math.max(0,oldPage), step});
}

function status(message, kind = '') {
  feedback.textContent = message;
  feedback.dataset.kind = kind;
}

function progress() {
  const [c,t] = pages[state.page];
  const count = Object.keys(state.completed).length;
  byId('progress').max = pages.length;
  byId('progress').value = count;
  byId('progress-label').textContent = `${count} из ${pages.length} выполнено`;
  byId('completed').textContent = state.completed[`${c}:${t}`] ? '✓ Выполнено' : '';
}

function renderTheory(chapter) {
  const sections = theoryLessons[chapter].map(([title, explanation, sql]) => {
    const section = document.createElement('section');
    const heading = document.createElement('h2');
    const paragraph = document.createElement('p');
    heading.textContent = title;
    paragraph.textContent = explanation;
    section.append(heading, paragraph);
    if (sql) {
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      code.textContent = sql;
      pre.append(code);
      section.append(pre);
    }
    return section;
  });
  byId('theory').replaceChildren(...sections);
}

function toggleHint(show) {
  const button = byId('hint-toggle');
  button.setAttribute('aria-expanded', String(show));
  button.textContent = show ? 'Скрыть подсказку' : 'Показать подсказку';
  byId('hint-text').hidden = !show;
}

byId('hint-toggle').onclick = () => toggleHint(byId('hint-text').hidden);

function render() {
  const [c,t] = pages[state.page];
  const [title, subtitle, , list] = chapters[c];
  const [level, taskTitle, prompt, answer] = list[t];
  byId('chapter-number').textContent = `Глава ${c+1} из ${chapters.length}`;
  byId('chapter-title').textContent = title;
  byId('chapter-subtitle').textContent = subtitle;
  if (byId('theory').dataset.chapter !== String(c)) {
    renderTheory(c);
    byId('theory').dataset.chapter = c;
    byId('theory').closest('details').open = true;
  }
  byId('difficulty').textContent = level;
  byId('task-title').textContent = taskTitle;
  byId('prompt').textContent = prompt;
  byId('hint-text').textContent = taskHints[c][t];
  toggleHint(false);
  byId('answer').textContent = answer + ';';
  byId('solution').open = false;
  editor.value = state.drafts[`${c}:${t}`] ?? '';
  const groups = ['Повторение пройденного', 'Практика главы'].map(label => {
    const group = document.createElement('optgroup');
    group.label = label;
    return group;
  });
  const chapterPages = pages.filter(([chapter]) => chapter === c);
  chapterPages.forEach(([, i], position) => {
    const option = new Option(`${position+1}. ${list[i][1]}`, i, false, i===t);
    groups[isReview(list[i]) ? 0 : 1].append(option);
  });
  tasks.replaceChildren(...groups.filter(group => group.children.length));
  [...byId('chapters').children].forEach((button,i) => {
    if (i===c) button.setAttribute('aria-current','step');
    else button.removeAttribute('aria-current');
  });
  byId('prev').disabled = state.page === 0;
  byId('next').disabled = state.page === pages.length-1;
  byId('next').textContent = pages[state.page+1]?.[0] > c ? 'Следующая глава' : 'Дальше';
  output.replaceChildren();
  status('Результат появится здесь после запуска.');
  progress();
}

function navigate(page, target) {
  if (!pages[page]) return;
  state.page = page;
  save();
  render();
  if (target) byId(target).scrollIntoView({block:'start'});
}

chapters.forEach(([title],i) => {
  const button = document.createElement('button');
  const number = document.createElement('span');
  number.textContent = String(i+1).padStart(2,'0');
  button.append(number, title);
  button.onclick = () => {
    if (matchMedia('(max-width:760px)').matches) byId('navigation').open = false;
    navigate(pages.findIndex(([c]) => c===i), 'main');
  };
  byId('chapters').append(button);
});
byId('navigation').open = false;
tasks.onchange = () => navigate(pages.findIndex(([c,t]) => c===pages[state.page][0] && t===Number(tasks.value)));
byId('prev').onclick = () => navigate(state.page-1, 'exercise-heading');
byId('next').onclick = () => {
  const sameChapter = pages[state.page+1]?.[0] === pages[state.page][0];
  navigate(state.page+1, sameChapter ? 'exercise-heading' : 'main');
};
editor.oninput = () => {
  state.drafts[pages[state.page].join(':')] = editor.value;
  save();
};

function showResults(results) {
  for (const {fields, rows, affectedRows} of results) {
    if (!fields.length) {
      const message = document.createElement('p');
      message.textContent = affectedRows ? `Затронуто строк: ${affectedRows}` : 'Команда выполнена.';
      output.append(message);
      continue;
    }
    const frame = document.createElement('div');
    frame.className = 'output';
    frame.tabIndex = 0;
    frame.setAttribute('aria-label','Таблица результата');
    const table = document.createElement('table');
    const header = table.createTHead().insertRow();
    for (const field of fields) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = field.name;
      header.append(th);
    }
    const body = table.createTBody();
    for (const row of rows.slice(0,100)) {
      const tr = body.insertRow();
      for (const value of row) {
        tr.insertCell().textContent = value === null ? 'NULL' : Array.isArray(value) ? JSON.stringify(value) : String(value);
      }
    }
    frame.append(table);
    const count = document.createElement('p');
    count.textContent = rows.length > 100 ? `Первые 100 из ${rows.length} строк` : `Строк: ${rows.length}`;
    output.append(frame,count);
  }
}

function run(verify) {
  if (busy) return;
  const sql = editor.value.trim();
  if (!sql) { status('Сначала напиши SQL-запрос.', 'error'); editor.focus(); return; }
  const page = state.page;
  const [chapter,task] = pages[page];
  const snapshot = state;
  busy = true;
  byId('run').disabled = byId('check').disabled = true;
  status('Выполняю запрос…');
  output.replaceChildren();
  let timeout;
  function finish(result) {
    clearTimeout(timeout);
    busy = false;
    byId('run').disabled = byId('check').disabled = false;
    if (result.passed && state === snapshot) {
      state.completed[`${chapter}:${task}`] = true;
      save();
      progress();
    }
    if (state.page !== page || state !== snapshot) return;
    if (result.error) {
      status([result.error,result.hint].filter(Boolean).join('\n'), 'error');
      return;
    }
    status(verify ? result.passed ? '✓ Ответ принят' : `Пока не совпало. ${result.detail || 'Сверь условие, имена столбцов и данные.'}` : 'Запрос выполнен.', result.passed ? 'pass' : '');
    showResults(result.results);
  }
  try {
    worker ??= new Worker('./worker.js',{type:'module'});
    const restart = message => {
      worker.terminate();
      worker = undefined;
      finish({error:message});
    };
    worker.onmessage = ({data}) => finish(data);
    worker.onerror = () => restart('Не удалось запустить PostgreSQL. Попробуй ещё раз или обнови страницу.');
    timeout = setTimeout(() => restart('Запрос остановлен по времени. Проверь запрос и попробуй снова.'), 30000);
    worker.postMessage({chapter,task,sql,verify});
  } catch (error) {
    finish({error:error.message});
  }
}

byId('run').onclick = () => run(false);
byId('check').onclick = () => run(true);
editor.onkeydown = event => {
  if (event.key==='Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    run(false);
  }
};

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text],{type}));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

byId('export').onclick = () => download('sql-notebook-progress.json', serialize(), 'application/json');
byId('download-seed').onclick = () => {
  const commands = seed.replace('DROP SCHEMA IF EXISTS public CASCADE;\nCREATE SCHEMA public;\n', '');
  download('sql-notebook-library.sql', `-- Выполни один раз в пустой учебной базе.\nBEGIN;\n${commands}COMMIT;\n`, 'text/plain;charset=utf-8');
};
byId('download-query').onclick = () => {
  if (!editor.value.trim()) { status('Сначала напиши SQL-запрос.', 'error'); editor.focus(); return; }
  const [c,t] = pages[state.page];
  download(`sql-notebook-${c+1}-${t+1}.sql`, editor.value, 'text/plain;charset=utf-8');
};
byId('import').onchange = async event => {
  const input = event.currentTarget;
  if (!input.files[0]) return;
  try {
    state = parseBackup(await input.files[0].text());
    save();
    render();
    byId('backup-status').textContent = 'Прогресс загружен.';
  } catch (error) {
    byId('backup-status').textContent = error.message;
  } finally { input.value = ''; }
};
render();
