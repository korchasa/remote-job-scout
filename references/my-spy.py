"""
Script for collecting job vacancies.

Usage:
    Set environment variables VACANCY_DIR and SKIP_DIR (and optionally CURRENT_DIR) before running:
        VACANCY_DIR=/path/to/inbox SKIP_DIR=/path/to/skip python app.py
    Or in Docker, set these variables via -e or Dockerfile ENV.
"""
import os
import re
import sys
import time
from jobspy import scrape_jobs
from datetime import datetime
import pandas as pd
from pathlib import Path

HOURS_OLD = 7 * 24
QUERIES = ["devops", "devops engineer", "infrastructure engineer", "platform engineer", "cto OR chief technology officer", "head of engineering"]
COMPANY_STOPWORDS = [
    'Київстар', # not a citizen of Ukraine
    'AllStars-IT',
    'Capgemini',
    'Enavate',
    'Binotel',
    'Creatio',
    'Dripify.io',
    'GoReel',
    'Grid Dynamics',
    'Pragmatike',
    'Sii Poland',
    'Skylum',
    'SupportYourApp',
    'Intellias',
    'EPAM Systems',
    'DraftKings',
    'Deel',
    'Automat-it', # outsource
    'Wix.com, Inc.',
    'n8n', # english only
    'eduki', # hire only in Ukraine
    'PayAdmit', # общались на djinni, они пропали
    'Competera', # украинская, отказ
]
TITLE_STOPWORDS = [
    'Intern', 'Junior', 'Middle', 'Python', 'Java', 'Full Stack', 'Full-Stack', '.Net', "C++", 'Angular', 'React', 'node.js', 'WordPress', 'Product Manager', 'Data', 'Backend', 'QA', 'Manager', 'Frontend', 'Administrator', 'Front-end', 'Software', 'Security', 'Testing', 'Azure', 'part-time', 'Designer', 'Product', 'Test', 'Quality', 'Developer', 'Development', 'Analyst', 'Owner', 'Artist'
]
DESCRIPTION_STOPWORDS = [
    'Pre-Intermediate', 'Fluent', 'iGaming',
]

# Colors for output
class Colors:
    """ANSI escape codes for colored terminal output."""
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RED = '\033[91m'
    GRAY = '\033[90m'
    RESET = '\033[0m'

def color_print(msg, color):
    """Prints a message in the specified color to the terminal."""
    print(f"{color}{msg}{Colors.RESET}", flush=True)

def generate_filename(job):
    """Generates a safe filename for a job posting based on company, title, and site."""
    title = f"{job.get('company', 'Unknown')} - {job.get('title', 'Unknown')} - {job.get('site', 'Unknown')}"
    return re.sub(r'[\\/:*?"<>|]', '', title).replace('\n', ' ').replace('\r', '').strip() + ".md"

def clean_description(description):
    """Cleans up description text by removing excessive newlines while preserving text structure."""
    if not description:
        return ""
    # Split into lines and preserve meaningful whitespace
    lines = description.split('\n')
    # Remove trailing spaces from each line
    lines = [line.rstrip() for line in lines]
    # Remove empty lines at the start and end
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    # Replace multiple empty lines with single empty line
    result = []
    prev_empty = False
    for line in lines:
        is_empty = not line.strip()
        if not (is_empty and prev_empty):
            result.append(line)
        prev_empty = is_empty
    return '\n'.join(result)

def vacancy_to_markdown(job, search_info=None):
    """Converts a job posting dictionary to a markdown string. (Template remains in Russian)"""
    title = f"{job.get('company', 'Unknown')} - {job.get('title', 'Unknown')}"
    url = job.get('job_url', '')
    company = job.get('company', '')
    position = job.get('title', '')
    location = job.get('location', '')
    date_posted = job.get('date_posted', '')
    description = clean_description(job.get('description', ''))
    site = job.get('site', '')
    now = datetime.now().strftime('%Y-%m-%d')

    # Добавляем информацию о способе поиска
    search_method = ""
    if search_info:
        search_method = f"- Способ поиска: {search_info}\n"

    return f"""# {title}

- URL: {url}
- Компания: {company}
- Должность: {position}
- Локация: {location}
- Инициатор: Я
- Источник: {site}
{search_method}- Опубликовано: {date_posted}
- Начато: {now}
- Обновлено: {now}
- Текущий статус: Новая
- Финальный статус: -

## Описание вакансии

{description}

"""

def main():
    """Main entry point: reads environment variables, scrapes jobs, filters, and saves new vacancies as markdown files."""
    start_time = time.time()

    vacancy_dir = os.environ.get('VACANCY_DIR')
    skip_dir = os.environ.get('SKIP_DIR')
    current_dir = os.environ.get('CURRENT_DIR')

    if not vacancy_dir or not skip_dir:
        print("Error: VACANCY_DIR and SKIP_DIR environment variables must be set.", file=sys.stderr)
        sys.exit(1)

    vacancy_dir = Path(vacancy_dir)
    skip_dir = Path(skip_dir)
    current_dir = Path(current_dir) if current_dir else None

    prepare_dirs(vacancy_dir, skip_dir)

    # Get list of files in skip_dir
    skip_filenames = set(f.name for f in skip_dir.iterdir() if f.is_file())

    # Get list of files in current_dir, if provided
    current_filenames = set()
    if current_dir and current_dir.exists():
        current_filenames = set(f.name for f in current_dir.iterdir() if f.is_file())

    jobs = scrape_all()
    for _, job in jobs.iterrows():
        filename = generate_filename(job)
        if filename in skip_filenames:
            color_print(f"SKIP (already in skip): {filename}", Colors.GRAY)
            continue
        if filename in current_filenames:
            color_print(f"SKIP (already in current): {filename}", Colors.GRAY)
            continue
        filepath = vacancy_dir / filename
        if not filepath.exists():
            search_info = job.get('search_info', '')
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(vacancy_to_markdown(job, search_info))

    end_time = time.time()
    color_print(f"\nTotal execution time: {end_time - start_time:.2f} seconds", Colors.BLUE)

def prepare_dirs(vacancy_dir: Path, skip_dir: Path):
    """Creates vacancy and skip directories if they don't exist, and clears all files in vacancy_dir."""
    vacancy_dir.mkdir(parents=True, exist_ok=True)
    skip_dir.mkdir(parents=True, exist_ok=True)
    for file_path in vacancy_dir.iterdir():
        if file_path.is_file():
            file_path.unlink()

def scrape_all():
    """Scrapes jobs from all sources and queries, removes duplicates, and returns a DataFrame."""
    color_print("Starting to scrape...", Colors.BLUE)
    sources = ["linkedin", "indeed"]
    all_jobs = []
    for query in QUERIES:
        for source in sources:
            all_jobs.append(scrape_from_country("Ukraine", query, source))
            all_jobs.append(scrape_from_country("Latvia", query, source, True))
            all_jobs.append(scrape_from_country("Lithuania", query, source, True))
            all_jobs.append(scrape_from_country("Cyprus", query, source, True))
            # all_jobs.append(scrape_worldwide(query, source))
    res = pd.concat(all_jobs, ignore_index=True)
    res = res.drop_duplicates(subset=["company", "title"], keep="first")
    color_print(f"Found {len(res)} unique jobs", Colors.BLUE)
    return res

def scrape_from_country(country, query, source, filter_language=False):
    """Scrapes jobs for a given query and source, then filters them.

    Args:
        country: Country to search in
        query: Search query
        source: Job source (linkedin, indeed, etc.)
        filter_language: If True, filter jobs to only include Russian/Ukrainian language
    """
    start_time = time.time()
    color_print(f"Scraping {query} from {source} in {country}...", Colors.YELLOW)
    jobs = scrape_jobs(
        site_name=[source],
        search_term=query,
        location=country,
        country_indeed=country,
        linkedin_fetch_description=True,
        hours_old=HOURS_OLD,
        is_remote=True,
        results_wanted=100,
        verbose=2,
    )
    color_print(f"Found {len(jobs)} '{query}' jobs on {source}", Colors.BLUE)

    # Добавляем информацию о способе поиска
    search_info = f"scrape_from_country(country='{country}', query='{query}', source='{source}', filter_language={filter_language})"
    jobs['search_info'] = search_info

    jobs = filter_jobs_by_stopwords(jobs)
    if filter_language:
        jobs = filter_jobs_by_russian_and_ukrainian_language(jobs)
        color_print(f"After language filtering: {len(jobs)} jobs remain", Colors.BLUE)
    end_time = time.time()
    color_print(f"Time taken for {query} on {source}: {end_time - start_time:.2f} seconds", Colors.BLUE)
    return jobs

def scrape_worldwide(query, source):
    """Scrapes jobs for a given query and source, then filters them."""
    start_time = time.time()
    color_print(f"Scraping {query} from {source} worldwide...", Colors.YELLOW)
    jobs = scrape_jobs(
        site_name=[source],
        search_term=query,
        linkedin_fetch_description=True,
        hours_old=HOURS_OLD,
        is_remote=True,
        results_wanted=1000,
        verbose=2,
    )
    color_print(f"Found {len(jobs)} '{query}' jobs on {source}", Colors.BLUE)

    # Добавляем информацию о способе поиска
    search_info = f"scrape_worldwide(query='{query}', source='{source}')"
    jobs['search_info'] = search_info

    jobs = filter_jobs_by_stopwords(jobs)
    jobs = filter_jobs_by_russian_and_ukrainian_language(jobs)
    color_print(f"After filtering: {len(jobs)} jobs remain", Colors.BLUE)
    end_time = time.time()
    color_print(f"Time taken for {query} on {source}: {end_time - start_time:.2f} seconds", Colors.BLUE)
    return jobs

def contains_stopword(text, stopwords):
    """Checks if any stopword is present in the given text (case-insensitive)."""
    t = str(text)
    if not t:
        return False
    text_lower = t.lower()
    return any(sw.lower() in text_lower for sw in stopwords)

def filter_jobs_by_stopwords(jobs):
    """Filters out jobs that contain stopwords in company, title, or description."""
    filtered_jobs = []
    for _, job in jobs.iterrows():
        company = job.get('company', '')
        title = job.get('title', '')
        site = job.get('site', '')
        job_url = job.get('job_url', '')
        description = job.get('description', '')
        if (
            contains_stopword(company, COMPANY_STOPWORDS)
            or contains_stopword(title, TITLE_STOPWORDS)
            or contains_stopword(description, DESCRIPTION_STOPWORDS)
        ):
            color_print(f"{company} / {title}: {job_url}", Colors.GRAY)
            continue
        filtered_jobs.append(job)
        print(f"{Colors.YELLOW}{company}{Colors.RESET} / {Colors.GREEN}{title}{Colors.RESET}: {Colors.BLUE}{job_url}{Colors.RESET}", flush=True)
    return pd.DataFrame(filtered_jobs)

def filter_jobs_by_russian_and_ukrainian_language(jobs):
    """Filters out jobs that are not in Russian or Ukrainian language."""
    filtered_jobs = []
    for _, job in jobs.iterrows():
        company = job.get('company', '')
        title = job.get('title', '')
        description = job.get('description', '')

        # Combine all text fields for language detection
        combined_text = f"{company} {title} {description}".lower()

        # Check for Russian and Ukrainian characters
        # Russian: а-я, ё, ъ, ь
        # Ukrainian: а-я, ё, і, ї, є, ґ, ъ, ь
        russian_ukrainian_chars = re.findall(r'[а-яёіїєґъь]', combined_text)

        # If we found Russian/Ukrainian characters, keep the job
        if russian_ukrainian_chars:
            filtered_jobs.append(job)
            color_print(f"KEEP (RU/UA): {company} / {title}", Colors.GREEN)

    return pd.DataFrame(filtered_jobs)

if __name__ == "__main__":
    main()


# docker build -t jobspy-app . && docker run --rm -e VACANCY_DIR=/app/inbox -e SKIP_DIR=/app/skip -e CURRENT_DIR=/app/current -v /path/to/inbox:/app/inbox -v /path/to/skip:/app/skip -v /path/to/current:/app/current jobspy-app
