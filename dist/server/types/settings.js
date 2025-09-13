export const DEFAULT_USER_SETTINGS = {
    searchPositions: ['Software Engineer', 'Frontend Developer'],
    filters: {
        blacklistedCompanies: [],
        blacklistedWordsTitle: ['senior', 'lead'],
        blacklistedWordsDescription: ['agile', 'scrum'],
        countries: [],
        languages: [{ language: 'English', level: 'Intermediate' }],
    },
    sources: {
        jobSites: ['linkedin', 'indeed'],
        openaiWebSearch: {
            apiKey: '',
            searchSites: ['linkedin.com', 'indeed.com'],
            globalSearch: false,
        },
    },
    llm: {
        enrichmentInstructions: [
            'Extract company information and requirements',
            'Analyze job responsibilities and skills needed',
        ],
        processingRules: [],
    },
};
