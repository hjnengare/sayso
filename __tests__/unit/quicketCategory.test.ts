import {
  normalizeQuicketCategory,
  normalizeQuicketCategoryParam,
  shouldIncludeForQuicketCategoryFilter,
} from "@/app/lib/events/quicketCategory";

describe("Quicket category normalization", () => {
  it("maps known categories to the fixed taxonomy", () => {
    expect(normalizeQuicketCategory({ categoryNames: ["Live Music"] }).slug).toBe("music");
    expect(normalizeQuicketCategory({ categoryNames: ["Street Festival"] }).slug).toBe("festivals");
    expect(normalizeQuicketCategory({ categoryNames: ["Business Networking"] }).slug).toBe("tech-business");
    expect(normalizeQuicketCategory({ categoryNames: ["Art Exhibition"] }).slug).toBe("arts");
    expect(normalizeQuicketCategory({ categoryNames: ["Wine Tasting"] }).slug).toBe("food-drink");
    expect(normalizeQuicketCategory({ categoryNames: ["Family Meetup"] }).slug).toBe("community");
  });

  it("falls back to community for mixed/unknown values", () => {
    const result = normalizeQuicketCategory({
      categoryNames: ["Other", "General"],
      fallbackText: "Something local and social",
    });

    expect(result.slug).toBe("community");
    expect(result.label).toBe("Community");
    expect(result.rawNames).toEqual([]);
  });

  it("treats unknown explicit category names as community instead of text-derived guesses", () => {
    const result = normalizeQuicketCategory({
      categoryNames: ["Unmapped Category"],
      fallbackText: "Live music with DJs all night",
    });

    expect(result.slug).toBe("community");
    expect(result.label).toBe("Community");
    expect(result.rawNames).toEqual(["Unmapped Category"]);
  });

  it("normalizes valid query params and rejects invalid values", () => {
    expect(normalizeQuicketCategoryParam("music")).toBe("music");
    expect(normalizeQuicketCategoryParam("TECH-BUSINESS")).toBe("tech-business");
    expect(normalizeQuicketCategoryParam("random")).toBeNull();
    expect(normalizeQuicketCategoryParam("")).toBeNull();
  });

  it("classifies common Quicket category labels correctly", () => {
    expect(normalizeQuicketCategory({ categoryNames: ["Business & Networking"] }).slug).toBe("tech-business");
    expect(normalizeQuicketCategory({ categoryNames: ["Nightlife and Parties"] }).slug).toBe("music");
    expect(normalizeQuicketCategory({ categoryNames: ["Markets"] }).slug).toBe("food-drink");
    expect(normalizeQuicketCategory({ categoryNames: ["Arts & Culture"] }).slug).toBe("arts");
    expect(normalizeQuicketCategory({ categoryNames: ["Business & Industry"] }).slug).toBe("tech-business");
    expect(normalizeQuicketCategory({ categoryNames: ["Science & Technology"] }).slug).toBe("tech-business");
    expect(normalizeQuicketCategory({ categoryNames: ["Holiday & Seasonal"] }).slug).toBe("festivals");
    expect(normalizeQuicketCategory({ categoryNames: ["Film & Media"] }).slug).toBe("arts");
  });

  it("maps the current Quicket website categories to the fixed taxonomy", () => {
    const cases: Array<[string, string]> = [
      ["Health & Wellness", "community"],
      ["Sports & Fitness", "community"],
      ["Film & Media", "arts"],
      ["Travel & Outdoor", "community"],
      ["Afrikaans", "arts"],
      ["Occasion", "festivals"],
      ["Music", "music"],
      ["Arts & Culture", "arts"],
      ["Food & Drink", "food-drink"],
      ["Hobbies & Interests", "community"],
      ["Business & Industry", "tech-business"],
      ["Community", "community"],
      ["Charity & Causes", "community"],
      ["Faith & Spirituality", "community"],
      ["Family & Education", "community"],
      ["Holiday & Seasonal", "festivals"],
      ["Science & Technology", "tech-business"],
      ["Other", "community"],
    ];

    for (const [input, expected] of cases) {
      expect(normalizeQuicketCategory({ categoryNames: [input] }).slug).toBe(expected);
    }
  });

  it("prioritizes provided category names over noisy fallback text", () => {
    const result = normalizeQuicketCategory({
      categoryNames: ["Business & Networking"],
      fallbackText: "Live music festival with DJs and food trucks",
    });

    expect(result.slug).toBe("tech-business");
  });

  it("chooses the strongest explicit category when multiple Quicket categories are present", () => {
    expect(normalizeQuicketCategory({ categoryNames: ["Community", "Music"] }).slug).toBe("music");
    expect(normalizeQuicketCategory({ categoryNames: ["Community", "Business & Industry"] }).slug).toBe(
      "tech-business"
    );
  });
});

describe("Quicket category filter behavior", () => {
  it("filters only quicket events and leaves specials/non-quicket events untouched", () => {
    expect(
      shouldIncludeForQuicketCategoryFilter({
        selectedCategory: "tech-business",
        type: "event",
        icon: "quicket",
        quicketCategorySlug: "tech-business",
      })
    ).toBe(true);

    expect(
      shouldIncludeForQuicketCategoryFilter({
        selectedCategory: "tech-business",
        type: "event",
        icon: "quicket",
        quicketCategorySlug: "arts",
      })
    ).toBe(false);

    expect(
      shouldIncludeForQuicketCategoryFilter({
        selectedCategory: "tech-business",
        type: "special",
        icon: "quicket",
        quicketCategorySlug: "arts",
      })
    ).toBe(true);

    expect(
      shouldIncludeForQuicketCategoryFilter({
        selectedCategory: "tech-business",
        type: "event",
        icon: "ticketmaster",
        quicketCategorySlug: null,
      })
    ).toBe(true);
  });

  it("treats missing quicket category as community", () => {
    expect(
      shouldIncludeForQuicketCategoryFilter({
        selectedCategory: "community",
        type: "event",
        icon: "quicket",
        quicketCategorySlug: null,
      })
    ).toBe(true);

    expect(
      shouldIncludeForQuicketCategoryFilter({
        selectedCategory: null,
        type: "event",
        icon: "quicket",
        quicketCategorySlug: "music",
      })
    ).toBe(true);
  });
});
