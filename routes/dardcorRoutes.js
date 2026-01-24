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
        filename: (req, file, cb) => cb(null, `${Date.now()}-${uuidv4()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '')}`)
    }), 
    limits: { fileSize: 10 * 1024 * 1024, files: 10 } 
});

const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });

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
    upload.array('file_attachment', 10)(req, res, function (err) { 
        if (err) return res.status(400).json({ success: false, message: "Upload Error" }); 
        next(); 
    }); 
};

function generateAuthToken(user) {
    const payload = JSON.stringify({ id: user.id, email: user.email, v: user.password.substring(0, 10) });
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
        return res.redirect(`/dardcorchat/dardcor-ai/${uuidv4()}`);
    }
    const authCookie = req.cookies['dardcor_perm_auth'];
    if (!authCookie) {
        return res.render(renderPage, { error: null, user: null });
    }
    const userData = verifyAuthToken(authCookie);
    if (!userData) {
        res.clearCookie('dardcor_perm_auth');
        return res.render(renderPage, { error: null, user: null });
    }
    try {
        const { data: user } = await supabase.from('dardcor_users').select('*').eq('id', userData.id).maybeSingle();
        if (user && user.password.substring(0, 10) === userData.v) {
            req.session.userAccount = user;
            req.session.cookie.maxAge = ONE_CENTURY;
            res.cookie('dardcor_perm_auth', generateAuthToken(user), cookieConfig);
            return req.session.save(() => {
                res.redirect(`/dardcorchat/dardcor-ai/${uuidv4()}`);
            });
        }
        res.clearCookie('dardcor_perm_auth');
        return res.render(renderPage, { error: null, user: null });
    } catch (e) {
        return res.render(renderPage, { error: null, user: null });
    }
}

async function protectedRoute(req, res, next) {
    if (req.session && req.session.userAccount) {
        return next();
    }
    const authCookie = req.cookies['dardcor_perm_auth'];
    if (!authCookie) {
        if (req.xhr || req.path.includes('/api/') || req.path.includes('/ai/')) {
            return res.status(401).json({ success: false, redirectUrl: '/dardcor' });
        }
        return res.redirect('/dardcor');
    }
    const userData = verifyAuthToken(authCookie);
    if (!userData) {
        res.clearCookie('dardcor_perm_auth');
        if (req.xhr || req.path.includes('/api/') || req.path.includes('/ai/')) {
            return res.status(401).json({ success: false });
        }
        return res.redirect('/dardcor');
    }
    try {
        const { data: user } = await supabase.from('dardcor_users').select('*').eq('id', userData.id).maybeSingle();
        if (user && user.password.substring(0, 10) === userData.v) {
            req.session.userAccount = user;
            req.session.cookie.maxAge = ONE_CENTURY;
            res.cookie('dardcor_perm_auth', generateAuthToken(user), cookieConfig);
            return req.session.save(() => next());
        }
        res.clearCookie('dardcor_perm_auth');
        if (req.xhr || req.path.includes('/api/') || req.path.includes('/ai/')) {
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
    } catch (e) { return false; }
}

async function getFileTypeSafe(buffer) {
    try {
        const { fileTypeFromBuffer } = await import('file-type');
        return await fileTypeFromBuffer(buffer);
    } catch (e) { return null; }
}

async function parsePdfSafe(buffer) {
    try {
        if (!global.DOMMatrix) global.DOMMatrix = class DOMMatrix {};
        if (!global.ImageData) global.ImageData = class ImageData {};
        if (!global.Path2D) global.Path2D = class Path2D {};
        if (!global.window) global.window = global;
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const data = new Uint8Array(buffer);
        const loadingTask = pdfjs.getDocument({ data: data, useSystemFonts: true, disableFontFace: true, verbosity: 0 });
        const pdf = await loadingTask.promise;
        let fullText = "";
        const maxPages = Math.min(pdf.numPages, 5); 
        for (let i = 1; i <= maxPages; i++) {
            try {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += `[PAGE ${i}]: ${textContent.items.map(item => item.str).join(' ').substring(0, 2000)}\n`;
            } catch (pageErr) { }
        }
        return fullText || "[PDF EMPTY]";
    } catch (error) { return "[PDF ERROR]"; }
}

async function sendDiscordError(context, error) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;
    try {
        await axios.post(webhookUrl, { username: "Dardcor Monitor", embeds: [{ title: `Error: ${context}`, description: String(error?.message || error).substring(0, 500), color: 16711680, timestamp: new Date().toISOString() }] });
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
        const pageRes = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 }); 
        const $ = cheerio.load(pageRes.data); 
        data.title = $('meta[name="title"]').attr('content') || $('title').text(); 
        data.description = ($('meta[name="description"]').attr('content') || '').substring(0, 500); 
    } catch (e) { } 
    try { 
        const transcriptObj = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'id' }).catch(() => YoutubeTranscript.fetchTranscript(videoId)); 
        if (transcriptObj && transcriptObj.length > 0) data.transcript = transcriptObj.map(t => t.text).join(' ').substring(0, 5000); 
    } catch (e) { } 
    return { success: true, ...data }; 
}

async function getWebsiteContent(url) { 
    if (!await isSafeUrl(url)) return null;
    try { 
        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000, maxContentLength: 100000 }); 
        const $ = cheerio.load(response.data); 
        $('script, style, nav, footer, header, svg, img, iframe, noscript').remove(); 
        return $('body').text().replace(/\s+/g, ' ').trim().substring(0, 5000); 
    } catch (e) { return null; } 
}

async function searchWeb(query) { 
    try { 
        if (!query || typeof query !== 'string') return null; 
        const res = await axios.get(`https://ddg-api.herokuapp.com/search?q=${encodeURIComponent(query.substring(0, 100))}&limit=3`, { timeout: 5000 }); 
        if (res.data && Array.isArray(res.data) && res.data.length > 0) return res.data.map(r => `- [${(r.title || '').substring(0, 100)}](${(r.link || '')}): ${(r.snippet || '').substring(0, 200)}`).join('\n'); 
        return null; 
    } catch (e) { return null; } 
}

router.get('/', (req, res) => handleLoginCheck(req, res, 'index'));
router.get('/dardcor', (req, res) => handleLoginCheck(req, res, 'dardcor'));
router.get('/register', (req, res) => handleLoginCheck(req, res, 'register'));

router.post('/auth/bridge', async (req, res) => {
    const { accessToken } = req.body;
    try {
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);
        if (error || !user) return res.status(401).json({ success: false });
        const { data: dbUser } = await supabase.from('dardcor_users').select('*').eq('email', user.email).maybeSingle();
        let finalUser = dbUser;
        if (!dbUser) {
            const { data: newUser } = await supabase.from('dardcor_users').insert([{ 
                id: user.id, 
                email: user.email, 
                username: user.user_metadata.full_name || user.email.split('@')[0],
                password: await bcrypt.hash(uuidv4(), 12),
                profile_image: user.user_metadata.avatar_url
            }]).select().single();
            finalUser = newUser;
        }
        req.session.userAccount = finalUser;
        res.cookie('dardcor_perm_auth', generateAuthToken(finalUser), cookieConfig);
        req.session.save(() => res.json({ success: true }));
    } catch (e) { res.status(500).json({ success: false }); }
});

router.get('/auth/google', async (req, res) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `http://localhost:3000/dardcor` }
    });
    if (error) return res.redirect('/dardcor');
    res.redirect(data.url);
});

router.get('/auth/google/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('/dardcor');
    try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.user) return res.redirect('/dardcor');
        const { data: dbUser } = await supabase.from('dardcor_users').select('*').eq('email', data.user.email).maybeSingle();
        let finalUser = dbUser;
        if (!dbUser) {
            const { data: newUser } = await supabase.from('dardcor_users').insert([{ 
                id: data.user.id, 
                email: data.user.email, 
                username: data.user.user_metadata.full_name || data.user.user_metadata.name || data.user.email.split('@')[0],
                password: await bcrypt.hash(uuidv4(), 12),
                profile_image: data.user.user_metadata.avatar_url || data.user.user_metadata.picture
            }]).select().single();
            finalUser = newUser;
        }
        if (finalUser) {
            req.session.userAccount = finalUser;
            req.session.cookie.maxAge = ONE_CENTURY;
            res.cookie('dardcor_perm_auth', generateAuthToken(finalUser), cookieConfig);
            return req.session.save(() => res.redirect(`/dardcorchat/dardcor-ai/${uuidv4()}`));
        }
        res.redirect('/dardcor');
    } catch (e) { res.redirect('/dardcor'); }
});

router.post('/dardcor-login', authLimiter, async (req, res) => { 
    let { email, password } = req.body; 
    if (!email || !password) return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });
    try { 
        const { data: user } = await supabase.from('dardcor_users').select('*').eq('email', email.trim().toLowerCase()).maybeSingle(); 
        if (!user || !await bcrypt.compare(password, user.password)) return res.status(400).json({ success: false, message: 'Kredensial salah.' }); 
        req.session.userAccount = user; 
        res.cookie('dardcor_perm_auth', generateAuthToken(user), cookieConfig);
        req.session.save((err) => { 
            if (err) return res.status(500).json({ success: false }); 
            res.status(200).json({ success: true, redirectUrl: '/dardcorchat/dardcor-ai' }); 
        }); 
    } catch (err) { 
        sendDiscordError("Login Route", err);
        res.status(500).json({ success: false }); 
    } 
});

router.get('/dardcor-logout', (req, res) => { 
    req.session.destroy(() => { 
        res.clearCookie('dardcor_session_id'); 
        res.clearCookie('dardcor_perm_auth');
        res.redirect('/dardcor'); 
    }); 
});

router.post('/register', authLimiter, async (req, res) => { 
    let { username, email, password } = req.body; 
    if (!username || !email || !password) return res.status(400).json({ success: false, message: 'Data tidak lengkap.' });
    email = email.trim().toLowerCase(); 
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Email tidak valid.' });
    try { 
        const { data: existingUser } = await supabase.from('dardcor_users').select('email').eq('email', email).maybeSingle(); 
        if (existingUser) return res.status(400).json({ success: false, message: 'Email sudah terdaftar.' }); 
        await supabase.from('verification_codes').delete().eq('email', email); 
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
        const hashedPassword = await bcrypt.hash(password, 12); 
        await supabase.from('verification_codes').insert([{ username: username.substring(0, 50), email, password: hashedPassword, otp }]); 
        await transporter.sendMail({ 
            from: '"Dardcor Security" <no-reply@dardcor.com>', 
            to: email, 
            subject: 'Kode Verifikasi Dardcor AI', 
            html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #581c87; text-align: center;">Kode OTP Anda</h2>
                    <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px;">
                        <h1 style="letter-spacing: 5px; font-size: 32px; margin: 0;">${otp}</h1>
                    </div>
                    <p style="margin-top: 20px; font-size: 14px; color: #555; line-height: 1.6;">
                        <b>Penting:</b> Kode ini hanya berlaku selama <b>5 menit</b>. Jika Anda tidak merasa melakukan pendaftaran di Dardcor AI, abaikan email ini atau segera hubungi tim keamanan kami. 
                        <br><br>
                        Jangan memberikan kode ini kepada siapapun (termasuk tim Dardcor AI). Kode ini bersifat rahasia untuk memverifikasi kepemilikan email Anda.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 11px; color: #aaa; text-align: center;">Dardcor AI Security System - Encrypted OTP Distribution</p>
                </div>
            ` 
        }); 
        res.status(200).json({ success: true, email: email, redirectUrl: `/verify-otp?email=${encodeURIComponent(email)}` }); 
    } catch (err) { 
        sendDiscordError("Register Route", err);
        res.status(500).json({ success: false }); 
    } 
});

router.get('/verify-otp', (req, res) => {
    if (req.session.userAccount) return res.redirect(`/dardcorchat/dardcor-ai/${uuidv4()}`);
    res.render('verify', { email: req.query.email });
});

router.post('/verify-otp', authLimiter, async (req, res) => { 
    try { 
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ success: false });
        const { data: record } = await supabase.from('verification_codes').select('*').eq('email', email).eq('otp', otp).maybeSingle(); 
        if (!record) return res.status(400).json({ success: false, message: 'OTP Salah.' }); 
        const { data: newUser } = await supabase.from('dardcor_users').insert([{ username: record.username, email: record.email, password: record.password }]).select().single(); 
        await supabase.from('verification_codes').delete().eq('email', email); 
        req.session.userAccount = newUser; 
        res.cookie('dardcor_perm_auth', generateAuthToken(newUser), cookieConfig);
        req.session.save(() => { res.status(200).json({ success: true, redirectUrl: '/dardcorchat/dardcor-ai' }); }); 
    } catch (err) { 
        sendDiscordError("Verify OTP", err);
        res.status(500).json({ success: false }); 
    } 
});

router.get('/dardcorchat/profile', protectedRoute, (req, res) => { 
    res.render('dardcorchat/profile', { user: req.session.userAccount, success: null, error: null }); 
});

router.post('/dardcor/profile/update', protectedRoute, upload.single('profile_image'), async (req, res) => { 
    const userId = req.session.userAccount.id; 
    let updates = { username: req.body.username ? req.body.username.substring(0, 50) : req.session.userAccount.username }; 
    try { 
        if (req.body.password && req.body.password.trim() !== "") { 
            if (req.body.password !== req.body.confirm_password) return res.render('dardcorchat/profile', { user: req.session.userAccount, error: "Password beda.", success: null }); 
            updates.password = await bcrypt.hash(req.body.password.trim(), 12); 
        } 
        if (req.file) { 
            const fileBuffer = fs.readFileSync(req.file.path);
            const fileName = `${userId}-${Date.now()}.${req.file.originalname.split('.').pop().replace(/[^a-zA-Z0-9]/g, '')}`; 
            await supabase.storage.from('avatars').upload(fileName, fileBuffer, { contentType: req.file.mimetype, upsert: true }); 
            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName); 
            updates.profile_image = data.publicUrl; 
            fs.unlink(req.file.path, () => {});
        } 
        const { data } = await supabase.from('dardcor_users').update(updates).eq('id', userId).select().single(); 
        req.session.userAccount = data; 
        res.cookie('dardcor_perm_auth', generateAuthToken(data), cookieConfig);
        req.session.save(() => { res.render('dardcorchat/profile', { user: data, success: "Sukses!", error: null }); }); 
    } catch (err) { 
        if (req.file && req.file.path) fs.unlink(req.file.path, () => {});
        res.render('dardcorchat/profile', { user: req.session.userAccount, error: "Gagal update.", success: null }); 
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
        req.session.currentConversationId = requestedId; 
        res.render('dardcorchat/layout', { user: req.session.userAccount, chatHistory: activeChatHistory || [], conversationList: conversationList || [], activeConversationId: requestedId, contentPage: 'dardcorai' }); 
    } catch (err) { 
        res.redirect('/dardcor'); 
    } 
});

router.get('/api/chat/:conversationId', protectedRoute, apiLimiter, async (req, res) => { 
    const userId = req.session.userAccount.id; 
    if (!uuidValidate(req.params.conversationId)) return res.status(400).json({ success: false });
    try { 
        const { data: history } = await supabase.from('history_chat').select('*').eq('conversation_id', req.params.conversationId).eq('user_id', userId).order('created_at', { ascending: true }); 
        if (history && history.length > 0) {
            await Promise.all(history.map(async (msg) => {
                if (msg.file_metadata && Array.isArray(msg.file_metadata)) {
                    const updatedFiles = await Promise.all(msg.file_metadata.map(async (file) => {
                        if (file.storage_path) {
                            try {
                                const { data: signedData } = await supabase.storage.from('chat-attachments').createSignedUrl(file.storage_path, 3600);
                                if (signedData && signedData.signedUrl) { file.url = signedData.signedUrl; file.path = signedData.signedUrl; return file; }
                            } catch (e) {}
                        }
                        return file;
                    }));
                    msg.file_metadata = updatedFiles;
                }
            }));
        }
        req.session.currentConversationId = req.params.conversationId; 
        req.session.save(); 
        res.json({ success: true, history: history || [] }); 
    } catch (err) { res.status(500).json({ success: false }); } 
});

router.post('/dardcorchat/ai/new-chat', protectedRoute, (req, res) => { 
    req.session.currentConversationId = null; 
    req.session.save(() => { res.json({ success: true, redirectUrl: `/dardcorchat/dardcor-ai/${uuidv4()}` }); }); 
});

router.post('/dardcorchat/ai/rename-chat', protectedRoute, async (req, res) => { 
    if (!uuidValidate(req.body.conversationId)) return res.status(400).json({ success: false });
    try { await supabase.from('conversations').update({ title: req.body.newTitle.substring(0, 50) }).eq('id', req.body.conversationId).eq('user_id', req.session.userAccount.id); res.json({ success: true }); } catch (error) { res.status(500).json({ success: false }); } 
});

router.post('/dardcorchat/ai/delete-chat-history', protectedRoute, async (req, res) => { 
    if (!uuidValidate(req.body.conversationId)) return res.status(400).json({ success: false });
    try { await supabase.from('conversations').delete().eq('id', req.body.conversationId).eq('user_id', req.session.userAccount.id); res.json({ success: true }); } catch (error) { res.status(500).json({ success: false }); } 
});

router.get('/api/project/files', protectedRoute, async (req, res) => {
    try {
        const { data } = await supabase.from('project_files').select('*').eq('user_id', req.session.userAccount.id);
        res.json({ success: true, files: data || [] });
    } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/api/project/save', protectedRoute, async (req, res) => {
    try {
        const { name, path, content, language, is_folder } = req.body;
        if (!name || name.length > 100) return res.status(400).json({ success: false });
        const { error } = await supabase.from('project_files').upsert({
            user_id: req.session.userAccount.id,
            name,
            path: path || 'root',
            content: content || '',
            language,
            is_folder
        }, { onConflict: 'user_id, path, name' });
        if (error) throw error;
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/api/project/delete', protectedRoute, async (req, res) => {
    try {
        const { name, path } = req.body;
        await supabase.from('project_files').delete().match({ user_id: req.session.userAccount.id, name, path });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

router.post('/dardcorchat/ai/store-preview', protectedRoute, async (req, res) => { 
    const previewId = uuidv4(); 
    try { await supabase.from('previews_website').insert({ id: previewId, user_id: req.session.userAccount.id, code: req.body.code, type: req.body.type || 'website' }); res.json({ success: true, previewId }); } catch (error) { res.status(500).json({ success: false }); } 
});

router.get('/dardcorchat/dardcor-ai/preview/:id', protectedRoute, async (req, res) => { 
    if (!uuidValidate(req.params.id)) return res.status(404).send('Not Found');
    try { 
        const { data } = await supabase.from('previews_website').select('code').eq('id', req.params.id).maybeSingle(); 
        if (!data) return res.status(404).send('Not Found'); 
        res.setHeader('Content-Type', 'text/html'); 
        res.send(data.code); 
    } catch (err) { res.status(500).send("Error"); } 
});

router.get('/dardcorchat/dardcor-ai/diagram/:id', protectedRoute, async (req, res) => { 
    if (!uuidValidate(req.params.id)) return res.status(404).send('Not Found');
    try { 
        const { data } = await supabase.from('previews_website').select('code').eq('id', req.params.id).maybeSingle(); 
        if (!data) return res.status(404).send('Not Found'); 
        const codeBase64 = Buffer.from(data.code).toString('base64'); 
        res.render('dardcorchat/diagram', { code: codeBase64 }); 
    } catch (err) { res.status(500).send("Error"); } 
});

router.post('/dardcorchat/ai/chat-stream', protectedRoute, uploadMiddleware, async (req, res) => {
    req.socket.setTimeout(0); 
    req.setTimeout(0); 
    const userId = req.session.userAccount.id;
    let message = req.body.message ? req.body.message.trim() : "";
    const uploadedFiles = req.files || [];
    let conversationId = req.body.conversationId;
    if (!uuidValidate(conversationId)) conversationId = uuidv4();
    const useWebSearch = req.body.useWebSearch === 'true';
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    let botMessageId = null;
    let fullResponse = "";
    let isStreamCompleted = false;
    req.on('close', async () => {
        if (!isStreamCompleted && botMessageId && fullResponse) {
             try { await supabase.from('history_chat').update({ message: fullResponse }).eq('id', botMessageId); } catch(e) {}
        }
        uploadedFiles.forEach(file => { if (file.path) fs.unlink(file.path, () => {}); });
    });
    try {
        const contextData = { searchResults: '', globalHistory: '' };
        let systemContext = "";
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = message.match(urlRegex);
        if (urls && urls.length > 0) {
            for (const url of urls.slice(0, 3)) {
                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    const ytData = await getYouTubeData(url);
                    if (ytData.success) {
                        systemContext += `\n[YOUTUBE: ${ytData.title}]\nDESC: ${ytData.description}\nTRANSCRIPT: ${ytData.transcript}\n`;
                    }
                } else {
                    const pageContent = await getWebsiteContent(url);
                    if (pageContent) systemContext += `\n[WEB: ${url}]\nCONTENT: ${pageContent}\n`;
                }
            }
        }
        if (useWebSearch || message.toLowerCase().match(/(cari|search|harga|terbaru|berita|info tentang)/)) {
            const searchRes = await searchWeb(message);
            if (searchRes) contextData.searchResults = searchRes;
        }
        const geminiFiles = []; 
        let fileTextContext = "";
        let fileMetadata = []; 
        if (uploadedFiles && uploadedFiles.length > 0) {
            for (const file of uploadedFiles) {
                const fileBuffer = fs.readFileSync(file.path);
                const detectedType = await getFileTypeSafe(fileBuffer);
                const mime = detectedType ? detectedType.mime : file.mimetype.toLowerCase();
                const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
                const fileExt = path.extname(originalName).toLowerCase();
                const fileNamePath = `${userId}/${Date.now()}-${uuidv4()}${fileExt}`;
                const meta = { filename: originalName, size: file.size, mimetype: mime, path: null, url: null, storage_path: fileNamePath };
                try {
                    const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(fileNamePath, fileBuffer, { contentType: mime, upsert: false });
                    if (!uploadError) {
                        const { data: signedData } = await supabase.storage.from('chat-attachments').createSignedUrl(fileNamePath, 3600);
                        if (signedData && signedData.signedUrl) { meta.path = signedData.signedUrl; meta.url = signedData.signedUrl; }
                    }
                } catch (err) { }
                fileMetadata.push(meta);
                const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.cs', '.php', '.ejs', '.html', '.css', '.json', '.xml', '.sql', '.md', '.txt', '.env', '.yml', '.yaml', '.ini', '.log', '.sh', '.bat', '.ps1', '.vb', '.config', '.gitignore', '.rb', '.go', '.rs', '.swift', '.kt', '.lua', '.pl', '.r', '.dart'];
                if (mime.startsWith('image/') || mime === 'application/pdf' || mime.startsWith('video/') || mime.startsWith('audio/')) {
                    geminiFiles.push({ ...file, buffer: fileBuffer }); 
                }
                if (mime.startsWith('image/')) { 
                    fileTextContext += `\n[IMAGE ATTACHED: ${originalName}]\n`; 
                } else if (mime === 'application/pdf') { 
                    let extractedText = await parsePdfSafe(fileBuffer); 
                    fileTextContext += `\n[PDF: ${originalName}]\n${extractedText}\n`; 
                } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileExt === '.docx') { 
                    try { 
                        const result = await mammoth.extractRawText({ buffer: fileBuffer }); 
                        let text = result.value || ""; 
                        fileTextContext += `\n[WORD: ${originalName}]\n${text.substring(0, 5000)}\n`; 
                    } catch (e) { } 
                } else if (mime.includes('spreadsheet') || mime.includes('excel') || fileExt === '.xlsx' || fileExt === '.xls' || fileExt === '.csv') { 
                    try { 
                        const workbook = xlsx.read(fileBuffer, { type: 'buffer' }); 
                        let allSheetsText = ""; 
                        workbook.SheetNames.slice(0, 3).forEach(sheetName => { 
                            const csv = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName]); 
                            allSheetsText += `\n[SHEET: ${sheetName}]\n${csv.substring(0, 2000)}\n`; 
                        }); 
                        fileTextContext += `\n[EXCEL: ${originalName}]\n${allSheetsText}\n`; 
                    } catch (e) { } 
                } else if (codeExtensions.includes(fileExt) || mime.startsWith('text/') || mime === 'application/json' || mime === 'application/javascript' || mime === 'application/xml') { 
                    try { 
                        let rawText = fileBuffer.toString('utf-8'); 
                        fileTextContext += `\n[CODE/TEXT: ${originalName}]\n${rawText.substring(0, 10000)}\n`; 
                    } catch(e) { } 
                } 
                fs.unlink(file.path, () => {});
            }
        }
        if (fileTextContext) systemContext += `\n[ATTACHED FILES DATA]\n${fileTextContext}\n[END FILES]`;
        if (systemContext.trim().length > 0) message = `${systemContext}\n\nUSER REQUEST: ${message}`;
        const { data: convCheck } = await supabase.from('conversations').select('id').maybeSingle();
        if (!convCheck) await supabase.from('conversations').insert({ id: conversationId, user_id: userId, title: req.body.message.substring(0, 30) });
        else await supabase.from('conversations').update({ updated_at: new Date() }).eq('id', conversationId);
        await supabase.from('history_chat').insert({ user_id: userId, conversation_id: conversationId, role: 'user', message: req.body.message, file_metadata: fileMetadata });
        const { data: botMsg } = await supabase.from('history_chat').insert({ user_id: userId, conversation_id: conversationId, role: 'bot', message: '' }).select('id').single();
        if (botMsg) botMessageId = botMsg.id;
        const { data: historyData } = await supabase.from('history_chat').select('role, message').eq('conversation_id', conversationId).order('created_at', { ascending: true });
        const stream = await handleChatStream(message, geminiFiles, historyData, contextData);
        for await (const chunk of stream) {
            const text = chunk.text();
            fullResponse += text;
            res.write(`event: message\ndata: ${JSON.stringify({ chunk: text })}\n\n`);
        }
        isStreamCompleted = true;
        if (botMessageId) await supabase.from('history_chat').update({ message: fullResponse }).eq('id', botMessageId);
        res.write(`event: message\ndata: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
    } catch (error) {
        uploadedFiles.forEach(file => { if (file.path && fs.existsSync(file.path)) fs.unlink(file.path, () => {}); });
        if (botMessageId) {
            const busyMsg = "Sistem sedang sibuk.";
            await supabase.from('history_chat').update({ message: busyMsg }).eq('id', botMessageId);
            res.write(`event: message\ndata: ${JSON.stringify({ chunk: busyMsg })}\n\n`);
            res.write(`event: message\ndata: ${JSON.stringify({ done: true })}\n\n`);
        } else {
            res.write(`event: error\ndata: ${JSON.stringify({ error: "Terjadi kesalahan server." })}\n\n`);
        }
        res.end();
    }
});

module.exports = router;