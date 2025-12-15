import OpenAI from 'openai';

// Fun, factual prompts for 20+ smart audience - multiple correct answers
const FACTUAL_PROMPTS = {
  'Pop Culture & TV': [
    'A character from The Office (US)',
    'A character from Friends',
    'A character from Brooklyn Nine-Nine',
    'A character from Game of Thrones',
    'A character from Harry Potter',
    'A Netflix original series',
    'A character from The Big Bang Theory',
    'A Marvel Cinematic Universe character',
    'A Disney villain',
    'A character from How I Met Your Mother',
    'A Pixar movie character',
    'A character from Stranger Things',
    'A reality TV show',
    'A late night talk show host',
    'A famous movie quote source',
  ],
  'Office Life & Work': [
    'Something found in an office',
    'A character from The Office (US)',
    'An excuse for being late to work',
    'Something you replace at work',
    'A way to get from here to there',
    'Something in a desk drawer',
    'A thing coworkers always steal',
    'An office supply',
    'Something that breaks in the office',
    'A reason to leave work early',
    'A thing found in the break room',
    'An office prank',
    'Something you hide from your boss',
    'A work-from-home essential',
    'A thing that makes office life bearable',
  ],
  'Kitchen & Cooking': [
    'Something found in a kitchen drawer',
    'A kitchen appliance',
    'A type of cooking utensil',
    'Something you store in a refrigerator',
    'A baking ingredient',
    'A type of cookware (pot, pan, etc.)',
    'Something found in a spice rack',
    'A kitchen gadget',
    'A type of knife used in cooking',
    'Something you find under the kitchen sink',
    'A breakfast item you cook',
    'A condiment in your fridge door',
    'Something measured when baking',
    'A type of pasta sauce',
    'A cuisine style',
  ],
  'Smart & Science': [
    'A female scientist or inventor',
    'A Nobel Prize winning scientist',
    'A famous physicist',
    'A chemical element on the periodic table',
    'A part of the human brain',
    'A type of logical fallacy',
    'A programming language',
    'A famous mathematician',
    'A theory in physics',
    'A space mission or spacecraft',
    'A famous inventor',
    'An astronomical phenomenon',
    'A type of renewable energy',
    'A scientific unit of measurement',
    'A famous science experiment',
  ],
  'Cocktails & Drinks': [
    'A classic cocktail',
    'A type of whiskey or bourbon',
    'A coffee shop drink',
    'A non-alcoholic mocktail',
    'A type of wine (by grape or region)',
    'A beer brand',
    'An ingredient in a margarita',
    'A type of gin',
    'A famous bartender cocktail',
    'Something you mix with vodka',
    'A hot beverage (not coffee)',
    'A smoothie ingredient',
    'A champagne brand',
    'A tequila cocktail',
    'A drink with "sour" in the name',
  ],
  'Music & Artists': [
    'A Grammy winning artist',
    'A member of a famous band',
    'A 90s one-hit wonder',
    'A famous DJ or electronic artist',
    'A hip-hop/rap artist',
    'A famous guitarist',
    'A Bollywood playback singer',
    'A song that was #1 on Billboard',
    'A famous music festival',
    'An album that went platinum',
    'A famous music producer',
    'A K-pop group or artist',
    'A famous drummer',
    'A song used in a movie scene',
    'A singer who acted in movies',
  ],
  'Adult Humor & Life': [
    'Something you dread on Monday mornings',
    'An excuse for being late',
    'An excuse to skip work',
    'Something you replace',
    'A way to get from here to there',
    'Something you regret buying online',
    'A first date disaster topic',
    'Something that gets better with age',
    'A reason to need coffee',
    'Something you pretend to understand',
    'A skill you lie about on your resume',
    'Something you Google at 3 AM',
    'A thing that costs more than it should',
    'An adulting task everyone hates',
    'Something your parents warned you about',
    'A reason to cancel plans',
    'Something you shouldn\'t say at work',
    'A thing people overshare on social media',
  ],
  'Travel & Adventure': [
    'A bucket list destination',
    'An airline you\'ve heard of',
    'Something you pack but never use',
    'A famous landmark',
    'A beach destination',
    'A ski resort destination',
    'Something annoying about airports',
    'A famous road trip route',
    'A UNESCO World Heritage Site',
    'A cruise line',
    'A type of vacation',
    'A backpacker destination',
    'Something you forget to pack',
    'A famous hotel chain',
    'A travel essential',
  ],
  'Tech & Internet': [
    'A meme that went viral',
    'A social media platform',
    'A tech startup that failed',
    'A famous tech CEO',
    'A smartphone feature',
    'An app everyone has',
    'A streaming service',
    'Something AI can do now',
    'A video game franchise',
    'A tech company headquarters city',
    'A keyboard shortcut',
    'A type of cryptocurrency',
    'A dating app',
    'A YouTube channel genre',
    'A famous internet personality',
  ],
  'Food & Guilty Pleasures': [
    'A late-night snack',
    'A comfort food',
    'A type of pizza topping',
    'Fast food you secretly love',
    'A type of cheese',
    'An ice cream flavor',
    'A food you pretend to like',
    'A brunch item',
    'Something at a food truck',
    'A food trend that went viral',
    'A midnight craving food',
    'A controversial food combo',
    'A type of sushi roll',
    'A food that\'s better reheated',
    'A snack from your childhood',
  ],
  'Sports & Fitness': [
    'An excuse to skip the gym',
    'A yoga pose',
    'An Olympic sport',
    'A famous athlete',
    'Something in a gym locker room',
    'A workout that\'s trending',
    'A sports brand',
    'A marathon or major race',
    'A fitness influencer workout',
    'An exercise machine',
    'A sport rich people play',
    'A famous sports rivalry',
    'Something runners always talk about',
    'A team sport',
    'A sport you can play at a bar',
  ],
  'Bollywood & Desi': [
    'A Bollywood superstar',
    'A Shah Rukh Khan movie',
    'An iconic Bollywood song',
    'A Bollywood movie villain',
    'An Indian web series',
    'A famous dialogue from a Hindi movie',
    'A Bollywood choreographer or dance style',
    'An Indian comedian or comedy show',
    'A typical Bollywood movie trope',
    'A Bollywood romantic movie',
    'An Indian reality TV show',
    'A famous Indian cricketer',
    'An IPL team',
    'A Bollywood director',
    'An Indian wedding ritual',
  ],
  'History & Trivia': [
    'A famous historical battle',
    'A US President',
    'A British monarch',
    'An ancient civilization',
    'A famous speech in history',
    'A historical figure assassinated',
    'An invention from the 1900s',
    'A famous explorer',
    'A revolution in history',
    'A famous historical document',
    'An empire that fell',
    'A historical event from your birth year',
    'A famous World War II figure',
    'An Indian freedom fighter',
    'A historical mystery unsolved',
  ],
  'Relationships & Dating': [
    'A red flag on a first date',
    'Something couples fight about',
    'A dating app conversation starter',
    'A romantic gesture from movies',
    'Something in-laws always ask',
    'A breakup song',
    'A wedding expense that\'s overpriced',
    'Something you hide from your partner',
    'A relationship milestone',
    'A cringe pickup line',
    'Something people lie about on dating profiles',
    'An anniversary gift idea',
    'A celebrity couple',
    'A reason relationships fail',
    'Something people overshare about their relationship',
  ],
  'Random & Fun': [
    'Something you\'d bring to a deserted island',
    'A phobia people have',
    'Something with a weird name',
    'A thing that\'s overrated',
    'Something that smells terrible',
    'A skill that impresses at parties',
    'Something you\'d wish for from a genie',
    'A thing grandparents always say',
    'Something kids today will never understand',
    'A useless fact you know',
    'Something that\'s always out of stock',
    'A pet peeve everyone has',
    'Something suspiciously expensive',
    'A word that\'s fun to say',
    'Something that sparks joy (Marie Kondo style)',
  ],
};

// Flatten all prompts
const ALL_FACTUAL_PROMPTS = Object.values(FACTUAL_PROMPTS).flat();

// Fallback prompts for different modes
const FALLBACK_PROMPTS = {
  mixed: [
    'A character from The Office (US)',
    'Something found in an office',
    'An excuse for being late',
    'Something you replace',
    'A way to get from here to there',
  ],
  easy: [
    'A pizza topping',
    'A Netflix show',
    'A social media platform',
    'A coffee shop drink',
    'A type of cheese',
  ],
  tricky: [
    'A Nobel Prize winning scientist',
    'A logical fallacy',
    'An astronomical phenomenon',
    'A famous historical battle',
    'A type of logical fallacy',
  ],
  desi: [
    'A Bollywood superstar',
    'A Shah Rukh Khan movie',
    'An IPL team',
    'A famous Indian cricketer',
    'An iconic Bollywood song',
  ],
  party: [
    'A drinking game',
    'A classic cocktail',
    'Something you regret the morning after',
    'A party song',
    'A celebrity known for partying',
  ],
  popculture: [
    'A character from Friends',
    'A Marvel superhero',
    'A meme that went viral',
    'A Netflix original series',
    'A Grammy winning artist',
  ],
  adulting: [
    'An adulting task everyone hates',
    'Something that costs more than it should',
    'An excuse to skip work',
    'Something you dread on Monday mornings',
    'A skill you lie about on your resume',
  ],
};

// Category themes for AI prompts - College graduate level
const CATEGORY_THEMES = {
  mixed: 'a diverse mix of pop culture (The Office characters, Netflix shows), office life (things found in an office, excuses for being late), everyday situations (things you replace, ways to get from here to there), and relatable topics for smart 20-30 year olds',
  easy: 'fun, universally known topics like The Office characters, things found in an office, excuses for being late, food, streaming shows, and social media that college graduates would know',
  tricky: 'challenging intellectual topics like female scientists, Nobel Prize winners, logical fallacies, famous experiments, and niche pop culture references that require deeper knowledge',
  desi: 'Bollywood movies, Indian cricketers, famous dialogues, Indian web series, IPL teams, and desi culture references that Indian millennials/Gen-Z love',
  party: 'party and nightlife related topics like cocktails, drinking games, party songs, and fun social situations',
  popculture: 'TV shows like The Office/Friends/Brooklyn 99, Marvel movies, viral memes, Netflix series, and celebrity culture',
  adulting: 'relatable adult life struggles like work excuses, things you replace, ways to get places, office supplies, and things millennials/Gen-Z deal with',
  dating: 'modern dating, relationship dynamics, red flags, dating apps, and love life situations',
  tech: 'technology, internet culture, memes, startups, apps, and things that live on social media',
  food: 'foodie culture, late-night cravings, guilty pleasures, viral food trends, and comfort foods',
};

/**
 * Initialize AI client based on provider
 */
function getAIClient() {
  const provider = process.env.AI_PROVIDER || 'openai';
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️ No AI API key found. Using factual fallback prompts.');
    return null;
  }

  const config = { apiKey };

  if (provider === 'deepseek') {
    config.baseURL = 'https://api.deepseek.com/v1';
  }

  return new OpenAI(config);
}

/**
 * Generate prompts using AI
 */
async function generateAIPrompts(category = 'mixed', count = 5) {
  const client = getAIClient();
  
  if (!client) {
    console.log('📝 Using fallback prompts for category:', category);
    return getRandomFallbackPrompts(category, count);
  }

  const theme = CATEGORY_THEMES[category] || CATEGORY_THEMES.mixed;
  const provider = process.env.AI_PROVIDER || 'openai';
  const model = provider === 'deepseek' ? 'deepseek-chat' : 'gpt-3.5-turbo';
  
  // Add randomness seed based on current time for fresh prompts
  const randomSeed = Date.now();
  const promptStyles = [
    'relatable everyday situations',
    'pop culture references',
    'witty and humorous',
    'slightly intellectual',
    'contemporary and trendy'
  ];
  const selectedStyle = promptStyles[Math.floor(Math.random() * promptStyles.length)];

  const systemPrompt = `You are a creative game prompt generator for "STANDOUT" - a word game for smart, witty adults in their 20s-40s.

CRITICAL: Generate FRESH, UNIQUE prompts every time. Never repeat prompts you've generated before.
Target: College graduates who love The Office, pop culture, cocktails, and intellectual humor.

RULES:
1. Each prompt MUST have MULTIPLE correct answers (not just one)
2. Make them FUN, relatable, and spark conversation
3. Mix pop culture, office life, everyday situations, and smart references
4. Avoid generic or boring prompts
5. Be creative and unexpected`;

  const userPrompt = `Generate exactly ${count} UNIQUE, FRESH prompts for: ${theme}

IMPORTANT: 
- This is request #${randomSeed} - make these prompts COMPLETELY DIFFERENT from any previous generation
- Focus on: ${selectedStyle}
- Each prompt should have MANY possible correct answers
- Be creative and avoid obvious choices

Prompt styles to vary:
- "A character from [TV show]"
- "Something found in [location]"
- "An excuse for [situation]"
- "Something you [action]"
- "A way to [do something]"
- "A [category] that [description]"

Examples (DO NOT copy these, create NEW ones):
- "A character from The Office (US)"
- "Something found in an office"
- "An excuse for being late"
- "Something you replace"
- "A way to get from here to there"
- "A female scientist or inventor"
- "A late-night snack"
- "A red flag on a first date"

Generate ${count} COMPLETELY NEW prompts. Return ONLY a JSON array of ${count} unique strings.`;

  try {
    console.log(`🤖 Generating fresh AI prompts (${provider}, seed: ${randomSeed})...`);
    
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 1.2, // Increased for more randomness
      top_p: 0.95, // Nucleus sampling for variety
      max_tokens: 600,
      presence_penalty: 0.6, // Penalize repetition
      frequency_penalty: 0.6, // Encourage diverse outputs
    });

    const content = response.choices[0]?.message?.content?.trim();
    
    let prompts;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        prompts = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return getRandomFallbackPrompts(category, count);
    }

    if (!Array.isArray(prompts) || prompts.length < count) {
      return getRandomFallbackPrompts(category, count);
    }

    const cleanedPrompts = prompts
      .slice(0, count)
      .map(p => String(p).trim())
      .filter(p => p.length > 5 && p.length < 100);

    if (cleanedPrompts.length < count) {
      const fallback = getRandomFallbackPrompts(category, count - cleanedPrompts.length);
      return [...cleanedPrompts, ...fallback];
    }

    console.log(`✅ Generated ${cleanedPrompts.length} fresh AI prompts (seed: ${randomSeed}):`, cleanedPrompts);
    return cleanedPrompts;

  } catch (error) {
    console.error('AI prompt generation failed:', error.message);
    return getRandomFallbackPrompts(category, count);
  }
}

/**
 * Get random fallback prompts from categories
 */
function getRandomFallbackPrompts(category = 'mixed', count = 5) {
  let sourcePrompts = [];
  
  // Map categories to prompt groups
  const categoryMap = {
    easy: ['Food & Guilty Pleasures', 'Tech & Internet', 'Pop Culture & TV'],
    tricky: ['Smart & Science', 'History & Trivia', 'Random & Fun'],
    desi: ['Bollywood & Desi', 'Food & Guilty Pleasures'],
    party: ['Cocktails & Drinks', 'Adult Humor & Life', 'Music & Artists'],
    popculture: ['Pop Culture & TV', 'Music & Artists', 'Tech & Internet'],
    adulting: ['Adult Humor & Life', 'Relationships & Dating', 'Random & Fun'],
    dating: ['Relationships & Dating', 'Adult Humor & Life'],
    tech: ['Tech & Internet', 'Smart & Science'],
    food: ['Food & Guilty Pleasures', 'Kitchen & Cooking', 'Cocktails & Drinks'],
    kitchen: ['Kitchen & Cooking', 'Food & Guilty Pleasures'],
    science: ['Smart & Science', 'History & Trivia'],
  };
  
  const relevantCategories = categoryMap[category] || Object.keys(FACTUAL_PROMPTS);
  
  relevantCategories.forEach(cat => {
    if (FACTUAL_PROMPTS[cat]) {
      sourcePrompts.push(...FACTUAL_PROMPTS[cat]);
    }
  });
  
  if (sourcePrompts.length === 0) {
    sourcePrompts = ALL_FACTUAL_PROMPTS;
  }
  
  // Shuffle and return
  const shuffled = [...sourcePrompts].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Check if AI is configured
 */
function isAIConfigured() {
  return !!(process.env.AI_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY);
}

/**
 * Get all prompts (for client-side use)
 */
function getAllFactualPrompts() {
  return FACTUAL_PROMPTS;
}

export { generateAIPrompts, getRandomFallbackPrompts, isAIConfigured, getAllFactualPrompts, FACTUAL_PROMPTS };
