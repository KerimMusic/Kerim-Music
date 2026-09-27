/* ============================================================
   0.4. SISTEMA DE PLAYLISTS "TU PLAYLIST" (10 canciones c/u)
   ============================================================ */
const MAX_CANCIONES_POR_PLAYLIST = 10;
let playlistsCache = [];

async function cargarPlaylistsUsuario() {
    const user = firebase.auth().currentUser;
    if (!user) { playlistsCache = []; return; }

    try {
        const docRef = db.collection('playlists_usuarios').doc(user.uid);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const data = docSnap.data();
            const pls = Array.isArray(data.playlists) ? data.playlists : [];
            playlistsCache = pls.map(pl => ({
                id: pl.id || ('pl_' + Math.random().toString(36).slice(2)),
                nombre: pl.nombre || 'Tu Playlist',
                fecha: (pl.fecha && typeof pl.fecha.toDate === 'function')
                    ? pl.fecha.toDate() : new Date(0),
                canciones: Array.isArray(pl.canciones)
                    ? pl.canciones.map(c => ({
                        titulo: c.titulo || '',
                        fecha: (c.fecha && typeof c.fecha.toDate === 'function')
                            ? c.fecha.toDate() : new Date(0)
                      })).filter(c => c.titulo)
                    : []
            })).filter(pl => pl.canciones.length > 0);
        } else {
            playlistsCache = [];
        }
        console.log(`📼 Playlists cargadas: ${playlistsCache.length}`);
    } catch (e) {
        console.warn('Error al cargar playlists:', e);
        playlistsCache = [];
    }
}

async function guardarPlaylistsEnFirestore() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    try {
        const docRef = db.collection('playlists_usuarios').doc(user.uid);
        const docSnap = await docRef.get();

        const dataToSave = {
            playlists: playlistsCache.map(pl => ({
                id: pl.id,
                nombre: pl.nombre,
                fecha: firebase.firestore.Timestamp.fromDate(pl.fecha),
                canciones: pl.canciones.map(c => ({
                    titulo: c.titulo,
                    fecha: firebase.firestore.Timestamp.fromDate(c.fecha)
                }))
            }))
        };

        if (docSnap.exists) await docRef.update(dataToSave);
        else                await docRef.set(dataToSave);
    } catch (e) {
        console.warn('Error al guardar playlists:', e);
    }
}

async function guardarEnPlaylist(titulo) {
    const user = firebase.auth().currentUser;
    if (!user || !titulo) return;

    // Quitar duplicados de cualquier playlist existente
    playlistsCache.forEach(pl => {
        pl.canciones = pl.canciones.filter(c => c.titulo !== titulo);
    });
    // Eliminar playlists vacías
    playlistsCache = playlistsCache.filter(pl => pl.canciones.length > 0);

    // Buscar última playlist con espacio
    let ultima = playlistsCache[playlistsCache.length - 1];
    if (!ultima || ultima.canciones.length >= MAX_CANCIONES_POR_PLAYLIST) {
        ultima = {
            id: 'pl_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            nombre: 'Tu Playlist #' + (playlistsCache.length + 1),
            fecha: new Date(),
            canciones: []
        };
        playlistsCache.push(ultima);
    }

    ultima.canciones.push({ titulo, fecha: new Date() });
    await guardarPlaylistsEnFirestore();

    if (typeof window.__buildListenAgain === 'function') {
        window.__buildListenAgain();
    }
}

window.__cargarPlaylistsUsuario = cargarPlaylistsUsuario;
window.__guardarEnPlaylist     = guardarEnPlaylist;
window.__getPlaylistsCache     = () => playlistsCache;
