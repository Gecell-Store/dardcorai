const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const supabase = require('../config/supabase'); 
const { v4: uuidv4, validate: uuidValidate } = require('uuid');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const { handleChatStream } = require('../controllers/dardcorModel');
const { YoutubeTranscript } = require('youtube-transcript');
const cheerio = require('cheerio');
const axios = require('axios');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const os = require('os');
const dns = require('dns');
const crypto = require('crypto');
const { URL } = require('url');

const STATIC_KEY = process.env.SESSION_SECRET || 'DARDCOR_PERMANENT_KEY_V99_NEVER_CHANGE_THIS_STRING';
const ONE_CENTURY = 3155760000000;

const upload = multer({ 
    storage: multer.diskStorage({
        destination: os.tmpdir(),
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, `${uniqueSuffix}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '')}`);
        }
    }), 
    limits: { fileSize: 50 * 1024 * 1024, files: 25 } 
});

const transporter = nodemailer.createTransport({ 
    service: 'gmail', 
    auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    } 
});

const authLimiter = rateLimit({ 
    windowMs: 15 * 60 * 1000, 
    max: 50, 
    standardHeaders: true, 
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' }
});

const apiLimiter = rateLimit({ 
    windowMs: 1 * 60 * 1000, 
    max: 300, 
    standardHeaders: true, 
    legacyHeaders: false 
});

const securityMiddleware = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};

router.use(cookieParser());
router.use(securityMiddleware);

const uploadMiddleware = (req, res, next) => { 
    upload.array('file_attachment', 25)(req, res, function (err) { 
        if (err) return res.status(400).json({ success: false, message: "Upload Error: " + err.message }); 
        next(); 
    }); 
};

function generateAuthToken(user) {
    const payload = JSON.stringify({ 
        id: user.id, 
        email: user.email, 
        v: user.password.substring(0, 15), 
        ts: Date.now(),
        jti: uuidv4()
    });
    const signature = crypto.createHmac('sha512', STATIC_KEY).update(payload).digest('hex');
    return Buffer.from(`${payload}.${signature}`).toString('base64');
}

function verifyAuthToken(token) {
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const [payloadStr, signature] = decoded.split('.');
        const expectedSignature = crypto.createHmac('sha512', STATIC_KEY).update(payloadStr).digest('hex');
        if (signature !== expectedSignature) return null;
        return JSON.parse(payloadStr);
    } catch (e) { 
        return null; 
    }
}

const cookieConfig = {
    maxAge: ONE_CENTURY,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
};

async function handleLoginCheck(req, res, renderPage) {
    if (req.session && req.session.userAccount) {
        return res.redirect('/loading');
    }
    const authCookie = req.cookies['dardcor_perm_auth'];
    if (!authCookie) {
        return res.render(renderPage, { error: null, user: null, email: req.query.email || '' });
    }
    const userData = verifyAuthToken(authCookie);
    if (!userData) {
        res.clearCookie('dardcor_perm_auth');
        return res.render(renderPage, { error: null, user: null, email: req.query.email || '' });
    }
    try {
        const { data: user, error } = await supabase.from('dardcor_users').select('*').eq('id', userData.id).maybeSingle();
        if (user && user.password.substring(0, 15) === userData.v) {
            req.session.userAccount = user;
            req.session.cookie.maxAge = ONE_CENTURY;
            res.cookie('dardcor_perm_auth', generateAuthToken(user), cookieConfig);
            return req.session.save(() => {
                res.redirect('/loading');
            });
        }
        res.clearCookie('dardcor_perm_auth');
        return res.render(renderPage, { error: null, user: null, email: req.query.email || '' });
    } catch (e) { 
        return res.render(renderPage, { error: null, user: null, email: req.query.email || '' }); 
    }
}

async function protectedRoute(req, res, next) {
    if (req.session && req.session.userAccount) {
        return next();
    }
    const authCookie = req.cookies['dardcor_perm_auth'];
    if (!authCookie) {
        if (req.xhr || req.path.includes('/api/') || req.path.includes('/chat-stream')) {
            return res.status(401).json({ success: false, redirectUrl: '/dardcor' });
        }
        return res.redirect('/dardcor');
    }
    const userData = verifyAuthToken(authCookie);
    if (!userData) {
        res.clearCookie('dardcor_perm_auth');
        if (req.xhr || req.path.includes('/api/') || req.path.includes('/chat-stream')) {
            return res.status(401).json({ success: false });
        }
        return res.redirect('/dardcor');
    }
    try {
        const { data: user } = await supabase.from('dardcor_users').select('*').eq('id', userData.id).maybeSingle();
        if (user && user.password.substring(0, 15) === userData.v) {
            req.session.userAccount = user;
            req.session.cookie.maxAge = ONE_CENTURY;
            res.cookie('dardcor_perm_auth', generateAuthToken(user), cookieConfig);
            return req.session.save(() => next());
        }
        res.clearCookie('dardcor_perm_auth');
        if (req.xhr || req.path.includes('/api/') || req.path.includes('/chat-stream')) {
            return res.status(401).json({ success: false });
        }
        res.redirect('/dardcor');
    } catch (e) { 
        res.redirect('/dardcor'); 
    }
}

async function isSafeUrl(urlString) {
    try {
        const parsed = new URL(urlString);
        if (!['http:', 'https:'].includes(parsed.protocol)) return false;
        const hostname = parsed.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return false;
        return new Promise((resolve) => {
            dns.lookup(hostname, (err, address) => {
                if (err || !address) return resolve(false);
                const parts = address.split('.').map(Number);
                if (parts[0] === 10) return resolve(false);
                if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return resolve(false);
                if (parts[0] === 192 && parts[1] === 168) return resolve(false);
                if (parts[0] === 169 && parts[1] === 254) return resolve(false);
                resolve(true);
            });
        });
    } catch (e) { 
        return false; 
    }
}

async function getFileTypeSafe(buffer) {
    try {
        const { fileTypeFromBuffer } = await import('file-type');
        return await fileTypeFromBuffer(buffer);
    } catch (e) { 
        return null; 
    }
}

async function parsePdfSafe(buffer) {
    try {
        if (!global.DOMMatrix) global.DOMMatrix = class DOMMatrix {};
        if (!global.ImageData) global.ImageData = class ImageData {};
        if (!global.Path2D) global.Path2D = class Path2D {};
        if (!global.window) global.window = global;
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const data = new Uint8Array(buffer);
        const loadingTask = pdfjs.getDocument({ 
            data: data, 
            useSystemFonts: true, 
            disableFontFace: true, 
            verbosity: 0 
        });
        const pdf = await loadingTask.promise;
        let fullText = "";
        const maxPages = Math.min(pdf.numPages, 20); 
        for (let i = 1; i <= maxPages; i++) {
            try {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += `[PAGE ${i}]: ${pageText.substring(0, 4000)}\n`;
            } catch (pageErr) { }
        }
        return fullText || "[PDF CONTENT NOT ACCESSIBLE]";
    } catch (error) { 
        return "[PDF ERROR: " + error.message + "]"; 
    }
}

async function sendDiscordError(context, error) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;
    try {
        await axios.post(webhookUrl, { 
            username: "Dardcor Monitor", 
            embeds: [{ 
                title: `System Alert: ${context}`, 
                description: `\`\`\`${String(error?.message || error).substring(0, 1800)}\`\`\``, 
                color: 16711680, 
                timestamp: new Date().toISOString(),
                footer: { text: "Dardcor AI Core" }
            }] 
        });
    } catch (e) { }
}

async function getYouTubeData(url) { 
    if (!await isSafeUrl(url)) return { success: false };
    let videoId = null; 
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/); 
    if (match && match[2].length === 11) videoId = match[2]; 
    if (!videoId) return { success: false }; 
    let data = { title: '', description: '', transcript: '' }; 
    try { 
        const pageRes = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36' }, 
            timeout: 10000 
        }); 
        const $ = cheerio.load(pageRes.data); 
        data.title = $('meta[name="title"]').attr('content') || $('title').text(); 
        data.description = ($('meta[name="description"]').attr('content') || '').substring(0, 2000); 
    } catch (e) { } 
    try { 
        const transcriptObj = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'id' }).catch(() => YoutubeTranscript.fetchTranscript(videoId)); 
        if (transcriptObj && transcriptObj.length > 0) {
            data.transcript = transcriptObj.map(t => t.text).join(' ').substring(0, 15000); 
        }
    } catch (e) { } 
    return { success: true, ...data }; 
}

async function getWebsiteContent(url) { 
    if (!await isSafeUrl(url)) return null;
    try { 
        const response = await axios.get(url, { 
            headers: { 'User-Agent': 'DardcorAI/2.0 (compatible; Crawler/1.0)' }, 
            timeout: 12000, 
            maxContentLength: 2 * 1024 * 1024 
        }); 
        const $ = cheerio.load(response.data); 
        $('script, style, nav, footer, header, svg, img, iframe, noscript, link, meta, video, audio, aside').remove(); 
        return $('body').text().replace(/\s+/g, ' ').trim().substring(0, 15000); 
    } catch (e) { 
        return null; 
    } 
}

async function searchWeb(query) { 
    try { 
        if (!query || typeof query !== 'string') return null; 
        const res = await axios.get(`https://ddg-api.herokuapp.com/search?q=${encodeURIComponent(query.substring(0, 300))}&limit=8`, { timeout: 10000 }); 
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
            return res.data.map(r => `## [${(r.title || '').substring(0, 200)}](${(r.link || '')})\n${(r.snippet || '').substring(0, 600)}`).join('\n\n'); 
        }
        return null; 
    } catch (e) { 
        return null; 
    } 
}

router.get('/', (req, res) => handleLoginCheck(req, res, 'index'));
router.get('/dardcor', (req, res) => handleLoginCheck(req, res, 'dardcor'));
router.get('/register', (req, res) => handleLoginCheck(req, res, 'register'));
router.get('/loading', (req, res) => res.render('loading'));

router.get('/verify-otp', (req, res) => {
    if (req.session.userAccount) {
        return res.redirect('/loading');
    }
    const email = req.query.email || '';
    res.render('verify', { email: email });
});

router.get('/auth/google', async (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const fullUrl = `${protocol}://${host}/register`;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
            redirectTo: fullUrl,
            queryParams: { access_type: 'offline', prompt: 'select_account' }
        }
    });
    if (error) return res.redirect('/register?error=' + encodeURIComponent(error.message));
    res.redirect(data.url);
});

router.post('/auth/google-bridge', async (req, res) => {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ success: false, message: 'Invalid payload' });
    try {
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);
        if (error || !user) throw new Error('Authorization expired');
        let { data: dbUser } = await supabase.from('dardcor_users').select('*').eq('email', user.email).maybeSingle();
        if (!dbUser) {
            const { data: newUser, error: insErr } = await supabase.from('dardcor_users').insert([{
                id: user.id,
                email: user.email,
                username: user.user_metadata.full_name || user.user_metadata.name || user.email.split('@')[0],
                password: await bcrypt.hash(uuidv4() + STATIC_KEY + user.id, 12),
                profile_image: user.user_metadata.avatar_url || user.user_metadata.picture
            }]).select().single();
            if (insErr) throw insErr;
            dbUser = newUser;
        }
        req.session.userAccount = dbUser;
        req.session.cookie.maxAge = ONE_CENTURY;
        res.cookie('dardcor_perm_auth', generateAuthToken(dbUser), cookieConfig);
        req.session.save((err) => {
            if (err) throw err;
            res.json({ success: true, redirectUrl: '/loading' });
        });
    } catch (e) {
        sendDiscordError("OAuth Bridge Failure", e);
        res.status(500).json({ success: false, message: e.message });
    }
});

router.post('/dardcor-login', authLimiter, async (req, res) => { 
    let { email, password } = req.body; 
    if (!email || !password) return res.status(400).json({ success: false, message: 'Incomplete credentials.' });
    try { 
        const { data: user, error } = await supabase.from('dardcor_users').select('*').eq('email', email.trim().toLowerCase()).maybeSingle(); 
        if (error || !user) return res.status(401).json({ success: false, message: 'Authentication failed.' }); 
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Authentication failed.' }); 
        req.session.userAccount = user; 
        req.session.cookie.maxAge = ONE_CENTURY;
        res.cookie('dardcor_perm_auth', generateAuthToken(user), cookieConfig);
        req.session.save((err) => { 
            if (err) throw err;
            res.status(200).json({ success: true, redirectUrl: '/loading' }); 
        }); 
    } catch (err) { 
        sendDiscordError("Login System", err);
        res.status(500).json({ success: false, message: 'Internal engine error.' }); 
    } 
});

router.get('/dardcor-logout', (req, res) => { 
    req.session.destroy((err) => { 
        res.clearCookie('dardcor_perm_auth');
        res.redirect('/dardcor'); 
    }); 
});

router.post('/register', authLimiter, async (req, res) => { 
    let { username, email, password } = req.body; 
    if (!username || !email || !password) return res.status(400).json({ success: false, message: 'All fields are mandatory.' });
    email = email.trim().toLowerCase(); 
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Invalid email syntax.' });
    try { 
        const { data: existingUser } = await supabase.from('dardcor_users').select('email').eq('email', email).maybeSingle(); 
        if (existingUser) return res.status(409).json({ success: false, message: 'Identity already exists.' }); 
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
        const hashedPassword = await bcrypt.hash(password, 12); 
        await supabase.from('verification_codes').delete().eq('email', email); 
        const { error: dbErr } = await supabase.from('verification_codes').insert([{ 
            username: username.substring(0, 100), 
            email, 
            password: hashedPassword, 
            otp 
        }]); 
        if (dbErr) throw dbErr;
        await transporter.sendMail({ 
            from: `"Dardcor AI Neural Link" <${process.env.EMAIL_USER}>`, 
            to: email, 
            subject: 'Encryption Key - Dardcor AI Verification', 
            html: `
                <div style="background-color:#050508; color:#ffffff; font-family:'Courier New', monospace; padding:50px; text-align:center; border:2px solid #1e1b4b; border-radius:30px; max-width:650px; margin:auto; box-shadow: 0 0 50px rgba(139, 92, 246, 0.2);">
                    <img src="https://${req.get('host')}/logo.png" style="width:100px; height:100px; border-radius:25px; margin-bottom:30px; border: 1px solid #3b82f6;">
                    <h1 style="color:#a855f7; font-size:32px; letter-spacing:2px; margin-bottom:15px; text-transform:uppercase;">Account Synchronization</h1>
                    <p style="color:#94a3b8; font-size:18px; margin-bottom:40px; line-height:1.6;">Initialize your connection to Dardcor AI using the following neural handshake code. Validity: 300 seconds.</p>
                    <div style="background:linear-gradient(135deg, #0f172a 0%, #050508 100%); border:3px solid #3b82f6; padding:30px; border-radius:20px; display:inline-block; margin-bottom:40px;">
                        <span style="font-size:64px; font-weight:bold; letter-spacing:20px; color:#60a5fa; text-shadow: 0 0 20px rgba(59, 130, 246, 0.5);">${otp}</span>
                    </div>
                    <div style="border-top:1px solid #1e293b; padding-top:30px; margin-top:20px;">
                        <p style="color:#475569; font-size:13px; font-style:italic;">Target Protocol: 0x7712-Dardcor-Auth-V3</p>
                        <p style="color:#64748b; font-size:11px; margin-top:10px;">Security encrypted transmission. Do not expose.</p>
                    </div>
                </div>
            ` 
        }); 
        res.status(200).json({ success: true, email: email, redirectUrl: `/verify-otp?email=${encodeURIComponent(email)}` }); 
    } catch (err) { 
        sendDiscordError("Auth Flow Disruption", err);
        res.status(500).json({ success: false, message: "Handshake failed. Core unreachable." }); 
    } 
});

router.post('/verify-otp', authLimiter, async (req, res) => { 
    try { 
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ success: false, message: "Corrupted request." });
        const { data: record, error: fetchErr } = await supabase.from('verification_codes').select('*').eq('email', email).eq('otp', otp).maybeSingle(); 
        if (fetchErr || !record) return res.status(400).json({ success: false, message: 'Invalid synchronization code.' }); 
        const { data: newUser, error: insErr } = await supabase.from('dardcor_users').insert([{ 
            username: record.username, 
            email: record.email, 
            password: record.password 
        }]).select().single(); 
        if (insErr) throw insErr;
        await supabase.from('verification_codes').delete().eq('email', email); 
        req.session.userAccount = newUser; 
        req.session.cookie.maxAge = ONE_CENTURY;
        res.cookie('dardcor_perm_auth', generateAuthToken(newUser), cookieConfig);
        req.session.save((err) => {
            if (err) throw err;
            res.status(200).json({ success: true, redirectUrl: '/loading' }); 
        });
    } catch (err) { 
        sendDiscordError("OTP Engine Fault", err);
        res.status(500).json({ success: false, message: "Verification engine failure." }); 
    } 
});

router.get('/dardcorchat/profile', protectedRoute, async (req, res) => { 
    try {
        const { data: user } = await supabase.from('dardcor_users').select('*').eq('id', req.session.userAccount.id).single();
        res.render('dardcorchat/profile', { user: user, success: req.query.success, error: req.query.error }); 
    } catch (e) {
        res.redirect('/dardcor');
    }
});

router.post('/dardcor/profile/update', protectedRoute, upload.single('profile_image'), async (req, res) => { 
    const userId = req.session.userAccount.id; 
    let updates = { 
        username: req.body.username ? req.body.username.substring(0, 100) : req.session.userAccount.username 
    }; 
    try { 
        if (req.body.password && req.body.password.trim() !== "") { 
            if (req.body.password !== req.body.confirm_password) return res.redirect('/dardcorchat/profile?error=Encryption key mismatch'); 
            updates.password = await bcrypt.hash(req.body.password.trim(), 12); 
        } 
        if (req.file) { 
            const fileBuffer = fs.readFileSync(req.file.path);
            const fileExt = path.extname(req.file.originalname).toLowerCase();
            const fileName = `avatar-${userId}-${Date.now()}${fileExt}`; 
            const { error: uploadErr } = await supabase.storage.from('avatars').upload(fileName, fileBuffer, { 
                contentType: req.file.mimetype, 
                upsert: true 
            }); 
            if (uploadErr) throw uploadErr;
            const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName); 
            updates.profile_image = publicUrlData.publicUrl; 
            fs.unlink(req.file.path, () => {});
        } 
        const { data, error } = await supabase.from('dardcor_users').update(updates).eq('id', userId).select().single(); 
        if (error) throw error;
        req.session.userAccount = data; 
        res.cookie('dardcor_perm_auth', generateAuthToken(data), cookieConfig);
        req.session.save(() => { 
            res.redirect('/dardcorchat/profile?success=Neural identity updated.'); 
        }); 
    } catch (err) { 
        if (req.file && req.file.path) fs.unlink(req.file.path, () => {});
        sendDiscordError("Identity Update Failure", err);
        res.redirect('/dardcorchat/profile?error=Update error: ' + encodeURIComponent(err.message)); 
    } 
});

router.get('/dardcorchat/dardcor-ai', protectedRoute, (req, res) => { 
    res.redirect(`/dardcorchat/dardcor-ai/${uuidv4()}`); 
});

router.get('/dardcorchat/dardcor-ai/:conversationId', protectedRoute, async (req, res) => { 
    const userId = req.session.userAccount.id; 
    let requestedId = req.params.conversationId; 
    if (!uuidValidate(requestedId)) return res.redirect(`/dardcorchat/dardcor-ai/${uuidv4()}`);
    try { 
        const { data: conversationList } = await supabase.from('conversations').select('*').eq('user_id', userId).order('updated_at', { ascending: false }); 
        const { data: activeChatHistory } = await supabase.from('history_chat').select('*').eq('conversation_id', requestedId).eq('user_id', userId).order('created_at', { ascending: true }); 
        if (activeChatHistory && activeChatHistory.length > 0) {
            await Promise.all(activeChatHistory.map(async (msg) => {
                if (msg.file_metadata && Array.isArray(msg.file_metadata)) {
                    msg.file_metadata = await Promise.all(msg.file_metadata.map(async (file) => {
                        if (file.storage_path) {
                            try {
                                const { data: signed } = await supabase.storage.from('chat-attachments').createSignedUrl(file.storage_path, 3600);
                                if (signed) file.url = signed.signedUrl;
                            } catch (e) {}
                        }
                        return file;
                    }));
                }
            }));
        }
        req.session.currentConversationId = requestedId; 
        res.render('dardcorchat/layout', { 
            user: req.session.userAccount, 
            chatHistory: activeChatHistory || [], 
            conversationList: conversationList || [], 
            activeConversationId: requestedId, 
            contentPage: 'dardcorai' 
        }); 
    } catch (err) { 
        sendDiscordError("Neural Link Loader", err);
        res.redirect('/dardcor'); 
    } 
});

router.get('/api/chat/:conversationId', protectedRoute, apiLimiter, async (req, res) => { 
    const userId = req.session.userAccount.id; 
    const convoId = req.params.conversationId;
    if (!uuidValidate(convoId)) return res.status(400).json({ success: false });
    try { 
        const { data: history, error } = await supabase.from('history_chat').select('*').eq('conversation_id', convoId).eq('user_id', userId).order('created_at', { ascending: true }); 
        if (error) throw error;
        if (history && history.length > 0) {
            await Promise.all(history.map(async (msg) => {
                if (msg.file_metadata && Array.isArray(msg.file_metadata)) {
                    msg.file_metadata = await Promise.all(msg.file_metadata.map(async (file) => {
                        if (file.storage_path) {
                            try {
                                const { data: signed } = await supabase.storage.from('chat-attachments').createSignedUrl(file.storage_path, 3600);
                                if (signed) file.url = signed.signedUrl;
                            } catch (e) {}
                        }
                        return file;
                    }));
                }
            }));
        }
        req.session.currentConversationId = convoId; 
        res.json({ success: true, history: history || [] }); 
    } catch (err) { 
        res.status(500).json({ success: false }); 
    } 
});

router.post('/dardcorchat/ai/new-chat', protectedRoute, (req, res) => { 
    req.session.currentConversationId = null; 
    req.session.save(() => { 
        res.json({ success: true, redirectUrl: `/dardcorchat/dardcor-ai/${uuidv4()}` }); 
    }); 
});

router.post('/dardcorchat/ai/rename-chat', protectedRoute, async (req, res) => { 
    const { conversationId, newTitle } = req.body;
    if (!uuidValidate(conversationId) || !newTitle) return res.status(400).json({ success: false });
    try { 
        const { error } = await supabase.from('conversations').update({ 
            title: newTitle.substring(0, 150),
            updated_at: new Date()
        }).eq('id', conversationId).eq('user_id', req.session.userAccount.id); 
        if (error) throw error;
        res.json({ success: true }); 
    } catch (error) { 
        res.status(500).json({ success: false }); 
    } 
});

router.post('/dardcorchat/ai/delete-chat-history', protectedRoute, async (req, res) => { 
    const { conversationId } = req.body;
    if (!uuidValidate(conversationId)) return res.status(400).json({ success: false });
    try { 
        const { error } = await supabase.from('conversations').delete().eq('id', conversationId).eq('user_id', req.session.userAccount.id); 
        if (error) throw error;
        res.json({ success: true }); 
    } catch (error) { 
        res.status(500).json({ success: false }); 
    } 
});

router.get('/api/project/files', protectedRoute, async (req, res) => {
    try {
        const { data, error } = await supabase.from('project_files').select('*').eq('user_id', req.session.userAccount.id).order('is_folder', { ascending: false }).order('name', { ascending: true });
        if (error) throw error;
        res.json({ success: true, files: data || [] });
    } catch (e) { 
        res.status(500).json({ success: false }); 
    }
});

router.post('/api/project/save', protectedRoute, async (req, res) => {
    const { name, path: filePath, content, language, is_folder } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Identifier required" });
    try {
        const { error } = await supabase.from('project_files').upsert({
            user_id: req.session.userAccount.id,
            name: name.substring(0, 255),
            path: filePath || 'root',
            content: content || '',
            language: language || 'plaintext',
            is_folder: !!is_folder,
            updated_at: new Date()
        }, { onConflict: 'user_id, path, name' });
        if (error) throw error;
        res.json({ success: true });
    } catch (e) { 
        res.status(500).json({ success: false, message: e.message }); 
    }
});

router.post('/api/project/delete', protectedRoute, async (req, res) => {
    const { name, path: filePath } = req.body;
    try {
        const { error } = await supabase.from('project_files').delete().match({ 
            user_id: req.session.userAccount.id, 
            name, 
            path: filePath || 'root' 
        });
        if (error) throw error;
        res.json({ success: true });
    } catch (e) { 
        res.status(500).json({ success: false }); 
    }
});

router.post('/dardcorchat/ai/store-preview', protectedRoute, async (req, res) => { 
    const previewId = uuidv4(); 
    const { code, type } = req.body;
    try { 
        const { error } = await supabase.from('previews_website').insert({ 
            id: previewId, 
            user_id: req.session.userAccount.id, 
            code, 
            type: type || 'website' 
        }); 
        if (error) throw error;
        res.json({ success: true, previewId }); 
    } catch (error) { 
        res.status(500).json({ success: false }); 
    } 
});

router.get('/dardcorchat/dardcor-ai/preview/:id', protectedRoute, async (req, res) => { 
    if (!uuidValidate(req.params.id)) return res.status(404).send('Illegal Identifier');
    try { 
        const { data, error } = await supabase.from('previews_website').select('code').eq('id', req.params.id).maybeSingle(); 
        if (error || !data) return res.status(404).send('Resource Depleted'); 
        res.removeHeader('X-Frame-Options');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data:; img-src 'self' https: data:; font-src 'self' https: data:;");
        res.setHeader('Content-Type', 'text/html; charset=utf-8'); 
        res.setHeader('X-XSS-Protection', '0'); 
        res.send(data.code); 
    } catch (err) { 
        res.status(500).send("Neural Engine Error"); 
    } 
});

router.get('/dardcorchat/dardcor-ai/diagram/:id', protectedRoute, async (req, res) => { 
    if (!uuidValidate(req.params.id)) return res.status(404).send('Illegal Identifier');
    try { 
        const { data, error } = await supabase.from('previews_website').select('code').eq('id', req.params.id).maybeSingle(); 
        if (error || !data) return res.status(404).send('Data Link Broken'); 
        const codeBase64 = Buffer.from(data.code).toString('base64'); 
        res.removeHeader('X-Frame-Options');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.render('dardcorchat/diagram', { code: codeBase64 }); 
    } catch (err) { 
        res.status(500).send("Visualization Engine Error"); 
    } 
});

router.post('/dardcorchat/ai/chat-stream', protectedRoute, uploadMiddleware, async (req, res) => {
    req.socket.setTimeout(0); 
    req.setTimeout(0);
    const userId = req.session.userAccount.id;
    let { message, conversationId, useWebSearch } = req.body;
    const uploadedFiles = req.files || [];
    if (!uuidValidate(conversationId)) conversationId = uuidv4();
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let botMessageId = null;
    let fullResponse = "";
    let isStreamCompleted = false;

    req.on('close', async () => {
        if (!isStreamCompleted && botMessageId && fullResponse) {
             try { await supabase.from('history_chat').update({ message: fullResponse }).eq('id', botMessageId); } catch(e) {}
        }
        uploadedFiles.forEach(file => { if (file.path && fs.existsSync(file.path)) fs.unlink(file.path, () => {}); });
    });

    try {
        const contextData = { searchResults: '', globalHistory: '' };
        let systemContext = "";
        const urls = message.match(/(https?:\/\/[^\s]+)/g);
        if (urls && urls.length > 0) {
            for (const url of urls.slice(0, 5)) {
                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    const yt = await getYouTubeData(url);
                    if (yt.success) {
                        systemContext += `\n[YOUTUBE DATA: ${yt.title}]\nSOURCE: ${url}\nDESCRIPTION: ${yt.description}\nTRANSCRIPT: ${yt.transcript}\n`;
                    }
                } else {
                    const web = await getWebsiteContent(url);
                    if (web) systemContext += `\n[WEBSITE ANALYTICS: ${url}]\nDATA: ${web}\n`;
                }
            }
        }

        if (useWebSearch === 'true' || message.toLowerCase().match(/(cari|search|berita|info|terbaru|siapa|apa|kapan|dimana|bagaimana|mengapa|tutorial|harga|saham|politik|cuaca)/)) {
            const search = await searchWeb(message);
            if (search) contextData.searchResults = search;
        }

        const geminiFiles = []; 
        let fileTextContext = "";
        let fileMetadata = []; 

        if (uploadedFiles.length > 0) {
            for (const file of uploadedFiles) {
                const fileBuffer = fs.readFileSync(file.path);
                const fileExt = path.extname(file.originalname).toLowerCase();
                const storagePath = `${userId}/${Date.now()}-${uuidv4()}${fileExt}`;
                const meta = { 
                    filename: file.originalname, 
                    size: file.size, 
                    mimetype: file.mimetype, 
                    storage_path: storagePath 
                };

                try {
                    const { error: uploadErr } = await supabase.storage.from('chat-attachments').upload(storagePath, fileBuffer, { 
                        contentType: file.mimetype, 
                        upsert: false 
                    });
                    if (!uploadErr) {
                        const { data: signed } = await supabase.storage.from('chat-attachments').createSignedUrl(storagePath, 3600);
                        if (signed) meta.url = signed.signedUrl;
                    }
                } catch (err) {}

                fileMetadata.push(meta);

                const isVisual = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/');
                if (isVisual || file.mimetype === 'application/pdf') {
                    geminiFiles.push({ ...file, buffer: fileBuffer });
                }

                if (file.mimetype === 'application/pdf') {
                    const pdfText = await parsePdfSafe(fileBuffer);
                    fileTextContext += `\n[DOCUMENT STREAM - PDF: ${file.originalname}]\n${pdfText}\n`;
                } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                    try { 
                        const doc = await mammoth.extractRawText({ buffer: fileBuffer }); 
                        fileTextContext += `\n[DOCUMENT STREAM - WORD: ${file.originalname}]\n${doc.value.substring(0, 20000)}\n`; 
                    } catch(e){}
                } else if (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel') || file.mimetype.includes('csv')) {
                    try { 
                        const wb = xlsx.read(fileBuffer, { type: 'buffer' }); 
                        wb.SheetNames.slice(0, 10).forEach(n => { 
                            const csv = xlsx.utils.sheet_to_csv(wb.Sheets[n]);
                            fileTextContext += `\n[TABULAR DATA - SHEET: ${n}]\n${csv.substring(0, 8000)}\n`; 
                        });
                    } catch(e){}
                } else if (file.mimetype.startsWith('text/') || ['.js', '.py', '.html', '.css', '.json', '.ts', '.sql', '.php', '.ejs', '.java', '.cpp', '.c', '.h', '.sh', '.xml', '.yaml', '.md', '.txt', '.log', '.csv', '.ini', '.cfg'].includes(fileExt)) {
                    fileTextContext += `\n[FILE SYSTEM INJECTION: ${file.originalname}]\n${fileBuffer.toString('utf-8').substring(0, 40000)}\n`;
                }
                
                fs.unlink(file.path, () => {});
            }
        }

        if (fileTextContext) {
            systemContext += `\n[NEURAL CONTEXT FROM UPLOADED ASSETS]\n${fileTextContext}\n[END NEURAL CONTEXT]`;
        }

        const { data: convExists } = await supabase.from('conversations').select('id').eq('id', conversationId).maybeSingle();
        if (!convExists) {
            await supabase.from('conversations').insert({ 
                id: conversationId, 
                user_id: userId, 
                title: message.substring(0, 100).replace(/\n/g, ' ') || "Neural Thread" 
            });
        } else {
            await supabase.from('conversations').update({ updated_at: new Date() }).eq('id', conversationId);
        }

        const { error: historyErr } = await supabase.from('history_chat').insert({ 
            user_id: userId, 
            conversation_id: conversationId, 
            role: 'user', 
            message: message, 
            file_metadata: fileMetadata 
        });
        if (historyErr) throw historyErr;

        const { data: botMsg, error: botErr } = await supabase.from('history_chat').insert({ 
            user_id: userId, 
            conversation_id: conversationId, 
            role: 'bot', 
            message: '' 
        }).select('id').single();
        if (botErr) throw botErr;
        botMessageId = botMsg.id;

        const { data: historyData } = await supabase.from('history_chat').select('role, message').eq('conversation_id', conversationId).order('created_at', { ascending: true });
        
        const refinedPrompt = systemContext ? `${systemContext}\n\nTERMINAL_INPUT: ${message}` : message;
        const stream = await handleChatStream(refinedPrompt, geminiFiles, historyData, contextData);

        for await (const chunk of stream) {
            const chunkText = chunk.text();
            fullResponse += chunkText;
            res.write(`event: message\ndata: ${JSON.stringify({ chunk: chunkText })}\n\n`);
        }

        isStreamCompleted = true;
        await supabase.from('history_chat').update({ message: fullResponse }).eq('id', botMessageId);
        res.write(`event: message\ndata: ${JSON.stringify({ done: true })}\n\n`);
        res.end();

    } catch (error) {
        sendDiscordError("Neural Link Stream Engine Failure", error);
        const errorMsg = "Core synchronization failed. The neural link has encountered a critical buffer overflow or logic fault. Attempting to restore link...";
        if (botMessageId) {
            await supabase.from('history_chat').update({ message: errorMsg }).eq('id', botMessageId);
            res.write(`event: message\ndata: ${JSON.stringify({ chunk: errorMsg })}\n\n`);
        }
        res.write(`event: message\ndata: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
    }
});

module.exports = router;