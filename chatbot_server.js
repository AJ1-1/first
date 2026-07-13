// ============================================================
// chatbot_server.js — Node.js HTTP Server
// Chatbot-Based Student Support System
// ============================================================
// This file creates the backend server using Node.js built-in
// modules only. It handles:
//   - User authentication (login and registration)
//   - FAQ searching with keyword + intent matching
//   - Chat history save, load, and delete
//   - Static file serving (HTML, CSS, JS, assets)
// ============================================================

// ---- Built-in Node.js Modules (no npm install needed) ------
const http = require('http');       // Core HTTP server
const fs   = require('fs');         // File system read/write
const path = require('path');       // Safe file path building
const url  = require('url');        // URL parsing

// ============================================================
// CONFIGURATION — change these values to fit your setup
// ============================================================
const CONFIG = {
  PORT           : process.env.PORT || 3000,
  HOST           : '0.0.0.0',
  FAQ_FILE       : path.join(__dirname, 'chatbot_faq.json'),
  HISTORY_FILE   : path.join(__dirname, 'chat_history.json'),
  USERS_FILE     : path.join(__dirname, 'users.json'),
  STATIC_DIR     : __dirname,
  MATCH_THRESHOLD: 0.15,
};

// ============================================================
// UTILITY — safe JSON file reader
// Returns parsed data or a fallback value on failure
// ============================================================
function readJSONFile(filePath, fallback) {
  try {
    // Read file synchronously — simple and suitable for small JSON files
    const raw = fs.readFileSync(filePath, 'utf8');

    // Handle empty files gracefully
    if (!raw || raw.trim() === '') return fallback;

    return JSON.parse(raw);
  } catch (error) {
    // File missing, unreadable, or invalid JSON
    console.error(`[ERROR] Could not read file: ${filePath}`, error.message);
    return fallback;
  }
}

// ============================================================
// UTILITY — safe JSON file writer
// Returns true on success, false on failure
// ============================================================
function writeJSONFile(filePath, data) {
  try {
    // Write with 2-space indentation so the file stays human-readable
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`[ERROR] Could not write file: ${filePath}`, error.message);
    return false;
  }
}

// ============================================================
// UTILITY — send a JSON response back to the client
// ============================================================
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type' : 'application/json',
    // Allow requests from any origin (important for local development)
    'Access-Control-Allow-Origin' : '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

// ============================================================
// UTILITY — serve a static file (HTML, CSS, JS, images, etc.)
// ============================================================
function serveStaticFile(res, filePath) {
  // Map file extensions to MIME types so the browser handles them correctly
  const mimeTypes = {
    '.html': 'text/html',
    '.css' : 'text/css',
    '.js'  : 'application/javascript',
    '.json': 'application/json',
    '.png' : 'image/png',
    '.jpg' : 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif' : 'image/gif',
    '.svg' : 'image/svg+xml',
    '.ico' : 'image/x-icon',
    '.ttf' : 'font/ttf',
    '.woff': 'font/woff',
  };

  const ext      = path.extname(filePath).toLowerCase();
  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // File not found — send 404
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 — File Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(data);
  });
}

// ============================================================
// GRATITUDE DETECTION — Phrases List
// ============================================================
const GRATITUDE_PHRASES = [
  'thank you', 'thank you so much', 'thank you very much', 'thank you a lot',
  'thank you for the info', 'thank you for the information', 'thank you for your help',
  'thank you for helping me', 'thank you for the clarification', 'thank you for explaining',
  'thank you for the answer', 'thank you for answering', 'thank you for the response',
  'thank you for the update', 'thank you for the assistance', 'thanks', 'thanks a lot',
  'thanks so much', 'thanks very much', 'thanks for the info', 'thanks for the information',
  'thanks for your help', 'thanks for helping', 'thanks for helping me',
  'thanks for the clarification', 'thanks for explaining', 'thanks for the answer',
  'thanks for answering', 'thanks for the response', 'thanks for the update',
  'thanks for the assistance', 'thanks a bunch', 'thanks a ton', 'many thanks',
  'thx', 'thnx', 'tnx', 'ty', 'tysm', 'tyvm', 'tq', 'tq so much', 'tq very much',
  'i appreciate it', 'i appreciate that', 'i appreciate your help', 'i appreciate the help',
  'i appreciate the info', 'i appreciate the information', 'i appreciate the clarification',
  'much appreciated', 'greatly appreciated', 'deeply appreciated', 'this is helpful',
  'this was helpful', 'very helpful', 'so helpful', 'that was helpful', 'that is helpful',
  'that was very helpful', 'that is very helpful', 'this was very helpful',
  'this is very helpful', 'quite helpful', 'noted', 'got it', 'got it thanks',
  'got it thank you', 'understood', 'understood thank you', 'understood thanks',
  'alright thanks', 'alright thank you', 'okay thanks', 'okay thank you', 'ok thanks',
  'ok thank you', 'perfect thanks', 'perfect thank you', 'great thanks', 'great thank you',
  'wonderful thanks', 'wonderful thank you', 'excellent thanks', 'excellent thank you',
  'awesome thanks', 'awesome thank you', 'brilliant thanks', 'brilliant thank you',
  'you are helpful', 'you are very helpful', 'you have been helpful',
  'you have been very helpful', 'you are doing great', 'you are amazing',
  'you are wonderful', 'this is amazing', 'this is great', 'this is wonderful',
  'this is excellent', 'great job', 'good job', 'well done', 'keep it up', 'nice one',
  'e don do', 'na him be dat', 'you don help me', 'you don do am', 'i don get am',
  'i don see am', 'i understand now', 'i get it now', 'i see now', 'now i understand',
  'now i get it', 'now i see', 'clear', 'all clear', 'crystal clear', 'very clear',
  'that is clear', 'that is very clear', 'that is quite clear',
];

// ============================================================
// GRATITUDE DETECTION — Response Pool
// ============================================================
const GRATITUDE_RESPONSES = [
  "You're welcome! 😊 If you have any other questions about your courses, grades, exams, or dress code, feel free to ask anytime.",
  "Happy to help! 🎓 Don't hesitate to ask if there's anything else you'd like to know.",
  "Glad I could assist! If you need any more information, I'm always here to help.",
  "You're welcome! 😊 Feel free to come back anytime you have questions about your academic journey.",
  "It's my pleasure! 🎓 Is there anything else you'd like to know about course registration, grading, exams, or dress code?",
  "Anytime! That's what I'm here for. If you think of more questions later, don't hesitate to ask. 😊",
  "You're welcome! Good luck with your studies! 📚 Feel free to ask if you need anything else.",
  "Happy to be of help! 😊 Remember, I'm available anytime you have academic questions.",
  "Glad that was helpful! 🎓 If you have more questions as the semester progresses, I'm always here.",
  "You're very welcome! Best of luck with your academics. Feel free to return anytime you need assistance. 😊",
  "No problem at all! 😊 That's exactly what I'm here for. Ask me anything else if you need to.",
  "It was my pleasure helping you! 🎓 Don't forget — I'm available 24/7 for any academic questions you may have.",
  "Glad I could clear that up! 😊 Feel free to ask if anything else comes to mind.",
  "You're welcome! 🎓 Wishing you all the best in your studies. Come back anytime!",
  "Happy to help! Academic success starts with being informed. 📚 Keep asking questions whenever you need to!",
];

// ============================================================
// GRATITUDE DETECTION — Main Function
// ============================================================
function isGratitude(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') return false;

  const cleaned = userMessage
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();

  if (!cleaned) return false;

  if (GRATITUDE_PHRASES.includes(cleaned)) return true;

  const startsWithGratitude = GRATITUDE_PHRASES.some(phrase =>
    cleaned.startsWith(phrase)
  );
  if (startsWithGratitude) return true;

  const coreKeywords = ['thank you', 'thanks', 'appreciate', 'helpful', 'noted', 'understood'];
  const containsGratitude = coreKeywords.some(keyword => cleaned.includes(keyword));
  if (containsGratitude) return true;

  return false;
}

function getGratitudeResponse() {
  const randomIndex = Math.floor(Math.random() * GRATITUDE_RESPONSES.length);
  return GRATITUDE_RESPONSES[randomIndex];
}

// ============================================================
// NLP CORE — Text preprocessing
// ============================================================
function preprocessText(text) {
  if (!text || typeof text !== 'string') return [];

  const stopWords = new Set([
    'i','me','my','the','a','an','is','are','was','were','be','been','being',
    'have','has','had','do','does','did','will','would','could','should','may',
    'might','shall','can','need','dare','ought','used','to','of','in','on',
    'at','by','for','with','about','against','between','into','through',
    'during','before','after','above','below','up','down','out','off','over',
    'under','again','further','then','once','here','there','when','where',
    'why','how','all','both','each','more','most','other','some','such','no',
    'nor','not','only','same','so','than','too','very','just','it','its',
    'this','that','these','those','and','but','or','if','as','what','which',
    'who','whom','this','that','am','get','go','also','please','help','tell',
    'know','want','like','would','dear',
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !stopWords.has(word));
}

// ============================================================
// NLP CORE — Synonym / intent expansion map
// ============================================================
const SYNONYM_MAP = {
  'enroll': 'registration', 'enrollment': 'registration', 'signup': 'registration',
  'sign': 'registration', 'registering': 'registration', 'registered': 'registration',
  'portal': 'registration', 'proceed': 'registration',
  'average': 'gpa', 'semester average': 'gpa', 'gpa': 'gpa', 'gp': 'gp',
  'cumulative': 'cgpa', 'overall': 'cgpa', 'cgpa': 'cgpa',
  'tlu': 'tlu', 'load units': 'tlu',
  'clu': 'clu', 'cumulative load': 'clu',
  'tcp': 'tcp', 'credit points': 'tcp',
  'ccp': 'ccp', 'cumulative credit': 'ccp',
  'grade points': 'grade point', 'point value': 'grade point',
  'marks': 'grading', 'score': 'grading', 'scores': 'grading', 'percentage': 'grading',
  'carryover': 'carryover', 'carry': 'carryover', 'retake': 'carryover',
  'repeat': 'carryover', 'failed': 'carryover', 'fail': 'carryover',
  'wear': 'dress', 'wearing': 'dress', 'outfit': 'dress', 'clothes': 'dress',
  'clothing': 'dress', 'attire': 'dress', 'dressed': 'dress', 'dressing': 'dress',
  'exam': 'examination', 'exams': 'examination', 'test': 'examination',
  'paper': 'examination', 'finals': 'examination', 'examination': 'examination',
  'probation': 'probation', 'warning': 'probation', 'dismissed': 'probation', 'withdrawal': 'probation',
  'ca': 'continuous assessment', 'coursework': 'continuous assessment',
  'assignment': 'continuous assessment', 'quiz': 'continuous assessment',
  'slippers': 'slippers', 'flip': 'slippers', 'sandals': 'slippers',
  'footwear': 'slippers', 'shoes': 'slippers',
};

// ============================================================
// NLP CORE — Expand tokens using synonym map
// ============================================================
function expandWithSynonyms(tokens) {
  const expanded = new Set(tokens);
  tokens.forEach(token => {
    if (SYNONYM_MAP[token]) expanded.add(SYNONYM_MAP[token]);
  });
  return Array.from(expanded);
}

// ============================================================
// NLP CORE — Scoring Logic
// ============================================================
function scoreFAQEntry(faqEntry, queryTokens) {
  if (!faqEntry || !queryTokens.length) return 0;

  const faqKeywords = faqEntry.keywords || [];
  const faqQuestion = preprocessText(faqEntry.question);
  const keywordString = faqKeywords.join(' ').toLowerCase();
  const queryPhrase = queryTokens.join(' ');

  let weightedScore = 0;

  if (keywordString.includes(queryPhrase)) weightedScore += 20;

  queryTokens.forEach(token => {
    if (faqKeywords.includes(token)) {
      weightedScore += 5;
    } else if (faqKeywords.some(kw => kw.split(' ').includes(token))) {
      weightedScore += 3;
    }
    if (faqQuestion.includes(token)) weightedScore += 2;
  });

  if (weightedScore === 0) return 0;
  return weightedScore / (queryTokens.length * 10 + 10);
}

function findBestFAQMatch(userQuestion, faqData) {
  if (!userQuestion || !faqData || !faqData.length) return null;

  const rawTokens = preprocessText(userQuestion);
  const queryTokens = expandWithSynonyms(rawTokens);

  if (!queryTokens.length) return null;

  let bestMatch = null;
  let bestScore = 0;

  faqData.forEach(entry => {
    const score = scoreFAQEntry(entry, queryTokens);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  });

  if (bestMatch) {
    console.log(`[NLP] Best: "${bestMatch.question}" | Score: ${bestScore.toFixed(2)}`);
  }

  if (bestScore >= 0.25 && bestMatch) {
    return {
      answer: bestMatch.answer,
      question: bestMatch.question,
      confidence: Math.round(bestScore * 100),
    };
  }

  return null;
}

// ============================================================
// ROUTE HANDLER — POST /api/login
// ============================================================
function handleLogin(req, res, body) {
  let data;

  try {
    data = JSON.parse(body);
  } catch {
    return sendJSON(res, 400, { success: false, message: 'Invalid request format.' });
  }

  const { username, password } = data;

  if (!username || !password) {
    return sendJSON(res, 400, {
      success: false,
      message: 'Username and password are required.',
    });
  }

  const cleanUsername = String(username).trim().toLowerCase();
  const cleanPassword = String(password).trim();

  const users = readJSONFile(CONFIG.USERS_FILE, []);

  if (!users.length) {
    return sendJSON(res, 500, {
      success: false,
      message: 'User database unavailable. Please contact support.',
    });
  }

  const matchedUser = users.find(
    user =>
      user.username.toLowerCase() === cleanUsername &&
      user.password === cleanPassword
  );

  if (matchedUser) {
    console.log(`[AUTH] Login successful: ${matchedUser.username}`);
    sendJSON(res, 200, {
      success   : true,
      message   : 'Login successful.',
      user      : {
        username  : matchedUser.username,
        fullName  : matchedUser.fullName,
        department: matchedUser.department,
        level     : matchedUser.level,
      },
    });
  } else {
    console.log(`[AUTH] Login failed for username: "${cleanUsername}"`);
    sendJSON(res, 401, {
      success: false,
      message: 'Invalid username or password. Please try again.',
    });
  }
}

// ============================================================
// ROUTE HANDLER — POST /api/register
// Registers a new student account
// ============================================================
function handleRegister(req, res, body) {
  let data;

  try {
    data = JSON.parse(body);
  } catch {
    return sendJSON(res, 400, { success: false, message: 'Invalid request format.' });
  }

  const { fullName, username, department, level, password } = data;

  // Validation
  if (!fullName || !username || !department || !level || !password) {
    return sendJSON(res, 400, {
      success: false,
      message: 'All fields are required.',
    });
  }

  const cleanUsername = String(username).trim().toLowerCase();
  const cleanPassword = String(password).trim();

  // Username validation
  if (cleanUsername.length < 4) {
    return sendJSON(res, 400, {
      success: false,
      message: 'Username must be at least 4 characters long.',
    });
  }

  // Password validation
  if (cleanPassword.length < 6) {
    return sendJSON(res, 400, {
      success: false,
      message: 'Password must be at least 6 characters long.',
    });
  }

  // Load existing users
  const users = readJSONFile(CONFIG.USERS_FILE, []);

  // Check if username already exists
  const userExists = users.some(
    user => user.username.toLowerCase() === cleanUsername
  );

  if (userExists) {
    return sendJSON(res, 409, {
      success: false,
      message: 'Username already exists. Please choose a different username.',
    });
  }

  // Create new user
  const newUser = {
    username: cleanUsername,
    password: cleanPassword,
    fullName: String(fullName).trim(),
    department: String(department).trim(),
    level: String(level).trim(),
  };

  // Add new user to the list
  users.push(newUser);

  // Save updated users file
  const saved = writeJSONFile(CONFIG.USERS_FILE, users);

  if (saved) {
    console.log(`[AUTH] New user registered: ${newUser.username}`);
    sendJSON(res, 201, {
      success: true,
      message: 'Account created successfully! You can now login.',
    });
  } else {
    sendJSON(res, 500, {
      success: false,
      message: 'Failed to create account. Please try again.',
    });
  }
}

// ============================================================
// ROUTE HANDLER — POST /api/chat
// ============================================================
function handleChat(req, res, body) {
  let data;

  try {
    data = JSON.parse(body);
  } catch {
    return sendJSON(res, 400, {
      success: false,
      answer : 'I could not understand your request. Please try again.',
    });
  }

  const { question, username } = data;

  if (!question || typeof question !== 'string' || question.trim() === '') {
    return sendJSON(res, 400, {
      success: false,
      answer : 'Please type a question before sending.',
    });
  }

  const cleanQuestion = question.trim();

  if (cleanQuestion.length > 500) {
    return sendJSON(res, 400, {
      success: false,
      answer : 'Your question is too long. Please keep it under 500 characters.',
    });
  }

  console.log(`[CHAT] User "${username || 'unknown'}" asked: "${cleanQuestion}"`);

  if (isGratitude(cleanQuestion)) {
    console.log(`[CHAT] Gratitude detected — sending acknowledgement response`);
    return sendJSON(res, 200, {
      success   : true,
      answer    : getGratitudeResponse(),
      matched   : null,
      confidence: 100,
      type      : 'gratitude',
    });
  }

  const faqData = readJSONFile(CONFIG.FAQ_FILE, []);

  if (!faqData.length) {
    return sendJSON(res, 500, {
      success: false,
      answer : 'The knowledge base is currently unavailable. Please try again later.',
    });
  }

  const result = findBestFAQMatch(cleanQuestion, faqData);

  if (result) {
    sendJSON(res, 200, {
      success   : true,
      answer    : result.answer,
      matched   : result.question,
      confidence: result.confidence,
    });
  } else {
    sendJSON(res, 200, {
      success   : false,
      answer    : "I'm sorry, I couldn't find information related to your question. " +
                   "Please try rephrasing it, or ask about topics like course registration, " +
                   "GPA calculation or dress code policies",
      matched   : null,
      confidence: 0,
    });
  }
}

// ============================================================
// ROUTE HANDLER — POST /api/history/save
// ============================================================
function handleSaveHistory(req, res, body) {
  let data;

  try {
    data = JSON.parse(body);
  } catch {
    return sendJSON(res, 400, { success: false, message: 'Invalid data format.' });
  }

  const { username, chatId, title, messages } = data;

  if (!username || !chatId || !messages) {
    return sendJSON(res, 400, { success: false, message: 'Missing required fields.' });
  }

  const history = readJSONFile(CONFIG.HISTORY_FILE, []);

  const existingIndex = history.findIndex(
    entry => entry.chatId === chatId && entry.username === username
  );

  const historyEntry = {
    chatId   : chatId,
    username : username,
    title    : title || 'Untitled Chat',
    messages : messages,
    createdAt: existingIndex >= 0
      ? history[existingIndex].createdAt
      : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    history[existingIndex] = historyEntry;
  } else {
    history.unshift(historyEntry);
  }

  const saved = writeJSONFile(CONFIG.HISTORY_FILE, history);

  if (saved) {
    sendJSON(res, 200, { success: true, message: 'Chat saved successfully.' });
  } else {
    sendJSON(res, 500, { success: false, message: 'Could not save chat history.' });
  }
}

// ============================================================
// ROUTE HANDLER — GET /api/history?username=...
// ============================================================
function handleGetHistory(req, res, parsedUrl) {
  const username = parsedUrl.query.username;

  if (!username) {
    return sendJSON(res, 400, { success: false, message: 'Username is required.' });
  }

  const history = readJSONFile(CONFIG.HISTORY_FILE, []);
  const userHistory = history.filter(entry => entry.username === username);

  const summary = userHistory.map(entry => ({
    chatId   : entry.chatId,
    title    : entry.title,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    preview  : entry.messages && entry.messages.length > 0
      ? entry.messages[0].text.substring(0, 60) + '...'
      : '',
  }));

  sendJSON(res, 200, { success: true, history: summary });
}

// ============================================================
// ROUTE HANDLER — GET /api/history/:chatId?username=...
// ============================================================
function handleGetChatById(req, res, chatId, parsedUrl) {
  const username = parsedUrl.query.username;

  if (!username || !chatId) {
    return sendJSON(res, 400, { success: false, message: 'Username and chatId are required.' });
  }

  const history = readJSONFile(CONFIG.HISTORY_FILE, []);
  const chat = history.find(
    entry => entry.chatId === chatId && entry.username === username
  );

  if (chat) {
    sendJSON(res, 200, { success: true, chat: chat });
  } else {
    sendJSON(res, 404, { success: false, message: 'Chat session not found.' });
  }
}

// ============================================================
// ROUTE HANDLER — DELETE /api/history/:chatId?username=...
// ============================================================
function handleDeleteChat(req, res, chatId, parsedUrl) {
  const username = parsedUrl.query.username;

  if (!username || !chatId) {
    return sendJSON(res, 400, { success: false, message: 'Username and chatId are required.' });
  }

  const history = readJSONFile(CONFIG.HISTORY_FILE, []);
  const originalLength = history.length;

  const filtered = history.filter(
    entry => !(entry.chatId === chatId && entry.username === username)
  );

  if (filtered.length === originalLength) {
    return sendJSON(res, 404, { success: false, message: 'Chat not found.' });
  }

  const saved = writeJSONFile(CONFIG.HISTORY_FILE, filtered);

  if (saved) {
    sendJSON(res, 200, { success: true, message: 'Chat deleted successfully.' });
  } else {
    sendJSON(res, 500, { success: false, message: 'Could not delete chat.' });
  }
}

// ============================================================
// ROUTE HANDLER — DELETE /api/history/all?username=...
// ============================================================
function handleDeleteAllChats(req, res, parsedUrl) {
  const username = parsedUrl.query.username;

  if (!username) {
    return sendJSON(res, 400, { success: false, message: 'Username is required.' });
  }

  const history = readJSONFile(CONFIG.HISTORY_FILE, []);
  const filtered = history.filter(entry => entry.username !== username);

  const saved = writeJSONFile(CONFIG.HISTORY_FILE, filtered);

  if (saved) {
    sendJSON(res, 200, { success: true, message: 'All chats deleted.' });
  } else {
    sendJSON(res, 500, { success: false, message: 'Could not delete chats.' });
  }
}

// ============================================================
// COLLECT REQUEST BODY
// ============================================================
function collectBody(req, callback) {
  let body = '';

  req.on('data', chunk => {
    body += chunk.toString();

    if (body.length > 1_000_000) {
      body = '';
      req.destroy(new Error('Request body too large'));
    }
  });

  req.on('end', () => callback(body));
  req.on('error', () => callback(''));
}

// ============================================================
// MAIN HTTP SERVER
// ============================================================
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname  = parsedUrl.pathname;
  const method    = req.method.toUpperCase();

  console.log(`[SERVER] ${method} ${pathname}`);

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin' : '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // POST /api/login
  if (method === 'POST' && pathname === '/api/login') {
    collectBody(req, body => handleLogin(req, res, body));
    return;
  }

  // POST /api/register
  if (method === 'POST' && pathname === '/api/register') {
    collectBody(req, body => handleRegister(req, res, body));
    return;
  }

  // POST /api/chat
  if (method === 'POST' && pathname === '/api/chat') {
    collectBody(req, body => handleChat(req, res, body));
    return;
  }

  // POST /api/history/save
  if (method === 'POST' && pathname === '/api/history/save') {
    collectBody(req, body => handleSaveHistory(req, res, body));
    return;
  }

  // DELETE /api/history/all
  if (method === 'DELETE' && pathname === '/api/history/all') {
    handleDeleteAllChats(req, res, parsedUrl);
    return;
  }

  // GET /api/history (list all for user)
  if (method === 'GET' && pathname === '/api/history') {
    handleGetHistory(req, res, parsedUrl);
    return;
  }

  // GET /api/history/:chatId  OR  DELETE /api/history/:chatId
  const historyMatch = pathname.match(/^\/api\/history\/(.+)$/);
  if (historyMatch) {
    const chatId = decodeURIComponent(historyMatch[1]);

    if (method === 'GET') {
      handleGetChatById(req, res, chatId, parsedUrl);
      return;
    }

    if (method === 'DELETE') {
      handleDeleteChat(req, res, chatId, parsedUrl);
      return;
    }
  }

  // Root URL → serve chat_bot.html
  if (pathname === '/' || pathname === '/index.html') {
    serveStaticFile(res, path.join(CONFIG.STATIC_DIR, 'chat_bot.html'));
    return;
  }

  // All other static files
  const safePath = path.join(CONFIG.STATIC_DIR, pathname);

  if (!safePath.startsWith(CONFIG.STATIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 — Forbidden');
    return;
  }

  serveStaticFile(res, safePath);
});

// ============================================================
// START SERVER
// ============================================================
server.listen(CONFIG.PORT, CONFIG.HOST, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Chatbot Student Support System — Server Ready  ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`   Host   : ${CONFIG.HOST}`);
  console.log(`   Port   : ${CONFIG.PORT}`);
  console.log(`   FAQ    : ${CONFIG.FAQ_FILE}`);
  console.log(`   History: ${CONFIG.HISTORY_FILE}`);
  console.log('   Press CTRL+C to stop the server.');
  console.log('');
});

// Gracefully handle server errors
server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[ERROR] Port ${CONFIG.PORT} is already in use.`);
    console.error('        Try changing the PORT value in CONFIG or stop the other process.');
  } else {
    console.error('[ERROR] Server error:', err.message);
  }
  process.exit(1);
});
