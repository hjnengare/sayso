import { diversifyTrendingItems } from "@/app/utils/trendingDiversify";

describe("diversifyTrendingItems", () => {
  it("picks one per category then backfills", () => {
    const items = [
      { id: "a1", category: "a" },
      { id: "a2", category: "a" },
      { id: "b1", category: "b" },
      { id: "b2", category: "b" },
      { id: "c1", category: "c" },
      { id: "a3", category: "a" },
    ];

    const out = diversifyTrendingItems(items, 5, {
      getCategoryKey: (item) => item.category,
    });

    expect(out.map((x) => x.id)).toEqual(["a1", "b1", "c1", "a2", "b2"]);
  });

  it("behaves like a slice when there is only one category", () => {
    const items = [
      { id: "a1", category: "a" },
      { id: "a2", category: "a" },
      { id: "a3", category: "a" },
    ];

    const out = diversifyTrendingItems(items, 2, {
      getCategoryKey: (item) => item.category,
    });

    expect(out.map((x) => x.id)).toEqual(["a1", "a2"]);
  });
});
