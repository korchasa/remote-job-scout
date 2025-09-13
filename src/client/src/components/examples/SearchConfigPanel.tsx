import { SearchConfigPanel } from "../SearchConfigPanel.tsx";

export default function SearchConfigPanelExample() {
  const handleStartSearch = (config: Record<string, unknown>) => {
    console.log("Search started with config:", config);
  };

  return (
    <SearchConfigPanel
      onStartSearch={handleStartSearch}
      isSearching={false}
    />
  );
}
