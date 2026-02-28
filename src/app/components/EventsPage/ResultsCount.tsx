// src/components/EventsPage/ResultsCount.tsx
"use client";

interface ResultsCountProps {
  count: number;
  filterType: "all" | "event" | "special";
}

export default function ResultsCount({ count, filterType }: ResultsCountProps) {
  const getFilterText = () => {
    switch (filterType) {
      case "all":
        return "events & specials";
      case "event":
        return "events";
      case "special":
        return "specials";
      default:
        return "items";
    }
  };

  return (
    <p className="font-google-sans text-body-sm text-charcoal/60">
      Showing {count} {getFilterText()}
    </p>
  );
}

