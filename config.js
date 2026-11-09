// ============================================================
//  НАЛАШТУВАННЯ
// ============================================================
// Supabase: Project Settings → API (або Connect).
//   SUPABASE_URL — Project URL, напр. "https://abcd1234.supabase.co"
//   SUPABASE_KEY — publishable / anon public key (НЕ service_role і НЕ secret!)
// Поки обидва рядки порожні — працює ДЕМО-режим: відповіді зберігаються лише
// в цьому браузері (зручно, щоб перевірити index.html + admin.html локально).
window.TOT_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_KEY: "",

  // Як часто адмінка оновлює результати (мс)
  ADMIN_REFRESH_MS: 4000,
  // Як часто слайд з рейтингом групи оновлюється у студентів (мс)
  RANKING_REFRESH_MS: 5000,

  // ---------- Слайд 2: This or that ----------
  tot: {
    title: "This or that",
    instructions:
      "Work in pairs or small groups. Choose quickly — don’t overthink your answers. " +
      "Explain one or two of your choices and say why you prefer them. " +
      "Compare your answers with your partner or group.",
    pairs: [
      { id: "p1", a: "long-term course",   b: "short, intensive course" },
      { id: "p2", a: "technical skills",   b: "communication skills" },
      { id: "p3", a: "studying first",     b: "learning on the job" },
      { id: "p4", a: "university degree",  b: "professional certificate" },
      { id: "p5", a: "broad knowledge",    b: "practical skills" },
      { id: "p6", a: "CV (résumé)",        b: "portfolio" },
      { id: "p7", a: "exams",              b: "coursework" }
    ]
  },

  // ---------- Слайд 3: The Employability Budget (+ слайд з рейтингом групи) ----------
  budget: {
    title: "The Employability Budget",
    instructions:
      "You have 100 career points. Divide all 100 points among the six career assets according to how " +
      "important you think each one is for employability. Your total must equal 100. Then compare your " +
      "points with your partner and discuss the questions. Give reasons for your choices.",
    total: 100,
    step: 5,
    assets: [
      { id: "degree",        label: "university degree" },
      { id: "experience",    label: "work experience" },
      { id: "certificate",   label: "professional certificate" },
      { id: "portfolio",     label: "portfolio" },
      { id: "technical",     label: "technical skills" },
      { id: "communication", label: "communication skills" }
    ],
    questions: [
      "Which category received the most points?",
      "Which category received the fewest points?",
      "Where is the biggest difference between your rankings?",
      "What would you refuse to spend more than 10 points on?",
      "Which category is most difficult to judge?"
    ],
    rankingTitle: "Our group’s priorities",
    rankingPrompt: "Do you agree with the group? Where is your ranking most different — and why?"
  },

  // ---------- Слайд 8: Make the case ----------
  case: {
    title: "Make the case",
    instructions:
      "Work in pairs or small groups. Clarify any unfamiliar expressions in the box. Choose a statement and " +
      "prepare a 30-second argument for or against it, using at least three expressions. Present your argument, " +
      "then defend your position when your partner or group challenges one of your points.",
    minExpressions: 3,
    timerSeconds: 30,
    expressions: [
      { id: "e1",  text: "carry more weight",              meaning: "to be considered more important or influential" },
      { id: "e2",  text: "recognised qualification",       meaning: "an officially accepted certificate, diploma or degree" },
      { id: "e3",  text: "stand out from other candidates", meaning: "to be more noticeable or impressive than other applicants" },
      { id: "e4",  text: "apply one’s knowledge",          meaning: "to use what you have learnt in a practical situation" },
      { id: "e5",  text: "assess practical skills",        meaning: "to judge how well someone can actually do a task" },
      { id: "e6",  text: "skills-based hiring",            meaning: "hiring people based on their skills rather than their education" },
      { id: "e7",  text: "hands-on experience",            meaning: "experience gained by actually doing something, not just studying it" },
      { id: "e8",  text: "gain industry knowledge",        meaning: "to learn how a particular industry or field works" },
      { id: "e9",  text: "improve communication skills",   meaning: "to get better at expressing ideas and working with other people" },
      { id: "e10", text: "get one’s foot in the door",     meaning: "to get a first opportunity that can lead to future success" },
      { id: "e11", text: "fill a skills gap",              meaning: "to develop an ability or area of knowledge that you are missing" }
    ],
    statements: [
      { id: "s1", text: "A degree is still the safest career investment." },
      { id: "s2", text: "Short courses are better for career changers." },
      { id: "s3", text: "Experience matters more than qualifications." },
      { id: "s4", text: "Portfolios are becoming more important than CVs." },
      { id: "s5", text: "Employers should focus more on skills than education." }
    ]
  },

  // ---------- Слайд 9: The £10K Education Challenge ----------
  invest: {
    title: "The £10K Education Challenge",
    instructions:
      "You have £10,000 to invest in your education. Tap a card to reveal its benefit or limitation, " +
      "then add it to your plan. Spend £10,000 or less.",
    budget: 10000,
    currency: "£",
    options: [
      { id: "bootcamp", name: "Bootcamp",                 price: 4000, img: "img/inv-bootcamp.png", back: "Fast and practical, but intensive and narrowly focused." },
      { id: "online",   name: "Online course",            price: 1000, img: "img/inv-online.png",   back: "Flexible and affordable, but may carry less weight with employers." },
      { id: "tech",     name: "Technical-skills course",  price: 2500, img: "img/inv-tech.png",     back: "It helps fill a specific skills gap, but focuses on a narrow area." },
      { id: "mentor",   name: "Career mentor",            price: 1500, img: "img/inv-mentor.png",   back: "They offer personalised guidance, but do not provide a formal qualification." },
      { id: "cert",     name: "Professional certificate", price: 3000, img: "img/inv-cert.png",     back: "You can fill a skills gap and be provided a recognised qualification." },
      { id: "uni",      name: "University module",        price: 6000, img: "img/inv-uni.png",      back: "It offers deeper knowledge, but uses most of your budget." }
    ],
    howTo: [
      ["Review the options.", "Click each card to reveal its benefit or limitation."],
      ["Choose your investments.", "Select as many options as you want, but your total must be £10,000 or less."],
      ["Build your career plan.", "Decide which combination will give you the best balance of qualifications, practical skills and experience."],
      ["Use the target language.", "Include at least 3 expressions from the lesson when explaining your choices."],
      ["Defend your plan.", "Explain why you chose these options and why you rejected the others."],
      ["Compare plans.", "Decide which group has made the strongest investment choices."]
    ]
  }
};
