import { consolidate, getTicketStats, mapEvent } from "@/app/lib/events/quicketIngestMapper";

describe("Quicket ingest mapper", () => {
  it("derives ticket availability and min/max/display prices", () => {
    const stats = getTicketStats([
      { id: 1, name: "Early Bird", price: 150, soldOut: false, donation: false },
      { id: 2, name: "General", price: 250, soldOut: true, donation: false },
      { id: 3, name: "VIP", price: 450, soldOut: false, donation: false },
      { id: 4, name: "Donation", price: 50, donation: true },
    ]);

    expect(stats.minimumTicketPrice).toBe(150);
    expect(stats.maximumTicketPrice).toBe(450);
    expect(stats.displayPrice).toBe(150);
    expect(stats.ticketsAvailableBoolean).toBe(true);
    expect(stats.availabilityStatus).toBe("limited");
  });

  it("maps nested Quicket payload fields into persistence row shape", () => {
    const baseEvent = {
      id: 999,
      name: "Cape Town Music Night",
      description: "<p>Live show with multiple artists</p>",
      url: "https://www.quicket.co.za/events/999",
      imageUrl: "https://cdn.example.com/event.jpg",
      startDate: "2026-03-20T18:00:00Z",
      endDate: "2026-03-20T23:00:00Z",
      venue: {
        id: 123,
        name: "The Venue",
        addressLine1: "123 Main Road",
        addressLine2: "Green Point",
        latitude: -33.91,
        longitude: 18.41,
      },
      locality: {
        levelOne: "South Africa",
        levelTwo: "Western Cape",
        levelThree: "Cape Town",
      },
      organiser: {
        id: 77,
        name: "Nightlife Org",
        phone: "+27210000000",
        mobile: "+27820000000",
        facebookUrl: "https://facebook.com/nightlifeorg",
        twitterHandle: "nightlifeorg",
        hashTag: "#MusicNight",
        organiserPageUrl: "https://www.quicket.co.za/organisers/nightlifeorg",
      },
      categories: [{ id: 1, name: "Music" }, { id: 2, name: "Arts & Culture" }],
      tickets: [
        { id: 1, name: "General", soldOut: false, donation: false, price: 200 },
        { id: 2, name: "VIP", soldOut: true, donation: false, price: 450 },
      ],
      schedules: [
        { id: 1, name: "Doors Open", startDate: "2026-03-20T17:00:00Z", endDate: "2026-03-20T18:00:00Z" },
      ],
    };

    const detailEvent = {
      ...baseEvent,
      dateCreated: "2026-02-10T09:00:00Z",
      lastModified: "2026-03-10T12:00:00Z",
    };

    const row = mapEvent(
      baseEvent,
      detailEvent,
      "00000000-0000-4000-8000-000000000111",
      "00000000-0000-4000-8000-000000000222",
    );

    expect(row).not.toBeNull();
    expect(row?.quicket_event_id).toBe(999);
    expect(row?.event_name).toBe("Cape Town Music Night");
    expect(row?.event_url).toBe("https://www.quicket.co.za/events/999");
    expect(row?.venue_id).toBe(123);
    expect(row?.venue_name).toBe("The Venue");
    expect(row?.venue_address_line1).toBe("123 Main Road");
    expect(row?.organiser_name).toBe("Nightlife Org");
    expect(row?.organiser_phone).toBe("+27210000000");
    expect(row?.locality_level_three).toBe("Cape Town");
    expect(row?.minimum_ticket_price).toBe(200);
    expect(row?.maximum_ticket_price).toBe(450);
    expect(row?.tickets_available_boolean).toBe(true);
    expect(row?.availability_status).toBe("limited");
    expect(Array.isArray(row?.quicket_categories_json)).toBe(true);
    expect(Array.isArray(row?.tickets_json)).toBe(true);
    expect(Array.isArray(row?.schedules_json)).toBe(true);
    expect(row?.quicket_category_slug).toBe("music");
  });

  it("keeps richer non-null payload fields during consolidation", () => {
    const bizId = "00000000-0000-4000-8000-000000000111";
    const userId = "00000000-0000-4000-8000-000000000222";

    const rowA = mapEvent(
      {
        id: 111,
        name: "Tech Meetup",
        description: "Short desc",
        startDate: "2026-04-01T16:00:00Z",
        endDate: "2026-04-01T18:00:00Z",
        venue: { name: "Venue A" },
        locality: { levelOne: "South Africa", levelThree: "Cape Town" },
        categories: [{ name: "Business & Industry" }],
        tickets: [{ name: "General", price: 100, soldOut: false, donation: false }],
      },
      null,
      bizId,
      userId,
    );

    const rowB = mapEvent(
      {
        id: 111,
        name: "Tech Meetup",
        description: "Much richer and longer description about the event program and agenda",
        startDate: "2026-04-01T16:00:00Z",
        endDate: "2026-04-01T20:00:00Z",
        venue: { id: 88, name: "Venue A", addressLine1: "1 Loop St" },
        locality: { levelOne: "South Africa", levelTwo: "Western Cape", levelThree: "Cape Town" },
        organiser: { name: "Tech Org", phone: "+27210001111" },
        categories: [{ name: "Business & Industry" }],
        tickets: [{ name: "VIP", price: 350, soldOut: true, donation: false }],
      },
      null,
      bizId,
      userId,
    );

    expect(rowA).not.toBeNull();
    expect(rowB).not.toBeNull();

    const consolidated = consolidate([rowA!, rowB!]);
    expect(consolidated).toHaveLength(1);
    expect(consolidated[0].event_description).toContain("richer and longer");
    expect(consolidated[0].maximum_ticket_price).toBe(350);
    expect(consolidated[0].venue_id).toBe(88);
    expect(consolidated[0].organiser_name).toBe("Tech Org");
    expect(consolidated[0].event_end_date).toBe("2026-04-01T20:00:00.000Z");
  });
});
