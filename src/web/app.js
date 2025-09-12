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
const settingsContainer = document.getElementById("settings-container");
const startSearchButton = document.getElementById("start-search");
const progressSection = document.querySelector(".progress-section");
const _progressBar = document.getElementById("progress-bar");
const progressInfo = document.getElementById("progress-info");
const resultsSection = document.querySelector(".results-section");
const _resultsContainer = document.getElementById("results-container");

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
  settingsContainer.innerHTML = `
    <div class="row">
      <div class="col">
        <h3>🎯 Search Positions</h3>
        <textarea id="search-positions" rows="3" placeholder="Software Engineer, Frontend Developer, etc.">${
    settings.searchPositions.join(", ")
  }</textarea>
      </div>
    </div>

    <div class="row">
      <div class="col-6">
        <h3>🚫 Blacklisted Companies</h3>
        <textarea id="blacklist-companies" rows="3" placeholder="Company names to exclude">${
    settings.filters.blacklistedCompanies.join(", ")
  }</textarea>
      </div>
      <div class="col-6">
        <h3>🚫 Blacklisted Words (Titles)</h3>
        <textarea id="blacklist-words-title" rows="3" placeholder="Words to exclude from titles">${
    settings.filters.blacklistedWordsTitle.join(", ")
  }</textarea>
      </div>
    </div>

    <div class="row">
      <div class="col">
        <h3>🚫 Blacklisted Words (Descriptions)</h3>
        <textarea id="blacklist-words-description" rows="3" placeholder="Words to exclude from descriptions">${
    settings.filters.blacklistedWordsDescription.join(", ")
  }</textarea>
      </div>
    </div>

    <div class="row">
      <div class="col-6">
        <h3>🌍 Country Filters</h3>
        <div id="country-filters">
          ${renderCountryFilters(settings.filters.countries)}
        </div>
        <button id="add-country" class="button outline">+ Add Country</button>
      </div>
      <div class="col-6">
        <h3>🗣️ Language Requirements</h3>
        <div id="language-requirements">
          ${renderLanguageRequirements(settings.filters.languages)}
        </div>
        <button id="add-language" class="button outline">+ Add Language</button>
      </div>
    </div>

    <div class="row">
      <div class="col">
        <h3>⏰ Work Time Filter</h3>
        <div id="work-time-filter">
          ${renderWorkTimeFilter(settings.filters.workTime)}
        </div>
      </div>
    </div>

    <div class="row">
      <div class="col">
        <h3>🌍 Sources</h3>
        <label><input type="checkbox" id="source-linkedin" ${
    settings.sources.jobSites.includes("linkedin") ? "checked" : ""
  }> LinkedIn</label>
        <label><input type="checkbox" id="source-indeed" ${
    settings.sources.jobSites.includes("indeed") ? "checked" : ""
  }> Indeed</label>
        <label><input type="checkbox" id="source-glassdoor" ${
    settings.sources.jobSites.includes("glassdoor") ? "checked" : ""
  }> Glassdoor</label>
      </div>
    </div>

    <div class="row">
      <div class="col">
        <h3>🤖 OpenAI WebSearch</h3>
        <input type="password" id="openai-api-key" placeholder="API Key" value="${
    settings.sources.openaiWebSearch?.apiKey || ""
  }">
        <label><input type="checkbox" id="global-search" ${
    settings.sources.openaiWebSearch?.globalSearch ? "checked" : ""
  }> Global Search</label>
      </div>
    </div>

    <div class="row">
      <div class="col">
        <button id="reset-settings" class="button outline">🔄 Reset to Defaults</button>
        <button id="export-settings" class="button outline">📤 Export Settings</button>
        <input type="file" id="import-settings" accept=".json" style="display: none">
        <button id="import-settings-btn" class="button outline">📥 Import Settings</button>
      </div>
    </div>
  `;

  // Bind new event handlers
  bindDynamicEvents(settings);
}

// Render country filters
function renderCountryFilters(countries) {
  if (!countries || countries.length === 0) {
    return '<p class="text-muted">No country filters set</p>';
  }

  return countries.map((country, index) => `
    <div class="country-filter-item" style="margin-bottom: 0.5rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
      <input type="text" value="${country.name}" placeholder="Country name" style="margin-right: 0.5rem;" data-country-index="${index}">
      <select data-country-type="${index}">
        <option value="blacklist" ${
    country.type === "blacklist" ? "selected" : ""
  }>Blacklist</option>
        <option value="whitelist" ${
    country.type === "whitelist" ? "selected" : ""
  }>Whitelist</option>
      </select>
      <button class="button outline small" onclick="removeCountryFilter(${index})" style="margin-left: 0.5rem;">🗑️</button>
    </div>
  `).join("");
}

// Render language requirements
function renderLanguageRequirements(languages) {
  if (!languages || languages.length === 0) {
    return '<p class="text-muted">No language requirements set</p>';
  }

  return languages.map((lang, index) => `
    <div class="language-requirement-item" style="margin-bottom: 0.5rem; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
      <input type="text" value="${lang.language}" placeholder="Language" style="margin-right: 0.5rem;" data-lang-index="${index}">
      <select data-lang-level="${index}">
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
      <button class="button outline small" onclick="removeLanguageRequirement(${index})" style="margin-left: 0.5rem;">🗑️</button>
    </div>
  `).join("");
}

// Render work time filter
function renderWorkTimeFilter(workTime) {
  if (!workTime) {
    return `
      <p class="text-muted">No work time restrictions</p>
      <button id="enable-work-time" class="button outline small">Set Work Time Filter</button>
    `;
  }

  return `
    <div style="display: flex; gap: 0.5rem; align-items: center;">
      <label>Start: <input type="time" id="work-start" value="${workTime.start}"></label>
      <label>End: <input type="time" id="work-end" value="${workTime.end}"></label>
      <label>Timezone: <input type="text" id="work-timezone" value="${workTime.timezone}" placeholder="UTC+0"></label>
      <button id="disable-work-time" class="button outline small">Disable</button>
    </div>
  `;
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

  const wordsDescText =
    document.getElementById("blacklist-words-description").value;
  settings.filters.blacklistedWordsDescription = wordsDescText.split(",").map((
    s,
  ) => s.trim()).filter((s) => s);

  // Country filters
  const countryItems = document.querySelectorAll(".country-filter-item");
  settings.filters.countries = Array.from(countryItems).map((item, index) => {
    const nameInput = item.querySelector(`[data-country-index="${index}"]`);
    const typeSelect = item.querySelector(`[data-country-type="${index}"]`);
    return {
      name: nameInput ? nameInput.value.trim() : "",
      type: typeSelect ? typeSelect.value : "blacklist",
    };
  }).filter((country) => country.name);

  // Language requirements
  const langItems = document.querySelectorAll(".language-requirement-item");
  settings.filters.languages = Array.from(langItems).map((item, index) => {
    const langInput = item.querySelector(`[data-lang-index="${index}"]`);
    const levelSelect = item.querySelector(`[data-lang-level="${index}"]`);
    return {
      language: langInput ? langInput.value.trim() : "",
      level: levelSelect ? levelSelect.value : "Intermediate",
    };
  }).filter((lang) => lang.language);

  // Work time filter
  const workStart = document.getElementById("work-start");
  const workEnd = document.getElementById("work-end");
  const workTimezone = document.getElementById("work-timezone");

  if (workStart && workEnd && workTimezone) {
    settings.filters.workTime = {
      start: workStart.value,
      end: workEnd.value,
      timezone: workTimezone.value,
    };
  }

  // Sources
  settings.sources.jobSites = [];
  if (document.getElementById("source-linkedin").checked) {
    settings.sources.jobSites.push("linkedin");
  }
  if (document.getElementById("source-indeed").checked) {
    settings.sources.jobSites.push("indeed");
  }
  if (document.getElementById("source-glassdoor").checked) {
    settings.sources.jobSites.push("glassdoor");
  }

  // OpenAI
  if (!settings.sources.openaiWebSearch) {
    settings.sources.openaiWebSearch =
      DEFAULT_USER_SETTINGS.sources.openaiWebSearch;
  }
  settings.sources.openaiWebSearch.apiKey =
    document.getElementById("openai-api-key").value;
  settings.sources.openaiWebSearch.globalSearch =
    document.getElementById("global-search").checked;

  return settings;
}

// Start search process
async function startSearch() {
  const settings = updateSettingsFromUI();
  saveSettings(settings);

  console.log("🚀 Starting search with settings:", settings);

  // Show progress
  progressSection.style.display = "block";
  resultsSection.style.display = "none";

  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settings,
        session_id: Date.now().toString(),
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Search started:", result);
      progressInfo.textContent =
        `Search started! Session: ${result.session_id}`;
    } else {
      throw new Error("Search failed");
    }
  } catch (error) {
    console.error("❌ Search error:", error);
    progressInfo.textContent = "Search failed. Please try again.";
  }
}

// Dynamic event handlers
function bindDynamicEvents(_settings) {
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

  // Enable work time filter
  const enableWorkTimeBtn = document.getElementById("enable-work-time");
  if (enableWorkTimeBtn) {
    enableWorkTimeBtn.addEventListener("click", () => {
      const settings = loadSettings();
      if (!settings.filters.workTime) {
        settings.filters.workTime = {
          start: "09:00",
          end: "18:00",
          timezone: "UTC+0",
        };
      }
      renderSettings(settings);
      bindDynamicEvents(settings);
    });
  }

  // Disable work time filter
  const disableWorkTimeBtn = document.getElementById("disable-work-time");
  if (disableWorkTimeBtn) {
    disableWorkTimeBtn.addEventListener("click", () => {
      const settings = loadSettings();
      settings.filters.workTime = undefined;
      renderSettings(settings);
      bindDynamicEvents(settings);
    });
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
            alert("Settings imported successfully!");
          } catch (_error) {
            alert("Error importing settings: Invalid JSON file");
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

  // Bind events
  startSearchButton.addEventListener("click", startSearch);

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

  console.log("🎯 Remote Job Scout initialized");
}

// Start the app
document.addEventListener("DOMContentLoaded", init);
