const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const supabase = require('../config/supabase'); 
const { v4: uuidv4 } = require('uuid');
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

const upload = multer({ 
    storage: multer.diskStorage({
        destination: os.tmpdir(),
        filename: (req, file, cb) => cb(null, `${Date.now()}-${uuidv4()}-${file.originalname}`)
    }), 
    limits: { fileSize: 50 * 1024 * 1024 } 
});

const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: "Terlalu banyak percobaan." });

const uploadMiddleware = (req, res, next) => { 
    upload.array('file_attachment', 10)(req, res, function (err) { 
        if (err) return res.status(400).json({ success: false, message: "Upload Error: Maksimal 10 file diizinkan." }); 
        next(); 
    }); 
};

async function getFileTypeSafe(buffer) {
    try {
        const { fileTypeFromBuffer } = await import('file-type');
        const result = await fileTypeFromBuffer(buffer);
        return result;
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

        const maxPages = Math.min(pdf.numPages, 15); 
        for (let i = 1; i <= maxPages; i++) {
            try {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += `[PAGE ${i}]: ${pageText}\n`;
            } catch (pageErr) {
                fullText += `[PAGE ${i} ERROR]\n`;
            }
        }
        return fullText || "[PDF EMPTY/IMAGE ONLY]";
    } catch (error) {
        return "[PDF PARSE ERROR]";
    }
}

async function sendDiscordError(context, error) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;
    try {
        const errorMsg = error instanceof Error ? error.stack : String(error);
        await axios.post(webhookUrl, {
            username: "Dardcor System Monitor",
            embeds: [{
                title: `❌ Error: ${context}`,
                description: `\`\`\`js\n${errorMsg.substring(0, 4000)}\n\`\`\``,
                color: 16711680,
                timestamp: new Date().toISOString(),
                footer: { text: "Dardcor AI Server" }
            }]
        });
    } catch (e) { }
}

function getCookie(req, name) { 
    if (req.cookies && req.cookies[name]) return req.cookies[name]; 
    if (!req.headers.cookie) return null; 
    const value = `; ${req.headers.cookie}`; 
    const parts = value.split(`; ${name}=`); 
    if (parts.length === 2) return parts.pop().split(';').shift(); 
    return null; 
}

async function checkUserAuth(req, res, next) { 
    if (req.session && req.session.userAccount) return next(); 
    const userId = getCookie(req, 'dardcor_uid'); 
    if (userId) { 
        try { 
            const { data: user } = await supabase.from('dardcor_users').select('*').eq('id', userId).single(); 
            if (user) { 
                req.session.userAccount = user; 
                const tenYears = 1000 * 60 * 60 * 24 * 365 * 10; 
                req.session.cookie.expires = new Date(Date.now() + tenYears); 
                req.session.cookie.maxAge = tenYears; 
                return req.session.save(() => next()); 
            } 
        } catch (e) {
            sendDiscordError("Auth Middleware", e);
        } 
    } 
    if (req.xhr || req.headers.accept.indexOf('json') > -1) { 
        return res.status(401).json({ success: false, redirectUrl: '/dardcor' }); 
    } 
    res.redirect('/dardcor'); 
}

async function getYouTubeData(url) { 
    let videoId = null; 
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/; 
    const match = url.match(regExp); 
    if (match && match[2].length === 11) videoId = match[2]; 
    if (!videoId) return { success: false }; 
    let data = { title: '', description: '', transcript: '' }; 
    try { 
        const pageRes = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, { headers: { 'User-Agent': 'Mozilla/5.0' } }); 
        const $ = cheerio.load(pageRes.data); 
        data.title = $('meta[name="title"]').attr('content') || $('title').text(); 
        data.description = $('meta[name="description"]').attr('content') || ''; 
    } catch (e) {
        sendDiscordError(`YouTube Scraping (${url})`, e);
    } 
    try { 
        const transcriptObj = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'id' }).catch(() => YoutubeTranscript.fetchTranscript(videoId)); 
        if (transcriptObj && transcriptObj.length > 0) { 
            data.transcript = transcriptObj.map(t => t.text).join(' '); 
        } 
    } catch (e) { } 
    return { success: true, ...data }; 
}

async function getWebsiteContent(url) { 
    try { 
        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 20000 }); 
        const $ = cheerio.load(response.data); 
        $('script, style, nav, footer, header, svg, img, iframe, noscript').remove(); 
        return $('body').text().replace(/\s+/g, ' ').trim(); 
    } catch (e) { 
        sendDiscordError(`Website Scraping (${url})`, e);
        return null; 
    } 
}

async function searchWeb(query) { 
    try { 
        if (!query) return null; 
        const searchQuery = encodeURIComponent(query); 
        const res = await axios.get(`https://ddg-api.herokuapp.com/search?q=${searchQuery}&limit=5`, { timeout: 8000 }); 
        if (res.data && res.data.length > 0) { 
            return res.data.map(r => `- [${r.title}](${r.link}): ${r.snippet}`).join('\n'); 
        } 
        return null; 
    } catch (e) { 
        return null; 
    } 
}

router.get('/', (req, res) => { if ((req.session && req.session.userAccount) || getCookie(req, 'dardcor_uid')) return res.redirect('/dardcorchat/dardcor-ai'); res.render('index', { user: null }); });
router.get('/dardcor', (req, res) => { if ((req.session && req.session.userAccount) || getCookie(req, 'dardcor_uid')) return res.redirect('/dardcorchat/dardcor-ai'); res.render('dardcor', { error: null }); });
router.get('/register', (req, res) => { if ((req.session && req.session.userAccount) || getCookie(req, 'dardcor_uid')) return res.redirect('/dardcorchat/dardcor-ai'); res.render('register', { error: null }); });

router.post('/dardcor-login', authLimiter, async (req, res) => { 
    let { email, password } = req.body; 
    try { 
        const { data: user } = await supabase.from('dardcor_users').select('*').eq('email', email.trim().toLowerCase()).single(); 
        if (!user || !await bcrypt.compare(password, user.password)) return res.status(400).json({ success: false, message: 'Login gagal.' }); 
        req.session.userAccount = user; 
        const tenYears = 1000 * 60 * 60 * 24 * 365 * 10; 
        req.session.cookie.expires = new Date(Date.now() + tenYears); 
        req.session.cookie.maxAge = tenYears; 
        res.cookie('dardcor_uid', user.id, { maxAge: tenYears, httpOnly: true, secure: true, sameSite: 'lax' }); 
        req.session.save((err) => { 
            if (err) {
                sendDiscordError("Session Save Login", err);
                return res.status(500).json({ success: false }); 
            }
            res.status(200).json({ success: true, redirectUrl: '/dardcorchat/dardcor-ai' }); 
        }); 
    } catch (err) { 
        sendDiscordError("Login Route", err);
        res.status(500).json({ success: false }); 
    } 
});

router.get('/dardcor-logout', (req, res) => { 
    res.clearCookie('dardcor_uid'); 
    req.session.destroy(() => { 
        res.clearCookie('connect.sid'); 
        res.redirect('/dardcor'); 
    }); 
});

router.post('/register', authLimiter, async (req, res) => { 
    let { username, email, password } = req.body; email = email.trim().toLowerCase(); 
    try { 
        const { data: existingUser } = await supabase.from('dardcor_users').select('email').eq('email', email).single(); 
        if (existingUser) return res.status(400).json({ success: false, message: 'Email sudah terdaftar.' }); 
        await supabase.from('verification_codes').delete().eq('email', email); 
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
        const hashedPassword = await bcrypt.hash(password, 12); 
        await supabase.from('verification_codes').insert([{ username, email, password: hashedPassword, otp }]); 
        await transporter.sendMail({ from: '"Dardcor Security" <no-reply@dardcor.com>', to: email, subject: 'Kode Verifikasi', html: `<div><h2>OTP:</h2><h1>${otp}</h1></div>` }); 
        res.status(200).json({ success: true, email: email, redirectUrl: `/verify-otp?email=${encodeURIComponent(email)}` }); 
    } catch (err) { 
        sendDiscordError("Register Route", err);
        res.status(500).json({ success: false }); 
    } 
});

router.get('/verify-otp', (req, res) => { if ((req.session && req.session.userAccount) || getCookie(req, 'dardcor_uid')) return res.redirect('/dardcorchat/dardcor-ai'); res.render('verify', { email: req.query.email }); });
router.post('/verify-otp', async (req, res) => { 
    try { 
        const { data: record } = await supabase.from('verification_codes').select('*').eq('email', req.body.email).eq('otp', req.body.otp).single(); 
        if (!record) return res.status(400).json({ success: false }); 
        const { data: newUser } = await supabase.from('dardcor_users').insert([{ username: record.username, email: record.email, password: record.password }]).select().single(); 
        await supabase.from('verification_codes').delete().eq('email', req.body.email); 
        req.session.userAccount = newUser; 
        const tenYears = 1000 * 60 * 60 * 24 * 365 * 10; 
        req.session.cookie.expires = new Date(Date.now() + tenYears); 
        req.session.cookie.maxAge = tenYears; 
        res.cookie('dardcor_uid', newUser.id, { maxAge: tenYears, httpOnly: true, secure: true, sameSite: 'lax' }); 
        req.session.save(() => { res.status(200).json({ success: true, redirectUrl: '/dardcorchat/dardcor-ai' }); }); 
    } catch (err) { 
        sendDiscordError("Verify OTP", err);
        res.status(500).json({ success: false }); 
    } 
});

router.get('/dardcorchat/profile', checkUserAuth, (req, res) => { res.render('dardcorchat/profile', { user: req.session.userAccount, success: null, error: null }); });
router.post('/dardcor/profile/update', checkUserAuth, upload.single('profile_image'), async (req, res) => { 
    const userId = req.session.userAccount.id; 
    let updates = { username: req.body.username }; 
    try { 
        if (req.body.password && req.body.password.trim() !== "") { 
            if (req.body.password !== req.body.confirm_password) return res.render('dardcorchat/profile', { user: req.session.userAccount, error: "Password beda.", success: null }); 
            updates.password = await bcrypt.hash(req.body.password.trim(), 12); 
        } 
        if (req.file) { 
            const fileBuffer = fs.readFileSync(req.file.path);
            const fileName = `${userId}-${Date.now()}.${req.file.originalname.split('.').pop()}`; 
            await supabase.storage.from('avatars').upload(fileName, fileBuffer, { contentType: req.file.mimetype, upsert: true }); 
            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName); 
            updates.profile_image = data.publicUrl; 
            fs.unlink(req.file.path, () => {});
        } 
        const { data } = await supabase.from('dardcor_users').update(updates).eq('id', userId).select().single(); 
        req.session.userAccount = data; 
        req.session.save(() => { res.render('dardcorchat/profile', { user: data, success: "Sukses!", error: null }); }); 
    } catch (err) { 
        sendDiscordError("Profile Update", err);
        if (req.file && req.file.path) fs.unlink(req.file.path, () => {});
        res.render('dardcorchat/profile', { user: req.session.userAccount, error: err.message, success: null }); 
    } 
});

router.get('/dardcorchat/dardcor-ai', checkUserAuth, (req, res) => { res.redirect(`/dardcorchat/dardcor-ai/${uuidv4()}`); });
router.get('/dardcorchat/dardcor-ai/:conversationId', checkUserAuth, async (req, res) => { 
    const userId = req.session.userAccount.id; 
    const requestedId = req.params.conversationId; 
    try { 
        const { data: conversationList } = await supabase.from('conversations').select('*').eq('user_id', userId).order('updated_at', { ascending: false }); 
        let activeId = requestedId; 
        if (!activeId || activeId.length < 10) { 
            activeId = uuidv4(); 
            return res.redirect(`/dardcorchat/dardcor-ai/${activeId}`); 
        } 
        const { data: activeChatHistory } = await supabase.from('history_chat').select('*').eq('conversation_id', activeId).order('created_at', { ascending: true }); 
        req.session.currentConversationId = activeId; 
        res.render('dardcorchat/layout', { user: req.session.userAccount, chatHistory: activeChatHistory || [], conversationList: conversationList || [], activeConversationId: activeId, contentPage: 'dardcorai' }); 
    } catch (err) { 
        sendDiscordError("Load Chat UI", err);
        res.redirect('/dardcor'); 
    } 
});

router.get('/api/chat/:conversationId', checkUserAuth, async (req, res) => { 
    const userId = req.session.userAccount.id; 
    try { 
        const { data: history } = await supabase.from('history_chat').select('*').eq('conversation_id', req.params.conversationId).eq('user_id', userId).order('created_at', { ascending: true }); 

        if (history && history.length > 0) {
            await Promise.all(history.map(async (msg) => {
                if (msg.file_metadata && Array.isArray(msg.file_metadata)) {
                    const updatedFiles = await Promise.all(msg.file_metadata.map(async (file) => {
                        if (file.storage_path) {
                            try {
                                const { data: signedData } = await supabase
                                    .storage
                                    .from('chat-attachments')
                                    .createSignedUrl(file.storage_path, 3600);
                                
                                if (signedData && signedData.signedUrl) {
                                    file.url = signedData.signedUrl;
                                    file.path = signedData.signedUrl; 
                                    return file;
                                }
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
    } catch (err) { 
        sendDiscordError("API Chat History", err);
        res.status(500).json({ success: false }); 
    } 
});

router.post('/dardcorchat/ai/new-chat', checkUserAuth, (req, res) => { req.session.currentConversationId = null; req.session.save(() => { res.json({ success: true, redirectUrl: `/dardcorchat/dardcor-ai/${uuidv4()}` }); }); });
router.post('/dardcorchat/ai/rename-chat', checkUserAuth, async (req, res) => { try { await supabase.from('conversations').update({ title: req.body.newTitle }).eq('id', req.body.conversationId).eq('user_id', req.session.userAccount.id); res.json({ success: true }); } catch (error) { sendDiscordError("Rename Chat", error); res.status(500).json({ success: false }); } });
router.post('/dardcorchat/ai/delete-chat-history', checkUserAuth, async (req, res) => { try { await supabase.from('conversations').delete().eq('id', req.body.conversationId).eq('user_id', req.session.userAccount.id); res.json({ success: true }); } catch (error) { sendDiscordError("Delete Chat", error); res.status(500).json({ success: false }); } });

router.get('/api/project/files', checkUserAuth, async (req, res) => {
    try {
        const { data } = await supabase.from('project_files').select('*').eq('user_id', req.session.userAccount.id);
        res.json({ success: true, files: data || [] });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

router.post('/api/project/save', checkUserAuth, async (req, res) => {
    try {
        const { name, path, content, language, is_folder } = req.body;
        const { error } = await supabase.from('project_files').upsert({
            user_id: req.session.userAccount.id,
            name,
            path: path || 'root',
            content,
            language,
            is_folder
        }, { onConflict: 'user_id, path, name' });
        
        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

router.post('/api/project/delete', checkUserAuth, async (req, res) => {
    try {
        const { name, path } = req.body;
        await supabase.from('project_files').delete().match({ user_id: req.session.userAccount.id, name, path });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

router.post('/dardcorchat/ai/store-preview', checkUserAuth, async (req, res) => { 
    const previewId = uuidv4(); 
    try { await supabase.from('previews_website').insert({ id: previewId, user_id: req.session.userAccount.id, code: req.body.code, type: req.body.type || 'website' }); res.json({ success: true, previewId }); } catch (error) { sendDiscordError("Store Preview", error); res.status(500).json({ success: false }); } 
});
router.get('/dardcorchat/dardcor-ai/preview/:id', checkUserAuth, async (req, res) => { try { const { data } = await supabase.from('previews_website').select('code').eq('id', req.params.id).single(); if (!data) return res.status(404).send('Not Found'); res.setHeader('Content-Type', 'text/html'); res.send(data.code); } catch (err) { sendDiscordError("View Preview", err); res.status(500).send("Error"); } });
router.get('/dardcorchat/dardcor-ai/diagram/:id', checkUserAuth, async (req, res) => { try { const { data } = await supabase.from('previews_website').select('code').eq('id', req.params.id).single(); if (!data) return res.status(404).send('Not Found'); const codeBase64 = Buffer.from(data.code).toString('base64'); res.render('dardcorchat/diagram', { code: codeBase64 }); } catch (err) { sendDiscordError("View Diagram", err); res.status(500).send("Error"); } });

router.post('/dardcorchat/ai/chat-stream', checkUserAuth, uploadMiddleware, async (req, res) => {
    req.socket.setTimeout(0); 
    req.setTimeout(0); 

    const userId = req.session.userAccount.id;
    let message = req.body.message ? req.body.message.trim() : "";
    const uploadedFiles = req.files || [];
    let conversationId = req.body.conversationId || uuidv4();
    const useWebSearch = req.body.useWebSearch === 'true';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let botMessageId = null;
    let fullResponse = "";
    let isStreamCompleted = false;

    req.on('close', async () => {
        if (!isStreamCompleted && botMessageId && fullResponse) {
             try {
                await supabase.from('history_chat').update({ message: fullResponse }).eq('id', botMessageId);
             } catch(e) {}
        }
        uploadedFiles.forEach(file => {
            if (file.path) fs.unlink(file.path, () => {});
        });
    });

    try {
        const contextData = { vaultContent: '', memories: '', searchResults: '', globalHistory: '' };
        
        let systemContext = "";

        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = message.match(urlRegex);
        if (urls && urls.length > 0) {
            for (const url of urls) {
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
                const originalName = file.originalname;
                const fileExt = path.extname(originalName).toLowerCase();
                const fileNamePath = `${userId}/${Date.now()}-${uuidv4()}${fileExt}`;
                
                const meta = { 
                    filename: originalName, 
                    size: file.size, 
                    mimetype: mime, 
                    path: null, 
                    url: null,
                    storage_path: fileNamePath 
                };

                try {
                    const { error: uploadError } = await supabase.storage
                        .from('chat-attachments')
                        .upload(fileNamePath, fileBuffer, { contentType: mime, upsert: false });

                    if (!uploadError) {
                        const { data: signedData } = await supabase.storage.from('chat-attachments').createSignedUrl(fileNamePath, 3600);
                        if (signedData && signedData.signedUrl) {
                            meta.path = signedData.signedUrl; 
                            meta.url = signedData.signedUrl;
                        }
                    }
                } catch (err) { }

                fileMetadata.push(meta);

                const codeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.cs', '.php', '.ejs', '.html', '.css', '.json', '.xml', '.sql', '.md', '.txt', '.env', '.yml', '.yaml', '.ini', '.log', '.sh', '.bat', '.ps1', '.vb', '.config', '.gitignore', '.rb', '.go', '.rs', '.swift', '.kt', '.lua', '.pl', '.r', '.dart'];

                if (mime.startsWith('image/') || mime === 'application/pdf' || mime.startsWith('video/') || mime.startsWith('audio/')) {
                    const fileForGemini = {
                        ...file,
                        buffer: fileBuffer 
                    };
                    geminiFiles.push(fileForGemini); 
                }

                if (mime.startsWith('image/')) {
                    fileTextContext += `\n[IMAGE ATTACHED: ${originalName}]\n`;
                } 
                else if (mime === 'application/pdf') {
                    let extractedText = await parsePdfSafe(fileBuffer);
                    if (extractedText && extractedText.length > 50000) extractedText = extractedText.substring(0, 50000) + "\n...[TRUNCATED]";
                    extractedText = extractedText.replace(/[\x00-\x09\x0b\x0c\x0e-\x1f\x7f]/g, '');
                    fileTextContext += `\n[PDF: ${originalName}]\n${extractedText}\n`;
                } 
                else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileExt === '.docx') {
                    try { 
                        const result = await mammoth.extractRawText({ buffer: fileBuffer }); 
                        let text = result.value || "";
                        if (text.length > 50000) text = text.substring(0, 50000) + "\n...[TRUNCATED]";
                        text = text.replace(/[\x00-\x09\x0b\x0c\x0e-\x1f\x7f]/g, '');
                        fileTextContext += `\n[WORD: ${originalName}]\n${text}\n`; 
                    } catch (e) { }
                } 
                else if (mime.includes('spreadsheet') || mime.includes('excel') || fileExt === '.xlsx' || fileExt === '.xls' || fileExt === '.csv') {
                    try { 
                        const workbook = xlsx.read(fileBuffer, { type: 'buffer' }); 
                        let allSheetsText = "";
                        workbook.SheetNames.forEach(sheetName => {
                            const csv = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName]);
                            allSheetsText += `\n[SHEET: ${sheetName}]\n${csv}\n`;
                        });
                        if (allSheetsText.length > 50000) allSheetsText = allSheetsText.substring(0, 50000) + "\n...[TRUNCATED]";
                        fileTextContext += `\n[EXCEL: ${originalName}]\n${allSheetsText}\n`; 
                    } catch (e) { }
                }
                else if (codeExtensions.includes(fileExt) || mime.startsWith('text/') || mime === 'application/json' || mime === 'application/javascript' || mime === 'application/xml') {
                    try {
                        let rawText = fileBuffer.toString('utf-8');
                        if (rawText.length > 50000) rawText = rawText.substring(0, 50000) + "\n...[TRUNCATED]";
                        fileTextContext += `\n[CODE/TEXT: ${originalName}]\n${rawText}\n`;
                    } catch(e) { }
                } 
                
                fs.unlink(file.path, () => {});
            }
        }

        if (fileTextContext) {
            systemContext += `\n[ATTACHED FILES DATA]\n${fileTextContext}\n[END FILES]`;
        }

        if (systemContext.trim().length > 0) {
            message = `${systemContext}\n\nUSER REQUEST: ${message}`;
        }

        const { data: convCheck } = await supabase.from('conversations').select('id').eq('id', conversationId).single();
        if (!convCheck) await supabase.from('conversations').insert({ id: conversationId, user_id: userId, title: req.body.message.substring(0, 30) });
        else await supabase.from('conversations').update({ updated_at: new Date() }).eq('id', conversationId);

        await supabase.from('history_chat').insert({ 
            user_id: userId, 
            conversation_id: conversationId, 
            role: 'user', 
            message: req.body.message, 
            file_metadata: fileMetadata 
        });

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
        sendDiscordError(`Chat Stream Error (User: ${userId})`, error);
        
        uploadedFiles.forEach(file => {
            if (file.path && fs.existsSync(file.path)) fs.unlink(file.path, () => {});
        });

        if (botMessageId) {
            const busyMsg = "Dardcor AI sedang sibuk.";
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