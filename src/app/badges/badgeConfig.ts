import { Compass, Target, Trophy, Users } from "lucide-react";

export const BADGE_DETAILS: Record<string, { description: string; howToEarn: string }> = {
  // Explorer Badges
  explorer_dabbler: {
    description: "You're dipping your toes into different categories, exploring what the city has to offer.",
    howToEarn: "Review businesses in 2 different categories",
  },
  explorer_newbie_nomad: {
    description: "A curious soul just starting their journey of discovery across the city.",
    howToEarn: "Review businesses in 3 different categories",
  },
  explorer_curiosity_captain: {
    description: "Leading the way with an insatiable curiosity for new experiences.",
    howToEarn: "Review businesses in 5 different categories",
  },
  explorer_variety_voyager: {
    description: "Your diverse taste takes you on adventures across many different worlds.",
    howToEarn: "Review businesses in 7 different categories",
  },
  explorer_full_circle: {
    description: "You've come full circle, experiencing everything the city has to offer.",
    howToEarn: "Review businesses in all available categories",
  },

  // Food & Drink Specialists
  specialist_food_taste_tester: {
    description: "Your palate is your guide as you sample the culinary landscape.",
    howToEarn: "Review 3 Food & Drink businesses",
  },
  specialist_food_flavour_finder: {
    description: "You have a knack for discovering delicious hidden gems.",
    howToEarn: "Review 5 Food & Drink businesses",
  },
  specialist_food_foodie_boss: {
    description: "The ultimate authority on all things food in your city.",
    howToEarn: "Review 10 Food & Drink businesses",
  },
  specialist_food_coffee_connoisseur: {
    description: "From espresso to cold brew, you know your beans.",
    howToEarn: "Review 5 coffee shops or cafés",
  },
  specialist_food_dessert_detective: {
    description: "On a never-ending quest for the perfect sweet treat.",
    howToEarn: "Review 5 dessert or bakery spots",
  },
  specialist_food_brunch_enthusiast: {
    description: "Weekend mornings are made for exploring brunch menus.",
    howToEarn: "Review 5 brunch spots",
  },

  // Beauty & Wellness Specialists
  specialist_beauty_glow_getter: {
    description: "Always on the hunt for that perfect glow-up experience.",
    howToEarn: "Review 3 Beauty & Wellness businesses",
  },
  specialist_beauty_self_care_superstar: {
    description: "Self-care isn't just a trend for you, it's a lifestyle.",
    howToEarn: "Review 5 Beauty & Wellness businesses",
  },
  specialist_beauty_beauty_boss: {
    description: "The go-to expert for all beauty recommendations.",
    howToEarn: "Review 10 Beauty & Wellness businesses",
  },
  specialist_beauty_cuticle_queen: {
    description: "Nails always on point, and you know the best spots for it.",
    howToEarn: "Review 5 nail salons",
  },
  specialist_beauty_mane_lover: {
    description: "Your hair game is strong and you share the best stylists.",
    howToEarn: "Review 5 hair salons",
  },
  specialist_beauty_serenity_seeker: {
    description: "Finding peace and wellness wherever you go.",
    howToEarn: "Review 5 spas or wellness centers",
  },

  // Arts & Culture Specialists
  specialist_arts_heritage_hunter: {
    description: "Preserving and celebrating our rich cultural heritage.",
    howToEarn: "Review 3 Arts & Culture venues",
  },
  specialist_arts_local_lore_seeker: {
    description: "Passionate about local history and stories.",
    howToEarn: "Review 5 Arts & Culture venues",
  },
  specialist_arts_culture_master: {
    description: "A true connoisseur of arts and cultural experiences.",
    howToEarn: "Review 10 Arts & Culture venues",
  },
  specialist_arts_curtain_chaser: {
    description: "Never miss a show, from theater to live performances.",
    howToEarn: "Review 5 theaters or performance venues",
  },
  specialist_arts_canvas_collector: {
    description: "Art galleries and exhibitions are your happy place.",
    howToEarn: "Review 5 art galleries or museums",
  },
  specialist_arts_cinephile: {
    description: "From blockbusters to indie films, cinema is your passion.",
    howToEarn: "Review 5 cinemas or film venues",
  },

  // Outdoors & Adventure Specialists
  specialist_outdoors_nature_nomad: {
    description: "At home in nature, always seeking the next outdoor escape.",
    howToEarn: "Review 3 Outdoor & Adventure spots",
  },
  specialist_outdoors_thrill_seeker: {
    description: "Adrenaline is your fuel for adventure.",
    howToEarn: "Review 5 adventure or extreme sports venues",
  },
  specialist_outdoors_adventure_voyager: {
    description: "Every weekend is an opportunity for a new adventure.",
    howToEarn: "Review 10 Outdoor & Adventure spots",
  },
  specialist_outdoors_trail_tamer: {
    description: "Hiking trails don't stand a chance against you.",
    howToEarn: "Review 5 hiking trails or nature reserves",
  },
  specialist_outdoors_beach_bum: {
    description: "Sand between your toes, waves in your soul.",
    howToEarn: "Review 5 beaches or coastal spots",
  },
  specialist_outdoors_botanical_buff: {
    description: "Gardens and green spaces bring you joy.",
    howToEarn: "Review 5 gardens or botanical venues",
  },
  specialist_outdoors_daredevil: {
    description: "Fear is just another word for excitement.",
    howToEarn: "Review 7 extreme adventure activities",
  },

  // Shopping & Lifestyle Specialists
  specialist_shopping_retail_royalty: {
    description: "Shopping is an art form, and you've mastered it.",
    howToEarn: "Review 3 Shopping & Lifestyle businesses",
  },
  specialist_shopping_shopaholic: {
    description: "Retail therapy? You're the therapist.",
    howToEarn: "Review 5 Shopping & Lifestyle businesses",
  },
  specialist_shopping_style_spotter: {
    description: "Always ahead of the trends, sharing the best finds.",
    howToEarn: "Review 10 fashion or boutique stores",
  },
  specialist_shopping_gadget_goblin: {
    description: "Tech and gadgets are your playground.",
    howToEarn: "Review 5 electronics or tech stores",
  },
  specialist_shopping_baddie_on_budget: {
    description: "Looking fabulous doesn't have to break the bank.",
    howToEarn: "Review 5 budget-friendly or thrift stores",
  },

  // Family & Pets Specialists
  specialist_family_quality_time_seeker: {
    description: "Family time is precious, and you know the best spots for it.",
    howToEarn: "Review 3 Family & Pets friendly venues",
  },
  specialist_family_bonding_buff: {
    description: "Creating memories with loved ones is your specialty.",
    howToEarn: "Review 5 Family & Pets friendly venues",
  },
  specialist_family_playtime_pro: {
    description: "Expert at finding fun for the whole family.",
    howToEarn: "Review 10 Family & Pets friendly venues",
  },
  specialist_family_care_companion: {
    description: "Caring for family is what drives your recommendations.",
    howToEarn: "Review 5 family care or childcare services",
  },
  specialist_family_play_paws: {
    description: "Your fur babies deserve the best, and you find it.",
    howToEarn: "Review 5 pet-friendly or pet service venues",
  },
  specialist_family_friendly_spaces_finder: {
    description: "Always scouting for the most welcoming family spots.",
    howToEarn: "Review 7 kid-friendly venues",
  },

  // Experiences & Entertainment Specialists
  specialist_experiences_memory_maker: {
    description: "Every experience is a chance to create lasting memories.",
    howToEarn: "Review 3 Experiences & Entertainment venues",
  },
  specialist_experiences_curiosity_cruiser: {
    description: "Curiosity drives you to try new and unique experiences.",
    howToEarn: "Review 5 Experiences & Entertainment venues",
  },
  specialist_experiences_vibe_voyager: {
    description: "Always seeking the perfect atmosphere and vibe.",
    howToEarn: "Review 10 Experiences & Entertainment venues",
  },
  specialist_experiences_beat_chaser: {
    description: "Music moves you, and you know the best live venues.",
    howToEarn: "Review 5 music venues or clubs",
  },
  specialist_experiences_show_goer: {
    description: "Never miss a great show or performance.",
    howToEarn: "Review 5 entertainment shows or events",
  },
  specialist_experiences_weekend_warrior: {
    description: "Weekends are for making the most of every moment.",
    howToEarn: "Review 7 weekend activity spots",
  },

  // Professional Services Specialists
  specialist_services_service_scout: {
    description: "Finding reliable professional services is your forte.",
    howToEarn: "Review 3 Professional Services",
  },
  specialist_services_solution_seeker: {
    description: "Always finding the right solution for every need.",
    howToEarn: "Review 5 Professional Services",
  },
  specialist_services_service_pro: {
    description: "The trusted expert for professional service recommendations.",
    howToEarn: "Review 10 Professional Services",
  },
  specialist_services_fix_it_fairy: {
    description: "Know the best repair and maintenance services around.",
    howToEarn: "Review 5 repair or maintenance services",
  },
  specialist_services_money_minded: {
    description: "Financial wisdom guides your service recommendations.",
    howToEarn: "Review 5 financial or accounting services",
  },
  specialist_services_home_helper: {
    description: "Home services? You've got the best contacts.",
    howToEarn: "Review 5 home services or contractors",
  },

  // Milestone Badges
  milestone_new_voice: {
    description: "Your voice matters! Welcome to the community.",
    howToEarn: "Write your first review",
  },
  milestone_rookie_reviewer: {
    description: "You're getting the hang of this reviewing thing.",
    howToEarn: "Write 5 reviews",
  },
  milestone_level_up: {
    description: "Your reviewing skills are growing stronger.",
    howToEarn: "Write 10 reviews",
  },
  milestone_review_machine: {
    description: "Reviews flow from you like a well-oiled machine.",
    howToEarn: "Write 25 reviews",
  },
  milestone_century_club: {
    description: "An elite club of dedicated reviewers. Welcome!",
    howToEarn: "Write 100 reviews",
  },
  milestone_picture_pioneer: {
    description: "A picture says a thousand words, and you're starting to speak.",
    howToEarn: "Upload your first photo with a review",
  },
  milestone_snapshot_superstar: {
    description: "Your photos bring reviews to life.",
    howToEarn: "Upload 25 photos with reviews",
  },
  milestone_helpful_honeybee: {
    description: "Your reviews help others make great decisions.",
    howToEarn: "Receive 10 helpful votes on your reviews",
  },
  milestone_consistency_star: {
    description: "Consistent quality is your superpower.",
    howToEarn: "Review consistently for 4 weeks",
  },
  milestone_streak_spark: {
    description: "You're on fire! Keep that reviewing streak going.",
    howToEarn: "Maintain a 7-day reviewing streak",
  },

  // Community Badges
  community_early_birdie: {
    description: "You were here from the beginning, helping build our community.",
    howToEarn: "Join Sayso during the early access period",
  },
  community_community_helper: {
    description: "Your helpful nature makes this community stronger.",
    howToEarn: "Help 10 community members with their questions",
  },
  community_trend_starter: {
    description: "You set the trends others follow.",
    howToEarn: "Be the first to review a business that becomes popular",
  },
  community_columbus: {
    description: "Discovering uncharted territory, one business at a time.",
    howToEarn: "Be the first to review 5 new businesses",
  },
  community_loyal_one: {
    description: "Loyalty runs deep. You keep coming back to your favorites.",
    howToEarn: "Review the same business multiple times over 6 months",
  },
  community_neighbourhood_plug: {
    description: "The local expert everyone turns to for recommendations.",
    howToEarn: "Review 15 businesses in your neighborhood",
  },
  community_hidden_gem_hunter: {
    description: "You have a gift for finding hidden treasures others miss.",
    howToEarn: "Discover and review 5 lesser-known businesses",
  },
  community_lens_legend: {
    description: "Your photography skills elevate the entire platform.",
    howToEarn: "Upload 50 high-quality photos",
  },
  community_plug_of_year: {
    description: "The ultimate community contributor. A true legend!",
    howToEarn: "Be recognized as top contributor of the year",
  },
};

export const CATEGORY_META = {
  explorer: {
    title: "Explorer Badges",
    subtitle: "Venture into the unknown",
    description: "Earned by reviewing businesses across different categories. The more diverse your exploration, the more explorer badges you unlock.",
    icon: Compass,
    gradient: "from-emerald-500/20 to-teal-500/20",
    accentColor: "text-emerald-600",
    borderColor: "border-emerald-500/30",
  },
  specialist: {
    title: "Specialist Badges",
    subtitle: "Master your passions",
    description: "Become an expert in specific categories. Deep knowledge in your favorite areas earns you specialist recognition.",
    icon: Target,
    gradient: "from-sage/20 to-sage/10",
    accentColor: "text-sage",
    borderColor: "border-sage/30",
  },
  milestone: {
    title: "Milestone Badges",
    subtitle: "Celebrate your journey",
    description: "Mark your achievements as you grow with Sayso. Every review, photo, and helpful action counts toward your milestones.",
    icon: Trophy,
    gradient: "from-amber-500/20 to-yellow-500/20",
    accentColor: "text-amber-600",
    borderColor: "border-amber-500/30",
  },
  community: {
    title: "Community Badges",
    subtitle: "Connect and inspire",
    description: "Recognition for building and strengthening our community. Your contributions make Sayso better for everyone.",
    icon: Users,
    gradient: "from-coral/20 to-rose-500/20",
    accentColor: "text-coral",
    borderColor: "border-coral/30",
  },
};

export const SPECIALIST_CATEGORIES = {
  "food-drink": { title: "Food & Drink", emoji: "🍽️" },
  "beauty-wellness": { title: "Beauty & Wellness", emoji: "✨" },
  "arts-culture": { title: "Arts & Culture", emoji: "🎭" },
  "outdoors-adventure": { title: "Outdoors & Adventure", emoji: "🏔️" },
  "shopping-lifestyle": { title: "Shopping & Lifestyle", emoji: "🛍️" },
  "family-pets": { title: "Family & Pets", emoji: "👨‍👩‍👧" },
  "experiences-entertainment": { title: "Experiences & Entertainment", emoji: "🎉" },
  "professional-services": { title: "Professional Services", emoji: "💼" },
};

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};
