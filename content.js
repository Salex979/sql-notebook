export const seed = `
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
SET search_path TO public;
CREATE TABLE readers(id int PRIMARY KEY, name text, city text);
CREATE TABLE books(id int PRIMARY KEY, title text, genre text, price int, tags text[]);
CREATE TABLE loans(id int PRIMARY KEY, reader_id int REFERENCES readers, book_id int REFERENCES books, borrowed_on date, returned_on date);
INSERT INTO readers VALUES (1,'Аня','Москва'),(2,'Борис','Казань'),(3,'Вера','Москва'),(4,'Глеб','Омск');
INSERT INTO books VALUES (1,'Орбита','фантастика',500,ARRAY['космос','приключения']),
(2,'Маяк','роман',350,ARRAY['море']), (3,'Станция','фантастика',650,ARRAY['космос']),
(4,'Тихий берег','роман',300,ARRAY['море','путешествия']), (5,'Тропа','поэзия',250,ARRAY[]::text[]);
INSERT INTO loans VALUES (1,1,1,'2025-01-10',NULL),(2,1,2,'2025-01-12','2025-01-20'),
(3,2,3,'2025-01-15',NULL),(4,3,1,'2025-02-01','2025-02-10');
`;

// A fifth item supplies a query for checking the resulting database state.
export const chapters = [
  ['Введение в PostgreSQL', 'Первые запросы и знакомство с учебной базой',
    'PostgreSQL хранит данные в таблицах. SQL-запросы можно отправлять через графический pgAdmin или консоль psql. Здесь PostgreSQL работает прямо в браузере. SELECT умеет возвращать выражения и читать таблицы. AS задаёт имя столбца результата.', [
    ['Разминка','Первый запрос','Верни число 42 в столбце answer.','select 42 as answer'],
    ['Базовое','Учебная библиотека','Выведи все столбцы таблицы readers.','select * from readers'],
    ['Сложнее','Цена со скидкой','Выведи title и цену каждой книги за вычетом 50. Назови вычисляемый столбец discounted.','select title, price-50 as discounted from books'],
  ]],
  ['Определение структуры данных','Таблицы, типы и ограничения',
    'CREATE TABLE создаёт таблицу, ALTER TABLE меняет её структуру, DROP TABLE удаляет. Тип определяет допустимые данные. PRIMARY KEY идентифицирует строку, NOT NULL требует значение, CHECK проверяет условие, REFERENCES связывает таблицы. На сервере CREATE DATABASE и DROP DATABASE управляют целыми базами. В тетрадке вместо отдельной базы можно тренироваться на схемах.', [
    ['Повторение','Цена с наценкой','Выведи title и price плюс 100 в столбце new_price.','select title, price+100 as new_price from books'],
    ['Базовое','Полка','Создай таблицу shelves со столбцами id (integer, первичный ключ) и label (text, обязательный).','create table shelves(id int primary key,label text not null)',"select column_name,data_type,is_nullable from information_schema.columns where table_schema='public' and table_name='shelves' union all select constraint_type,'constraint','' from information_schema.table_constraints where table_schema='public' and table_name='shelves' and constraint_type='PRIMARY KEY'"],
    ['Среднее','Добавь столбец','Добавь в books столбец published_on типа date.','alter table books add published_on date',"select column_name,data_type from information_schema.columns where table_schema='public' and table_name='books'"],
    ['Сложнее','Отзывы читателей','Создай reviews с id (integer, первичный ключ), reader_id (integer, обязательная ссылка на readers.id) и rating (integer, обязательное число от 1 до 5 включительно).','create table reviews(id int primary key,reader_id int not null references readers(id),rating int not null check(rating between 1 and 5))',{table:'reviews',valid:["insert into reviews values(1,1,5),(2,2,1)"],invalid:[["insert into reviews values(3,99,3)","23503"],["insert into reviews values(3,1,0)","23514"],["insert into reviews values(3,1,6)","23514"],["insert into reviews values(3,1,null)","23502"],["insert into reviews values(3,null,3)","23502"],["insert into reviews values(1,1,3)","23505"]]}],
    ['Сложнее','Отдельная схема','Создай схему workshop и пустую таблицу workshop.notes с одним столбцом body типа text.','create schema workshop; create table workshop.notes(body text)',"select column_name,data_type from information_schema.columns where table_schema='workshop' and table_name='notes'"],
    ['Закрепление','Удаление таблицы','Удали таблицу loans целиком.','drop table loans',"select to_regclass('public.loans') is null as removed"],
  ]],
  ['Операции с данными','Добавление, выборка, обновление и удаление',
    'INSERT добавляет строки, SELECT читает их. WHERE оставляет строки, которые удовлетворяют условию. UPDATE меняет значения, DELETE удаляет строки. Без WHERE обе команды затрагивают все строки таблицы.', [
    ['Повторение','Новая колонка','Добавь в readers столбец email типа text.','alter table readers add email text',"select column_name,data_type from information_schema.columns where table_schema='public' and table_name='readers'"],
    ['Базовое','Новый читатель','Добавь Дину из Перми, id 5, в readers.','insert into readers values(5,\'Дина\',\'Пермь\')','select * from readers'],
    ['Базовое','Книги по бюджету','Выведи title и price для книг дешевле 400.','select title,price from books where price<400'],
    ['Среднее','Переезд','Измени город читателя с id 2 на Самару.','update readers set city=\'Самара\' where id=2','select * from readers'],
    ['Сложнее','Архив выдач','Удали только выдачи, по которым книга уже возвращена.','delete from loans where returned_on is not null','select * from loans'],
  ]],
  ['Запросы','От фильтрации до группировки и подзапросов',
    'DISTINCT убирает дубликаты. ORDER BY задаёт порядок. LIMIT и OFFSET берут часть упорядоченного результата. IN, BETWEEN и LIKE выражают условия, IS NULL проверяет отсутствие значения. COUNT и AVG агрегируют данные. GROUP BY формирует группы, HAVING фильтрует группы, подзапрос вычисляет промежуточный результат.', [
    ['Повторение','Выдачи без возврата','Выведи id всех ещё не возвращённых выдач.','select id from loans where returned_on is null'],
    ['Базовое','Города без повторов','Выведи уникальные city.','select distinct city from readers'],
    ['Базовое','Вторая и третья','Выведи title и price второй и третьей по цене книг. Начни с самой дорогой, при равной цене используй id по возрастанию.','select title,price from books order by price desc,id limit 2 offset 1',true],
    ['Среднее','Диапазон цен','Выведи title и price книг по цене от 300 до 500 включительно, если название начинается на «М» или «О».','select title,price from books where price between 300 and 500 and (title like \'М%\' or title like \'О%\')'],
    ['Среднее','Популярные жанры','Выведи genre и число книг в столбце total. Оставь жанры с двумя и более книгами.','select genre,count(*) as total from books group by genre having count(*)>=2'],
    ['Сложнее','Выше среднего','Выведи title и price книг дороже средней цены по всей таблице.','select title,price from books where price>(select avg(price) from books)'],
  ]],
  ['Составные типы данных','Массивы и перечисления',
    'Массив PostgreSQL хранит последовательность значений одного типа. ARRAY создаёт массив, обычная индексация начинается с 1, ANY сравнивает значение с элементами, cardinality считает элементы. ENUM задаёт упорядоченный набор допустимых значений через CREATE TYPE.', [
    ['Повторение','Средняя цена жанра','Выведи genre и среднюю цену в столбце avg_price. Оставь жанры со средней ценой выше 300.','select genre,avg(price) as avg_price from books group by genre having avg(price)>300'],
    ['Базовое','Первый тег','Выведи title и первый тег в столбце first_tag для каждой книги.','select title,tags[1] as first_tag from books'],
    ['Среднее','Тег где угодно','Выведи title книг, у которых есть тег «космос».','select title from books where \'космос\'=any(tags)'],
    ['Сложнее','Статус брони','Создай тип booking_status со значениями queued, ready, closed в этом порядке. Добавь в loans поле status этого типа со значением по умолчанию queued.','create type booking_status as enum(\'queued\',\'ready\',\'closed\'); alter table loans add status booking_status default \'queued\'',"select enum_range(null::booking_status)::text as states, pg_typeof(status)::text as type, status::text from loans union all select column_default,udt_name,null from information_schema.columns where table_schema='public' and table_name='loans' and column_name='status'"],
  ]],
  ['Соединение таблиц','JOIN и операции над множествами',
    'INNER JOIN возвращает совпадения, LEFT и RIGHT сохраняют все строки с указанной стороны, FULL сохраняет обе стороны. CROSS JOIN строит все пары. Неявное соединение записывают через список таблиц в FROM и условие в WHERE. UNION, EXCEPT и INTERSECT объединяют, вычитают и пересекают результаты с совместимыми столбцами. По умолчанию эти три операции убирают дубликаты.', [
    ['Повторение','Книги с двумя тегами','Выведи title всех книг, у которых ровно два тега.','select title from books where cardinality(tags)=2'],
    ['Базовое','Названия выданных книг','Соедини loans и books неявно через FROM и WHERE. Выведи id выдачи как loan_id и title книги.','select l.id as loan_id,b.title from loans l,books b where l.book_id=b.id'],
    ['Среднее','Кто что брал','Соедини выдачи с читателями и книгами через INNER JOIN. Выведи name, title и borrowed_on для каждой выдачи.','select r.name,b.title,l.borrowed_on from loans l join readers r on r.id=l.reader_id join books b on b.id=l.book_id'],
    ['Среднее','Все возможные пары','С помощью CROSS JOIN выведи name и title для каждой пары читателя и книги.','select name,title from readers cross join books'],
    ['Среднее','Покрытие идентификаторов','Соедини readers и books через FULL JOIN по равным id. Выведи id читателя как reader_id и id книги как book_id, включая строки без пары.','select r.id as reader_id,b.id as book_id from readers r full join books b on b.id=r.id'],
    ['Среднее','Два списка книг','Через UNION выведи id книг жанра «роман» или книг, которые хотя бы раз выдавались.','select id from books where genre=\'роман\' union select book_id from loans'],
    ['Среднее','Невыданные книги','С помощью EXCEPT выведи id книг, которые ни разу не выдавались.','select id from books except select book_id from loans'],
    ['Среднее','Романы в выдачах','Через INTERSECT выведи id романов, которые хотя бы раз выдавались.','select id from books where genre=\'роман\' intersect select book_id from loans'],
    ['Сложнее','Статистика читателей','Выведи name каждого читателя и число его выдач в total. Используй LEFT JOIN. У тех, кто ничего не брал, должно быть 0.','select r.name,count(l.id) as total from readers r left join loans l on l.reader_id=r.id group by r.id,r.name'],
  ]],
];

// Append review tasks so saved draft and completion IDs stay valid.
const review = [
  [],
  [
    ['Повторение главы 1','Карточки для каталога','Выведи id каждой книги и её название с префиксом «Книга: » в столбце card. Например, у книги с id 1 получится «Книга: Орбита».',
      "select id, 'Книга: ' || title as card from books"],
  ],
  [
    ['Повторение главы 1','Подпиши города','Выведи столбцы name и location для всех читателей. В location объедини город и имя через « / », например «Москва / Аня».',
      "select name, city || ' / ' || name as location from readers"],
    ['Повторение главы 2','Дни на чтение','Добавь в loans столбец allowed_days типа integer. Установи значение по умолчанию 14 и запрети NULL.',
      'alter table loans add allowed_days int not null default 14',
      "select column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name='loans' and column_name='allowed_days'"],
  ],
  [
    ['Повторение главы 1','Стоимость комплекта','Выведи title и стоимость трёх экземпляров каждой книги. Назови вычисляемый столбец bundle_price.',
      'select title,price*3 as bundle_price from books'],
    ['Повторение главы 2','Код каталога','Создай таблицу catalog_codes со столбцами code (text, первичный ключ) и book_id (integer, обязательная ссылка на books.id).',
      'create table catalog_codes(code text primary key, book_id int not null references books(id))',
      {table:'catalog_codes',valid:["insert into catalog_codes values('A-01',1),('B-02',1)"],invalid:[["insert into catalog_codes values('C-03',99)","23503"],["insert into catalog_codes values('C-03',null)","23502"],["insert into catalog_codes values('A-01',2)","23505"]]}],
    ['Повторение главы 3','Обнови цены каталога','Уменьши цену всех романов на 50. Затем выведи id и обновлённую price этих книг. Напиши обе команды в редакторе.',
      "update books set price=price-50 where genre='роман'; select id,price from books where genre='роман'",
      {query:'select * from books', output:true}],
  ],
  [
    ['Повторение главы 1','Сколько стоят две разные книги','Напиши SELECT с двумя выражениями. В столбце pair_price сложи 350 и 500, в change_from_1000 вычисли сдачу с 1000 за этот комплект.',
      'select 350+500 as pair_price,1000-(350+500) as change_from_1000'],
    ['Повторение главы 2','Контакты читателей','Создай таблицу reader_contacts. Столбец reader_id должен быть integer, первичным ключом и ссылкой на readers.id. Столбец email должен быть обязательным text с ограничением UNIQUE.',
      'create table reader_contacts(reader_id int primary key references readers(id),email text not null unique)',
      {table:'reader_contacts',valid:["insert into reader_contacts values(1,'a@example.org'),(2,'b@example.org')"],invalid:[["insert into reader_contacts values(99,'c@example.org')","23503"],["insert into reader_contacts values(3,null)","23502"],["insert into reader_contacts values(3,'a@example.org')","23505"],["insert into reader_contacts values(1,'d@example.org')","23505"]]}],
    ['Повторение главы 3','Регистрация выдачи','Добавь выдачу с id 5. Читатель 4 взял книгу 4 первого марта 2025 года и пока её не вернул. Затем выведи id, reader_id и book_id новой выдачи.',
      "insert into loans values(5,4,4,'2025-03-01',null); select id,reader_id,book_id from loans where id=5",
      {query:'select * from loans', output:true}],
    ['Повторение главы 4','Кто возвращал книги','Для каждого читателя, вернувшего хотя бы одну книгу, выведи reader_id и число его возвращённых выдач в столбце returned_count. Отсортируй по returned_count по убыванию, при равенстве по reader_id по возрастанию.',
      'select reader_id,count(*) as returned_count from loans where returned_on is not null group by reader_id order by returned_count desc, reader_id',true],
  ],
  [
    ['Повторение главы 1','Цена в копейках','Выведи id и title каждой книги, а цену в рублях переведи в копейки в столбце price_kopecks.',
      'select id,title,price*100 as price_kopecks from books'],
    ['Повторение главы 2','Защита от отрицательных цен','Добавь для books ограничение CHECK, которое запрещает отрицательную цену. Проверь, что нулевая цена допустима.',
      'alter table books add check (price >= 0)',
      {table:'books',valid:['update books set price=0 where id=1'],invalid:[['update books set price=-1 where id=2','23514']]}],
    ['Повторение главы 3','Вернули книгу','Укажи для незакрытой выдачи с id 3 дату возврата 20 марта 2025 года. Затем выведи id и returned_on этой выдачи.',
      "update loans set returned_on='2025-03-20' where id=3 and returned_on is null; select id,returned_on from loans where id=3",
      {query:'select * from loans', output:true}],
    ['Повторение главы 4','Бюджет на жанр','Выведи genre и сумму цен книг в столбце total_price. Оставь жанры, в которых есть хотя бы две книги. Отсортируй от самой большой суммы к самой маленькой, при равенстве по genre.',
      'select genre,sum(price) as total_price from books group by genre having count(*)>=2 order by total_price desc,genre',true],
    ['Повторение главы 5','Обнови метки книги','Добавь тег «классика» в конец массива tags у книги «Маяк», сохранив прежние теги. Затем выведи title и tags книг с тегом «классика».',
      "update books set tags=array_append(tags,'классика') where title='Маяк'; select title,tags from books where 'классика'=any(tags)",
      {query:'select * from books', output:true}],
    ['Итоговая практика','Открытые выдачи по читателям','Пометь книги дешевле 600 тегом «бюджет» в дополнение к их тегам. Затем выведи name каждого читателя и число его незакрытых выдач книг с этим тегом в столбце open_budget_loans. Покажи и читателей с нулём. Отсортируй по имени.',
      "update books set tags=array_append(tags,'бюджет') where price<600; select r.name,count(b.id) as open_budget_loans from readers r left join loans l on l.reader_id=r.id and l.returned_on is null left join books b on b.id=l.book_id and 'бюджет'=any(b.tags) group by r.id,r.name order by r.name",
      {query:'select * from books', output:true, ordered:true}],
  ],
];

export const legacyPages = chapters.flatMap(([, , , tasks], chapter) => tasks.map((_, task) => [chapter, task]));
review.forEach((tasks, chapter) => chapters[chapter][3].push(...tasks));
