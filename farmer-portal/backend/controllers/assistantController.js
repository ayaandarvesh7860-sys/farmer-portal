/**
 * AI Farmer Assistant.
 *
 * TWO MODES
 * ---------
 * 1. DEMO MODE (default, works offline, no key needed)
 *    A keyword-matching knowledge base answers common procurement questions
 *    in English, Hindi and Marathi.
 *
 * 2. REAL AI MODE (optional)
 *    Set these in your .env file and restart the server:
 *        AI_PROVIDER=anthropic     (or: openai)
 *        AI_API_KEY=your_key_here
 *        AI_MODEL=claude-sonnet-4-5
 *    The call is made below in callRealAI(). If the key is missing or the
 *    request fails, the assistant silently falls back to DEMO MODE so the
 *    project never breaks during a demonstration.
 */
const { db } = require('../config/db');

const LANGS = ['en', 'hi', 'mr'];

/* ------------------------------------------------------------------ *
 *  Knowledge base: each entry has keywords per language and an answer  *
 *  per language. Add new entries here to teach the demo assistant.     *
 * ------------------------------------------------------------------ */
const KB = [
  {
    id: 'documents',
    keywords: {
      en: ['document', 'documents', 'paper', 'papers', 'required', 'kagad'],
      hi: ['दस्तावेज', 'कागज', 'कागजात', 'जरूरी', 'चाहिए'],
      mr: ['कागदपत्र', 'कागदपत्रे', 'लागतात', 'आवश्यक']
    },
    answer: {
      en: 'For crop procurement you need six documents: Aadhaar card, farmer ID card, land record (7/12 extract), bank passbook copy, current season crop record, and a passport size photograph. Open the Documents page, upload each one as PDF, JPG or PNG under 5 MB, and the centre staff will verify them. Procurement can start once at least the land record and bank passbook are verified.',
      hi: 'फसल खरीद के लिए छह दस्तावेज चाहिए: आधार कार्ड, किसान पहचान पत्र, जमीन का रिकॉर्ड (7/12), बैंक पासबुक की कॉपी, इस मौसम का फसल रिकॉर्ड और पासपोर्ट साइज फोटो। दस्तावेज पेज खोलें और हर फाइल PDF, JPG या PNG में 5 MB से कम अपलोड करें। केंद्र का कर्मचारी उनकी जांच करेगा।',
      mr: 'पीक खरेदीसाठी सहा कागदपत्रे लागतात: आधार कार्ड, शेतकरी ओळखपत्र, सातबारा उतारा, बँक पासबुकची प्रत, चालू हंगामाचा पीक नोंद आणि पासपोर्ट साइज फोटो. कागदपत्रे पानावर जाऊन प्रत्येक फाइल PDF, JPG किंवा PNG मध्ये ५ MB पेक्षा कमी अपलोड करा. केंद्रातील कर्मचारी पडताळणी करतील.'
    }
  },
  {
    id: 'centre',
    keywords: {
      en: ['centre', 'center', 'nearby', 'near', 'location', 'distance', 'queue', 'waiting'],
      hi: ['केंद्र', 'नजदीक', 'पास', 'दूरी', 'कतार', 'लाइन', 'इंतजार'],
      mr: ['केंद्र', 'जवळ', 'अंतर', 'रांग', 'प्रतीक्षा', 'वेळ']
    },
    answer: {
      en: 'Open the Nearby Centres page and tap "Use my location". The portal reads your GPS position in the browser and lists centres sorted by distance, with working hours, current queue and estimated waiting time. You can also search by village or district if you do not want to share your location, filter by crop, and tap "Get directions" to open the route in a map.',
      hi: 'नजदीकी केंद्र पेज खोलें और "मेरी लोकेशन इस्तेमाल करें" दबाएं। पोर्टल आपके ब्राउज़र से GPS लोकेशन लेकर दूरी के अनुसार केंद्र दिखाएगा, साथ में समय, कतार और अनुमानित प्रतीक्षा समय। लोकेशन न देनी हो तो गांव या जिले का नाम लिखकर भी खोज सकते हैं।',
      mr: 'जवळची केंद्रे पान उघडा आणि "माझे स्थान वापरा" दाबा. पोर्टल तुमच्या ब्राउझरमधून GPS स्थान घेऊन अंतरानुसार केंद्रे दाखवते, त्यासोबत कामाची वेळ, सध्याची रांग आणि अंदाजे प्रतीक्षा वेळ. स्थान द्यायचे नसल्यास गाव किंवा जिल्हा शोधून सुद्धा केंद्र मिळेल.'
    }
  },
  {
    id: 'procurement_process',
    keywords: {
      en: ['procurement', 'sell', 'sale', 'submit', 'process', 'how to', 'register crop'],
      hi: ['खरीद', 'बेचना', 'बेचने', 'प्रक्रिया', 'कैसे', 'जमा'],
      mr: ['खरेदी', 'विकणे', 'विकण्यासाठी', 'प्रक्रिया', 'कसे', 'सादर']
    },
    answer: {
      en: 'The process has six steps: register on the portal, upload your documents, find a nearby centre, fill the procurement form with crop, quantity and harvest date, take your produce to the chosen centre on the given day, and collect the digital receipt after weighing and quality check. You can follow every stage live on the Procurement page.',
      hi: 'प्रक्रिया छह चरणों की है: पोर्टल पर रजिस्टर करें, दस्तावेज अपलोड करें, नजदीकी केंद्र चुनें, फसल, मात्रा और कटाई की तारीख भरकर फॉर्म जमा करें, तय दिन उपज केंद्र पर ले जाएं, और तौल व गुणवत्ता जांच के बाद डिजिटल रसीद प्राप्त करें।',
      mr: 'प्रक्रिया सहा टप्प्यांची आहे: पोर्टलवर नोंदणी करा, कागदपत्रे अपलोड करा, जवळचे केंद्र निवडा, पीक, वजन आणि कापणीची तारीख भरून अर्ज सादर करा, ठरलेल्या दिवशी माल केंद्रावर न्या आणि वजन व प्रतवारीनंतर डिजिटल पावती मिळवा.'
    }
  },
  {
    id: 'status',
    keywords: {
      en: ['status', 'stage', 'track', 'weighing', 'quality check', 'pending'],
      hi: ['स्थिति', 'स्टेटस', 'चरण', 'तौल', 'जांच'],
      mr: ['स्थिती', 'टप्पा', 'वजन', 'तपासणी', 'प्रगती']
    },
    answer: {
      en: 'A procurement moves through seven stages: Submitted, At Centre, Weighing, Quality Check, Accepted, Payment Processing and Completed. Submitted means the centre has your request. Weighing and Quality Check happen when you arrive with the produce. Once the stage becomes Completed, your digital receipt is generated automatically with the final rate and amount.',
      hi: 'खरीद सात चरणों से गुजरती है: जमा, केंद्र पर, तौल, गुणवत्ता जांच, स्वीकृत, भुगतान प्रक्रिया और पूर्ण। "पूर्ण" होते ही अंतिम दर और राशि के साथ डिजिटल रसीद अपने आप बन जाती है।',
      mr: 'खरेदी सात टप्प्यांतून जाते: सादर, केंद्रावर, वजन, प्रतवारी तपासणी, स्वीकृत, देयक प्रक्रिया आणि पूर्ण. "पूर्ण" झाल्यावर अंतिम दर आणि रकमेसह डिजिटल पावती आपोआप तयार होते.'
    }
  },
  {
    id: 'receipt',
    keywords: {
      en: ['receipt', 'bill', 'download', 'print', 'transaction number'],
      hi: ['रसीद', 'बिल', 'डाउनलोड', 'प्रिंट', 'लेनदेन'],
      mr: ['पावती', 'बिल', 'डाउनलोड', 'प्रिंट', 'व्यवहार']
    },
    answer: {
      en: 'Your digital receipt carries the farmer name and ID, crop, quantity, rate, amount, centre, date and a unique transaction number. Open the Receipts page to view, print, download or share it. Keep the transaction number safe, since scheme claims and payment queries are tracked with it.',
      hi: 'डिजिटल रसीद में किसान का नाम और आईडी, फसल, मात्रा, दर, राशि, केंद्र, तारीख और एक अनूठा लेनदेन नंबर होता है। रसीद पेज से इसे देख, प्रिंट, डाउनलोड या साझा कर सकते हैं। लेनदेन नंबर संभालकर रखें।',
      mr: 'डिजिटल पावतीवर शेतकऱ्याचे नाव व ओळख क्रमांक, पीक, वजन, दर, रक्कम, केंद्र, तारीख आणि एक स्वतंत्र व्यवहार क्रमांक असतो. पावती पानावरून ती पाहा, प्रिंट करा, डाउनलोड करा किंवा शेअर करा. व्यवहार क्रमांक जपून ठेवा.'
    }
  },
  {
    id: 'payment',
    keywords: {
      en: ['payment', 'money', 'amount', 'when will i get', 'bank', 'rate', 'price', 'msp'],
      hi: ['भुगतान', 'पैसा', 'राशि', 'कब मिलेगा', 'बैंक', 'दर', 'कीमत', 'एमएसपी'],
      mr: ['पैसे', 'रक्कम', 'देयक', 'कधी', 'बँक', 'दर', 'भाव', 'हमीभाव']
    },
    answer: {
      en: 'Payment is released to the bank account linked with your farmer record after the procurement reaches the Payment Processing stage, usually within a few working days. The rate applied is the support price or the market rate announced by the centre for that day, adjusted for the quality grade recorded at weighing. Check the rate printed on your digital receipt.',
      hi: 'खरीद "भुगतान प्रक्रिया" चरण में पहुंचने के बाद पैसा आपके किसान रिकॉर्ड से जुड़े बैंक खाते में भेजा जाता है, आमतौर पर कुछ कार्य दिवसों में। दर उस दिन केंद्र द्वारा घोषित समर्थन मूल्य या बाजार भाव होती है, जिसमें गुणवत्ता के अनुसार बदलाव होता है।',
      mr: 'खरेदी "देयक प्रक्रिया" टप्प्यावर आल्यानंतर रक्कम तुमच्या नोंदणीकृत बँक खात्यात जमा होते, साधारण काही कामकाजाच्या दिवसांत. दर हा त्या दिवशी केंद्राने जाहीर केलेला हमीभाव किंवा बाजारभाव असतो आणि प्रतवारीनुसार थोडा बदलतो.'
    }
  },
  {
    id: 'schemes',
    keywords: {
      en: ['scheme', 'subsidy', 'yojana', 'kisan', 'insurance', 'loan', 'government'],
      hi: ['योजना', 'सब्सिडी', 'किसान', 'बीमा', 'कर्ज', 'सरकारी'],
      mr: ['योजना', 'अनुदान', 'शेतकरी', 'विमा', 'कर्ज', 'सरकारी']
    },
    answer: {
      en: 'Common central schemes include PM-KISAN income support, PM Fasal Bima Yojana crop insurance, the Kisan Credit Card for short-term credit, the Soil Health Card programme and micro-irrigation subsidies. Your state agriculture department usually adds its own schemes. Carry your farmer ID, land record and bank details to the nearest agriculture office or Common Service Centre to apply, and check the official scheme portal for current dates.',
      hi: 'मुख्य केंद्रीय योजनाएं: पीएम-किसान सम्मान निधि, प्रधानमंत्री फसल बीमा योजना, किसान क्रेडिट कार्ड, मृदा स्वास्थ्य कार्ड और सूक्ष्म सिंचाई सब्सिडी। आवेदन के लिए किसान आईडी, जमीन का रिकॉर्ड और बैंक विवरण लेकर नजदीकी कृषि कार्यालय या CSC जाएं।',
      mr: 'प्रमुख केंद्रीय योजना: पीएम-किसान सन्मान निधी, प्रधानमंत्री पीक विमा योजना, किसान क्रेडिट कार्ड, मृदा आरोग्य पत्रिका आणि सूक्ष्म सिंचन अनुदान. अर्जासाठी शेतकरी ओळखपत्र, सातबारा आणि बँक तपशील घेऊन जवळच्या कृषी कार्यालयात किंवा आपले सरकार केंद्रात जा.'
    }
  },
  {
    id: 'register',
    keywords: {
      en: ['register', 'sign up', 'account', 'login', 'password', 'forgot'],
      hi: ['रजिस्टर', 'पंजीकरण', 'खाता', 'लॉगिन', 'पासवर्ड', 'भूल'],
      mr: ['नोंदणी', 'खाते', 'लॉगिन', 'पासवर्ड', 'विसरलो']
    },
    answer: {
      en: 'Tap Register in the top menu, enter your name, mobile number, state, district, village and a password of at least six characters. The portal creates your farmer ID automatically. If you forget the password, use "Forgot password" on the login page and set a new one with your registered mobile number.',
      hi: 'ऊपर मेन्यू में "रजिस्टर" दबाएं और नाम, मोबाइल नंबर, राज्य, जिला, गांव तथा कम से कम छह अक्षरों का पासवर्ड भरें। पोर्टल आपकी किसान आईडी अपने आप बना देता है। पासवर्ड भूल जाने पर लॉगिन पेज पर "पासवर्ड भूल गए" से नया पासवर्ड बनाएं।',
      mr: 'वरील मेनूमध्ये "नोंदणी" दाबा आणि नाव, मोबाइल क्रमांक, राज्य, जिल्हा, गाव व किमान सहा अक्षरांचा पासवर्ड भरा. पोर्टल तुमचा शेतकरी क्रमांक आपोआप तयार करते. पासवर्ड विसरल्यास लॉगिन पानावरील "पासवर्ड विसरलात?" वापरा.'
    }
  },
  {
    id: 'crop_care',
    keywords: {
      en: ['soybean', 'wheat', 'onion', 'cotton', 'rice', 'maize', 'pest', 'disease', 'sowing', 'irrigation', 'storage'],
      hi: ['सोयाबीन', 'गेहूं', 'प्याज', 'कपास', 'चावल', 'मक्का', 'कीट', 'रोग', 'बुवाई', 'सिंचाई', 'भंडारण'],
      mr: ['सोयाबीन', 'गहू', 'कांदा', 'कापूस', 'भात', 'मका', 'कीड', 'रोग', 'पेरणी', 'सिंचन', 'साठवण']
    },
    answer: {
      en: 'Open the Crop Information page and select the crop. Each crop card explains the suitable season, cultivation practice, soil and irrigation needs, harvesting stage, storage advice, common pests and diseases, and the precautions to take. For a field problem you can see but cannot identify, contact your nearest Krishi Vigyan Kendra, since a physical inspection is safer than a general answer.',
      hi: 'फसल जानकारी पेज खोलकर फसल चुनें। हर कार्ड में उपयुक्त मौसम, खेती की विधि, मिट्टी और सिंचाई की जरूरत, कटाई, भंडारण, आम कीट-रोग और सावधानियां दी गई हैं। खेत की किसी समस्या के लिए नजदीकी कृषि विज्ञान केंद्र से संपर्क करें।',
      mr: 'पीक माहिती पान उघडून पीक निवडा. प्रत्येक कार्डमध्ये योग्य हंगाम, लागवड पद्धत, जमीन व सिंचन गरज, कापणी, साठवण, सामान्य कीड-रोग आणि घ्यावयाची काळजी दिली आहे. शेतातील अडचणीसाठी जवळच्या कृषी विज्ञान केंद्राशी संपर्क साधा.'
    }
  }
];

const FALLBACK = {
  en: 'I can help with procurement steps, required documents, nearby centres, procurement status, receipts, payments, government schemes and basic crop guidance. Try asking something like "What documents are required for crop procurement?" or tap one of the suggested questions below.',
  hi: 'मैं खरीद प्रक्रिया, जरूरी दस्तावेज, नजदीकी केंद्र, खरीद की स्थिति, रसीद, भुगतान, सरकारी योजनाओं और बुनियादी फसल जानकारी में मदद कर सकता हूं। जैसे पूछें: "गेहूं बेचने के लिए कौन से दस्तावेज चाहिए?"',
  mr: 'मी खरेदी प्रक्रिया, आवश्यक कागदपत्रे, जवळची केंद्रे, खरेदीची स्थिती, पावती, देयक, सरकारी योजना आणि पीक माहितीत मदत करू शकतो. उदाहरणार्थ विचारा: "सोयाबीन विकण्यासाठी कोणती कागदपत्रे आवश्यक आहेत?"'
};

const SUGGESTIONS = {
  en: ['What documents are required for crop procurement?',
       'How do I find the nearest procurement centre?',
       'What does the "Quality Check" status mean?',
       'When will I receive the payment?',
       'Which government schemes can I apply for?'],
  hi: ['गेहूं बेचने के लिए कौन से दस्तावेज चाहिए?',
       'नजदीकी खरीद केंद्र कैसे खोजें?',
       'खरीद की स्थिति का क्या मतलब है?',
       'भुगतान कब मिलेगा?',
       'किसानों के लिए कौन सी सरकारी योजनाएं हैं?'],
  mr: ['सोयाबीन विकण्यासाठी कोणती कागदपत्रे आवश्यक आहेत?',
       'जवळचे खरेदी केंद्र कसे शोधायचे?',
       'खरेदीची स्थिती कशी पाहायची?',
       'पैसे कधी मिळतील?',
       'शेतकऱ्यांसाठी कोणत्या सरकारी योजना आहेत?']
};

/** Scores every knowledge-base entry against the question and picks the best. */
function findAnswer(message, lang) {
  const text = String(message || '').toLowerCase();
  let best = null, bestScore = 0;

  for (const entry of KB) {
    let score = 0;
    for (const l of LANGS) {
      for (const kw of entry.keywords[l]) {
        if (text.includes(kw.toLowerCase())) score += (l === lang ? 2 : 1);
      }
    }
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  if (!best) return { text: FALLBACK[lang], matched: null };
  return { text: best.answer[lang], matched: best.id };
}

/**
 * Optional real AI call. Returns null when no key is configured or the
 * request fails, so the caller can fall back to the demo knowledge base.
 */
async function callRealAI(message, lang, history) {
  const provider = (process.env.AI_PROVIDER || 'demo').toLowerCase();
  const key = process.env.AI_API_KEY;
  if (provider === 'demo' || !key) return null;

  const langName = lang === 'hi' ? 'Hindi' : lang === 'mr' ? 'Marathi' : 'English';
  const system = `You are the assistant of an Indian government crop procurement portal. ` +
    `Answer in ${langName}, in short simple sentences a farmer can follow. Cover procurement steps, ` +
    `required documents, procurement centres, status stages, receipts, payments, government schemes ` +
    `and general crop guidance. Never ask for Aadhaar or bank account numbers. If unsure, tell the ` +
    `farmer to confirm at the nearest procurement centre or Krishi Vigyan Kendra.`;

  try {
    if (provider === 'anthropic') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || 'claude-sonnet-4-5',
          max_tokens: 700,
          system,
          messages: [...history, { role: 'user', content: message }]
        })
      });
      if (!r.ok) return null;
      const data = await r.json();
      return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim() || null;
    }

    if (provider === 'openai') {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: process.env.AI_MODEL || 'gpt-4o-mini',
          max_tokens: 700,
          messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: message }]
        })
      });
      if (!r.ok) return null;
      const data = await r.json();
      return data.choices?.[0]?.message?.content?.trim() || null;
    }
  } catch (e) {
    console.warn('[assistant] real AI call failed, using demo mode:', e.message);
  }
  return null;
}

exports.chat = async (req, res) => {
  const lang = LANGS.includes(req.body.lang) ? req.body.lang : 'en';
  const message = String(req.body.message || '').trim();
  if (!message) return res.status(400).json({ error: 'Type a question first.' });
  if (message.length > 1000) return res.status(400).json({ error: 'Please keep the question shorter.' });

  const history = Array.isArray(req.body.history)
    ? req.body.history.slice(-6).filter(m => m && m.role && m.content)
        .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 1000) }))
    : [];

  const live = await callRealAI(message, lang, history);
  if (live) return res.json({ reply: live, mode: 'ai', lang });

  const { text, matched } = findAnswer(message, lang);
  res.json({ reply: text, mode: 'demo', matched, lang });
};

exports.suggestions = (req, res) => {
  const lang = LANGS.includes(req.query.lang) ? req.query.lang : 'en';
  const crops = db.prepare('SELECT name_en FROM crop_info LIMIT 3').all().map(c => c.name_en);
  res.json({
    suggestions: SUGGESTIONS[lang],
    mode: (process.env.AI_PROVIDER || 'demo').toLowerCase() !== 'demo' && process.env.AI_API_KEY ? 'ai' : 'demo',
    sampleCrops: crops
  });
};
