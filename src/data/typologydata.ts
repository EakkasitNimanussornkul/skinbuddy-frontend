export interface TraitDetail {
  letter: string
  name: string
  desc: string
  points: string[]
  image: string
}

export const typologyDetails: Record<string, TraitDetail> = {
  O: {
    letter: 'O',
    name: 'Oily',
    desc: 'Produces adequate to excess sebum. High natural moisture but prone to clogged pores.',
    points: ['Natural lipid protection', 'Prone to acne & congestion', 'Slower to show fine lines'],
    image: '/images/oily-skin.jpg'
  },
  D: {
    letter: 'D',
    name: 'Dry',
    desc: 'Produces insufficient natural sebum. Struggles to retain moisture.',
    points: ['Prone to flaking & tightness', 'Compromised skin barrier', 'Needs external lipid support'],
    image: '/images/dry-skin.png'
  },
  S: {
    letter: 'S',
    name: 'Sensitive',
    desc: 'High inflammatory response. Reacts easily to products and environment.',
    points: ['Prone to redness & stinging', 'Easily disrupted barrier', 'Requires soothing ingredients'],
    image: '/images/sensitive-skin.png'
  },
  R: {
    letter: 'R',
    name: 'Resistant',
    desc: 'Low inflammatory response. A strong, intact barrier that rarely reacts.',
    points: ['Rarely stings or breaks out', 'Tolerates strong actives well', 'Harder for products to penetrate'],
    image: '/images/resistant-skin.png'
  },
  P: {
    letter: 'P',
    name: 'Pigmented',
    desc: 'High melanin production tendency. Prone to dark spots and uneven tone.',
    points: ['Prone to post-acne marks', 'High risk of sun spots/melasma', 'Requires daily tyrosinase inhibitors'],
    image: '/images/pigmented-skin.jpg'
  },
  N: {
    letter: 'N',
    name: 'Non-Pigmented',
    desc: 'Low melanin production tendency. Generally maintains an even skin tone.',
    points: ['Even skin tone naturally', 'Lower risk of dark spots', 'Marks fade relatively quickly'],
    image: '/images/non-pigmented-skin.jpg'
  },
  W: {
    letter: 'W',
    name: 'Wrinkle-Prone',
    desc: 'Lower collagen and elastin retention. Shows signs of aging earlier.',
    points: ['Prone to fine lines & sagging', 'Needs antioxidant protection', 'Requires collagen-boosting actives'],
    image: '/images/wrinkle-prone-skin.jpg'
  },
  T: {
    letter: 'T',
    name: 'Tight',
    desc: 'High collagen and elastin retention. Maintains youthful structural integrity.',
    points: ['Firm and elastic skin', 'Fewer visible wrinkles', 'Focus is on preservation & SPF'],
    image: '/images/tight-skin.jpg'
  }
}
