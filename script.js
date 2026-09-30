let messages = JSON.parse(localStorage.getItem('roomgather_messages')) || [];
let nextId = messages.length > 0 ? Math.max(...messages.map(m => m.id)) + 1 : 1;
let currentSearchTerm = '';

// ---------- Settings ----------
let settings = JSON.parse(localStorage.getItem('roomgather_settings')) || {
    fontSize: 15
};

function saveSettings() {
    localStorage.setItem('roomgather_settings', JSON.stringify(settings));
}

function applyFontSize() {
    document.querySelectorAll('.message').forEach(msg => {
        msg.style.fontSize = settings.fontSize + 'px';
    });
}

document.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; });
// FIX: Allow selection inside inputs and textareas
document.addEventListener('selectstart', (e) => {
    if (e.target.closest('input, textarea')) return;
    e.preventDefault();
});

function saveMessages() {
    localStorage.setItem('roomgather_messages', JSON.stringify(messages));
}

function getCurrentFullTimestamp() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return { fullDate: now.toISOString(), time: `${hours}:${minutes}` };
}

function formatMessageDate(fullDate, time) {
    const msgDate = new Date(fullDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const msgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
    if (msgDay.getTime() === today.getTime()) return time;
    if (msgDay.getTime() === yesterday.getTime()) return `Yesterday, ${time}`;
    if (msgDate.getFullYear() === now.getFullYear()) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${months[msgDate.getMonth()]} ${msgDate.getDate()}, ${time}`;
    }
    return `${msgDate.getMonth()+1}/${msgDate.getDate()}/${msgDate.getFullYear()}, ${time}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function applyFormatting(text) {
    // 1. Protect underscores inside emoji shortcodes (:slight_smile: → :slight\uE000smile:)
    const protectedText = text.replace(/:([a-zA-Z0-9_]+):/g, (match) =>
        match.replace(/_/g, '\uE000')
    );
    
    let result = protectedText;
    // 2. Bold first (so ** isn't eaten by italic *)
    result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // 3. Underline
    result = result.replace(/_(.*?)_/g, '<u>$1</u>');
    // 4. Strikethrough
    result = result.replace(/~(.*?)~/g, '<del>$1</del>');
    // 5. Italic last
    result = result.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 6. Restore underscores
    result = result.replace(/\uE000/g, '_');
    return result;
}

function normalizeEmojiShortcodes(text) {
    const map = {
        '🙂': ':slight_smile:',
        '☺️': ':relaxed:',
        '☹️': ':frowning:',
        '💀': ':skull:',
        '☠️': ':crossbones:',
        '✌️': ':v:',
        '☝️': ':index_up:',
        '✍️': ':writing:',
        '☀️': ':sun:',
        '☁️': ':cloud:',
        '☂️': ':umbrella:',
        '❄️': ':snowflake:',
        '☃️': ':snowman_winter:',
        '⛄️': ':snowman:',
        '☄️': ':comet:',
        '♠️': ':spade_card:',
        '♥️': ':heart_card:',
        '♦️': ':diamond_card:',
        '♣️': ':club_card:',
        '♟️': ':chess:',
        '♨️': ':hotsprings:',
        '✈️': ':airplane:',
        '☎️': ':telephone:',
        '⌨️': ':keyboard:',
        '✉️': ':mail:',
        '✏️': ':pencil:',
        '✒️': ':nib:',
        '✂️': ':scissors:',
        '⌛️': ':hourglass:',
        '⏳️': ':waiting:',
        '⌚️': ':watch:',
        '❣️': ':heart_exclamation:',
        '❤️': ':heart:'
    };
    let result = text;
    for (const [unicode, shortcode] of Object.entries(map)) {
        result = result.replaceAll(unicode, shortcode);
    }
    return result;
}

// ---------- Custom emoji rendering ----------
let renderCustomEmojis = (text) => text;

// ---------- Reply state ----------
let pendingReply = null;

function showReplyIndicator(replyToId, replyToText) {
    const indicator = document.getElementById('replyIndicator');
    const previewSpan = document.getElementById('replyPreviewText');
    if (indicator && previewSpan) {
        const shortText = replyToText.length > 50 ? replyToText.substring(0, 47) + '...' : replyToText;
        const escapedText = escapeHtml(shortText);
        const formattedText = applyFormatting(escapedText);
        const renderedText = renderCustomEmojis(formattedText);
        previewSpan.innerHTML = renderedText;
        indicator.style.display = 'flex';
        pendingReply = { id: replyToId, text: normalizeEmojiShortcodes(replyToText) };
        const input = document.getElementById('messageInput');
        if (input) input.focus();
    }
}

function cancelReply() {
    const indicator = document.getElementById('replyIndicator');
    if (indicator) indicator.style.display = 'none';
    pendingReply = null;
}

document.getElementById('cancelReplyBtn')?.addEventListener('click', cancelReply);

function displayMessages() {
    const container = document.getElementById('messages');
    container.innerHTML = '';
    let filtered = messages;
    if (currentSearchTerm.trim()) {
        const term = currentSearchTerm.trim().toLowerCase();
        filtered = messages.filter(m => m.text.toLowerCase().includes(term));
    }
    filtered.forEach(msg => {
        const div = document.createElement('div');
        div.className = 'message';
        div.setAttribute('data-id', msg.id);
        const editedMark = msg.edited ? ' <span class="edited-mark">(edited)</span>' : '';
        const escapedText = escapeHtml(msg.text);
        const formattedText = applyFormatting(escapedText);
        const renderedText = renderCustomEmojis(formattedText);
        let innerHtml = '';
        if (msg.replyTo) {
            const originalMsg = messages.find(m => m.id === msg.replyTo.id);
            const replyText = originalMsg ? originalMsg.text : msg.replyTo.text;
            const escapedReply = escapeHtml(replyText);
            const formattedReply = applyFormatting(escapedReply);
            const renderedReply = renderCustomEmojis(formattedReply);
            innerHtml = `
                <div class="message-reply-preview">Replying to: ${renderedReply}</div>
                <div class="message-main-row">
                    <span class="username-label">User:</span>
                    <span class="msg-text-body">${renderedText}${editedMark}</span>
                    <span class="timestamp">${formatMessageDate(msg.fullDate, msg.time)}</span>
                </div>
            `;
        } else {
            innerHtml = `
                <div class="message-main-row">
                    <span class="username-label">User:</span>
                    <span class="msg-text-body">${renderedText}${editedMark}</span>
                    <span class="timestamp">${formatMessageDate(msg.fullDate, msg.time)}</span>
                </div>
            `;
        }
        div.innerHTML = innerHtml;
        container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
    attachLongPress();
    attachScrollCancel();
    applyFontSize();
}

function updateCharCounter() {
    const input = document.getElementById('messageInput');
    const counter = document.getElementById('charCounter');
    if (input && counter) {
        const len = input.value.length;
        counter.textContent = len;
        counter.classList.toggle('visible', len > 0);
    }
}

// ---------- search ----------
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const searchIconBtn = document.getElementById('searchIconBtn');
    const mainHeader = document.getElementById('mainHeader');
    const searchHeader = document.getElementById('searchHeader');

    if (searchIconBtn) {
        searchIconBtn.addEventListener('click', () => {
            mainHeader.style.display = 'none';
            searchHeader.style.display = 'flex';
            // Force focus to the search input
            setTimeout(() => {
                if (searchInput) {
                    searchInput.focus();
                }
            }, 50);
        });
    }
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchTerm = e.target.value;
            displayMessages();
        });
    }
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) { searchInput.value = ''; currentSearchTerm = ''; displayMessages(); }
            searchHeader.style.display = 'none';
            mainHeader.style.display = 'flex';
        });
    }
}

// ---------- Custom emoji picker ----------
const customEmojis = [
    { id: 'rg_slight_smile', shortcode: 'slight_smile', name: 'Slightly Smiling Face', category: '😊' },
    { id: 'rg_relaxed', shortcode: 'relaxed', name: 'Smiling Face', category: '😊' },
    { id: 'rg_frowning', shortcode: 'frowning', name: 'Frowning Face', category: '😊' },
    { id: 'rg_skull', shortcode: 'skull', name: 'Skull', category: '😊' },
    { id: 'rg_crossbones', shortcode: 'crossbones', name: 'Skull and Crossbones', category: '😊' },
    { id: 'rg_victory', shortcode: 'v', name: 'Victory Hand', category: '🚶' },
    { id: 'rg_index_up', shortcode: 'index_up', name: 'Index Pointing Up', category: '🚶' },
    { id: 'rg_writing', shortcode: 'writing', name: 'Writing Hand', category: '🚶' },
    { id: 'rg_sun', shortcode: 'sun', name: 'Sun', category: '🐶' },
    { id: 'rg_cloud', shortcode: 'cloud', name: 'Cloud', category: '🐶' },
    { id: 'rg_umbrella', shortcode: 'umbrella', name: 'Umbrella', category: '🐶' },
    { id: 'rg_snowflake', shortcode: 'snowflake', name: 'Snowflake', category: '🐶' },
    { id: 'rg_snowman_winter', shortcode: 'snowman_winter', name: 'Snowman', category: '🐶' },
    { id: 'rg_snowman', shortcode: 'snowman', name: 'Snowman Without Snow', category: '🐶' },
    { id: 'rg_comet', shortcode: 'comet', name: 'Comet', category: '🐶' },
    { id: 'rg_spade', shortcode: 'spade_card', name: 'Spade Suit', category: '⚽' },
    { id: 'rg_heart_suit', shortcode: 'heart_card', name: 'Heart Suit', category: '⚽' },
    { id: 'rg_diamond', shortcode: 'diamond_card', name: 'Diamond Suit', category: '⚽' },
    { id: 'rg_club', shortcode: 'club_card', name: 'Club Suit', category: '⚽' },
    { id: 'rg_chess_pawn', shortcode: 'chess', name: 'Chess Pawn', category: '⚽' },
    { id: 'rg_hotsprings', shortcode: 'hotsprings', name: 'Hot Springs', category: '🚗' },
    { id: 'rg_airplane', shortcode: 'airplane', name: 'Airplane', category: '🚗' },
    { id: 'rg_telephone', shortcode: 'telephone', name: 'Telephone', category: '💡' },
    { id: 'rg_keyboard', shortcode: 'keyboard', name: 'Keyboard', category: '💡' },
    { id: 'rg_mail', shortcode: 'mail', name: 'Envelope', category: '💡' },
    { id: 'rg_pencil', shortcode: 'pencil', name: 'Pencil', category: '💡' },
    { id: 'rg_nib', shortcode: 'nib', name: 'Black Nib', category: '💡' },
    { id: 'rg_scissors', shortcode: 'scissors', name: 'Scissors', category: '💡' },
    { id: 'rg_hourglass', shortcode: 'hourglass', name: 'Hourglass Done', category: '💡' },
    { id: 'rg_waiting', shortcode: 'waiting', name: 'Hourglass Not Done', category: '💡' },
    { id: 'rg_watch', shortcode: 'watch', name: 'Watch', category: '💡' },
    { id: 'rg_heart_exclamation', shortcode: 'heart_exclamation', name: 'Heart Exclamation', category: '❤️' },
    { id: 'rg_heart', shortcode: 'heart', name: 'Red Heart', category: '❤️' },
    { id: 'rg_black_square', shortcode: 'black_square', name: 'Black Large Square', category: '❤️' },
    { id: 'rg_white_square', shortcode: 'white_square', name: 'White Large Square', category: '❤️' },
    { id: 'rg_black_medium', shortcode: 'black_medium', name: 'Black Medium Square', category: '❤️' },
    { id: 'rg_white_medium', shortcode: 'white_medium', name: 'White Medium Square', category: '❤️' },
    { id: 'rg_black_small', shortcode: 'black_small', name: 'Black Medium-Small Square', category: '❤️' },
    { id: 'rg_white_small', shortcode: 'white_small', name: 'White Medium-Small Square', category: '❤️' },
    { id: 'rg_black_tiny', shortcode: 'black_tiny', name: 'Black Small Square', category: '❤️' },
    { id: 'rg_white_tiny', shortcode: 'white_tiny', name: 'White Small Square', category: '❤️' },
    { id: 'rg_radioactive', shortcode: 'radioactive', name: 'Radioactive', category: '❤️' },
    { id: 'rg_biohazard', shortcode: 'biohazard', name: 'Biohazard', category: '❤️' },
    { id: 'rg_up', shortcode: 'up', name: 'Up Arrow', category: '❤️' },
    { id: 'rg_upright', shortcode: 'upright', name: 'Up-Right Arrow', category: '❤️' },
    { id: 'rg_right', shortcode: 'right', name: 'Right Arrow', category: '❤️' },
    { id: 'rg_downright', shortcode: 'downright', name: 'Down-Right Arrow', category: '❤️' },
    { id: 'rg_down', shortcode: 'down', name: 'Down Arrow', category: '❤️' },
    { id: 'rg_downleft', shortcode: 'downleft', name: 'Down-Left Arrow', category: '❤️' },
    { id: 'rg_left', shortcode: 'left', name: 'Left Arrow', category: '❤️' },
    { id: 'rg_upleft', shortcode: 'upleft', name: 'Up-Left Arrow', category: '❤️' },
    { id: 'rg_updown', shortcode: 'updown', name: 'Up-Down Arrow', category: '❤️' },
    { id: 'rg_leftright', shortcode: 'leftright', name: 'Left-Right Arrow', category: '❤️' },
    { id: 'rg_undo', shortcode: 'undo', name: 'Right Arrow Curving Left', category: '❤️' },
    { id: 'rg_redo', shortcode: 'redo', name: 'Left Arrow Curving Right', category: '❤️' },
    { id: 'rg_play', shortcode: 'play', name: 'Play Button', category: '❤️' },
    { id: 'rg_rewind', shortcode: 'rewind', name: 'Reverse Button', category: '❤️' },
    { id: 'rg_star_david', shortcode: 'star_david', name: 'Star of David', category: '❤️' },
    { id: 'rg_dharma', shortcode: 'dharma', name: 'Wheel of Dharma', category: '❤️' },
    { id: 'rg_yinyang', shortcode: 'yinyang', name: 'Yin Yang', category: '❤️' },
    { id: 'rg_cross', shortcode: 'cross', name: 'Latin Cross', category: '❤️' },
    { id: 'rg_orthodox', shortcode: 'orthodox', name: 'Orthodox Cross', category: '❤️' },
    { id: 'rg_islam', shortcode: 'islam', name: 'Star and Crescent', category: '❤️' },
    { id: 'rg_peace', shortcode: 'peace', name: 'Peace Symbol', category: '❤️' },
    { id: 'rg_aries', shortcode: 'aries', name: 'Aries', category: '❤️' },
    { id: 'rg_taurus', shortcode: 'taurus', name: 'Taurus', category: '❤️' },
    { id: 'rg_gemini', shortcode: 'gemini', name: 'Gemini', category: '❤️' },
    { id: 'rg_cancer', shortcode: 'cancer', name: 'Cancer', category: '❤️' },
    { id: 'rg_leo', shortcode: 'leo', name: 'Leo', category: '❤️' },
    { id: 'rg_virgo', shortcode: 'virgo', name: 'Virgo', category: '❤️' },
    { id: 'rg_libra', shortcode: 'libra', name: 'Libra', category: '❤️' },
    { id: 'rg_scorpio', shortcode: 'scorpio', name: 'Scorpio', category: '❤️' },
    { id: 'rg_sagittarius', shortcode: 'sagittarius', name: 'Sagittarius', category: '❤️' },
    { id: 'rg_capricorn', shortcode: 'capricorn', name: 'Capricorn', category: '❤️' },
    { id: 'rg_aquarius', shortcode: 'aquarius', name: 'Aquarius', category: '❤️' },
    { id: 'rg_pisces', shortcode: 'pisces', name: 'Pisces', category: '❤️' },
    { id: 'rg_ophiuchus', shortcode: 'ophiuchus', name: 'Ophiuchus', category: '❤️' },
    { id: 'rg_female', shortcode: 'female', name: 'Female Sign', category: '❤️' },
    { id: 'rg_male', shortcode: 'male', name: 'Male Sign', category: '❤️' },
    { id: 'rg_multiply', shortcode: 'multiply', name: 'Multiply', category: '❤️' },
    { id: 'rg_urgent', shortcode: 'urgent', name: 'Double Exclamation Mark', category: '❤️' },
    { id: 'rg_doubt', shortcode: 'doubt', name: 'Exclamation Question Mark', category: '❤️' },
    { id: 'rg_sinewave', shortcode: 'sinewave', name: 'Wavy Dash', category: '❤️' },
    { id: 'rg_hash', shortcode: 'hash', name: 'Keycap Number Sign', category: '❤️' },
    { id: 'rg_asterisk', shortcode: 'asterisk', name: 'Keycap Asterisk', category: '❤️' },
    { id: 'rg_one', shortcode: 'one', name: 'Keycap Digit One', category: '❤️' },
    { id: 'rg_two', shortcode: 'two', name: 'Keycap Digit Two', category: '❤️' },
    { id: 'rg_three', shortcode: 'three', name: 'Keycap Digit Three', category: '❤️' },
    { id: 'rg_four', shortcode: 'four', name: 'Keycap Digit Four', category: '❤️' },
    { id: 'rg_five', shortcode: 'five', name: 'Keycap Digit Five', category: '❤️' },
    { id: 'rg_six', shortcode: 'six', name: 'Keycap Digit Six', category: '❤️' },
    { id: 'rg_seven', shortcode: 'seven', name: 'Keycap Digit Seven', category: '❤️' },
    { id: 'rg_eight', shortcode: 'eight', name: 'Keycap Digit Eight', category: '❤️' },
    { id: 'rg_nine', shortcode: 'nine', name: 'Keycap Digit Nine', category: '❤️' },
    { id: 'rg_info', shortcode: 'info', name: 'Information', category: '❤️' },
    { id: 'rg_circled_m', shortcode: 'm_button', name: 'Circled M', category: '❤️' },
    { id: 'rg_congratulations', shortcode: 'congratulations', name: 'Japanese “Congratulations” Button', category: '❤️' },
    { id: 'rg_secret', shortcode: 'secret', name: 'Japanese “Secret” Button', category: '❤️' },
    { id: 'rg_check', shortcode: 'check', name: 'Check Mark Button', category: '❤️' },
    { id: 'rg_checkbox', shortcode: 'checkbox', name: 'Check Box with Check', category: '❤️' },
    { id: 'rg_checkmark', shortcode: 'checkmark', name: 'Check Mark', category: '❤️' },
    { id: 'rg_required', shortcode: 'required', name: 'Eight-Spoked Asterisk', category: '❤️' },
    { id: 'rg_focus', shortcode: 'focus', name: 'Eight-Pointed Star', category: '❤️' },
    { id: 'rg_active', shortcode: 'active', name: 'Sparkle', category: '❤️' },
    { id: 'rg_copyright', shortcode: 'copyright', name: 'Copyright', category: '❤️' },
    { id: 'rg_registered', shortcode: 'registered', name: 'Registered', category: '❤️' },
    { id: 'rg_trademark', shortcode: 'trademark', name: 'Trade Mark', category: '❤️' },
];

const emojiData = { '🕒': [] };
customEmojis.forEach(emoji => {
    if (!emojiData[emoji.category]) emojiData[emoji.category] = [];
    emojiData[emoji.category].push(emoji.id);
});

const categoryTitles = {
    '🕒': 'Recent',
    '😊': 'Smileys',
    '🚶': 'People',
    '🐶': 'Animals & Nature',
    '⚽': 'Activity',
    '🚗': 'Travel & Places',
    '💡': 'Objects',
    '❤️': 'Symbols',
};

const categoryIcons = ['🕒', '😊', '🚶', '🐶', '⚽', '🚗', '💡', '❤️'];

const customEmojiMeta = {};
customEmojis.forEach(e => { customEmojiMeta[e.id] = { shortcode: e.shortcode, name: e.name }; });

const shortcodeToId = {};
customEmojis.forEach(e => { shortcodeToId[e.shortcode] = e.id; });

renderCustomEmojis = function(text) {
    const shortcodes = customEmojis.map(e => e.shortcode).join('|');
    const shortcodeRegex = new RegExp(`:(${shortcodes}):`, 'g');
    let result = text.replace(shortcodeRegex, (match, shortcode) => {
        const id = shortcodeToId[shortcode];
        if (id) {
            return `<img src="emojis/${id}.png" class="inline-emoji" alt="${customEmojiMeta[id].name}" title="${customEmojiMeta[id].name}">`;
        }
        return match;
    });
    const unicodeMap = {
        '🙂': 'slight_smile',
        '☺️': 'relaxed',
        '☹️': 'frowning',
        '💀': 'skull',
        '☠️': 'crossbones',
        '✌️': 'v',
        '☝️': 'index_up',
        '✍️': 'writing',
        '☀️': 'sun',
        '☁️': 'cloud',
        '☂️': 'umbrella',
        '❄️': 'snowflake',
        '☃️': 'snowman_winter',
        '⛄️': 'snowman',
        '☄️': 'comet',
        '♠️': 'spade_card',
        '♥️': 'heart_card',
        '♦️': 'diamond_card',
        '♣️': 'club_card',
        '♟️': 'chess',
        '♨️': 'hotsprings',
        '✈️': 'airplane',
        '☎️': 'telephone',
        '⌨️': 'keyboard',
        '✉️': 'mail',
        '✏️': 'pencil',
        '✒️': 'nib',
        '✂️': 'scissors',
        '⌛️': 'hourglass',
        '⏳️': 'waiting',
        '⌚️': 'watch',
        '❣️': 'heart_exclamation',
        '❤️': 'heart',
        '⬛': 'black_square',
        '⬜': 'white_square',
        '◼️': 'black_medium',
        '◻️': 'white_medium',
        '◾️': 'black_small',
        '◽️': 'white_small',
        '▪️': 'black_tiny',
        '▫️': 'white_tiny',
        '☢️': 'radioactive',
        '☣️': 'biohazard',
        '⬆️': 'up',
        '↗️': 'upright',
        '➡️': 'right',
        '↘️': 'downright',
        '⬇️': 'down',
        '↙️': 'downleft',
        '⬅️': 'left',
        '↖️': 'upleft',
        '↕️': 'updown',
        '↔️': 'leftright',
        '↩️': 'undo',
        '↪️': 'redo',
        '▶️': 'play',
        '◀️': 'rewind',
        '✡️': 'star_david',
        '☸️': 'dharma',
        '☯️': 'yinyang',
        '✝️': 'cross',
        '☦️': 'orthodox',
        '☪️': 'islam',
        '☮️': 'peace',
        '♈️': 'aries',
        '♉️': 'taurus',
        '♊️': 'gemini',
        '♋️': 'cancer',
        '♌️': 'leo',
        '♍️': 'virgo',
        '♎️': 'libra',
        '♏️': 'scorpio',
        '♐️': 'sagittarius',
        '♑️': 'capricorn',
        '♒️': 'aquarius',
        '♓️': 'pisces',
        '⛎': 'ophiuchus',
        '♀️': 'female',
        '♂️': 'male',
        '✖️': 'multiply',
        '‼️': 'urgent',
        '⁉️': 'doubt',
        '〰️': 'sinewave',
        '#️⃣': 'hash',
        '*️⃣': 'asterisk',
        '1️⃣': 'one',
        '2️⃣': 'two',
        '3️⃣': 'three',
        '4️⃣': 'four',
        '5️⃣': 'five',
        '6️⃣': 'six',
        '7️⃣': 'seven',
        '8️⃣': 'eight',
        '9️⃣': 'nine',
        'ℹ️': 'info',
        'Ⓜ️': 'm_button',
        '㊗️': 'congratulations',
        '㊙️': 'secret',
        '✅': 'check',
        '☑️': 'checkbox',
        '✔️': 'checkmark',
        '✳️': 'required',
        '✴️': 'focus',
        '❇️': 'active',
        '©️': 'copyright',
        '®️': 'registered',
        '™️': 'trademark',
    };
    for (const [unicode, shortcode] of Object.entries(unicodeMap)) {
    const id = shortcodeToId[shortcode];
    if (id) {
        const imgTag = `<img src="emojis/${id}.png" class="inline-emoji" alt="${customEmojiMeta[id].name}" title="${customEmojiMeta[id].name}">`;
        const escaped = unicode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(escaped, 'g'), imgTag);
    }
}
    return result;
};

let activeCategory = categoryIcons[0];
let recentEmojis = JSON.parse(localStorage.getItem('roomgather_recent_emojis')) || [];
recentEmojis = recentEmojis.filter(id => customEmojiMeta[id]);

function saveRecentEmoji(emojiId) {
    recentEmojis = [emojiId, ...recentEmojis.filter(item => item !== emojiId)];
    if (recentEmojis.length > 21) recentEmojis.pop();
    localStorage.setItem('roomgather_recent_emojis', JSON.stringify(recentEmojis));
    emojiData['🕒'] = recentEmojis;
    if (activeCategory === '🕒' && typeof currentRenderGrid === 'function') {
        currentRenderGrid(emojiData['🕒']);
    }
}

let currentRenderGrid = null;
let longPressEnabled = true;
let longPressListenersAttached = false;

function setLongPressEnabled(enabled) {
    longPressEnabled = enabled;
    if (enabled && !longPressListenersAttached) {
        attachLongPress();
    } else if (!enabled && longPressListenersAttached) {
        detachLongPress();
    }
}

function detachLongPress() {
    document.querySelectorAll('.message').forEach(div => {
        div.removeEventListener('pointerdown', onPointerDown);
        div.removeEventListener('pointermove', onPointerMove);
        div.removeEventListener('pointerup', onPointerUp);
    });
    longPressListenersAttached = false;
}

// ---------- simplified long press (movement does NOT cancel) ----------
let pressTimer = null;
const LONG_PRESS_MS = 600;

function cancelLongPress() {
    if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
    }
}

function onPointerDown(e) {
    if (!longPressEnabled) return;
    if (e.button !== undefined && e.button !== 0 && e.button !== -1) return;
    if (isInteractionBlocked()) return;
    const target = e.currentTarget;
    if (!target) return;
    
    target.style.transition = 'background 0.1s';
    target.style.background = '#2a2a2a';
    setTimeout(() => { target.style.background = ''; }, 150);
    
    cancelLongPress();
    pressTimer = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(50);
        const messageId = parseInt(target.getAttribute('data-id'));
        const currentText = messages.find(m => m.id === messageId)?.text || '';
        showMessageMenu(e.clientX, e.clientY, messageId, currentText);
        pressTimer = null;
    }, LONG_PRESS_MS);
}

function onPointerMove(e) {
    // Do nothing
}

function onPointerUp() { 
    cancelLongPress(); 
}

function attachLongPress() {
    if (!longPressEnabled) return;
    document.querySelectorAll('.message').forEach(div => {
        div.removeEventListener('pointerdown', onPointerDown);
        div.removeEventListener('pointermove', onPointerMove);
        div.removeEventListener('pointerup', onPointerUp);
        div.addEventListener('pointerdown', onPointerDown);
        div.addEventListener('pointermove', onPointerMove);
        div.addEventListener('pointerup', onPointerUp);
    });
    longPressListenersAttached = true;
}

function setupEmojiPicker() {
    const emojiBtn = document.getElementById('emojiBtn');
    const picker = document.getElementById('emojiPicker');
    const emojiSearch = document.getElementById('emojiSearch');
    const categoriesEl = document.getElementById('emojiCategories');
    const gridEl = document.getElementById('emojiGrid');
    const previewLarge = document.getElementById('previewLargeEmoji');
    const previewName = document.getElementById('previewName');
    const previewShortcode = document.getElementById('previewShortcode');
    const hasPreview = previewLarge && previewName && previewShortcode;

    let isOpen = false;

    const cancelAnyLongPress = () => {
        if (typeof cancelLongPress === 'function') cancelLongPress();
    };

    function resetPreview() {
        if (!hasPreview) return;
        previewLarge.textContent = '🎨';
        previewName.textContent = 'Pick an emoji...';
        previewShortcode.textContent = '';
    }

    function setPreview(emojiId) {
        if (!hasPreview) return;
        const meta = customEmojiMeta[emojiId];
        if (meta) {
            previewLarge.innerHTML = `<img src="emojis/${emojiId}.png" width="28" height="28" style="vertical-align:middle">`;
            previewName.textContent = meta.name;
            previewShortcode.textContent = `:${meta.shortcode}:`;
        } else {
            resetPreview();
        }
    }

    function reapplyActiveCategory() {
        document.querySelectorAll('.emoji-cat-btn').forEach(btn => {
            if (btn.textContent === activeCategory) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function renderGrid(emojis) {
        gridEl.innerHTML = '';
        const heading = document.createElement('div');
        heading.className = 'emoji-group-title';
        heading.textContent = categoryTitles[activeCategory] || activeCategory;
        gridEl.appendChild(heading);
        const wrapper = document.createElement('div');
        wrapper.className = 'emoji-items-wrapper';

        if (!emojis || emojis.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'emoji-empty-placeholder';
            placeholder.textContent = activeCategory === '🕒' ? 'No recent emojis yet.' : 'No emojis in this category.';
            gridEl.appendChild(placeholder);
            return;
        }

        emojis.forEach(emojiId => {
            const span = document.createElement('span');
            span.className = 'emoji-item';
            const img = document.createElement('img');
            img.src = `emojis/${emojiId}.png`;
            img.width = 30;
            img.height = 30;
            img.style.verticalAlign = 'middle';
            span.appendChild(img);

            const blockEvent = (e) => {
                e.stopPropagation();
                if (e.type === 'pointerdown') {
                    e.preventDefault();
                    cancelAnyLongPress();
                    if (span.hasPointerCapture && span.hasPointerCapture(e.pointerId)) {
                        span.releasePointerCapture(e.pointerId);
                    }
                }
            };
            span.addEventListener('pointerdown', blockEvent);
            span.addEventListener('pointerup', blockEvent);
            span.addEventListener('pointermove', blockEvent);
            span.addEventListener('pointerenter', () => setPreview(emojiId));
            span.addEventListener('pointerleave', resetPreview);
            span.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                cancelAnyLongPress();
                const input = document.getElementById('messageInput');
                const shortcode = `:${customEmojiMeta[emojiId].shortcode}:`;
                const pos = input.selectionStart;
                const val = input.value;
                input.value = val.slice(0, pos) + shortcode + val.slice(pos);
                input.selectionStart = input.selectionEnd = pos + shortcode.length;
                input.focus();
                updateCharCounter();
                saveRecentEmoji(emojiId);
                resetPreview();
                reapplyActiveCategory();
            });
            span.addEventListener('pointerup', () => {
                setTimeout(reapplyActiveCategory, 10);
            });
            wrapper.appendChild(span);
        });
        gridEl.appendChild(wrapper);
        reapplyActiveCategory();
    }

    function buildCategories() {
        categoriesEl.innerHTML = '';
        categoryIcons.forEach(icon => {
            if (icon !== '🕒' && (!emojiData[icon] || emojiData[icon].length === 0)) return;
            const btn = document.createElement('button');
            btn.className = 'emoji-cat-btn' + (icon === activeCategory ? ' active' : '');
            btn.textContent = icon;
            btn.title = categoryTitles[icon] || icon;
            btn.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                cancelAnyLongPress();
            });
            btn.addEventListener('click', () => {
                activeCategory = icon;
                reapplyActiveCategory();
                renderGrid(emojiData[icon]);
                resetPreview();
                if (emojiSearch) emojiSearch.value = '';
                cancelAnyLongPress();
            });
            categoriesEl.appendChild(btn);
        });
    }

    // ========== Emoji search input – no auto‑focus ==========
    if (emojiSearch) {
        emojiSearch.removeAttribute('readonly');
        emojiSearch.style.pointerEvents = 'auto';
        
        // Ensure it receives focus only when tapped (no auto-focus)
        const focusSearch = (e) => {
            e.stopPropagation();
            emojiSearch.focus();
        };
        emojiSearch.addEventListener('click', focusSearch);
        emojiSearch.addEventListener('touchstart', focusSearch);
        
        emojiSearch.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            cancelAnyLongPress();
        });
        emojiSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            if (term === '') {
                renderGrid(emojiData[activeCategory]);
                return;
            }
            const results = customEmojis.filter(emoji =>
                emoji.name.toLowerCase().includes(term) ||
                emoji.shortcode.toLowerCase().includes(term)
            );
            const filteredIds = results.map(emoji => emoji.id);
            gridEl.innerHTML = '';
            const heading = document.createElement('div');
            heading.className = 'emoji-group-title';
            heading.textContent = 'Search Results';
            gridEl.appendChild(heading);
            if (filteredIds.length === 0) {
                const placeholder = document.createElement('div');
                placeholder.className = 'emoji-empty-placeholder';
                placeholder.textContent = 'No matching emojis.';
                gridEl.appendChild(placeholder);
                return;
            }
            const wrapper = document.createElement('div');
            wrapper.className = 'emoji-items-wrapper';
            filteredIds.forEach(emojiId => {
                const span = document.createElement('span');
                span.className = 'emoji-item';
                const img = document.createElement('img');
                img.src = `emojis/${emojiId}.png`;
                img.width = 30;
                img.height = 30;
                img.style.verticalAlign = 'middle';
                span.appendChild(img);
                const blockEvent = (e) => {
                    e.stopPropagation();
                    if (e.type === 'pointerdown') {
                        e.preventDefault();
                        cancelAnyLongPress();
                        if (span.hasPointerCapture && span.hasPointerCapture(e.pointerId)) {
                            span.releasePointerCapture(e.pointerId);
                        }
                    }
                };
                span.addEventListener('pointerdown', blockEvent);
                span.addEventListener('pointerup', blockEvent);
                span.addEventListener('pointermove', blockEvent);
                span.addEventListener('pointerenter', () => setPreview(emojiId));
                span.addEventListener('pointerleave', resetPreview);
                span.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    cancelAnyLongPress();
                    const input = document.getElementById('messageInput');
                    const shortcode = `:${customEmojiMeta[emojiId].shortcode}:`;
                    const pos = input.selectionStart;
                    const val = input.value;
                    input.value = val.slice(0, pos) + shortcode + val.slice(pos);
                    input.selectionStart = input.selectionEnd = pos + shortcode.length;
                    input.focus();
                    updateCharCounter();
                    saveRecentEmoji(emojiId);
                    resetPreview();
                    reapplyActiveCategory();
                });
                span.addEventListener('pointerup', () => {
                    setTimeout(reapplyActiveCategory, 10);
                });
                wrapper.appendChild(span);
            });
            gridEl.appendChild(wrapper);
            reapplyActiveCategory();
        });
    }

    buildCategories();
    renderGrid(emojiData[activeCategory]);
    resetPreview();

    let categoriesObserver = null;
    if (categoriesObserver) categoriesObserver.disconnect();
    categoriesObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.classList && !target.classList.contains('active') && target.textContent === activeCategory) {
                    target.classList.add('active');
                }
            }
        });
    });
    categoriesObserver.observe(categoriesEl, { attributes: true, subtree: true });

    picker.addEventListener('pointerdown', (e) => {
        cancelAnyLongPress();
        if (picker.hasPointerCapture && picker.hasPointerCapture(e.pointerId)) {
            picker.releasePointerCapture(e.pointerId);
        }
    });

    emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cancelAnyLongPress();
        if (!isOpen) {
            picker.style.display = 'flex';
            isOpen = true;
            if (typeof setLongPressEnabled === 'function') setLongPressEnabled(false);
            emojiData['🕒'] = recentEmojis;
            if (emojiSearch) emojiSearch.value = '';
            buildCategories();
            renderGrid(emojiData[activeCategory]);
            resetPreview();
            if (categoriesObserver) categoriesObserver.observe(categoriesEl, { attributes: true, subtree: true });
            // *** NO AUTOMATIC FOCUS *** – removed the setTimeout that focused the search input
        } else {
            picker.style.display = 'none';
            isOpen = false;
            if (typeof setLongPressEnabled === 'function') setLongPressEnabled(true);
            if (categoriesObserver) categoriesObserver.disconnect();
        }
    });

    document.addEventListener('click', (e) => {
        if (isOpen && !picker.contains(e.target) && e.target !== emojiBtn) {
            picker.style.display = 'none';
            isOpen = false;
            if (typeof setLongPressEnabled === 'function') setLongPressEnabled(true);
            if (categoriesObserver) categoriesObserver.disconnect();
        }
    });
}

// ---------- Settings Panel ----------
function setupSettings() {
    const settingsBtn = document.getElementById('settingsIconBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    const settingsVersionSpan = document.getElementById('settingsVersion');
    const versionFooter = document.getElementById('versionNumber');

    if (!settingsBtn || !settingsModal) return;

    function updateUI() {
        fontSizeSelect.value = settings.fontSize;
        if (settingsVersionSpan && versionFooter) {
            settingsVersionSpan.textContent = versionFooter.textContent;
        }
    }

    fontSizeSelect.addEventListener('change', (e) => {
        settings.fontSize = parseInt(e.target.value);
        saveSettings();
        applyFontSize();
    });

    settingsBtn.addEventListener('click', () => {
        updateUI();
        settingsModal.style.display = 'flex';
    });

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.style.display = 'none';
    });
}

function isInteractionBlocked() {
    return !!(document.querySelector('.inline-edit-input') ||
        (document.getElementById('replyIndicator') && document.getElementById('replyIndicator').style.display === 'flex') ||
        (document.getElementById('deleteModal') && document.getElementById('deleteModal').style.display === 'flex') ||
        (document.getElementById('settingsModal') && document.getElementById('settingsModal').style.display === 'flex') ||
        (document.getElementById('pasteModal') && document.getElementById('pasteModal').style.display === 'flex') ||
        (document.getElementById('emojiPicker') && document.getElementById('emojiPicker').style.display === 'flex'));
}

function blockContextMenu(e) { e.preventDefault(); e.stopPropagation(); return false; }

function attachScrollCancel() {
    const mc = document.getElementById('messages');
    if (mc) { mc.removeEventListener('scroll', cancelLongPress); mc.addEventListener('scroll', cancelLongPress); }
}

// ---------- context menu ----------
let activeMenu = null;

function showMessageMenu(x, y, messageId, currentText) {
    if (isInteractionBlocked()) return;
    closeMessageMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.innerHTML = `
        <div class="context-menu-item reply-item" data-id="${messageId}" data-text="${escapeHtml(currentText)}">
            <img src="icons/reply.png" width="20" height="20" alt="Reply">
            Reply
        </div>
        <div class="context-menu-item edit-item" data-id="${messageId}" data-text="${escapeHtml(currentText)}">
            <img src="icons/edit.png" width="20" height="20" alt="Edit">
            Edit
        </div>
        <div class="context-menu-item copy-item" data-id="${messageId}">
            <img src="icons/copy.png" width="20" height="20" alt="Copy">
            Copy
        </div>
        <div class="context-menu-item delete-item" data-id="${messageId}">
            <img src="icons/delete.png" width="20" height="20" alt="Delete">
            Delete
        </div>
    `;
    document.body.appendChild(menu);
    activeMenu = menu;
    
    menu.querySelector('.reply-item').addEventListener('click', (e) => {
        const id = parseInt(menu.querySelector('.reply-item').getAttribute('data-id'));
        const text = menu.querySelector('.reply-item').getAttribute('data-text');
        closeMessageMenu();
        showReplyIndicator(id, text);
    });
    menu.querySelector('.edit-item').addEventListener('click', (e) => {
        const id = parseInt(menu.querySelector('.edit-item').getAttribute('data-id'));
        const originalText = menu.querySelector('.edit-item').getAttribute('data-text');
        closeMessageMenu();
        startInlineEdit(id, originalText);
    });
    menu.querySelector('.copy-item').addEventListener('click', (e) => {
        const id = parseInt(menu.querySelector('.copy-item').getAttribute('data-id'));
        const text = messages.find(m => m.id === id)?.text || '';
        if (text) navigator.clipboard.writeText(text);
        closeMessageMenu();
    });
    menu.querySelector('.delete-item').addEventListener('click', (e) => {
        const id = parseInt(menu.querySelector('.delete-item').getAttribute('data-id'));
        closeMessageMenu();
        showDeleteConfirmation(id);
    });
    
    setTimeout(() => {
        const closeHandler = (event) => {
            if (activeMenu && !activeMenu.contains(event.target)) {
                closeMessageMenu();
                document.removeEventListener('click', closeHandler);
                document.removeEventListener('touchstart', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
        document.addEventListener('touchstart', closeHandler);
    }, 0);
}

function closeMessageMenu() {
    if (activeMenu) { activeMenu.remove(); activeMenu = null; }
}

// ---------- delete modal ----------
let pendingDeleteId = null;
const deleteModal = document.getElementById('deleteModal');
const deleteCancelBtn = document.getElementById('deleteCancelBtn');
const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');

function showDeleteConfirmation(id) { pendingDeleteId = id; deleteModal.style.display = 'flex'; }
function closeDeleteModal() { deleteModal.style.display = 'none'; pendingDeleteId = null; }

if (deleteCancelBtn) deleteCancelBtn.addEventListener('click', closeDeleteModal);
if (deleteConfirmBtn) deleteConfirmBtn.addEventListener('click', () => {
    if (pendingDeleteId !== null) {
        messages = messages.filter(m => m.id !== pendingDeleteId);
        if (messages.length === 0) nextId = 1;
        saveMessages(); displayMessages(); closeDeleteModal();
    }
});
window.addEventListener('click', (e) => { if (e.target === deleteModal) closeDeleteModal(); });

// ---------- inline edit ----------
function startInlineEdit(messageId, originalText) {
    const messageDiv = document.querySelector(`.message[data-id='${messageId}']`);
    if (!messageDiv) return;
    const msgTextSpan = messageDiv.querySelector('.msg-text-body');
    if (!msgTextSpan || msgTextSpan.querySelector('.inline-edit-input')) return;

    msgTextSpan.innerHTML = `
        <textarea class="inline-edit-input" rows="1" style="resize: none;"></textarea>
        <div class="inline-edit-controls">
            <button class="inline-edit-ok">OK</button>
            <button class="inline-edit-cancel">Cancel</button>
        </div>
    `;

    const input = msgTextSpan.querySelector('.inline-edit-input');
    const okBtn = msgTextSpan.querySelector('.inline-edit-ok');
    const cancelBtn = msgTextSpan.querySelector('.inline-edit-cancel');

    input.value = originalText;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    const finishEdit = (save) => {
        if (save) {
            const newText = input.value.trim();
            if (newText && newText !== originalText) {
                const msg = messages.find(m => m.id === messageId);
                if (msg) {
                    msg.text = normalizeEmojiShortcodes(newText);
                    msg.edited = true;
                    saveMessages();
                    displayMessages();
                    return;
                }
            }
        }
        displayMessages();
    };

    okBtn.addEventListener('click', (e) => { e.stopPropagation(); finishEdit(true); });
    cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); finishEdit(false); });
}

// ---------- add message ----------
function addMessage(text) {
    if (!text.trim()) return;
    const normalizedText = normalizeEmojiShortcodes(text);
    const { fullDate, time } = getCurrentFullTimestamp();
    const newMsg = { id: nextId++, text: normalizedText, fullDate, time, edited: false };
    if (pendingReply) {
        newMsg.replyTo = { id: pendingReply.id, text: normalizeEmojiShortcodes(pendingReply.text) };
        cancelReply();
    }
    messages.push(newMsg);
    saveMessages();
    displayMessages();
    const input = document.getElementById('messageInput');
    if (input) { input.value = ''; updateCharCounter(); input.focus(); }
}

// ---------- admin access ----------
let adminPressTimer = null, adminTouchStart = null;
const versionFooter = document.getElementById('versionNumber');
if (versionFooter) {
    versionFooter.style.cursor = 'default';
    versionFooter.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        adminTouchStart = { x: e.clientX, y: e.clientY };
        adminPressTimer = setTimeout(() => { window.location.href = 'admin.html'; adminPressTimer = null; }, LONG_PRESS_MS);
    });
    versionFooter.addEventListener('pointermove', (e) => {
        if (!adminPressTimer || !adminTouchStart) return;
        if (Math.abs(e.clientX - adminTouchStart.x) > 10 || Math.abs(e.clientY - adminTouchStart.y) > 10) {
            clearTimeout(adminPressTimer); adminPressTimer = null; adminTouchStart = null;
        }
    });
    versionFooter.addEventListener('pointerup', () => { if (adminPressTimer) clearTimeout(adminPressTimer); adminPressTimer = null; adminTouchStart = null; });
    versionFooter.addEventListener('pointercancel', () => { if (adminPressTimer) clearTimeout(adminPressTimer); adminPressTimer = null; adminTouchStart = null; });
    versionFooter.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ---------- send button ----------
const sendBtn = document.getElementById('sendBtn');
const messageInputElem = document.getElementById('messageInput');
function handleSend() {
    if (messageInputElem && messageInputElem.value.trim() !== '') {
        addMessage(messageInputElem.value);
    }
}
if (sendBtn) sendBtn.addEventListener('click', handleSend);
if (messageInputElem) {
    messageInputElem.addEventListener('input', updateCharCounter);
}

// ---------- selection menu ----------
let selectionMenu = null;

function createSelectionMenu() {
    if (selectionMenu) selectionMenu.remove();
    const menu = document.createElement('div');
    menu.className = 'selection-menu';
    menu.innerHTML = `
        <div class="selection-menu-item copy-btn">
            <img src="icons/copy.png" width="16" height="16" alt="Copy"> Copy
        </div>
        <span class="selection-menu-sep">|</span>
        <div class="selection-menu-item cut-btn">
            <img src="icons/cut.png" width="16" height="16" alt="Cut"> Cut
        </div>
        <span class="selection-menu-sep">|</span>
        <div class="selection-menu-item paste-btn">
            <img src="icons/paste.png" width="16" height="16" alt="Paste"> Paste
        </div>
        <span class="selection-menu-sep">|</span>
        <div class="selection-menu-item select-all-btn">
            <img src="icons/multiselect.png" width="16" height="16" alt="Select All"> Select All
        </div>
    `;
    document.body.appendChild(menu);
    selectionMenu = menu;
    return menu;
}

function positionSelectionMenu(inputElement) {
    if (!selectionMenu) return;
    const { selectionStart, selectionEnd } = inputElement;
    if (selectionStart === selectionEnd) {
        if (selectionMenu) selectionMenu.style.display = 'none';
        return;
    }
    const mirror = document.createElement('div');
    mirror.style.position = 'absolute';
    mirror.style.whiteSpace = 'pre';
    mirror.style.font = window.getComputedStyle(inputElement).font;
    mirror.style.padding = window.getComputedStyle(inputElement).padding;
    mirror.style.border = window.getComputedStyle(inputElement).border;
    mirror.style.visibility = 'hidden';
    mirror.textContent = inputElement.value.substring(0, selectionStart);
    document.body.appendChild(mirror);
    const startWidth = mirror.getBoundingClientRect().width;
    document.body.removeChild(mirror);
    const inputRect = inputElement.getBoundingClientRect();
    let left = inputRect.left + startWidth;
    let top = inputRect.top - 40;
    selectionMenu.style.display = 'flex';
    selectionMenu.style.left = `${left}px`;
    selectionMenu.style.top = `${top}px`;
}

function hideSelectionMenu() {
    if (selectionMenu) selectionMenu.style.display = 'none';
}

function handleSelection() {
    const input = document.getElementById('messageInput');
    if (!input || document.activeElement !== input) {
        hideSelectionMenu();
        return;
    }
    if (input.selectionStart !== input.selectionEnd) {
        if (!selectionMenu) createSelectionMenu();
        positionSelectionMenu(input);
    } else {
        hideSelectionMenu();
    }
}

function setupSelectionMenu() {
    const input = document.getElementById('messageInput');
    if (!input) return;
    input.addEventListener('select', handleSelection);
    input.addEventListener('click', () => setTimeout(handleSelection, 10));
    input.addEventListener('keyup', handleSelection);
    document.addEventListener('selectionchange', handleSelection);
    document.addEventListener('click', (e) => {
        if (selectionMenu && !selectionMenu.contains(e.target) && e.target !== input) {
            hideSelectionMenu();
        }
    });
    document.body.addEventListener('click', (e) => {
        const target = e.target.closest('.selection-menu-item');
        if (!target) return;
        const input = document.getElementById('messageInput');
        if (!input) return;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        if (target.classList.contains('copy-btn')) {
            const text = input.value.substring(start, end);
            navigator.clipboard.writeText(text);
        } else if (target.classList.contains('cut-btn')) {
            const text = input.value.substring(start, end);
            navigator.clipboard.writeText(text);
            const newValue = input.value.substring(0, start) + input.value.substring(end);
            input.value = newValue;
            input.setSelectionRange(start, start);
            updateCharCounter();
            handleSelection();
        } else if (target.classList.contains('paste-btn')) {
            navigator.clipboard.readText().then(clipText => {
                const newValue = input.value.substring(0, start) + clipText + input.value.substring(end);
                input.value = newValue;
                const newPos = start + clipText.length;
                input.setSelectionRange(newPos, newPos);
                updateCharCounter();
                handleSelection();
            }).catch(() => {});
        } else if (target.classList.contains('select-all-btn')) {
            input.select();
            handleSelection();
        }
        e.stopPropagation();
    });
}

// ---------- initialization ----------
document.addEventListener('DOMContentLoaded', function() {
    setupSearch();
    setupEmojiPicker();
    setupSettings();
    setupSelectionMenu();
    updateCharCounter();
    applyFontSize();
    displayMessages();
});
