// Remote Job Scout - Client Application
import { DEFAULT_USER_SETTINGS } from "../types/settings.ts";

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
        <h3>🚫 Blacklisted Words</h3>
        <textarea id="blacklist-words" rows="3" placeholder="Words to exclude from titles">${
    settings.filters.blacklistedWordsTitle.join(", ")
  }</textarea>
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

  const wordsText = document.getElementById("blacklist-words").value;
  settings.filters.blacklistedWordsTitle = wordsText.split(",").map((s) =>
    s.trim()
  ).filter((s) => s);

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

// Initialize app
function init() {
  const settings = loadSettings();
  renderSettings(settings);

  // Bind events
  startSearchButton.addEventListener("click", startSearch);

  // Auto-save settings on change
  document.addEventListener("change", () => {
    const updatedSettings = updateSettingsFromUI();
    saveSettings(updatedSettings);
  });

  console.log("🎯 Remote Job Scout initialized");
}

// Start the app
document.addEventListener("DOMContentLoaded", init);
