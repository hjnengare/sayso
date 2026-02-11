import {
  CONTACT_COMPLETENESS_MAX_WEIGHTED_SCORE,
  calculateContactCompletenessNormalizedScore,
  calculateContactCompletenessScore,
  compareContactCompletenessDesc,
  reRankByContactCompleteness,
} from "./contactCompleteness";

describe("contactCompleteness", () => {
  it("calculates the max score when all tracked fields are valid", () => {
    const score = calculateContactCompletenessScore({
      phone: "+27 21 421 4848",
      email: "hello@example.com",
      website: "https://example.com",
      address: "123 Main Road, Cape Town",
      hours: { raw: "Mo-Fr 08:00-17:00" },
    });

    expect(score).toBe(CONTACT_COMPLETENESS_MAX_WEIGHTED_SCORE);
    expect(
      calculateContactCompletenessNormalizedScore({
        phone: "+27 21 421 4848",
        email: "hello@example.com",
        website: "https://example.com",
        address: "123 Main Road, Cape Town",
        hours: { raw: "Mo-Fr 08:00-17:00" },
      })
    ).toBe(1);
  });

  it("rejects invalid contact values", () => {
    const score = calculateContactCompletenessScore({
      phone: "123",
      email: "not-an-email",
      website: "invalid-url",
      address: "x",
      hours: "  ",
    });

    expect(score).toBe(0);
  });

  it("compares businesses by descending completeness", () => {
    const diff = compareContactCompletenessDesc(
      { phone: "+27 21 111 1111" },
      { phone: "+27 21 111 1111", email: "a@b.com", website: "example.com" }
    );

    expect(diff).toBeGreaterThan(0);
  });

  it("applies a bounded lift over existing order", () => {
    const items = [
      { id: "a", phone: null, email: null, website: null, address: null, hours: null },
      {
        id: "b",
        phone: "+27 21 111 1111",
        email: "hello@example.com",
        website: "https://example.com",
        address: "12 Main Street",
        hours: "Mo-Fr 08:00-17:00",
      },
      { id: "c", phone: null, email: null, website: null, address: null, hours: null },
    ];

    const reranked = reRankByContactCompleteness(items, { baseRankWeight: 6 });

    expect(reranked.map((item) => item.id)).toEqual(["b", "a", "c"]);
  });

  it("remains deterministic for ties", () => {
    const items = [
      { id: "a", phone: null, email: null, website: null, address: null, hours: null },
      { id: "b", phone: null, email: null, website: null, address: null, hours: null },
      { id: "c", phone: null, email: null, website: null, address: null, hours: null },
    ];

    const reranked = reRankByContactCompleteness(items, { baseRankWeight: 6 });

    expect(reranked.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });
});
