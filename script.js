let messages = JSON.parse(localStorage.getItem('roomgather_messages')) || [];
let nextId = messages.length > 0 ? Math.max(...messages.map(m => m.id)) + 1 : 1;
let currentSearchTerm = '';

// ---------- Settings (no more enterToSend) ----------
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
document.addEventListener('selectstart', (e) => { e.preventDefault(); return false; });

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

// ---------- Reply state ----------
let pendingReply = null; // { id, text }

function showReplyIndicator(replyToId, replyToText) {
    const indicator = document.getElementById('replyIndicator');
    const previewSpan = document.getElementById('replyPreviewText');
    if (indicator && previewSpan) {
        previewSpan.textContent = replyToText.length > 50 ? replyToText.substring(0, 47) + '...' : replyToText;
        indicator.style.display = 'flex';
        pendingReply = { id: replyToId, text: replyToText };
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
        let innerHtml = '';
        if (msg.replyTo) {
            const originalMsg = messages.find(m => m.id === msg.replyTo.id);
            if (originalMsg) {
                innerHtml += `<div class="message-reply-preview"><span>Replying to:</span> ${escapeHtml(originalMsg.text)}</div>`;
            } else {
                innerHtml += `<div class="message-reply-preview"><span>↳ Replying to:</span> ${escapeHtml(msg.replyTo.text)}</div>`;
            }
        }
        const editedMark = msg.edited ? ' <span class="edited-mark">(edited)</span>' : '';
        innerHtml += `<span class="username-label">User:</span><span class="msg-text-body">${escapeHtml(msg.text)}${editedMark}</span><span class="timestamp">${formatMessageDate(msg.fullDate, msg.time)}</span>`;
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
        // Show only when typing, hide when empty
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
            if (searchInput) searchInput.focus();
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

// ---------- emoji picker dataset & meta ----------
const emojiData = {
    '🕒': [],
    '😊': ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕'],
    '🚶': ['👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁','👅','👄','👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵'],
    '🐶': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐽','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿','🦔'],
    '🍎': ['🍎','🍊','🍋','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🫒','🥦','🥬','🥒','🌶','🫑','🧄','🧅','🥔','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋','☕','🍵','🫖','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾'],
    '⚽': ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🏒','🏑','🥍','👑','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','🏂','🪂','🏆','🥇','🥈','🥉','🏅','🎖','🎗','🎫','🎟','🎪','🤹','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮','🎰','🧩'],
    '🚗': ['🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍','🛵','🛺','🚲','🛴','🚏','🛣','🛤','⛽','🚨','🚥','🚦','🛑','🚧','⚓','🪝','⛵','🚤','🛥','🛳','🚢','✈️','🛩','🛫','🛬','💺','🚁','🚟','🚠','🚡','🛰','🚀','🛸','🎆','🎇','🧨','✨','🎉','🎊','🎋','🎍','🎎','🎐','🎑','🧧','🎀','🎁'],
    '💡': ['💡','🔦','🕯','🪔','🧯','🛢','💰','💴','💵','💶','💷','💸','💳','🪙','💹','📈','📉','📊','📋','📌','📍','📎','🖇','📏','📐','✂️','🗃','🗄','🗑','🔒','🔓','🔏','🔐','🔑','🗝','🔨','🪓','⛏️','⚒️','🛠','🗡','⚔️','🔫','🛡','🪚','🔧','🪛','🔩','⚙️','🗜','⚖️','🦯','🔗','⛓️','🪜','⚗️','🧪','🧫','🧬','🔬','🔭','📡','💉','🩸','💊','🩹','🩼','🩺','🩻','🚪','🛗','🪞','🪟','🛏','🛋','🪑','🚽','🪠','🚿','🛁','🪤','🪒','🧴','🧷','🧹','🧺','🧻','🪣','🧼','🫧','🪥','🧽'],
    '❤️': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🔀','🔁','🔂','▶️','⏩','⏭️','⏯️','◀️','⏪','⏮️','🔼','⏫','🔽','⏬','⏸','⏹','⏺','⏏️'],
    '🏳️': ['🏳️','🏴','🏁','🚩','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️','🇦🇫','🇦🇱','🇩🇿','🇦🇸','🇦🇩','🇦🇴','🇦🇮','🇦🇶','🇦🇬','🇦🇷','🇦🇲','🇦🇼','🇦🇺','🇦🇹','🇦🇿','🇧🇸','🇧🇭','🇧🇩','🇧🇧','🇧🇾','🇧🇪','🇧🇿','🇧🇯','🇧🇲','🇧🇹','🇧🇴','🇧🇦','🇧🇼','🇧🇷','🇮🇴','🇻🇬','🇧🇳','🇧🇬','🇧🇫','🇧🇮','🇰🇭','🇨🇲','🇨🇦','🇮🇨','🇨🇻','🇧🇶','🇰🇾']
};

const categoryTitles = {
    '🕒': 'Recent',
    '😊': 'Smileys & People',
    '🚶': 'People & Body',
    '🐶': 'Animals & Nature',
    '🍎': 'Food & Drinks',
    '⚽': 'Activity',
    '🚗': 'Travel & Places',
    '💡': 'Objects',
    '❤️': 'Symbols',
    '🏳️': 'Flags'
};

const emojiMeta = {
    '☝️': { name: 'Index Pointing Up', code: ':index_up:' },
    '😀': { name: 'Grinning Face', code: ':grinning:' },
    '😃': { name: 'Grinning Face with Big Eyes', code: ':smiley:' },
    '😄': { name: 'Grinning Face with Smiling Eyes', code: ':smile:' },
    '😁': { name: 'Beaming Face with Smiling Eyes', code: ':grin:' },
    '😆': { name: 'Grinning Squinting Face', code: ':laughing:' },
    '😅': { name: 'Grinning Face with Sweat', code: ':sweat_smile:' },
    '😂': { name: 'Face with Tears of Joy', code: ':joy:' },
    '🤣': { name: 'Rolling on the Floor Laughing', code: ':rofl:' },
    '😊': { name: 'Smiling Face with Smiling Eyes', code: ':blush:' },
    '😇': { name: 'Smiling Face with Halo', code: ':innocent:' },
    '🙂': { name: 'Slightly Smiling Face', code: ':slight_smile:' },
    '🙃': { name: 'Upside-Down Face', code: ':upside_down:' },
    '😉': { name: 'Winking Face', code: ':wink:' },
    '😌': { name: 'Relieved Face', code: ':relieved:' },
    '😍': { name: 'Smiling Face with Heart-Eyes', code: ':heart_eyes:' },
    '🥰': { name: 'Smiling Face with Hearts', code: ':three_hearts:' },
    '😘': { name: 'Face Blowing a Kiss', code: ':kiss_heart:' },
    '😗': { name: 'Kissing Face', code: ':kissing:' },
    '😙': { name: 'Kissing Face with Smiling Eyes', code: ':kiss_smile:' },
    '😚': { name: 'Kissing Face with Closed Eyes', code: ':kiss_closed:' },
    '😋': { name: 'Face Savoring Food', code: ':yum:' },
    '😛': { name: 'Face with Tongue', code: ':tongue_out:' },
    '😝': { name: 'Squinting Face with Tongue', code: ':tongue_closed:' },
    '😜': { name: 'Winking Face with Tongue', code: ':tongue_wink:' },
    '🤪': { name: 'Zany Face', code: ':zany:' },
    '🤨': { name: 'Face with Raised Eyebrow', code: ':raised_eyebrow:' },
    '🧐': { name: 'Face with Monocle', code: ':monocle_face:' },
    '🤓': { name: 'Nerd Face', code: ':nerd:' },
    '😎': { name: 'Smiling Face with Sunglasses', code: ':sunglasses:' },
    '🥸': { name: 'Disguised Face', code: ':disguised:' },
    '🤩': { name: 'Star-Struck', code: ':star_struck:' },
    '🥳': { name: 'Partying Face', code: ':partying:' },
    '😏': { name: 'Smirking Face', code: ':smirk:' },
    '😒': { name: 'Unamused Face', code: ':unamused:' },
    '😞': { name: 'Disappointed Face', code: ':disappointed:' },
    '😔': { name: 'Pensive Face', code: ':pensive:' },
    '😟': { name: 'Worried Face', code: ':worried:' },
    '😕': { name: 'Confused Face', code: ':confused:' },
    '🙁': { name: 'Slightly Frowning Face', code: ':slight_frown:' },
    '☹️': { name: 'Frowning Face', code: ':frowning:' },
    '😣': { name: 'Persevering Face', code: ':persevere:' },
    '😖': { name: 'Confounded Face', code: ':confounded:' },
    '😫': { name: 'Tired Face', code: ':tired:' },
    '😩': { name: 'Weary Face', code: ':weary:' },
    '🥺': { name: 'Pleading Face', code: ':pleading:' },
    '😢': { name: 'Crying Face', code: ':cry:' },
    '😭': { name: 'Loudly Crying Face', code: ':sob:' },
    '😤': { name: 'Face with Steam From Nose', code: ':steam_nose:' },
    '😠': { name: 'Angry Face', code: ':angry:' },
    '😡': { name: 'Enraged Face', code: ':rage:' },
    '🤬': { name: 'Face with Symbols on Mouth', code: ':swearing:' },
    '🤯': { name: 'Exploding Head', code: ':mindblowing:' },
    '😳': { name: 'Flushed Face', code: ':flushed:' },
    '🥵': { name: 'Hot Face', code: ':hot:' },
    '🥶': { name: 'Cold Face', code: ':cold:' },
    '😱': { name: 'Face Screaming in Fear', code: ':scream:' },
    '😨': { name: 'Fearful Face', code: ':fearful:' },
    '😰': { name: 'Face with Open Mouth and Cold Sweat', code: ':cold_sweat:' },
    '😥': { name: 'Sad but Relieved Face', code: ':sad_relieved:' },
    '😓': { name: 'Downcast Face with Sweat', code: ':sweat:' },
    '🤗': { name: 'Hugging Face', code: ':hugging:' },
    '🤔': { name: 'Thinking Face', code: ':thinking:' },
    '🤭': { name: 'Face with Hand Over Mouth', code: ':hand_over_mouth:' },
    '🤫': { name: 'Shushing Face', code: ':shush:' },
    '🤥': { name: 'Lying Face', code: ':lying:' },
    '😶': { name: 'Face Without Mouth', code: ':no_mouth:' },
    '😑': { name: 'Expressionless Face', code: ':expressionless:' },
    '😬': { name: 'Grimacing Face', code: ':grimacing:' },
    '🙄': { name: 'Face with Rolling Eyes', code: ':roll_eyes:' },
    '😯': { name: 'Hushed Face', code: ':hushed:' },
    '😦': { name: 'Frowning Face with Open Mouth', code: ':frowning_open:' },
    '😧': { name: 'Anguished Face', code: ':anguished:' },
    '😮': { name: 'Face with Open Mouth', code: ':open_mouth:' },
    '😲': { name: 'Astonished Face', code: ':astonished:' },
    '🥱': { name: 'Yawning Face', code: ':yawn:' },
    '😴': { name: 'Sleeping Face', code: ':sleeping:' },
    '🤤': { name: 'Drooling Face', code: ':drooling:' },
    '😪': { name: 'Sleepy Face', code: ':snoring:' },
    '😵': { name: 'Face with Crossed-Out Eyes', code: ':dizzy:' },
    '🤐': { name: 'Zipper-Mouth Face', code: ':zipper_mouth:' },
    '🥴': { name: 'Woozy Face', code: ':woozy:' },
    '🤢': { name: 'Nauseated Face', code: ':nauseated:' },
    '🤮': { name: 'Face Vomiting', code: ':vomit:' },
    '🤧': { name: 'Sneezing Face', code: ':sneezing:' },
    '😷': { name: 'Face with Medical Mask', code: ':mask:' },
    '🤒': { name: 'Face with Thermometer', code: ':thermometer_mouth:' },
    '🤕': { name: 'Face with Head-Bandage', code: ':head_bandage:' },
    '👋': { name: 'Waving Hand', code: ':wave:' },
    '🤚': { name: 'Raised Back of Hand', code: ':hand_back:' },
    '🖐': { name: 'Hand with Fingers Splayed', code: ':hand_splayed:' },
    '✋': { name: 'Raised Hand', code: ':hand:' },
    '🖖': { name: 'Vulcan Salute', code: ':vulcan:' },
    '👌': { name: 'OK Hand', code: ':ok_hand:' },
    '🤌': { name: 'Pinched Fingers', code: ':pinched_fingers:' },
    '🤏': { name: 'Pinching Hand', code: ':pinching_hand:' },
    '✌️': { name: 'Victory Hand', code: ':v:' },
    '🤞': { name: 'Crossed Fingers', code: ':fingers_crossed:' },
    '🤟': { name: 'Love-You Gesture', code: ':love_you:' },
    '🤘': { name: 'Sign of the Horns', code: ':metal:' },
    '🤙': { name: 'Call Me Hand', code: ':call_me:' },
    '👈': { name: 'Backhand Index Pointing Left', code: ':point_left:' },
    '👉': { name: 'Backhand Index Pointing Right', code: ':point_right:' },
    '👆': { name: 'Backhand Index Pointing Up', code: ':point_up:' },
    '🖕': { name: 'Middle Finger', code: ':middle_finger:' },
    '👇': { name: 'Backhand Index Pointing Down', code: ':point_down:' },
    '👍': { name: 'Thumbs Up', code: ':thumbsup:' },
    '👎': { name: 'Thumbs Down', code: ':thumbsdown:' },
    '✊': { name: 'Raised Fist', code: ':fist:' },
    '👊': { name: 'Oncoming Fist', code: ':punch:' },
    '🤛': { name: 'Left-Facing Fist', code: ':left_fist:' },
    '🤜': { name: 'Right-Facing Fist', code: ':right_fist:' },
    '👏': { name: 'Clapping Hands', code: ':clap:' },
    '🙌': { name: 'Raising Hands', code: ':raised_hands:' },
    '👐': { name: 'Open Hands', code: ':open_hands:' },
    '🤲': { name: 'Palms Up Together', code: ':palms_up:' },
    '🤝': { name: 'Handshake', code: ':handshake:' },
    '🙏': { name: 'Folded Hands', code: ':pray:' },
    '✍️': { name: 'Writing Hand', code: ':writing:' },
    '💅': { name: 'Nail Polish', code: ':manicure:' },
    '🤳': { name: 'Selfie', code: ':selfie:' },
    '💪': { name: 'Flexed Biceps', code: ':muscle:' },
    '🦾': { name: 'Mechanical Arm', code: ':mechanical_arm:' },
    '🦵': { name: 'Leg', code: ':leg:' },
    '🦶': { name: 'Foot', code: ':foot:' },
    '👂': { name: 'Ear', code: ':ear:' },
    '🦻': { name: 'Ear with Hearing Aid', code: ':hearing_aid:' },
    '👃': { name: 'Nose', code: ':nose:' },
    '🫀': { name: 'Anatomical Heart', code: ':real_heart:' },
    '🫁': { name: 'Lungs', code: ':lungs:' },
    '🧠': { name: 'Brain', code: ':brain:' },
    '🦷': { name: 'Tooth', code: ':tooth:' },
    '🦴': { name: 'Bone', code: ':bone:' },
    '👀': { name: 'Eyes', code: ':eyes:' },
    '👁': { name: 'Eye', code: ':eye:' },
    '👅': { name: 'Tongue', code: ':tongue:' },
    '👄': { name: 'Mouth', code: ':lips:' },
    '👶': { name: 'Baby', code: ':baby:' },
    '🧒': { name: 'Child', code: ':child:' },
    '👦': { name: 'Boy', code: ':boy:' },
    '👧': { name: 'Girl', code: ':girl:' },
    '🧑': { name: 'Person', code: ':person:' },
    '👱': { name: 'Person: Blond Hair', code: ':blond:' },
    '👨': { name: 'Man', code: ':man:' },
    '🧔': { name: 'Man: Beard', code: ':beard:' },
    '👩': { name: 'Woman', code: ':woman:' },
    '🧓': { name: 'Older Person', code: ':elder:' },
    '👴': { name: 'Old Man', code: ':grandpa:' },
    '👵': { name: 'Old Woman', code: ':grandma:' },
    '🐶': { name: 'Dog Face', code: ':dog:' },
    '🐱': { name: 'Cat Face', code: ':cat:' },
    '🐭': { name: 'Mouse Face', code: ':mouse:' },
    '🐹': { name: 'Hamster Face', code: ':hamster:' },
    '🐰': { name: 'Rabbit Face', code: ':rabbit:' },
    '🦊': { name: 'Fox Face', code: ':fox:' },
    '🐻': { name: 'Bear Face', code: ':bear:' },
    '🐼': { name: 'Panda Face', code: ':panda:' },
    '🐨': { name: 'Koala', code: ':koala:' },
    '🐯': { name: 'Tiger Face', code: ':tiger:' },
    '🦁': { name: 'Lion Face', code: ':lion:' },
    '🐮': { name: 'Cow Face', code: ':cow:' },
    '🐷': { name: 'Pig Face', code: ':pig:' },
    '🐽': { name: 'Pig Nose', code: ':pig_nose:' },
    '🐸': { name: 'Frog Face', code: ':frog:' },
    '🐵': { name: 'Monkey Face', code: ':monkey:' },
    '🙈': { name: 'See-No-Evil Monkey', code: ':hide_eyes:' },
    '🙉': { name: 'Hear-No-Evil Monkey', code: ':hide_ears:' },
    '🙊': { name: 'Speak-No-Evil Monkey', code: ':hide_mouth:' },
    '🐒': { name: 'Monkey', code: ':monkey_full:' },
    '🐔': { name: 'Chicken', code: ':chicken:' },
    '🐧': { name: 'Penguin', code: ':penguin:' },
    '🐦': { name: 'Bird', code: ':bird:' },
    '🐤': { name: 'Baby Chick', code: ':baby_chick:' },
    '🐣': { name: 'Hatching Chick', code: ':hatching_chick:' },
    '🐥': { name: 'Front-Facing Baby Chick', code: ':chick:' },
    '🦆': { name: 'Duck', code: ':duck:' },
    '🦅': { name: 'Eagle', code: ':eagle:' },
    '🦉': { name: 'Owl', code: ':owl:' },
    '🦇': { name: 'Bat', code: ':bat:' },
    '🐺': { name: 'Wolf', code: ':wolf:' },
    '🐗': { name: 'Boar', code: ':boar:' },
    '🐴': { name: 'Horse Face', code: ':horse:' },
    '🦄': { name: 'Unicorn', code: ':unicorn:' },
    '🐝': { name: 'Honeybee', code: ':bee:' },
    '🐛': { name: 'Bug', code: ':bug:' },
    '🦋': { name: 'Butterfly', code: ':butterfly:' },
    '🐌': { name: 'Snail', code: ':snail:' },
    '🐞': { name: 'Lady Beetle', code: ':ladybug:' },
    '🐜': { name: 'Ant', code: ':ant:' },
    '🦟': { name: 'Mosquito', code: ':mosquito:' },
    '🦗': { name: 'Cricket', code: ':cricket:' },
    '🕷': { name: 'Spider', code: ':spider:' },
    '🦂': { name: 'Scorpion', code: ':scorpion:' },
    '🐢': { name: 'Turtle', code: ':turtle:' },
    '🐍': { name: 'Snake', code: ':snake:' },
    '🦎': { name: 'Lizard', code: ':lizard:' },
    '🦖': { name: 'T-Rex', code: ':t_rex:' },
    '🦕': { name: 'Sauropod', code: ':dinosaur:' },
    '🐙': { name: 'Octopus', code: ':octopus:' },
    '🦑': { name: 'Squid', code: ':squid:' },
    '🦐': { name: 'Shrimp', code: ':shrimp:' },
    '🦞': { name: 'Lobster', code: ':lobster:' },
    '🦀': { name: 'Crab', code: ':crab:' },
    '🐡': { name: 'Blowfish', code: ':puffer:' },
    '🐠': { name: 'Tropical Fish', code: ':tropical_fish:' },
    '🐟': { name: 'Fish', code: ':fish:' },
    '🐬': { name: 'Dolphin', code: ':dolphin:' },
    '🐳': { name: 'Spouting Whale', code: ':splash_whale:' },
    '🐋': { name: 'Whale', code: ':whale:' },
    '🦈': { name: 'Shark', code: ':shark:' },
    '🐊': { name: 'Crocodile', code: ':crocodile:' },
    '🐅': { name: 'Tiger', code: ':tiger_full:' },
    '🐆': { name: 'Leopard', code: ':leopard:' },
    '🦓': { name: 'Zebra', code: ':zebra:' },
    '🦍': { name: 'Gorilla', code: ':gorilla:' },
    '🦧': { name: 'Orangutan', code: ':orangutan:' },
    '🦣': { name: 'Mammoth', code: ':mammoth:' },
    '🐘': { name: 'Elephant', code: ':elephant:' },
    '🦛': { name: 'Hippopotamus', code: ':hippo:' },
    '🦏': { name: 'Rhinoceros', code: ':rhino:' },
    '🐪': { name: 'Camel', code: ':camel:' },
    '🐫': { name: 'Two-Hump Camel', code: ':camel_double:' },
    '🦒': { name: 'Giraffe', code: ':giraffe:' },
    '🦘': { name: 'Kangaroo', code: ':kangaroo:' },
    '🦬': { name: 'Bison', code: ':bison:' },
    '🐃': { name: 'Water Buffalo', code: ':buffalo:' },
    '🐂': { name: 'Ox', code: ':ox:' },
    '🐄': { name: 'Cow', code: ':cow_full:' },
    '🐎': { name: 'Horse', code: ':racehorse:' },
    '🐖': { name: 'Pig', code: ':pig_full:' },
    '🐏': { name: 'Ram', code: ':ram:' },
    '🐑': { name: 'Sheep', code: ':sheep:' },
    '🦙': { name: 'Llama', code: ':llama:' },
    '🐐': { name: 'Goat', code: ':goat:' },
    '🦌': { name: 'Deer', code: ':deer:' },
    '🐕': { name: 'Dog', code: ':dog_full:' },
    '🐩': { name: 'Poodle', code: ':poodle:' },
    '🦮': { name: 'Guide Dog', code: ':guide_dog:' },
    '🐕‍🦺': { name: 'Service Dog', code: ':service_dog:' },
    '🐈': { name: 'Cat', code: ':cat_full:' },
    '🐈‍⬛': { name: 'Black Cat', code: ':black_cat:' },
    '🐓': { name: 'Rooster', code: ':rooster:' },
    '🦃': { name: 'Turkey', code: ':turkey:' },
    '🦤': { name: 'Dodo', code: ':dodo:' },
    '🦚': { name: 'Peacock', code: ':peacock:' },
    '🦜': { name: 'Parrot', code: ':parrot:' },
    'swan': { name: 'Swan', code: ':swan:' },
    '🦩': { name: 'Flamingo', code: ':flamingo:' },
    '🕊': { name: 'Dove', code: ':dove:' },
    '🐇': { name: 'Rabbit', code: ':bunny:' },
    '🦝': { name: 'Raccoon', code: ':raccoon:' },
    '🦨': { name: 'Skunk', code: ':skunk:' },
    '🦡': { name: 'Badger', code: ':badger:' },
    '🦫': { name: 'Beaver', code: ':beaver:' },
    '🦦': { name: 'Otter', code: ':otter:' },
    '🦥': { name: 'Sloth', code: ':sloth:' },
    '🐁': { name: 'Mouse', code: ':mouse_full:' },
    '🐀': { name: 'Rat', code: ':rat:' },
    '🐿': { name: 'Chipmunk', code: ':chipmunk:' },
    '🦔': { name: 'Hedgehog', code: ':hedgehog:' },
    '🍎': { name: 'Red Apple', code: ':apple:' },
    '🍊': { name: 'Tangerine', code: ':tangerine:' },
    '🍋': { name: 'Lemon', code: ':lemon:' },
    '🍇': { name: 'Grapes', code: ':grapes:' },
    '🍓': { name: 'Strawberry', code: ':strawberry:' },
    '🫐': { name: 'Blueberries', code: ':blueberry:' },
    '🍈': { name: 'Melon', code: ':melon:' },
    '🍒': { name: 'Cherries', code: ':cherries:' },
    '🍑': { name: 'Peach', code: ':peach:' },
    '🥭': { name: 'Mango', code: ':mango:' },
    '🍍': { name: 'Pineapple', code: ':pineapple:' },
    '🥥': { name: 'Coconut', code: ':coconut:' },
    '🥝': { name: 'Kiwi', code: ':kiwi:' },
    '🍅': { name: 'Tomato', code: ':tomato:' },
    '🍆': { name: 'Eggplant', code: ':eggplant:' },
    '🥑': { name: 'Avocado', code: ':avocado:' },
    '🫒': { name: 'Olive', code: ':olive:' },
    '🥦': { name: 'Broccoli', code: ':broccoli:' },
    '🥬': { name: 'Leafy Green', code: ':lettuce:' },
    '🥒': { name: 'Cucumber', code: ':cucumber:' },
    '🌶': { name: 'Hot Pepper', code: ':pepper:' },
    '🫑': { name: 'Bell Pepper', code: ':bell_pepper:' },
    '🧄': { name: 'Garlic', code: ':garlic:' },
    '🧅': { name: 'Onion', code: ':onion:' },
    '🥔': { name: 'Potato', code: ':potato:' },
    '🍠': { name: 'Roasted Sweet Potato', code: ':sweet_potato:' },
    '🥐': { name: 'Croissant', code: ':croissant:' },
    '🥯': { name: 'Bagel', code: ':bagel:' },
    '🍞': { name: 'Bread', code: ':bread:' },
    '🥖': { name: 'Baguette', code: ':baguette:' },
    '🥨': { name: 'Pretzel', code: ':pretzel:' },
    '🧀': { name: 'Cheese Wedge', code: ':cheese:' },
    '🥚': { name: 'Egg', code: ':egg:' },
    '🍳': { name: 'Cooking', code: ':cooking:' },
    '🧈': { name: 'Butter', code: ':butter:' },
    '🥞': { name: 'Pancakes', code: ':pancake:' },
    '🧇': { name: 'Waffle', code: ':waffle:' },
    '🥓': { name: 'Bacon', code: ':bacon:' },
    '🥩': { name: 'Cut of Meat', code: ':meat:' },
    '🍗': { name: 'Poultry Leg', code: ':drumstick:' },
    '🍖': { name: 'Meat on Bone', code: ':meat_on_bone:' },
    '🌭': { name: 'Hot Dog', code: ':hotdog:' },
    '🍔': { name: 'Hamburger', code: ':burger:' },
    '🍟': { name: 'French Fries', code: ':fries:' },
    '🍕': { name: 'Pizza Slice', code: ':pizza:' },
    '🫓': { name: 'Flatbread', code: ':flatbread:' },
    '🥪': { name: 'Sandwich', code: ':sandwich:' },
    '🥙': { name: 'Stuffed Flatbread', code: ':pita:' },
    '🧆': { name: 'Falafel', code: ':falafel:' },
    '🌮': { name: 'Taco', code: ':taco:' },
    '🌯': { name: 'Burrito', code: ':burrito:' },
    '🫔': { name: 'Tamale', code: ':tamale:' },
    '🥗': { name: 'Green Salad', code: ':salad:' },
    '🥘': { name: 'Shallow Pan of Food', code: ':poella:' },
    '🫕': { name: 'Fondue', code: ':fondue:' },
    '🥫': { name: 'Canned Food', code: ':canned_food:' },
    '🍝': { name: 'Spaghetti', code: ':pasta:' },
    '🍜': { name: 'Steaming Bowl', code: ':ramen:' },
    '🍲': { name: 'Pot of Food', code: ':stew:' },
    '🍛': { name: 'Curry Rice', code: ':curry:' },
    '🍣': { name: 'Sushi', code: ':sushi:' },
    '🍱': { name: 'Bento Box', code: ':bento:' },
    '🥟': { name: 'Dumpling', code: ':dumpling:' },
    '🦪': { name: 'Oyster', code: ':oyster:' },
    '🍤': { name: 'Fried Shrimp', code: ':fried_shrimp:' },
    '🍙': { name: 'Rice Ball', code: ':rice_ball:' },
    '🍚': { name: 'Cooked Rice', code: ':rice:' },
    '🍘': { name: 'Rice Cracker', code: ':rice_cracker:' },
    '🍥': { name: 'Fish Cake with Swirl', code: ':fishcake:' },
    '🥮': { name: 'Moon Cake', code: ':mooncake:' },
    '🍢': { name: 'Oden', code: ':oden:' },
    '🧁': { name: 'Cupcake', code: ':cupcake:' },
    '🍰': { name: 'Shortcake', code: ':cake_slice:' },
    '🎂': { name: 'Birthday Cake', code: ':cake:' },
    '🍮': { name: 'Custard', code: ':pudding:' },
    '🍭': { name: 'Lollipop', code: ':lollipop:' },
    '🍬': { name: 'Candy', code: ':candy:' },
    '🍫': { name: 'Chocolate Bar', code: ':chocolate:' },
    '🍿': { name: 'Popcorn', code: ':popcorn:' },
    '🍩': { name: 'Doughnut', code: ':donut:' },
    '🍪': { name: 'Cookie', code: ':cookie:' },
    '🌰': { name: 'Chestnut', code: ':chestnut:' },
    '🥜': { name: 'Peanuts', code: ':peanut:' },
    '🍯': { name: 'Honey Pot', code: ':honey:' },
    '🧃': { name: 'Beverage Box', code: ':juice:' },
    '🥤': { name: 'Cup with Straw', code: ':soda:' },
    '🧋': { name: 'Bubble Tea', code: ':boba:' },
    '☕': { name: 'Hot Beverage', code: ':coffee:' },
    '🍵': { name: 'Teacup Without Handle', code: ':matcha:' },
    '🫖': { name: 'Teapot', code: ':teapot:' },
    '🍺': { name: 'Beer Mug', code: ':beer:' },
    '🍻': { name: 'Clinking Beer Mugs', code: ':cheers:' },
    '🥂': { name: 'Clinking Glasses', code: ':toast:' },
    '🍷': { name: 'Wine Glass', code: ':wine:' },
    '🥃': { name: 'Tumbler Glass', code: ':whiskey:' },
    '🍸': { name: 'Cocktail Glass', code: ':martini:' },
    '🍹': { name: 'Tropical Drink', code: ':tropical_drink:' },
    '🧉': { name: 'Maté', code: ':mate:' },
    '🍾': { name: 'Bottle with Popping Cork', code: ':champagne:' },
    '⚽': { name: 'Soccer Ball', code: ':soccer:' },
    '🏀': { name: 'Basketball', code: ':basketball:' },
    '🏈': { name: 'American Football', code: ':football:' },
    '⚾': { name: 'Baseball', code: ':baseball:' },
    '🥎': { name: 'Softball', code: ':softball:' },
    '🎾': { name: 'Tennis', code: ':tennis:' },
    '🏐': { name: 'Volleyball', code: ':volleyball:' },
    '🏉': { name: 'Rugby Football', code: ':rugby:' },
    '🥏': { name: 'Flying Disc', code: ':frisbee:' },
    '🎱': { name: 'Pool 8 Ball', code: ':8ball:' },
    '🏓': { name: 'Ping Pong', code: ':pingpong:' },
    '🏸': { name: 'Badminton', code: ':badminton:' },
    '🏒': { name: 'Ice Hockey', code: ':hockey:' },
    '🏑': { name: 'Field Hockey', code: ':field_hockey:' },
    '🥍': { name: 'Lacrosse', code: ':lacrosse:' },
    '👑': { name: 'Crown', code: ':crown:' },
    '🪃': { name: 'Boomerang', code: ':boomerang:' },
    '🥅': { name: 'Goal Net', code: ':goal:' },
    '⛳': { name: 'Flag in Hole', code: ':golf:' },
    '🪁': { name: 'Kite', code: ':kite:' },
    '🏹': { name: 'Bow and Arrow', code: ':archery:' },
    '🎣': { name: 'Fishing Pole', code: ':fishing:' },
    '🤿': { name: 'Diving Mask', code: ':snorkel:' },
    '🥊': { name: 'Boxing Glove', code: ':boxing:' },
    '🥋': { name: 'Martial Arts Uniform', code: ':karate:' },
    '🎽': { name: 'Running Shirt', code: ':jersey:' },
    '🛹': { name: 'Skateboard', code: ':skateboard:' },
    '🛼': { name: 'Roller Skate', code: ':rollerskates:' },
    '🛷': { name: 'Sled', code: ':sled:' },
    '⛸️': { name: 'Ice Skate', code: ':ice_skate:' },
    '🥌': { name: 'Curling Stone', code: ':curling:' },
    '🎿': { name: 'Skis', code: ':skis:' },
    '⛷️': { name: 'Skier', code: ':skiing:' },
    '🏂': { name: 'Snowboarder', code: ':snowboard:' },
    '🪂': { name: 'Parachute', code: ':skydiving:' },
    '🤺': { name: 'Person Fencing', code: ':fencing:' },
    '🏆': { name: 'Trophy', code: ':trophy:' },
    '🥇': { name: '1st Place Medal', code: ':1st_place:' },
    '🥈': { name: '2nd Place Medal', code: ':2nd_place:' },
    '🥉': { name: '3rd Place Medal', code: ':3rd_place:' },
    '🏅': { name: 'Sports Medal', code: ':medal:' },
    '🎖': { name: 'Military Medal', code: ':military_medal:' },
    '🎗': { name: 'Reminder Ribbon', code: ':ribbon:' },
    '🎫': { name: 'Admission Ticket', code: ':ticket:' },
    '🎟': { name: 'Admission Tickets', code: ':tickets:' },
    '🎪': { name: 'Circus Tent', code: ':circus:' },
    '🎭': { name: 'Performing Arts', code: ':theater:' },
    '🎨': { name: 'Artist Palette', code: ':art:' },
    '🎬': { name: 'Clapper Board', code: ':clapper:' },
    '🎤': { name: 'Microphone', code: ':mic:' },
    '🎧': { name: 'Headphone', code: ':headphones:' },
    '🎼': { name: 'Musical Score', code: ':music:' },
    '🎹': { name: 'Musical Keyboard', code: ':piano:' },
    '🥁': { name: 'Drum', code: ':drum:' },
    '🪘': { name: 'Long Drum', code: ':conga:' },
    '🎷': { name: 'Saxophone', code: ':sax:' },
    '🎺': { name: 'Trumpet', code: ':trumpet:' },
    '🎸': { name: 'Guitar', code: ':guitar:' },
    '🪕': { name: 'Banjo', code: ':banjo:' },
    '🎻': { name: 'Violin', code: ':violin:' },
    '🎲': { name: 'Game Die', code: ':dice:' },
    '棋': { name: 'Chess Pawn', code: ':chess:' },
    '🎯': { name: 'Bullseye', code: ':bullseye:' },
    '🎳': { name: 'Bowling', code: ':bowling:' },
    '🎮': { name: 'Video Game Control', code: ':videogame:' },
    '🎰': { name: 'Slot Machine', code: ':slots:' },
    '🧩': { name: 'Puzzle Piece', code: ':puzzle:' },
    '🚗': { name: 'Automobile', code: ':car:' },
    '🚕': { name: 'Taxi', code: ':taxi:' },
    '🚙': { name: 'Sport Utility Vehicle', code: ':jeep:' },
    '🚌': { name: 'Bus', code: ':bus:' },
    '🚎': { name: 'Trolleybus', code: ':trolleybus:' },
    '🏎': { name: 'Racing Car', code: ':racing_car:' },
    '🚓': { name: 'Police Car', code: ':police_car:' },
    '%': { name: 'Ambulance', code: ':ambulance:' },
    '🚒': { name: 'Fire Engine', code: ':fire_truck:' },
    ' Vans': { name: 'Minibus', code: ':van:' },
    '🛻': { name: 'Pickup Truck', code: ':pickup:' },
    '🚚': { name: 'Delivery Truck', code: ':delivery_truck:' },
    '🛻 ': { name: 'Articulated Lorry', code: ':semi:' },
    '🚜': { name: 'Tractor', code: ':tractor:' },
    '🦼': { name: 'Motorcycle', code: ':motorcycle:' },
    '🛵': { name: 'Motor Scooter', code: ':scooter:' },
    '🛺': { name: 'Auto Rickshaw', code: ':tuk_tuk:' },
    '🚲': { name: 'Bicycle', code: ':bicycle:' },
    '🛴': { name: 'Kick Scooter', code: ':kick_scooter:' },
    '🚏': { name: 'Bus Stop', code: ':bus_stop:' },
    '🛣': { name: 'Motorway', code: ':highway:' },
    '🛤': { name: 'Railway Track', code: ':tracks:' },
    '⛽': { name: 'Gas Station', code: ':gas_station:' },
    '🚨': { name: 'Police Car Light', code: ':siren:' },
    '🚥': { name: 'Horizontal Traffic Light', code: ':traffic_light_h:' },
    '🚦': { name: 'Vertical Traffic Light', code: ':traffic_light:' },
    '🛑': { name: 'Stop Sign', code: ':stop_sign:' },
    '🚧': { name: 'Construction', code: ':construction:' },
    '⚓': { name: 'Anchor', code: ':anchor:' },
    '🪝': { name: 'Hook', code: ':hook:' },
    '⛵': { name: 'Sailboat', code: ':sailboat:' },
    ' speedboat': { name: 'Speedboat', code: ':speedboat:' },
    '🛥': { name: 'Yacht', code: ':yacht:' },
    '🛳': { name: 'Cruise Ship', code: ':cruise:' },
    '🚢': { name: 'Ship', code: ':ship:' },
    '✈️': { name: 'Airplane', code: ':airplane:' },
    '🛩': { name: 'Small Airplane', code: ':small_plane:' },
    '🛫': { name: 'Airplane Departure', code: ':takeoff:' },
    '🛬': { name: 'Airplane Arrival', code: ':landing:' },
    '💺': { name: 'Seat', code: ':seat:' },
    '🛸': { name: 'Helicopter', code: ':helicopter:' },
    '🚟': { name: 'Suspension Railway', code: ':monorail:' },
    '🚠': { name: 'Mountain Cableway', code: ':cable_car:' },
    '🚡': { name: 'Aerial Tramway', code: ':tramway:' },
    '🛰': { name: 'Satellite', code: ':satellite:' },
    '🚀': { name: 'Rocket', code: ':rocket:' },
    '🛸 ': { name: 'Flying Saucer', code: ':ufo:' },
    '🎆': { name: 'Fireworks', code: ':fireworks:' },
    '🎇': { name: 'Sparkler', code: ':sparkler:' },
    '🧨': { name: 'Firecracker', code: ':firecracker:' },
    '✨': { name: 'Sparkles', code: ':sparkles:' },
    '🎉': { name: 'Partying Face', code: ':party:' },
    '🎊': { name: 'Confetti Ball', code: ':confetti:' },
    '🎋': { name: 'Tanabata Tree', code: ':tanabata:' },
    '🎍': { name: 'Pine Decoration', code: ':kadomatsu:' },
    '🎎': { name: 'Japanese Dolls', code: ':dolls:' },
    '🎐': { name: 'Wind Chime', code: ':wind_chime:' },
    '🎑': { name: 'Moon Ceremony', code: ':moon_viewing:' },
    '🧧': { name: 'Red Envelope', code: ':red_envelope:' },
    '🎀': { name: 'Ribbon', code: ':ribbon:' },
    '🎁': { name: 'Wrapped Gift', code: ':gift:' },
    '💡': { name: 'Light Bulb', code: ':bulb:' },
    '🔦': { name: 'Flashlight', code: ':flashlight:' },
    '🕯': { name: 'Candle', code: ':candle:' },
    '🪔': { name: 'Diya Lamp', code: ':lamp:' },
    '🧯': { name: 'Fire Extinguisher', code: ':fire_extinguisher:' },
    '🛢': { name: 'Oil Drum', code: ':oil:' },
    '💰': { name: 'Money Bag', code: ':moneybag:' },
    '💴': { name: 'Yen Banknote', code: ':yen:' },
    '💵': { name: 'Dollar Banknote', code: ':dollar:' },
    '💶': { name: 'Euro Banknote', code: ':euro:' },
    '💷': { name: 'Pound Banknote', code: ':pound:' },
    '💸': { name: 'Money with Wings', code: ':flying_money:' },
    '💳': { name: 'Credit Card', code: ':credit_card:' },
    '🪙': { name: 'Coin', code: ':coin:' },
    '💹': { name: 'Chart Increasing with Yen', code: ':stocks_yen:' },
    '📈': { name: 'Chart Increasing', code: ':chart_up:' },
    '📉': { name: 'Chart Decreasing', code: ':chart_down:' },
    '📊': { name: 'Bar Chart', code: ':bar_chart:' },
    '📋': { name: 'Clipboard', code: ':clipboard:' },
    '📌': { name: 'Pushpin', code: ':pushpin:' },
    '📍': { name: 'Round Pushpin', code: ':pin:' },
    '📎': { name: 'Paperclip', code: ':paperclip:' },
    '🖇': { name: 'Linked Paperclips', code: ':paperclips:' },
    '📏': { name: 'Straight Ruler', code: ':ruler:' },
    '📐': { name: 'Triangular Ruler', code: ':triangle_ruler:' },
    '剪': { name: 'Scissors', code: ':scissors:' },
    '🗃': { name: 'Card File Box', code: ':file_box:' },
    '🗄': { name: 'File Cabinet', code: ':cabinet:' },
    '🗑': { name: 'Wastebasket', code: ':trash:' }, 
    '🔒': { name: 'Locked', code: ':lock:' },
    '🔓': { name: 'Unlocked', code: ':unlock:' },
    '🔏': { name: 'Locked with Pen', code: ':lock_pen:' },
    '🔐': { name: 'Locked with Key', code: ':lock_key:' },
    '🔑': { name: 'Key', code: ':key:' },
    '🗝': { name: 'Old Key', code: ':old_key:' },
    '🔨': { name: 'Hammer', code: ':hammer:' },
    '🪓': { name: 'Axe', code: ':axe:' },
    '⛏️': { name: 'Pickaxe', code: ':pickaxe:' },
    '⚒️': { name: 'Hammer and Pick', code: ':tools:' },
    '🛠': { name: 'Hammer and Wrench', code: ':build:' },
    '🗡': { name: 'Dagger', code: ':dagger:' },
    '⚔️': { name: 'Crossed Swords', code: ':swords:' },
    '🧯 ': { name: 'Water Gun', code: ':gun:' },
    '🛡': { name: 'Shield', code: ':shield:' },
    '🪚': { name: 'Hand Saw', code: ':saw:' },
    '🔧': { name: 'Wrench', code: ':wrench:' },
    '🪛': { name: 'Screwdriver', code: ':screwdriver:' },
    '🔩': { name: 'Nut and Bolt', code: ':bolt:' },
    '⚙️': { name: 'Gear', code: ':gear:' },
    '🗜': { name: 'Clamp', code: ':clamp:' },
    '⚖️': { name: 'Balance Scale', code: ':scale:' },
    '🦯': { name: 'White Cane', code: ':cane:' },
    '🔗': { name: 'Link', code: ':link:' },
    '⛓️': { name: 'Chains', code: ':chains:' },
    '🪜': { name: 'Ladder', code: ':ladder:' },
    '⚗️': { name: 'Alembic', code: ':alembic:' },
    '🧪': { name: 'Test Tube', code: ':test_tube:' },
    '🧫': { name: 'Petri Dish', code: ':petri_dish:' },
    '🧬': { name: 'DNA', code: ':dna:' },
    '🔬': { name: 'Microscope', code: ':microscope:' },
    '🔭': { name: 'Telescope', code: ':telescope:' },
    '📡': { name: 'Satellite Antenna', code: ':dish:' },
    '💉': { name: 'Syringe', code: ':syringe:' },
    '🩸': { name: 'Drop of Blood', code: ':blood:' },
    '💊': { name: 'Pill', code: ':pill:' },
    '🩹': { name: 'Adhesive Bandage', code: ':bandage:' },
    '🩼': { name: 'Crutch', code: ':crutches:' },
    '🩺': { name: 'Stethoscope', code: ':stethoscope:' },
    '🩻': { name: 'X-Ray', code: ':xray:' },
    '🚪': { name: 'Door', code: ':door:' },
    '🛗': { name: 'Elevator', code: ':elevator:' },
    '🪞': { name: 'Mirror', code: ':mirror:' },
    '🪟': { name: 'Window', code: ':window:' },
    '🛏': { name: 'Bed', code: ':bed:' },
    '🛋': { name: 'Couch and Lamp', code: ':couch:' },
    '🪑': { name: 'Chair', code: ':chair:' },
    '🚽': { name: 'Toilet', code: ':toilet:' },
    '🪠': { name: 'Plunger', code: ':plunger:' },
    '🚿': { name: 'Shower', code: ':shower:' },
    '🛁': { name: 'Bathtub', code: ':bathtub:' },
    '🪤': { name: 'Mouse Trap', code: ':trap:' },
    '🪒': { name: 'Razor', code: ':razor:' },
    '🧴': { name: 'Lotion Bottle', code: ':lotion:' },
    '🧷': { name: 'Safety Pin', code: ':safety_pin:' },
    '🧹': { name: 'Broom', code: ':broom:' },
    '🧺': { name: 'Basket', code: ':basket:' },
    '🧻': { name: 'Roll of Paper', code: ':toilet_paper:' },
    '🪣': { name: 'Bucket', code: ':bucket:' },
    '🧼': { name: 'Soap', code: ':soap:' },
    '🫧': { name: 'Bubbles', code: ':bubbles:' },
    '🪥': { name: 'Toothbrush', code: ':toothbrush:' },
    '🧽': { name: 'Sponge', code: ':sponge:' },
    '❤️': { name: 'Red Heart', code: ':heart:' },
    '🧡': { name: 'Orange Heart', code: ':orange_heart:' },
    '💛': { name: 'Yellow Heart', code: ':yellow_heart:' },
    '💚': { name: 'Green Heart', code: ':green_heart:' },
    '💙': { name: 'Blue Heart', code: ':blue_heart:' },
    '💜': { name: 'Purple Heart', code: ':purple_heart:' },
    '🖤': { name: 'Black Heart', code: ':black_heart:' },
    '🤍': { name: 'White Heart', code: ':white_heart:' },
    '🤎': { name: 'Brown Heart', code: ':brown_heart:' },
    '💔': { name: 'Broken Heart', code: ':broken_heart:' },
    '❣️': { name: 'Heart Exclamation', code: ':heart_exclamation:' },
    '💕': { name: 'Two Hearts', code: ':two_hearts:' },
    '💞': { name: 'Revolving Hearts', code: ':heart_spin:' },
    '💓': { name: 'Beating Heart', code: ':heartbeat:' },
    '💗': { name: 'Growing Heart', code: ':growing_heart:' },
    '💖': { name: 'Sparkling Heart', code: ':sparkle_heart:' },
    '💘': { name: 'Heart with Arrow', code: ':arrow_heart:' },
    '💝': { name: 'Heart with Ribbon', code: ':ribbon_heart:' },
    '💟': { name: 'Heart Decoration', code: ':heart_decoration:' },
    '☮️': { name: 'Peace Symbol', code: ':peace:' },
    '✝️': { name: 'Latin Cross', code: ':cross:' },
    '☪️': { name: 'Star and Crescent', code: ':islam:' },
    '🕉': { name: 'Om', code: ':om:' },
    '☸️': { name: 'Wheel of Dharma', code: ':dharma_wheel:' },
    '✡️': { name: 'Star of David', code: ':star_of_david:' },
    '🔯': { name: 'Dotted Six-Pointed Star', code: ':six_pointed_star:' },
    '🕎': { name: 'Menorah', code: ':menorah:' },
    '☯️': { name: 'Yin Yang', code: ':yin_yang:' },
    '☦️': { name: 'Orthodox Cross', code: ':orthodox_cross:' },
    '🛐': { name: 'Place of Worship', code: ':place_of_worship:' },
    '⛎': { name: 'Ophiuchus', code: ':ophiuchus:' },
    '♈': { name: 'Aries', code: ':aries:' },
    '♉': { name: 'Taurus', code: ':taurus:' },
    '♊': { name: 'Gemini', code: ':gemini:' },
    '♋': { name: 'Cancer', code: ':cancer:' },
    '♌': { name: 'Leo', code: ':leo:' },
    '♍': { name: 'Virgo', code: ':virgo:' },
    '♎': { name: 'Libra', code: ':libra:' },
    '♏': { name: 'Scorpio', code: ':scorpio:' },
    '♐': { name: 'Sagittarius', code: ':sagittarius:' },
    '♑': { name: 'Capricorn', code: ':capricorn:' },
    '♒': { name: 'Aquarius', code: ':aquarius:' },
    '♓': { name: 'Pisces', code: ':pisces:' },
    '🆔': { name: 'ID Button', code: ':id:' },
    '⚛️': { name: 'Atom Symbol', code: ':atom:' },
    '🔀': { name: 'Shuffle Tracks Button', code: ':shuffle:' },
    '🔁': { name: 'Repeat Button', code: ':repeat:' },
    '🔂': { name: 'Repeat Single Button', code: ':repeat_one:' },
    '▶️': { name: 'Play Button', code: ':play:' },
    '⏩': { name: 'Fast-Forward Button', code: ':fast_forward:' },
    '⏭️': { name: 'Next Track Button', code: ':next_track:' },
    '⏯️': { name: 'Play or Pause Button', code: ':play_pause:' },
    '◀️': { name: 'Reverse Button', code: ':rewind:' },
    '⏪': { name: 'Fast Reverse Button', code: ':fast_rewind:' },
    '⏮️': { name: 'Previous Track Button', code: ':prev_track:' },
    '🔼': { name: 'Upwards Button', code: ':up_arrow_t:' },
    '⏫': { name: 'Fast Up Button', code: ':fast_up:' },
    '🔽': { name: 'Downwards Button', code: ':down_arrow_t:' },
    '⏬': { name: 'Fast Down Button', code: ':fast_down:' },
    '⏸': { name: 'Pause Button', code: ':pause:' },
    '⏹': { name: 'Stop Button', code: ':stop_button:' },
    '⏺': { name: 'Record Button', code: ':record:' },
    '⏏️': { name: 'Eject Button', code: ':eject:' },
    '🏳️': { name: 'White Flag', code: ':white_flag:' },
    '🏴': { name: 'Black Flag', code: ':black_flag:' },
    '🏁': { name: 'Chequered Flag', code: ':finish:' },
    '🚩': { name: 'Triangular Flag', code: ':triangular_flag:' },
    '🏳️‍🌈': { name: 'Rainbow Flag', code: ':pride:' },
    '🏳️‍⚧️': { name: 'Transgender Flag', code: ':trans_flag:' },
    '🏴‍☠️': { name: 'Pirate Flag', code: ':pirate_flag:' },
    '🇦🇫': { name: 'Afghanistan', code: ':afghanistan:' },
    '🇦🇱': { name: 'Albania', code: ':albania:' },
    '🇩🇿': { name: 'Algeria', code: ':algeria:' },
    '🇦🇸': { name: 'American Samoa', code: ':american_samoa:' },
    '🇦🇩': { name: 'Andorra', code: ':andorra:' },
    '🇦🇴': { name: 'Angola', code: ':angola:' },
    '🇦🇮': { name: 'Anguilla', code: ':anguilla:' },
    '🇦🇶': { name: 'Antarctica', code: ':antarctica:' },
    '🇦🇬': { name: 'Antigua & Barbuda', code: ':antigua:' },
    '🇦🇷': { name: 'Argentina', code: ':argentina:' },
    '🇦🇲': { name: 'Armenia', code: ':armenia:' },
    '🇦🇼': { name: 'Aruba', code: ':aruba:' },
    '🇦🇺': { name: 'Australia', code: ':australia:' },
    '🇦🇹': { name: 'Austria', code: ':austria:' },
    '🇦🇿': { name: 'Azerbaijan', code: ':azerbaijan:' },
    '🇧🇸': { name: 'Bahamas', code: ':bahamas:' },
    '🇧🇭': { name: 'Bahrain', code: ':bahrain:' },
    '🇧🇩': { name: 'Bangladesh', code: ':bangladesh:' },
    '🇧🇧': { name: 'Barbados', code: ':barbados:' },
    '🇧🇾': { name: 'Belarus', code: ':belarus:' },
    '🇧🇪': { name: 'Belgium', code: ':belgium:' },
    '🇧🇿': { name: 'Belize', code: ':belize:' },
    '🇧🇯': { name: 'Benin', code: ':benin:' },
    '🇧🇲': { name: 'Bermuda', code: ':bermuda:' },
    '🇧🇹': { name: 'Bhutan', code: ':bhutan:' },
    '🇧🇴': { name: 'Bolivia', code: ':bolivia:' },
    '🇧🇦': { name: 'Bosnia & Herzegovina', code: ':bosnia:' },
    '🇧🇼': { name: 'Botswana', code: ':botswana:' },
    '🇧🇷': { name: 'Brazil', code: ':brazil:' },
    '🇮🇴': { name: 'British Indian Ocean Territory', code: ':diego_garcia:' },
    '🇻🇬': { name: 'British Virgin Islands', code: ':british_virgin_islands:' },
    '🇧🇳': { name: 'Brunei', code: ':brunei:' },
    '🇧🇬': { name: 'Bulgaria', code: ':bulgaria:' },
    '🇧🇫': { name: 'Burkina Faso', code: ':burkina_faso:' },
    '🇧🇮': { name: 'Burundi', code: ':burundi:' },
    '🇰🇭': { name: 'Cambodia', code: ':cambodia:' },
    '🇨🇲': { name: 'Cameroon', code: ':cameroon:' },
    '🇨🇦': { name: 'Canada', code: ':canada:' },
    '🇮🇨': { name: 'Canary Islands', code: ':canary_islands:' },
    '🇨🇻': { name: 'Cape Verde', code: ':cape_verde:' },
    '🇧🇶': { name: 'Caribbean Netherlands', code: ':caribbean_netherlands:' },
    '🇰🇾': { name: 'Cayman Islands', code: ':cayman_islands:' }
};
// END EMOJI DATA (ensure you paste your full data here)

const categoryIcons = Object.keys(emojiData);
let activeCategory = categoryIcons[0];
let recentEmojis = JSON.parse(localStorage.getItem('roomgather_recent_emojis')) || [];
emojiData['🕒'] = recentEmojis;

function saveRecentEmoji(em) {
    recentEmojis = [em, ...recentEmojis.filter(item => item !== em)];
    if (recentEmojis.length > 21) recentEmojis.pop();
    localStorage.setItem('roomgather_recent_emojis', JSON.stringify(recentEmojis));
    emojiData['🕒'] = recentEmojis;
}

// ---------- emoji picker engine ----------
function setupEmojiPicker() {
    const emojiBtn = document.getElementById('emojiBtn');
    const picker = document.getElementById('emojiPicker');
    const emojiSearch = document.getElementById('emojiSearch');
    const categoriesEl = document.getElementById('emojiCategories');
    const gridEl = document.getElementById('emojiGrid');
    const previewLarge = document.getElementById('previewLargeEmoji');
    const previewName = document.getElementById('previewName');
    const previewShortcode = document.getElementById('previewShortcode');

    function resetPreview() {
        previewLarge.textContent = '☝️';
        previewName.textContent = 'Pick an emoji...';
        previewShortcode.textContent = '';
    }

    function setPreview(em) {
        const meta = emojiMeta[em] || { name: `Emoji (${em})`, code: `:${em.codePointAt(0).toString(16)}:` };
        previewLarge.textContent = em;
        previewName.textContent = meta.name;
        previewShortcode.textContent = meta.code;
    }

    categoriesEl.innerHTML = '';
    categoryIcons.forEach(icon => {
        const btn = document.createElement('button');
        btn.className = 'emoji-cat-btn' + (icon === activeCategory ? ' active' : '');
        btn.textContent = icon;
        btn.title = categoryTitles[icon];
        btn.addEventListener('click', () => {
            activeCategory = icon;
            document.querySelectorAll('.emoji-cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            emojiSearch.value = '';
            renderGrid(emojiData[icon]);
        });
        categoriesEl.appendChild(btn);
    });

    function renderGrid(emojis) {
        gridEl.innerHTML = '';
        const heading = document.createElement('div');
        heading.className = 'emoji-group-title';
        heading.textContent = emojiSearch.value ? 'Search Results' : categoryTitles[activeCategory];
        gridEl.appendChild(heading);
        const wrapper = document.createElement('div');
        wrapper.className = 'emoji-items-wrapper';
        if (emojis.length === 0 && activeCategory === '🕒' && !emojiSearch.value) {
            const placeholder = document.createElement('div');
            placeholder.className = 'emoji-empty-placeholder';
            placeholder.textContent = 'No recent emojis used yet.';
            gridEl.appendChild(placeholder);
            return;
        }
        emojis.forEach(em => {
            const span = document.createElement('span');
            span.className = 'emoji-item';
            span.textContent = em;
            span.addEventListener('pointerenter', () => setPreview(em));
            span.addEventListener('click', () => {
                const input = document.getElementById('messageInput');
                const pos = input.selectionStart;
                const val = input.value;
                input.value = val.slice(0, pos) + em + val.slice(pos);
                input.selectionStart = input.selectionEnd = pos + em.length;
                input.focus();
                updateCharCounter();
                saveRecentEmoji(em);
                picker.style.display = 'none';
                resetPreview();
            });
            wrapper.appendChild(span);
        });
        gridEl.appendChild(wrapper);
    }

    renderGrid(emojiData[activeCategory]);

    emojiSearch.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        if (!term) { renderGrid(emojiData[activeCategory]); return; }
        const all = Object.entries(emojiData)
            .filter(([key]) => key !== '🕒')
            .map(([_, arr]) => arr)
            .flat();
        const filtered = [...new Set(all)].filter(em => {
            const meta = emojiMeta[em];
            const nameMatch = meta?.name.toLowerCase().includes(term);
            const shortcodeMatch = meta?.code.toLowerCase().includes(term);
            return nameMatch || shortcodeMatch || em.includes(term);
        });
        renderGrid(filtered);
    });

    emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = picker.style.display === 'none' || picker.style.display === '';
        if (isHidden) {
            picker.style.display = 'flex';
            emojiSearch.value = '';
            resetPreview();
            renderGrid(emojiData[activeCategory]);
        } else {
            picker.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (picker.style.display === 'flex' && !picker.contains(e.target) && e.target !== emojiBtn) {
            picker.style.display = 'none';
        }
    });
}

// ---------- Settings Panel (no toggle) ----------
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

// ---------- long press detection ----------
let pressTimer = null;
let startX = 0, startY = 0;
const LONG_PRESS_MS = 600;
const MOVE_THRESHOLD = 15;

function cancelLongPress() {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
}

function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0 && e.button !== -1) return;
    const target = e.currentTarget;
    startX = e.clientX; startY = e.clientY;
    pressTimer = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(50);
        const messageId = parseInt(target.getAttribute('data-id'));
        const currentText = messages.find(m => m.id === messageId)?.text || '';
        showMessageMenu(e.clientX, e.clientY, messageId, currentText);
        pressTimer = null;
    }, LONG_PRESS_MS);
}

function onPointerMove(e) {
    if (!pressTimer) return;
    if (Math.abs(e.clientX - startX) > MOVE_THRESHOLD || Math.abs(e.clientY - startY) > MOVE_THRESHOLD) cancelLongPress();
}

function onPointerUp() { cancelLongPress(); }

function blockContextMenu(e) { e.preventDefault(); e.stopPropagation(); return false; }

function attachLongPress() {
    document.querySelectorAll('.message').forEach(div => {
        div.removeEventListener('pointerdown', onPointerDown);
        div.removeEventListener('pointermove', onPointerMove);
        div.removeEventListener('pointerup', onPointerUp);
        div.removeEventListener('contextmenu', blockContextMenu);
        div.addEventListener('contextmenu', blockContextMenu);
        div.addEventListener('pointerdown', onPointerDown);
        div.addEventListener('pointermove', onPointerMove);
        div.addEventListener('pointerup', onPointerUp);
    });
}

function attachScrollCancel() {
    const mc = document.getElementById('messages');
    if (mc) { mc.removeEventListener('scroll', cancelLongPress); mc.addEventListener('scroll', cancelLongPress); }
}

// ---------- context menu with PNG icons ----------
let activeMenu = null;

function showMessageMenu(x, y, messageId, currentText) {
    closeMessageMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.innerHTML = `
        <div class="context-menu-item reply-item" data-id="${messageId}" data-text="${escapeHtml(currentText)}">
            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA1UlEQVRYCe2T2w6EMAhE143//8vd8DBmpCJUUbJJfelFGE6nZWmtfSq/b2VxqT0BpgN/5YD0a3rPRh1IL4z2XzExxscKo54F8HhhAESvAPHpo3YgcvJIDIMuvNBzdmBUWGtZa9E1tRnAEsjaP4R4E0AO0kEwwOldZdmgdfQjBERHSomIoa3d9CxXAuX/psEO7FRuLER8K+DpWABDIkaREIQFAM0MEGgdjh4AkkKnQTCNbp5+hJTbTV2xLiOwEXUgIHUtpBxg5AquHdFpyXIHJsB0oNyBHxP/Ekqg8Pn7AAAAAElFTkSuQmCC" width="20" height="20" alt="Reply">
            Reply
        </div>
        <div class="context-menu-item edit-item" data-id="${messageId}" data-text="${escapeHtml(currentText)}">
            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA4ElEQVRYCcWV0RKEIAhFa2f//5ctmnBuLWIpl+UFlalzwAfXUsryz/gkwqXTn26zBBCM6yVD4AI8J17PMgTWxjUfEkyB2uUu0JKgXYHCNcsQ7hLHnjEBhAoY9yqhOXwCCBO4Bp5XuBQjJ4AQBWM261EC5s+Rvq8vnWstQmAYLhKzAlPwWYFp+IxACHxUIAw+IhAKfysQDn8jQIE/FaDBnwhQ4T0BOtwTSIG3BNLglkAq3BKQMy/MJ9X7oFfD17DXfThc5FDAk6XAUcDrngYXga/TNhWsXEsgBXwXSIUqXPIGi0YkPwZD3GUAAAAASUVORK5CYII=" width="20" height="20" alt="Edit">
            Edit
        </div>
        <div class="context-menu-item copy-item" data-id="${messageId}">
            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAZElEQVRYCe2VMQ4AIAgDxfj/L+PESqAxweFcWDDWIy3m7mvyHOHxl4ptCwKeXkEABMYJKDa0pg1S235DIFXZ/HG0l0iNE0AABCAAAWUXRNJVa5qIjAACEIAABCKK07isZq7SdwHQUwZJdT72MwAAAABJRU5ErkJggg==" width="20" height="20" alt="Copy">
            Copy
        </div>
        <div class="context-menu-item delete-item" data-id="${messageId}">
            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAf0lEQVRYCe2WwQrAIAxD59j//3LFg5BqEYVKdogXraCNLwVbzOxhjpeZvOWmC/gCArc9KZjzlwScQlR7Yx1Z0PNkWxE+jG6BBOwSaP6hh6dxr6tp3hUwHczakAAREAEREAEREIFVT4g/7tgfnsZ4l1vLAjqBVQ1gD+h8ywzoBCqV9glNoY/nKAAAAABJRU5ErkJggg==" width="20" height="20" alt="Delete">
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

    // 1. Inject structural template cleanly inside the text container body
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

    // 2. Set the text value safely and focus
    input.value = originalText;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    
    // 3. Graceful finish logic without breaking your custom DOM context bindings
    const finishEdit = (save) => {
        if (save) {
            const newText = input.value.trim();
            if (newText && newText !== originalText) {
                const msg = messages.find(m => m.id === messageId);
                if (msg) {
                    msg.text = newText;
                    msg.edited = true;
                    saveMessages();
                    displayMessages();
                    return;
                }
            }
        }
        
        // Revert cleanly back to standard text state if cancelled or unchanged
        const editedMark = messages.find(m => m.id === messageId)?.edited ? ' <span class="edited-mark">(edited)</span>' : '';
        msgTextSpan.innerHTML = `${escapeHtml(originalText)}${editedMark}`;
    };
    
    okBtn.addEventListener('click', (e) => { e.stopPropagation(); finishEdit(true); });
    cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); finishEdit(false); });
}

// ---------- add message (supports replies) ----------
function addMessage(text) {
    if (!text.trim()) return;
    const { fullDate, time } = getCurrentFullTimestamp();
    const newMsg = { id: nextId++, text: text.trim(), fullDate, time, edited: false };
    if (pendingReply) {
        newMsg.replyTo = { id: pendingReply.id, text: pendingReply.text };
        cancelReply(); // hide indicator and clear pending
    }
    messages.push(newMsg);
    saveMessages();
    displayMessages();
    const input = document.getElementById('messageInput');
    if (input) { input.value = ''; updateCharCounter(); input.focus(); }
}

// ---------- admin access (long press on version footer) ----------
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

// ---------- send button and Enter key (Shift+Enter = newline, Enter = send) ----------
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
    // No keypress handler – Enter now inserts a newline naturally
}

// ========== TYPING BAR SELECTION MENU (v0.12, works with textarea) ==========
let selectionMenu = null;

const copyIconBase64 = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAZElEQVRYCe2VMQ4AIAgDxfj/L+PESqAxweFcWDDWIy3m7mvyHOHxl4ptCwKeXkEABMYJKDa0pg1S235DIFXZ/HG0l0iNE0AABCAAAWUXRNJVa5qIjAACEIAABCKK07isZq7SdwHQUwZJdT72MwAAAABJRU5ErkJggg==";
const cutIconBase64 = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABNUlEQVRYCc2U2w6DMAxDx7T//2U2I0WKUrtJoIjxQi+Jfeoitn3fX08+7yfN4f2XAHfeyaCtEhgKF1wV1VQA8KMNJ0Gk1gxgFYQ0h0EGcBViaq4ANmyEJxUK9ZiynkFbJTAUCkHieyyVzFGpALB3FqJsngGcgWiZVwA6EG3zKgCDYNeDOv9Ual4f35GMIYhTmjA7sUlYjc3le/YRsiYTXmIOgy5AhAKQQWHPj2MtnV8FoKKdxc43YLo+fj+2/dZ7ZQLt+EHaTSCeOJraflyXqXQSMHETiyZ+34+tnr47AF4gmmOPrfkeOs6uoHwSou57JdwsAS/g9aXYr0jtKa3SjwiiStiDxXGpb5ZAFLxlnn0DMJXxJUSlvlkCLHa2FjlYDVs7+rIEZGN0DfNy3yyBoHnP9HGAL+WZJ01XUsrJAAAAAElFTkSuQmCC";
const pasteIconBase64 = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAn0lEQVRYCe2V0QqAMAhFW/T/v2wJ82Vg3iuFe7AXITY9Hsc2ROSo/M7K4lr7SgBEygaTc3sDa7dod/C+zAhQCGgSLMDaGVTkbdH2Z8Dgs9pDY8wIwmRGOyMEzQBoXijpsw6GZQHgxNNCGFiANuAZSI+GHUG6kHcYyi+iBmgDbaANtAHmLfAeIu+ah/6jAJ8/QkZXfgYiA79ot+41lhu4AU74EFmODzwIAAAAAElFTkSuQmCC";
const selectAllIconBase64 = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAA80lEQVRYCe2VwQoDMQhEm9L//+WUOQyIMY1RQ6CsF9etcV7Upa33/rppH6f4Kcr2dgIcS3sAvDvQimYw7NIMYEgsADAv8ezA9Q7MdsCc18YeuHeIAO4DDogt+Osj+AuArZbrEWY7QHF6XX8ZZwC0qI6X4kiIAlhioS8pAlAmHulAqfgMwBJBrvU+1HYUo+kRUISeeTrG+7Q4ikgALcKYHvm0EnEU438BnlFUi+mYefARG+rJDqDg6mar37ehNMAviHJxiFkAFsQRcQjJHUAsDaKYWUR8mLUsLJ9nHWBORJxnXX4F4CqSSboOwB1wzyxzW+vsFyG+GVKmDpm9AAAAAElFTkSuQmCC";

function createSelectionMenu() {
    if (selectionMenu) selectionMenu.remove();
    const menu = document.createElement('div');
    menu.className = 'selection-menu';
    menu.innerHTML = `
        <div class="selection-menu-item copy-btn">
            <img src="data:image/png;base64,${copyIconBase64}" width="16" height="16" alt="Copy"> Copy
        </div>
        <span class="selection-menu-sep">|</span>
        <div class="selection-menu-item cut-btn">
            <img src="data:image/png;base64,${cutIconBase64}" width="16" height="16" alt="Cut"> Cut
        </div>
        <span class="selection-menu-sep">|</span>
        <div class="selection-menu-item paste-btn">
            <img src="data:image/png;base64,${pasteIconBase64}" width="16" height="16" alt="Paste"> Paste
        </div>
        <span class="selection-menu-sep">|</span>
        <div class="selection-menu-item select-all-btn">
            <img src="data:image/png;base64,${selectAllIconBase64}" width="16" height="16" alt="Select All"> Select All
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
setupSearch();
setupEmojiPicker();
setupSettings();
setupSelectionMenu();
updateCharCounter();
applyFontSize();
displayMessages();