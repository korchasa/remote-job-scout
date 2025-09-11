## Instruction

If there are no files in the `Проекты/Поиск работы/Вакансии/inbox` directory,
run the script to collect vacancies:
`cd Projects/Job Search/scraper && ./scrape.sh`. It will save job postings to
the directory `Проекты/Поиск работы/Вакансии/inbox`.

Add to TODO all files in `Проекты/Поиск работы/Вакансии/inbox` one by one:

- Read vacancy file and request the web page specified in the URL with internal
  tool.
- If vacancy is not match my profile or is not remote or is older than 1 week or
  require English proficiency above B1, move it to the directory
  `Проекты/Поиск работы/Вакансии/skip`.
- In the header (between "Search method" and "Published"), add info about
  language requirements (English, Russian, Ukrainian) extracted from the job
  description. In parentheses, include the exact quote from the job posting—how
  the language requirement is stated. If no language requirement is mentioned,
  write "no data".
- Research the company online—check its connections to Ukraine and Russia, and
  gather brief company informationAdd this information to the job posting's
  header, including sources.
- Add info about company and language requirements to the header.
- Move vacancy file to the directory `Проекты/Поиск работы/Вакансии/current`.
- Delete original vacancy file from the directory
  `Проекты/Поиск работы/Вакансии/inbox`.

### Requirements

- Read and process each vacancy file one by one
- Do not write scripts
- Do not use console tools
- Use only tools

Full header format:

```
...
- Информация о компании:
  - Категория: аутсорс/аутстаф/агенство/продукт/etc (ссылка на доказательство)
  - Основной продукт: ... (ссылка на доказательство)
  - Доменная область: ... (ссылка на доказательство)
  - Офисы: ... (ссылка на доказательство)
  - Связи с Россией: ... (ссылка на доказательство)
  - Связи с Украиной: ... (ссылка на доказательство)
  - Короткая информация о компании: ... (ссылка на доказательство)
- Языки:
    - Русский: B1 (Цитата из вакансии)
    - Украинский: C1 (Цитата из вакансии)
    - Английский: no-data
- Опубликовано: 2025-08-29
- Причина пропуска: ... (если вакансия пропущена по какой-то причине)
...
```
