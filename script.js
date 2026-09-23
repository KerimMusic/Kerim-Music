/* ============================================================
   1. CONFIGURACIÓN DE FIREBASE
   ============================================================ */
// ⚠️ REEMPLAZA ESTO CON TUS CREDENCIALES REALES DE FIREBASE
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "kerim-music-a9c46.firebaseapp.com",
    projectId: "kerim-music-a9c46",
    storageBucket: "kerim-music-a9c46.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

/* Cache de documentos de Firebase */
let firebaseDocsCache = [];

/* Normalizar string (quita tildes, espacios, mayúsculas) */
function normalizeStr(str) {
    return String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

/* Buscar el documento de Firebase que corresponde a un título del HTML */
function findFirebaseDoc(songTitle) {
    if (!songTitle || firebaseDocsCache.length === 0) return null;
    const nTitle = normalizeStr(songTitle);
    if (!nTitle) return null;

    for (const doc of firebaseDocsCache) {
        if (normalizeStr(doc.id) === nTitle) return doc;
    }
    for (const doc of firebaseDocsCache) {
        const nId = normalizeStr(doc.id);
        if (nId.includes(nTitle) || nTitle.includes(nId)) return doc;
    }
    const prefix = nTitle.substring(0, Math.min(nTitle.length, 6));
    if (prefix.length >= 4) {
        for (const doc of firebaseDocsCache) {
            if (normalizeStr(doc.id).startsWith(prefix)) return doc;
        }
    }
    return null;
}

/* Cargar todos los docs de Firebase */
async function cargarDocsDeFirebase() {
    try {
        const snap = await db.collection('Radio_Muisc').get();
        firebaseDocsCache = snap.docs.map(d => ({
            id: d.id,
            ref: d.ref,
            data: d.data()
        }));
        console.log(`🔥 Firebase: ${firebaseDocsCache.length} canciones cargadas`);
    } catch (e) {
        console.warn('⚠️ No se pudieron cargar docs de Firebase:', e);
    }
}

/* Mostrar contador de reproducciones en un item */
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

/* Pintar todos los contadores según Firebase */
function pintarTodasLasReproducciones() {
    document.querySelectorAll('.playlist-item').forEach(item => {
        const title = item.querySelector('.item-title')?.textContent.trim() || '';
        const doc = findFirebaseDoc(title);
        if (doc) {
            pintarReproducciones(item, doc.data.reproducciones || 0);
        }
    });
}

/* Cambiar reproducciones en Firebase (delta = +1 o -1) */
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
        console.log(`${delta > 0 ? '👍 +1' : '👎 -1'} a "${doc.id}" (total: ${nuevo})`);
    } catch (e) {
        console.warn('No se pudo actualizar reproducciones:', e);
    }
}

/* ============================================================
   🔥 MODO ARTISTA (GLOBAL)
   ============================================================ */
window.__artistFilter      = null;
window.__artistFilterName  = '';

function clearArtistFilter() {
    window.__artistFilter     = null;
    window.__artistFilterName = '';
    document.dispatchEvent(new CustomEvent('omega:artistmode', { detail: { active: false } }));
}

function setArtistFilter(items, name) {
    if (!items || !items.length) return;
    window.__artistFilter     = items.slice();
    window.__artistFilterName = name || '';
    document.dispatchEvent(new CustomEvent('omega:artistmode', {
        detail: { active: true, name: name || '' }
    }));
}

/* ============================================================
   2. CONFIGURACIÓN DE ANUNCIOS
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

        if (getComputedStyle(el).position === 'static') {
            el.style.position = 'relative';
        }
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
     '.submenu-link', '.play-button']
        .forEach(selector => {
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
        const value = Math.min(100, Math.max(0, percent));
        progressBar.style.setProperty('--progress', `${value}%`);
        progressBar.setAttribute('aria-valuenow', Math.round(value));
    }

    function updateIcon(playing) {
        playIcon.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
        playIcon.style.marginLeft = playing ? '0' : '3px';
        playButton.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
    }

    function getAllItems() {
        return Array.from(playlist.querySelectorAll('.playlist-item'));
    }

    function getItemTitle(item) {
        if (!item) return '';
        return (
            item.querySelector('.item-title')?.textContent.trim() ||
            item.dataset.title?.trim() ||
            ''
        );
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

    function shufflePlaylist() {
        const items = getAllItems();
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }
        items.forEach(item => playlist.appendChild(item));
    }

    function loadItem(item, autoplay = true) {
        if (!item) return;

        const src   = item.dataset.src;
        const cover = getItemCover(item);
        const title = getItemTitle(item);

        if (!src) {
            console.warn('Ítem sin data-src:', item);
            handleLoadError(item);
            return;
        }

        getAllItems().forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        currentItem = item;
        playerCover.src = cover || '';
        playerTitle.textContent = title;
        player.classList.add('active');

        audioPlayer.src = src;
        audioPlayer.currentTime = 0;
        updateProgress(0);
        currentTimeEl.textContent = '0:00';
        durationEl.textContent = '0:00';

        if (autoplay) {
            audioPlayer.play().catch(err => {
                console.warn('No se pudo iniciar automáticamente:', err);
            });
        }
    }

    function handleLoadError(failedItem) {
        if (isSkipping) return;
        isSkipping = true;

        console.warn('Pista no reproducible:', getItemTitle(failedItem) || failedItem);

        updateIcon(false);
        updateProgress(0);
        currentTimeEl.textContent = '0:00';
        durationEl.textContent = '0:00';

        setTimeout(() => {
            isSkipping = false;
            playRandomItem();
        }, 300);
    }

    audioPlayer.addEventListener('error', () => {
        handleLoadError(currentItem);
    });

    function playRandomItem() {
        const items = getCandidateItems();
        if (items.length === 0) return;

        let candidates = items;
        if (items.length > 1 && currentItem && items.includes(currentItem)) {
            candidates = items.filter(i => i !== currentItem);
        }
        if (candidates.length === 0) candidates = items;

        const randomItem = candidates[Math.floor(Math.random() * candidates.length)];
        loadItem(randomItem, true);
    }

    function goNextItem() {
        const items = getCandidateItems();
        if (!items.length) return;
        let idx = items.indexOf(currentItem);
        if (idx === -1) idx = 0;
        const next = items[(idx + 1) % items.length];
        loadItem(next, true);
    }

    function goPrevItem() {
        const items = getCandidateItems();
        if (!items.length) return;
        let idx = items.indexOf(currentItem);
        if (idx === -1) idx = 0;
        const prev = items[(idx - 1 + items.length) % items.length];
        loadItem(prev, true);
    }

    shufflePlaylist();

    playButton.addEventListener('click', () => {
        if (!currentItem) {
            playRandomItem();
            return;
        }
        if (audioPlayer.paused) {
            audioPlayer.play().catch(err => console.error('Error al reproducir:', err));
        } else {
            audioPlayer.pause();
        }
    });

    audioPlayer.addEventListener('play',  () => updateIcon(true));
    audioPlayer.addEventListener('pause', () => updateIcon(false));

    audioPlayer.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(audioPlayer.duration);
    });

    audioPlayer.addEventListener('timeupdate', () => {
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        if (audioPlayer.duration > 0) {
            updateProgress((audioPlayer.currentTime / audioPlayer.duration) * 100);
        }
    });

    audioPlayer.addEventListener('ended', async () => {
        const duration  = audioPlayer.duration;
        const played    = audioPlayer.currentTime;
        const completed = !!duration && isFinite(duration) && played >= (duration - 1.5);

        updateIcon(false);
        updateProgress(0);
        currentTimeEl.textContent = '0:00';

        if (completed && currentItem) {
            const key = getItemKey(currentItem);
            if (key) {
                const data = getLikeData(key);
                const alreadyLiked = !!(data && data.liked !== false);

                if (!alreadyLiked) {
                    setLikeData(key, { liked: true, ts: Date.now(), locked: true });
                    updateLikeUI();
                    await cambiarReproducciones(currentItem, 1);
                }
            }
        }

        playRandomItem();
    });

    progressBar.addEventListener('click', (e) => {
        if (!audioPlayer.duration) return;
        const rect  = progressBar.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        audioPlayer.currentTime = Math.min(1, Math.max(0, ratio)) * audioPlayer.duration;
    });

    playlist.addEventListener('click', (e) => {
        const item = e.target.closest('.playlist-item');
        if (!item) return;

        if (window.__artistFilter && window.__artistFilter.length) {
            if (!window.__artistFilter.includes(item)) {
                clearArtistFilter();
            }
        }

        loadItem(item, true);
    });

    const coverObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            const img  = mutation.target;
            const item = img.closest('.playlist-item');
            if (!item) return;

            const newSrc = img.getAttribute('src') || '';

            if (item === currentItem) {
                playerCover.src = newSrc;
            }
        });
    });

    getAllItems().forEach(item => {
        const img = item.querySelector('.thumbnail img');
        if (img) {
            coverObserver.observe(img, { attributes: true, attributeFilter: ['src'] });
        }
    });

    const heartSearchBtn  = document.getElementById('heart-search-btn');
    const searchContainer = document.getElementById('search-container');
    const searchInput     = document.getElementById('search-input');

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

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const items = document.querySelectorAll('.playlist-item');

            items.forEach(item => {
                const title    = item.querySelector('.item-title')?.textContent.toLowerCase() || '';
                const subtitle = item.querySelector('.item-subtitle')?.textContent.toLowerCase() || '';

                if (title.includes(query) || subtitle.includes(query)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }

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
                navigator.share(shareData)
                    .then(() => console.log('Compartido con éxito'))
                    .catch((error) => console.log('Error al compartir:', error));
            } else {
                const textToCopy = `${shareData.text}\n${SHARE_URL}`;
                navigator.clipboard.writeText(textToCopy).then(() => {
                    alert('¡Enlace y título copiados al portapapeles!');
                }).catch(err => {
                    console.error('Error al copiar:', err);
                    alert('No se pudo compartir automáticamente. Copia este enlace: ' + SHARE_URL);
                });
            }
        });
    }

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

    /* ============================================================
       FULLSCREEN PLAYER
       ============================================================ */
    if (!player || !audioPlayer || !playlist || !playerCover || !playerTitle || !playButton) return;

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

    const fsPlayer    = document.getElementById('fs-player');
    const fsBg        = document.getElementById('fs-bg');
    const fsContent   = document.getElementById('fs-content');
    const fsVinyl     = document.getElementById('fs-vinyl');
    const fsCover     = document.getElementById('fs-cover');
    const fsTitle     = document.getElementById('fs-title');
    const fsClose     = document.getElementById('fs-close');

    const fsLikeBtn    = document.getElementById('fs-like');

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
        if (val === true) {
            return { liked: true, ts: 0, locked: false };
        }
        if (typeof val === 'object') return val;
        return null;
    }

    function isLikeLocked(key) {
        const data = getLikeData(key);
        if (!data || !data.locked) return false;
        const elapsed = Date.now() - (data.ts || 0);
        return elapsed < LIKE_LOCK_MS;
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
        toast._hideTimer = setTimeout(() => {
            toast.classList.remove('visible');
        }, 4500);
    }

    function updateLikeUI() {
        if (!fsLikeBtn) return;
        const key = getItemKey(currentItem);
        if (!key) {
            fsLikeBtn.classList.remove('active');
            return;
        }
        const data = getLikeData(key);
        const isLiked = !!(data && data.liked !== false);
        fsLikeBtn.classList.toggle('active', isLiked);
    }

    fsLikeBtn.addEventListener('click', async () => {
        if (!currentItem) return;
        const key = getItemKey(currentItem);
        if (!key) return;

        if (isLikeLocked(key)) {
            showNotification(
                'No puedes manipular el botón de Me gusta durante 30 días. ' +
                'Ya te convertiste en un oyente de esta canción. ¡Disfrútala!'
            );
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
        if (!playlist.querySelector('.playlist-item.active')) {
            playButton.click();
        }
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

    fsClose.addEventListener('click', closeFullscreen);

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
                onGesture({
                    dx: e2.clientX - sx,
                    dy: e2.clientY - sy,
                    dt: Date.now() - st,
                    target
                });
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

        if (!onProgress && dt < 400 && absX < 12 && absY < 12) {
            openFullscreen();
            return;
        }

        if (dt > 800) return;
        if (absY > 40 && absY > absX * 1.2 && dy < 0) {
            openFullscreen();
        }
    });

    attachGesture(fsPlayer, ({ dx, dy, dt, target }) => {
        const absX = Math.abs(dx), absY = Math.abs(dy);
        const onVinyl = target && target.closest && target.closest('.fs-vinyl-wrap');

        if (onVinyl && dt < 400 && absX < 12 && absY < 12) {
            playButton.click();
            return;
        }

        if (dt > 1200) return;
        if (absY > 50 && absY > absX * 1.3) {
            if (dy < 0) goNextItem();
            else        goPrevItem();
        }
    });

    function getItems() {
        return Array.from(playlist.querySelectorAll('.playlist-item'));
    }

    function getActiveIndex() {
        const items  = getItems();
        const active = playlist.querySelector('.playlist-item.active');
        return items.indexOf(active);
    }

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

    function goNext() {
        animateSlide('up');
        goNextItem();
        setTimeout(resetVinylSpin, 60);
    }

    function goPrev() {
        animateSlide('down');
        goPrevItem();
        setTimeout(resetVinylSpin, 60);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && fsPlayer.classList.contains('visible')) {
            closeFullscreen();
        }
    });

    /* ============================================================
       NUEVA FUNCIÓN: Título clickeable en pantalla completa
       ============================================================ */
    (function initFsTitleArtistLink() {
        const fsTitleEl = document.getElementById('fs-title');
        if (!fsTitleEl || !playlist) return;

        fsTitleEl.style.cursor = 'pointer';
        fsTitleEl.style.pointerEvents = 'auto';
        fsTitleEl.style.touchAction = 'manipulation';
        fsTitleEl.setAttribute('role', 'button');
        fsTitleEl.setAttribute('tabindex', '0');

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

            if (typeof closeFullscreen === 'function') {
                closeFullscreen();
            }

            setTimeout(() => {
                window.__openArtistProfile(artistName);
            }, 80);
        }

        fsTitleEl.addEventListener('click', openArtistFromTitle);
        fsTitleEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openArtistFromTitle();
            }
        });

        fsTitleEl.addEventListener('pointerdown', () => {
            fsTitleEl.style.opacity = '0.7';
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt => {
            fsTitleEl.addEventListener(evt, () => {
                fsTitleEl.style.opacity = '';
            });
        });
    })();

    (async () => {
        await cargarDocsDeFirebase();
        pintarTodasLasReproducciones();
    })();

});

/* ============================================================
   4. GESTOR DE ANUNCIOS
   ============================================================ */
(function () {
    'use strict';

    function init() {
        var audioPlayer = document.getElementById('audio-player');
        if (!audioPlayer) { console.warn('Anuncios: no se encontró #audio-player.'); return; }
        if (typeof ADS === 'undefined' || !Array.isArray(ADS) || ADS.length === 0) {
            console.warn('Anuncios: la lista ADS no está disponible.');
            return;
        }

        var BEATS_PER_AD = 6;
        var SKIP_DELAY   = 5;

        var beatPlayCount     = 0;
        var lastSrc           = '';
        var isAdPlaying       = false;
        var adIndex           = 0;
        var adOnComplete      = null;
        var currentAdMedia    = null;
        var countdownInterval = null;
        var adTimeout         = null;

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
                    showAd(function () {
                        originalPlay().catch(function () {});
                    });
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
                try {
                    currentAdMedia.pause();
                    currentAdMedia.removeAttribute('src');
                    currentAdMedia.load();
                } catch (_) {}
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
                    img.src       = ad.url;
                    img.alt       = ad.title || 'Anuncio';
                    img.className = 'ad-cover';
                    adMedia.appendChild(img);
                }
                if (ad.music) {
                    mediaEl = document.createElement('audio');
                    mediaEl.src     = ad.music;
                    mediaEl.preload = 'auto';
                    adMedia.appendChild(mediaEl);
                }
            }

            currentAdMedia = mediaEl;
            overlay.classList.add('visible');
            overlay.setAttribute('aria-hidden', 'false');

            var remaining = SKIP_DELAY;
            adSkip.disabled  = true;
            adSkip.innerHTML =
                'Saltar anuncio (<span class="ad-countdown">' + remaining + '</span>)';

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
                mediaEl.addEventListener('error', function () {
                    adTimeout = setTimeout(endAd, 900);
                }, { once: true });

                var p = mediaEl.play();
                if (p && p.catch) {
                    p.catch(function (err) {
                        console.warn('Anuncio bloqueado, intentando en silencio…', err);
                        mediaEl.muted = true;
                        var p2 = mediaEl.play();
                        if (p2 && p2.catch) {
                            p2.catch(function () {
                                adTimeout = setTimeout(endAd, 4000);
                            });
                        }
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
                try {
                    currentAdMedia.pause();
                    currentAdMedia.removeAttribute('src');
                    currentAdMedia.load();
                } catch (_) {}
                currentAdMedia = null;
            }

            adMedia.innerHTML = '';
            overlay.classList.remove('visible');
            overlay.setAttribute('aria-hidden', 'true');

            adSkip.disabled = true;
            adSkip.innerHTML =
                'Saltar anuncio (<span class="ad-countdown">' + SKIP_DELAY + '</span>)';

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
    } else {
        init();
    }
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

        let currentArtist   = null;
        let refreshTimer    = null;
        let gridObserver    = null;
        const COLLAB_SPLIT  = /\s+(?:ft\.?|feat\.?|featuring|con|&)\s+/i;

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
                if (doc && typeof doc.data.reproducciones === 'number') {
                    total += doc.data.reproducciones;
                }
            });
            return total;
        }

        function formatNumber(n) {
            try { return (n || 0).toLocaleString('es-MX'); }
            catch (_) { return String(n || 0); }
        }

        function updatePlayingCard() {
            const active = playlist.querySelector('.playlist-item.active');
            const activeTitle = active
                ? (active.querySelector('.item-title')?.textContent.trim() || '')
                : '';

            apGrid.querySelectorAll('.ap-card').forEach(card => {
                if (activeTitle && card.dataset.title === activeTitle) {
                    card.classList.add('playing');
                } else {
                    card.classList.remove('playing');
                }
            });
        }

        function activateArtistMode(artistName) {
            const list = getArtistItems(artistName);
            if (!list.length) return null;
            if (typeof setArtistFilter === 'function') {
                setArtistFilter(list, artistName);
            } else {
                window.__artistFilter = list.slice();
                window.__artistFilterName = artistName;
            }
            console.log(`🎤 Modo artista ACTIVADO: ${artistName} (${list.length} canciones)`);
            return list;
        }

        function renderProfile(artistName) {
            currentArtist = artistName;
            const items = getArtistItems(artistName);
            if (!items.length) return;

            apArtist.textContent = artistName;

            const covers = items
                .map(i => i.querySelector('.thumbnail img')?.src)
                .filter(Boolean);

            if (covers.length) {
                const chosen = covers[Math.floor(Math.random() * covers.length)];
                apHeroImg.classList.remove('loaded');
                apHeroImg.src = chosen;
                if (apHeroImg.complete) {
                    apHeroImg.classList.add('loaded');
                } else {
                    apHeroImg.onload = () => apHeroImg.classList.add('loaded');
                }
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
                    img.src = cover;
                    img.alt = title;
                    img.loading = 'lazy';
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
                const randomIdx = Math.floor(Math.random() * list.length);
                list[randomIdx].click();
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
            gridObserver.observe(playlist, {
                subtree: true,
                attributes: true,
                attributeFilter: ['class']
            });

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
            if (e.key === 'Escape' && profileEl.classList.contains('visible')) {
                closeProfile();
            }
        });

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const q = normalizeStr(e.target.value);
                if (!q) return;
                const artists = getAllArtistsMap();
                if (artists.has(q)) {
                    openProfile(artists.get(q));
                }
            });
        }

        window.__openArtistProfile = openProfile;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initArtistProfile);
    } else {
        initArtistProfile();
    }
})();

/* ============================================================
   6. REPETIR + ALEATORIO (PANTALLA COMPLETA)
   ------------------------------------------------------------
   Módulo 100% independiente. NO modifica ninguna función
   existente: agrega dos botones dentro de .fs-actions (encima
   del botón "Me Gusta") y controla el modo de reproducción.

   · Repetir   → Desactivado / Repetir todo / Repetir 1 canción
   · Aleatorio → Activado / Desactivado

   IMPORTANTE:
   La función "Repetir" SOLO controla la reproducción.
   NO suma reproducciones adicionales, NO activa el botón de
   Me gusta, NO lo quita, NO reinicia el bloqueo de 30 días
   y NO permite generar reproducciones extra usando Repetir.
   ============================================================ */
(function () {
    'use strict';

    /* ---------- Claves de persistencia ---------- */
    const REPEAT_KEY  = 'omega_repeat_mode_v1';
    const SHUFFLE_KEY = 'omega_shuffle_v1';
    const LIKES_KEY   = 'omega_likes_v1';

    /* ---------- Estado ---------- */
    let repeatMode = 'off';   /* 'off' | 'all' | 'one' */
    let shuffleOn  = true;    /* por defecto se conserva el comportamiento aleatorio actual */

    try {
        const r = localStorage.getItem(REPEAT_KEY);
        if (r === 'off' || r === 'all' || r === 'one') repeatMode = r;

        const s = localStorage.getItem(SHUFFLE_KEY);
        if (s === '0')      shuffleOn = false;
        else if (s === '1') shuffleOn = true;
    } catch (_) {}

    function persist() {
        try {
            localStorage.setItem(REPEAT_KEY, repeatMode);
            localStorage.setItem(SHUFFLE_KEY, shuffleOn ? '1' : '0');
        } catch (_) {}
    }

    /* ---------- Iconos (mismo trazo que el resto del reproductor) ---------- */
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

    /* ---------- Referencias ---------- */
    let repeatBtn  = null;
    let shuffleBtn = null;

    /* ---------- Utilidades ---------- */
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

    /* ---------- UI ---------- */
    function updateRepeatUI() {
        if (!repeatBtn) return;
        repeatBtn.classList.toggle('active', repeatMode !== 'off');
        repeatBtn.classList.toggle('mode-one', repeatMode === 'one');

        const aria = repeatMode === 'one' ? 'Repetir 1 canción'
                   : repeatMode === 'all' ? 'Repetir todo'
                   : 'Repetir desactivado';
        repeatBtn.setAttribute('aria-label', aria);
        repeatBtn.setAttribute('title', aria);
    }

    function updateShuffleUI() {
        if (!shuffleBtn) return;
        shuffleBtn.classList.toggle('active', shuffleOn);
        const aria = shuffleOn ? 'Aleatorio activado' : 'Aleatorio desactivado';
        shuffleBtn.setAttribute('aria-label', aria);
        shuffleBtn.setAttribute('title', aria);
    }

    /* ---------- Aplicar el modo repetir al <audio> ----------
       NO usamos el loop nativo del elemento <audio>. Así el evento
       "ended" siempre dispara y podemos decidir manualmente si
       repetir la canción SIN tocar el sistema de reproducciones
       ni el de Me gusta. */
    function applyRepeatToAudio() {
        const audio = document.getElementById('audio-player');
        if (!audio) return;
        try { audio.loop = false; } catch (_) {}
    }

    /* ---------- Lista secuencial (respeta el modo artista) ---------- */
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

    /* ---------- Registro de reproducción completada ----------
       Solo registra la PRIMERA vez que la canción se completa.
       Si ya está marcada como "Me gusta", no suma reproducción
       adicional, no reinicia el bloqueo de 30 días y no altera
       el estado del Me gusta. Por eso, repetir una canción NO
       genera reproducciones extra. */
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
        if (alreadyLiked) return;

        map[key] = { liked: true, ts: Date.now(), locked: true };
        try { localStorage.setItem(LIKES_KEY, JSON.stringify(map)); } catch (_) {}

        if (typeof cambiarReproducciones === 'function') {
            cambiarReproducciones(item, 1);
        }
    }

    /* ---------- Fin de lista ---------- */
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

    /* ---------- Interceptor del evento "ended" (fase captura) ---------- */
    function onEndedCapture(e) {
        const audio = document.getElementById('audio-player');
        if (!audio || e.target !== audio) return;

        /* ============================================================
           REPETIR 1 CANCIÓN
           ------------------------------------------------------------
           Registramos la reproducción SOLO la primera vez que la
           canción se completa (si aún no tiene "Me gusta"). En las
           repeticiones posteriores, registrarReproduccionCompletada()
           detecta que ya está marcada y NO suma reproducciones, NO
           reactiva el Me gusta, NO lo quita y NO reinicia el bloqueo
           de 30 días. Después reiniciamos la pista y la reproducimos
           de nuevo.
           ============================================================ */
        if (repeatMode === 'one') {
            e.stopPropagation();

            const activeItem = document.querySelector('.playlist-item.active');
            if (activeItem) registrarReproduccionCompletada(activeItem);

            try { audio.currentTime = 0; } catch (_) {}
            const p = audio.play();
            if (p && p.catch) p.catch(() => {});
            return;
        }

        /* Aleatorio activado → comportamiento aleatorio original */
        if (shuffleOn) return;

        /* ============================================================
           SECUENCIAL (Repetir todo / Repetir desactivado)
           ------------------------------------------------------------
           registrarReproduccionCompletada() solo suma la primera vez
           que se completa cada canción. Al dar la vuelta a la lista
           (repeatMode === 'all'), las canciones ya están marcadas y
           no vuelven a sumar.
           ============================================================ */
        e.stopPropagation();

        const playlist = document.getElementById('playlist');
        if (!playlist) return;

        const list   = getSequentialList();
        if (!list.length) return;

        const active = playlist.querySelector('.playlist-item.active');
        const idx    = list.indexOf(active);

        registrarReproduccionCompletada(active);

        let nextItem = null;

        if (idx === -1) {
            nextItem = list[0];
        } else if (idx + 1 < list.length) {
            nextItem = list[idx + 1];
        } else if (repeatMode === 'all') {
            nextItem = list[0];
        }

        if (nextItem) {
            nextItem.click();
        } else {
            detenerAlFinal(audio);
        }
    }

    /* ---------- Construcción de los botones ---------- */
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
            repeatMode = repeatMode === 'off' ? 'all'
                       : repeatMode === 'all' ? 'one'
                       : 'off';
            persist();
            applyRepeatToAudio();
            updateRepeatUI();

            toast(repeatMode === 'off' ? 'Repetir: desactivado'
                : repeatMode === 'all' ? 'Repetir: toda la lista'
                : 'Repetir: 1 canción');
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
        if ((attempt || 0) < 20) {
            setTimeout(() => bootWithRetry((attempt || 0) + 1), 150);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => bootWithRetry(0));
    } else {
        bootWithRetry(0);
    }
})();
