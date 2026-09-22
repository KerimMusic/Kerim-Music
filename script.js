/* ============================================================
   CONFIGURACIÓN DE ANUNCIOS
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
   REPRODUCTOR PRINCIPAL
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

    /* ---------- Haptics + Ripple ---------- */
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

    /* ---------- Utilidades ---------- */
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

    /* ---------- Mezclar ---------- */
    function shufflePlaylist() {
        const items = getAllItems();
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }
        items.forEach(item => playlist.appendChild(item));
    }

    /* ---------- Cargar item ---------- */
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
        const items = getAllItems();
        if (items.length === 0) return;

        let candidates = items;
        if (items.length > 1 && currentItem) {
            candidates = items.filter(i => i !== currentItem);
        }
        const randomItem = candidates[Math.floor(Math.random() * candidates.length)];
        loadItem(randomItem, true);
    }

    shufflePlaylist();

    /* ---------- Play ---------- */
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

    /* ---------- Eventos de audio ---------- */
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

    audioPlayer.addEventListener('ended', () => {
        updateIcon(false);
        updateProgress(0);
        currentTimeEl.textContent = '0:00';
        playRandomItem();
    });

    /* ---------- Buscar en barra de progreso ---------- */
    progressBar.addEventListener('click', (e) => {
        if (!audioPlayer.duration) return;
        const rect  = progressBar.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        audioPlayer.currentTime = Math.min(1, Math.max(0, ratio)) * audioPlayer.duration;
    });

    /* ---------- Lista ---------- */
    playlist.addEventListener('click', (e) => {
        const item = e.target.closest('.playlist-item');
        if (!item) return;
        loadItem(item, true);
    });

    /* ---------- Sincronización de portadas ---------- */
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

    /* ---------- Buscar (corazón) ---------- */
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

    /* ---------- Compartir ---------- */
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

    /* ---------- Submenú ---------- */
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
       REPRODUCTOR A PANTALLA COMPLETA (VINILO + SWIPE VERTICAL)
       ============================================================ */
    if (!player || !audioPlayer || !playlist || !playerCover || !playerTitle || !playButton) return;

    /* ---------- 1. INYECTAR HTML ---------- */
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
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', fsHTML);

    /* ---------- 2. INYECTAR CSS ---------- */
    const styleEl = document.createElement('style');
    styleEl.id = 'fs-player-styles';
    styleEl.textContent = `
    .fs-player {
        position: fixed;
        inset: 0;
        width: 100%;
        height: 100%;
        background: #050505;
        z-index: 900;
        display: flex;
        flex-direction: column;
        transform: translateY(100%);
        transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
        overflow: hidden;
        touch-action: none;
        -webkit-user-select: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
    }
    .fs-player.visible { transform: translateY(0); }
    .fs-player:not(.visible) { pointer-events: none; }

    .fs-bg {
        position: absolute;
        inset: -10%;
        background-size: cover;
        background-position: center;
        filter: blur(60px) brightness(0.35) saturate(1.15);
        transform: scale(1.2);
        z-index: 0;
        pointer-events: none;
        transition: background-image 0.4s ease;
    }

    .fs-top-bar {
        position: relative;
        z-index: 3;
        display: flex;
        justify-content: flex-end;
        padding: 18px 18px 0;
        flex-shrink: 0;
    }

    .fs-close {
        background: rgba(255,255,255,0.08);
        border: none;
        border-radius: 50%;
        width: 42px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s ease, transform 0.15s ease;
    }
    .fs-close:active {
        transform: scale(0.9);
        background: rgba(255,255,255,0.18);
    }

    .fs-content {
        position: relative;
        z-index: 2;
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 34px;
        padding: 0 30px 50px;
        transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.32s ease;
        min-height: 0;
    }

    .fs-vinyl-wrap {
        position: relative;
        width: min(72vw, 62vh, 380px);
        aspect-ratio: 1 / 1;
        cursor: pointer;
        flex-shrink: 0;
    }

    .fs-vinyl {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        overflow: hidden;
        background: #0a0a0a;
        box-shadow:
            0 0 0 12px #0b0b0b,
            0 0 0 14px #1c1c1c,
            0 0 0 15px #060606,
            0 25px 60px rgba(0,0,0,0.85),
            0 0 90px rgba(255,42,42,0.10);
        animation: fs-spin 14s linear infinite;
        animation-play-state: paused;
        position: relative;
        will-change: transform;
    }
    .fs-vinyl.playing { animation-play-state: running; }

    .fs-cover {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        display: block;
        border-radius: 50%;
        pointer-events: none;
    }

    .fs-spindle {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: radial-gradient(circle at 35% 35%, #3a3a3a 0%, #111 45%, #000 100%);
        transform: translate(-50%, -50%);
        box-shadow:
            inset 0 2px 4px rgba(255,255,255,0.20),
            0 0 0 3px rgba(0,0,0,0.60);
        pointer-events: none;
        z-index: 2;
    }

    @keyframes fs-spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
    }

    .fs-title {
        font-size: clamp(20px, 5.4vw, 28px);
        font-weight: 800;
        line-height: 1.25;
        text-align: center;
        color: #ffffff;
        max-width: 100%;
        word-break: break-word;
        text-shadow: 0 2px 12px rgba(0,0,0,0.65);
        padding: 0 8px;
    }

    @media (max-height: 640px) {
        .fs-content { gap: 20px; padding-bottom: 26px; }
    }
    `;
    document.head.appendChild(styleEl);

    /* ---------- 3. REFERENCIAS ---------- */
    const fsPlayer    = document.getElementById('fs-player');
    const fsBg        = document.getElementById('fs-bg');
    const fsContent   = document.getElementById('fs-content');
    const fsVinyl     = document.getElementById('fs-vinyl');
    const fsCover     = document.getElementById('fs-cover');
    const fsTitle     = document.getElementById('fs-title');
    const fsClose     = document.getElementById('fs-close');

    /* ---------- 4. SINCRONIZACIÓN ---------- */
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

    /* ---------- 5. ABRIR / CERRAR ---------- */
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

    /* ---------- 6. GESTOS ROBUSTOS ---------- */
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
            if (dy < 0) goNext();
            else        goPrev();
        }
    });

    /* ---------- 7. NAVEGACIÓN TIPO TIKTOK ---------- */
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
        const items = getItems();
        if (!items.length) return;
        let idx = getActiveIndex();
        if (idx === -1) idx = 0;
        const nextIdx = (idx + 1) % items.length;

        animateSlide('up');
        items[nextIdx].click();
        setTimeout(resetVinylSpin, 60);
    }

    function goPrev() {
        const items = getItems();
        if (!items.length) return;
        let idx = getActiveIndex();
        if (idx === -1) idx = 0;
        const prevIdx = (idx - 1 + items.length) % items.length;

        animateSlide('down');
        items[prevIdx].click();
        setTimeout(resetVinylSpin, 60);
    }

    /* ---------- 8. TECLA ESC ---------- */
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && fsPlayer.classList.contains('visible')) {
            closeFullscreen();
        }
    });

});

/* ============================================================
   GESTOR DE ANUNCIOS
   - Un anuncio de audio/video cada 6 beats.
   - No modifica portada, título, controles ni fullscreen.
   ============================================================ */
(function () {
    'use strict';

    function init() {

        var audioPlayer = document.getElementById('audio-player');
        if (!audioPlayer) {
            console.warn('Anuncios: no se encontró #audio-player.');
            return;
        }
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

        /* ---------- OVERLAY ---------- */
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

        /* ---------- INTERCEPTAR play() ---------- */
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

        /* ---------- MOSTRAR ANUNCIO ---------- */
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

        /* ---------- TERMINAR ANUNCIO ---------- */
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

        /* ---------- BOTÓN SALTAR ---------- */
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