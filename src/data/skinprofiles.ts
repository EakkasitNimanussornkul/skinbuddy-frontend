export interface SkinProfileData {
  subtitle: string;
  desc: string;
  quote: string;
  focusTitle: string;
  focusDesc: string;
  dos: string[];
  donts: string[];
  commonConcerns: string[];
  maintenanceLevel: "Low" | "Medium" | "High";
  idealTextures: {
    cleanser: string;
    moisturizer: string;
    sunscreen: string;
  };
  routineBlueprint: {
    am: string[];
    pm: string[];
  };
  recommendedProducts?: any[];
}

export const skinProfiles: Record<string, SkinProfileData> = {
  OSPW: {
    subtitle: "The Reactive Glow-Seeker",
    desc: "Characterized by excess sebum and a highly reactive barrier. Prone to breakouts, inflammation, and lingering dark spots, while also needing proactive collagen support.",
    quote: "Focus on calming the barrier while managing oil and addressing hyperpigmentation with gentle inhibitors.",
    focusTitle: "Barrier & Brightening",
    focusDesc: "Prioritize ceramides and gentle cleansers before introducing mild brightening acids.",
    dos: ["Niacinamide", "Ceramides", "Azelaic Acid", "Centella Asiatica"],
    donts: ["Harsh Physical Scrubs", "High-Strength Retinol", "Coconut Oil"],
    commonConcerns: ["Afternoon shine", "Post-acne dark marks", "Redness from actives", "Early fine lines"],
    maintenanceLevel: "High",
    idealTextures: {
      cleanser: "Gentle Foaming Gel",
      moisturizer: "Water-based Gel-Cream",
      sunscreen: "Matte Fluid or Milk"
    },
    routineBlueprint: {
      am: ["Gentle Gel Cleanser", "Soothing Centella Toner", "Niacinamide Serum", "Matte SPF 30+"],
      pm: ["Cleansing Balm", "Gel Cleanser", "Azelaic Acid (2-3x week)", "Ceramide Gel-Cream"]
    }
  },
  OSNW: {
    subtitle: "The Sensitive Ager",
    desc: "Produces high amounts of oil but struggles with redness and reactivity. Tone is generally even, but structural aging is a primary concern.",
    quote: "Hydration is key. Control oil without stripping the skin to protect your delicate barrier.",
    focusTitle: "Calm Collagen Support",
    focusDesc: "Use soothing peptides and avoid harsh retinoids that might trigger inflammation.",
    dos: ["Peptides", "Hyaluronic Acid", "Green Tea Extract", "Bakuchiol"],
    donts: ["Fragrance", "Essential Oils", "Strong AHAs (Glycolic)"],
    commonConcerns: ["Flushing and redness", "Oily surface but tight underneath", "Fine lines"],
    maintenanceLevel: "High",
    idealTextures: {
      cleanser: "Low-pH Foaming Wash",
      moisturizer: "Lightweight Lotion",
      sunscreen: "Mineral Gel SPF"
    },
    routineBlueprint: {
      am: ["Water Wash or Gentle Cleanser", "Green Tea Essence", "Peptide Serum", "Mineral SPF"],
      pm: ["Micellar Water", "Low-pH Cleanser", "Bakuchiol Serum", "Barrier Lotion"]
    }
  },
  OSPT: {
    subtitle: "The Pigmented Pores",
    desc: "Oily and sensitive with a strong tendency to form dark spots after breakouts. Your skin's structural integrity is currently tight and youthful.",
    quote: "Soothe the skin immediately after breakouts to prevent post-inflammatory hyperpigmentation.",
    focusTitle: "Gentle Fading",
    focusDesc: "Incorporate Azelaic Acid or Niacinamide to manage both redness and dark spots.",
    dos: ["Salicylic Acid (BHA)", "Tranexamic Acid", "Licorice Root", "Sulfur"],
    donts: ["Heavy Occlusives (Petrolatum)", "Harsh Astringents", "Vitamin E Oil"],
    commonConcerns: ["Stubborn hyperpigmentation", "Frequent breakouts", "Enlarged pores"],
    maintenanceLevel: "High",
    idealTextures: {
      cleanser: "Salicylic Acid Gel",
      moisturizer: "Oil-Free Gel",
      sunscreen: "Tinted Matte SPF"
    },
    routineBlueprint: {
      am: ["BHA Gel Cleanser", "Tranexamic Acid Toner", "Oil-Free Gel", "Matte SPF"],
      pm: ["Double Cleanse", "Sulfur Spot Treatment", "Niacinamide Serum", "Oil-Free Gel"]
    }
  },
  OSNT: {
    subtitle: "The Reactive Shine",
    desc: "Highly prone to redness and acne due to excess oil and barrier sensitivity, but naturally resists dark spots and wrinkles.",
    quote: "Less is more. A minimal routine will prevent overwhelming your reactive follicles.",
    focusTitle: "Inflammation Control",
    focusDesc: "Focus purely on soothing ingredients like Centella and Green Tea to tame redness.",
    dos: ["Aloe Vera", "Zinc", "Mugwort", "Lightweight Gel Cleansers"],
    donts: ["Isopropyl Alcohol", "Shea Butter", "Complex 10-step routines"],
    commonConcerns: ["Excess sebum", "Stinging from new products", "Hormonal acne"],
    maintenanceLevel: "Medium",
    idealTextures: {
      cleanser: "Soothing Milk or Gel",
      moisturizer: "Aloe/Mugwort Gel",
      sunscreen: "Zinc Oxide Mineral SPF"
    },
    routineBlueprint: {
      am: ["Water Wash", "Mugwort Essence", "Zinc Mineral SPF"],
      pm: ["Gentle Cleanser", "Aloe Soothing Gel", "Lightweight Lotion"]
    }
  },
  ORPW: {
    subtitle: "The Resilient Sun-Seeker",
    desc: "Oily and robust, but prone to dark spots and fine lines over time. Your strong barrier allows you to handle potent active ingredients well.",
    quote: "Leverage your robust barrier by using targeted treatments for pigmentation and aging.",
    focusTitle: "Active Cell Turnover",
    focusDesc: "Introduce Retinoids and Vitamin C confidently to tackle spots and boost collagen.",
    dos: ["Retinol", "L-Ascorbic Acid (Vit C)", "Glycolic Acid", "Kojic Acid"],
    donts: ["Comedogenic Oils", "Heavy Waxes", "Skipping SPF"],
    commonConcerns: ["Sun damage", "Deep wrinkles", "Thickened skin texture"],
    maintenanceLevel: "Medium",
    idealTextures: {
      cleanser: "Exfoliating Gel",
      moisturizer: "Fluid Lotion",
      sunscreen: "Chemical Fluid SPF"
    },
    routineBlueprint: {
      am: ["Exfoliating Cleanser", "Vitamin C Serum", "Light Lotion", "SPF 50+"],
      pm: ["Double Cleanse", "Glycolic Acid Toner", "Retinol Serum", "Light Lotion"]
    }
  },
  ORNW: {
    subtitle: "The Sturdy Ager",
    desc: "Oily and tough with an even tone. Your main focus is managing excess oil while proactively fighting the signs of aging.",
    quote: "Balance oil production while providing your skin with the structural support it needs.",
    focusTitle: "Retinoid Tolerance",
    focusDesc: "Your skin can handle strong anti-aging actives. Focus on daily SPF and nightly repair.",
    dos: ["Tretinoin", "Matrixyl Peptides", "Squalane", "Clay Masks"],
    donts: ["Over-moisturizing", "Rich Creams"],
    commonConcerns: ["Sagging skin", "Loss of elasticity", "Clogged pores"],
    maintenanceLevel: "Low",
    idealTextures: {
      cleanser: "Clay or Gel Wash",
      moisturizer: "Oil-Free Serum/Fluid",
      sunscreen: "Invisible Gel SPF"
    },
    routineBlueprint: {
      am: ["Gel Cleanser", "Peptide Serum", "Invisible SPF"],
      pm: ["Cleansing Balm", "Gel Wash", "Tretinoin/Retinol", "Fluid Moisturizer"]
    }
  },
  ORPT: {
    subtitle: "The Spot-Prone Shield",
    desc: "Produces healthy oil and rarely gets irritated, but tends to develop freckles or dark spots. Naturally tight and youthful.",
    quote: "Since your skin is strong, you can aggressively target dark spots without fear of redness.",
    focusTitle: "Potent Brightening",
    focusDesc: "Use AHAs and strong Vitamin C serums to actively fade pigmentation safely.",
    dos: ["Alpha Arbutin", "Lactic Acid", "Vitamin C", "Chemical Exfoliants"],
    donts: ["Skipping SPF", "Thick Mineral Oils"],
    commonConcerns: ["Freckles", "Melasma", "Uneven skin tone"],
    maintenanceLevel: "Medium",
    idealTextures: {
      cleanser: "AHA Foaming Wash",
      moisturizer: "Gel-Cream",
      sunscreen: "Brightening SPF"
    },
    routineBlueprint: {
      am: ["AHA Cleanser", "Vitamin C Serum", "Brightening SPF"],
      pm: ["Double Cleanse", "Alpha Arbutin Serum", "Lactic Acid (3x week)", "Gel-Cream"]
    }
  },
  ORNT: {
    subtitle: "The Effortless Glow",
    desc: "The most robust skin type. Oily enough to stay naturally moisturized, resistant to irritation, even-toned, and youthful.",
    quote: "Maintain your naturally excellent skin health with a simple, consistent maintenance routine.",
    focusTitle: "Maintenance & Prevention",
    focusDesc: "A basic cleanser, lightweight moisturizer, and daily SPF is all you need.",
    dos: ["Broad Spectrum SPF", "Gel Moisturizers", "Mild BHA"],
    donts: ["Over-complicating the routine", "Heavy pore-clogging ingredients"],
    commonConcerns: ["Occasional blackheads", "Shine control in summer"],
    maintenanceLevel: "Low",
    idealTextures: {
      cleanser: "Basic Foaming Wash",
      moisturizer: "Hydrating Essence or Gel",
      sunscreen: "Any lightweight SPF"
    },
    routineBlueprint: {
      am: ["Cleanser", "SPF 30+"],
      pm: ["Cleanser", "Mild BHA (if needed)", "Gel Moisturizer"]
    }
  },
  DSPW: {
    subtitle: "The Delicate Canvas",
    desc: "Lacks natural moisture and is highly reactive. Prone to dry patches, dark spots, and structural aging due to a compromised barrier.",
    quote: "Deep hydration and barrier repair must come before any anti-aging or brightening treatments.",
    focusTitle: "Barrier Rehabilitation",
    focusDesc: "Layer rich humectants and lipid-heavy creams to rebuild your defense system.",
    dos: ["Ceramides", "Glycerin", "Colloidal Oatmeal", "Panthenol"],
    donts: ["Foaming Cleansers", "Fragrance", "High-strength Acids"],
    commonConcerns: ["Flakiness", "Stinging", "Melasma", "Fine dehydration lines"],
    maintenanceLevel: "High",
    idealTextures: {
      cleanser: "Cream or Milk Cleanser",
      moisturizer: "Thick Lipid Cream",
      sunscreen: "Moisturizing Cream SPF"
    },
    routineBlueprint: {
      am: ["Water Wash only", "Glycerin Serum", "Thick Cream", "Moisturizing SPF"],
      pm: ["Oil Cleanser", "Cream Cleanser", "Panthenol Serum", "Thick Lipid Cream"]
    }
  },
  DSNW: {
    subtitle: "The Fragile Ager",
    desc: "Dry, red, and prone to fine lines, but maintains an even tone. Harsh environments easily trigger tightness and stinging.",
    quote: "Focus entirely on soothing and moisturizing. Avoid foaming cleansers and harsh exfoliants.",
    focusTitle: "Intense Moisture Repair",
    focusDesc: "Prioritize Colloidal Oatmeal, Ceramides, and gentle lipid replacement.",
    dos: ["Shea Butter", "Rosehip Oil", "Madecassoside", "Allantoin"],
    donts: ["Retinoids (until healed)", "Denatured Alcohol", "Witch Hazel"],
    commonConcerns: ["Eczema/Rosacea prone", "Severe winter dryness", "Loss of volume"],
    maintenanceLevel: "High",
    idealTextures: {
      cleanser: "Balm or Oil Cleanser",
      moisturizer: "Heavy Ointment or Balm",
      sunscreen: "Mineral Cream SPF"
    },
    routineBlueprint: {
      am: ["No wash (just water)", "Madecassoside Essence", "Heavy Balm", "Mineral SPF"],
      pm: ["Balm Cleanser", "Rosehip Oil", "Heavy Ointment"]
    }
  },
  DSPT: {
    subtitle: "The Reactive Spot-Prone",
    desc: "Dry and sensitive, making it tricky to treat the dark spots you are prone to without causing further irritation.",
    quote: "Brighten gently. Your barrier needs hydration before it can handle pigment inhibitors.",
    focusTitle: "Hydrating Brighteners",
    focusDesc: "Use Arbutin or low-percentage Niacinamide housed in rich moisturizing bases.",
    dos: ["Niacinamide (under 5%)", "Polyhydroxy Acids (PHAs)", "Jojoba Oil"],
    donts: ["Glycolic Acid", "Benzoyl Peroxide", "Scrubbing Brushes"],
    commonConcerns: ["Post-inflammatory erythema (red marks)", "Dullness", "Tightness"],
    maintenanceLevel: "High",
    idealTextures: {
      cleanser: "Hydrating Milk Cleanser",
      moisturizer: "Rich Cream",
      sunscreen: "Tinted Cream SPF"
    },
    routineBlueprint: {
      am: ["Milk Cleanser", "PHA Toner", "Rich Cream", "SPF"],
      pm: ["Oil Cleanser", "Milk Cleanser", "Low% Niacinamide", "Rich Cream + Jojoba Oil"]
    }
  },
  DSNT: {
    subtitle: "The Dry Reactor",
    desc: "Struggles to retain moisture and gets easily irritated, but naturally resists dark spots and maintains youthful elasticity.",
    quote: "Your only job is to trap water in your skin and protect it from environmental stressors.",
    focusTitle: "Moisture Retention",
    focusDesc: "Focus on Hyaluronic Acid applied to damp skin, sealed with a thick occlusive cream.",
    dos: ["Hyaluronic Acid", "Squalane", "Mineral Sunscreen (Zinc Oxide)"],
    donts: ["Chemical Sunscreens", "Essential Oils", "Hot Water Showers"],
    commonConcerns: ["Contact dermatitis", "Ashy appearance", "Rough texture"],
    maintenanceLevel: "Medium",
    idealTextures: {
      cleanser: "Lotion Cleanser",
      moisturizer: "Ceramide Cream",
      sunscreen: "Zinc Oxide Cream"
    },
    routineBlueprint: {
      am: ["Water Wash", "Hyaluronic Acid on damp skin", "Ceramide Cream", "Zinc SPF"],
      pm: ["Gentle Cleanser", "Hyaluronic Acid", "Ceramide Cream", "Squalane Oil"]
    }
  },
  DRPW: {
    subtitle: "The Sun-Weathered",
    desc: "Dry and robust, but heavily prone to dark spots and wrinkling. Your tough barrier means you can use strong hydrating actives.",
    quote: "Attack pigmentation and aging simultaneously while keeping the skin heavily moisturized.",
    focusTitle: "Strong Hydration Actives",
    focusDesc: "Use Lactic Acid to gently exfoliate, hydrate, and fade dark spots all at once.",
    dos: ["Lactic Acid", "Retinol in Squalane", "Vitamin C (L-Ascorbic)"],
    donts: ["Gel cleansers that strip oil", "Skipping occlusives"],
    commonConcerns: ["Deep sun spots", "Leathery texture", "Deep wrinkles"],
    maintenanceLevel: "Medium",
    idealTextures: {
      cleanser: "Hydrating Cream Wash",
      moisturizer: "Rich Emollient Cream",
      sunscreen: "Heavy Cream SPF"
    },
    routineBlueprint: {
      am: ["Cream Wash", "Vitamin C Serum", "Rich Cream", "SPF 50+"],
      pm: ["Double Cleanse", "Lactic Acid or Retinol", "Rich Emollient Cream"]
    }
  },
  DRNW: {
    subtitle: "The Dry Ager",
    desc: "Lacks oil and is prone to wrinkles, but rarely gets irritated and maintains an even tone. Needs heavy daily moisture.",
    quote: "Feed your skin with rich creams and potent anti-aging ingredients.",
    focusTitle: "Rich Anti-Aging",
    focusDesc: "Use Retinol layered over thick moisturizers to support collagen without drying you out.",
    dos: ["Retinol", "Peptides", "Ceramide-rich Creams", "Marula Oil"],
    donts: ["Astringent Toners", "Clay Masks", "Salicylic Acid"],
    commonConcerns: ["Loss of firmness", "Dull, matte appearance", "Crow's feet"],
    maintenanceLevel: "Medium",
    idealTextures: {
      cleanser: "Oil/Balm Wash",
      moisturizer: "Thick Anti-Aging Cream",
      sunscreen: "Moisturizing SPF"
    },
    routineBlueprint: {
      am: ["Cream Cleanser", "Peptide Serum", "Thick Cream", "SPF"],
      pm: ["Oil Cleanser", "Retinol Cream", "Marula Oil Overlay"]
    }
  },
  DRPT: {
    subtitle: "The Textured Canvas",
    desc: "Dry but tough. Tends to develop dark spots and hyperpigmentation but stays tight and youthful.",
    quote: "Since your skin isn't sensitive, you can aggressively exfoliate to remove dry, pigmented layers.",
    focusTitle: "Exfoliation & Hydration",
    focusDesc: "Use Glycolic Acid to treat spots, followed immediately by heavy moisturizers.",
    dos: ["Glycolic Acid", "Alpha Arbutin", "Urea", "Thick Emollients"],
    donts: ["Lightweight gels (not moisturizing enough)", "Skipping SPF"],
    commonConcerns: ["Rough, bumpy texture", "Sunspots", "Dullness"],
    maintenanceLevel: "Medium",
    idealTextures: {
      cleanser: "Exfoliating Cream Wash",
      moisturizer: "Urea-based Cream",
      sunscreen: "Hydrating SPF"
    },
    routineBlueprint: {
      am: ["Cream Wash", "Alpha Arbutin", "Urea Cream", "SPF"],
      pm: ["Double Cleanse", "Glycolic Acid (2-3x week)", "Thick Emollient"]
    }
  },
  DRNT: {
    subtitle: "The Resilient Desert",
    desc: "Tight, even-toned, and strong, but simply lacks natural oil and water. Very straightforward to treat.",
    quote: "Provide the moisture your skin can't make itself, and it will remain flawless.",
    focusTitle: "Deep Nourishment",
    focusDesc: "Use facial oils (like Squalane or Rosehip) to make up for your lack of natural sebum.",
    dos: ["Squalane", "Argan Oil", "Glycerin", "Petrolatum-based ointments"],
    donts: ["Over-washing", "Harsh bar soaps"],
    commonConcerns: ["Flakiness in winter", "Makeup clinging to dry spots"],
    maintenanceLevel: "Low",
    idealTextures: {
      cleanser: "Basic Cream Wash",
      moisturizer: "Thick Cream or Ointment",
      sunscreen: "Lotion SPF"
    },
    routineBlueprint: {
      am: ["Water Wash", "Glycerin Serum", "Thick Cream", "SPF"],
      pm: ["Cream Cleanser", "Thick Cream", "Argan/Squalane Oil Layer"]
    }
  }
}
