// Remote Job Scout - Client Application

// Default user settings (embedded from types/settings.ts)
const DEFAULT_USER_SETTINGS = {
  searchPositions: ["Software Engineer", "Frontend Developer"],
  filters: {
    blacklistedCompanies: [],
    blacklistedWordsTitle: ["senior", "lead"],
    blacklistedWordsDescription: ["agile", "scrum"],
    countries: [],
    languages: [{ language: "English", level: "Intermediate" }],
  },
  sources: {
    jobSites: ["linkedin", "indeed"],
    openaiWebSearch: {
      apiKey: "",
      searchSites: ["linkedin.com", "indeed.com"],
      globalSearch: false,
    },
  },
  llm: {
    enrichmentInstructions: [
      "Extract company information and requirements",
      "Analyze job responsibilities and skills needed",
    ],
    processingRules: [],
  },
};

// DOM elements
const startSearchButton = document.getElementById("start-search");
const progressSection = document.getElementById("progress-section");
const overallProgressBar = document.getElementById("overall-progress-bar");
const overallProgressText = document.getElementById("overall-progress-text");
const currentStageElement = document.getElementById("current-stage");
const progressInfo = document.getElementById("progress-info");
const stopSearchButton = document.getElementById("stop-search");
const resultsSection = document.getElementById("results-section");
const resultsContainer = document.getElementById("results-container");
const totalResults = document.getElementById("total-results");
const themeToggle = document.getElementById("theme-toggle");
const settingsSection = document.getElementById("settings-section");
const toggleSettingsBtn = document.getElementById("toggle-settings");
const _emptyState = document.getElementById("empty-state");
const jobModal = document.getElementById("job-modal");
const jobModalContent = document.getElementById("job-modal-content");
const jobApplyLink = document.getElementById("job-apply-link");

// Multi-stage search state
let currentSessionId = null;
let progressUpdateInterval = null;

// Load settings from localStorage or use defaults
function loadSettings() {
  const saved = localStorage.getItem("remoteJobScout_settings");
  return saved ? JSON.parse(saved) : DEFAULT_USER_SETTINGS;
}

// Save settings to localStorage
function saveSettings(settings) {
  localStorage.setItem("remoteJobScout_settings", JSON.stringify(settings));
}

// Render settings UI
function renderSettings(settings) {
  // Fill in the form fields
  const searchPositionsElement = document.getElementById("search-positions");
  if (searchPositionsElement) {
    searchPositionsElement.value = settings.searchPositions.join(", ");
  }

  const blacklistCompaniesElement = document.getElementById(
    "blacklist-companies",
  );
  if (blacklistCompaniesElement) {
    blacklistCompaniesElement.value = settings.filters.blacklistedCompanies
      .join(", ");
  }

  const blacklistWordsTitleElement = document.getElementById(
    "blacklist-words-title",
  );
  if (blacklistWordsTitleElement) {
    blacklistWordsTitleElement.value = settings.filters.blacklistedWordsTitle
      .join(", ");
  }

  // Update checkboxes
  const linkedinCheckbox = document.getElementById("source-linkedin");
  if (linkedinCheckbox) {
    linkedinCheckbox.checked = settings.sources.jobSites.includes("linkedin");
  }

  const indeedCheckbox = document.getElementById("source-indeed");
  if (indeedCheckbox) {
    indeedCheckbox.checked = settings.sources.jobSites.includes("indeed");
  }

  const glassdoorCheckbox = document.getElementById("source-glassdoor");
  if (glassdoorCheckbox) {
    glassdoorCheckbox.checked = settings.sources.jobSites.includes("glassdoor");
  }

  // OpenAI settings
  const openaiKeyElement = document.getElementById("openai-api-key");
  if (openaiKeyElement) {
    openaiKeyElement.value = settings.sources.openaiWebSearch?.apiKey || "";
  }

  const globalSearchElement = document.getElementById("global-search");
  if (globalSearchElement) {
    globalSearchElement.checked =
      settings.sources.openaiWebSearch?.globalSearch || false;
  }

  // Render dynamic filters
  renderCountryFilters(settings.filters.countries);
  renderLanguageRequirements(settings.filters.languages);

  // Bind new event handlers
  bindDynamicEvents(settings);
}

// Render country filters
function renderCountryFilters(countries) {
  const container = document.getElementById("country-filters");

  if (!container) {
    console.warn("Country filters container not found");
    return;
  }

  if (!countries || countries.length === 0) {
    container.innerHTML =
      '<div class="text-sm text-gray-500 dark:text-gray-400">No country filters set</div>';
    return;
  }

  container.innerHTML = countries.map((country, index) => `
    <div class="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <input
        type="text"
        value="${country.name}"
        placeholder="Country name"
        data-country-index="${index}"
        class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      >
      <select
        data-country-type="${index}"
        class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      >
        <option value="blacklist" ${
    country.type === "blacklist" ? "selected" : ""
  }>Blacklist</option>
        <option value="whitelist" ${
    country.type === "whitelist" ? "selected" : ""
  }>Whitelist</option>
      </select>
      <button
        class="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
        onclick="removeCountryFilter(${index})"
        title="Remove filter"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
      </button>
    </div>
  `).join("");
}

// Render language requirements
function renderLanguageRequirements(languages) {
  const container = document.getElementById("language-filters");

  if (!container) {
    console.warn("Language filters container not found");
    return;
  }

  if (!languages || languages.length === 0) {
    container.innerHTML =
      '<div class="text-sm text-gray-500 dark:text-gray-400">English (Intermediate) - default</div>';
    return;
  }

  container.innerHTML = languages.map((lang, index) => `
    <div class="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
      <input
        type="text"
        value="${lang.language}"
        placeholder="Language"
        data-lang-index="${index}"
        class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      >
      <select
        data-lang-level="${index}"
        class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      >
        <option value="Beginner" ${
    lang.level === "Beginner" ? "selected" : ""
  }>Beginner</option>
        <option value="Intermediate" ${
    lang.level === "Intermediate" ? "selected" : ""
  }>Intermediate</option>
        <option value="Advanced" ${
    lang.level === "Advanced" ? "selected" : ""
  }>Advanced</option>
        <option value="Native" ${
    lang.level === "Native" ? "selected" : ""
  }>Native</option>
      </select>
      <button
        class="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors"
        onclick="removeLanguageRequirement(${index})"
        title="Remove requirement"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
      </button>
    </div>
  `).join("");
}

// Theme management
function initTheme() {
  const savedTheme = localStorage.getItem("remoteJobScout_theme") || "light";
  setTheme(savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  setTheme(newTheme);
  localStorage.setItem("remoteJobScout_theme", newTheme);
}

function setTheme(theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
    themeToggle.innerHTML = `
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"></path>
      </svg>
    `;
  } else {
    document.documentElement.classList.remove("dark");
    themeToggle.innerHTML = `
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
      </svg>
    `;
  }
}

// Settings toggle
function toggleSettings() {
  if (settingsSection.classList.contains("hidden")) {
    settingsSection.classList.remove("hidden");
    toggleSettingsBtn.textContent = "Hide Settings";
  } else {
    settingsSection.classList.add("hidden");
    toggleSettingsBtn.textContent = "Show Settings";
  }
}

// Show notification
function showNotification(message, type = "info", duration = 3000) {
  const notification = document.createElement("div");
  notification.className =
    `notification ${type} fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg`;
  notification.innerHTML = `
    <div class="flex items-center">
      <div class="flex-1">${message}</div>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-current opacity-70 hover:opacity-100">
        ✕
      </button>
    </div>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, duration);
}

// Render job results
function _renderJobResults(jobs) {
  if (!resultsContainer) return;

  if (!jobs || jobs.length === 0) {
    resultsContainer.innerHTML = `
      <div class="text-center py-12">
        <div class="text-6xl mb-4">📭</div>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">No jobs found</h3>
        <p class="text-gray-600 dark:text-gray-400">Try adjusting your search settings and try again.</p>
      </div>
    `;
    if (totalResults) totalResults.textContent = "0";
    return;
  }

  resultsContainer.innerHTML = jobs.map((job) => `
    <div class="job-card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
            ${job.title || "Untitled Position"}
          </h3>
          <div class="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
            ${job.company || "Company not specified"}
          </div>
          <div class="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-3">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            ${job.location || "Location not specified"}
          </div>
        </div>
        <div class="flex-shrink-0 ml-4">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            ${job.source || "Unknown"}
          </span>
        </div>
      </div>

      <div class="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
        ${job.description || "No description available"}
      </div>

      <div class="flex items-center justify-between">
        <div class="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          ${
    job.postedDate
      ? new Date(job.postedDate).toLocaleDateString()
      : "Date not available"
  }
        </div>
        <div class="flex space-x-2">
          <button
            onclick="_showJobDetails('${job.id}')"
            class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            View Details
          </button>
          ${
    job.url
      ? `
            <a
              href="${job.url}"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Apply
              <svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
            </a>
          `
      : ""
  }
        </div>
      </div>
    </div>
  `).join("");

  if (totalResults) totalResults.textContent = jobs.length.toString();
}

// Flowbite modal instance
let jobModalInstance = null;

// Initialize Flowbite components
function initFlowbiteComponents() {
  // Wait for Flowbite to be loaded
  const checkFlowbite = () => {
    if (typeof Flowbite !== "undefined" && Flowbite.Modal) {
      try {
        // Initialize modal
        const modalElement = document.getElementById("job-modal");
        if (modalElement) {
          jobModalInstance = new Flowbite.Modal(modalElement, {
            closable: true,
            onHide: () => {
              console.log("Modal is hidden");
            },
            onShow: () => {
              console.log("Modal is shown");
            },
          });
        }
      } catch (error) {
        console.warn("Flowbite modal initialization failed:", error);
      }
    } else {
      // Retry after a short delay
      setTimeout(checkFlowbite, 100);
    }
  };

  checkFlowbite();
}

// Show job details in modal
function _showJobDetails(_jobId) {
  // This would typically fetch job details from the server
  // For now, we'll show a placeholder
  if (jobModalContent && jobApplyLink) {
    jobModalContent.innerHTML = `
      <div class="text-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
        <p class="text-gray-600 dark:text-gray-400">Loading job details...</p>
      </div>
    `;

    // Show modal using Flowbite API or fallback
    if (jobModalInstance) {
      jobModalInstance.show();
    } else {
      // Fallback to manual show
      const modal = document.getElementById("job-modal");
      if (modal) {
        modal.classList.remove("hidden");
        modal.setAttribute("aria-hidden", "false");
      }
    }

    // In a real implementation, you would fetch job details here
    setTimeout(() => {
      jobModalContent.innerHTML = `
        <div class="space-y-6">
          <div>
            <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Senior Software Engineer</h3>
            <p class="text-lg text-gray-600 dark:text-gray-400">Tech Company Inc.</p>
            <div class="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              San Francisco, CA • Remote
            </div>
          </div>

          <div>
            <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">Job Description</h4>
            <div class="prose prose-custom max-w-none">
              <p>We are looking for a Senior Software Engineer to join our team. You will be responsible for designing, developing, and maintaining high-quality software solutions.</p>
              <ul>
                <li>Design and implement scalable software solutions</li>
                <li>Collaborate with cross-functional teams</li>
                <li>Write clean, maintainable code</li>
                <li>Participate in code reviews and mentoring</li>
              </ul>
            </div>
          </div>

          <div>
            <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">Requirements</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h5 class="font-medium text-gray-900 dark:text-white mb-2">Technical Skills</h5>
                <ul class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• React, Node.js, TypeScript</li>
                  <li>• REST APIs, GraphQL</li>
                  <li>• AWS, Docker, Kubernetes</li>
                  <li>• Git, CI/CD pipelines</li>
                </ul>
              </div>
              <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h5 class="font-medium text-gray-900 dark:text-white mb-2">Experience</h5>
                <ul class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• 5+ years of experience</li>
                  <li>• Bachelor's degree in CS</li>
                  <li>• Agile development</li>
                  <li>• Team leadership</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 class="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">About the Company</h4>
            <p class="text-blue-800 dark:text-blue-200">
              Tech Company Inc. is a leading technology company focused on building innovative solutions for the modern workplace. We offer competitive salaries, excellent benefits, and opportunities for professional growth.
            </p>
          </div>
        </div>
      `;

      jobApplyLink.href = "#"; // Would be the actual job URL
    }, 1000);
  }
}

// Close job modal
function closeJobModal() {
  if (jobModalInstance) {
    jobModalInstance.hide();
  } else {
    // Fallback
    const modal = document.getElementById("job-modal");
    if (modal) {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    }
  }
}

// Update settings from UI
function updateSettingsFromUI() {
  const settings = loadSettings();

  // Search positions
  const positionsText = document.getElementById("search-positions").value;
  settings.searchPositions = positionsText.split(",").map((s) => s.trim())
    .filter((s) => s);

  // Blacklists
  const companiesText = document.getElementById("blacklist-companies").value;
  settings.filters.blacklistedCompanies = companiesText.split(",").map((s) =>
    s.trim()
  ).filter((s) => s);

  const wordsTitleText = document.getElementById("blacklist-words-title").value;
  settings.filters.blacklistedWordsTitle = wordsTitleText.split(",").map((s) =>
    s.trim()
  ).filter((s) => s);

  // Note: blacklist-words-description field was removed in the new UI
  // Keep existing values or set to empty array
  const wordsDescElement = document.getElementById(
    "blacklist-words-description",
  );
  if (wordsDescElement) {
    const wordsDescText = wordsDescElement.value;
    settings.filters.blacklistedWordsDescription = wordsDescText.split(",").map(
      (
        s,
      ) => s.trim(),
    ).filter((s) => s);
  } else {
    // Keep existing values if element doesn't exist
    settings.filters.blacklistedWordsDescription =
      settings.filters.blacklistedWordsDescription || [];
  }

  // Country filters
  const countryItems = document.querySelectorAll(
    "#country-filters .dynamic-item",
  );
  if (countryItems.length > 0) {
    settings.filters.countries = Array.from(countryItems).map((item, index) => {
      const nameInput = item.querySelector(`[data-country-index="${index}"]`);
      const typeSelect = item.querySelector(`[data-country-type="${index}"]`);
      return {
        name: nameInput ? nameInput.value.trim() : "",
        type: typeSelect ? typeSelect.value : "blacklist",
      };
    }).filter((country) => country.name);
  } else {
    // Keep existing country filters if no dynamic items
    settings.filters.countries = settings.filters.countries || [];
  }

  // Language requirements
  const langItems = document.querySelectorAll(
    "#language-filters .dynamic-item",
  );
  if (langItems.length > 0) {
    settings.filters.languages = Array.from(langItems).map((item, index) => {
      const langInput = item.querySelector(`[data-lang-index="${index}"]`);
      const levelSelect = item.querySelector(`[data-lang-level="${index}"]`);
      return {
        language: langInput ? langInput.value.trim() : "",
        level: levelSelect ? levelSelect.value : "Intermediate",
      };
    }).filter((lang) => lang.language);
  } else {
    // Keep existing language requirements if no dynamic items
    settings.filters.languages = settings.filters.languages || [];
  }

  // Work time filter
  const workStart = document.getElementById("work-start");
  const workEnd = document.getElementById("work-end");
  const workTimezone = document.getElementById("work-timezone");

  if (
    workStart && workEnd && workTimezone && workStart.value && workEnd.value
  ) {
    settings.filters.workTime = {
      start: workStart.value,
      end: workEnd.value,
      timezone: workTimezone.value,
    };
  } else {
    // Keep existing work time settings if elements don't exist
    settings.filters.workTime = settings.filters.workTime || undefined;
  }

  // Sources
  settings.sources.jobSites = [];
  const linkedinCheckbox = document.getElementById("source-linkedin");
  const indeedCheckbox = document.getElementById("source-indeed");
  const glassdoorCheckbox = document.getElementById("source-glassdoor");

  if (linkedinCheckbox && linkedinCheckbox.checked) {
    settings.sources.jobSites.push("linkedin");
  }
  if (indeedCheckbox && indeedCheckbox.checked) {
    settings.sources.jobSites.push("indeed");
  }
  if (glassdoorCheckbox && glassdoorCheckbox.checked) {
    settings.sources.jobSites.push("glassdoor");
  }

  // OpenAI
  if (!settings.sources.openaiWebSearch) {
    settings.sources.openaiWebSearch =
      DEFAULT_USER_SETTINGS.sources.openaiWebSearch;
  }

  const openaiKeyElement = document.getElementById("openai-api-key");
  const globalSearchElement = document.getElementById("global-search");

  if (openaiKeyElement) {
    settings.sources.openaiWebSearch.apiKey = openaiKeyElement.value;
  }
  if (globalSearchElement) {
    settings.sources.openaiWebSearch.globalSearch = globalSearchElement.checked;
  }

  return settings;
}

// Start search process
// Start search function
async function startSearch() {
  const settings = updateSettingsFromUI();
  saveSettings(settings);

  console.log("🚀 Starting multi-stage search with settings:", settings);

  // Reset UI
  resetProgressUI();
  progressSection.classList.remove("hidden");
  resultsSection.classList.add("hidden");

  // Generate session ID
  currentSessionId = Date.now().toString();

  try {
    const response = await fetch("/api/multi-stage/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settings,
        session_id: currentSessionId,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Multi-stage search started:", result);

      // Start progress monitoring
      startProgressMonitoring();
      progressInfo.textContent =
        `Multi-stage search started! Session: ${result.session_id}`;
      stopSearchButton.style.display = "inline-block";
    } else {
      throw new Error("Search failed");
    }
  } catch (error) {
    console.error("❌ Search error:", error);
    progressInfo.textContent = "Search failed. Please try again.";
  }
}

// Stop search function
async function stopSearch() {
  if (!currentSessionId) return;

  try {
    const response = await fetch(`/api/multi-stage/stop/${currentSessionId}`, {
      method: "POST",
    });

    const result = await response.json();
    console.log("🛑 Stop result:", result);

    if (result.success) {
      progressInfo.textContent = "Search stopped by user.";
      stopProgressMonitoring();
      stopSearchButton.style.display = "none";
    }
  } catch (error) {
    console.error("❌ Stop error:", error);
  }
}

// Reset progress UI
function resetProgressUI() {
  overallProgressBar.value = 0;
  overallProgressText.textContent = "0%";
  currentStageElement.textContent = "Preparing...";

  // Reset all stage items
  document.querySelectorAll(".stage-item").forEach((item) => {
    const statusElement = item.querySelector(".stage-status");
    const progressFill = item.querySelector(".stage-progress-fill");
    const detailsElement = item.querySelector(".stage-details");

    statusElement.textContent = "Pending";
    statusElement.className = "stage-status";
    progressFill.style.width = "0%";

    const stage = item.dataset.stage;
    if (stage === "collecting") {
      detailsElement.textContent = "Preparing to collect jobs...";
    } else if (stage === "filtering") {
      detailsElement.textContent = "Waiting for collection to complete...";
    } else if (stage === "enriching") {
      detailsElement.textContent = "Waiting for filtering to complete...";
    }
  });

  stopSearchButton.style.display = "none";
  progressSection.classList.add("hidden");
  resultsSection.classList.add("hidden");
}

// Start progress monitoring
function startProgressMonitoring() {
  if (progressUpdateInterval) {
    clearInterval(progressUpdateInterval);
  }

  progressUpdateInterval = setInterval(async () => {
    if (!currentSessionId) return;

    try {
      const response = await fetch(
        `/api/multi-stage/progress/${currentSessionId}`,
      );
      if (response.ok) {
        const progress = await response.json();
        updateProgressUI(progress);
      }
    } catch (error) {
      console.error("❌ Progress update error:", error);
    }
  }, 2000); // Update every 2 seconds
}

// Stop progress monitoring
function stopProgressMonitoring() {
  if (progressUpdateInterval) {
    clearInterval(progressUpdateInterval);
    progressUpdateInterval = null;
  }
}

// Update progress UI
function updateProgressUI(progress) {
  // Update overall progress
  overallProgressBar.value = progress.overallProgress;
  overallProgressText.textContent = `${progress.overallProgress}%`;

  // Update current stage
  const stageNames = {
    collecting: "📥 Collection",
    filtering: "🔍 Filtering",
    enriching: "🤖 Enrichment",
    completed: "✅ Completed",
  };
  currentStageElement.textContent = stageNames[progress.currentStage] ||
    progress.currentStage;

  // Update stage details
  Object.entries(progress.stages).forEach(([stageName, stageProgress]) => {
    const stageElement = document.querySelector(`[data-stage="${stageName}"]`);
    if (!stageElement) return;

    const statusElement = stageElement.querySelector(".stage-status");
    const progressFill = stageElement.querySelector(".stage-progress-fill");
    const detailsElement = stageElement.querySelector(".stage-details");

    // Update status
    statusElement.textContent = stageProgress.status.charAt(0).toUpperCase() +
      stageProgress.status.slice(1);
    statusElement.className = `stage-status ${stageProgress.status}`;

    // Update progress bar
    progressFill.style.width = `${stageProgress.progress}%`;

    // Update details
    let detailsText = "";
    if (stageProgress.status === "running") {
      if (stageProgress.itemsProcessed && stageProgress.itemsTotal) {
        detailsText =
          `Processing ${stageProgress.itemsProcessed}/${stageProgress.itemsTotal} items...`;
      } else {
        detailsText = "Running...";
      }
    } else if (stageProgress.status === "completed") {
      detailsText = `Completed: ${
        stageProgress.itemsProcessed || 0
      } items processed`;
    } else if (stageProgress.status === "failed") {
      detailsText = `Failed: ${
        stageProgress.errors?.join(", ") || "Unknown error"
      }`;
    } else if (stageProgress.status === "stopped") {
      detailsText = "Stopped by user";
    }

    if (detailsText) {
      detailsElement.textContent = detailsText;
    }
  });

  // Handle completion
  if (progress.isComplete) {
    stopProgressMonitoring();
    stopSearchButton.style.display = "none";

    if (progress.currentStage === "completed") {
      progressInfo.innerHTML =
        `<p>✅ Search completed! Overall progress: ${progress.overallProgress}%</p>`;
      resultsSection.classList.remove("hidden");
    } else {
      progressInfo.innerHTML =
        `<p>🛑 Search ${progress.currentStage}. Overall progress: ${progress.overallProgress}%</p>`;
    }
  }
}

// Dynamic event handlers
function bindDynamicEvents(_settings) {
  // Settings toggle
  if (toggleSettingsBtn) {
    toggleSettingsBtn.addEventListener("click", toggleSettings);
  }

  // Add country filter
  const addCountryBtn = document.getElementById("add-country");
  if (addCountryBtn) {
    addCountryBtn.addEventListener("click", () => addCountryFilter());
  }

  // Add language requirement
  const addLanguageBtn = document.getElementById("add-language");
  if (addLanguageBtn) {
    addLanguageBtn.addEventListener("click", () => addLanguageRequirement());
  }

  // Reset settings
  const resetBtn = document.getElementById("reset-settings");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Reset all settings to defaults?")) {
        const defaultSettings = { ...DEFAULT_USER_SETTINGS };
        saveSettings(defaultSettings);
        renderSettings(defaultSettings);
        bindDynamicEvents(defaultSettings);
      }
    });
  }

  // Export settings
  const exportBtn = document.getElementById("export-settings");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const settings = loadSettings();
      const dataStr = JSON.stringify(settings, null, 2);
      const dataUri = "data:application/json;charset=utf-8," +
        encodeURIComponent(dataStr);

      const exportFileDefaultName = "remote-job-scout-settings.json";

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();
    });
  }

  // Import settings
  const importBtn = document.getElementById("import-settings-btn");
  const importInput = document.getElementById("import-settings");
  if (importBtn && importInput) {
    importBtn.addEventListener("click", () => {
      importInput.click();
    });

    importInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedSettings = JSON.parse(e.target.result);
            saveSettings(importedSettings);
            renderSettings(importedSettings);
            bindDynamicEvents(importedSettings);
            showNotification("Settings imported successfully!", "success");
          } catch (_error) {
            showNotification(
              "Error importing settings: Invalid JSON file",
              "error",
            );
          }
        };
        reader.readAsText(file);
      }
    });
  }
}

// Global functions for removing filters (called from HTML)
globalThis.removeCountryFilter = function (index) {
  const settings = loadSettings();
  if (settings.filters.countries && settings.filters.countries[index]) {
    settings.filters.countries.splice(index, 1);
    saveSettings(settings);
    renderSettings(settings);
    bindDynamicEvents(settings);
  }
};

globalThis.removeLanguageRequirement = function (index) {
  const settings = loadSettings();
  if (settings.filters.languages && settings.filters.languages[index]) {
    settings.filters.languages.splice(index, 1);
    saveSettings(settings);
    renderSettings(settings);
    bindDynamicEvents(settings);
  }
};

globalThis.closeJobModal = closeJobModal;

function addCountryFilter() {
  const settings = loadSettings();
  if (!settings.filters.countries) {
    settings.filters.countries = [];
  }
  settings.filters.countries.push({ name: "", type: "blacklist" });
  saveSettings(settings);
  renderSettings(settings);
  bindDynamicEvents(settings);
}

function addLanguageRequirement() {
  const settings = loadSettings();
  if (!settings.filters.languages) {
    settings.filters.languages = [];
  }
  settings.filters.languages.push({ language: "", level: "Intermediate" });
  saveSettings(settings);
  renderSettings(settings);
  bindDynamicEvents(settings);
}

// Initialize app
function init() {
  const settings = loadSettings();
  renderSettings(settings);
  bindDynamicEvents(settings);

  // Initialize theme
  initTheme();

  // Initialize Flowbite components
  initFlowbiteComponents();

  // Bind events
  startSearchButton.addEventListener("click", startSearch);
  stopSearchButton.addEventListener("click", stopSearch);

  // Load more results button
  const loadMoreBtn = document.getElementById("load-more-results");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      showNotification(
        "Load more functionality would be implemented here",
        "info",
      );
    });
  }

  // Modal close handlers
  if (jobModal) {
    // Close modal when clicking outside
    jobModal.addEventListener("click", (e) => {
      if (e.target === jobModal) {
        closeJobModal();
      }
    });

    // Close modal with Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !jobModal.classList.contains("hidden")) {
        closeJobModal();
      }
    });
  }

  // Auto-save settings on change
  document.addEventListener("change", () => {
    const updatedSettings = updateSettingsFromUI();
    saveSettings(updatedSettings);
  });

  // Auto-save on input for dynamic fields
  document.addEventListener("input", () => {
    const updatedSettings = updateSettingsFromUI();
    saveSettings(updatedSettings);
  });

  console.log("🎯 Remote Job Scout initialized with modern UI");
}

// Start the app
document.addEventListener("DOMContentLoaded", init);
