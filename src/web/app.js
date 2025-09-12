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
const progressSection = document.querySelector(".progress-section");
const overallProgressBar = document.getElementById("overall-progress-bar");
const overallProgressText = document.getElementById("overall-progress-text");
const currentStageElement = document.getElementById("current-stage");
const progressInfo = document.getElementById("progress-info");
const stopSearchButton = document.getElementById("stop-search");
const resultsSection = document.querySelector(".results-section");
const _resultsContainer = document.getElementById("results-container");

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
  document.getElementById("search-positions").value = settings.searchPositions
    .join(", ");
  document.getElementById("blacklist-companies").value = settings.filters
    .blacklistedCompanies.join(", ");
  document.getElementById("blacklist-words-title").value = settings.filters
    .blacklistedWordsTitle.join(", ");
  document.getElementById("blacklist-words-description").value = settings
    .filters.blacklistedWordsDescription.join(", ");

  // Update checkboxes
  document.getElementById("source-linkedin").checked = settings.sources.jobSites
    .includes("linkedin");
  document.getElementById("source-indeed").checked = settings.sources.jobSites
    .includes("indeed");
  document.getElementById("source-glassdoor").checked = settings.sources
    .jobSites.includes("glassdoor");

  // OpenAI settings
  document.getElementById("openai-api-key").value =
    settings.sources.openaiWebSearch?.apiKey || "";
  document.getElementById("global-search").checked =
    settings.sources.openaiWebSearch?.globalSearch || false;

  // Render dynamic filters
  renderCountryFilters(settings.filters.countries);
  renderLanguageRequirements(settings.filters.languages);
  renderWorkTimeFilter(settings.filters.workTime);

  // Bind new event handlers
  bindDynamicEvents(settings);
}

// Render country filters
function renderCountryFilters(countries) {
  const container = document.getElementById("country-filters");

  if (!countries || countries.length === 0) {
    container.innerHTML = '<p class="text-muted">No country filters set</p>';
    return;
  }

  container.innerHTML = countries.map((country, index) => `
    <div class="dynamic-item">
      <input type="text" value="${country.name}" placeholder="Country name" data-country-index="${index}">
      <select data-country-type="${index}">
        <option value="blacklist" ${
    country.type === "blacklist" ? "selected" : ""
  }>Blacklist</option>
        <option value="whitelist" ${
    country.type === "whitelist" ? "selected" : ""
  }>Whitelist</option>
      </select>
      <button class="button outline small" onclick="removeCountryFilter(${index})">🗑️</button>
    </div>
  `).join("");
}

// Render language requirements
function renderLanguageRequirements(languages) {
  const container = document.getElementById("language-requirements");

  if (!languages || languages.length === 0) {
    container.innerHTML =
      '<p class="text-muted">No language requirements set</p>';
    return;
  }

  container.innerHTML = languages.map((lang, index) => `
    <div class="dynamic-item">
      <input type="text" value="${lang.language}" placeholder="Language" data-lang-index="${index}">
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
      <button class="button outline small" onclick="removeLanguageRequirement(${index})">🗑️</button>
    </div>
  `).join("");
}

// Render work time filter
function renderWorkTimeFilter(workTime) {
  const container = document.getElementById("work-time-filter");

  if (!workTime) {
    container.innerHTML = `
      <p class="text-muted">No work time restrictions</p>
      <button id="enable-work-time" class="button outline small">Set Work Time Filter</button>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; gap: var(--spacing-sm); align-items: center; flex-wrap: wrap;">
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
  const countryItems = document.querySelectorAll(
    "#country-filters .dynamic-item",
  );
  settings.filters.countries = Array.from(countryItems).map((item, index) => {
    const nameInput = item.querySelector(`[data-country-index="${index}"]`);
    const typeSelect = item.querySelector(`[data-country-type="${index}"]`);
    return {
      name: nameInput ? nameInput.value.trim() : "",
      type: typeSelect ? typeSelect.value : "blacklist",
    };
  }).filter((country) => country.name);

  // Language requirements
  const langItems = document.querySelectorAll(
    "#language-requirements .dynamic-item",
  );
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

  if (
    workStart && workEnd && workTimezone && workStart.value && workEnd.value
  ) {
    settings.filters.workTime = {
      start: workStart.value,
      end: workEnd.value,
      timezone: workTimezone.value,
    };
  } else {
    settings.filters.workTime = undefined;
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
  stopSearchButton.addEventListener("click", stopSearch);

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
