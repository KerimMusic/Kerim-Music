/* ============================================================
   CONFIGURACIÓN DE FIREBASE (TUS CREDENCIALES REALES)
   ============================================================ */
const firebaseConfig = {
    apiKey: "AIzaSyDMabE70hIApcNU5RY3_WEEIF-BWUzO0K4",
    authDomain: "kerim-music-a9c46.firebaseapp.com",
    projectId: "kerim-music-a9c46",
    storageBucket: "kerim-music-a9c46.firebasestorage.app",
    messagingSenderId: "470731440209",
    appId: "1:470731440209:web:f6eba4784027a5d8c57870",
    measurementId: "G-LBHTKL8KDK"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

/* ============================================================
   0. AUTENTICACIÓN OBLIGATORIA CON GOOGLE
   ============================================================ */
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const authGate      = document.getElementById('auth-gate');
const authBtn       = document.getElementById('auth-google-btn');
const authErrorEl   = document.getElementById('auth-gate-error');
const appContainer  = document.querySelector('.app-container');

function showAuthGate() {
    if (authGate) {
        authGate.classList.remove('hidden');
        authGate.setAttribute('aria-hidden', 'false');
    }
    if (appContainer) appContainer.classList.add('auth-locked');
    document.body.style.overflow = 'hidden';
}

function hideAuthGate() {
    if (authGate) {
        authGate.classList.add('hidden');
        authGate.setAttribute('aria-hidden', 'true');
    }
    if (appContainer) appContainer.classList.remove('auth-locked');
    document.body.style.overflow = '';
}

function setAuthError(msg) {
    if (authErrorEl) authErrorEl.textContent = msg || '';
}

showAuthGate();

auth.onAuthStateChanged((user) => {
    if (user) {
        window.__currentUser = user;
        console.log('✅ Sesión iniciada:', user.email, '| UID:', user.uid);
        hideAuthGate();
    } else {
        window.__currentUser = null;
        console.log('🔒 Sin sesión. App bloqueada.');
        showAuthGate();
    }
});

if (authBtn) {
    authBtn.addEventListener('click', async () => {
        setAuthError('');
        authBtn.disabled = true;
        const originalHTML = authBtn.innerHTML;
        authBtn.innerHTML = '<span>Conectando…</span>';
        try {
            await auth.signInWithPopup(googleProvider);
        } catch (err) {
            console.error('Error al iniciar sesión:', err);
            let msg = 'No se pudo iniciar sesión. Intenta de nuevo.';
            if (err && err.code === 'auth/popup-closed-by-user')        msg = 'Cancelaste el inicio de sesión.';
            else if (err && err.code === 'auth/popup-blocked')           msg = 'Permite las ventanas emergentes para iniciar sesión.';
            else if (err && err.code === 'auth/network-request-failed')  msg = 'Sin conexión. Revisa tu internet.';
            else if (err && err.code === 'auth/unauthorized-domain')     msg = 'Dominio no autorizado en Firebase. Revisa la consola.';
            else if (err && err.code === 'auth/cancelled-popup-request') msg = 'Ya hay una ventana de login abierta.';
            setAuthError(msg);
        } finally {
            authBtn.disabled = false;
            authBtn.innerHTML = originalHTML;
        }
    });
}
/* ---------- FIN AUTENTICACIÓN ---------- */

/* ============================================================
   1. DATOS GLOBALES Y UTILIDADES
   ============================================================ */
let firebaseDocsCache = [];
window.__showAllSongs = false;
window.__omegaShuffleOn = true;

function normalizeStr(str) {
    return String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

function findFirebaseDoc(songTitle) {
    if (!songTitle || !firebaseDocsCache.length) return null;
    const nTitle = normalizeStr(songTitle);
    if (!nTitle) return null;
    for (const doc of firebaseDocsCache) {
        if (normalizeStr(doc.id) === nTitle) return doc;
    }
    for (const doc of firebaseDocsCache) {
        const nId = normalizeStr(doc.id);
        if (nId && (nId.includes(nTitle) || nTitle.includes(nId))) return doc;
    }
    const prefix = nTitle.substring(0, Math.min(nTitle.length, 6));
    if (prefix.length >= 4) {
        for (const doc of firebaseDocsCache) {
            if (normalizeStr(doc.id).startsWith(prefix)) return doc;
        }
    }
    return null;
}

async function cargarDocsDeFirebase() {
    try {
        const snap = await db.collection('Radio_Muisc').get();
        firebaseDocsCache = snap.docs.map(d => ({
            id: d.id,
            ref: d.ref,
            data: d.data() || {}
        }));
        console.log(`🔥 Firebase: ${firebaseDocsCache.length} canciones cargadas`);
    } catch (e) {
        console.warn('⚠️ No se pudieron cargar docs de Firebase:', e);
    }
}

function pintarReproducciones(item, count) {
    if (!item) return;
    const info = item.querySelector('.item-info');
    if (!info) return;
    let badge = info.querySelector('.item-plays');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'item-plays';
        info.appendChild(badge);
    }
    badge.textContent = `▶ ${count}`;
}

function pintarTodasLasReproducciones() {
    document.querySelectorAll('.playlist-item').forEach(item => {
        const title = item.querySelector('.item-title')?.textContent.trim() || '';
        const doc = findFirebaseDoc(title);
        if (doc) pintarReproducciones(item, doc.data.reproducciones || 0);
    });
}

async function cambiarReproducciones(item, delta) {
    if (!item || !delta) return;
    const title = item.querySelector('.item-title')?.textContent.trim() || '';
    const doc = findFirebaseDoc(title);
    if (!doc) return;
    try {
        await doc.ref.update({
            reproducciones: firebase.firestore.FieldValue.increment(delta)
        });
        const nuevo = Math.max(0, (doc.data.reproducciones || 0) + delta);
        doc.data.reproducciones = nuevo;
        pintarReproducciones(item, nuevo);
    } catch (e) {
        console.warn('No se pudo actualizar reproducciones:', e);
    }
}

window.__artistFilter = null;
window.__artistFilterName = '';

function clearArtistFilter() {
    window.__artistFilter = null;
    window.__artistFilterName = '';
    document.dispatchEvent(new CustomEvent('omega:artistmode', { detail: { active: false } }));
}

function setArtistFilter(items, name) {
    if (!items || !items.length) return;
    window.__artistFilter = items.slice();
    window.__artistFilterName = name || '';
    document.dispatchEvent(new CustomEvent('omega:artistmode', {
        detail: { active: true, name: name || '' }
    }));
}

/* ============================================================
   2. ANUNCIOS
   ============================================================ */
const ADS = [
  { id: 'ad9', url: 'https://www.dropbox.com/scl/fi/l41bs2ooxh6ccnewgnvd1/1785466259517.png?rlkey=czf0bcn58v0irh5qdfeg9tnef&st=pbd0d7v5&raw=1', title: 'Anuncio 9', category: 'ANUNCIO', music: 'https://www.dropbox.com/scl/fi/9tsc6vvge3ukcao3w8hiy/elimina-basura-spotyfi.mp3?rlkey=pogumn7wjmhepbtocb16km25w&st=3oh3m9tu&raw=1', isAd: true },
  { id: 'ad8', url: 'https://www.dropbox.com/scl/fi/zstw4ykjmjh3ljzejuwk5/Anuncio.png?rlkey=pumuamhvcw40nas5biyyrizvo&st=ku13lu66&raw=1', title: 'Anuncio 8', category: 'ANUNCIO', music: 'https://www.dropbox.com/scl/fi/63czt3npjdkz54trajxdf/Presentacion-de-isco-Dany-Zm.wav?rlkey=q7caesruijhiuiil7map3oecn&st=326tvf8c&raw=1', isAd: true },
  { id: 'ad7', url: 'https://www.dropbox.com/scl/fi/zstw4ykjmjh3ljzejuwk5/Anuncio.png?rlkey=pumuamhvcw40nas5biyyrizvo&st=ku13lu66&raw=1', title: 'Anuncio 7', category: 'ANUNCIO', music: 'https://www.dropbox.com/scl/fi/ymz00x4bk0arik8vapgnd/11-de-abril-de-2026.mp3?rlkey=hafgkwkgt6tgyrryodqz2c6fy&st=p5vsj82t&raw=1', isAd: true },
  { id: 'ad6b', url: 'https://www.dropbox.com/scl/fi/7myjpayd9cocf2of9srrj/Cris-Znchez.jpg?rlkey=eqarykexb089abzkacqgbarsl&st=l7cxp9cf&raw=1', title: 'Anuncio Cris', category: 'ANUNCIO', music: 'https://www.dropbox.com/scl/fi/w8ynapsg34o119wnye6el/Auncio-cris-sanches_.mp3?rlkey=pr73mrdydh12tzu1jyreb4pqo&st=u5ewfxwg&raw=1', isAd: true },
  { id: 'ad1', url: 'https://www.dropbox.com/scl/fi/zstw4ykjmjh3ljzejuwk5/Anuncio.png?rlkey=pumuamhvcw40nas5biyyrizvo&st=ku13lu66&raw=1', title: 'Anuncio 1', category: 'ANUNCIO', music: 'https://www.dropbox.com/scl/fi/z3fbqqzthhvvqt9275lc7/2-tema-grabados_1783188240865.mp3?rlkey=7v6ha18uxps052z43rty0d5jr&st=sam7gv97&raw=1', isAd: true },
  { id: 'ad2', url: 'https://www.dropbox.com/scl/fi/zstw4ykjmjh3ljzejuwk5/Anuncio.png?rlkey=pumuamhvcw40nas5biyyrizvo&st=ku13lu66&raw=1', title: 'Anuncio 2', category: 'ANUNCIO', music: 'https://www.dropbox.com/scl/fi/xgl19r2bd49n5cdup93f4/Escucha-sin-anusios_1783188103278.mp3?rlkey=00usrx9c68td9pkqw6o2x1qct&st=4ck7wlz8&raw=1', isAd: true },
  { id: 'ad3', url: '', title: 'Anuncio 3', category: 'ANUNCIO', music: '', video: 'https://www.dropbox.com/scl/fi/5hvqucrjyjotpjge1wpei/AQPEGQdoqPKVT4eHsCxScmq2Pgjwlze7l6aPYix_phWROLbabx1WiKmXH3GA8eDVa8AyecSArdrF9I_wbvUT5XaZ9cJVWSAHpGXci6nOD_T-Eg.mp4?rlkey=29tg1m9o3zgvlrgz1bskg7dzj&st=pmeqma9m&raw=1', isAd: true },
  { id: 'ad6', url: '', title: 'Anuncio 6', category: 'ANUNCIO', music: '', video: 'https://www.dropbox.com/scl/fi/n4nhc00dzenwsoj0t0mud/El-placoso-de-la-L.mp4?rlkey=tde69aczhy3rhxit16xyu3ewx&st=sf47qwl2&raw=1', isAd: true },
  { id: 'ad4', url: 'https://www.dropbox.com/scl/fi/zstw4ykjmjh3ljzejuwk5/Anuncio.png?rlkey=pumuamhvcw40nas5biyyrizvo&st=ku13lu66&raw=1', title: 'Anuncio 4', category: 'ANUNCIO', music: 'https://www.dropbox.com/scl/fi/vl4d6mwau9frvxmjm6wwn/Baner.mp3?rlkey=z8jezojlzlyt0i3qp16jrvid9&st=tdb7ne0h&raw=1', isAd: true }
];

/* ============================================================
   3. REPRODUCTOR PRINCIPAL
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

    const playButton     = document.getElementById('play-button');
    const playIcon       = document.getElementById('play-icon');
    const audioPlayer    = document.getElementById('audio-player');
    const progressBar    = document.getElementById('progress-bar');
    const currentTimeEl  = document.getElementById('current-time');
    const durationEl     = document.getElementById('duration');
    const playerTitle    = document.getElementById('player-title');
    const playerCover    = document.getElementById('player-cover');
    const player         = document.getElementById('player');
    const playlist       = document.getElementById('playlist');

    if (!audioPlayer || !playlist) return;

    let currentItem = null;
    let isSkipping  = false;

    const ICON_PLAY  = '<polygon points="5,3 19,12 5,21" fill="#ffffff" />';
    const ICON_PAUSE = '<rect x="6" y="4" width="4" height="16" fill="#ffffff" />' +
                       '<rect x="14" y="4" width="4" height="16" fill="#ffffff" />';

    function haptic(ms) {
        if (navigator.vibrate) {
            try { navigator.vibrate(ms || 12); } catch (_) {}
        }
    }

    function attachRipple(el, options) {
        if (!el || el.dataset.rippleReady === '1') return;
        el.dataset.rippleReady = '1';
        if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
        el.classList.add('ripple-host');
        el.addEventListener('pointerdown', (e) => {
            const rect = el.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = (e.clientX || rect.left + rect.width / 2) - rect.left;
            const y = (e.clientY || rect.top + rect.height / 2) - rect.top;
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.width  = ripple.style.height = size + 'px';
            ripple.style.left   = (x - size / 2) + 'px';
            ripple.style.top    = (y - size / 2) + 'px';
            el.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove());
        });
        el.addEventListener('pointerdown', () => haptic(options && options.haptic), { passive: true });
    }

    ['.menu-btn', '.heart-search-btn', '.share-btn', '.close-submenu',
     '.submenu-link', '.play-button'].forEach(selector => {
        document.querySelectorAll(selector).forEach(el => attachRipple(el));
    });

    document.querySelectorAll('.playlist-item').forEach(el => {
        attachRipple(el, { haptic: 0 });
        el.style.setProperty('--ripple-color', 'rgba(255, 255, 255, 0.10)');
    });

    function formatTime(seconds) {
        if (!isFinite(seconds) || seconds < 0) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs    = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function updateProgress(percent) {
        if (!progressBar) return;
        const value = Math.min(100, Math.max(0, percent));
        progressBar.style.setProperty('--progress', `${value}%`);
        progressBar.setAttribute('aria-valuenow', Math.round(value));
    }

    function updateIcon(playing) {
        if (!playIcon || !playButton) return;
        playIcon.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
        playIcon.style.marginLeft = playing ? '0' : '3px';
        playButton.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
    }

    function getAllItems() {
        return Array.from(playlist.querySelectorAll('.playlist-item'));
    }

    function isShuffleOn() {
        return window.__omegaShuffleOn !== false;
    }

    function getItemTitle(item) {
        if (!item) return '';
        return item.querySelector('.item-title')?.textContent.trim() || item.dataset.title?.trim() || '';
    }

    function getItemCover(item) {
        if (!item) return '';
        const img = item.querySelector('.thumbnail img');
        if (img && img.getAttribute('src')) return img.src;
        return item.dataset.cover || '';
    }

    function getCandidateItems() {
        const all = getAllItems();
        if (window.__artistFilter && window.__artistFilter.length) {
            const filtered = all.filter(i => window.__artistFilter.includes(i));
            if (filtered.length) return filtered;
        }
        return all;
    }

    function loadItem(item, autoplay = true) {
        if (!item) return;
        const src   = item.dataset.src;
        const cover = getItemCover(item);
        const title = getItemTitle(item);
        if (!src) { handleLoadError(item); return; }

        getAllItems().forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        currentItem = item;
        if (playerCover) {
            if (cover) playerCover.src = cover;
            else       playerCover.removeAttribute('src');
        }
        if (playerTitle) playerTitle.textContent = title;
        if (player) player.classList.add('active');

        audioPlayer.src = src;
        audioPlayer.currentTime = 0;
        updateProgress(0);
        if (currentTimeEl) currentTimeEl.textContent = '0:00';
        if (durationEl)    durationEl.textContent    = '0:00';

        if (autoplay) {
            audioPlayer.play().catch(err => {
                console.warn('No se pudo iniciar automáticamente:', err);
            });
        }
    }

    function handleLoadError(failedItem) {
        if (isSkipping) return;
        isSkipping = true;
        updateIcon(false);
        updateProgress(0);
        if (currentTimeEl) currentTimeEl.textContent = '0:00';
        if (durationEl)    durationEl.textContent    = '0:00';
        setTimeout(() => {
            isSkipping = false;
            playRandomItem();
        }, 300);
    }

    audioPlayer.addEventListener('error', () => handleLoadError(currentItem));

    function playRandomItem() {
        const items = getCandidateItems();
        if (!items.length) return;
        if (!isShuffleOn()) {
            let startIdx = 0;
            if (currentItem) {
                const idx = items.indexOf(currentItem);
                if (idx !== -1) startIdx = (idx + 1) % items.length;
            }
            loadItem(items[startIdx], true);
            return;
        }
        let candidates = items;
        if (items.length > 1 && currentItem && items.includes(currentItem)) {
            candidates = items.filter(i => i !== currentItem);
        }
        if (!candidates.length) candidates = items;
        const randomItem = candidates[Math.floor(Math.random() * candidates.length)];
        loadItem(randomItem, true);
    }

    function goNextItem() {
        const items = getCandidateItems();
        if (!items.length) return;
        if (isShuffleOn()) {
            let candidates = items;
            if (items.length > 1 && currentItem && items.includes(currentItem)) {
                candidates = items.filter(i => i !== currentItem);
            }
            if (!candidates.length) candidates = items;
            const randomItem = candidates[Math.floor(Math.random() * candidates.length)];
            loadItem(randomItem, true);
            return;
        }
        let idx = items.indexOf(currentItem);
        if (idx === -1) idx = 0;
        loadItem(items[(idx + 1) % items.length], true);
    }

    function goPrevItem() {
        const items = getCandidateItems();
        if (!items.length) return;
        if (isShuffleOn()) {
            let candidates = items;
            if (items.length > 1 && currentItem && items.includes(currentItem)) {
                candidates = items.filter(i => i !== currentItem);
            }
            if (!candidates.length) candidates = items;
            const randomItem = candidates[Math.floor(Math.random() * candidates.length)];
            loadItem(randomItem, true);
            return;
        }
        let idx = items.indexOf(currentItem);
        if (idx === -1) idx = 0;
        loadItem(items[(idx - 1 + items.length) % items.length], true);
    }

    document.addEventListener('omega:next', () => goNextItem());
    document.addEventListener('omega:prev', () => goPrevItem());

    playButton.addEventListener('click', () => {
        if (!currentItem) { playRandomItem(); return; }
        if (audioPlayer.paused) {
            audioPlayer.play().catch(err => console.error('Error al reproducir:', err));
        } else {
            audioPlayer.pause();
        }
    });

    audioPlayer.addEventListener('play',  () => updateIcon(true));
    audioPlayer.addEventListener('pause', () => updateIcon(false));

    audioPlayer.addEventListener('loadedmetadata', () => {
        if (durationEl) durationEl.textContent = formatTime(audioPlayer.duration);
    });

    audioPlayer.addEventListener('timeupdate', () => {
        if (currentTimeEl) currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        if (audioPlayer.duration > 0) {
            updateProgress((audioPlayer.currentTime / audioPlayer.duration) * 100);
        }
    });

    audioPlayer.addEventListener('ended', async (e) => {
        if (e.defaultPrevented) return;
        const duration  = audioPlayer.duration;
        const played    = audioPlayer.currentTime;
        const completed = !!duration && isFinite(duration) && played >= (duration - 1.5);

        updateIcon(false);
        updateProgress(0);
        if (currentTimeEl) currentTimeEl.textContent = '0:00';

        if (completed && currentItem) {
            const key = getItemKey(currentItem);
            if (key) {
                const data = getLikeData(key);
                const alreadyLiked = !!(data && data.liked !== false);
                if (alreadyLiked) {
                    setLikeData(key, { liked: true, ts: Date.now(), locked: true });
                } else {
                    setLikeData(key, { liked: true, ts: Date.now(), locked: true });
                    updateLikeUI();
                    await cambiarReproducciones(currentItem, 1);
                }
            }
        }
        playRandomItem();
    });

    progressBar && progressBar.addEventListener('click', (e) => {
        if (!audioPlayer.duration) return;
        const rect  = progressBar.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        audioPlayer.currentTime = Math.min(1, Math.max(0, ratio)) * audioPlayer.duration;
    });

    playlist.addEventListener('click', (e) => {
        const item = e.target.closest('.playlist-item');
        if (!item) return;
        if (window.__artistFilter && window.__artistFilter.length) {
            if (!window.__artistFilter.includes(item)) clearArtistFilter();
        }
        loadItem(item, true);
    });

    const coverObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            const img  = mutation.target;
            const item = img.closest('.playlist-item');
            if (!item) return;
            if (item === currentItem) {
                const newSrc = img.getAttribute('src') || '';
                if (playerCover) {
                    if (newSrc) playerCover.src = newSrc;
                    else        playerCover.removeAttribute('src');
                }
            }
        });
    });

    getAllItems().forEach(item => {
        const img = item.querySelector('.thumbnail img');
        if (img) coverObserver.observe(img, { attributes: true, attributeFilter: ['src'] });
    });

    /* BUSCADOR */
    const heartSearchBtn  = document.getElementById('heart-search-btn');
    const searchContainer = document.getElementById('search-container');
    const searchInput     = document.getElementById('search-input');

    function applySearchVisibility() {
        const q = (searchInput?.value || '').toLowerCase().trim();
        const items = document.querySelectorAll('.playlist-item');
        items.forEach(item => {
            if (!q) {
                item.style.display = window.__showAllSongs ? 'flex' : 'none';
                return;
            }
            const title    = item.querySelector('.item-title')?.textContent.toLowerCase() || '';
            const subtitle = item.querySelector('.item-subtitle')?.textContent.toLowerCase() || '';
            item.style.display = (title.includes(q) || subtitle.includes(q)) ? 'flex' : 'none';
        });
    }
    window.__applySearchVisibility = applySearchVisibility;

    if (heartSearchBtn && searchContainer && searchInput) {
        heartSearchBtn.addEventListener('click', () => {
            searchContainer.classList.toggle('visible');
            if (searchContainer.classList.contains('visible')) {
                searchInput.focus();
            } else {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
            }
        });
        searchInput.addEventListener('input', applySearchVisibility);
    }

    /* COMPARTIR */
    const shareBtn = document.getElementById('share-btn');
    const SHARE_URL = 'https://kerimmusic.github.io/DescargarAppOmegaBeats/';

    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const currentTitle = currentItem ? getItemTitle(currentItem) : document.title;
            const shareData = {
                title: 'Omega Beats',
                text:  currentTitle ? `Escucha este beat: ${currentTitle}` : 'Escucha Omega Beats',
                url:   SHARE_URL
            };
            if (navigator.share) {
                navigator.share(shareData).catch((error) => console.log('Error al compartir:', error));
            } else {
                const textToCopy = `${shareData.text}\n${SHARE_URL}`;
                navigator.clipboard.writeText(textToCopy).then(() => {
                    alert('¡Enlace y título copiados al portapapeles!');
                }).catch(err => {
                    alert('No se pudo compartir. Copia este enlace: ' + SHARE_URL);
                });
            }
        });
    }

    /* MENÚ */
    const menuBtn         = document.getElementById('menu-btn');
    const submenu         = document.getElementById('submenu');
    const submenuOverlay  = document.getElementById('submenu-overlay');
    const closeSubmenuBtn = document.getElementById('close-submenu');

    function openSubmenu() {
        if (!submenu || !submenuOverlay) return;
        submenu.classList.add('visible');
        submenuOverlay.classList.add('visible');
        submenu.setAttribute('aria-hidden', 'false');
    }
    function closeSubmenu() {
        if (!submenu || !submenuOverlay) return;
        submenu.classList.remove('visible');
        submenuOverlay.classList.remove('visible');
        submenu.setAttribute('aria-hidden', 'true');
    }

    if (menuBtn)         menuBtn.addEventListener('click', openSubmenu);
    if (closeSubmenuBtn) closeSubmenuBtn.addEventListener('click', closeSubmenu);
    if (submenuOverlay)  submenuOverlay.addEventListener('click', closeSubmenu);

    document.querySelectorAll('.submenu-link').forEach(link => {
        link.addEventListener('click', closeSubmenu);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeSubmenu();
    });

    /* FULLSCREEN PLAYER */
    if (!player || !playerCover || !playerTitle || !playButton) return;

    const fsHTML = `
        <div class="fs-player" id="fs-player" aria-hidden="true">
            <div class="fs-bg" id="fs-bg"></div>
            <div class="fs-top-bar">
                <button class="fs-close" id="fs-close" aria-label="Cerrar">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
                         stroke="#ffffff" stroke-width="2.4" stroke-linecap="round">
                        <line x1="6" y1="6"  x2="18" y2="18"/>
                        <line x1="18" y1="6" x2="6"  y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="fs-content" id="fs-content">
                <div class="fs-vinyl-wrap" id="fs-vinyl-wrap">
                    <div class="fs-vinyl" id="fs-vinyl">
                        <img class="fs-cover" id="fs-cover" alt="Portada">
                    </div>
                    <span class="fs-spindle"></span>
                </div>
                <h2 class="fs-title" id="fs-title">Título del Beat</h2>
                <div class="fs-actions">
                    <button class="fs-like" id="fs-like" type="button" aria-label="Me gusta">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                        </svg>
                        <span>Me Gusta</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', fsHTML);

    const fsPlayer   = document.getElementById('fs-player');
    const fsBg       = document.getElementById('fs-bg');
    const fsContent  = document.getElementById('fs-content');
    const fsVinyl    = document.getElementById('fs-vinyl');
    const fsCover    = document.getElementById('fs-cover');
    const fsTitle    = document.getElementById('fs-title');
    const fsClose    = document.getElementById('fs-close');
    const fsLikeBtn  = document.getElementById('fs-like');

    const LIKES_KEY    = 'omega_likes_v1';
    const LIKE_LOCK_MS = 30 * 24 * 60 * 60 * 1000;

    function _readMap(key) {
        try { return JSON.parse(localStorage.getItem(key) || '{}'); }
        catch (_) { return {}; }
    }
    function _writeMap(key, map) {
        try { localStorage.setItem(key, JSON.stringify(map)); } catch (_) {}
    }
    function getItemKey(item) {
        if (!item) return '';
        return normalizeStr(item.querySelector('.item-title')?.textContent.trim() || '');
    }
    function getLikeData(key) {
        if (!key) return null;
        const likes = _readMap(LIKES_KEY);
        const val = likes[key];
        if (val === undefined || val === null || val === false) return null;
        if (val === true) return { liked: true, ts: 0, locked: false };
        if (typeof val === 'object') return val;
        return null;
    }
    function isLikeLocked(key) {
        const data = getLikeData(key);
        if (!data || !data.locked) return false;
        return (Date.now() - (data.ts || 0)) < LIKE_LOCK_MS;
    }
    function setLikeData(key, data) {
        if (!key) return;
        const likes = _readMap(LIKES_KEY);
        likes[key] = data;
        _writeMap(LIKES_KEY, likes);
    }
    function removeLikeData(key) {
        if (!key) return;
        const likes = _readMap(LIKES_KEY);
        delete likes[key];
        _writeMap(LIKES_KEY, likes);
    }
    function showNotification(message) {
        let toast = document.getElementById('omega-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'omega-toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.remove('visible');
        void toast.offsetWidth;
        toast.classList.add('visible');
        clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(() => toast.classList.remove('visible'), 4500);
    }
    function updateLikeUI() {
        if (!fsLikeBtn) return;
        const key = getItemKey(currentItem);
        if (!key) { fsLikeBtn.classList.remove('active'); return; }
        const data = getLikeData(key);
        const isLiked = !!(data && data.liked !== false);
        fsLikeBtn.classList.toggle('active', isLiked);
    }
    fsLikeBtn && fsLikeBtn.addEventListener('click', async () => {
        if (!currentItem) return;
        const key = getItemKey(currentItem);
        if (!key) return;
        if (isLikeLocked(key)) {
            showNotification('No puedes manipular el botón de Me gusta durante 30 días. ¡Disfrútala!');
            return;
        }
        const data = getLikeData(key);
        if (data && data.liked !== false) {
            removeLikeData(key);
            updateLikeUI();
            await cambiarReproducciones(currentItem, -1);
        } else {
            setLikeData(key, { liked: true, ts: Date.now(), locked: true });
            updateLikeUI();
            await cambiarReproducciones(currentItem, 1);
        }
    });

    let lastCoverSrc = '';
    function syncFromMini() {
        const newCover = playerCover.getAttribute('src') || '';
        const newTitle = (playerTitle.textContent || '').trim() || 'Título del Beat';
        if (newCover && newCover !== lastCoverSrc) {
            fsCover.src = newCover;
            fsBg.style.backgroundImage = `url("${newCover}")`;
            lastCoverSrc = newCover;
        } else if (!newCover) {
            fsCover.removeAttribute('src');
            fsBg.style.backgroundImage = '';
            lastCoverSrc = '';
        }
        fsTitle.textContent = newTitle;
        updateLikeUI();
    }
    const syncObserver = new MutationObserver(() => syncFromMini());
    syncObserver.observe(playerCover, { attributes: true, attributeFilter: ['src'] });
    syncObserver.observe(playerTitle, { childList: true, characterData: true, subtree: true });

    function updateVinylState() {
        if (audioPlayer.paused) fsVinyl.classList.remove('playing');
        else                    fsVinyl.classList.add('playing');
    }
    audioPlayer.addEventListener('play',  updateVinylState);
    audioPlayer.addEventListener('pause', updateVinylState);
    audioPlayer.addEventListener('ended', updateVinylState);

    function openFullscreen() {
        if (!playlist.querySelector('.playlist-item.active')) playButton.click();
        syncFromMini();
        setTimeout(syncFromMini, 120);
        setTimeout(syncFromMini, 400);
        fsPlayer.classList.add('visible');
        fsPlayer.setAttribute('aria-hidden', 'false');
        updateVinylState();
    }
    function closeFullscreen() {
        fsPlayer.classList.remove('visible');
        fsPlayer.setAttribute('aria-hidden', 'true');
    }
    fsClose && fsClose.addEventListener('click', closeFullscreen);

    function attachGesture(el, onGesture) {
        el.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (e.target.closest('button')) return;
            const sx = e.clientX, sy = e.clientY, st = Date.now();
            const target = e.target;
            const pid = e.pointerId;
            function onUp(e2) {
                if (e2.pointerId !== pid) return;
                document.removeEventListener('pointerup', onUp);
                document.removeEventListener('pointercancel', onCancel);
                onGesture({ dx: e2.clientX - sx, dy: e2.clientY - sy, dt: Date.now() - st, target });
            }
            function onCancel(e2) {
                if (e2.pointerId !== pid) return;
                document.removeEventListener('pointerup', onUp);
                document.removeEventListener('pointercancel', onCancel);
            }
            document.addEventListener('pointerup', onUp);
            document.addEventListener('pointercancel', onCancel);
        });
    }

    attachGesture(player, ({ dx, dy, dt, target }) => {
        const absX = Math.abs(dx), absY = Math.abs(dy);
        const onProgress = target && target.closest && target.closest('#progress-bar');
        if (!onProgress && dt < 400 && absX < 12 && absY < 12) { openFullscreen(); return; }
        if (dt > 800) return;
        if (absY > 40 && absY > absX * 1.2 && dy < 0) openFullscreen();
    });

    attachGesture(fsPlayer, ({ dx, dy, dt, target }) => {
        const absX = Math.abs(dx), absY = Math.abs(dy);
        const onVinyl = target && target.closest && target.closest('.fs-vinyl-wrap');
        if (onVinyl && dt < 400 && absX < 12 && absY < 12) { playButton.click(); return; }
        if (dt > 1200) return;
        if (absY > 50 && absY > absX * 1.3) {
            if (dy < 0) goNextItem();
            else        goPrevItem();
        }
    });

    function animateSlide(direction) {
        fsContent.style.transition = 'none';
        fsContent.style.transform  = direction === 'up' ? 'translateY(30px)' : 'translateY(-30px)';
        fsContent.style.opacity    = '0';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                fsContent.style.transition = 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.32s ease';
                fsContent.style.transform  = 'translateY(0)';
                fsContent.style.opacity    = '1';
            });
        });
    }
    function resetVinylSpin() {
        fsVinyl.style.animation = 'none';
        void fsVinyl.offsetHeight;
        fsVinyl.style.animation = '';
        updateVinylState();
    }
    function goNext() { animateSlide('up');   goNextItem(); setTimeout(resetVinylSpin, 60); }
    function goPrev() { animateSlide('down'); goPrevItem(); setTimeout(resetVinylSpin, 60); }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && fsPlayer.classList.contains('visible')) closeFullscreen();
    });

    (function initFsTitleArtistLink() {
        if (!fsTitle || !playlist) return;
        fsTitle.style.cursor = 'pointer';
        fsTitle.style.pointerEvents = 'auto';
        fsTitle.style.touchAction = 'manipulation';
        fsTitle.setAttribute('role', 'button');
        fsTitle.setAttribute('tabindex', '0');
        const COLLAB_SPLIT = /\s+(?:ft\.?|feat\.?|featuring|con|&)\s+/i;
        function getArtistFromActiveItem() {
            const activeItem = playlist.querySelector('.playlist-item.active');
            if (!activeItem) return '';
            const sub = activeItem.querySelector('.item-subtitle')?.textContent || '';
            const idx = sub.indexOf('·');
            const namePart = (idx === -1 ? sub : sub.slice(0, idx)).trim();
            if (!namePart) return '';
            const first = (namePart.split(COLLAB_SPLIT)[0] || namePart).trim();
            return first || namePart;
        }
        function openArtistFromTitle() {
            const artistName = getArtistFromActiveItem();
            if (!artistName) return;
            if (typeof window.__openArtistProfile !== 'function') return;
            closeFullscreen();
            setTimeout(() => window.__openArtistProfile(artistName), 80);
        }
        fsTitle.addEventListener('click', openArtistFromTitle);
        fsTitle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openArtistFromTitle();
            }
        });
        fsTitle.addEventListener('pointerdown', () => { fsTitle.style.opacity = '0.7'; });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt => {
            fsTitle.addEventListener(evt, () => { fsTitle.style.opacity = ''; });
        });
    })();

    (async () => {
        await cargarDocsDeFirebase();
        pintarTodasLasReproducciones();
        if (typeof window.__applySearchVisibility === 'function') {
            window.__applySearchVisibility();
        }
    })();
});

/* ============================================================
   4. GESTOR DE ANUNCIOS
   ============================================================ */
(function () {
    'use strict';
    function init() {
        var audioPlayer = document.getElementById('audio-player');
        if (!audioPlayer) return;
        if (typeof ADS === 'undefined' || !Array.isArray(ADS) || !ADS.length) return;

        var BEATS_PER_AD = 6;
        var SKIP_DELAY   = 5;
        var beatPlayCount = 0;
        var lastSrc = '';
        var isAdPlaying = false;
        var adIndex = 0;
        var adOnComplete = null;
        var currentAdMedia = null;
        var countdownInterval = null;
        var adTimeout = null;
        var originalPlay = audioPlayer.play.bind(audioPlayer);

        var overlay = document.createElement('div');
        overlay.id = 'ad-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML =
            '<div class="ad-inner">' +
                '<div class="ad-label">ANUNCIO</div>' +
                '<div class="ad-media"></div>' +
                '<button class="ad-skip" type="button" disabled>' +
                    'Saltar anuncio (<span class="ad-countdown">' + SKIP_DELAY + '</span>)' +
                '</button>' +
            '</div>';
        document.body.appendChild(overlay);

        var adMedia = overlay.querySelector('.ad-media');
        var adSkip  = overlay.querySelector('.ad-skip');

        audioPlayer.play = function () {
            if (isAdPlaying) return Promise.resolve();
            var src = audioPlayer.src;
            var isNewBeat = src && src !== lastSrc;
            if (isNewBeat) {
                lastSrc = src;
                if (beatPlayCount >= BEATS_PER_AD) {
                    beatPlayCount = 0;
                    showAd(function () { originalPlay().catch(function () {}); });
                    return Promise.resolve();
                }
                beatPlayCount++;
            }
            return originalPlay();
        };

        function showAd(onComplete) {
            if (isAdPlaying) return;
            isAdPlaying  = true;
            adOnComplete = onComplete || null;
            try { audioPlayer.pause(); } catch (_) {}
            var ad = ADS[adIndex % ADS.length];
            adIndex = (adIndex + 1) % ADS.length;
            adMedia.innerHTML = '';
            if (currentAdMedia) {
                try { currentAdMedia.pause(); currentAdMedia.removeAttribute('src'); currentAdMedia.load(); } catch (_) {}
                currentAdMedia = null;
            }
            var mediaEl = null;
            if (ad.video) {
                mediaEl = document.createElement('video');
                mediaEl.src = ad.video;
                mediaEl.playsInline = true;
                mediaEl.setAttribute('playsinline', '');
                mediaEl.setAttribute('webkit-playsinline', '');
                mediaEl.preload  = 'auto';
                mediaEl.controls = false;
                adMedia.appendChild(mediaEl);
            } else {
                if (ad.url) {
                    var img = document.createElement('img');
                    img.src = ad.url; img.alt = ad.title || 'Anuncio'; img.className = 'ad-cover';
                    adMedia.appendChild(img);
                }
                if (ad.music) {
                    mediaEl = document.createElement('audio');
                    mediaEl.src = ad.music; mediaEl.preload = 'auto';
                    adMedia.appendChild(mediaEl);
                }
            }
            currentAdMedia = mediaEl;
            overlay.classList.add('visible');
            overlay.setAttribute('aria-hidden', 'false');

            var remaining = SKIP_DELAY;
            adSkip.disabled  = true;
            adSkip.innerHTML = 'Saltar anuncio (<span class="ad-countdown">' + remaining + '</span>)';

            if (countdownInterval) clearInterval(countdownInterval);
            countdownInterval = setInterval(function () {
                remaining--;
                var el = adSkip.querySelector('.ad-countdown');
                if (el) el.textContent = Math.max(0, remaining);
                if (remaining <= 0) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                    adSkip.disabled   = false;
                    adSkip.textContent = 'Saltar anuncio ✕';
                }
            }, 1000);

            if (mediaEl) {
                mediaEl.addEventListener('ended', endAd, { once: true });
                mediaEl.addEventListener('error', function () { adTimeout = setTimeout(endAd, 900); }, { once: true });
                var p = mediaEl.play();
                if (p && p.catch) {
                    p.catch(function (err) {
                        mediaEl.muted = true;
                        var p2 = mediaEl.play();
                        if (p2 && p2.catch) p2.catch(function () { adTimeout = setTimeout(endAd, 4000); });
                    });
                }
            } else {
                adTimeout = setTimeout(endAd, SKIP_DELAY * 1000);
            }
        }

        function endAd() {
            if (!isAdPlaying) return;
            isAdPlaying = false;
            if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
            if (adTimeout)         { clearTimeout(adTimeout);          adTimeout = null; }
            if (currentAdMedia) {
                try { currentAdMedia.pause(); currentAdMedia.removeAttribute('src'); currentAdMedia.load(); } catch (_) {}
                currentAdMedia = null;
            }
            adMedia.innerHTML = '';
            overlay.classList.remove('visible');
            overlay.setAttribute('aria-hidden', 'true');
            adSkip.disabled = true;
            adSkip.innerHTML = 'Saltar anuncio (<span class="ad-countdown">' + SKIP_DELAY + '</span>)';
            var cb = adOnComplete;
            adOnComplete = null;
            if (cb) { try { cb(); } catch (e) { console.warn(e); } }
        }

        adSkip.addEventListener('click', function () {
            if (adSkip.disabled) return;
            if (navigator.vibrate) { try { navigator.vibrate(12); } catch (_) {} }
            endAd();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else { init(); }
})();

/* ============================================================
   5. PERFIL DEL ARTISTA
   ============================================================ */
(function () {
    'use strict';
    function initArtistProfile() {
        const profileEl   = document.getElementById('artist-profile');
        const apScroll    = document.getElementById('ap-scroll');
        const apHeroImg   = document.getElementById('ap-hero-img');
        const apArtist    = document.getElementById('ap-artist-name');
        const apTotal     = document.getElementById('ap-total-plays');
        const apGrid      = document.getElementById('ap-grid');
        const apClose     = document.getElementById('ap-close');
        const apListen    = document.getElementById('ap-listen-btn');
        const searchInput = document.getElementById('search-input');
        const playlist    = document.getElementById('playlist');

        if (!profileEl || !apGrid || !playlist || typeof normalizeStr !== 'function') return;

        let currentArtist = null;
        let refreshTimer  = null;
        let gridObserver  = null;
        const COLLAB_SPLIT = /\s+(?:ft\.?|feat\.?|featuring|con|&)\s+/i;

        function getArtistsFromItem(item) {
            const sub = item.querySelector('.item-subtitle')?.textContent || '';
            const idx = sub.indexOf('·');
            const namePart = (idx === -1 ? sub : sub.slice(0, idx)).trim();
            if (!namePart) return [];
            const parts = namePart.split(COLLAB_SPLIT).map(s => s.trim()).filter(Boolean);
            return parts.length ? parts : [namePart];
        }
        function getAllArtistsMap() {
            const map = new Map();
            playlist.querySelectorAll('.playlist-item').forEach(item => {
                getArtistsFromItem(item).forEach(name => {
                    const n = normalizeStr(name);
                    if (n && !map.has(n)) map.set(n, name);
                });
            });
            return map;
        }
        function getArtistItems(artistName) {
            const target = normalizeStr(artistName);
            if (!target) return [];
            return Array.from(playlist.querySelectorAll('.playlist-item')).filter(item =>
                getArtistsFromItem(item).some(n => normalizeStr(n) === target)
            );
        }
        function computeTotalPlays(items) {
            let total = 0;
            items.forEach(item => {
                const title = item.querySelector('.item-title')?.textContent.trim() || '';
                const doc = findFirebaseDoc(title);
                if (doc && doc.data && typeof doc.data.reproducciones === 'number') total += doc.data.reproducciones;
            });
            return total;
        }
        function formatNumber(n) {
            try { return (n || 0).toLocaleString('es-MX'); } catch (_) { return String(n || 0); }
        }
        function updatePlayingCard() {
            const active = playlist.querySelector('.playlist-item.active');
            const activeTitle = active ? (active.querySelector('.item-title')?.textContent.trim() || '') : '';
            apGrid.querySelectorAll('.ap-card').forEach(card => {
                if (activeTitle && card.dataset.title === activeTitle) card.classList.add('playing');
                else card.classList.remove('playing');
            });
        }
        function activateArtistMode(artistName) {
            const list = getArtistItems(artistName);
            if (!list.length) return null;
            if (typeof setArtistFilter === 'function') setArtistFilter(list, artistName);
            else { window.__artistFilter = list.slice(); window.__artistFilterName = artistName; }
            return list;
        }
        function renderProfile(artistName) {
            currentArtist = artistName;
            const items = getArtistItems(artistName);
            if (!items.length) return;
            apArtist.textContent = artistName;
            const covers = items.map(i => i.querySelector('.thumbnail img')?.src).filter(Boolean);
            if (covers.length) {
                const chosen = covers[Math.floor(Math.random() * covers.length)];
                apHeroImg.classList.remove('loaded');
                apHeroImg.src = chosen;
                if (apHeroImg.complete) apHeroImg.classList.add('loaded');
                else apHeroImg.onload = () => apHeroImg.classList.add('loaded');
            } else {
                apHeroImg.removeAttribute('src');
                apHeroImg.classList.remove('loaded');
            }
            apTotal.textContent = formatNumber(computeTotalPlays(items));
            apGrid.innerHTML = '';
            items.forEach(item => {
                const cover = item.querySelector('.thumbnail img')?.src || '';
                const title = item.querySelector('.item-title')?.textContent.trim() || '';
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'ap-card';
                card.dataset.title = title;
                card.setAttribute('aria-label', title);
                if (cover) {
                    const img = document.createElement('img');
                    img.src = cover; img.alt = title; img.loading = 'lazy';
                    card.appendChild(img);
                }
                const t = document.createElement('span');
                t.className = 'ap-card-title';
                t.textContent = title;
                card.appendChild(t);
                card.addEventListener('click', () => {
                    activateArtistMode(artistName);
                    item.click();
                    setTimeout(updatePlayingCard, 60);
                });
                apGrid.appendChild(card);
            });
            apListen.onclick = () => {
                const list = activateArtistMode(artistName);
                if (!list || !list.length) return;
                list[Math.floor(Math.random() * list.length)].click();
                setTimeout(updatePlayingCard, 60);
            };
            if (refreshTimer) clearInterval(refreshTimer);
            refreshTimer = setInterval(() => {
                if (!profileEl.classList.contains('visible') || !currentArtist) return;
                const cur = getArtistItems(currentArtist);
                apTotal.textContent = formatNumber(computeTotalPlays(cur));
            }, 1500);
            if (gridObserver) gridObserver.disconnect();
            gridObserver = new MutationObserver(() => updatePlayingCard());
            gridObserver.observe(playlist, { subtree: true, attributes: true, attributeFilter: ['class'] });
            if (apScroll) apScroll.scrollTop = 0;
            updatePlayingCard();
        }
        function openProfile(artistName) {
            renderProfile(artistName);
            profileEl.classList.add('visible');
            profileEl.setAttribute('aria-hidden', 'false');
        }
        function closeProfile() {
            profileEl.classList.remove('visible');
            profileEl.setAttribute('aria-hidden', 'true');
            currentArtist = null;
            if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
            if (gridObserver) { gridObserver.disconnect(); gridObserver = null; }
        }
        if (apClose) apClose.addEventListener('click', closeProfile);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && profileEl.classList.contains('visible')) closeProfile();
        });
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const q = normalizeStr(e.target.value);
                if (!q) return;
                const artists = getAllArtistsMap();
                if (artists.has(q)) openProfile(artists.get(q));
            });
        }
        window.__openArtistProfile = openProfile;
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initArtistProfile);
    } else { initArtistProfile(); }
})();

/* ============================================================
   6. REPETIR + ALEATORIO
   ============================================================ */
(function () {
    'use strict';
    const REPEAT_KEY  = 'omega_repeat_mode_v1';
    const SHUFFLE_KEY = 'omega_shuffle_v1';
    const LIKES_KEY   = 'omega_likes_v1';
    let repeatMode = 'off';
    let shuffleOn  = true;

    try {
        const r = localStorage.getItem(REPEAT_KEY);
        if (r === 'off' || r === 'all' || r === 'one') repeatMode = r;
        const s = localStorage.getItem(SHUFFLE_KEY);
        if (s === '0')      shuffleOn = false;
        else if (s === '1') shuffleOn = true;
    } catch (_) {}

    window.__omegaShuffleOn = shuffleOn;

    function persist() {
        try {
            localStorage.setItem(REPEAT_KEY, repeatMode);
            localStorage.setItem(SHUFFLE_KEY, shuffleOn ? '1' : '0');
        } catch (_) {}
    }

    const ICON_REPEAT = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="17 1 21 5 17 9"/>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
            <polyline points="7 23 3 19 7 15"/>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            <text class="fs-repeat-one-mark" x="12" y="15.3" text-anchor="middle">1</text>
        </svg>`;
    const ICON_SHUFFLE = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="16 3 21 3 21 8"/>
            <line x1="4" y1="20" x2="21" y2="3"/>
            <polyline points="21 16 21 21 16 21"/>
            <line x1="15" y1="15" x2="21" y2="21"/>
            <line x1="4" y1="4" x2="9" y2="9"/>
        </svg>`;

    let repeatBtn = null;
    let shuffleBtn = null;

    function haptic() {
        if (navigator.vibrate) { try { navigator.vibrate(12); } catch (_) {} }
    }
    function toast(msg) {
        let el = document.getElementById('omega-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'omega-toast';
            el.setAttribute('role', 'status');
            el.setAttribute('aria-live', 'polite');
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.classList.remove('visible');
        void el.offsetWidth;
        el.classList.add('visible');
        clearTimeout(el._omegaModeTimer);
        el._omegaModeTimer = setTimeout(() => el.classList.remove('visible'), 1600);
    }
    function updateRepeatUI() {
        if (!repeatBtn) return;
        repeatBtn.classList.toggle('active', repeatMode !== 'off');
        repeatBtn.classList.toggle('mode-one', repeatMode === 'one');
        const aria = repeatMode === 'one' ? 'Repetir 1 canción'
                   : repeatMode === 'all' ? 'Repetir todo' : 'Repetir desactivado';
        repeatBtn.setAttribute('aria-label', aria);
        repeatBtn.setAttribute('title', aria);
    }
    function updateShuffleUI() {
        if (!shuffleBtn) return;
        shuffleBtn.classList.toggle('active', shuffleOn);
        const aria = shuffleOn ? 'Aleatorio activado' : 'Aleatorio desactivado';
        shuffleBtn.setAttribute('aria-label', aria);
        shuffleBtn.setAttribute('title', aria);
        window.__omegaShuffleOn = shuffleOn;
    }
    function applyRepeatToAudio() {
        const audio = document.getElementById('audio-player');
        if (!audio) return;
        try { audio.loop = false; } catch (_) {}
    }
    function getSequentialList() {
        const playlist = document.getElementById('playlist');
        if (!playlist) return [];
        const all = Array.from(playlist.querySelectorAll('.playlist-item'));
        if (window.__artistFilter && window.__artistFilter.length) {
            const filtered = all.filter(i => window.__artistFilter.includes(i));
            if (filtered.length) return filtered;
        }
        return all;
    }
    function registrarReproduccionCompletada(item) {
        if (!item || typeof normalizeStr !== 'function') return;
        const title = item.querySelector('.item-title')?.textContent.trim() || '';
        if (!title) return;
        const key = normalizeStr(title);
        if (!key) return;
        let map = {};
        try { map = JSON.parse(localStorage.getItem(LIKES_KEY) || '{}'); } catch (_) { map = {}; }
        let data = map[key];
        if (data === true) data = { liked: true, ts: 0, locked: false };
        const alreadyLiked = !!(data && typeof data === 'object' && data.liked !== false);
        map[key] = { liked: true, ts: Date.now(), locked: true };
        try { localStorage.setItem(LIKES_KEY, JSON.stringify(map)); } catch (_) {}
        if (alreadyLiked) return;
        if (typeof cambiarReproducciones === 'function') cambiarReproducciones(item, 1);
    }
    function detenerAlFinal(audio) {
        try { audio.pause(); } catch (_) {}
        try { audio.currentTime = 0; } catch (_) {}
        const progressBarEl = document.getElementById('progress-bar');
        const currentTimeEl = document.getElementById('current-time');
        if (progressBarEl) {
            progressBarEl.style.setProperty('--progress', '0%');
            progressBarEl.setAttribute('aria-valuenow', 0);
        }
        if (currentTimeEl) currentTimeEl.textContent = '0:00';
        try { audio.dispatchEvent(new Event('pause')); } catch (_) {}
    }
    function onEndedCapture(e) {
        const audio = document.getElementById('audio-player');
        if (!audio || e.target !== audio) return;
        if (repeatMode === 'one') {
            e.stopImmediatePropagation();
            e.stopPropagation();
            const activeItem = document.querySelector('.playlist-item.active');
            if (activeItem) registrarReproduccionCompletada(activeItem);
            try { audio.currentTime = 0; } catch (_) {}
            const p = audio.play();
            if (p && p.catch) p.catch(() => {});
            return;
        }
        if (shuffleOn) return;
        e.stopImmediatePropagation();
        e.stopPropagation();
        const playlist = document.getElementById('playlist');
        if (!playlist) return;
        const list = getSequentialList();
        if (!list.length) return;
        const active = playlist.querySelector('.playlist-item.active');
        const idx    = list.indexOf(active);
        registrarReproduccionCompletada(active);
        let nextItem = null;
        if (idx === -1) nextItem = list[0];
        else if (idx + 1 < list.length) nextItem = list[idx + 1];
        else if (repeatMode === 'all')  nextItem = list[0];
        if (nextItem) nextItem.click();
        else          detenerAlFinal(audio);
    }
    let started = false;
    function init() {
        const fsActions = document.querySelector('.fs-actions');
        if (!fsActions) return false;
        if (!document.getElementById('fs-repeat')) {
            repeatBtn = document.createElement('button');
            repeatBtn.type = 'button';
            repeatBtn.id = 'fs-repeat';
            repeatBtn.className = 'fs-mode-btn';
            repeatBtn.innerHTML = ICON_REPEAT + '<span class="fs-mode-label">Repetir</span>';
            shuffleBtn = document.createElement('button');
            shuffleBtn.type = 'button';
            shuffleBtn.id = 'fs-shuffle';
            shuffleBtn.className = 'fs-mode-btn';
            shuffleBtn.innerHTML = ICON_SHUFFLE + '<span class="fs-mode-label">Aleatorio</span>';
            fsActions.insertBefore(shuffleBtn, fsActions.firstChild);
            fsActions.insertBefore(repeatBtn, fsActions.firstChild);
        } else {
            repeatBtn  = document.getElementById('fs-repeat');
            shuffleBtn = document.getElementById('fs-shuffle');
        }
        repeatBtn.addEventListener('click', () => {
            haptic();
            repeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
            persist();
            applyRepeatToAudio();
            updateRepeatUI();
            toast(repeatMode === 'off' ? 'Repetir: desactivado'
                : repeatMode === 'all' ? 'Repetir: toda la lista' : 'Repetir: 1 canción');
        });
        shuffleBtn.addEventListener('click', () => {
            haptic();
            shuffleOn = !shuffleOn;
            persist();
            updateShuffleUI();
            toast(shuffleOn ? 'Aleatorio: activado' : 'Aleatorio: desactivado');
        });
        updateRepeatUI();
        updateShuffleUI();
        applyRepeatToAudio();
        document.addEventListener('ended', onEndedCapture, true);
        return true;
    }
    function bootWithRetry(attempt) {
        if (started) return;
        if (init()) { started = true; return; }
        if ((attempt || 0) < 20) setTimeout(() => bootWithRetry((attempt || 0) + 1), 150);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => bootWithRetry(0));
    } else { bootWithRetry(0); }
})();

/* ============================================================
   7. ORGANIZACIÓN POR ÁLBUMES
   ============================================================ */
(function () {
    'use strict';
    let observer = null;
    let reorganizing = false;
    let bootRetries  = 0;
    function getItemTitle(item) { return item ? (item.querySelector('.item-title')?.textContent.trim() || '') : ''; }
    function getAlbumFromItem(item) {
        if (!item) return '';
        const el = item.querySelector('.Album');
        return el ? el.textContent.trim() : '';
    }
    function reorganizeGrid() {
        if (reorganizing) return;
        const apGrid   = document.getElementById('ap-grid');
        const playlist = document.getElementById('playlist');
        if (!apGrid || !playlist) return;
        const directCards = Array.from(apGrid.children).filter(el => el.classList && el.classList.contains('ap-card'));
        if (!directCards.length) return;
        const itemByTitle = new Map();
        playlist.querySelectorAll('.playlist-item').forEach(it => {
            const t = getItemTitle(it);
            if (t) itemByTitle.set(t, it);
        });
        const albums = new Map();
        const standalones = [];
        directCards.forEach(card => {
            const title     = card.dataset.title || '';
            const item      = itemByTitle.get(title);
            const albumName = getAlbumFromItem(item);
            if (albumName) {
                if (!albums.has(albumName)) {
                    const cover = item.querySelector('.thumbnail img')?.src || '';
                    albums.set(albumName, { cover, cards: [] });
                }
                albums.get(albumName).cards.push(card);
            } else { standalones.push(card); }
        });
        if (!albums.size) return;
        reorganizing = true;
        if (observer) observer.disconnect();
        try {
            directCards.forEach(c => c.remove());
            albums.forEach((albumData, albumName) => {
                const albumEl = document.createElement('div');
                albumEl.className = 'ap-album';
                const header = document.createElement('button');
                header.type = 'button';
                header.className = 'ap-album-header';
                header.setAttribute('aria-expanded', 'false');
                header.setAttribute('aria-label', 'Álbum ' + albumName);
                if (albumData.cover) {
                    const img = document.createElement('img');
                    img.src = albumData.cover; img.alt = albumName; img.loading = 'lazy';
                    header.appendChild(img);
                }
                const info = document.createElement('div');
                info.className = 'ap-album-info';
                const label = document.createElement('span');
                label.className = 'ap-album-label';
                label.textContent = 'ÁLBUM';
                info.appendChild(label);
                const titleEl = document.createElement('span');
                titleEl.className = 'ap-album-title';
                titleEl.textContent = albumName;
                info.appendChild(titleEl);
                const countEl = document.createElement('span');
                countEl.className = 'ap-album-count';
                countEl.textContent = albumData.cards.length + ' ' + (albumData.cards.length === 1 ? 'canción' : 'canciones');
                info.appendChild(countEl);
                header.appendChild(info);
                const arrow = document.createElement('span');
                arrow.className = 'ap-album-arrow';
                arrow.textContent = '▶';
                arrow.setAttribute('aria-hidden', 'true');
                header.appendChild(arrow);
                header.addEventListener('click', () => {
                    const isExpanded = albumEl.classList.toggle('expanded');
                    header.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
                });
                albumEl.appendChild(header);
                const tracks = document.createElement('div');
                tracks.className = 'ap-album-tracks';
                albumData.cards.forEach(c => tracks.appendChild(c));
                albumEl.appendChild(tracks);
                apGrid.appendChild(albumEl);
            });
            if (standalones.length > 0) {
                const th = document.createElement('div');
                th.className = 'ap-temas-header';
                th.textContent = 'TEMAS';
                apGrid.appendChild(th);
                const tg = document.createElement('div');
                tg.className = 'ap-temas-grid';
                standalones.forEach(c => tg.appendChild(c));
                apGrid.appendChild(tg);
            }
        } finally {
            reorganizing = false;
            if (observer) observer.observe(apGrid, { childList: true });
        }
    }
    function init() {
        const apGrid = document.getElementById('ap-grid');
        if (!apGrid) { if (bootRetries++ < 40) setTimeout(init, 150); return; }
        observer = new MutationObserver(() => {
            if (reorganizing) return;
            const hasDirectCards = Array.from(apGrid.children).some(el => el.classList && el.classList.contains('ap-card'));
            if (hasDirectCards) reorganizeGrid();
        });
        observer.observe(apGrid, { childList: true });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else { init(); }
})();

/* ============================================================
   8. PORTADA / CATEGORÍAS HOME
   ============================================================ */
(function () {
    'use strict';
    const HISTORY_KEY    = 'omega_history_v1';
    const MAX_HISTORY    = 80;
    const CAROUSEL_LIMIT = 12;
    const COLLAB_SPLIT   = /\s+(?:ft\.?|feat\.?|featuring|con|&)\s+/i;
    function norm(str) {
        if (typeof normalizeStr === 'function') return normalizeStr(str);
        return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    }
    function getItemTitle(item) { return item.querySelector('.item-title')?.textContent.trim() || ''; }
    function getItemCover(item) {
        const img = item.querySelector('.thumbnail img');
        return img ? (img.getAttribute('src') || '') : '';
    }
    function getItemArtists(item) {
        const sub = item.querySelector('.item-subtitle')?.textContent || '';
        const idx = sub.indexOf('·');
        const namePart = (idx === -1 ? sub : sub.slice(0, idx)).trim();
        if (!namePart) return [];
        const parts = namePart.split(COLLAB_SPLIT).map(s => s.trim()).filter(Boolean);
        return parts.length ? parts : [namePart];
    }
    function getItemAlbum(item) {
        const el = item.querySelector('.Album');
        return el ? el.textContent.trim() : '';
    }
    function getPlays(item) {
        if (typeof findFirebaseDoc !== 'function') return 0;
        const doc = findFirebaseDoc(getItemTitle(item));
        if (doc && doc.data && typeof doc.data.reproducciones === 'number') return doc.data.reproducciones;
        return 0;
    }
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    function getAllItems() {
        const pl = document.getElementById('playlist');
        if (!pl) return [];
        return Array.from(pl.querySelectorAll('.playlist-item'));
    }
    function findItemByTitle(title) {
        const n = norm(title);
        if (!n) return null;
        return getAllItems().find(it => norm(getItemTitle(it)) === n) || null;
    }
    function clearNode(el) { while (el.firstChild) el.removeChild(el.firstChild); }
    function readHistory() {
        try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (_) { return []; }
    }
    function pushHistory(title) {
        if (!title) return;
        const n = norm(title);
        if (!n) return;
        let arr = readHistory().filter(x => norm(x) !== n);
        arr.unshift(title);
        if (arr.length > MAX_HISTORY) arr.length = MAX_HISTORY;
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); } catch (_) {}
    }
    function makeSongCard(item) {
        const title = getItemTitle(item);
        const cover = getItemCover(item);
        const sub   = item.querySelector('.item-subtitle')?.textContent.trim() || '';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'home-card';
        btn.setAttribute('aria-label', title);
        const thumb = document.createElement('div');
        thumb.className = 'home-card-thumb';
        if (cover) {
            const img = document.createElement('img');
            img.src = cover; img.alt = title; img.loading = 'lazy';
            thumb.appendChild(img);
        }
        btn.appendChild(thumb);
        const t = document.createElement('span');
        t.className = 'home-card-title';
        t.textContent = title;
        btn.appendChild(t);
        if (sub) {
            const s = document.createElement('span');
            s.className = 'home-card-sub';
            s.textContent = sub;
            btn.appendChild(s);
        }
        btn.addEventListener('click', () => item.click());
        return btn;
    }
    function buildArtists() {
        const sec = document.getElementById('sec-artists');
        const carousel = document.getElementById('carousel-artists');
        if (!sec || !carousel) return;
        clearNode(carousel);
        const map = new Map();
        getAllItems().forEach(item => {
            getItemArtists(item).forEach(name => {
                const n = norm(name);
                if (!n || map.has(n)) return;
                map.set(n, { name, cover: getItemCover(item) });
            });
        });
        if (!map.size) { sec.style.display = 'none'; return; }
        sec.style.display = '';
        shuffle(Array.from(map.values())).forEach(({ name, cover }) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'home-card home-card--artist';
            btn.setAttribute('aria-label', name);
            const thumb = document.createElement('div');
            thumb.className = 'home-card-thumb';
            if (cover) {
                const img = document.createElement('img');
                img.src = cover; img.alt = name; img.loading = 'lazy';
                thumb.appendChild(img);
            }
            btn.appendChild(thumb);
            const t = document.createElement('span');
            t.className = 'home-card-title';
            t.textContent = name;
            btn.appendChild(t);
            btn.addEventListener('click', () => {
                if (typeof window.__openArtistProfile === 'function') window.__openArtistProfile(name);
            });
            carousel.appendChild(btn);
        });
    }
    function buildListenAgain() {
        const sec = document.getElementById('sec-listen-again');
        const carousel = document.getElementById('carousel-listen-again');
        if (!sec || !carousel) return;
        clearNode(carousel);
        const history = readHistory();
        const seen = new Set();
        const items = [];
        for (const title of history) {
            const n = norm(title);
            if (!n || seen.has(n)) continue;
            const it = findItemByTitle(title);
            if (!it) continue;
            seen.add(n);
            items.push(it);
            if (items.length >= CAROUSEL_LIMIT) break;
        }
        if (!items.length) { sec.style.display = 'none'; return; }
        sec.style.display = '';
        items.forEach(it => carousel.appendChild(makeSongCard(it)));
    }
    function buildMaybe() {
        const sec = document.getElementById('sec-maybe');
        const carousel = document.getElementById('carousel-maybe');
        if (!sec || !carousel) return;
        clearNode(carousel);
        const scored = getAllItems().map(it => ({ it, plays: getPlays(it) }));
        if (!scored.length) { sec.style.display = 'none'; return; }
        scored.sort((a, b) => a.plays - b.plays);
        const take = Math.max(6, Math.ceil(scored.length / 2));
        const pool = scored.slice(0, take).map(x => x.it);
        const picked = shuffle(pool).slice(0, CAROUSEL_LIMIT);
        if (!picked.length) { sec.style.display = 'none'; return; }
        sec.style.display = '';
        picked.forEach(it => carousel.appendChild(makeSongCard(it)));
    }
    function buildTop() {
        const sec = document.getElementById('sec-top');
        const carousel = document.getElementById('carousel-top');
        if (!sec || !carousel) return;
        clearNode(carousel);
        const pool = getAllItems().filter(it => getPlays(it) > 20);
        const picked = shuffle(pool).slice(0, CAROUSEL_LIMIT);
        if (!picked.length) { sec.style.display = 'none'; return; }
        sec.style.display = '';
        picked.forEach(it => carousel.appendChild(makeSongCard(it)));
    }
    function buildAlbums() {
        const sec = document.getElementById('sec-albums');
        const carousel = document.getElementById('carousel-albums');
        if (!sec || !carousel) return;
        clearNode(carousel);
        const map = new Map();
        getAllItems().forEach(item => {
            const album = getItemAlbum(item);
            if (!album) return;
            const artist = getItemArtists(item)[0] || '';
            const key = norm(album) + '::' + norm(artist);
            if (map.has(key)) return;
            map.set(key, { name: album, cover: getItemCover(item), artist });
        });
        if (!map.size) { sec.style.display = 'none'; return; }
        sec.style.display = '';
        shuffle(Array.from(map.values())).slice(0, CAROUSEL_LIMIT).forEach(alb => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'home-card';
            btn.setAttribute('aria-label', alb.name);
            const thumb = document.createElement('div');
            thumb.className = 'home-card-thumb';
            if (alb.cover) {
                const img = document.createElement('img');
                img.src = alb.cover; img.alt = alb.name; img.loading = 'lazy';
                thumb.appendChild(img);
            }
            btn.appendChild(thumb);
            const t = document.createElement('span');
            t.className = 'home-card-title';
            t.textContent = alb.name;
            btn.appendChild(t);
            if (alb.artist) {
                const s = document.createElement('span');
                s.className = 'home-card-sub';
                s.textContent = alb.artist;
                btn.appendChild(s);
            }
            btn.addEventListener('click', () => {
                if (alb.artist && typeof window.__openArtistProfile === 'function') {
                    window.__openArtistProfile(alb.artist);
                }
            });
            carousel.appendChild(btn);
        });
    }
    function buildAll() {
        buildArtists();
        buildListenAgain();
        buildMaybe();
        buildTop();
        buildAlbums();
    }
    function initHistoryTracking() {
        const audio = document.getElementById('audio-player');
        const pl    = document.getElementById('playlist');
        if (!audio || !pl) return;
        audio.addEventListener('play', () => {
            const active = pl.querySelector('.playlist-item.active');
            if (active) pushHistory(getItemTitle(active));
        });
        audio.addEventListener('ended', () => {
            setTimeout(() => {
                buildListenAgain();
                buildMaybe();
                buildTop();
            }, 400);
        });
    }
    function boot() {
        let tries = 0;
        (function loop() {
            tries++;
            const hasItems = getAllItems().length > 0;
            const fbReady  = (typeof firebaseDocsCache !== 'undefined') && firebaseDocsCache.length > 0;
            if (hasItems && (fbReady || tries >= 20)) {
                buildAll();
                initHistoryTracking();
                return;
            }
            if (tries >= 40) return;
            setTimeout(loop, 200);
        })();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else { boot(); }
})();

/* ============================================================
   9. EXPIRACIÓN AUTOMÁTICA DEL ME GUSTA
   ============================================================ */
(function () {
    'use strict';
    const LIKES_KEY    = 'omega_likes_v1';
    const LIKE_LOCK_MS = 30 * 24 * 60 * 60 * 1000;
    function _read() {
        try { return JSON.parse(localStorage.getItem(LIKES_KEY) || '{}'); } catch (_) { return {}; }
    }
    function _write(map) {
        try { localStorage.setItem(LIKES_KEY, JSON.stringify(map)); } catch (_) {}
    }
    function _norm(str) {
        if (typeof normalizeStr === 'function') return normalizeStr(str);
        return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    }
    function _findItemByKey(key, playlist) {
        if (!playlist || !key) return null;
        const items = playlist.querySelectorAll('.playlist-item');
        for (const it of items) {
            const title = it.querySelector('.item-title')?.textContent.trim() || '';
            if (_norm(title) === key) return it;
        }
        return null;
    }
    async function limpiarMeGustasExpirados() {
        const map   = _read();
        const ahora = Date.now();
        const claves = Object.keys(map);
        if (!claves.length) return;
        const playlist  = document.getElementById('playlist');
        const expirados = [];
        claves.forEach(key => {
            const data = map[key];
            if (!data || typeof data !== 'object') return;
            if (data.liked === false) return;
            if (!data.locked) return;
            const ts = data.ts || 0;
            if (ts > 0 && (ahora - ts) >= LIKE_LOCK_MS) expirados.push(key);
        });
        if (!expirados.length) return;
        for (const key of expirados) {
            delete map[key];
            const item = _findItemByKey(key, playlist);
            if (item && typeof cambiarReproducciones === 'function') {
                try { await cambiarReproducciones(item, -1); } catch (e) {}
            }
        }
        _write(map);
        try {
            const fsLikeBtn  = document.getElementById('fs-like');
            const activeItem = playlist ? playlist.querySelector('.playlist-item.active') : null;
            if (fsLikeBtn && activeItem) {
                const activeKey = _norm(activeItem.querySelector('.item-title')?.textContent.trim() || '');
                if (expirados.includes(activeKey)) fsLikeBtn.classList.remove('active');
            }
        } catch (_) {}
    }
    function boot() {
        setTimeout(limpiarMeGustasExpirados, 2000);
        setInterval(limpiarMeGustasExpirados, 5 * 60 * 1000);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else { boot(); }
})();

/* ============================================================
   10. VISTA EXCLUSIVA DEL ÁLBUM
   ============================================================ */
(function () {
    'use strict';
    const COLLAB_SPLIT = /\s+(?:ft\.?|feat\.?|featuring|con|&)\s+/i;
    const LIKES_KEY    = 'omega_likes_v1';
    let albumItems = [], albumQueue = [], albumIndex = 0, albumPlaying = false, listMode = false, internalClick = false;
    let albumView = null, avTitle = null, avToggle = null, avScroll = null, avCarousel = null, avList = null, avPlayAll = null, avBack = null;
    function norm(str) {
        if (typeof normalizeStr === 'function') return normalizeStr(str);
        return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    }
    function clearNode(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }
    function getPlaylist() { return document.getElementById('playlist'); }
    function getAudio()    { return document.getElementById('audio-player'); }
    function getItemTitle(item) { return item ? (item.querySelector('.item-title')?.textContent.trim() || '') : ''; }
    function getItemCover(item) {
        const img = item ? item.querySelector('.thumbnail img') : null;
        return img ? (img.getAttribute('src') || '') : '';
    }
    function getItemAlbum(item) {
        const el = item ? item.querySelector('.Album') : null;
        return el ? el.textContent.trim() : '';
    }
    function getItemArtists(item) {
        const sub = item ? (item.querySelector('.item-subtitle')?.textContent || '') : '';
        const idx = sub.indexOf('·');
        const namePart = (idx === -1 ? sub : sub.slice(0, idx)).trim();
        if (!namePart) return [];
        const parts = namePart.split(COLLAB_SPLIT).map(s => s.trim()).filter(Boolean);
        return parts.length ? parts : [namePart];
    }
    function findAlbumItems(albumName, artistName) {
        const pl = getPlaylist();
        if (!pl) return [];
        const nAlbum  = norm(albumName);
        const nArtist = norm(artistName);
        if (!nAlbum) return [];
        return Array.from(pl.querySelectorAll('.playlist-item')).filter(it => {
            if (norm(getItemAlbum(it)) !== nAlbum) return false;
            if (!nArtist) return true;
            return getItemArtists(it).some(a => norm(a) === nArtist);
        });
    }
    function renderCarousel() {
        if (!avCarousel) return;
        clearNode(avCarousel);
        albumItems.forEach(item => {
            const title  = getItemTitle(item);
            const cover  = getItemCover(item);
            const artist = getItemArtists(item)[0] || '';
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'av-card';
            card.setAttribute('aria-label', title);
            const thumb = document.createElement('div');
            thumb.className = 'av-card-thumb';
            if (cover) {
                const img = document.createElement('img');
                img.src = cover; img.alt = title; img.loading = 'lazy';
                thumb.appendChild(img);
            }
            card.appendChild(thumb);
            const t = document.createElement('span');
            t.className = 'av-card-title';
            t.textContent = title;
            card.appendChild(t);
            if (artist) {
                const s = document.createElement('span');
                s.className = 'av-card-sub';
                s.textContent = artist;
                card.appendChild(s);
            }
            card.addEventListener('click', () => playItem(item));
            avCarousel.appendChild(card);
        });
    }
    function renderList() {
        if (!avList) return;
        clearNode(avList);
        albumItems.forEach(item => {
            const title = getItemTitle(item);
            const cover = getItemCover(item);
            const sub   = item.querySelector('.item-subtitle')?.textContent.trim() || '';
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'av-row';
            row.setAttribute('aria-label', title);
            if (cover) {
                const thumb = document.createElement('div');
                thumb.className = 'thumbnail';
                const img = document.createElement('img');
                img.src = cover; img.alt = title; img.loading = 'lazy';
                thumb.appendChild(img);
                row.appendChild(thumb);
            }
            const info = document.createElement('div');
            info.className = 'item-info';
            const t = document.createElement('span');
            t.className = 'item-title';
            t.textContent = title;
            info.appendChild(t);
            if (sub) {
                const s = document.createElement('span');
                s.className = 'item-subtitle';
                s.textContent = sub;
                info.appendChild(s);
            }
            row.appendChild(info);
            row.addEventListener('click', () => playItem(item));
            avList.appendChild(row);
        });
    }
    function setListMode(on) {
        listMode = !!on;
        if (avCarousel) avCarousel.classList.toggle('hidden', listMode);
        if (avList)     avList.classList.toggle('visible', listMode);
        if (avToggle)   avToggle.textContent = listMode ? 'Modo de carrusel' : 'Modo de lista';
        updateAlbumHighlight();
    }
    function updateAlbumHighlight() {
        const pl = getPlaylist();
        const active = pl ? pl.querySelector('.playlist-item.active') : null;
        if (avCarousel) {
            avCarousel.querySelectorAll('.av-card').forEach((card, i) => {
                card.classList.toggle('playing', albumItems[i] === active);
            });
        }
        if (avList) {
            avList.querySelectorAll('.av-row').forEach((row, i) => {
                row.classList.toggle('active', albumItems[i] === active);
            });
        }
    }
    function playItem(item) {
        if (!item) return;
        if (albumPlaying) {
            const idx = albumQueue.indexOf(item);
            if (idx === -1) albumPlaying = false;
            else            albumIndex   = idx;
        }
        internalClick = true;
        try { item.click(); } finally { internalClick = false; }
    }
    function startAlbumPlayback() {
        if (!albumItems.length) return;
        albumQueue   = albumItems.slice();
        albumPlaying = true;
        albumIndex   = 0;
        playItem(albumQueue[0]);
    }
    function registerCompletedPlay(item) {
        if (!item || typeof normalizeStr !== 'function') return;
        const title = getItemTitle(item);
        if (!title) return;
        const key = norm(title);
        if (!key) return;
        let map = {};
        try { map = JSON.parse(localStorage.getItem(LIKES_KEY) || '{}'); } catch (_) { map = {}; }
        let data = map[key];
        if (data === true) data = { liked: true, ts: 0, locked: false };
        const alreadyLiked = !!(data && typeof data === 'object' && data.liked !== false);
        map[key] = { liked: true, ts: Date.now(), locked: true };
        try { localStorage.setItem(LIKES_KEY, JSON.stringify(map)); } catch (_) {}
        if (alreadyLiked) return;
        if (typeof cambiarReproducciones === 'function') cambiarReproducciones(item, 1);
    }
    function onAlbumEnded(e) {
        const audio = getAudio();
        if (!audio || e.target !== audio) return;
        if (!albumPlaying) return;
        const pl = getPlaylist();
        const active = pl ? pl.querySelector('.playlist-item.active') : null;
        if (active && albumQueue[albumIndex] && active !== albumQueue[albumIndex]) {
            albumPlaying = false;
            return;
        }
        e.stopImmediatePropagation();
        e.stopPropagation();
        const finished = albumQueue[albumIndex];
        registerCompletedPlay(finished);
        albumIndex++;
        if (albumIndex < albumQueue.length) playItem(albumQueue[albumIndex]);
        else { albumPlaying = false; resetAfterAlbum(); }
    }
    function resetAfterAlbum() {
        const audio = getAudio();
        if (!audio) return;
        try { audio.pause(); } catch (_) {}
        try { audio.currentTime = 0; } catch (_) {}
        const pb = document.getElementById('progress-bar');
        const ct = document.getElementById('current-time');
        if (pb) { pb.style.setProperty('--progress', '0%'); pb.setAttribute('aria-valuenow', '0'); }
        if (ct) ct.textContent = '0:00';
        const icon = document.getElementById('play-icon');
        if (icon) { icon.innerHTML = '<polygon points="5,3 19,12 5,21" fill="#ffffff" />'; icon.style.marginLeft = '3px'; }
        const btn = document.getElementById('play-button');
        if (btn) btn.setAttribute('aria-label', 'Reproducir');
        try { audio.dispatchEvent(new Event('pause')); } catch (_) {}
    }
    function openAlbum(albumName, artistName) {
        const items = findAlbumItems(albumName, artistName);
        if (!items.length) return;
        albumItems = items;
        if (avTitle) avTitle.textContent = albumName || 'Álbum';
        renderCarousel();
        renderList();
        setListMode(false);
        if (albumView) {
            albumView.classList.add('visible');
            albumView.setAttribute('aria-hidden', 'false');
        }
        if (avScroll) avScroll.scrollTop = 0;
        updateAlbumHighlight();
    }
    function closeAlbum() {
        if (!albumView) return;
        albumView.classList.remove('visible');
        albumView.setAttribute('aria-hidden', 'true');
    }
    function onHomeAlbumClick(e) {
        const carousel = document.getElementById('carousel-albums');
        if (!carousel) return;
        if (!e.target || !carousel.contains(e.target)) return;
        const card = e.target.closest ? e.target.closest('.home-card') : null;
        if (!card) return;
        const titleEl = card.querySelector('.home-card-title');
        if (!titleEl) return;
        const albumName  = titleEl.textContent.trim();
        const subEl      = card.querySelector('.home-card-sub');
        const artistName = subEl ? subEl.textContent.trim() : '';
        e.stopPropagation();
        e.preventDefault();
        openAlbum(albumName, artistName);
    }
    function onAnyManualClick(e) {
        if (internalClick) return;
        const t = e.target;
        if (!t || !t.closest) return;
        if (t.closest('#playlist .playlist-item')) albumPlaying = false;
    }
    function initPlaylistObserver() {
        const pl = getPlaylist();
        if (!pl) return;
        const obs = new MutationObserver(() => {
            if (!albumPlaying) return;
            const active = pl.querySelector('.playlist-item.active');
            if (active && albumQueue[albumIndex] && active !== albumQueue[albumIndex]) albumPlaying = false;
        });
        obs.observe(pl, { subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    function boot() {
        albumView = document.getElementById('album-view');
        if (!albumView) return;
        avTitle    = document.getElementById('av-title');
        avToggle   = document.getElementById('av-toggle');
        avScroll   = document.getElementById('av-scroll');
        avCarousel = document.getElementById('av-carousel');
        avList     = document.getElementById('av-list');
        avPlayAll  = document.getElementById('av-play-all');
        avBack     = document.getElementById('av-back');
        if (avBack)    avBack.addEventListener('click', closeAlbum);
        if (avToggle)  avToggle.addEventListener('click', () => setListMode(!listMode));
        if (avPlayAll) avPlayAll.addEventListener('click', startAlbumPlayback);
        document.addEventListener('click', onHomeAlbumClick, true);
        document.addEventListener('click', onAnyManualClick, true);
        window.addEventListener('ended', onAlbumEnded, true);
        const audio = getAudio();
        if (audio) audio.addEventListener('play', updateAlbumHighlight);
        initPlaylistObserver();
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && albumView.classList.contains('visible')) closeAlbum();
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else { boot(); }
})();

/* ============================================================
   11. BOTÓN "MOSTRAR TODAS LAS CANCIONES"
   ============================================================ */
(function () {
    'use strict';
    function getPlaylist() { return document.getElementById('playlist'); }
    function getSearchInput() { return document.getElementById('search-input'); }
    function apply() {
        if (typeof window.__applySearchVisibility === 'function') {
            window.__applySearchVisibility();
            return;
        }
        const pl = getPlaylist();
        if (!pl) return;
        pl.querySelectorAll('.playlist-item').forEach(it => {
            it.style.display = window.__showAllSongs ? 'flex' : 'none';
        });
    }
    function init() {
        const btn = document.getElementById('show-all-btn');
        const pl  = getPlaylist();
        const si  = getSearchInput();
        window.__showAllSongs = false;
        apply();
        if (btn) {
            btn.addEventListener('click', () => {
                if (navigator.vibrate) { try { navigator.vibrate(12); } catch (_) {} }
                window.__showAllSongs = true;
                apply();
                btn.setAttribute('hidden', '');
            });
        }
        if (si) {
            si.addEventListener('input', (e) => {
                const q = (e.target.value || '').trim();
                if (!q && !window.__showAllSongs) apply();
            });
        }
        if (pl) {
            const obs = new MutationObserver(() => {
                if (!window.__showAllSongs && !(getSearchInput()?.value || '').trim()) {
                    pl.querySelectorAll('.playlist-item').forEach(it => {
                        if (!it.style.display) it.style.display = 'none';
                    });
                }
            });
            obs.observe(pl, { childList: true });
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else { init(); }
})();

/* ============================================================
   12. PUENTE CON LA APP ANDROID (VERSIÓN FINAL CON PORTADA)
   ============================================================ */
(function () {
    'use strict';

    function safeBridge(method) {
        try {
            var args = Array.prototype.slice.call(arguments, 1);
            if (window.AndroidBridge && typeof window.AndroidBridge[method] === 'function') {
                window.AndroidBridge[method].apply(window.AndroidBridge, args);
            }
        } catch (e) {
            console.warn('AndroidBridge error:', e);
        }
    }

    function notificarAndroidPlay()  { safeBridge('onPlay'); }
    function notificarAndroidPause() { safeBridge('onPause'); }

    function notificarAndroidTrack() {
        var title = (document.getElementById('player-title')?.textContent || '').trim() || 'Kerim Music';
        var activeItem = document.querySelector('.playlist-item.active');
        var artist = 'Reproduciendo';
        var cover = '';

        if (activeItem) {
            var sub = activeItem.querySelector('.item-subtitle')?.textContent || '';
            var idx = sub.indexOf('·');
            artist = (idx === -1 ? sub : sub.slice(0, idx)).trim() || 'Reproduciendo';
            cover = activeItem.querySelector('.thumbnail img')?.src || '';
        }

        safeBridge('onTrackChangeWithCover', title, artist, cover);
    }

    window.notificarAndroidPlay  = notificarAndroidPlay;
    window.notificarAndroidPause = notificarAndroidPause;
    window.notificarAndroidTrack = notificarAndroidTrack;

    function init() {
        var audioPlayer = document.getElementById('audio-player');
        if (!audioPlayer) return;

        audioPlayer.addEventListener('play', function () {
            notificarAndroidPlay();
            setTimeout(notificarAndroidTrack, 150);
        });

        audioPlayer.addEventListener('pause', notificarAndroidPause);

        audioPlayer.addEventListener('loadedmetadata', function () {
            setTimeout(notificarAndroidTrack, 100);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.nextTrack = function () {
        document.dispatchEvent(new CustomEvent('omega:next'));
    };
    window.prevTrack = function () {
        document.dispatchEvent(new CustomEvent('omega:prev'));
    };
})();
