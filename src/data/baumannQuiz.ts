export interface QuizOption {
  text: string;
  subtitle?: string; // The '?' makes it optional!
  points: number;
}

export interface QuizQuestion {
  id: number;
  category: 'hydration' | 'sensitivity' | 'pigmentation' | 'aging';
  text: string;
  subtext?: string;
  insight?: string;
  options: QuizOption[];
}

export const baumannQuiz: QuizQuestion[] = [
  // --- PART 1: OILY VS DRY (Hydration) ---
  {
    id: 1,
    category: 'hydration',
    text: "After washing your face, don't apply any skincare products. 2-3 hours later, look in a mirror under bright lights. Your forehead and cheeks feel or appear:",
    options: [
      { text: "Very rough, flaky, or ashy", points: 1 },
      { text: "Tight", points: 2 },
      { text: "Well hydrated with no reflection of light", points: 3 },
      { text: "Shiny with reflection of bright light", points: 4 }
    ]
  },
  {
    id: 2,
    category: 'hydration',
    text: "In photos, your face appears shiny:",
    options: [
      { text: "Never, or you've never noticed shine", points: 1 },
      { text: "Sometimes", points: 2 },
      { text: "Frequently", points: 3 },
      { text: "Always", points: 4 }
    ]
  },
  {
    id: 3,
    category: 'hydration',
    text: "2-3 hours after applying foundation makeup, but no powder, your makeup appears:",
    options: [
      { text: "Flaky or caked in wrinkles", points: 1 },
      { text: "Smooth", points: 2 },
      { text: "Shiny", points: 3 },
      { text: "Streaked and shiny", points: 4 },
      { text: "I do not wear facial makeup", points: 2.5 }
    ]
  },
  {
    id: 4,
    category: 'hydration',
    text: "When in a low-humidity environment, if you don't use moisturizer or sunscreen, your facial skin:",
    options: [
      { text: "Feels very dry or cracks", points: 1 },
      { text: "Feels tight", points: 2 },
      { text: "Feels normal", points: 3 },
      { text: "Looks shiny, or I never feel the need for moisturizer", points: 4 },
      { text: "I don't know", points: 2.5 }
    ]
  },

  // --- PART 2: SENSITIVE VS RESISTANT (Sensitivity) ---
  {
    id: 5,
    category: 'sensitivity',
    text: "You get red bumps on your face:",
    options: [
      { text: "Never", points: 1 },
      { text: "Rarely", points: 2 },
      { text: "At least once a month", points: 3 },
      { text: "At least once a week", points: 4 }
    ]
  },
  {
    id: 6,
    category: 'sensitivity',
    text: "Skincare products (including cleanser, moisturizer, toners, and makeup) cause your face to break out, get a rash, itch, or sting:",
    options: [
      { text: "Never", points: 1 },
      { text: "Rarely", points: 2 },
      { text: "Often", points: 3 },
      { text: "Always", points: 4 },
      { text: "I don't use products on my face", points: 2.5 }
    ]
  },
  {
    id: 7,
    category: 'sensitivity',
    text: "Have you ever been diagnosed by a dermatologist or doctor with acne or rosacea?",
    options: [
      { text: "No", points: 1 },
      { text: "Friends/acquaintances tell me I have it", points: 2 },
      { text: "Yes", points: 4 }, // Note the heavy weight for professional diagnosis!
      { text: "Yes, a severe case", points: 5 },
      { text: "Unsure", points: 2.5 }
    ]
  },
  {
    id: 8,
    category: 'sensitivity',
    text: "If you wear jewelry(Such as nickel, brass, silver, etc.), your skin gets a rash:",
    options: [
      { text: "Never", points: 1 },
      { text: "Rarely", points: 2 },
      { text: "Often", points: 3 },
      { text: "Always", points: 4 },
      { text: "I don't wear jewelry", points: 2.5 }
    ]
  },

  // --- PART 3: PIGMENTED VS NON-PIGMENTED (Pigmentation) ---
  {
    id: 9,
    category: 'pigmentation',
    text: "After you have a pimple or an ingrown hair, it leaves a dark brown or black spot:",
    options: [
      { text: "Never", points: 1 },
      { text: "Sometimes", points: 2 },
      { text: "Frequently", points: 3 },
      { text: "Always", points: 4 },
      { text: "I never get pimples or ingrown hairs", points: 2.5 }
    ]
  },
  {
    id: 10,
    category: 'pigmentation',
    text: "After you have been cut, how long does the brown mark (not a pink scar) stay on your skin?",
    options: [
      { text: "I don't get a brown mark", points: 1 },
      { text: "A week", points: 2 },
      { text: "A few weeks", points: 3 },
      { text: "Months", points: 4 }
    ]
  },
  {
    id: 11,
    category: 'pigmentation',
    text: "How many dark spots did you develop on your face during pregnancy, while on birth control pills, or while taking hormone replacement therapy (HRT)?",
    options: [
      { text: "None", points: 1 },
      { text: "One", points: 2 },
      { text: "A few", points: 3 },
      { text: "A lot", points: 4 },
      { text: "This question does not apply to me", points: 1 }
    ]
  },
  {
    id: 12,
    category: 'pigmentation',
    text: "Do you have dark spots or freckles on your face, chest, back, or arms?",
    options: [
      { text: "No", points: 1 },
      { text: "Yes, a few (1 to 5)", points: 2 },
      { text: "Yes, many (6 to 15)", points: 3 },
      { text: "Yes, tons (16 or more)", points: 4 }
    ]
  },

  // --- PART 4: WRINKLED VS TIGHT (Aging) ---
  {
    id: 13,
    category: 'aging',
    text: "Do you have facial wrinkles?",
    options: [
      { text: "No, not even with movement like smiling", points: 1 },
      { text: "Only when I move, like smiling or frowning", points: 2 },
      { text: "Yes, with movement and a few at rest without moving", points: 3 },
      { text: "Wrinkles are present even if I'm not smiling or frowning", points: 4 }
    ]
  },
  {
    id: 14,
    category: 'aging',
    text: "Which age group do you currently fall into?",
    subtext: "Chronological age is the most fundamental indicator for natural collagen depletion.",
    options: [
      { text: "Under 25 years old", points: 1 },
      { text: "25 to 39 years old", points: 2 },
      { text: "40 to 55 years old", points: 3 },
      { text: "56 years of age or older", points: 4 }
    ],
    insight: "Starting around age 25, the skin's natural collagen production decreases by about 1% per year. This gradual loss of elasticity is what shifts skin from the 'Tight' to the 'Wrinkle-Prone' category."
  },
  {
    id: 15,
    category: 'aging',
    text: "Have you ever tanned your facial skin intentionally in the sun or a tanning bed?",
    options: [
      { text: "Never", points: 1 },
      { text: "1 to 5 times", points: 2 },
      { text: "6 to 10 times", points: 3 },
      { text: "Many times", points: 4 }
    ]
  },
  {
    id: 16,
    category: 'aging',
    text: "On average, how much daily sun exposure do you get (living near the equator or in sunny places counts as more)?",
    options: [
      { text: "Little; I mostly live indoors and avoid the sun", points: 1 },
      { text: "Some; but I regularly wear sunscreen and avoid midday sun", points: 2 },
      { text: "Moderate; I have some sun exposure but not consistently high", points: 3 },
      { text: "High; I work or spend significant time outdoors in the sun", points: 4 }
    ]
  }
];
