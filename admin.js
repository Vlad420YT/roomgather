const CORRECT_PASSWORD = "Roomgather"; 

const passwordModal = document.getElementById('passwordModal');
const adminContent = document.getElementById('adminContent');
const passwordInput = document.getElementById('adminPassword');
const submitBtn = document.getElementById('passwordSubmitBtn');
const cancelBtn = document.getElementById('passwordCancelBtn');

// Wrong password modal elements
const wrongPasswordModal = document.getElementById('wrongPasswordModal');
const wrongPasswordOkBtn = document.getElementById('wrongPasswordOkBtn');

function showAdminPanel() {
    passwordModal.style.display = 'none';
    adminContent.style.display = 'block';
}

function showWrongPasswordModal() {
    wrongPasswordModal.style.display = 'flex';
}

function closeWrongPasswordModal() {
    wrongPasswordModal.style.display = 'none';
    if (passwordInput) passwordInput.value = '';
}

if (wrongPasswordOkBtn) {
    wrongPasswordOkBtn.addEventListener('click', closeWrongPasswordModal);
}

window.addEventListener('click', (e) => {
    if (e.target === wrongPasswordModal) {
        closeWrongPasswordModal();
    }
});

if (submitBtn) {
    submitBtn.addEventListener('click', () => {
        const entered = passwordInput.value;
        if (entered === CORRECT_PASSWORD) {
            showAdminPanel();
        } else {
            showWrongPasswordModal();
        }
    });
}

if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}

if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitBtn.click();
    });
}

// ------------------- EXPORT CHAT -------------------
function formatMessageForExport(msg) {
    const timestamp = msg.fullDate ? new Date(msg.fullDate) : new Date();
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getDate()).padStart(2, '0');
    const hours = String(timestamp.getHours()).padStart(2, '0');
    const minutes = String(timestamp.getMinutes()).padStart(2, '0');
    const readableDate = `${year}-${month}-${day} ${hours}:${minutes}`;
    const editedMark = msg.edited ? ' (edited)' : '';
    return `[${readableDate}] User: ${msg.text || ''}${editedMark}`;
}

function exportChat() {
    const messages = JSON.parse(localStorage.getItem('roomgather_messages')) || [];
    if (messages.length === 0) {
        alert('No messages to export.');
        return;
    }
    const sorted = [...messages].sort((a, b) => {
        return new Date(a.fullDate || 0) - new Date(b.fullDate || 0);
    });
    const exportText = sorted.map(formatMessageForExport).join('\n');
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `roomgather_export_${Math.floor(Date.now() / 1000)}.txt`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}

// ------------------- CLEAR ALL MODAL (no browser alert) -------------------
const clearAllModal = document.getElementById('clearAllModal');
const clearAllCancelBtn = document.getElementById('clearAllCancelBtn');
const clearAllConfirmBtn = document.getElementById('clearAllConfirmBtn');
const adminClearBtn = document.getElementById('adminClearAllBtn');

function showClearAllModal() { if(clearAllModal) clearAllModal.style.display = 'flex'; }
function closeClearAllModal() { if(clearAllModal) clearAllModal.style.display = 'none'; }

if (adminClearBtn) adminClearBtn.addEventListener('click', showClearAllModal);
if (clearAllCancelBtn) clearAllCancelBtn.addEventListener('click', closeClearAllModal);

if (clearAllConfirmBtn) {
    clearAllConfirmBtn.addEventListener('click', () => {
        localStorage.removeItem('roomgather_messages');
        closeClearAllModal();
        // Removed alert('All messages cleared.');
    });
}

window.addEventListener('click', (e) => { 
    if (clearAllModal && e.target === clearAllModal) closeClearAllModal(); 
});

// ------------------- BACK BUTTON -------------------
const backBtn = document.getElementById('backToChatBtn');
if (backBtn) {
    backBtn.addEventListener('click', () => { window.location.href = 'index.html'; });
}

// ------------------- ATTACH EXPORT HANDLER -------------------
const exportBtn = document.getElementById('adminExportBtn');
if (exportBtn) {
    exportBtn.addEventListener('click', exportChat);
}