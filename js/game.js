// ============================================================
// TOWER DEFENSE - Military Warfare Edition
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game speed multiplier (1x, 2x, 3x)
let gameSpeedMultiplier = 1;

// ---- Sound System (Web Audio API, procedural) ----
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

// Generic noise burst for gunshots
function playSound(type, volume = 0.15) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const gain = audioCtx.createGain();
    gain.connect(audioCtx.destination);

    if (type === 'mg') {
        // Machine gun: short white noise burst
        const dur = 0.04;
        const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        gain.gain.setValueAtTime(volume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        src.connect(gain);
        src.start(now);
    } else if (type === 'sniper') {
        // Sniper: sharp crack
        const dur = 0.1;
        const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.01));
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        gain.gain.setValueAtTime(volume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        src.connect(gain);
        src.start(now);
    } else if (type === 'missile') {
        // Missile: low whoosh
        const osc = audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.2);
        gain.gain.setValueAtTime(volume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'explosion') {
        // Explosion: noise + low rumble
        const dur = 0.3;
        const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.08));
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + dur);
        gain.gain.setValueAtTime(volume * 0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        src.connect(filter);
        filter.connect(gain);
        src.start(now);
    } else if (type === 'enemy_shot') {
        // Enemy shooting: short pop
        const dur = 0.06;
        const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.015));
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 600;
        gain.gain.setValueAtTime(volume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        src.connect(filter);
        filter.connect(gain);
        src.start(now);
    } else if (type === 'enemy_tank') {
        // Tank shot: deep boom
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
        gain.gain.setValueAtTime(volume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.15);
        // Add noise layer
        const dur2 = 0.12;
        const buf2 = audioCtx.createBuffer(1, audioCtx.sampleRate * dur2, audioCtx.sampleRate);
        const d2 = buf2.getChannelData(0);
        for (let i = 0; i < d2.length; i++) d2[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.03));
        const src2 = audioCtx.createBufferSource();
        src2.buffer = buf2;
        const g2 = audioCtx.createGain();
        g2.gain.setValueAtTime(volume * 0.3, now);
        g2.gain.exponentialRampToValueAtTime(0.001, now + dur2);
        src2.connect(g2);
        g2.connect(audioCtx.destination);
        src2.start(now);
    } else if (type === 'flame') {
        // Flamethrower: sustained hiss
        const dur = 0.1;
        const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 0.5;
        gain.gain.setValueAtTime(volume * 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        src.connect(filter);
        filter.connect(gain);
        src.start(now);
    } else if (type === 'emp') {
        // EMP: electric zap
        const osc = audioCtx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(2000, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
        gain.gain.setValueAtTime(volume * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.15);
    } else if (type === 'place') {
        // Tower placement: metallic clunk
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
        gain.gain.setValueAtTime(volume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.08);
    } else if (type === 'sell') {
        // Sell: coin sound
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(1200, now + 0.05);
        osc.frequency.setValueAtTime(1000, now + 0.1);
        gain.gain.setValueAtTime(volume * 0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.15);
    } else if (type === 'wave_start') {
        // Wave start: alarm horn
        const osc = audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(400, now + 0.15);
        osc.frequency.setValueAtTime(300, now + 0.3);
        gain.gain.setValueAtTime(volume * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.4);
    } else if (type === 'hit') {
        // Hit/impact: short thud
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);
        gain.gain.setValueAtTime(volume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.05);
    } else if (type === 'tower_destroy') {
        // Tower destroyed: big crunch
        const dur = 0.4;
        const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.1));
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        gain.gain.setValueAtTime(volume * 0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        src.connect(filter);
        filter.connect(gain);
        src.start(now);
    } else if (type === 'airstrike') {
        // Airstrike: jet flyover + explosion
        const osc = audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(300, now + 0.3);
        osc.frequency.linearRampToValueAtTime(80, now + 0.6);
        gain.gain.setValueAtTime(volume * 0.3, now);
        gain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.6);
    } else if (type === 'game_over') {
        // Game over: descending tone
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 1.0);
        gain.gain.setValueAtTime(volume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 1.0);
    }
}

// Throttle sounds to prevent audio overload
const soundTimers = {};
function playSoundThrottled(type, minInterval = 0.05, volume = 0.15) {
    const now = performance.now() / 1000;
    if (soundTimers[type] && now - soundTimers[type] < minInterval) return;
    soundTimers[type] = now;
    playSound(type, volume);
}

// ---- Background Music System - Ottoman Mehter March Style ----
let musicState = {
    playing: false, muted: false, masterGain: null,
    droneOsc: null, droneGain: null, droneOsc2: null,
    intervals: [], // all setIntervals stored here
    intensityTarget: 0.0, intensity: 0.0
};
const MUSIC_VOLUME = 0.12;

// Hicaz makam scale (Ottoman/Turkish) - the heroic military scale
// Root = D: D Eb F# G A Bb C# D (in various octaves)
const HICAZ_LOW  = [146.83, 155.56, 185.00, 196.00, 220.00, 233.08, 277.18, 293.66]; // D3-D4
const HICAZ_HIGH = [293.66, 311.13, 369.99, 392.00, 440.00, 466.16, 554.37, 587.33]; // D4-D5
// Heroic march melody phrases (indices into HICAZ scale, each phrase = sequence of notes)
const MARCH_PHRASES = [
    [0, 3, 4, 3, 2, 1, 0],        // D G A G F# Eb D - classic descent
    [0, 2, 3, 4, 7],               // D F# G A D' - ascending heroic
    [7, 6, 4, 3, 2, 0],            // D' C# A G F# D - triumphant descent
    [4, 3, 4, 5, 4, 3, 2, 0],     // A G A Bb A G F# D - ornamental
    [0, 0, 3, 3, 4, 4, 7],         // D D G G A A D' - march rhythm
    [7, 7, 4, 4, 3, 2, 1, 0],     // D' D' A A G F# Eb D - battle call
    [0, 2, 4, 7, 4, 2, 0],        // D F# A D' A F# D - arpeggio
    [3, 4, 5, 4, 3, 2, 3, 0],     // G A Bb A G F# G D - Turkish ornament
];
const BEAT_MS = 300; // ~100 BPM marching tempo

function startMusic() {
    if (!audioCtx || musicState.playing) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Master gain
    musicState.masterGain = audioCtx.createGain();
    musicState.masterGain.gain.value = musicState.muted ? 0 : MUSIC_VOLUME;
    musicState.masterGain.connect(audioCtx.destination);

    // === DRONE (Boru/horn-like sustained note on D) ===
    musicState.droneOsc = audioCtx.createOscillator();
    musicState.droneOsc.type = 'sawtooth'; musicState.droneOsc.frequency.value = 73.42; // D2
    musicState.droneGain = audioCtx.createGain(); musicState.droneGain.gain.value = 0.12;
    const droneFilter = audioCtx.createBiquadFilter();
    droneFilter.type = 'lowpass'; droneFilter.frequency.value = 200; droneFilter.Q.value = 2;
    musicState.droneOsc.connect(droneFilter); droneFilter.connect(musicState.droneGain);
    musicState.droneGain.connect(musicState.masterGain); musicState.droneOsc.start();
    // Second drone a 5th up (A) for power
    musicState.droneOsc2 = audioCtx.createOscillator();
    musicState.droneOsc2.type = 'triangle'; musicState.droneOsc2.frequency.value = 110; // A2
    const droneGain2 = audioCtx.createGain(); droneGain2.gain.value = 0.06;
    const droneFilter2 = audioCtx.createBiquadFilter();
    droneFilter2.type = 'lowpass'; droneFilter2.frequency.value = 250; droneFilter2.Q.value = 1;
    musicState.droneOsc2.connect(droneFilter2); droneFilter2.connect(droneGain2);
    droneGain2.connect(musicState.masterGain); musicState.droneOsc2.start();

    // === DAVUL (Large bass drum) - Strong marching beat ===
    let davulBeat = 0;
    musicState.intervals.push(setInterval(() => {
        if (!audioCtx || !musicState.playing) return;
        const now = audioCtx.currentTime;
        const int = musicState.intensity;
        const beat = davulBeat % 8;

        // DAVUL: Strong hit on beats 0, 4 (DUM) - lighter on 2, 6 (TEK)
        if (beat === 0 || beat === 4) {
            // Heavy davul DUM
            const k = audioCtx.createOscillator(), kg = audioCtx.createGain();
            k.type = 'sine';
            k.frequency.setValueAtTime(90, now);
            k.frequency.exponentialRampToValueAtTime(35, now + 0.2);
            kg.gain.setValueAtTime(0.5 + int * 0.3, now);
            kg.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            k.connect(kg); kg.connect(musicState.masterGain); k.start(now); k.stop(now + 0.35);
            // Add noise layer for davul skin slap
            const dur = 0.06;
            const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.015));
            const s = audioCtx.createBufferSource(); s.buffer = buf;
            const sg = audioCtx.createGain(); sg.gain.setValueAtTime(0.2 + int * 0.15, now);
            sg.gain.exponentialRampToValueAtTime(0.001, now + dur);
            const lp = audioCtx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
            s.connect(lp); lp.connect(sg); sg.connect(musicState.masterGain); s.start(now);
        }
        if (beat === 2 || beat === 6) {
            // Lighter TEK (higher pitch, shorter)
            const k = audioCtx.createOscillator(), kg = audioCtx.createGain();
            k.type = 'sine';
            k.frequency.setValueAtTime(120, now);
            k.frequency.exponentialRampToValueAtTime(60, now + 0.1);
            kg.gain.setValueAtTime(0.25 + int * 0.15, now);
            kg.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            k.connect(kg); kg.connect(musicState.masterGain); k.start(now); k.stop(now + 0.15);
        }

        // ZIL (Cymbals) - crash on beat 0 of every bar, tick on others when intense
        if (beat === 0) {
            const dur = 0.15;
            const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.04));
            const s = audioCtx.createBufferSource(); s.buffer = buf;
            const sg = audioCtx.createGain(); sg.gain.setValueAtTime(0.12 + int * 0.1, now);
            sg.gain.exponentialRampToValueAtTime(0.001, now + dur);
            const hp = audioCtx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
            s.connect(hp); hp.connect(sg); sg.connect(musicState.masterGain); s.start(now);
        }
        if (int > 0.3 && (beat % 2 === 0)) {
            // Lighter cymbal ticks
            const dur = 0.02;
            const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.004));
            const s = audioCtx.createBufferSource(); s.buffer = buf;
            const sg = audioCtx.createGain(); sg.gain.setValueAtTime(0.05 * int, now);
            const hp = audioCtx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
            s.connect(hp); hp.connect(sg); sg.connect(musicState.masterGain); s.start(now);
        }

        // NAKKARE (Kettledrum roll on beats before downbeat, intense only)
        if (int > 0.5 && (beat === 7)) {
            for (let r = 0; r < 4; r++) {
                const t = now + r * 0.05;
                const nk = audioCtx.createOscillator(), nkg = audioCtx.createGain();
                nk.type = 'sine'; nk.frequency.setValueAtTime(200, t);
                nk.frequency.exponentialRampToValueAtTime(120, t + 0.04);
                nkg.gain.setValueAtTime(0.08 + r * 0.03, t);
                nkg.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
                nk.connect(nkg); nkg.connect(musicState.masterGain); nk.start(t); nk.stop(t + 0.06);
            }
        }

        davulBeat++;
    }, BEAT_MS));

    // === ZURNA MELODY (Heroic Turkish oboe sound) ===
    let phraseIdx = 0, noteIdx = 0;
    let currentPhrase = MARCH_PHRASES[0];
    musicState.intervals.push(setInterval(() => {
        if (!audioCtx || !musicState.playing) return;
        const now = audioCtx.currentTime;
        const int = musicState.intensity;

        // Only play melody when intensity > 0.15 (during/near waves)
        if (int < 0.15) { noteIdx = 0; return; }

        const scale = int > 0.6 ? HICAZ_HIGH : HICAZ_LOW;
        const freq = scale[currentPhrase[noteIdx]];
        const noteDur = BEAT_MS / 1000 * (0.8 + Math.random() * 0.3);

        // Zurna sound: sawtooth + bandpass for nasal quality
        const zur = audioCtx.createOscillator();
        zur.type = 'sawtooth'; zur.frequency.value = freq;
        // Add slight vibrato for authenticity
        const vibLfo = audioCtx.createOscillator();
        vibLfo.type = 'sine'; vibLfo.frequency.value = 5 + int * 3; // vibrato speed
        const vibGain = audioCtx.createGain(); vibGain.gain.value = freq * 0.008; // subtle pitch wobble
        vibLfo.connect(vibGain); vibGain.connect(zur.frequency); vibLfo.start(now);

        const zurGain = audioCtx.createGain();
        zurGain.gain.setValueAtTime(0.001, now);
        zurGain.gain.exponentialRampToValueAtTime(0.12 + int * 0.1, now + 0.02); // sharp attack
        zurGain.gain.setValueAtTime(0.1 + int * 0.08, now + noteDur * 0.7);
        zurGain.gain.exponentialRampToValueAtTime(0.001, now + noteDur);

        // Bandpass filter for nasal zurna tone
        const bp = audioCtx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = freq * 2.5; bp.Q.value = 2;
        // Second harmonic emphasis
        const bp2 = audioCtx.createBiquadFilter();
        bp2.type = 'peaking'; bp2.frequency.value = freq * 3; bp2.gain.value = 6; bp2.Q.value = 3;

        zur.connect(bp); bp.connect(bp2); bp2.connect(zurGain);
        zurGain.connect(musicState.masterGain);
        zur.start(now); zur.stop(now + noteDur + 0.05);
        vibLfo.stop(now + noteDur + 0.05);

        noteIdx++;
        if (noteIdx >= currentPhrase.length) {
            noteIdx = 0;
            // Pick next phrase - mix sequential and random for variety
            if (int > 0.7) {
                // Intense: cycle through heroic phrases
                phraseIdx = (phraseIdx + 1) % MARCH_PHRASES.length;
            } else {
                // Calmer: random phrase selection
                phraseIdx = Math.floor(Math.random() * MARCH_PHRASES.length);
            }
            currentPhrase = MARCH_PHRASES[phraseIdx];
        }
    }, BEAT_MS));

    // === BORU (Brass horn) - Sustained heroic notes on downbeats ===
    let boruBeat = 0;
    musicState.intervals.push(setInterval(() => {
        if (!audioCtx || !musicState.playing) return;
        const now = audioCtx.currentTime;
        const int = musicState.intensity;
        if (int < 0.3) { boruBeat++; return; }

        // Play a sustained brass note every 8 beats
        if (boruBeat % 8 === 0) {
            const scale = HICAZ_LOW;
            const noteChoices = [0, 3, 4, 7]; // D, G, A, D' - strong notes
            const freq = scale[noteChoices[Math.floor(Math.random() * noteChoices.length)]];
            const dur = BEAT_MS / 1000 * 4; // sustain for 4 beats

            // Square wave for brass-like tone
            const br = audioCtx.createOscillator();
            br.type = 'square'; br.frequency.value = freq;
            const brGain = audioCtx.createGain();
            brGain.gain.setValueAtTime(0.001, now);
            brGain.gain.linearRampToValueAtTime(0.06 + int * 0.04, now + 0.08);
            brGain.gain.setValueAtTime(0.05 + int * 0.03, now + dur * 0.6);
            brGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
            const lp = audioCtx.createBiquadFilter();
            lp.type = 'lowpass'; lp.frequency.value = 800 + int * 400; lp.Q.value = 1;
            br.connect(lp); lp.connect(brGain); brGain.connect(musicState.masterGain);
            br.start(now); br.stop(now + dur + 0.05);
        }
        boruBeat++;
    }, BEAT_MS));

    // === Intensity update ===
    musicState.intervals.push(setInterval(() => {
        if (!musicState.playing) return;
        if (typeof gameState !== 'undefined' && gameState.waveActive) {
            musicState.intensityTarget = 0.4 + Math.min(gameState.wave / 15, 1.0) * 0.6;
        } else {
            musicState.intensityTarget = 0.1; // gentle march between waves
        }
        musicState.intensity += (musicState.intensityTarget - musicState.intensity) * 0.03;
        // Modulate drone volume with intensity
        if (musicState.droneGain) {
            musicState.droneGain.gain.setTargetAtTime(0.08 + musicState.intensity * 0.12, audioCtx.currentTime, 0.5);
        }
    }, 200));

    musicState.playing = true;
}

function stopMusic() {
    if (!musicState.playing) return;
    musicState.intervals.forEach(id => clearInterval(id));
    musicState.intervals = [];
    const now = audioCtx ? audioCtx.currentTime : 0;
    if (musicState.masterGain) musicState.masterGain.gain.setTargetAtTime(0, now, 0.3);
    setTimeout(() => {
        try {
            if (musicState.droneOsc) { musicState.droneOsc.stop(); musicState.droneOsc = null; }
            if (musicState.droneOsc2) { musicState.droneOsc2.stop(); musicState.droneOsc2 = null; }
        } catch(e) {}
        musicState.droneGain = null; musicState.masterGain = null;
        musicState.playing = false; musicState.intensity = 0; musicState.intensityTarget = 0;
    }, 1000);
}

function toggleMusic() {
    musicState.muted = !musicState.muted;
    if (musicState.masterGain) musicState.masterGain.gain.setTargetAtTime(musicState.muted ? 0 : MUSIC_VOLUME, audioCtx.currentTime, 0.1);
    const btn = document.getElementById('music-toggle-btn');
    if (btn) { btn.textContent = musicState.muted ? '\u266A' : '\u266B'; btn.title = musicState.muted ? 'Music OFF' : 'Music ON'; btn.classList.toggle('muted', musicState.muted); }
}

// ---- Constants ----
const TILE_W = 64;
const TILE_H = 32;
const GRID_COLS = 16;
const GRID_ROWS = 16;
const SELL_REFUND = 0.4;
const AUTO_WAVE_DELAY = 3; // seconds
const BASE_MAX_HP = 100;

// Commander Ability costs
const ABILITY_COSTS = {
    airstrike: 75,
    landmine: 40,
    supply: 100
};

// ---- Zoom & Pan State ----
let zoomLevel = 1.0;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;
const ZOOM_STEP = 0.1;
let panX = 0;
let panY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;

// ---- Isometric Helpers ----
function isoToScreen(col, row) {
    const originX = canvas.width / 2;
    const originY = 80;
    return {
        x: originX + (col - row) * (TILE_W / 2),
        y: originY + (col + row) * (TILE_H / 2)
    };
}

// Convert screen pixel coords to world coords (accounting for zoom/pan)
function screenToWorld(sx, sy) {
    return {
        x: (sx - canvas.width / 2) / zoomLevel + canvas.width / 2 - panX,
        y: (sy - canvas.height / 2) / zoomLevel + canvas.height / 2 - panY
    };
}

function screenToGrid(sx, sy) {
    const world = screenToWorld(sx, sy);
    const originX = canvas.width / 2;
    const originY = 80;
    const mx = world.x - originX;
    const my = world.y - originY;
    const col = (mx / (TILE_W / 2) + my / (TILE_H / 2)) / 2;
    const row = (my / (TILE_H / 2) - mx / (TILE_W / 2)) / 2;
    return { col: Math.floor(col), row: Math.floor(row) };
}

function gridCenter(col, row) {
    const p = isoToScreen(col, row);
    return { x: p.x, y: p.y + TILE_H / 2 };
}

// ---- Map Definitions ----
const MAP_DEFINITIONS = {
    valley: { name: 'Valley Pass', difficulty: 'Medium', description: 'A winding valley road through the heartland.', path: [
        {c:0,r:7},{c:1,r:7},{c:2,r:7},{c:3,r:7},{c:4,r:7},{c:4,r:6},{c:4,r:5},{c:4,r:4},{c:4,r:3},
        {c:5,r:3},{c:6,r:3},{c:7,r:3},{c:8,r:3},{c:8,r:4},{c:8,r:5},{c:8,r:6},{c:8,r:7},{c:8,r:8},{c:8,r:9},
        {c:9,r:9},{c:10,r:9},{c:11,r:9},{c:12,r:9},{c:12,r:8},{c:12,r:7},{c:12,r:6},{c:12,r:5},{c:13,r:5},{c:14,r:5},{c:15,r:5}
    ]},
    desert: { name: 'Desert Crossing', difficulty: 'Hard', description: 'A short S-curve through hostile desert terrain.', path: [
        {c:0,r:2},{c:1,r:2},{c:2,r:2},{c:3,r:2},{c:4,r:2},{c:5,r:2},{c:6,r:2},{c:6,r:3},{c:6,r:4},{c:6,r:5},{c:6,r:6},
        {c:5,r:6},{c:4,r:6},{c:3,r:6},{c:2,r:6},{c:2,r:7},{c:2,r:8},{c:2,r:9},{c:2,r:10},
        {c:3,r:10},{c:4,r:10},{c:5,r:10},{c:6,r:10},{c:7,r:10},{c:8,r:10},{c:8,r:11},{c:8,r:12},{c:8,r:13},
        {c:9,r:13},{c:10,r:13},{c:11,r:13},{c:12,r:13},{c:13,r:13},{c:14,r:13},{c:15,r:13}
    ]},
    mountain: { name: 'Mountain Ridge', difficulty: 'Easy', description: 'A long zigzag climb gives defenders more time.', path: [
        {c:0,r:1},{c:1,r:1},{c:2,r:1},{c:3,r:1},{c:4,r:1},{c:5,r:1},{c:6,r:1},{c:7,r:1},{c:8,r:1},{c:9,r:1},{c:10,r:1},{c:11,r:1},{c:12,r:1},{c:13,r:1},
        {c:13,r:2},{c:13,r:3},{c:13,r:4},{c:12,r:4},{c:11,r:4},{c:10,r:4},{c:9,r:4},{c:8,r:4},{c:7,r:4},{c:6,r:4},{c:5,r:4},{c:4,r:4},{c:3,r:4},
        {c:3,r:5},{c:3,r:6},{c:3,r:7},{c:4,r:7},{c:5,r:7},{c:6,r:7},{c:7,r:7},{c:8,r:7},{c:9,r:7},{c:10,r:7},{c:11,r:7},{c:12,r:7},{c:13,r:7},
        {c:13,r:8},{c:13,r:9},{c:13,r:10},{c:12,r:10},{c:11,r:10},{c:10,r:10},{c:9,r:10},{c:8,r:10},{c:7,r:10},{c:6,r:10},
        {c:6,r:11},{c:6,r:12},{c:6,r:13},{c:7,r:13},{c:8,r:13},{c:9,r:13},{c:10,r:13},{c:11,r:13},{c:12,r:13},{c:13,r:13},{c:14,r:13},{c:15,r:13}
    ]}
};
let selectedMapId = 'valley';

// ---- Path Definition (grid cells the enemy walks through) ----
let PATH_CELLS = MAP_DEFINITIONS.valley.path.slice();

// Build path set for quick lookup
const pathSet = new Set(PATH_CELLS.map(p => `${p.c},${p.r}`));

// Screen-space path waypoints (calculated after canvas resize)
let pathWaypoints = [];       // Original path (always available)
let shortcutWaypoints = null; // BFS shortcut path (set when blasts exist)

function recalcPathWaypoints() {
    pathWaypoints = PATH_CELLS.map(p => gridCenter(p.c, p.r));
    // Recalc shortcut if blasts exist
    if (gameState && gameState.blastTiles && gameState.blastTiles.length > 0) {
        rebuildShortcutPath();
    } else {
        shortcutWaypoints = null;
    }
}

// Count towers near a path (within range of path waypoints)
function countTowersAlongPath(waypoints) {
    let count = 0;
    for (const tower of gameState.towers) {
        const tp = gridCenter(tower.col, tower.row);
        const range = getEffectiveRange(tower);
        for (const wp of waypoints) {
            if (isoDist(tp.x, tp.y, wp.x, wp.y) <= range) {
                count++;
                break; // count each tower once
            }
        }
    }
    return count;
}

// Get a path for a newly spawned enemy (prefers path with fewer towers)
function getEnemyPath() {
    if (!shortcutWaypoints) return pathWaypoints;

    const towersOnOriginal = countTowersAlongPath(pathWaypoints);
    const towersOnShortcut = countTowersAlongPath(shortcutWaypoints);

    // Strongly prefer path with fewer towers, but add some randomness
    if (towersOnOriginal < towersOnShortcut) {
        return Math.random() < 0.6 ? pathWaypoints : shortcutWaypoints;
    } else if (towersOnShortcut < towersOnOriginal) {
        return Math.random() < 0.6 ? shortcutWaypoints : pathWaypoints;
    }
    // Equal towers - random
    return Math.random() < 0.5 ? pathWaypoints : shortcutWaypoints;
}

// ---- Tower Definitions ----
// unlockHP: total HP destroyed globally before this tower becomes available
// towerHP: how much damage a tower can take from enemy fire before being destroyed
const TOWER_DEFS = {
    machinegun: {
        name: 'Machine Gun', cost: 300, damage: 12, fireRate: 0.18, range: 108,
        color: '#7cb342', projectileColor: '#ffeb3b', projectileSpeed: 600,
        splash: 0, slow: 0, stun: 0, dot: 0, description: 'Rapid fire, low damage',
        unlockHP: 0, towerHP: 240
    },
    slowdown: {
        name: 'Slowdown', cost: 700, damage: 0, fireRate: 0, range: 132,
        color: '#ab47bc', projectileColor: '#9c27b0', projectileSpeed: 0,
        splash: 0, slow: 0.5, stun: 0, dot: 0, description: 'Slows enemies, no damage',
        unlockHP: 0, towerHP: 120
    },
    sniper: {
        name: 'Sniper', cost: 1500, damage: 80, fireRate: 1.2, range: 240,
        color: '#5c6bc0', projectileColor: '#e0e0e0', projectileSpeed: 900,
        splash: 0, slow: 0, stun: 0, dot: 0, description: 'High damage, slow fire',
        unlockHP: 3000, towerHP: 100  // Sniper: 3K
    },
    flamethrower: {
        name: 'Flamethrower', cost: 3500, damage: 15, fireRate: 0.2, range: 96,
        color: '#ff9800', projectileColor: '#ff6f00', projectileSpeed: 0,
        splash: 0, slow: 0, stun: 0, dot: 5, description: 'Continuous cone, DOT',
        unlockHP: 16000, towerHP: 130
    },
    missile: {
        name: 'Missile Launcher', cost: 12000, damage: 40, fireRate: 1.4, range: 192,
        color: '#ef5350', projectileColor: '#ff5722', projectileSpeed: 400,
        splash: 50, slow: 0, stun: 0, dot: 0, description: 'Area splash damage',
        unlockHP: 50000, towerHP: 140
    },
    emp: {
        name: 'EMP', cost: 30000, damage: 20, fireRate: 1.2, range: 156,
        color: '#29b6f6', projectileColor: '#03a9f4', projectileSpeed: 500,
        splash: 0, slow: 0, stun: 2.0, dot: 0, description: 'Stuns vehicles & bosses',
        unlockHP: 100000, towerHP: 110
    },
    artillery: {
        name: 'Artillery', cost: 200000, damage: 120, fireRate: 2.5, range: 216,
        color: '#8d6e63', projectileColor: '#795548', projectileSpeed: 300,
        splash: 60, slow: 0, stun: 0, dot: 0, description: 'Heavy area damage',
        unlockHP: 200000, towerHP: 160
    }
};

// ---- Rank System ----
const RANKS = [
    { name: 'Private',       hpReq: 0,      dmgMult: 1.0,  rateMult: 1.0, rangeMult: 1.0,  hpMult: 1.0 },
    { name: 'Corporal',      hpReq: 500,    dmgMult: 1.12, rateMult: 1.0, rangeMult: 1.0,  hpMult: 1.1 },
    { name: 'Sergeant',      hpReq: 2000,   dmgMult: 1.25, rateMult: 1.0, rangeMult: 1.05, hpMult: 1.2 },
    { name: 'Lieutenant',    hpReq: 6000,   dmgMult: 1.4,  rateMult: 1.0, rangeMult: 1.05, hpMult: 1.35 },
    { name: 'Captain',       hpReq: 15000,  dmgMult: 1.55, rateMult: 1.0, rangeMult: 1.1,  hpMult: 1.5 },
    { name: 'Colonel',       hpReq: 40000,  dmgMult: 1.75, rateMult: 1.0, rangeMult: 1.1,  hpMult: 1.7 },
    { name: 'General',       hpReq: 100000, dmgMult: 2.0,  rateMult: 1.0, rangeMult: 1.15, hpMult: 2.0 }
];

// ---- Division System ----
const DIVISIONS = [
    { name: 'Army',          cost: 0,    dmgMult: 1.0, rateMult: 1.0, rangeMult: 1.0 },
    { name: 'Marine',        cost: 500,  dmgMult: 1.5, rateMult: 1.3, rangeMult: 1.2 },
    { name: 'Special Forces', cost: 1500, dmgMult: 2.5, rateMult: 2.0, rangeMult: 1.5 },
    { name: 'Delta Force',   cost: 4000, dmgMult: 4.0, rateMult: 3.0, rangeMult: 2.0 }
];

// ---- Enemy Definitions ----
// canShoot: whether this enemy fires at towers
// shootRange/shootDamage/shootRate: shooting stats
// isArtillery: can blast open new paths
const ENEMY_DEFS = {
    infantry: { name: 'Infantry', baseHP: 60, speed: 25, baseDmg: 8, rankXP: 1, color: '#a5d6a7', size: 6,
                canShoot: true, shootRange: 55, shootDamage: 2, shootRate: 2.5 },
    jeep:     { name: 'Jeep',     baseHP: 1500, speed: 40, baseDmg: 20, rankXP: 3, color: '#fff176', size: 8,
                canShoot: true, shootRange: 75, shootDamage: 6, shootRate: 1.8 },
    tank:     { name: 'Tank',     baseHP: 5000, speed: 15, baseDmg: 60, rankXP: 10, color: '#ef9a9a', size: 12,
                canShoot: true, shootRange: 95, shootDamage: 15, shootRate: 2.8 },
    enemyArt: { name: 'Enemy Artillery', baseHP: 3000, speed: 12, baseDmg: 40, rankXP: 8, color: '#ff6e40', size: 14,
                canShoot: true, shootRange: 110, shootDamage: 10, shootRate: 3.5, isArtillery: true },
    runner:   { name: 'Runner', baseHP: 30, speed: 45, baseDmg: 5, rankXP: 1, color: '#81d4fa', size: 5,
                canShoot: false, shootRange: 0, shootDamage: 0, shootRate: 999 },
    saboteur: { name: 'Saboteur', baseHP: 80, speed: 22, baseDmg: 3, rankXP: 2, color: '#ff8a80', size: 7,
                canShoot: true, shootRange: 80, shootDamage: 15, shootRate: 2.5, targetsTowersOnly: true }
};

// ---- Fusion Tower Bonuses ----
const FUSION_BONUSES = {
    machinegun:   { name: 'Twin Machine Gun',  dmgMult: 1.6, rateMult: 1.1, rangeMult: 1.1, ability: 'Bullet Storm: 3s of 4x fire rate' },
    sniper:       { name: 'Twin Sniper',       dmgMult: 1.6, rateMult: 1.1, rangeMult: 1.1, ability: 'Headshot: Instant kill <20% HP enemies in range' },
    missile:      { name: 'Twin Missile',       dmgMult: 1.6, rateMult: 1.1, rangeMult: 1.1, ability: 'Barrage: Fire 8 missiles in all directions' },
    flamethrower: { name: 'Twin Flamethrower', dmgMult: 1.6, rateMult: 1.1, rangeMult: 1.1, ability: 'Inferno: 360° flame ring for 3s' },
    artillery:    { name: 'Twin Artillery',     dmgMult: 1.6, rateMult: 1.1, rangeMult: 1.1, ability: 'Carpet Bomb: 5 explosions along path' },
    emp:          { name: 'Twin EMP',           dmgMult: 1.6, rateMult: 1.1, rangeMult: 1.1, ability: 'EMP Pulse: Stun ALL enemies for 4s' },
    slowdown:     { name: 'Twin Slowdown',     dmgMult: 1.6, rateMult: 1.1, rangeMult: 1.1, ability: 'Freeze: Stop all enemies in range for 3s' }
};

// ---- Game State ----
let gameState = {
    running: false,
    money: 3000,
    baseHP: BASE_MAX_HP,
    baseMaxHP: BASE_MAX_HP,
    wave: 0,
    waveActive: false,
    enemies: [],
    towers: [],
    projectiles: [],
    particles: [],
    selectedTowerType: null,
    selectedTower: null,
    hoverGrid: null,
    autoWaveTimer: 0,
    totalKills: 0,
    enemiesToSpawn: [],
    spawnTimer: 0,
    spawnInterval: 0.5,
    lastTime: 0,
    grid: [], // 2D array: 0=empty, 1=path, 2=tower
    // Commander abilities
    commandPoints: 0,
    selectedAbility: null,
    landmines: [],
    airstrikeEffects: [],
    // Surrender/POW system
    allies: [],
    totalPOWs: 0,
    // Fusion
    fusionEffects: [],
    // Tower unlock tracking
    totalHPDestroyed: 0,
    // Enemy shooting
    enemyProjectiles: [],
    // Enemy artillery - blasted tiles (new paths)
    blastTiles: [], // {col, row} tiles blasted open by enemy artillery
    destroyedTiles: new Map(), // tile key -> wave when destroyed
    repairVehicle: null, // active repair vehicle
    repairSelectMode: false, // player selecting tile to repair
    deadTowers: [] // fallen soldiers memorial
};

function initGrid() {
    gameState.grid = [];
    for (let c = 0; c < GRID_COLS; c++) {
        gameState.grid[c] = [];
        for (let r = 0; r < GRID_ROWS; r++) {
            gameState.grid[c][r] = pathSet.has(`${c},${r}`) ? 1 : 0;
        }
    }
}

// ---- Canvas Resize ----
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    recalcPathWaypoints();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ============================================================
// RENDERING
// ============================================================

function drawIsoDiamond(cx, cy, w, h, fillColor, strokeColor) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy);
    ctx.lineTo(cx, cy + h / 2);
    ctx.lineTo(cx - w / 2, cy);
    ctx.closePath();
    if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(); }
    if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = 1; ctx.stroke(); }
}

// Enhanced iso diamond with gradient
function drawIsoGradientDiamond(cx, cy, w, h, color1, color2, strokeColor) {
    const grad = ctx.createLinearGradient(cx - w/2, cy, cx + w/2, cy);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    drawIsoDiamond(cx, cy, w, h, null, null);
    ctx.fillStyle = grad;
    ctx.fill();
    if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = 1; ctx.stroke(); }
}

function drawMap() {
    const time = Date.now() * 0.001;
    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const p = isoToScreen(c, r);
            const cx = p.x;
            const cy = p.y + TILE_H / 2;
            const isPath = pathSet.has(`${c},${r}`);
            const hasTower = gameState.grid[c] && gameState.grid[c][r] === 2;
            const isBlasted = gameState.blastTiles && gameState.blastTiles.some(b => b.col === c && b.row === r);
            const isDestroyed = gameState.destroyedTiles && gameState.destroyedTiles.has(`${c},${r}`);
            const hw = (TILE_W - 2) / 2;
            const hh = (TILE_H - 2) / 2;

            // --- DESTROYED TOWER CRATER ---
            if (isDestroyed) {
                // Scorched earth crater
                ctx.beginPath();
                ctx.moveTo(cx, cy - hh); ctx.lineTo(cx + hw, cy);
                ctx.lineTo(cx, cy + hh); ctx.lineTo(cx - hw, cy); ctx.closePath();
                ctx.fillStyle = '#2a1a0a';
                ctx.fill();
                ctx.strokeStyle = '#1a0a00';
                ctx.lineWidth = 1;
                ctx.stroke();
                // Scorch marks
                const hash = (c * 11 + r * 7) % 5;
                ctx.fillStyle = 'rgba(60,30,10,0.6)';
                ctx.beginPath(); ctx.arc(cx + (hash - 2) * 4, cy + (hash - 3) * 2, 5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(40,20,5,0.4)';
                ctx.beginPath(); ctx.arc(cx - (hash - 1) * 3, cy + hash * 2, 4, 0, Math.PI * 2); ctx.fill();
                // Rubble pieces
                ctx.fillStyle = '#555';
                for (let rb = 0; rb < 3; rb++) {
                    const rx = cx + ((c * 3 + rb * 7) % 9 - 4) * 2;
                    const ry = cy + ((r * 5 + rb * 3) % 7 - 3);
                    ctx.fillRect(rx, ry, 2, 2);
                }
                // X mark (unbuildable indicator)
                ctx.strokeStyle = 'rgba(255,50,50,0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(cx - 6, cy - 3); ctx.lineTo(cx + 6, cy + 3); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cx + 6, cy - 3); ctx.lineTo(cx - 6, cy + 3); ctx.stroke();
                continue;
            }

            // --- GRASS TILES ---
            if (!isPath && !isBlasted) {
                const hash = (c * 7 + r * 13) % 11;
                // Multi-tone grass with noise pattern
                const gBase = [36, 68 + hash * 2, 36];
                const gLight = `rgb(${gBase[0]+10},${gBase[1]+15},${gBase[2]+5})`;
                const gDark = `rgb(${gBase[0]-5},${gBase[1]-10},${gBase[2]-5})`;
                // 3D depth on grass
                ctx.fillStyle = `rgb(${gBase[0]-12},${gBase[1]-18},${gBase[2]-12})`;
                ctx.beginPath();
                ctx.moveTo(cx, cy + hh); ctx.lineTo(cx + hw, cy); ctx.lineTo(cx + hw, cy + 2); ctx.lineTo(cx, cy + hh + 2);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = `rgb(${gBase[0]-16},${gBase[1]-22},${gBase[2]-16})`;
                ctx.beginPath();
                ctx.moveTo(cx, cy + hh); ctx.lineTo(cx - hw, cy); ctx.lineTo(cx - hw, cy + 2); ctx.lineTo(cx, cy + hh + 2);
                ctx.closePath(); ctx.fill();
                // Main grass surface with gradient
                drawIsoGradientDiamond(cx, cy, TILE_W - 2, TILE_H - 2, gLight, gDark, '#1a3a1a');

                // Detailed grass features
                if (!hasTower) {
                    // Multiple grass blades
                    if (hash % 3 === 0) {
                        ctx.strokeStyle = `rgba(${50+hash*3},${100+hash*5},30,0.5)`;
                        ctx.lineWidth = 0.8;
                        for (let g = 0; g < 3; g++) {
                            const gx = cx - 6 + g * 5 + (hash % 3);
                            const gy = cy + 1;
                            ctx.beginPath();
                            ctx.moveTo(gx, gy);
                            ctx.quadraticCurveTo(gx + Math.sin(time + c + g) * 1.5, gy - 4, gx + 1, gy - 5);
                            ctx.stroke();
                        }
                    }
                    // Small flowers / details
                    if (hash === 3) {
                        ctx.fillStyle = '#e8e050';
                        ctx.beginPath(); ctx.arc(cx + 3, cy - 1, 1.2, 0, Math.PI * 2); ctx.fill();
                    } else if (hash === 7) {
                        ctx.fillStyle = '#d04040';
                        ctx.beginPath(); ctx.arc(cx - 4, cy + 1, 1, 0, Math.PI * 2); ctx.fill();
                    }
                    // Small rocks
                    if (hash === 5 || hash === 9) {
                        ctx.fillStyle = '#4a5a4a';
                        ctx.beginPath(); ctx.arc(cx + 6, cy, 1.5, 0, Math.PI * 2); ctx.fill();
                        ctx.fillStyle = '#3a4a3a';
                        ctx.beginPath(); ctx.arc(cx + 5, cy + 1, 1, 0, Math.PI * 2); ctx.fill();
                    }
                }
            }

            // --- PATH / ROAD TILES ---
            if (isPath && !isBlasted) {
                const roadDepth = 4;
                // 3D side faces with better colors
                ctx.fillStyle = '#4a3e28';
                ctx.beginPath();
                ctx.moveTo(cx, cy + hh); ctx.lineTo(cx + hw, cy); ctx.lineTo(cx + hw, cy + roadDepth); ctx.lineTo(cx, cy + hh + roadDepth);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#3e3420';
                ctx.beginPath();
                ctx.moveTo(cx, cy + hh); ctx.lineTo(cx - hw, cy); ctx.lineTo(cx - hw, cy + roadDepth); ctx.lineTo(cx, cy + hh + roadDepth);
                ctx.closePath(); ctx.fill();

                // Road surface with gradient
                const rv = ((c * 3 + r * 5) % 4);
                const roadColors = [['#7a6e4e','#6b6040'],['#706444','#63593c'],['#75694a','#685e3e'],['#6e6342','#5e5538']];
                drawIsoGradientDiamond(cx, cy, TILE_W - 2, TILE_H - 2, roadColors[rv][0], roadColors[rv][1], '#4a4228');

                // Road markings - tire tracks
                const hasRight = pathSet.has(`${c+1},${r}`);
                const hasDown = pathSet.has(`${c},${r+1}`);
                const hasLeft = pathSet.has(`${c-1},${r}`);
                const hasUp = pathSet.has(`${c},${r-1}`);
                ctx.strokeStyle = 'rgba(90,80,55,0.5)';
                ctx.lineWidth = 1.5;
                if (hasRight) {
                    ctx.beginPath(); ctx.moveTo(cx - 2, cy - 1); ctx.lineTo(cx + hw * 0.7, cy - hh * 0.5); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(cx + 2, cy + 1); ctx.lineTo(cx + hw * 0.7, cy + hh * 0.15); ctx.stroke();
                }
                if (hasDown) {
                    ctx.beginPath(); ctx.moveTo(cx - 2, cy - 1); ctx.lineTo(cx - hw * 0.7, cy + hh * 0.15); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(cx + 2, cy + 1); ctx.lineTo(cx - hw * 0.7, cy + hh * 0.6); ctx.stroke();
                }
                if (hasLeft) {
                    ctx.beginPath(); ctx.moveTo(cx - 2, cy - 1); ctx.lineTo(cx - hw * 0.7, cy - hh * 0.5); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(cx + 2, cy + 1); ctx.lineTo(cx - hw * 0.7, cy + hh * 0.15); ctx.stroke();
                }
                if (hasUp) {
                    ctx.beginPath(); ctx.moveTo(cx - 2, cy - 1); ctx.lineTo(cx + hw * 0.7, cy + hh * 0.15); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(cx + 2, cy + 1); ctx.lineTo(cx + hw * 0.7, cy + hh * 0.6); ctx.stroke();
                }

                // Gravel / pebbles detail
                const pebHash = (c * 11 + r * 17) % 9;
                if (pebHash < 3) {
                    ctx.fillStyle = 'rgba(110,100,70,0.6)';
                    ctx.beginPath(); ctx.arc(cx + 5 - pebHash * 3, cy - 1 + pebHash, 1.3, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'rgba(90,80,55,0.5)';
                    ctx.beginPath(); ctx.arc(cx - 4 + pebHash * 2, cy + 1, 1, 0, Math.PI * 2); ctx.fill();
                }
                // Dirt patches
                if (pebHash === 4) {
                    ctx.fillStyle = 'rgba(80,70,45,0.3)';
                    ctx.beginPath(); ctx.ellipse(cx, cy, 6, 3, 0.3, 0, Math.PI * 2); ctx.fill();
                }
            }

            // --- BLASTED ROAD TILES ---
            if (isBlasted) {
                // Crater depth
                ctx.fillStyle = '#3a2218';
                ctx.beginPath();
                ctx.moveTo(cx, cy + hh); ctx.lineTo(cx + hw, cy); ctx.lineTo(cx + hw, cy + 3); ctx.lineTo(cx, cy + hh + 3);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#2e1a10';
                ctx.beginPath();
                ctx.moveTo(cx, cy + hh); ctx.lineTo(cx - hw, cy); ctx.lineTo(cx - hw, cy + 3); ctx.lineTo(cx, cy + hh + 3);
                ctx.closePath(); ctx.fill();
                // Crater surface
                drawIsoGradientDiamond(cx, cy, TILE_W - 2, TILE_H - 2, '#5a3a28', '#3e2818', '#6b2020');
                // Inner crater depression
                drawIsoDiamond(cx, cy, TILE_W * 0.5, TILE_H * 0.5, '#2e1a0e', null);
                // Scorch marks
                ctx.strokeStyle = 'rgba(120,50,20,0.5)';
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(cx - 10, cy - 2); ctx.lineTo(cx + 8, cy + 3); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cx + 4, cy - 5); ctx.lineTo(cx - 5, cy + 4); ctx.stroke();
                // Rubble chunks
                ctx.fillStyle = '#6a4a3a';
                ctx.beginPath(); ctx.arc(cx - 6, cy - 1, 2.5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#5a3a2a';
                ctx.beginPath(); ctx.arc(cx + 7, cy + 1, 2, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#4a2a1a';
                ctx.beginPath(); ctx.arc(cx + 2, cy + 3, 1.5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#3a2218';
                ctx.beginPath(); ctx.arc(cx - 3, cy + 2, 1, 0, Math.PI * 2); ctx.fill();
                // Smoke wisps (animated)
                const smokeAlpha = 0.15 + Math.sin(time * 2 + c * 3) * 0.05;
                ctx.fillStyle = `rgba(80,60,40,${smokeAlpha})`;
                ctx.beginPath(); ctx.arc(cx + Math.sin(time + c) * 3, cy - 4 - Math.sin(time * 1.5) * 2, 3, 0, Math.PI * 2); ctx.fill();
            }
        }
    }

    // Draw landmines on path
    for (const mine of gameState.landmines) {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(mine.x, mine.y + 2, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
        // Mine casing
        const mGrad = ctx.createRadialGradient(mine.x - 1, mine.y - 1, 1, mine.x, mine.y, 6);
        mGrad.addColorStop(0, '#777');
        mGrad.addColorStop(1, '#3a3a3a');
        ctx.fillStyle = mGrad;
        ctx.beginPath(); ctx.arc(mine.x, mine.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1; ctx.stroke();
        // Pressure plate
        ctx.fillStyle = '#888';
        ctx.beginPath(); ctx.arc(mine.x, mine.y, 3.5, 0, Math.PI * 2); ctx.fill();
        // Screws
        ctx.fillStyle = '#555';
        ctx.beginPath(); ctx.arc(mine.x - 2, mine.y, 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(mine.x + 2, mine.y, 0.8, 0, Math.PI * 2); ctx.fill();
        // Blinking warning
        if (Math.floor(Date.now() / 250) % 2 === 0) {
            ctx.fillStyle = '#ff2200';
            ctx.beginPath(); ctx.arc(mine.x, mine.y, 1.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,30,0,0.3)';
            ctx.beginPath(); ctx.arc(mine.x, mine.y, 4, 0, Math.PI * 2); ctx.fill();
        }
    }

    // === BASE (end of path) - Enhanced military compound ===
    const basePt = PATH_CELLS[PATH_CELLS.length - 1];
    const bp = gridCenter(basePt.c, basePt.r);
    const baseW = TILE_W * 0.85;
    const baseH = TILE_H * 0.85;
    const bHeight = 14;
    // Foundation
    ctx.fillStyle = '#333';
    drawIsoDiamond(bp.x, bp.y + 2, baseW + 6, baseH + 3, '#333', '#222');
    // Right wall
    ctx.fillStyle = '#b02020';
    ctx.beginPath();
    ctx.moveTo(bp.x, bp.y + baseH/2); ctx.lineTo(bp.x + baseW/2, bp.y);
    ctx.lineTo(bp.x + baseW/2, bp.y - bHeight); ctx.lineTo(bp.x, bp.y + baseH/2 - bHeight);
    ctx.closePath(); ctx.fill();
    // Left wall
    ctx.fillStyle = '#8a1818';
    ctx.beginPath();
    ctx.moveTo(bp.x, bp.y + baseH/2); ctx.lineTo(bp.x - baseW/2, bp.y);
    ctx.lineTo(bp.x - baseW/2, bp.y - bHeight); ctx.lineTo(bp.x, bp.y + baseH/2 - bHeight);
    ctx.closePath(); ctx.fill();
    // Window slits
    ctx.fillStyle = '#660808';
    ctx.fillRect(bp.x + 4, bp.y - bHeight + 3, 6, 3);
    ctx.fillRect(bp.x - 10, bp.y - bHeight + 5, 5, 2);
    // Roof with gradient
    drawIsoGradientDiamond(bp.x, bp.y - bHeight, baseW, baseH, '#dd3333', '#aa2222', '#881111');
    // Roof detail lines
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(bp.x, bp.y - bHeight - baseH/2); ctx.lineTo(bp.x, bp.y - bHeight + baseH/2); ctx.stroke();
    // Flag pole
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(bp.x, bp.y - bHeight); ctx.lineTo(bp.x, bp.y - bHeight - 18); ctx.stroke();
    // Flag (waving)
    const flagWave = Math.sin(time * 3) * 2;
    ctx.fillStyle = '#ff3333';
    ctx.beginPath();
    ctx.moveTo(bp.x, bp.y - bHeight - 18);
    ctx.quadraticCurveTo(bp.x + 5, bp.y - bHeight - 16 + flagWave, bp.x + 10, bp.y - bHeight - 15);
    ctx.lineTo(bp.x, bp.y - bHeight - 12);
    ctx.closePath(); ctx.fill();
    // Star on flag
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', bp.x + 4, bp.y - bHeight - 14);
    // BASE label with shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('BASE', bp.x + 1, bp.y - 1);
    ctx.fillStyle = '#fff';
    ctx.fillText('BASE', bp.x, bp.y - 2);
    // Sandbag ring
    ctx.fillStyle = '#6d5e3a';
    ctx.strokeStyle = '#4a3f28';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const sx = bp.x + Math.cos(a) * (baseW/2 + 4);
        const sy = bp.y + Math.sin(a) * (baseH/2 + 2);
        ctx.beginPath(); ctx.ellipse(sx, sy, 3, 2, a, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // === SPAWN (start of path) - Enhanced military gate ===
    const spawnPt = PATH_CELLS[0];
    const sp = gridCenter(spawnPt.c, spawnPt.r);
    // Spawn pad with depth
    const spDepth = 5;
    ctx.fillStyle = '#2d8a2d';
    ctx.beginPath();
    ctx.moveTo(sp.x, sp.y + TILE_H/2); ctx.lineTo(sp.x + TILE_W/2, sp.y);
    ctx.lineTo(sp.x + TILE_W/2, sp.y + spDepth); ctx.lineTo(sp.x, sp.y + TILE_H/2 + spDepth);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1e6e1e';
    ctx.beginPath();
    ctx.moveTo(sp.x, sp.y + TILE_H/2); ctx.lineTo(sp.x - TILE_W/2, sp.y);
    ctx.lineTo(sp.x - TILE_W/2, sp.y + spDepth); ctx.lineTo(sp.x, sp.y + TILE_H/2 + spDepth);
    ctx.closePath(); ctx.fill();
    // Spawn surface with gradient
    drawIsoGradientDiamond(sp.x, sp.y, TILE_W, TILE_H, '#5cbf5c', '#388e3c', '#2a6e2a');
    // Chevron arrows (animated)
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    const arrowBounce = Math.sin(time * 4) * 1.5;
    ctx.globalAlpha = 0.7 + Math.sin(time * 3) * 0.3;
    ctx.fillText('▶', sp.x + 4 + arrowBounce, sp.y + 1);
    ctx.globalAlpha = 0.5 + Math.sin(time * 3 + 1) * 0.3;
    ctx.fillText('▶', sp.x - 4 + arrowBounce, sp.y + 1);
    ctx.globalAlpha = 1;
    // SPAWN label
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.font = 'bold 8px sans-serif';
    ctx.fillText('SPAWN', sp.x + 1, sp.y - 7);
    ctx.fillStyle = '#e0ffe0';
    ctx.fillText('SPAWN', sp.x, sp.y - 8);
    // Gate posts
    ctx.fillStyle = '#555';
    ctx.fillRect(sp.x - TILE_W/2 + 2, sp.y - 12, 3, 14);
    ctx.fillRect(sp.x + TILE_W/2 - 5, sp.y - 12, 3, 14);
    ctx.fillStyle = '#4caf50';
    ctx.beginPath(); ctx.arc(sp.x - TILE_W/2 + 3.5, sp.y - 13, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sp.x + TILE_W/2 - 3.5, sp.y - 13, 2.5, 0, Math.PI * 2); ctx.fill();

    // Draw path direction arrows (original path)
    ctx.strokeStyle = 'rgba(255,255,200,0.1)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < pathWaypoints.length - 1; i++) {
        const a = pathWaypoints[i];
        const b = pathWaypoints[i + 1];
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // Draw shortcut path arrows (red tint) if it exists
    if (shortcutWaypoints) {
        ctx.strokeStyle = 'rgba(255,100,100,0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        for (let i = 0; i < shortcutWaypoints.length - 1; i++) {
            const a = shortcutWaypoints[i];
            const b = shortcutWaypoints[i + 1];
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        ctx.setLineDash([]);
    }
}

function drawHoverPreview() {
    if (!gameState.hoverGrid) return;
    const { col, row } = gameState.hoverGrid;
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;

    // Demolish road selection mode - highlight all blasted tiles
    if (gameState.repairSelectMode) {
        for (const bt of gameState.blastTiles) {
            const bp = gridCenter(bt.col, bt.row);
            const isHovered = bt.col === col && bt.row === row;
            drawIsoDiamond(bp.x, bp.y, TILE_W - 2, TILE_H - 2,
                isHovered ? 'rgba(255,50,50,0.6)' : 'rgba(255,100,50,0.3)',
                isHovered ? '#f44336' : 'rgba(255,100,50,0.5)');
            // X icon on hovered tile
            if (isHovered) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('✕', bp.x, bp.y + 5);
            }
        }
        return;
    }

    // Ability targeting preview
    if (gameState.selectedAbility) {
        const p = gridCenter(col, row);
        if (gameState.selectedAbility === 'airstrike') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 80, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,50,50,0.15)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,50,50,0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
            // Crosshair
            ctx.strokeStyle = 'rgba(255,50,50,0.8)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x - 15, p.y); ctx.lineTo(p.x + 15, p.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(p.x, p.y - 15); ctx.lineTo(p.x, p.y + 15); ctx.stroke();
        } else if (gameState.selectedAbility === 'landmine') {
            const isOnPath = pathSet.has(`${col},${row}`);
            drawIsoDiamond(p.x, p.y, TILE_W - 2, TILE_H - 2,
                isOnPath ? 'rgba(255,100,50,0.4)' : 'rgba(255,50,50,0.2)', null);
        }
        return;
    }

    if (!gameState.selectedTowerType) return;

    const canPlace = gameState.grid[col] && gameState.grid[col][row] === 0;
    const p = gridCenter(col, row);
    const def = TOWER_DEFS[gameState.selectedTowerType];

    // Range ellipse (isometric)
    drawIsoRangeEllipse(p.x, p.y, def.range,
        canPlace ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)',
        canPlace ? 'rgba(76,175,80,0.3)' : 'rgba(244,67,54,0.3)', 1);

    // Tile highlight
    drawIsoDiamond(p.x, p.y, TILE_W - 2, TILE_H - 2,
        canPlace ? 'rgba(76,175,80,0.4)' : 'rgba(244,67,54,0.4)', null);
}

function drawTowers() {
    for (const tower of gameState.towers) {
        const p = gridCenter(tower.col, tower.row);
        const def = TOWER_DEFS[tower.type];
        const rank = getRank(tower);
        const isGeneral = rank.name === 'General';
        const rankIdx = RANKS.indexOf(rank);
        const bodyH = tower.fused ? 24 : (isGeneral ? 20 : 16);
        const bodyW = tower.fused ? 18 : 14;

        // Selected tower range indicator (isometric ellipse)
        if (gameState.selectedTower === tower) {
            drawIsoRangeEllipse(p.x, p.y, getEffectiveRange(tower),
                'rgba(255,215,0,0.08)', 'rgba(255,215,0,0.3)', 1);
        }

        // Slowdown tower aura (isometric ellipse)
        if (tower.type === 'slowdown') {
            drawIsoRangeEllipse(p.x, p.y, getEffectiveRange(tower),
                'rgba(171,71,188,0.08)', 'rgba(171,71,188,0.2)', 1, [4, 4]);
        }

        // Fused tower glow
        if (tower.fused) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
            const glowGrad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 22);
            glowGrad.addColorStop(0, 'rgba(255,215,0,0.4)');
            glowGrad.addColorStop(1, 'rgba(255,215,0,0)');
            ctx.fillStyle = glowGrad;
            ctx.fill();
        }

        // Repairing visual - wrench icon + progress bar + dimmed tower
        if (tower.repairing) {
            // Dim the tower with a translucent overlay
            ctx.globalAlpha = 0.45;
        }

        // === TOWER BASE (isometric platform) ===
        const baseScale = tower.fused ? 0.75 : 0.6;
        const bw = TILE_W * baseScale / 2;
        const bh = TILE_H * baseScale / 2;
        const baseDepth = 5;
        // Shadow under base
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + bh + 3, bw * 1.1, bh * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Right face
        ctx.fillStyle = tower.fused ? '#b8960a' : darkenColor(def.color, 0.55);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + bh); ctx.lineTo(p.x + bw, p.y);
        ctx.lineTo(p.x + bw, p.y + baseDepth); ctx.lineTo(p.x, p.y + bh + baseDepth);
        ctx.closePath(); ctx.fill();
        // Left face
        ctx.fillStyle = tower.fused ? '#9a7d08' : darkenColor(def.color, 0.4);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + bh); ctx.lineTo(p.x - bw, p.y);
        ctx.lineTo(p.x - bw, p.y + baseDepth); ctx.lineTo(p.x, p.y + bh + baseDepth);
        ctx.closePath(); ctx.fill();
        // Top face with gradient
        if (tower.fused) {
            drawIsoGradientDiamond(p.x, p.y, TILE_W * baseScale, TILE_H * baseScale, '#ffe44d', '#ccaa00', '#000');
        } else {
            const topLight = def.color;
            const topDark = darkenColor(def.color, 0.75);
            drawIsoGradientDiamond(p.x, p.y, TILE_W * baseScale, TILE_H * baseScale, topLight, topDark, '#000');
        }
        // Base edge highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x - bw, p.y); ctx.lineTo(p.x, p.y - bh);
        ctx.lineTo(p.x + bw, p.y);
        ctx.stroke();

        // === TOWER BODY (unique per type) ===
        ctx.save();
        const tTime = Date.now() * 0.001;
        if (tower.type === 'machinegun') {
            // Sandbag bunker with mounted gun
            // Sandbag wall layers
            for (let row = 0; row < 3; row++) {
                const sy = p.y - bodyH + 5 + row * 5;
                const sw = bodyW + 4 - row * 1;
                ctx.fillStyle = row === 0 ? '#7a6b44' : row === 1 ? '#6d5e3a' : '#605230';
                roundRect(p.x - sw/2, sy, sw, 5, 2);
                ctx.fill();
                ctx.strokeStyle = '#4a3f28';
                ctx.lineWidth = 0.5;
                roundRect(p.x - sw/2, sy, sw, 5, 2);
                ctx.stroke();
                // Sandbag seams
                ctx.strokeStyle = '#5a4e33';
                ctx.beginPath();
                ctx.moveTo(p.x - sw/4, sy); ctx.lineTo(p.x - sw/4, sy + 5);
                ctx.moveTo(p.x + sw/4, sy); ctx.lineTo(p.x + sw/4, sy + 5);
                ctx.stroke();
            }
            // Gun mount
            ctx.fillStyle = '#666';
            ctx.fillRect(p.x - 3, p.y - bodyH - 2, 6, 8);
            // Ammo box
            ctx.fillStyle = '#5a5a3a';
            ctx.fillRect(p.x - 7, p.y - 4, 5, 4);
            ctx.strokeStyle = '#3a3a2a';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(p.x - 7, p.y - 4, 5, 4);
        } else if (tower.type === 'sniper') {
            // Tall watch tower with camouflage
            // Cross-braced legs
            ctx.strokeStyle = '#4a4a6a';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(p.x - 7, p.y + 1); ctx.lineTo(p.x - 3, p.y - bodyH + 3); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(p.x + 7, p.y + 1); ctx.lineTo(p.x + 3, p.y - bodyH + 3); ctx.stroke();
            // Cross brace
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x - 5, p.y - bodyH/2 + 2); ctx.lineTo(p.x + 5, p.y - bodyH/2 + 2); ctx.stroke();
            // Platform with gradient
            const platGrad = ctx.createLinearGradient(p.x - 8, 0, p.x + 8, 0);
            platGrad.addColorStop(0, '#5a5a80');
            platGrad.addColorStop(1, '#3a3a60');
            ctx.fillStyle = platGrad;
            roundRect(p.x - 8, p.y - bodyH - 1, 16, 7, 2);
            ctx.fill();
            ctx.strokeStyle = '#2a2a4a';
            ctx.lineWidth = 1;
            roundRect(p.x - 8, p.y - bodyH - 1, 16, 7, 2);
            ctx.stroke();
            // Scope with lens flare
            ctx.fillStyle = '#6688cc';
            ctx.beginPath(); ctx.arc(p.x + 6, p.y - bodyH + 2, 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#aaccff';
            ctx.beginPath(); ctx.arc(p.x + 5.5, p.y - bodyH + 1.5, 0.8, 0, Math.PI * 2); ctx.fill();
            // Camo netting
            ctx.strokeStyle = 'rgba(80,100,60,0.4)';
            ctx.lineWidth = 0.5;
            ctx.setLineDash([2,2]);
            ctx.beginPath(); ctx.moveTo(p.x - 8, p.y - bodyH); ctx.lineTo(p.x - 5, p.y - bodyH + 6); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(p.x + 8, p.y - bodyH); ctx.lineTo(p.x + 5, p.y - bodyH + 6); ctx.stroke();
            ctx.setLineDash([]);
        } else if (tower.type === 'missile') {
            // Missile launcher rack with detail
            // Launcher body
            const mlGrad = ctx.createLinearGradient(p.x, p.y - bodyH, p.x, p.y);
            mlGrad.addColorStop(0, '#6a3535');
            mlGrad.addColorStop(1, '#4a2525');
            ctx.fillStyle = mlGrad;
            roundRect(p.x - bodyW/2 - 1, p.y - bodyH + 1, bodyW + 2, bodyH - 1, 3);
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            roundRect(p.x - bodyW/2 - 1, p.y - bodyH + 1, bodyW + 2, bodyH - 1, 3);
            ctx.stroke();
            // Missile tubes (4 in a 2x2 grid)
            for (let mx = -1; mx <= 1; mx += 2) {
                for (let my = 0; my <= 1; my++) {
                    const tx = p.x + mx * 3.5;
                    const ty = p.y - bodyH + my * 5;
                    // Tube outer
                    ctx.fillStyle = '#c0392b';
                    ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI * 2); ctx.fill();
                    // Tube gradient
                    const tGrad = ctx.createRadialGradient(tx - 0.5, ty - 0.5, 0.5, tx, ty, 3);
                    tGrad.addColorStop(0, '#e55');
                    tGrad.addColorStop(1, '#922');
                    ctx.fillStyle = tGrad; ctx.fill();
                    // Missile nose
                    ctx.fillStyle = '#ddd';
                    ctx.beginPath(); ctx.arc(tx, ty, 1.5, 0, Math.PI * 2); ctx.fill();
                }
            }
            // Warning stripe
            ctx.fillStyle = '#ff0';
            ctx.fillRect(p.x - bodyW/2, p.y - 3, bodyW, 1.5);
        } else if (tower.type === 'flamethrower') {
            // Fuel tank with hazard markings
            // Main tank (cylindrical look)
            const ftGrad = ctx.createLinearGradient(p.x - bodyW/2, 0, p.x + bodyW/2, 0);
            ftGrad.addColorStop(0, '#aa5500');
            ftGrad.addColorStop(0.4, '#dd8800');
            ftGrad.addColorStop(1, '#aa5500');
            ctx.fillStyle = ftGrad;
            roundRect(p.x - bodyW/2, p.y - bodyH + 2, bodyW, bodyH - 2, 5);
            ctx.fill();
            ctx.strokeStyle = '#884400';
            ctx.lineWidth = 1;
            roundRect(p.x - bodyW/2, p.y - bodyH + 2, bodyW, bodyH - 2, 5);
            ctx.stroke();
            // Hazard stripes (diagonal)
            ctx.save();
            ctx.beginPath();
            roundRect(p.x - bodyW/2, p.y - bodyH + 2, bodyW, bodyH - 2, 5);
            ctx.clip();
            ctx.fillStyle = '#222';
            for (let s = -3; s < 5; s++) {
                const sx = p.x - bodyW/2 + s * 5;
                ctx.beginPath();
                ctx.moveTo(sx, p.y - bodyH + 2);
                ctx.lineTo(sx + 3, p.y - bodyH + 2);
                ctx.lineTo(sx + 3 + bodyH, p.y);
                ctx.lineTo(sx + bodyH, p.y);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
            // Pilot flame (animated)
            const flameFlicker = Math.sin(tTime * 15) * 1.5;
            ctx.fillStyle = '#ff4400';
            ctx.beginPath(); ctx.arc(p.x, p.y - bodyH, 3 + flameFlicker * 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath(); ctx.arc(p.x, p.y - bodyH, 1.5, 0, Math.PI * 2); ctx.fill();
            // Pressure gauge
            ctx.fillStyle = '#ddd';
            ctx.beginPath(); ctx.arc(p.x + bodyW/2 - 2, p.y - bodyH/2, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 0.5; ctx.stroke();
            ctx.strokeStyle = '#f00';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x + bodyW/2 - 2, p.y - bodyH/2);
            const gaugeAngle = -Math.PI * 0.3 + Math.sin(tTime) * 0.3;
            ctx.lineTo(p.x + bodyW/2 - 2 + Math.cos(gaugeAngle) * 2, p.y - bodyH/2 + Math.sin(gaugeAngle) * 2);
            ctx.stroke();
        } else if (tower.type === 'emp') {
            // Tesla coil with enhanced effects
            // Base column
            const colGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y - bodyH);
            colGrad.addColorStop(0, '#1a5a90');
            colGrad.addColorStop(1, '#2080c0');
            ctx.fillStyle = colGrad;
            ctx.fillRect(p.x - 5, p.y - 8, 10, 8);
            ctx.strokeStyle = '#104060';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(p.x - 5, p.y - 8, 10, 8);
            // Coil rings with glow
            for (let i = 0; i < 5; i++) {
                const ry = p.y - 9 - i * 2.5;
                const rw = 7 - i * 0.6;
                ctx.strokeStyle = `rgba(41,182,246,${0.6 + Math.sin(tTime * 3 + i) * 0.2})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.ellipse(p.x, ry, rw, 2, 0, 0, Math.PI * 2); ctx.stroke();
            }
            // Top orb with animated glow
            const orbY = p.y - bodyH - 3;
            const orbPulse = 4 + Math.sin(tTime * 4) * 0.8;
            // Outer glow
            const orbGlow = ctx.createRadialGradient(p.x, orbY, 1, p.x, orbY, orbPulse + 4);
            orbGlow.addColorStop(0, 'rgba(100,220,255,0.4)');
            orbGlow.addColorStop(1, 'rgba(100,220,255,0)');
            ctx.fillStyle = orbGlow;
            ctx.beginPath(); ctx.arc(p.x, orbY, orbPulse + 4, 0, Math.PI * 2); ctx.fill();
            // Orb
            const orbGrad = ctx.createRadialGradient(p.x - 1, orbY - 1, 0.5, p.x, orbY, orbPulse);
            orbGrad.addColorStop(0, '#ffffff');
            orbGrad.addColorStop(0.3, '#80e0ff');
            orbGrad.addColorStop(0.7, '#2090cc');
            orbGrad.addColorStop(1, '#0060a0');
            ctx.fillStyle = orbGrad;
            ctx.beginPath(); ctx.arc(p.x, orbY, orbPulse, 0, Math.PI * 2); ctx.fill();
            // Lightning arcs (animated, more detailed)
            ctx.lineWidth = 1;
            for (let a = 0; a < 4; a++) {
                const angle = tTime * 3 + a * 1.57;
                const arcLen = 8 + Math.sin(tTime * 5 + a) * 4;
                ctx.strokeStyle = `rgba(100,220,255,${0.4 + Math.sin(tTime * 7 + a) * 0.3})`;
                ctx.beginPath();
                ctx.moveTo(p.x, orbY);
                const midX = p.x + Math.cos(angle) * arcLen * 0.5 + Math.sin(tTime * 8 + a) * 3;
                const midY = orbY + Math.sin(angle) * arcLen * 0.4;
                ctx.lineTo(midX, midY);
                ctx.lineTo(p.x + Math.cos(angle) * arcLen, orbY + Math.sin(angle) * arcLen * 0.7);
                ctx.stroke();
            }
        } else if (tower.type === 'artillery') {
            // Heavy howitzer cannon
            // Base platform
            ctx.fillStyle = '#5d4037';
            roundRect(p.x - bodyW/2 - 2, p.y - 9, bodyW + 4, 9, 2);
            ctx.fill();
            ctx.strokeStyle = '#3e2723';
            ctx.lineWidth = 1;
            roundRect(p.x - bodyW/2 - 2, p.y - 9, bodyW + 4, 9, 2);
            ctx.stroke();
            // Rivets
            ctx.fillStyle = '#888';
            for (let rv = 0; rv < 3; rv++) {
                ctx.beginPath(); ctx.arc(p.x - 5 + rv * 5, p.y - 2, 1, 0, Math.PI * 2); ctx.fill();
            }
            // Wheels with spokes
            for (let side = -1; side <= 1; side += 2) {
                const wx = p.x + side * (bodyW/2 + 2);
                ctx.fillStyle = '#2a2a2a';
                ctx.beginPath(); ctx.arc(wx, p.y + 1, 4, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = '#444';
                ctx.lineWidth = 1; ctx.stroke();
                // Spokes
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 0.5;
                for (let sp = 0; sp < 4; sp++) {
                    const sa = sp * Math.PI / 2;
                    ctx.beginPath();
                    ctx.moveTo(wx, p.y + 1);
                    ctx.lineTo(wx + Math.cos(sa) * 3, p.y + 1 + Math.sin(sa) * 3);
                    ctx.stroke();
                }
                // Hub
                ctx.fillStyle = '#666';
                ctx.beginPath(); ctx.arc(wx, p.y + 1, 1.5, 0, Math.PI * 2); ctx.fill();
            }
            // Barrel housing (thick)
            const bhGrad = ctx.createLinearGradient(p.x - 6, 0, p.x + 6, 0);
            bhGrad.addColorStop(0, '#5a4035');
            bhGrad.addColorStop(0.5, '#6e5040');
            bhGrad.addColorStop(1, '#4e342e');
            ctx.fillStyle = bhGrad;
            roundRect(p.x - 6, p.y - bodyH - 1, 12, bodyH - 7, 2);
            ctx.fill();
            ctx.strokeStyle = '#3e2723';
            ctx.lineWidth = 0.5;
            roundRect(p.x - 6, p.y - bodyH - 1, 12, bodyH - 7, 2);
            ctx.stroke();
        } else if (tower.type === 'slowdown') {
            // Radar / wave emitter with enhanced visuals
            // Support mast
            ctx.fillStyle = '#6a1a8a';
            ctx.fillRect(p.x - 2.5, p.y - bodyH + 3, 5, bodyH - 3);
            ctx.strokeStyle = '#4a0a6a';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(p.x - 2.5, p.y - bodyH + 3, 5, bodyH - 3);
            // Main dish (filled arc)
            ctx.fillStyle = 'rgba(120,40,170,0.5)';
            ctx.beginPath();
            ctx.arc(p.x, p.y - bodyH + 1, 10, Math.PI + 0.4, -0.4);
            ctx.lineTo(p.x, p.y - bodyH + 1);
            ctx.closePath();
            ctx.fill();
            // Dish rim
            ctx.strokeStyle = '#bb55dd';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y - bodyH + 1, 10, Math.PI + 0.4, -0.4);
            ctx.stroke();
            // Inner dish
            ctx.strokeStyle = '#dd88ff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y - bodyH + 1, 6, Math.PI + 0.5, -0.5);
            ctx.stroke();
            // Center emitter
            ctx.fillStyle = '#ee88ff';
            ctx.beginPath(); ctx.arc(p.x, p.y - bodyH + 1, 2, 0, Math.PI * 2); ctx.fill();
            // Animated pulse waves
            for (let pw = 0; pw < 2; pw++) {
                const pt = (tTime * 1.5 + pw * 0.5) % 1;
                const pulseR = pt * getEffectiveRange(tower) * 0.25;
                ctx.beginPath();
                ctx.arc(p.x, p.y - bodyH + 1, pulseR, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(180,80,220,${0.35 * (1 - pt)})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }
        ctx.restore();

        // === BARREL (aims at target) ===
        if (tower.type !== 'slowdown' && tower.type !== 'emp') {
            const barrelLen = tower.type === 'artillery' ? 18 : (tower.type === 'sniper' ? 16 : (tower.fused ? 16 : 14));
            const barrelW = tower.type === 'artillery' ? 5 : (tower.type === 'missile' ? 3 : (tower.fused ? 4 : 3));
            const barrelY = p.y - bodyH + (tower.type === 'artillery' ? 4 : 2);

            if (tower.fused && tower.target) {
                const angle = Math.atan2(tower.target.y - p.y, tower.target.x - p.x);
                ctx.save();
                ctx.translate(p.x, barrelY);
                ctx.rotate(angle);
                // Double barrel
                ctx.fillStyle = '#555';
                ctx.fillRect(0, -barrelW - 1, barrelLen, barrelW);
                ctx.fillRect(0, 1, barrelLen, barrelW);
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(0, -barrelW - 1, barrelLen, barrelW);
                ctx.strokeRect(0, 1, barrelLen, barrelW);
                // Muzzle tip
                ctx.fillStyle = '#777';
                ctx.fillRect(barrelLen - 2, -barrelW - 2, 3, barrelW * 2 + 4);
                ctx.restore();
            } else if (tower.target) {
                const angle = Math.atan2(tower.target.y - p.y, tower.target.x - p.x);
                ctx.save();
                ctx.translate(p.x, barrelY);
                ctx.rotate(angle);
                ctx.fillStyle = '#444';
                ctx.fillRect(0, -barrelW/2, barrelLen, barrelW);
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(0, -barrelW/2, barrelLen, barrelW);
                // Muzzle
                ctx.fillStyle = '#666';
                ctx.fillRect(barrelLen - 2, -barrelW/2 - 1, 2, barrelW + 2);
                ctx.restore();
            } else {
                // Default barrel pointing right
                ctx.fillStyle = '#444';
                ctx.fillRect(p.x, barrelY - barrelW/2, barrelLen, barrelW);
                ctx.fillStyle = '#666';
                ctx.fillRect(p.x + barrelLen - 2, barrelY - barrelW/2 - 1, 2, barrelW + 2);
            }
        }

        // === FUSION STAR ===
        if (tower.fused) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚡', p.x, p.y - bodyH - 14);
        }

        // === RANK STARS ===
        if (rankIdx > 0) {
            const starY = p.y - bodyH - (tower.fused ? 24 : 8);
            ctx.fillStyle = '#ffd700';
            ctx.strokeStyle = '#b8860b';
            ctx.lineWidth = 0.5;
            ctx.font = '8px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('★'.repeat(rankIdx), p.x, starY);
        }

        // === FUSION ABILITY COOLDOWN ===
        if (tower.fused && tower.fusionAbilityCooldown > 0) {
            const cdPct = tower.fusionAbilityCooldown / tower.fusionAbilityMaxCD;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(p.x - 12, p.y + 6, 24, 4);
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(p.x - 12, p.y + 6, 24 * (1 - cdPct), 4);
        }

        // Reset alpha if repairing
        if (tower.repairing) {
            ctx.globalAlpha = 1;
        }

        // === NAME LABEL (when selected) ===
        if (gameState.selectedTower === tower && tower.soldierName) {
            const rank = getRank(tower);
            const nameText = `${rank.name} ${tower.soldierName}`;
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = 'center';
            // Background
            const tw = ctx.measureText(nameText).width + 6;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(p.x - tw / 2, p.y - bodyH - 16, tw, 12);
            // Text
            ctx.fillStyle = '#ffd54f';
            ctx.fillText(nameText, p.x, p.y - bodyH - 7);
        }

        // === TOWER HP BAR (only when damaged) ===
        if (tower.hp < tower.maxHP) {
            const hpRatio = tower.hp / tower.maxHP;
            const barW = 26;
            const barH = 3;
            const barX = p.x - barW / 2;
            const barY = p.y + 5;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
            ctx.fillStyle = hpRatio > 0.5 ? '#4caf50' : hpRatio > 0.25 ? '#ff9800' : '#f44336';
            ctx.fillRect(barX, barY, barW * hpRatio, barH);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(barX, barY, barW, barH);
        }

        // === REPAIR PROGRESS BAR ===
        if (tower.repairing) {
            const progress = 1 - (tower.repairTimer / tower.repairDuration);
            const barW = 26;
            const barH = 3;
            const barX = p.x - barW / 2;
            const barY = p.y + 10;
            // Background
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
            // Progress fill (yellow)
            ctx.fillStyle = '#ffd600';
            ctx.fillRect(barX, barY, barW * progress, barH);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(barX, barY, barW, barH);
            // Wrench icon (simple)
            ctx.fillStyle = '#ffd600';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('⚒', p.x, p.y - 22);
        }
    }
}

// Helper: darken a hex color
function darkenColor(hex, factor) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return `rgb(${Math.floor(r*factor)},${Math.floor(g*factor)},${Math.floor(b*factor)})`;
}

// Helper: rounded rectangle path
function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// Draw enemy projectiles (enemy shooting at towers)
function drawEnemyProjectiles() {
    for (const p of gameState.enemyProjectiles) {
        const rad = p.isTank ? 4 : 2.8;
        // Outer glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad + 6);
        glow.addColorStop(0, p.isTank ? 'rgba(255,100,0,0.35)' : 'rgba(255,60,30,0.3)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(p.x, p.y, rad + 6, 0, Math.PI * 2); ctx.fill();

        // Core with gradient
        const core = ctx.createRadialGradient(p.x - 0.5, p.y - 0.5, 0, p.x, p.y, rad);
        core.addColorStop(0, '#ffffcc');
        core.addColorStop(0.3, p.isTank ? '#ff8800' : '#ff4444');
        core.addColorStop(1, p.isTank ? '#cc4400' : '#cc2222');
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();

        // Trail with fade
        const trailMult = p.isTank ? 0.08 : 0.06;
        ctx.strokeStyle = p.isTank ? 'rgba(255,120,0,0.5)' : 'rgba(255,60,60,0.5)';
        ctx.lineWidth = p.isTank ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * trailMult, p.y - p.vy * trailMult);
        ctx.stroke();
        // Smoke trail for tank rounds
        if (p.isTank) {
            ctx.fillStyle = 'rgba(100,80,60,0.2)';
            ctx.beginPath();
            ctx.arc(p.x - p.vx * 0.05, p.y - p.vy * 0.05, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawEnemies() {
    for (const enemy of gameState.enemies) {
        if (enemy.dead) continue;

        const size = enemy.size;
        const isBoss = enemy.isBoss;
        const ex = enemy.x;
        const ey = enemy.y;

        // Get movement direction for facing
        const ePath = enemy.path || pathWaypoints;
        let facingX = 1, facingY = 0;
        if (enemy.waypointIdx < ePath.length - 1) {
            const nxt = ePath[enemy.waypointIdx + 1];
            const fd = Math.hypot(nxt.x - ex, nxt.y - ey) || 1;
            facingX = (nxt.x - ex) / fd;
            facingY = (nxt.y - ey) / fd;
        }

        // Shadow (isometric)
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(ex, ey + size * 0.4, size * 1.0, size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Boss glow aura
        if (isBoss) {
            ctx.beginPath();
            ctx.arc(ex, ey, size + 5, 0, Math.PI * 2);
            const bossGrad = ctx.createRadialGradient(ex, ey, size * 0.5, ex, ey, size + 5);
            bossGrad.addColorStop(0, 'rgba(255,215,0,0.15)');
            bossGrad.addColorStop(1, 'rgba(255,215,0,0)');
            ctx.fillStyle = bossGrad;
            ctx.fill();
        }

        // Surrender flash
        if (!isBoss && enemy.hp / enemy.maxHP <= 0.15 && Math.floor(Date.now() / 400) % 2 === 0) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `${size + 2}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('🏳', ex + size + 4, ey - size);
        }

        ctx.save();
        const baseColor = enemy.stunTimer > 0 ? '#29b6f6' : enemy.color;
        const eTime = Date.now() * 0.001;

        // Helper: draw an isometric box (top + right side + left side)
        // cx,cy = center, w = width along facing, h = width perpendicular, ht = height, topColor
        function isoBox(cx, cy, fw, fh, ht, dx, dy, topCol, sideCol) {
            const px = -dy, py = dx; // perpendicular
            // Front-right side face
            ctx.fillStyle = sideCol;
            ctx.beginPath();
            ctx.moveTo(cx + dx*fw + px*fh, cy + (dy*fw + py*fh)*0.5);
            ctx.lineTo(cx + dx*fw - px*fh, cy + (dy*fw - py*fh)*0.5);
            ctx.lineTo(cx + dx*fw - px*fh, cy + (dy*fw - py*fh)*0.5 + ht);
            ctx.lineTo(cx + dx*fw + px*fh, cy + (dy*fw + py*fh)*0.5 + ht);
            ctx.closePath(); ctx.fill();
            // Back-left side face
            ctx.beginPath();
            ctx.moveTo(cx + dx*fw - px*fh, cy + (dy*fw - py*fh)*0.5);
            ctx.lineTo(cx - dx*fw - px*fh, cy + (-dy*fw - py*fh)*0.5);
            ctx.lineTo(cx - dx*fw - px*fh, cy + (-dy*fw - py*fh)*0.5 + ht);
            ctx.lineTo(cx + dx*fw - px*fh, cy + (dy*fw - py*fh)*0.5 + ht);
            ctx.closePath(); ctx.fill();
            // Top face
            ctx.fillStyle = topCol;
            ctx.beginPath();
            ctx.moveTo(cx + dx*fw, cy + dy*fw*0.5);
            ctx.lineTo(cx + px*fh, cy + py*fh*0.5);
            ctx.lineTo(cx - dx*fw, cy - dy*fw*0.5);
            ctx.lineTo(cx - px*fh, cy - py*fh*0.5);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = darkenColor(topCol, 0.6);
            ctx.lineWidth = 0.5; ctx.stroke();
        }

        const dx = facingX, dy = facingY;
        const px = -dy, py = dx; // perpendicular to facing

        if (enemy.type === 'infantry') {
            // Isometric soldier seen from above
            const t = Date.now() * 0.008;
            const legSwing = Math.sin(t + enemy.waypointIdx) * 2.5;
            ctx.save();
            ctx.translate(ex, ey);

            // Boots
            ctx.fillStyle = '#2a2a2a';
            ctx.beginPath(); ctx.ellipse(dx*legSwing + px*2, dy*legSwing*0.5 + py*2*0.5 + 3, 2.2, 1.2, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(-dx*legSwing - px*2, -dy*legSwing*0.5 - py*2*0.5 + 3, 2.2, 1.2, 0, 0, Math.PI*2); ctx.fill();
            // Legs
            ctx.strokeStyle = darkenColor(baseColor, 0.4);
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(px*1.5, py*1.5*0.5 + 1); ctx.lineTo(dx*legSwing + px*2, dy*legSwing*0.5 + py*2*0.5 + 2.5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-px*1.5, -py*1.5*0.5 + 1); ctx.lineTo(-dx*legSwing - px*2, -dy*legSwing*0.5 - py*2*0.5 + 2.5); ctx.stroke();

            // Body (isometric box)
            isoBox(0, -2, 3, 3, 4, dx, dy, baseColor, darkenColor(baseColor, 0.55));
            // Belt
            ctx.fillStyle = darkenColor(baseColor, 0.3);
            ctx.beginPath();
            ctx.moveTo(dx*3 + px*3, (dy*3 + py*3)*0.5 - 0.5);
            ctx.lineTo(dx*3 - px*3, (dy*3 - py*3)*0.5 - 0.5);
            ctx.lineTo(-dx*3 - px*3, (-dy*3 - py*3)*0.5 - 0.5);
            ctx.lineTo(-dx*3 + px*3, (-dy*3 + py*3)*0.5 - 0.5);
            ctx.closePath(); ctx.fill();

            // Arms
            ctx.strokeStyle = darkenColor(baseColor, 0.6);
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(px*4, py*4*0.5 - 3); ctx.lineTo(px*5, py*5*0.5 - 1); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-px*4, -py*4*0.5 - 3); ctx.lineTo(-px*3 + dx*5, (-py*3 + dy*5)*0.5 - 3); ctx.stroke();

            // Helmet (isometric ellipse)
            ctx.fillStyle = darkenColor(baseColor, 0.5);
            ctx.beginPath(); ctx.ellipse(0, -7, 5, 3, 0, 0, Math.PI*2); ctx.fill();
            // Helmet top
            ctx.fillStyle = darkenColor(baseColor, 0.45);
            ctx.beginPath(); ctx.ellipse(0, -8, 4, 2.5, 0, 0, Math.PI*2); ctx.fill();
            // Helmet shine
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.beginPath(); ctx.ellipse(-1.5, -9, 2, 1.2, -0.3, 0, Math.PI*2); ctx.fill();

            // Rifle
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-px*3 + dx*2, (-py*3 + dy*2)*0.5 - 3);
            ctx.lineTo(-px*3 + dx*10, (-py*3 + dy*10)*0.5 - 4);
            ctx.stroke();
            ctx.strokeStyle = '#6b4226';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-px*3 + dx*2, (-py*3 + dy*2)*0.5 - 3);
            ctx.lineTo(-px*3 + dx*0, (-py*3 + dy*0)*0.5 - 1);
            ctx.stroke();

            ctx.restore();

        } else if (enemy.type === 'jeep') {
            // Isometric military jeep - 3D box with wheels
            const s = size;
            ctx.save();
            ctx.translate(ex, ey);

            // Wheels (under body)
            ctx.fillStyle = '#1a1a1a';
            for (const fm of [-0.55, 0.45]) {
                for (const pm of [-1, 1]) {
                    const wx = dx*s*fm + px*s*0.35*pm;
                    const wy = (dy*s*fm + py*s*0.35*pm)*0.5 + 2;
                    ctx.beginPath(); ctx.ellipse(wx, wy, 2.8, 1.6, 0, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = '#333';
                    ctx.beginPath(); ctx.ellipse(wx, wy, 1.4, 0.8, 0, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = '#1a1a1a';
                }
            }

            // Body box
            isoBox(0, -1, s*0.55, s*0.28, 4, dx, dy, baseColor, darkenColor(baseColor, 0.5));

            // Hood (front section, darker)
            isoBox(dx*s*0.25, -1 + dy*s*0.25*0.5, s*0.25, s*0.25, 3, dx, dy,
                darkenColor(baseColor, 0.8), darkenColor(baseColor, 0.45));

            // Windshield
            ctx.fillStyle = 'rgba(140,210,255,0.65)';
            const wsOff = 0.05;
            ctx.beginPath();
            ctx.moveTo(dx*s*wsOff + px*s*0.22, (dy*s*wsOff + py*s*0.22)*0.5 - 2);
            ctx.lineTo(dx*s*wsOff - px*s*0.22, (dy*s*wsOff - py*s*0.22)*0.5 - 2);
            ctx.lineTo(dx*s*wsOff - px*s*0.22, (dy*s*wsOff - py*s*0.22)*0.5 - 5);
            ctx.lineTo(dx*s*wsOff + px*s*0.22, (dy*s*wsOff + py*s*0.22)*0.5 - 5);
            ctx.closePath(); ctx.fill();

            // Headlights
            ctx.fillStyle = '#ffe066';
            ctx.beginPath(); ctx.ellipse(dx*s*0.5 + px*s*0.2, (dy*s*0.5 + py*s*0.2)*0.5 - 1, 1.5, 1, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(dx*s*0.5 - px*s*0.2, (dy*s*0.5 - py*s*0.2)*0.5 - 1, 1.5, 1, 0, 0, Math.PI*2); ctx.fill();

            // Roof gun
            ctx.fillStyle = '#555';
            ctx.beginPath(); ctx.ellipse(-dx*s*0.1, -dy*s*0.05 - 3, 2.5, 1.5, 0, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-dx*s*0.1, -dy*s*0.05 - 3);
            ctx.lineTo(dx*s*0.25, dy*s*0.12 - 3);
            ctx.stroke();

            ctx.restore();

        } else if (enemy.type === 'tank') {
            // Isometric battle tank with tracks, hull, turret, gun
            const s = size;
            ctx.save();
            ctx.translate(ex, ey);

            // Tracks (two elongated boxes on each side)
            for (const pm of [-1, 1]) {
                const tOff = pm * s * 0.35;
                const tcx = px * tOff;
                const tcy = py * tOff * 0.5;
                // Track body
                ctx.fillStyle = '#3a3a3a';
                ctx.beginPath();
                ctx.moveTo(tcx + dx*s*0.65, tcy + dy*s*0.65*0.5 + 2);
                ctx.lineTo(tcx + px*3*pm, tcy + py*3*pm*0.5 + 2);
                ctx.lineTo(tcx - dx*s*0.65, tcy - dy*s*0.65*0.5 + 2);
                ctx.lineTo(tcx - px*3*pm, tcy - py*3*pm*0.5 + 2);
                ctx.closePath(); ctx.fill();
                // Track top
                ctx.fillStyle = '#4a4a4a';
                ctx.beginPath();
                ctx.moveTo(tcx + dx*s*0.65, tcy + dy*s*0.65*0.5);
                ctx.lineTo(tcx + px*3*pm, tcy + py*3*pm*0.5);
                ctx.lineTo(tcx - dx*s*0.65, tcy - dy*s*0.65*0.5);
                ctx.lineTo(tcx - px*3*pm, tcy - py*3*pm*0.5);
                ctx.closePath(); ctx.fill();
                // Track detail lines
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 0.5;
                for (let i = -3; i <= 3; i++) {
                    const lx = tcx + dx*s*0.18*i;
                    const ly = tcy + dy*s*0.18*i*0.5;
                    ctx.beginPath();
                    ctx.moveTo(lx + px*2.5*pm, ly + py*2.5*pm*0.5);
                    ctx.lineTo(lx - px*0.5*pm, ly - py*0.5*pm*0.5);
                    ctx.stroke();
                }
                // Road wheels
                ctx.fillStyle = '#555';
                for (let i = -2; i <= 2; i++) {
                    const rwx = tcx + dx*s*0.22*i;
                    const rwy = tcy + dy*s*0.22*i*0.5 + 1;
                    ctx.beginPath(); ctx.ellipse(rwx, rwy, 2, 1.2, 0, 0, Math.PI*2); ctx.fill();
                }
            }

            // Hull (3D isometric box)
            isoBox(0, -1, s*0.55, s*0.28, 5, dx, dy, baseColor, darkenColor(baseColor, 0.5));

            // Hull front slope
            ctx.fillStyle = darkenColor(baseColor, 0.7);
            ctx.beginPath();
            ctx.moveTo(dx*s*0.55 + px*s*0.28, (dy*s*0.55 + py*s*0.28)*0.5 - 1);
            ctx.lineTo(dx*s*0.55 - px*s*0.28, (dy*s*0.55 - py*s*0.28)*0.5 - 1);
            ctx.lineTo(dx*s*0.7, dy*s*0.7*0.5 - 3);
            ctx.closePath(); ctx.fill();

            // Turret (elevated isometric box)
            isoBox(- dx*s*0.05, -4 - dy*s*0.025, s*0.22, s*0.2, 3, dx, dy,
                darkenColor(baseColor, 0.75), darkenColor(baseColor, 0.4));

            // Commander hatch
            ctx.fillStyle = darkenColor(baseColor, 0.45);
            ctx.beginPath(); ctx.ellipse(-dx*s*0.12, (-dy*s*0.12)*0.5 - 5, 2, 1.2, 0, 0, Math.PI*2); ctx.fill();

            // Main gun barrel
            ctx.strokeStyle = '#4a4a4a';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(dx*s*0.15, dy*s*0.15*0.5 - 5);
            ctx.lineTo(dx*s*0.85, dy*s*0.85*0.5 - 5);
            ctx.stroke();
            // Muzzle brake
            ctx.strokeStyle = '#5a5a5a';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(dx*s*0.8, dy*s*0.8*0.5 - 5);
            ctx.lineTo(dx*s*0.9, dy*s*0.9*0.5 - 5);
            ctx.stroke();

            // Reactive armor on front
            ctx.fillStyle = darkenColor(baseColor, 0.55);
            for (let i = -1; i <= 1; i++) {
                const arx = dx*s*0.5 + px*s*0.1*i;
                const ary = (dy*s*0.5 + py*s*0.1*i)*0.5 - 2;
                ctx.fillRect(arx - 1.5, ary - 1, 3, 2);
            }

            ctx.restore();

        } else if (enemy.type === 'enemyArt') {
            // Isometric self-propelled artillery - bigger than tank, long cannon
            const s = size;
            ctx.save();
            ctx.translate(ex, ey);

            // Tracks (same as tank but wider)
            for (const pm of [-1, 1]) {
                const tOff = pm * s * 0.4;
                const tcx = px * tOff;
                const tcy = py * tOff * 0.5;
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.moveTo(tcx + dx*s*0.75, tcy + dy*s*0.75*0.5 + 2);
                ctx.lineTo(tcx + px*3.5*pm, tcy + py*3.5*pm*0.5 + 2);
                ctx.lineTo(tcx - dx*s*0.75, tcy - dy*s*0.75*0.5 + 2);
                ctx.lineTo(tcx - px*3.5*pm, tcy - py*3.5*pm*0.5 + 2);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#444';
                ctx.beginPath();
                ctx.moveTo(tcx + dx*s*0.75, tcy + dy*s*0.75*0.5);
                ctx.lineTo(tcx + px*3.5*pm, tcy + py*3.5*pm*0.5);
                ctx.lineTo(tcx - dx*s*0.75, tcy - dy*s*0.75*0.5);
                ctx.lineTo(tcx - px*3.5*pm, tcy - py*3.5*pm*0.5);
                ctx.closePath(); ctx.fill();
                // Track lines
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 0.5;
                for (let i = -4; i <= 4; i++) {
                    const lx = tcx + dx*s*0.17*i;
                    const ly = tcy + dy*s*0.17*i*0.5;
                    ctx.beginPath();
                    ctx.moveTo(lx + px*3*pm, ly + py*3*pm*0.5);
                    ctx.lineTo(lx - px*0.5*pm, ly - py*0.5*pm*0.5);
                    ctx.stroke();
                }
            }

            // Hull (larger box)
            isoBox(0, -1, s*0.65, s*0.32, 6, dx, dy, baseColor, darkenColor(baseColor, 0.45));

            // Turret housing (raised rectangular box, offset to rear)
            isoBox(-dx*s*0.1, -5 - dy*s*0.05, s*0.3, s*0.25, 4, dx, dy,
                darkenColor(baseColor, 0.7), darkenColor(baseColor, 0.35));

            // Ammo hatch on rear
            ctx.fillStyle = darkenColor(baseColor, 0.4);
            ctx.beginPath();
            ctx.ellipse(-dx*s*0.5, -dy*s*0.5*0.5 - 2, 3, 1.8, 0, 0, Math.PI*2);
            ctx.fill();

            // Long cannon barrel (longer than tank)
            ctx.strokeStyle = '#4a4a4a';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(dx*s*0.15, dy*s*0.15*0.5 - 7);
            ctx.lineTo(dx*s*1.15, dy*s*1.15*0.5 - 7);
            ctx.stroke();
            // Reinforcement rings
            ctx.strokeStyle = '#5a5a5a';
            ctx.lineWidth = 6;
            for (const t of [0.45, 0.7]) {
                const rx = dx*s*t;
                const ry = dy*s*t*0.5 - 7;
                ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + dx*s*0.04, ry + dy*s*0.02); ctx.stroke();
            }
            // Muzzle brake (big)
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(dx*s*1.1, dy*s*1.1*0.5 - 7);
            ctx.lineTo(dx*s*1.2, dy*s*1.2*0.5 - 7);
            ctx.stroke();

            ctx.restore();

        } else if (enemy.type === 'runner') {
            // Isometric fast runner - lean soldier with speed trails
            const t = Date.now() * 0.015;
            const legSwing = Math.sin(t) * 3;
            ctx.save();
            ctx.translate(ex, ey);
            // Speed trails
            ctx.strokeStyle = 'rgba(129,212,250,0.3)';
            ctx.lineWidth = 1;
            for (let sl = 1; sl <= 3; sl++) {
                ctx.beginPath();
                ctx.moveTo(-dx*6*sl, -dy*6*sl*0.5 - 1 + sl*1.5);
                ctx.lineTo(-dx*10*sl, -dy*10*sl*0.5 - 1 + sl*1.5);
                ctx.stroke();
            }
            // Legs
            ctx.strokeStyle = '#4fc3f7';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(dx*legSwing*1.5, dy*legSwing*0.75 + 5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(-dx*legSwing*1.5, -dy*legSwing*0.75 + 5); ctx.stroke();
            // Body
            ctx.fillStyle = '#4fc3f7';
            ctx.beginPath();
            ctx.moveTo(0, -5); ctx.lineTo(3, -1); ctx.lineTo(2, 2); ctx.lineTo(-2, 2); ctx.lineTo(-3, -1);
            ctx.closePath(); ctx.fill();
            // Head
            ctx.fillStyle = '#81d4fa';
            ctx.beginPath(); ctx.ellipse(0, -7, 3.5, 2.5, 0, 0, Math.PI*2); ctx.fill();
            ctx.restore();

        } else if (enemy.type === 'saboteur') {
            // Isometric saboteur - red soldier with explosive pack
            const t = Date.now() * 0.008;
            const legSwing = Math.sin(t) * 2;
            ctx.save();
            ctx.translate(ex, ey);
            // Legs
            ctx.strokeStyle = '#e57373';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(px*1, py*1*0.5 + 1); ctx.lineTo(dx*legSwing + px*2, dy*legSwing*0.5 + py*1 + 5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-px*1, -py*1*0.5 + 1); ctx.lineTo(-dx*legSwing - px*2, -dy*legSwing*0.5 - py*1 + 5); ctx.stroke();
            // Body
            ctx.fillStyle = '#e57373';
            ctx.beginPath();
            ctx.moveTo(0, -5); ctx.lineTo(3.5, -1); ctx.lineTo(3, 2); ctx.lineTo(-3, 2); ctx.lineTo(-3.5, -1);
            ctx.closePath(); ctx.fill();
            // Explosive backpack
            ctx.fillStyle = '#c62828';
            isoBox(-dx*3, -3 - dy*1.5, 2.5, 2.5, 3, dx, dy, '#d32f2f', '#b71c1c');
            // Head
            ctx.fillStyle = '#ff8a80';
            ctx.beginPath(); ctx.ellipse(0, -7, 4, 2.8, 0, 0, Math.PI*2); ctx.fill();
            // Warning symbol
            ctx.fillStyle = '#ff0';
            ctx.font = 'bold 8px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚠', 0, -11);
            ctx.restore();
        }

        ctx.restore();

        // === SHOOTING FLASH ===
        if (enemy.shootFlash > 0) {
            ctx.beginPath();
            ctx.arc(ex, ey, size + 6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,150,50,${enemy.shootFlash * 0.3})`;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(ex, ey, size + 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,200,${enemy.shootFlash * 0.4})`;
            ctx.fill();

            if (enemy.shootTargetX !== undefined) {
                const fdx = enemy.shootTargetX - ex;
                const fdy = enemy.shootTargetY - ey;
                const fd = Math.hypot(fdx, fdy) || 1;
                const flashLen = 12 + size;
                ctx.strokeStyle = `rgba(255,200,80,${enemy.shootFlash * 0.8})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(ex, ey);
                ctx.lineTo(ex + (fdx / fd) * flashLen, ey + (fdy / fd) * flashLen);
                ctx.stroke();
            }
        }

        // Boss crown
        if (isBoss) {
            ctx.fillStyle = '#ffd700';
            ctx.font = `bold ${Math.max(10, size * 0.7)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText('♛', ex, ey - size - 4);
        }

        // === HP BAR ===
        const hpRatio = enemy.hp / enemy.maxHP;
        const barW = size * 2.5;
        const barH = 3;
        const barX = ex - barW / 2;
        const barY = ey - size - (isBoss ? 16 : 10);

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        ctx.fillStyle = hpRatio > 0.5 ? '#4caf50' : hpRatio > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillRect(barX, barY, barW * hpRatio, barH);

        // DOT indicator (fire icon)
        if (enemy.dotTimer > 0) {
            ctx.fillStyle = '#ff6f00';
            ctx.font = '7px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🔥', ex + size + 2, ey - size + 2);
        }

        // Slow indicator (ice)
        if (enemy.slowTimer > 0) {
            ctx.fillStyle = '#ab47bc';
            ctx.font = '7px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('❄', ex - size - 2, ey - size + 2);
        }
    }
}

// Draw allied POW units (surrendered enemies walking backward)
function drawAllies() {
    for (const ally of gameState.allies) {
        if (ally.dead) continue;

        const size = ally.size;
        const ax = ally.x, ay = ally.y;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.ellipse(ax, ay + size * 0.4, size * 0.8, size * 0.25, 0, 0, Math.PI * 2); ctx.fill();

        // Green glow - allied
        const allyGlow = ctx.createRadialGradient(ax, ay, size * 0.5, ax, ay, size + 4);
        allyGlow.addColorStop(0, 'rgba(76,175,80,0.4)');
        allyGlow.addColorStop(1, 'rgba(76,175,80,0)');
        ctx.fillStyle = allyGlow;
        ctx.beginPath(); ctx.arc(ax, ay, size + 4, 0, Math.PI * 2); ctx.fill();

        // Body with gradient
        const powGrad = ctx.createRadialGradient(ax - 1, ay - 1, 0, ax, ay, size);
        powGrad.addColorStop(0, '#88dd88');
        powGrad.addColorStop(1, '#4a9a4a');
        ctx.fillStyle = powGrad;
        ctx.beginPath(); ctx.arc(ax, ay, size, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#2a7a2a';
        ctx.lineWidth = 1.5; ctx.stroke();

        // Hands up gesture (surrender)
        ctx.strokeStyle = '#c8a882';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(ax - 3, ay - 2); ctx.lineTo(ax - 5, ay - size - 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax + 3, ay - 2); ctx.lineTo(ax + 5, ay - size - 2); ctx.stroke();

        // POW label
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('POW', ax + 0.5, ay + 3.5);
        ctx.fillStyle = '#fff';
        ctx.fillText('POW', ax, ay + 3);

        // HP bar
        const hpRatio = ally.hp / ally.maxHP;
        const barW = size * 2.2;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(ax - barW/2 - 1, ay - size - 7, barW + 2, 4);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(ax - barW/2, ay - size - 6, barW * hpRatio, 3);
    }
}

// Draw airstrike effects
function drawAirstrikeEffects() {
    for (const strike of gameState.airstrikeEffects) {
        const progress = 1 - (strike.timer / strike.maxTimer);

        if (progress < 0.3) {
            // Incoming phase - red circle shrinking
            const shrink = 1 - (progress / 0.3);
            ctx.beginPath();
            ctx.arc(strike.x, strike.y, strike.radius * (1 + shrink), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,50,50,${0.8 * shrink})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
            // Explosion phase
            const explodeProgress = (progress - 0.3) / 0.7;
            const alpha = 1 - explodeProgress;

            ctx.beginPath();
            ctx.arc(strike.x, strike.y, strike.radius * (0.5 + explodeProgress * 0.5), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,${Math.floor(150 * (1 - explodeProgress))},0,${alpha * 0.4})`;
            ctx.fill();

            // Shockwave ring
            ctx.beginPath();
            ctx.arc(strike.x, strike.y, strike.radius * explodeProgress, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,200,50,${alpha * 0.8})`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }
}

function drawProjectiles() {
    for (const p of gameState.projectiles) {
        const isSplash = p.splash > 0;
        const rad = isSplash ? 4.5 : 2.5;

        // Outer glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad + 5);
        glow.addColorStop(0, p.color.replace(')', ',0.3)').replace('rgb', 'rgba'));
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(p.x, p.y, rad + 5, 0, Math.PI * 2); ctx.fill();

        // Core projectile with gradient
        const core = ctx.createRadialGradient(p.x - 0.5, p.y - 0.5, 0, p.x, p.y, rad);
        core.addColorStop(0, '#fff');
        core.addColorStop(0.4, p.color);
        core.addColorStop(1, p.color);
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();

        // Trail (longer, fading)
        const trailLen = isSplash ? 0.08 : 0.06;
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = isSplash ? 3 : 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * trailLen, p.y - p.vy * trailLen);
        ctx.stroke();
        ctx.globalAlpha = 0.15;
        ctx.lineWidth = isSplash ? 5 : 3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * trailLen * 1.5, p.y - p.vy * trailLen * 1.5);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
}

function drawParticles() {
    for (const p of gameState.particles) {
        const lifeRatio = p.life / p.maxLife;
        ctx.globalAlpha = lifeRatio;
        const curSize = p.size * (0.3 + lifeRatio * 0.7);
        // Glow
        if (curSize > 2) {
            ctx.fillStyle = p.color.includes('rgba') ? p.color : p.color;
            ctx.globalAlpha = lifeRatio * 0.3;
            ctx.beginPath(); ctx.arc(p.x, p.y, curSize * 1.8, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = lifeRatio;
        }
        // Core
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, curSize, 0, Math.PI * 2); ctx.fill();
        // Bright center
        if (curSize > 1.5) {
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath(); ctx.arc(p.x, p.y, curSize * 0.3, 0, Math.PI * 2); ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
}

function drawFlamethrowerBeams() {
    for (const tower of gameState.towers) {
        if (tower.type !== 'flamethrower' || !tower.target) continue;
        const p = gridCenter(tower.col, tower.row);
        const target = tower.target;
        const dist = isoDist(target.x, target.y, p.x, p.y);
        if (dist > getEffectiveRange(tower)) continue;

        // Inferno mode - 360° ring (isometric ellipse)
        if (tower.fused && tower.abilityActive) {
            const range = getEffectiveRange(tower) * 0.8;
            const grad = ctx.createRadialGradient(p.x, p.y - 14, 10, p.x, p.y - 14, range * 0.5);
            grad.addColorStop(0, 'rgba(255,150,0,0.5)');
            grad.addColorStop(0.5, 'rgba(255,80,0,0.3)');
            grad.addColorStop(1, 'rgba(255,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y - 14, range, range * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            continue;
        }

        const angle = Math.atan2(target.y - (p.y - 14), target.x - p.x);
        const len = Math.min(dist, getEffectiveRange(tower));
        const ft = Date.now() * 0.001;

        ctx.save();
        ctx.translate(p.x, p.y - 14);
        ctx.rotate(angle);

        // Outer heat shimmer
        const shimmer = ctx.createLinearGradient(0, 0, len, 0);
        shimmer.addColorStop(0, 'rgba(255,200,50,0.15)');
        shimmer.addColorStop(0.5, 'rgba(255,100,0,0.08)');
        shimmer.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = shimmer;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(len, -20 + Math.sin(ft * 10) * 3);
        ctx.lineTo(len, 20 + Math.sin(ft * 12) * 3);
        ctx.closePath();
        ctx.fill();

        // Main flame cone
        const grad = ctx.createLinearGradient(0, 0, len, 0);
        grad.addColorStop(0, 'rgba(255,220,100,0.9)');
        grad.addColorStop(0.2, 'rgba(255,150,0,0.7)');
        grad.addColorStop(0.6, 'rgba(255,60,0,0.4)');
        grad.addColorStop(1, 'rgba(200,0,0,0.1)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const spread = 14 + Math.sin(ft * 8) * 2;
        ctx.lineTo(len, -spread);
        ctx.lineTo(len, spread);
        ctx.closePath();
        ctx.fill();

        // Inner hot core
        const inner = ctx.createLinearGradient(0, 0, len * 0.6, 0);
        inner.addColorStop(0, 'rgba(255,255,200,0.6)');
        inner.addColorStop(1, 'rgba(255,200,50,0)');
        ctx.fillStyle = inner;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(len * 0.6, -6);
        ctx.lineTo(len * 0.6, 6);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

// ============================================================
// TOWER STATS CALCULATIONS
// ============================================================

function getRank(tower) {
    let rank = RANKS[0];
    for (const r of RANKS) {
        if (tower.hpDestroyed >= r.hpReq) rank = r;
    }
    return rank;
}

function getNextRank(tower) {
    const current = getRank(tower);
    const idx = RANKS.indexOf(current);
    return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}

function getDivision(tower) {
    return DIVISIONS[tower.divisionLevel];
}

function getNextDivision(tower) {
    return tower.divisionLevel < DIVISIONS.length - 1 ? DIVISIONS[tower.divisionLevel + 1] : null;
}

function getEffectiveDamage(tower) {
    const def = TOWER_DEFS[tower.type];
    const rank = getRank(tower);
    const fusionMult = tower.fused ? FUSION_BONUSES[tower.type].dmgMult : 1;
    return def.damage * rank.dmgMult * fusionMult;
}

function getEffectiveFireRate(tower) {
    const def = TOWER_DEFS[tower.type];
    const rank = getRank(tower);
    const fusionMult = tower.fused ? FUSION_BONUSES[tower.type].rateMult : 1;
    return def.fireRate / (rank.rateMult * fusionMult);
}

function getEffectiveRange(tower) {
    const def = TOWER_DEFS[tower.type];
    const rank = getRank(tower);
    const fusionMult = tower.fused ? FUSION_BONUSES[tower.type].rangeMult : 1;
    return def.range * rank.rangeMult * fusionMult;
}

// Isometric distance: accounts for 2:1 tile ratio (Y is compressed)
// In iso view, vertical distances appear half as large, so we scale Y by 2 for true distance
function isoDist(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = (y2 - y1) * 2; // scale Y back to true distance
    return Math.sqrt(dx * dx + dy * dy);
}

// Draw isometric range ellipse (wider horizontally, compressed vertically)
function drawIsoRangeEllipse(cx, cy, range, fillStyle, strokeStyle, lineWidth, lineDash) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, range, range * 0.5, 0, 0, Math.PI * 2);
    if (fillStyle) {
        ctx.fillStyle = fillStyle;
        ctx.fill();
    }
    if (strokeStyle) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth || 1;
        if (lineDash) ctx.setLineDash(lineDash);
        ctx.stroke();
        if (lineDash) ctx.setLineDash([]);
    }
}

// Military name generator
const MILITARY_FIRST_NAMES = [
    'James', 'John', 'Robert', 'William', 'David', 'Richard', 'Michael', 'Thomas',
    'Daniel', 'Joseph', 'Charles', 'Samuel', 'George', 'Edward', 'Henry', 'Frank',
    'Jack', 'Oscar', 'Victor', 'Max', 'Karl', 'Hans', 'Ivan', 'Sergei',
    'Marcus', 'Leon', 'Rex', 'Duke', 'Cole', 'Hank', 'Wade', 'Clay',
    'Ace', 'Hawk', 'Wolf', 'Knox', 'Nash', 'Axel', 'Blaze', 'Cruz',
    'Flint', 'Grant', 'Chase', 'Stone', 'Colt', 'Brock', 'Reed', 'Wyatt'
];
const MILITARY_LAST_NAMES = [
    'Johnson', 'Williams', 'Brown', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor',
    'Jackson', 'Harris', 'Thompson', 'Walker', 'Baker', 'Carter', 'Mitchell', 'Roberts',
    'Turner', 'Cooper', 'Morgan', 'Hunter', 'Parker', 'Collins', 'Edwards', 'Stewart',
    'Sullivan', 'Murphy', 'Fletcher', 'Armstrong', 'Reynolds', 'Crawford', 'Hawkins', 'Barrett',
    'Steele', 'Blackwood', 'Ironside', 'Stonefield', 'Graves', 'Frost', 'Storm', 'Wolfe',
    'Shepherd', 'Ramsey', 'Garrison', 'Briggs', 'Mercer', 'Conway', 'Lawson', 'Donovan'
];
const MILITARY_CALLSIGNS = [
    'Viper', 'Ghost', 'Reaper', 'Falcon', 'Thunder', 'Shadow', 'Maverick', 'Phoenix',
    'Cobra', 'Eagle', 'Titan', 'Sentinel', 'Fury', 'Bulldog', 'Hammer', 'Raptor',
    'Razor', 'Gunner', 'Spartan', 'Viking', 'Ronin', 'Jaguar', 'Havoc', 'Spectre'
];

function generateMilitaryName() {
    const first = MILITARY_FIRST_NAMES[Math.floor(Math.random() * MILITARY_FIRST_NAMES.length)];
    const last = MILITARY_LAST_NAMES[Math.floor(Math.random() * MILITARY_LAST_NAMES.length)];
    // 30% chance to get a callsign
    if (Math.random() < 0.3) {
        const callsign = MILITARY_CALLSIGNS[Math.floor(Math.random() * MILITARY_CALLSIGNS.length)];
        return `${first} "${callsign}" ${last}`;
    }
    return `${first} ${last}`;
}

function getCombinedTitle(tower) {
    const rank = getRank(tower);
    const name = tower.soldierName || 'Unknown';
    return `${rank.name} ${name}`;
}

// ============================================================
// ENEMY LOGIC
// ============================================================

function spawnEnemy(type, isBoss, waveNum) {
    const def = ENEMY_DEFS[type];
    const enemyPath = getEnemyPath();
    const start = enemyPath[0];
    const hpScale = 1 + waveNum * 0.04;
    const bossScale = isBoss ? 6 : 1;

    gameState.enemies.push({
        type,
        x: start.x,
        y: start.y,
        hp: def.baseHP * hpScale * bossScale,
        maxHP: def.baseHP * hpScale * bossScale,
        speed: def.speed * (isBoss ? 0.8 : 1),
        baseDmg: def.baseDmg * (isBoss ? 2 : 1),
        color: def.color,
        size: def.size * (isBoss ? 1.8 : 1),
        isBoss,
        path: enemyPath, // each enemy has its own path (old or shortcut)
        waypointIdx: 0,
        dead: false,
        dotTimer: 0,
        dotDamage: 0,
        dotSource: null,
        slowTimer: 0,
        slowAmount: 0,
        stunTimer: 0,
        money: Math.ceil(def.baseHP * 0.08),
        surrenderChecked: false,
        // Shooting stats
        canShoot: def.canShoot || false,
        shootRange: def.shootRange || 0,
        shootDamage: (def.shootDamage || 0) * (1 + (waveNum - 1) * 0.03),
        shootRate: def.shootRate || 999,
        shootCooldown: Math.random() * 2, // stagger initial shots
        shootFlash: 0,
        isArtillery: def.isArtillery || false,
        artilleryCooldown: 3 + Math.random() * 4, // first blast 3-7s
        hasBlasted: false
    });
}

function updateEnemies(dt) {
    for (const enemy of gameState.enemies) {
        if (enemy.dead) continue;

        // Stun
        if (enemy.stunTimer > 0) {
            enemy.stunTimer -= dt;
            continue; // skip movement while stunned
        }

        // DOT
        if (enemy.dotTimer > 0) {
            enemy.dotTimer -= dt;
            const dotDmg = enemy.dotDamage * dt;
            enemy.hp -= dotDmg;
            if (enemy.dotSource) {
                enemy.dotSource.hpDestroyed += dotDmg;
            }
            if (enemy.hp <= 0) {
                killEnemy(enemy, enemy.dotSource);
                continue;
            }
        }

        // === SURRENDER CHECK ===
        // Non-boss enemies below 15% HP have a chance to surrender each frame
        if (!enemy.isBoss && !enemy.surrenderChecked && enemy.hp / enemy.maxHP <= 0.15) {
            enemy.surrenderChecked = true;
            const surrenderChance = 0.01; // 1% chance to surrender
            if (Math.random() < surrenderChance) {
                surrenderEnemy(enemy);
                continue;
            }
        }

        // Slow
        let speedMult = 1;
        if (enemy.slowTimer > 0) {
            enemy.slowTimer -= dt;
            speedMult = 1 - enemy.slowAmount;
        }

        // Movement along path (each enemy follows its own path)
        const ePath = enemy.path || pathWaypoints;
        if (enemy.waypointIdx >= ePath.length - 1) {
            // Reached base
            damageBase(enemy);
            enemy.dead = true;
            continue;
        }

        const target = ePath[enemy.waypointIdx + 1];
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        const moveSpeed = enemy.speed * speedMult * dt;

        if (dist <= moveSpeed) {
            enemy.x = target.x;
            enemy.y = target.y;
            enemy.waypointIdx++;
        } else {
            enemy.x += (dx / dist) * moveSpeed;
            enemy.y += (dy / dist) * moveSpeed;
        }

        // === LANDMINE CHECK ===
        for (let i = gameState.landmines.length - 1; i >= 0; i--) {
            const mine = gameState.landmines[i];
            const mineDist = isoDist(enemy.x, enemy.y, mine.x, mine.y);
            if (mineDist < 15) {
                // Explode!
                triggerLandmine(mine, i);
                break;
            }
        }
    }

    // Clean up dead enemies
    gameState.enemies = gameState.enemies.filter(e => !e.dead);
}

// === ENEMY SHOOTING AT TOWERS ===
function updateEnemyShooting(dt) {
    for (const enemy of gameState.enemies) {
        if (enemy.dead || !enemy.canShoot || enemy.stunTimer > 0) continue;

        // Decay shoot flash
        if (enemy.shootFlash > 0) enemy.shootFlash -= dt * 3;

        enemy.shootCooldown -= dt;
        if (enemy.shootCooldown > 0) continue;

        // Find nearest tower in range
        let closestTower = null;
        let closestDist = enemy.shootRange;

        for (const tower of gameState.towers) {
            const tp = gridCenter(tower.col, tower.row);
            const dist = isoDist(tp.x, tp.y, enemy.x, enemy.y);
            if (dist < closestDist) {
                closestDist = dist;
                closestTower = tower;
            }
        }

        if (closestTower) {
            enemy.shootCooldown = enemy.shootRate;
            enemy.shootFlash = 1;

            const tp = gridCenter(closestTower.col, closestTower.row);
            const dx = tp.x - enemy.x;
            const dy = (tp.y - 7) - enemy.y;
            const dist = Math.hypot(dx, dy);
            const speed = 250;

            // Store target for muzzle flash direction
            enemy.shootTargetX = tp.x;
            enemy.shootTargetY = tp.y - 7;

            const isTank = (enemy.type === 'tank' || enemy.type === 'enemyArt');
            gameState.enemyProjectiles.push({
                x: enemy.x, y: enemy.y,
                vx: (dx / dist) * speed,
                vy: (dy / dist) * speed,
                damage: enemy.shootDamage,
                lifetime: 2,
                isTank
            });

            // Sound
            if (isTank) {
                playSoundThrottled('enemy_tank', 0.2);
            } else {
                playSoundThrottled('enemy_shot', 0.05);
            }
        }
    }

    // Update enemy projectiles
    for (const proj of gameState.enemyProjectiles) {
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.lifetime -= dt;

        // Check collision with towers
        for (const tower of gameState.towers) {
            const tp = gridCenter(tower.col, tower.row);
            const dist = isoDist(tp.x, tp.y - 7, proj.x, proj.y);
            if (dist < 15) {
                tower.hp -= proj.damage;
                proj.lifetime = 0;
                playSoundThrottled('hit', 0.08);

                // Hit particle
                gameState.particles.push({
                    x: proj.x, y: proj.y,
                    vx: (Math.random() - 0.5) * 40,
                    vy: -20 - Math.random() * 20,
                    life: 0.3, maxLife: 0.3,
                    color: '#ff4444', size: 2
                });

                // Tower destroyed
                if (tower.hp <= 0) {
                    destroyTower(tower);
                }
                break;
            }
        }
    }

    gameState.enemyProjectiles = gameState.enemyProjectiles.filter(p => p.lifetime > 0);
}

function destroyTower(tower) {
    playSound('tower_destroy');
    const p = gridCenter(tower.col, tower.row);

    // Mark tile as destroyed (unbuildable)
    // Recovery waves scale by tower cost and rank
    const def = TOWER_DEFS[tower.type];
    const rankIdx = RANKS.indexOf(getRank(tower));
    // Recovery waves by tower cost tier + rank
    // Cost tiers: $250=1, $750=1, $2000=2, $5000=2, $25000=3, $100000=4, $200000=5
    const costTiers = { 250:3, 750:3, 2000:4, 5000:4, 25000:5, 100000:6, 200000:7 };
    const costFactor = costTiers[def.cost] || Math.min(5, 1 + Math.floor(Math.log10(def.cost / 250)));
    const rankFactor = Math.floor(rankIdx / 2); // Private/Corporal=0, Sergeant/Captain=1, General=2
    const recoveryWaves = Math.min(10, costFactor + rankFactor); // 1-10 waves
    gameState.grid[tower.col][tower.row] = 3; // 3 = destroyed crater
    gameState.destroyedTiles.set(`${tower.col},${tower.row}`, { wave: gameState.wave, recovery: recoveryWaves });

    // Explosion particles
    for (let i = 0; i < 12; i++) {
        gameState.particles.push({
            x: p.x, y: p.y,
            vx: (Math.random() - 0.5) * 120,
            vy: (Math.random() - 0.5) * 120 - 40,
            life: 0.6, maxLife: 0.6,
            color: ['#ff4400', '#ff6600', '#333'][Math.floor(Math.random() * 3)],
            size: 4
        });
    }

    // Save to fallen soldiers memorial
    gameState.deadTowers.push({
        type: tower.type,
        soldierName: tower.soldierName || 'Unknown',
        rank: getRank(tower),
        kills: tower.kills || 0,
        hpDestroyed: tower.hpDestroyed || 0,
        wave: gameState.wave
    });

    gameState.towers = gameState.towers.filter(t => t !== tower);
    if (gameState.selectedTower === tower) {
        gameState.selectedTower = null;
        document.getElementById('tower-info').classList.add('hidden');
    }
}

// === ENEMY ARTILLERY - PATH BLASTING ===
// Find shortcut corridors between distant path sections, prefer far from player towers
function findShortcutCorridors() {
    const corridors = [];

    // Find pairs of path cells on same row or column, far apart on path
    for (let i = 0; i < PATH_CELLS.length; i++) {
        for (let j = i + 5; j < PATH_CELLS.length; j++) {
            const a = PATH_CELLS[i];
            const b = PATH_CELLS[j];
            const pathDist = j - i; // steps saved along the path
            const gridDist = Math.abs(a.c - b.c) + Math.abs(a.r - b.r); // tiles to blast

            // Must save at least 2x more path steps than tiles blasted
            if (pathDist < gridDist * 2) continue;
            // Minimum 4 path steps saved
            if (pathDist < 4) continue;

            // Same row - horizontal corridor (up to 6 tiles gap)
            if (a.r === b.r && Math.abs(a.c - b.c) <= 6) {
                const minC = Math.min(a.c, b.c);
                const maxC = Math.max(a.c, b.c);
                const tilesNeeded = [];
                for (let c = minC + 1; c < maxC; c++) {
                    const isPath = gameState.grid[c][a.r] === 1;
                    const isBlasted = gameState.blastTiles.some(bt => bt.col === c && bt.row === a.r);
                    if (!isPath && !isBlasted) {
                        tilesNeeded.push({ col: c, row: a.r });
                    }
                }
                if (tilesNeeded.length > 0) {
                    corridors.push({ tiles: tilesNeeded, pathSkip: pathDist, from: a, to: b });
                }
            }

            // Same column - vertical corridor (up to 6 tiles gap)
            if (a.c === b.c && Math.abs(a.r - b.r) <= 6) {
                const minR = Math.min(a.r, b.r);
                const maxR = Math.max(a.r, b.r);
                const tilesNeeded = [];
                for (let r = minR + 1; r < maxR; r++) {
                    const isPath = gameState.grid[a.c][r] === 1;
                    const isBlasted = gameState.blastTiles.some(bt => bt.col === a.c && bt.row === r);
                    if (!isPath && !isBlasted) {
                        tilesNeeded.push({ col: a.c, row: r });
                    }
                }
                if (tilesNeeded.length > 0) {
                    corridors.push({ tiles: tilesNeeded, pathSkip: pathDist, from: a, to: b });
                }
            }
        }
    }

    // Score each corridor: prefer far from towers + big path skip
    for (const corr of corridors) {
        let minTowerDist = Infinity;
        for (const tile of corr.tiles) {
            for (const tower of gameState.towers) {
                const dist = Math.abs(tile.col - tower.col) + Math.abs(tile.row - tower.row);
                if (dist < minTowerDist) minTowerDist = dist;
            }
        }
        if (minTowerDist === Infinity) minTowerDist = 20;

        // Score: tower distance matters a lot + path skip bonus + efficiency bonus
        const efficiency = corr.pathSkip / corr.tiles.length; // steps saved per tile blasted
        corr.score = minTowerDist * 3 + corr.pathSkip + efficiency * 2;
    }

    // Sort by best score (highest = farthest from towers + biggest shortcut)
    corridors.sort((a, b) => b.score - a.score);
    return corridors;
}

// Find the next tile to blast in the best corridor (blast one tile at a time)
function findNextBlastTarget() {
    const corridors = findShortcutCorridors();
    if (corridors.length === 0) return null;

    // Pick the best corridor
    const best = corridors[0];

    // Only blast tiles that are directly adjacent to existing path or blasted tiles
    // This ensures the new road always extends from the path (no isolated blasts)
    for (const tile of best.tiles) {
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        let adjToPath = false;
        for (const [dc, dr] of dirs) {
            const nc = tile.col + dc;
            const nr = tile.row + dr;
            if (nc >= 0 && nc < GRID_COLS && nr >= 0 && nr < GRID_ROWS) {
                if (gameState.grid[nc][nr] === 1) {
                    adjToPath = true;
                    break;
                }
            }
        }
        if (adjToPath) {
            return { col: tile.col, row: tile.row, pathSkip: best.pathSkip };
        }
    }

    // No tile adjacent to path found - skip this corridor, don't blast isolated tiles
    return null;
}

let blastsThisWave = 0; // max 1 blast per wave

function updateEnemyArtillery(dt) {
    for (const enemy of gameState.enemies) {
        if (enemy.dead || !enemy.isArtillery || enemy.stunTimer > 0) continue;

        // Max 1 tile blasted per wave
        if (blastsThisWave >= 1) continue;

        enemy.artilleryCooldown -= dt;
        if (enemy.artilleryCooldown > 0) continue;

        // Find next tile to blast (one at a time, progressively building corridor)
        const target = findNextBlastTarget();

        if (target) {
            // Destroy tower if present on the tile
            const towerOnTile = gameState.towers.find(t => t.col === target.col && t.row === target.row);
            if (towerOnTile) {
                destroyTower(towerOnTile);
            }

            // Blast tile open - mark as path
            gameState.grid[target.col][target.row] = 1;
            pathSet.add(`${target.col},${target.row}`);
            gameState.blastTiles.push({ col: target.col, row: target.row });
            blastsThisWave++;

            // Visual explosion
            const tp = gridCenter(target.col, target.row);
            for (let i = 0; i < 15; i++) {
                gameState.particles.push({
                    x: tp.x, y: tp.y,
                    vx: (Math.random() - 0.5) * 150,
                    vy: (Math.random() - 0.5) * 150 - 50,
                    life: 0.7, maxLife: 0.7,
                    color: ['#ff4400', '#8b2020', '#553300'][Math.floor(Math.random() * 3)],
                    size: 5
                });
            }
            playSound('explosion');

            // Recalculate shortcut path - enemies only use it once corridor is complete
            rebuildPathWithBlasts();

            enemy.artilleryCooldown = 6 + Math.random() * 6;
        } else {
            enemy.artilleryCooldown = 4;
        }
    }
}

// Build BFS shortcut path from blasted tiles (does NOT overwrite original path)
function rebuildShortcutPath() {
    if (gameState.blastTiles.length === 0) {
        shortcutWaypoints = null;
        return;
    }

    // BFS from spawn to base through all walkable tiles (original path + blasted)
    const start = PATH_CELLS[0];
    const end = PATH_CELLS[PATH_CELLS.length - 1];

    const walkable = new Set();
    for (const p of PATH_CELLS) {
        walkable.add(`${p.c},${p.r}`);
    }
    for (const b of gameState.blastTiles) {
        walkable.add(`${b.col},${b.row}`);
    }

    // BFS to find shortest path
    const queue = [{ c: start.c, r: start.r }];
    const visited = new Set([`${start.c},${start.r}`]);
    const parent = {};

    while (queue.length > 0) {
        const curr = queue.shift();

        if (curr.c === end.c && curr.r === end.r) {
            const newPath = [];
            let node = curr;
            while (node) {
                newPath.unshift({ c: node.c, r: node.r });
                node = parent[`${node.c},${node.r}`];
            }

            shortcutWaypoints = newPath.map(p => gridCenter(p.c, p.r));
            return;
        }

        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for (const [dc, dr] of dirs) {
            const nc = curr.c + dc;
            const nr = curr.r + dr;
            const key = `${nc},${nr}`;
            if (walkable.has(key) && !visited.has(key)) {
                visited.add(key);
                parent[key] = curr;
                queue.push({ c: nc, r: nr });
            }
        }
    }
}

// Called when a blast happens - rebuild shortcut and let some existing enemies switch to it
function rebuildPathWithBlasts() {
    rebuildShortcutPath();
    // Only use shortcut if it's actually shorter than the original path
    if (!shortcutWaypoints || shortcutWaypoints.length >= pathWaypoints.length) {
        shortcutWaypoints = null;
        return;
    }

    // Some existing enemies switch to the shortcut path (50% chance each)
    for (const enemy of gameState.enemies) {
        if (enemy.dead) continue;
        if (Math.random() < 0.5) {
            // Remap to closest waypoint on shortcut path
            let closestIdx = 0;
            let closestDist = Infinity;
            for (let i = 0; i < shortcutWaypoints.length; i++) {
                const d = Math.hypot(enemy.x - shortcutWaypoints[i].x, enemy.y - shortcutWaypoints[i].y);
                if (d < closestDist) {
                    closestDist = d;
                    closestIdx = i;
                }
            }
            enemy.path = shortcutWaypoints;
            enemy.waypointIdx = closestIdx;
        }
        // Other enemies keep their current path (old or shortcut from before)
    }
}

// Blasted roads are permanent - cannot be repaired

// === SURRENDER SYSTEM ===
function surrenderEnemy(enemy) {
    enemy.dead = true;
    gameState.totalPOWs++;
    gameState.commandPoints += 2; // Bonus CP for captures

    // Create allied unit walking backward on path (same path as the enemy)
    const ally = {
        x: enemy.x,
        y: enemy.y,
        hp: enemy.maxHP * 0.3, // Starts with 30% HP
        maxHP: enemy.maxHP * 0.3,
        damage: enemy.baseDmg * 0.5,
        speed: enemy.speed * 0.3, // POWs move very slowly
        size: enemy.size * 0.9,
        path: enemy.path || pathWaypoints,
        waypointIdx: enemy.waypointIdx,
        dead: false,
        attackCooldown: 0,
        type: enemy.type
    };
    gameState.allies.push(ally);

    // Surrender particles - white
    for (let i = 0; i < 10; i++) {
        gameState.particles.push({
            x: enemy.x, y: enemy.y,
            vx: (Math.random() - 0.5) * 60,
            vy: (Math.random() - 0.5) * 60 - 30,
            life: 0.8, maxLife: 0.8,
            color: '#ffffff', size: 3
        });
    }

    updatePOWDisplay();
}

function updateAllies(dt) {
    for (const ally of gameState.allies) {
        if (ally.dead) continue;

        // Move backward along path (toward spawn)
        if (ally.waypointIdx <= 0) {
            // Reached spawn, despawn
            ally.dead = true;
            continue;
        }

        const target = (ally.path || pathWaypoints)[ally.waypointIdx - 1];
        const dx = target.x - ally.x;
        const dy = target.y - ally.y;
        const dist = Math.hypot(dx, dy);
        const moveSpeed = ally.speed * dt;

        if (dist <= moveSpeed) {
            ally.x = target.x;
            ally.y = target.y;
            ally.waypointIdx--;
        } else {
            ally.x += (dx / dist) * moveSpeed;
            ally.y += (dy / dist) * moveSpeed;
        }

        // Attack nearby enemies
        ally.attackCooldown -= dt;
        if (ally.attackCooldown <= 0) {
            let closestEnemy = null;
            let closestDist = 40; // attack range

            for (const enemy of gameState.enemies) {
                if (enemy.dead) continue;
                const eDist = isoDist(enemy.x, enemy.y, ally.x, ally.y);
                if (eDist < closestDist) {
                    closestDist = eDist;
                    closestEnemy = enemy;
                }
            }

            if (closestEnemy) {
                closestEnemy.hp -= ally.damage;
                ally.attackCooldown = 1.0;

                // Attack particle
                gameState.particles.push({
                    x: closestEnemy.x, y: closestEnemy.y,
                    vx: (Math.random() - 0.5) * 30,
                    vy: -20 - Math.random() * 20,
                    life: 0.3, maxLife: 0.3,
                    color: '#66bb6a', size: 3
                });

                if (closestEnemy.hp <= 0) {
                    killEnemy(closestEnemy, null);
                    gameState.commandPoints += 1;
                }
            }
        }

        // Allies slowly lose HP (they're wounded POWs)
        ally.hp -= ally.maxHP * 0.02 * dt;
        if (ally.hp <= 0) {
            ally.dead = true;
        }
    }

    gameState.allies = gameState.allies.filter(a => !a.dead);
}

function killEnemy(enemy, sourceTower) {
    enemy.dead = true;
    gameState.money += enemy.money;
    gameState.totalKills++;
    gameState.totalHPDestroyed += enemy.maxHP;

    // Award Command Points (1 per kill, 3 for bosses)
    gameState.commandPoints += enemy.isBoss ? 3 : 1;
    updateCPDisplay();

    if (sourceTower) {
        sourceTower.kills++;
    }

    // Death particles
    for (let i = 0; i < 8; i++) {
        gameState.particles.push({
            x: enemy.x, y: enemy.y,
            vx: (Math.random() - 0.5) * 100,
            vy: (Math.random() - 0.5) * 100 - 50,
            life: 0.5 + Math.random() * 0.3,
            maxLife: 0.8,
            color: enemy.isBoss ? '#ffd700' : enemy.color,
            size: enemy.isBoss ? 5 : 3
        });
    }
}

function damageBase(enemy) {
    const dmg = enemy.baseDmg * (enemy.hp / enemy.maxHP);
    gameState.baseHP = Math.max(0, gameState.baseHP - dmg);
    updateHPBar();

    // Impact particles
    const basePt = PATH_CELLS[PATH_CELLS.length - 1];
    const bp = gridCenter(basePt.c, basePt.r);
    for (let i = 0; i < 5; i++) {
        gameState.particles.push({
            x: bp.x, y: bp.y,
            vx: (Math.random() - 0.5) * 80,
            vy: -Math.random() * 80,
            life: 0.4, maxLife: 0.4,
            color: '#ff4444', size: 4
        });
    }

    if (gameState.baseHP <= 0) {
        gameOver();
    }
}

// ============================================================
// COMMANDER ABILITIES
// ============================================================

function useAirstrike(screenX, screenY) {
    playSound('airstrike');
    if (gameState.commandPoints < ABILITY_COSTS.airstrike) return;
    gameState.commandPoints -= ABILITY_COSTS.airstrike;
    updateCPDisplay();

    const radius = 120;
    const damage = 300 + gameState.wave * 40;

    // Visual effect
    gameState.airstrikeEffects.push({
        x: screenX, y: screenY,
        radius: radius,
        timer: 1.5,
        maxTimer: 1.5,
        damage: damage,
        damageDealt: false
    });
}

function useLandmine(col, row) {
    if (gameState.commandPoints < ABILITY_COSTS.landmine) return;
    if (!pathSet.has(`${col},${row}`)) return; // Must be on path

    gameState.commandPoints -= ABILITY_COSTS.landmine;
    updateCPDisplay();

    const p = gridCenter(col, row);
    gameState.landmines.push({
        x: p.x, y: p.y,
        col, row,
        damage: 400 + gameState.wave * 30,
        radius: 80
    });
}

function triggerLandmine(mine, index) {
    playSound('explosion');
    // Deal damage to all enemies in radius
    for (const enemy of gameState.enemies) {
        if (enemy.dead) continue;
        const dist = isoDist(enemy.x, enemy.y, mine.x, mine.y);
        if (dist <= mine.radius) {
            const falloff = 1 - (dist / mine.radius) * 0.5;
            enemy.hp -= mine.damage * falloff;
            enemy.stunTimer = 1.0; // brief stun
            if (enemy.hp <= 0) killEnemy(enemy, null);
        }
    }

    // Explosion particles
    for (let i = 0; i < 15; i++) {
        gameState.particles.push({
            x: mine.x, y: mine.y,
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200 - 50,
            life: 0.6, maxLife: 0.6,
            color: i % 2 === 0 ? '#ff4400' : '#ffaa00', size: 5
        });
    }

    gameState.landmines.splice(index, 1);
}

function useSupplyDrop() {
    if (gameState.commandPoints < ABILITY_COSTS.supply) return;
    gameState.commandPoints -= ABILITY_COSTS.supply;

    gameState.baseHP = Math.min(gameState.baseMaxHP, gameState.baseHP + 200);
    gameState.money += 300;

    updateHPBar();
    updateMoneyDisplay();
    updateCPDisplay();

    // Heal particles at base
    const basePt = PATH_CELLS[PATH_CELLS.length - 1];
    const bp = gridCenter(basePt.c, basePt.r);
    for (let i = 0; i < 12; i++) {
        gameState.particles.push({
            x: bp.x + (Math.random() - 0.5) * 40,
            y: bp.y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 30,
            vy: -30 - Math.random() * 40,
            life: 1.0, maxLife: 1.0,
            color: '#4caf50', size: 4
        });
    }
}

function updateAirstrikes(dt) {
    for (const strike of gameState.airstrikeEffects) {
        strike.timer -= dt;
        const progress = 1 - (strike.timer / strike.maxTimer);

        // Deal damage at 30% through animation
        if (progress >= 0.3 && !strike.damageDealt) {
            strike.damageDealt = true;
            for (const enemy of gameState.enemies) {
                if (enemy.dead) continue;
                const dist = isoDist(enemy.x, enemy.y, strike.x, strike.y);
                if (dist <= strike.radius) {
                    const falloff = 1 - (dist / strike.radius) * 0.5;
                    enemy.hp -= strike.damage * falloff;
                    if (enemy.hp <= 0) killEnemy(enemy, null);
                }
            }

            // Big explosion particles
            for (let i = 0; i < 20; i++) {
                gameState.particles.push({
                    x: strike.x + (Math.random() - 0.5) * strike.radius,
                    y: strike.y + (Math.random() - 0.5) * strike.radius,
                    vx: (Math.random() - 0.5) * 150,
                    vy: (Math.random() - 0.5) * 150 - 80,
                    life: 0.8, maxLife: 0.8,
                    color: ['#ff4400', '#ffaa00', '#ff6600', '#fff'][Math.floor(Math.random() * 4)],
                    size: 3 + Math.random() * 4
                });
            }
        }
    }

    gameState.airstrikeEffects = gameState.airstrikeEffects.filter(s => s.timer > 0);
}

// ============================================================
// TOWER FUSION SYSTEM
// ============================================================

function getAdjacentTowers(tower) {
    const adjacent = [];
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dc, dr] of dirs) {
        const nc = tower.col + dc;
        const nr = tower.row + dr;
        if (nc >= 0 && nc < GRID_COLS && nr >= 0 && nr < GRID_ROWS) {
            const neighbor = gameState.towers.find(t => t.col === nc && t.row === nr);
            if (neighbor && neighbor.type === tower.type && !neighbor.fused && !tower.fused) {
                adjacent.push(neighbor);
            }
        }
    }
    return adjacent;
}

function canFuse(tower) {
    if (tower.fused) return false;
    return getAdjacentTowers(tower).length > 0;
}

function fuseTowers(tower) {
    const adjacents = getAdjacentTowers(tower);
    if (adjacents.length === 0) return;

    // Pick the adjacent tower with highest HP destroyed (most experienced)
    const partner = adjacents.reduce((best, t) =>
        t.hpDestroyed > best.hpDestroyed ? t : best, adjacents[0]);

    // Combine stats: keep the tower, absorb partner's XP
    tower.hpDestroyed += partner.hpDestroyed;
    tower.kills += partner.kills;
    tower.fused = true;
    tower.fusionAbilityCooldown = 0;
    tower.fusionAbilityMaxCD = 40; // 40 second cooldown
    tower.abilityActive = false;
    tower.abilityTimer = 0;

    // Remove partner
    gameState.grid[partner.col][partner.row] = 0;
    gameState.towers = gameState.towers.filter(t => t !== partner);

    // Fusion particles
    const p = gridCenter(tower.col, tower.row);
    for (let i = 0; i < 20; i++) {
        gameState.particles.push({
            x: p.x + (Math.random() - 0.5) * 40,
            y: p.y + (Math.random() - 0.5) * 20 - 10,
            vx: (Math.random() - 0.5) * 80,
            vy: -40 - Math.random() * 60,
            life: 1.0, maxLife: 1.0,
            color: '#ffd700', size: 4
        });
    }

    // Update info panel
    if (gameState.selectedTower === tower) {
        updateTowerInfoPanel(tower);
    }
}

function activateFusionAbility(tower) {
    if (!tower.fused || tower.fusionAbilityCooldown > 0 || tower.abilityActive) return;

    const p = gridCenter(tower.col, tower.row);
    tower.abilityActive = true;

    switch (tower.type) {
        case 'machinegun':
            // Bullet Storm: 3s of 4x fire rate
            tower.abilityTimer = 3;
            break;
        case 'sniper':
            // Headshot: Instant kill <20% HP enemies in range
            tower.abilityTimer = 0.1;
            const range = getEffectiveRange(tower);
            for (const enemy of gameState.enemies) {
                if (enemy.dead || enemy.isBoss) continue;
                const dist = isoDist(enemy.x, enemy.y, p.x, p.y);
                if (dist <= range && enemy.hp / enemy.maxHP < 0.2) {
                    killEnemy(enemy, tower);
                }
            }
            break;
        case 'missile':
            // Barrage: Fire 8 missiles in all directions
            tower.abilityTimer = 0.1;
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 / 8) * i;
                const speed = 300;
                gameState.projectiles.push({
                    x: p.x, y: p.y - 18,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    damage: getEffectiveDamage(tower) * 1.5,
                    splash: 60,
                    stun: 0,
                    color: '#ff5722',
                    tower,
                    lifetime: 2
                });
            }
            break;
        case 'flamethrower':
            // Inferno: 360° flame ring for 3s
            tower.abilityTimer = 3;
            break;
        case 'artillery':
            // Carpet Bomb: 5 explosions along path
            tower.abilityTimer = 0.1;
            for (let i = 0; i < 5; i++) {
                const pathIdx = Math.floor(Math.random() * pathWaypoints.length);
                const wp = pathWaypoints[pathIdx];
                setTimeout(() => {
                    gameState.airstrikeEffects.push({
                        x: wp.x, y: wp.y,
                        radius: 50,
                        timer: 1.0,
                        maxTimer: 1.0,
                        damage: getEffectiveDamage(tower),
                        damageDealt: false
                    });
                }, i * 200);
            }
            break;
        case 'emp':
            // EMP Pulse: Stun ALL enemies for 4s
            tower.abilityTimer = 0.1;
            for (const enemy of gameState.enemies) {
                if (!enemy.dead) {
                    enemy.stunTimer = 4;
                }
            }
            // Visual pulse
            for (let i = 0; i < 15; i++) {
                gameState.particles.push({
                    x: p.x + (Math.random() - 0.5) * 200,
                    y: p.y + (Math.random() - 0.5) * 100,
                    vx: (Math.random() - 0.5) * 100,
                    vy: (Math.random() - 0.5) * 100,
                    life: 0.8, maxLife: 0.8,
                    color: '#29b6f6', size: 5
                });
            }
            break;
        case 'slowdown':
            // Freeze: Stop all enemies in range for 3s
            tower.abilityTimer = 3;
            break;
    }

    tower.fusionAbilityCooldown = tower.fusionAbilityMaxCD;
}

function updateFusionAbilities(dt) {
    for (const tower of gameState.towers) {
        if (!tower.fused) continue;

        // Cooldown
        if (tower.fusionAbilityCooldown > 0) {
            tower.fusionAbilityCooldown -= dt;
        }

        // Active ability effects
        if (tower.abilityActive && tower.abilityTimer > 0) {
            tower.abilityTimer -= dt;
            const p = gridCenter(tower.col, tower.row);
            const range = getEffectiveRange(tower);

            if (tower.type === 'flamethrower') {
                // Inferno: damage all enemies in range
                for (const enemy of gameState.enemies) {
                    if (enemy.dead) continue;
                    const dist = isoDist(enemy.x, enemy.y, p.x, p.y);
                    if (dist <= range * 0.8) {
                        const dmg = getEffectiveDamage(tower) * 0.5 * dt;
                        enemy.hp -= dmg;
                        tower.hpDestroyed += dmg;
                        if (enemy.hp <= 0) killEnemy(enemy, tower);
                    }
                }
            } else if (tower.type === 'slowdown') {
                // Freeze: all enemies in range are frozen
                for (const enemy of gameState.enemies) {
                    if (enemy.dead) continue;
                    const dist = isoDist(enemy.x, enemy.y, p.x, p.y);
                    if (dist <= range) {
                        enemy.stunTimer = 0.2;
                    }
                }
            }

            if (tower.abilityTimer <= 0) {
                tower.abilityActive = false;
            }
        }
    }
}

// ============================================================
// TOWER LOGIC
// ============================================================

function placeTower(col, row, type) {
    const def = TOWER_DEFS[type];
    if (gameState.money < def.cost) return false;
    if (gameState.grid[col][row] !== 0) return false;

    gameState.money -= def.cost;
    gameState.grid[col][row] = 2;

    const tower = {
        col, row, type,
        soldierName: generateMilitaryName(),
        fireCooldown: 0,
        kills: 0,
        hpDestroyed: 0,
        divisionLevel: 0,
        target: null,
        targetEnemy: null,
        fused: false,
        fusionAbilityCooldown: 0,
        fusionAbilityMaxCD: 40,
        abilityActive: false,
        abilityTimer: 0,
        hp: def.towerHP,
        maxHP: def.towerHP,
        targetMode: 'first'
    };
    gameState.towers.push(tower);
    playSound('place');
    updateMoneyDisplay();
    updateTowerButtons();
    return true;
}

function sellTower(tower) {
    playSound('sell');
    const def = TOWER_DEFS[tower.type];
    const fusionBonus = tower.fused ? 1.5 : 1;
    const refund = Math.floor(def.cost * SELL_REFUND * fusionBonus);
    gameState.money += refund;
    gameState.grid[tower.col][tower.row] = 0;
    gameState.towers = gameState.towers.filter(t => t !== tower);
    gameState.selectedTower = null;
    document.getElementById('tower-info').classList.add('hidden');
    updateMoneyDisplay();
    updateTowerButtons();
}

// Division system removed - towers upgrade via rank only

function findTarget(tower) {
    const p = gridCenter(tower.col, tower.row);
    const range = getEffectiveRange(tower);
    const mode = tower.targetMode || 'first';
    const inRange = [];
    for (const enemy of gameState.enemies) {
        if (enemy.dead) continue;
        const dist = isoDist(enemy.x, enemy.y, p.x, p.y);
        if (dist > range) continue;
        inRange.push({ enemy, dist });
    }
    if (inRange.length === 0) return null;
    if (mode === 'closest') {
        let best = inRange[0]; for (let i = 1; i < inRange.length; i++) { if (inRange[i].dist < best.dist) best = inRange[i]; } return best.enemy;
    }
    if (mode === 'strongest') {
        let best = inRange[0]; for (let i = 1; i < inRange.length; i++) { if (inRange[i].enemy.hp > best.enemy.hp) best = inRange[i]; } return best.enemy;
    }
    let bestEnemy = null, bestProgress = mode === 'last' ? Infinity : -1;
    for (const { enemy } of inRange) {
        const ep = enemy.path || pathWaypoints;
        const progress = enemy.waypointIdx + (1 - Math.hypot(
            ep[Math.min(enemy.waypointIdx + 1, ep.length - 1)].x - enemy.x,
            ep[Math.min(enemy.waypointIdx + 1, ep.length - 1)].y - enemy.y
        ) / 100);
        if (mode === 'last' ? progress < bestProgress : progress > bestProgress) { bestProgress = progress; bestEnemy = enemy; }
    }
    return bestEnemy;
}

function updateTowers(dt) {
    for (const tower of gameState.towers) {
        const def = TOWER_DEFS[tower.type];
        const p = gridCenter(tower.col, tower.row);

        // Update maxHP based on rank (tower gets tougher as it ranks up)
        const rank = getRank(tower);
        const newMaxHP = Math.ceil(def.towerHP * rank.hpMult);
        if (newMaxHP > tower.maxHP) {
            const hpGain = newMaxHP - tower.maxHP;
            tower.maxHP = newMaxHP;
            tower.hp += hpGain; // gain the extra HP
        }

        // Handle repair timer
        if (tower.repairing) {
            tower.repairTimer -= dt;
            // Gradually restore HP during repair
            const progress = 1 - (tower.repairTimer / tower.repairDuration);
            tower.hp = tower.repairStartHP + (tower.repairTargetHP - tower.repairStartHP) * Math.min(1, progress);
            if (tower.repairTimer <= 0) {
                tower.hp = tower.repairTargetHP;
                tower.repairing = false;
                tower.repairTimer = 0;
                // Repair complete particles
                for (let i = 0; i < 8; i++) {
                    gameState.particles.push({
                        x: p.x + (Math.random() - 0.5) * 20,
                        y: p.y + (Math.random() - 0.5) * 10,
                        vx: (Math.random() - 0.5) * 30,
                        vy: -20 - Math.random() * 30,
                        life: 0.5, maxLife: 0.5,
                        color: '#4caf50', size: 3
                    });
                }
                if (gameState.selectedTower === tower) updateTowerInfoPanel(tower);
            }
        }

        // Slowdown tower - passive aura
        if (tower.type === 'slowdown') {
            const range = getEffectiveRange(tower);
            for (const enemy of gameState.enemies) {
                if (enemy.dead) continue;
                const dist = isoDist(enemy.x, enemy.y, p.x, p.y);
                if (dist <= range) {
                    enemy.slowTimer = 0.5;
                    enemy.slowAmount = 0.5;
                }
            }
            tower.target = null;
            continue;
        }

        tower.fireCooldown -= dt;

        // Fused machinegun bullet storm: 4x fire rate
        let fireRateMod = 1;
        if (tower.fused && tower.type === 'machinegun' && tower.abilityActive) {
            fireRateMod = 4;
        }

        const target = findTarget(tower);

        if (target) {
            tower.target = { x: target.x, y: target.y };
            tower.targetEnemy = target;

            if (tower.fireCooldown <= 0) {
                tower.fireCooldown = getEffectiveFireRate(tower) / fireRateMod;

                // Tower fire sound
                if (tower.type === 'machinegun') playSoundThrottled('mg', 0.06);
                else if (tower.type === 'sniper') playSoundThrottled('sniper', 0.3);
                else if (tower.type === 'missile' || tower.type === 'artillery') playSoundThrottled('missile', 0.15);
                else if (tower.type === 'emp') playSoundThrottled('emp', 0.2);
                else if (tower.type === 'flamethrower') playSoundThrottled('flame', 0.08);

                // Flamethrower - instant damage in cone
                if (tower.type === 'flamethrower') {
                    const range = getEffectiveRange(tower);
                    const angle = Math.atan2(target.y - p.y, target.x - p.x);

                    for (const enemy of gameState.enemies) {
                        if (enemy.dead) continue;
                        const dist = isoDist(enemy.x, enemy.y, p.x, p.y);
                        if (dist > range) continue;

                        const enemyAngle = Math.atan2(enemy.y - p.y, enemy.x - p.x);
                        let angleDiff = Math.abs(enemyAngle - angle);
                        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                        if (angleDiff < 0.5) {
                            const dmg = getEffectiveDamage(tower);
                            enemy.hp -= dmg;
                            tower.hpDestroyed += dmg;
                            enemy.dotTimer = 2;
                            enemy.dotDamage = def.dot;
                            enemy.dotSource = tower;

                            if (enemy.hp <= 0) killEnemy(enemy, tower);
                        }
                    }
                } else {
                    // Fire projectile
                    const dx = target.x - p.x;
                    const dy = target.y - (p.y - 14);
                    const dist = Math.hypot(dx, dy);
                    const speed = def.projectileSpeed;

                    gameState.projectiles.push({
                        x: p.x, y: p.y - 14,
                        vx: (dx / dist) * speed,
                        vy: (dy / dist) * speed,
                        damage: getEffectiveDamage(tower),
                        splash: def.splash,
                        stun: def.stun,
                        color: def.projectileColor,
                        tower,
                        lifetime: 3
                    });
                }
            }
        } else {
            tower.target = null;
            tower.targetEnemy = null;
        }
    }
}

// ============================================================
// PROJECTILE LOGIC
// ============================================================

function updateProjectiles(dt) {
    for (const proj of gameState.projectiles) {
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.lifetime -= dt;

        // Check collision with enemies
        for (const enemy of gameState.enemies) {
            if (enemy.dead) continue;
            const dist = isoDist(enemy.x, enemy.y, proj.x, proj.y);

            if (dist < enemy.size + 4) {
                // Direct hit
                if (proj.splash > 0) {
                    for (const e of gameState.enemies) {
                        if (e.dead) continue;
                        const sDist = isoDist(e.x, e.y, proj.x, proj.y);
                        if (sDist <= proj.splash) {
                            const falloff = 1 - (sDist / proj.splash) * 0.5;
                            const dmg = proj.damage * falloff;
                            e.hp -= dmg;
                            proj.tower.hpDestroyed += dmg;
                            if (e.hp <= 0) killEnemy(e, proj.tower);
                        }
                    }
                    for (let i = 0; i < 6; i++) {
                        gameState.particles.push({
                            x: proj.x, y: proj.y,
                            vx: (Math.random() - 0.5) * 120,
                            vy: (Math.random() - 0.5) * 120,
                            life: 0.3, maxLife: 0.3,
                            color: '#ff6600', size: 4
                        });
                    }
                } else {
                    const dmg = proj.damage;
                    enemy.hp -= dmg;
                    proj.tower.hpDestroyed += dmg;

                    if (proj.stun > 0) {
                        enemy.stunTimer = proj.stun;
                    }

                    if (enemy.hp <= 0) killEnemy(enemy, proj.tower);
                }

                proj.lifetime = 0;
                break;
            }
        }
    }

    gameState.projectiles = gameState.projectiles.filter(p => p.lifetime > 0);
}

// ============================================================
// PARTICLE SYSTEM
// ============================================================

function updateParticles(dt) {
    for (const p of gameState.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 100 * dt; // gravity
        p.life -= dt;
    }
    gameState.particles = gameState.particles.filter(p => p.life > 0);
}

// ============================================================
// WAVE SYSTEM
// ============================================================

// Wave Preview
function getWavePreview(waveNum) {
    const isBossWave = waveNum % 5 === 0;
    const totalEnemies = Math.floor(6 + waveNum * 1.5);
    const infantryPct = 0.6 - Math.min(0.1, waveNum * 0.005);
    const jeepPct = waveNum >= 4 ? 0.05 + Math.min(0.20, (waveNum - 4) * 0.03) : 0;
    const tankPct = waveNum >= 8 ? 0.1 : 0;
    const specialPct = waveNum >= 6 ? 0.08 : 0;
    const artPct = waveNum >= 10 ? 0.05 : 0;
    const total = infantryPct + jeepPct + tankPct + specialPct + artPct;
    const infantryCount = Math.max(2, Math.round(totalEnemies * infantryPct / total));
    const jeepCount = Math.round(totalEnemies * jeepPct / total);
    const tankCount = Math.round(totalEnemies * tankPct / total);
    const artCount = waveNum >= 4 ? Math.min(3, Math.round(totalEnemies * artPct / total)) : 0;
    const specialCount = Math.round(totalEnemies * specialPct / total);
    const runnerCount = Math.ceil(specialCount * 0.6);
    const saboteurCount = specialCount - runnerCount;
    const composition = {};
    if (infantryCount > 0) composition.infantry = infantryCount;
    if (jeepCount > 0) composition.jeep = jeepCount;
    if (tankCount > 0) composition.tank = tankCount;
    if (artCount > 0) composition.enemyArt = artCount;
    if (runnerCount > 0) composition.runner = runnerCount;
    if (saboteurCount > 0) composition.saboteur = saboteurCount;
    let totalCount = infantryCount + jeepCount + tankCount + artCount + runnerCount + saboteurCount;
    if (isBossWave) { composition.boss = 1; totalCount += 1; }
    return { waveNum, isBossWave, composition, totalCount };
}
const ENEMY_PREVIEW_INFO = {
    infantry: { icon: '\u{1F52B}', label: 'Infantry', color: '#6b8e23' },
    jeep: { icon: '\u{1F697}', label: 'Jeep', color: '#808000' },
    tank: { icon: '\u2B1B', label: 'Tank', color: '#666' },
    enemyArt: { icon: '\u{1F4A5}', label: 'Artillery', color: '#8b6914' },
    runner: { icon: '\u26A1', label: 'Runner', color: '#daa520' },
    saboteur: { icon: '\u{1F480}', label: 'Saboteur', color: '#b22222' },
    boss: { icon: '\u{1F451}', label: 'Boss', color: '#ffd700' }
};
function updateWavePreview() {
    const nextWave = (gameState ? gameState.wave : 0) + 1;
    const preview = getWavePreview(nextWave);
    const titleEl = document.getElementById('wave-preview-title');
    const enemiesEl = document.getElementById('wave-preview-enemies');
    const totalEl = document.getElementById('wave-preview-total');
    if (!titleEl) return;
    titleEl.textContent = 'NEXT: WAVE ' + preview.waveNum;
    titleEl.classList.toggle('boss-wave', preview.isBossWave);
    let html = '';
    for (const [type, count] of Object.entries(preview.composition)) {
        const info = ENEMY_PREVIEW_INFO[type];
        if (!info || count <= 0) continue;
        html += '<div class="wave-preview-entry"><span class="wave-preview-icon" style="color:' + info.color + '">' + info.icon + '</span><span class="wave-preview-count" style="color:' + info.color + '">' + count + '</span></div>';
    }
    enemiesEl.innerHTML = html;
    totalEl.textContent = preview.totalCount + ' enemies' + (preview.isBossWave ? ' + BOSS' : '');
}

function generateWave(waveNum) {
    const enemies = [];
    const isBossWave = waveNum % 5 === 0;

    // Total enemies scales linearly
    const totalEnemies = Math.floor(6 + waveNum * 1.5);

    // Distribution with ±20% randomness
    const randFactor = () => 0.8 + Math.random() * 0.4;

    const infantryPct = (0.6 - Math.min(0.1, waveNum * 0.005)) * randFactor();
    const jeepPct = waveNum >= 4 ? (0.05 + Math.min(0.20, (waveNum - 4) * 0.03)) * randFactor() : 0;
    const tankPct = waveNum >= 8 ? (0.1 * randFactor()) : 0;
    const specialPct = waveNum >= 6 ? (0.08 * randFactor()) : 0;
    const artPct = waveNum >= 10 ? (0.05 * randFactor()) : 0;

    const total = infantryPct + jeepPct + tankPct + specialPct + artPct;

    const infantryCount = Math.max(2, Math.round(totalEnemies * infantryPct / total));
    const jeepCount = Math.round(totalEnemies * jeepPct / total);
    const tankCount = Math.round(totalEnemies * tankPct / total);
    const artCount = waveNum >= 4 ? Math.min(3, Math.round(totalEnemies * artPct / total)) : 0;
    const specialCount = Math.round(totalEnemies * specialPct / total);

    // Split specials between runners and saboteurs
    const runnerCount = Math.ceil(specialCount * 0.6);
    const saboteurCount = specialCount - runnerCount;

    for (let i = 0; i < infantryCount; i++) enemies.push({ type: 'infantry', isBoss: false });
    for (let i = 0; i < jeepCount; i++) enemies.push({ type: 'jeep', isBoss: false });
    for (let i = 0; i < tankCount; i++) enemies.push({ type: 'tank', isBoss: false });
    for (let i = 0; i < artCount; i++) enemies.push({ type: 'enemyArt', isBoss: false });
    for (let i = 0; i < runnerCount; i++) enemies.push({ type: 'runner', isBoss: false });
    for (let i = 0; i < saboteurCount; i++) enemies.push({ type: 'saboteur', isBoss: false });

    if (isBossWave) {
        const bossType = waveNum >= 20 ? 'tank' : waveNum >= 10 ? 'jeep' : 'tank';
        enemies.push({ type: bossType, isBoss: true });
    }

    // Shuffle
    for (let i = enemies.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [enemies[i], enemies[j]] = [enemies[j], enemies[i]];
    }

    // Put boss at end
    if (isBossWave) {
        const bossIdx = enemies.findIndex(e => e.isBoss);
        if (bossIdx !== -1) {
            const boss = enemies.splice(bossIdx, 1)[0];
            enemies.push(boss);
        }
    }

    return enemies;
}

function startWave() {
    playSound('wave_start');
    blastsThisWave = 0; // reset blast limit
    gameState.wave++;
    gameState.waveActive = true;
    gameState.autoWaveTimer = 0;
    const newEnemies = generateWave(gameState.wave);
    gameState.enemiesToSpawn = gameState.enemiesToSpawn.concat(newEnemies);
    gameState.spawnInterval = Math.max(0.2, 0.45 - gameState.wave * 0.01);

    document.getElementById('wave-number').textContent = gameState.wave;
    updateWavePreview();

    // Recover destroyed tower tiles based on recovery time
    const toRecover = [];
    for (const [key, info] of gameState.destroyedTiles) {
        if (gameState.wave - info.wave >= info.recovery) {
            toRecover.push(key);
        }
    }
    for (const key of toRecover) {
        gameState.destroyedTiles.delete(key);
        const [col, row] = key.split(',').map(Number);
        if (gameState.grid[col]) {
            gameState.grid[col][row] = 0; // back to buildable
        }
    }
}

function updateWave(dt) {
    // Spawn enemies from queue
    if (gameState.enemiesToSpawn.length > 0) {
        gameState.spawnTimer -= dt;
        if (gameState.spawnTimer <= 0) {
            const enemyDef = gameState.enemiesToSpawn.shift();
            spawnEnemy(enemyDef.type, enemyDef.isBoss, gameState.wave);
            gameState.spawnTimer = gameState.spawnInterval;
        }
    }

    // Track wave active state
    if (gameState.waveActive && gameState.enemiesToSpawn.length === 0 && gameState.enemies.length === 0) {
        gameState.waveActive = false;
        // Wave completion bonus
        const bonus = 40 + gameState.wave * 10;
        gameState.money += bonus;
        updateMoneyDisplay();
        updateWavePreview();
        saveGame();
    }

    // Auto-start next wave after 3s countdown
    if (!gameState.waveActive && gameState.enemiesToSpawn.length === 0 && gameState.enemies.length === 0 && gameState.wave > 0) {
        gameState.autoWaveTimer += dt;
        const remaining = Math.ceil(3 - gameState.autoWaveTimer);
        if (remaining > 0) {
            document.getElementById('auto-start-timer').textContent = `Next: ${remaining}s`;
        } else {
            document.getElementById('auto-start-timer').textContent = '';
            startWave();
        }
    } else {
        gameState.autoWaveTimer = 0;
        document.getElementById('auto-start-timer').textContent = '';
    }
}

// ============================================================
// UI UPDATES
// ============================================================

function updateMoneyDisplay() {
    document.getElementById('money-amount').textContent = gameState.money;
}

function updateTowerRoster() {
    const roster = document.getElementById('tower-roster');
    if (!roster) return;
    if (gameState.towers.length === 0 && gameState.deadTowers.length === 0) {
        roster.innerHTML = '';
        return;
    }

    let html = '<div class="roster-title">🎖 UNIT ROSTER</div>';
    // Sort by rank (highest first), then by HP destroyed
    const sortedTowers = [...gameState.towers].sort((a, b) => {
        const rankA = RANKS.indexOf(getRank(a));
        const rankB = RANKS.indexOf(getRank(b));
        if (rankB !== rankA) return rankB - rankA;
        return (b.hpDestroyed || 0) - (a.hpDestroyed || 0);
    });
    for (const tower of sortedTowers) {
        const def = TOWER_DEFS[tower.type];
        const rank = getRank(tower);
        const hpPct = Math.ceil(tower.hp / tower.maxHP * 100);
        const hpColor = hpPct > 50 ? '#4caf50' : hpPct > 25 ? '#ff9800' : '#f44336';
        const isSelected = gameState.selectedTower === tower;
        const name = tower.soldierName || 'Unknown';
        // Short rank abbreviation
        const rankAbbr = { 'Private': 'Pvt', 'Corporal': 'Cpl', 'Sergeant': 'Sgt', 'Lieutenant': 'Lt', 'Captain': 'Cpt', 'Colonel': 'Col', 'General': 'Gen' }[rank.name] || rank.name;

        html += `<div class="roster-entry${isSelected ? ' selected' : ''}" data-tower-col="${tower.col}" data-tower-row="${tower.row}">`;
        html += `<div class="roster-icon" style="background:${def.color}"></div>`;
        html += `<div class="roster-rank">${rankAbbr}</div>`;
        html += `<div class="roster-name">${name}</div>`;
        html += `<div class="roster-hp" style="color:${hpColor}">${hpPct}%</div>`;
        html += `</div>`;
    }

    // Dead towers - fallen soldiers at bottom
    if (gameState.deadTowers.length > 0) {
        html += '<div class="roster-divider">✝ FALLEN</div>';
        for (const dead of gameState.deadTowers) {
            const def = TOWER_DEFS[dead.type];
            const rankAbbr = { 'Private': 'Pvt', 'Corporal': 'Cpl', 'Sergeant': 'Sgt', 'Lieutenant': 'Lt', 'Captain': 'Cpt', 'Colonel': 'Col', 'General': 'Gen' }[dead.rank.name] || dead.rank.name;
            html += `<div class="roster-entry dead">`;
            html += `<div class="roster-icon" style="background:#555"></div>`;
            html += `<div class="roster-rank">${rankAbbr}</div>`;
            html += `<div class="roster-name">${dead.soldierName}</div>`;
            html += `<div class="roster-hp" style="color:#666">KIA</div>`;
            html += `</div>`;
        }
    }

    roster.innerHTML = html;

    // Click handlers
    roster.querySelectorAll('.roster-entry').forEach(entry => {
        entry.addEventListener('click', () => {
            const col = parseInt(entry.dataset.towerCol);
            const row = parseInt(entry.dataset.towerRow);
            const tower = gameState.towers.find(t => t.col === col && t.row === row);
            if (tower) {
                gameState.selectedTower = tower;
                gameState.selectedTowerType = null;
                document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
                updateTowerInfoPanel(tower);
                updateTowerRoster();
            }
        });
    });
}

function updateCPDisplay() {
    document.getElementById('cp-amount').textContent = gameState.commandPoints;
    // Update ability button states
    document.querySelectorAll('.ability-btn').forEach(btn => {
        const ability = btn.dataset.ability;
        const cost = ABILITY_COSTS[ability];
        if (gameState.commandPoints < cost) {
            btn.classList.add('disabled');
        } else {
            btn.classList.remove('disabled');
        }
    });
}

function updatePOWDisplay() {
    document.getElementById('pow-amount').textContent = gameState.totalPOWs;
}

function updateHPBar() {
    const pct = (gameState.baseHP / gameState.baseMaxHP) * 100;
    document.getElementById('base-hp-bar').style.width = pct + '%';
    document.getElementById('base-hp-text').textContent =
        `${Math.ceil(gameState.baseHP)} / ${gameState.baseMaxHP}`;
}

function isTowerUnlocked(type) {
    const def = TOWER_DEFS[type];
    return gameState.totalHPDestroyed >= def.unlockHP;
}

function updateTowerButtons() {
    document.querySelectorAll('.tower-btn').forEach(btn => {
        const type = btn.dataset.tower;
        if (!type) return;
        const def = TOWER_DEFS[type];

        if (!isTowerUnlocked(type)) {
            btn.classList.add('disabled');
            btn.classList.add('locked');
            // Show unlock requirement
            const costEl = btn.querySelector('.tower-btn-cost');
            const hpLabel = def.unlockHP >= 1000 ? `${Math.floor(def.unlockHP / 1000)}K` : def.unlockHP;
            if (costEl) costEl.textContent = `🔒 ${hpLabel} HP`;
        } else if (gameState.money < def.cost) {
            btn.classList.add('disabled');
            btn.classList.remove('locked');
            const costEl = btn.querySelector('.tower-btn-cost');
            if (costEl) costEl.textContent = `$${def.cost}`;
        } else {
            btn.classList.remove('disabled');
            btn.classList.remove('locked');
            const costEl = btn.querySelector('.tower-btn-cost');
            if (costEl) costEl.textContent = `$${def.cost}`;
        }
    });
}

function updateTowerInfoPanel(tower) {
    if (!tower) {
        document.getElementById('tower-info').classList.add('hidden');
        return;
    }

    const def = TOWER_DEFS[tower.type];
    const rank = getRank(tower);
    const nextRank = getNextRank(tower);

    const infoPanel = document.getElementById('tower-info');
    infoPanel.classList.remove('hidden');

    // Position panel near the tower on canvas (accounting for zoom/pan)
    const rect = canvas.getBoundingClientRect();
    const center = gridCenter(tower.col, tower.row);
    // Apply zoom/pan transform to get screen position
    const screenX = (center.x - canvas.width / 2 + panX) * zoomLevel + canvas.width / 2;
    const screenY = (center.y - canvas.height / 2 + panY) * zoomLevel + canvas.height / 2;
    // Convert canvas coords to CSS coords
    const cssX = rect.left + (screenX / canvas.width) * rect.width;
    const cssY = rect.top + (screenY / canvas.height) * rect.height;
    const panelWidth = 260;
    const panelHeight = infoPanel.offsetHeight || 350;
    // Try to place to the right of the tower, fall back to left if off-screen
    let left = cssX + 30;
    let top = cssY - panelHeight / 2;
    if (left + panelWidth > window.innerWidth) {
        left = cssX - panelWidth - 30;
    }
    // Clamp vertically
    top = Math.max(55, Math.min(window.innerHeight - panelHeight - 10, top));
    left = Math.max(5, left);
    infoPanel.style.left = left + 'px';
    infoPanel.style.top = top + 'px';
    infoPanel.style.right = 'auto';

    const fusionName = tower.fused ? FUSION_BONUSES[tower.type].name : def.name;
    document.getElementById('info-title').textContent = fusionName;
    document.getElementById('info-combined-title').textContent = getCombinedTitle(tower);

    // Rank progress
    document.getElementById('info-rank-label').textContent = `Rank: ${rank.name}`;
    if (nextRank) {
        const progress = ((tower.hpDestroyed - rank.hpReq) / (nextRank.hpReq - rank.hpReq)) * 100;
        document.getElementById('rank-bar').style.width = Math.min(100, progress) + '%';
        document.getElementById('rank-progress-text').textContent =
            `${Math.floor(tower.hpDestroyed)} / ${nextRank.hpReq} HP`;
    } else {
        document.getElementById('rank-bar').style.width = '100%';
        document.getElementById('rank-progress-text').textContent = 'MAX RANK';
    }

    // Hide division section
    const divSection = document.getElementById('info-division-section');
    if (divSection) divSection.style.display = 'none';

    // Stats
    document.getElementById('stat-damage').textContent = tower.type === 'slowdown' ? 'N/A' :
        getEffectiveDamage(tower).toFixed(1);
    document.getElementById('stat-firerate').textContent = tower.type === 'slowdown' ? 'Passive' :
        getEffectiveFireRate(tower).toFixed(2) + 's';
    document.getElementById('stat-range').textContent = Math.floor(getEffectiveRange(tower));
    document.getElementById('stat-kills').textContent = tower.kills;
    document.getElementById('stat-hpdestroyed').textContent = Math.floor(tower.hpDestroyed);

    // Tower HP
    const towerHPEl = document.getElementById('stat-towerhp');
    if (towerHPEl) {
        towerHPEl.textContent = `${Math.ceil(tower.hp)} / ${tower.maxHP}`;
        towerHPEl.style.color = tower.hp / tower.maxHP > 0.5 ? '#88ccff' : tower.hp / tower.maxHP > 0.25 ? '#ff9800' : '#f44336';
    }

    // Repair button (show only when damaged)
    // Target mode buttons highlight
    const currentMode = tower.targetMode || 'first';
    document.querySelectorAll('.target-btn').forEach(btn => { btn.classList.toggle('active', btn.dataset.mode === currentMode); });

    const repairBtn = document.getElementById('repair-tower-btn');
    if (tower.repairing) {
        repairBtn.classList.remove('hidden');
        const progress = Math.round((1 - tower.repairTimer / tower.repairDuration) * 100);
        document.getElementById('repair-cost').textContent = `Repairing... ${progress}%`;
        repairBtn.style.opacity = '0.5';
        repairBtn.style.cursor = 'not-allowed';
    } else if (tower.hp < tower.maxHP) {
        const missingHP = tower.maxHP - tower.hp;
        const repairCost = Math.ceil(missingHP * 0.4); // $0.50 per HP
        repairBtn.classList.remove('hidden');
        document.getElementById('repair-cost').textContent = repairCost;
        if (gameState.money < repairCost) {
            repairBtn.style.opacity = '0.5';
            repairBtn.style.cursor = 'not-allowed';
        } else {
            repairBtn.style.opacity = '1';
            repairBtn.style.cursor = 'pointer';
        }
    } else {
        repairBtn.classList.add('hidden');
    }

    // Sell
    const fusionBonus = tower.fused ? 1.5 : 1;
    document.getElementById('sell-amount').textContent = Math.floor(def.cost * SELL_REFUND * fusionBonus);

    // Fuse button
    const fuseBtn = document.getElementById('fuse-tower-btn');
    if (canFuse(tower)) {
        fuseBtn.classList.remove('hidden');
        const fuseCost = TOWER_DEFS[tower.type].cost;
        fuseBtn.textContent = `Fuse Adjacent Tower ($${fuseCost})`;
        fuseBtn.style.opacity = gameState.money >= fuseCost ? '1' : '0.5';
    } else if (tower.fused) {
        // Show ability button instead
        fuseBtn.classList.remove('hidden');
        const cd = tower.fusionAbilityCooldown;
        if (cd > 0) {
            fuseBtn.textContent = `Ability (${Math.ceil(cd)}s cooldown)`;
            fuseBtn.style.opacity = '0.5';
        } else {
            fuseBtn.textContent = `Use: ${FUSION_BONUSES[tower.type].ability}`;
            fuseBtn.style.opacity = '1';
        }
    } else {
        fuseBtn.classList.add('hidden');
    }
}

// ============================================================
// GAME LOOP
// ============================================================

function update(dt) {
    if (!gameState.running) return;

    updateWave(dt);
    updateTowers(dt);
    updateEnemies(dt);
    updateEnemyShooting(dt);
    updateEnemyArtillery(dt);
    updateAllies(dt);
    updateProjectiles(dt);
    updateParticles(dt);
    updateAirstrikes(dt);
    updateFusionAbilities(dt);
    updateRepairVehicle(dt);

    // Update info panel if a tower is selected
    if (gameState.selectedTower) {
        updateTowerInfoPanel(gameState.selectedTower);
    }

    updateTowerButtons();
    updateMoneyDisplay();
    updateCPDisplay();
    updateTowerRoster();
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background (drawn without transform)
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply zoom & pan transform
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-canvas.width / 2 + panX, -canvas.height / 2 + panY);

    drawMap();
    drawHoverPreview();
    drawTowers();
    drawFlamethrowerBeams();
    drawEnemies();
    drawAllies();
    drawProjectiles();
    drawEnemyProjectiles();
    drawRepairVehicle();
    drawAirstrikeEffects();
    drawParticles();

    ctx.restore();
}

const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
let lastLoopTime = Date.now();

function gameLoop() {
    const now = Date.now();
    const rawDt = Math.min((now - lastLoopTime) / 1000, 0.05);
    lastLoopTime = now;
    const dt = rawDt * gameSpeedMultiplier;

    update(dt);
    render();
}

// ============================================================
// SAVE / LOAD SYSTEM
// ============================================================
const SAVE_KEY = 'towerDefenseSave';

function saveGame() {
    if (gameState.waveActive) return false;
    const saveData = {
        version: 1, timestamp: Date.now(), selectedMapId,
        money: gameState.money, baseHP: gameState.baseHP, baseMaxHP: gameState.baseMaxHP,
        wave: gameState.wave, totalKills: gameState.totalKills, commandPoints: gameState.commandPoints,
        totalPOWs: gameState.totalPOWs, totalHPDestroyed: gameState.totalHPDestroyed,
        towers: gameState.towers.map(t => ({
            type: t.type, col: t.col, row: t.row, hp: t.hp, maxHP: t.maxHP,
            kills: t.kills, hpDestroyed: t.hpDestroyed, soldierName: t.soldierName,
            divisionLevel: t.divisionLevel, fused: t.fused, targetMode: t.targetMode,
            fusionAbilityCooldown: t.fusionAbilityCooldown, fusionAbilityMaxCD: t.fusionAbilityMaxCD
        })),
        deadTowers: gameState.deadTowers.map(d => ({ type: d.type, soldierName: d.soldierName, rank: d.rank, kills: d.kills, hpDestroyed: d.hpDestroyed, wave: d.wave })),
        grid: gameState.grid, blastTiles: gameState.blastTiles.map(b => ({ col: b.col, row: b.row })),
        destroyedTiles: Array.from(gameState.destroyedTiles.entries()).map(([key, info]) => ({ key, wave: info.wave, recovery: info.recovery })),
        landmines: gameState.landmines.map(m => ({ x: m.x, y: m.y, col: m.col, row: m.row, damage: m.damage, radius: m.radius }))
    };
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(saveData)); showSaveNotification(); updateContinueButton(); return true; }
    catch (e) { console.error('Failed to save:', e); return false; }
}

function loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    try {
        const data = JSON.parse(raw);
        // Update map if saved
        if (data.selectedMapId && MAP_DEFINITIONS[data.selectedMapId]) {
            selectedMapId = data.selectedMapId;
            PATH_CELLS = MAP_DEFINITIONS[selectedMapId].path.slice();
            pathSet.clear(); PATH_CELLS.forEach(p => pathSet.add(`${p.c},${p.r}`));
            pathWaypoints = PATH_CELLS.map(p => gridCenter(p.c, p.r)); shortcutWaypoints = null;
        }
        gameState.running = true; gameState.waveActive = false; gameState.enemies = []; gameState.projectiles = [];
        gameState.particles = []; gameState.selectedTowerType = null; gameState.selectedTower = null;
        gameState.hoverGrid = null; gameState.autoWaveTimer = 0; gameState.enemiesToSpawn = [];
        gameState.spawnTimer = 0; gameState.spawnInterval = 0.5; gameState.lastTime = performance.now();
        gameState.selectedAbility = null; gameState.airstrikeEffects = []; gameState.allies = [];
        gameState.fusionEffects = []; gameState.enemyProjectiles = []; gameState.repairVehicle = null; gameState.repairSelectMode = false;
        gameState.money = data.money; gameState.baseHP = data.baseHP; gameState.baseMaxHP = data.baseMaxHP;
        gameState.wave = data.wave; gameState.totalKills = data.totalKills; gameState.commandPoints = data.commandPoints;
        gameState.totalPOWs = data.totalPOWs; gameState.totalHPDestroyed = data.totalHPDestroyed;
        gameState.grid = data.grid;
        gameState.blastTiles = data.blastTiles || [];
        for (const b of gameState.blastTiles) pathSet.add(`${b.col},${b.row}`);
        gameState.destroyedTiles = new Map();
        if (data.destroyedTiles) for (const dt of data.destroyedTiles) gameState.destroyedTiles.set(dt.key, { wave: dt.wave, recovery: dt.recovery });
        gameState.towers = data.towers.map(t => ({
            col: t.col, row: t.row, type: t.type, soldierName: t.soldierName, fireCooldown: 0,
            kills: t.kills, hpDestroyed: t.hpDestroyed, divisionLevel: t.divisionLevel,
            target: null, targetEnemy: null, fused: t.fused, targetMode: t.targetMode || 'first',
            fusionAbilityCooldown: t.fusionAbilityCooldown, fusionAbilityMaxCD: t.fusionAbilityMaxCD,
            abilityActive: false, abilityTimer: 0, hp: t.hp, maxHP: t.maxHP
        }));
        gameState.deadTowers = data.deadTowers || [];
        gameState.landmines = data.landmines || [];
        recalcPathWaypoints();
        updateMoneyDisplay(); updateHPBar(); updateTowerButtons(); updateCPDisplay(); updatePOWDisplay();
        document.getElementById('wave-number').textContent = gameState.wave;
        document.getElementById('tower-info').classList.add('hidden');
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('map-select-screen').classList.add('hidden');
        document.getElementById('next-wave-btn').classList.remove('disabled');
        document.querySelectorAll('.ability-btn').forEach(b => b.classList.remove('selected'));
        updateWavePreview();
        stopMusic(); setTimeout(() => startMusic(), 300);
        return true;
    } catch (e) { console.error('Failed to load:', e); return false; }
}

function deleteSave() { localStorage.removeItem(SAVE_KEY); updateContinueButton(); }
function hasSaveData() { return localStorage.getItem(SAVE_KEY) !== null; }
function showSaveNotification(msg) {
    let n = document.getElementById('save-notification');
    if (!n) { n = document.createElement('div'); n.id = 'save-notification'; document.getElementById('game-container').appendChild(n); }
    n.textContent = msg || 'Game Saved'; n.classList.add('visible'); setTimeout(() => n.classList.remove('visible'), 1500);
}
function updateContinueButton() {
    const cb = document.getElementById('continue-btn'), db = document.getElementById('delete-save-btn');
    if (cb) cb.style.display = hasSaveData() ? 'inline-block' : 'none';
    if (db) db.style.display = hasSaveData() ? 'inline-block' : 'none';
}

function gameOver() {
    gameState.running = false;
    stopMusic();
    deleteSave();
    playSound('game_over');
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('final-wave').textContent = gameState.wave;
    document.getElementById('final-kills').textContent = gameState.totalKills;
}

function startGame() {
    setGameSpeed(1);
    gameState = {
        running: true,
        money: 3000,
        baseHP: BASE_MAX_HP,
        baseMaxHP: BASE_MAX_HP,
        wave: 0,
        waveActive: false,
        enemies: [],
        towers: [],
        projectiles: [],
        particles: [],
        selectedTowerType: null,
        selectedTower: null,
        hoverGrid: null,
        autoWaveTimer: 0,
        totalKills: 0,
        enemiesToSpawn: [],
        spawnTimer: 0,
        spawnInterval: 0.5,
        lastTime: performance.now(),
        grid: [],
        commandPoints: 0,
        selectedAbility: null,
        landmines: [],
        airstrikeEffects: [],
        allies: [],
        totalPOWs: 0,
        fusionEffects: [],
        totalHPDestroyed: 0,
        enemyProjectiles: [],
        blastTiles: [],
        destroyedTiles: new Map(),
        repairVehicle: null,
        repairSelectMode: false,
        deadTowers: []
    };
    // Reset pathSet to original BEFORE initGrid so blasted tiles are cleared
    pathSet.clear();
    PATH_CELLS.forEach(p => pathSet.add(`${p.c},${p.r}`));
    pathWaypoints = PATH_CELLS.map(p => gridCenter(p.c, p.r));
    shortcutWaypoints = null;
    initGrid();
    recalcPathWaypoints();
    updateMoneyDisplay();
    updateHPBar();
    updateTowerButtons();
    updateCPDisplay();
    updatePOWDisplay();
    document.getElementById('wave-number').textContent = '0';
    document.getElementById('tower-info').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('map-select-screen').classList.add('hidden');

    document.getElementById('next-wave-btn').classList.remove('disabled');

    // Reset ability selection UI
    document.querySelectorAll('.ability-btn').forEach(b => b.classList.remove('selected'));

    // Show preview for wave 1
    updateWavePreview();

    // Start background music
    stopMusic();
    setTimeout(() => startMusic(), 300);
}

// ============================================================
// INPUT HANDLING
// ============================================================

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    gameState.hoverGrid = screenToGrid(mx, my);
});

canvas.addEventListener('click', (e) => {
    if (!gameState.running) return;

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    const grid = screenToGrid(mx, my);

    // Commander ability targeting
    if (gameState.selectedAbility) {
        const ability = gameState.selectedAbility;
        if (ability === 'airstrike') {
            const p = gridCenter(grid.col, grid.row);
            useAirstrike(p.x, p.y);
        } else if (ability === 'landmine') {
            useLandmine(grid.col, grid.row);
        }
        gameState.selectedAbility = null;
        document.querySelectorAll('.ability-btn').forEach(b => b.classList.remove('selected'));
        return;
    }

    // Repair road selection mode
    if (gameState.repairSelectMode) {
        const clickedBlast = gameState.blastTiles.find(b => b.col === grid.col && b.row === grid.row);
        if (clickedBlast) {
            dispatchRepairVehicle(clickedBlast);
        }
        return;
    }

    if (grid.col < 0 || grid.col >= GRID_COLS || grid.row < 0 || grid.row >= GRID_ROWS) {
        // Clicked outside grid - deselect
        gameState.selectedTower = null;
        gameState.selectedTowerType = null;
        document.getElementById('tower-info').classList.add('hidden');
        document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
        return;
    }

    // If placing a tower
    if (gameState.selectedTowerType) {
        if (placeTower(grid.col, grid.row, gameState.selectedTowerType)) {
            // Keep the tower type selected for rapid placement
        }
        return;
    }

    // Check if clicking on an existing tower (toggle if same tower)
    const clickedTower = gameState.towers.find(t => t.col === grid.col && t.row === grid.row);
    if (clickedTower) {
        if (gameState.selectedTower === clickedTower) {
            // Clicking same tower - deselect
            gameState.selectedTower = null;
            document.getElementById('tower-info').classList.add('hidden');
        } else {
            gameState.selectedTower = clickedTower;
            updateTowerInfoPanel(clickedTower);
        }
    } else {
        // Clicking empty tile or grass - close menu
        gameState.selectedTower = null;
        document.getElementById('tower-info').classList.add('hidden');
    }
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    gameState.selectedTowerType = null;
    gameState.selectedTower = null;
    gameState.selectedAbility = null;
    gameState.repairSelectMode = false;
    document.getElementById('tower-info').classList.add('hidden');
    document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.ability-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('repair-roads-btn').classList.remove('selected');
});

// ---- Zoom with mouse wheel ----
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const oldZoom = zoomLevel;
    if (e.deltaY < 0) {
        zoomLevel = Math.min(ZOOM_MAX, zoomLevel + ZOOM_STEP);
    } else {
        zoomLevel = Math.max(ZOOM_MIN, zoomLevel - ZOOM_STEP);
    }
    // Zoom toward mouse cursor position
    if (zoomLevel !== oldZoom) {
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);
        // World point under cursor before zoom
        const wx = (mx - canvas.width / 2) / oldZoom + canvas.width / 2 - panX;
        const wy = (my - canvas.height / 2) / oldZoom + canvas.height / 2 - panY;
        // Adjust pan so same world point stays under cursor after zoom
        panX = canvas.width / 2 - wx + (mx - canvas.width / 2) / zoomLevel;
        panY = canvas.height / 2 - wy + (my - canvas.height / 2) / zoomLevel;
    }
}, { passive: false });

// ---- Pan with middle mouse button ----
canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1) { // middle click
        e.preventDefault();
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
    }
});

window.addEventListener('mousemove', (e) => {
    if (isPanning) {
        panX += (e.clientX - panStartX) / zoomLevel;
        panY += (e.clientY - panStartY) / zoomLevel;
        panStartX = e.clientX;
        panStartY = e.clientY;
    }
});

window.addEventListener('mouseup', (e) => {
    if (e.button === 1) {
        isPanning = false;
    }
});

// Reset zoom/pan with double-click middle button or Home key
window.addEventListener('keydown', (e) => {
    if (e.key === 'Home') {
        zoomLevel = 1.0;
        panX = 0;
        panY = 0;
    }
});


// Tower selection buttons
document.querySelectorAll('.tower-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.dataset.tower;
        if (!type) return;
        if (btn.classList.contains('disabled')) return;

        // Clear ability selection
        gameState.selectedAbility = null;
        document.querySelectorAll('.ability-btn').forEach(b => b.classList.remove('selected'));

        if (gameState.selectedTowerType === type) {
            gameState.selectedTowerType = null;
            btn.classList.remove('selected');
        } else {
            gameState.selectedTowerType = type;
            gameState.selectedTower = null;
            document.getElementById('tower-info').classList.add('hidden');
            document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        }
    });
});

// Commander Ability buttons
document.querySelectorAll('.ability-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!gameState.running) return;
        const ability = btn.dataset.ability;
        const cost = ABILITY_COSTS[ability];

        if (gameState.commandPoints < cost) return;

        // Supply drop is instant (no targeting)
        if (ability === 'supply') {
            useSupplyDrop();
            return;
        }

        // Clear tower selection
        gameState.selectedTowerType = null;
        document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));

        // Toggle ability selection
        if (gameState.selectedAbility === ability) {
            gameState.selectedAbility = null;
            btn.classList.remove('selected');
        } else {
            gameState.selectedAbility = ability;
            document.querySelectorAll('.ability-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        }
    });
});

// Next wave button - ALWAYS active during gameplay
document.getElementById('next-wave-btn').addEventListener('click', () => {
    if (!gameState.running) return;
    startWave();
});

// Tower info panel buttons
document.getElementById('info-close').addEventListener('click', () => {
    gameState.selectedTower = null;
    document.getElementById('tower-info').classList.add('hidden');
});

document.getElementById('repair-tower-btn').addEventListener('click', () => {
    if (!gameState.selectedTower) return;
    const tower = gameState.selectedTower;
    if (tower.hp >= tower.maxHP) return;
    if (tower.repairing) return; // Already repairing
    const missingHP = tower.maxHP - tower.hp;
    const repairCost = Math.ceil(missingHP * 0.4);
    if (gameState.money < repairCost) return;

    gameState.money -= repairCost;
    // Start timed repair: 1s per 20 HP missing, min 1s, max 5s
    const repairTime = Math.max(1, Math.min(5, missingHP / 20));
    tower.repairing = true;
    tower.repairTimer = repairTime;
    tower.repairDuration = repairTime;
    tower.repairTargetHP = tower.maxHP;
    tower.repairStartHP = tower.hp;
    updateMoneyDisplay();
    updateTowerInfoPanel(tower);
});

document.getElementById('sell-tower-btn').addEventListener('click', () => {
    if (gameState.selectedTower) {
        sellTower(gameState.selectedTower);
    }
});

// Fuse / Ability button
document.getElementById('fuse-tower-btn').addEventListener('click', () => {
    if (!gameState.selectedTower) return;
    const tower = gameState.selectedTower;

    if (tower.fused) {
        // Use ability
        activateFusionAbility(tower);
    } else if (canFuse(tower)) {
        const fuseCost = TOWER_DEFS[tower.type].cost;
        if (gameState.money < fuseCost) return;
        gameState.money -= fuseCost;
        updateMoneyDisplay();
        fuseTowers(tower);
    }
    updateTowerInfoPanel(tower);
});

// Repair Roads button - enters selection mode to pick a blasted tile
document.getElementById('repair-roads-btn').addEventListener('click', () => {
    if (gameState.blastTiles.length === 0) return;
    if (gameState.money < 500) return;
    if (gameState.repairVehicle) return;

    // Toggle repair selection mode
    if (gameState.repairSelectMode) {
        gameState.repairSelectMode = false;
        document.getElementById('repair-roads-btn').classList.remove('selected');
    } else {
        gameState.repairSelectMode = true;
        // Clear other selections
        gameState.selectedTowerType = null;
        gameState.selectedTower = null;
        gameState.selectedAbility = null;
        document.getElementById('tower-info').classList.add('hidden');
        document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
        document.querySelectorAll('.ability-btn').forEach(b => b.classList.remove('selected'));
        document.getElementById('repair-roads-btn').classList.add('selected');
    }
});

// Dispatch repair vehicle to a specific blasted tile
function dispatchRepairVehicle(tile) {
    gameState.money -= 500;
    const basePt = PATH_CELLS[PATH_CELLS.length - 1];
    const basePos = gridCenter(basePt.c, basePt.r);
    const targetPos = gridCenter(tile.col, tile.row);

    gameState.repairVehicle = {
        x: basePos.x,
        y: basePos.y,
        targetX: targetPos.x,
        targetY: targetPos.y,
        baseX: basePos.x,
        baseY: basePos.y,
        targetTile: tile,
        phase: 'going',
        repairTimer: 0,
        speed: 80
    };

    gameState.repairSelectMode = false;
    document.getElementById('repair-roads-btn').classList.remove('selected');
    updateMoneyDisplay();
    playSound('place');
}

// Update repair vehicle
function updateRepairVehicle(dt) {
    const rv = gameState.repairVehicle;
    if (!rv) return;

    if (rv.phase === 'going') {
        const dx = rv.targetX - rv.x;
        const dy = rv.targetY - rv.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 3) {
            rv.phase = 'repairing';
            rv.repairTimer = 1.5; // 1.5s to repair
        } else {
            rv.x += (dx / dist) * rv.speed * dt;
            rv.y += (dy / dist) * rv.speed * dt;
        }
    } else if (rv.phase === 'repairing') {
        rv.repairTimer -= dt;
        // Spark particles while repairing
        if (Math.random() < 0.3) {
            gameState.particles.push({
                x: rv.x + (Math.random() - 0.5) * 15,
                y: rv.y + (Math.random() - 0.5) * 8,
                vx: (Math.random() - 0.5) * 30,
                vy: -15 - Math.random() * 20,
                life: 0.3, maxLife: 0.3,
                color: Math.random() < 0.5 ? '#ff9800' : '#ffeb3b', size: 2
            });
        }
        if (rv.repairTimer <= 0) {
            // Demolish the blasted tile - block it off
            const tile = rv.targetTile;
            gameState.blastTiles = gameState.blastTiles.filter(b => b !== tile);
            pathSet.delete(`${tile.col},${tile.row}`);
            if (gameState.grid[tile.col]) {
                gameState.grid[tile.col][tile.row] = 0;
            }
            // Demolish particles (dust/debris)
            for (let i = 0; i < 12; i++) {
                gameState.particles.push({
                    x: rv.x + (Math.random() - 0.5) * 20,
                    y: rv.y + (Math.random() - 0.5) * 10,
                    vx: (Math.random() - 0.5) * 50,
                    vy: -25 - Math.random() * 30,
                    life: 0.6, maxLife: 0.6,
                    color: ['#8d6e63', '#a1887f', '#6d4c41', '#ff6600'][Math.floor(Math.random() * 4)], size: 3
                });
            }
            playSound('explosion');

            // Force ALL enemies on shortcut back to original path
            for (const enemy of gameState.enemies) {
                if (enemy.path !== pathWaypoints) {
                    enemy.path = pathWaypoints;
                    // Find closest waypoint on original path
                    let closestIdx = 0;
                    let closestDist = Infinity;
                    for (let i = 0; i < pathWaypoints.length; i++) {
                        const d = Math.hypot(enemy.x - pathWaypoints[i].x, enemy.y - pathWaypoints[i].y);
                        if (d < closestDist) { closestDist = d; closestIdx = i; }
                    }
                    enemy.waypointIdx = closestIdx;
                }
            }

            // Rebuild shortcut path or clear it
            if (gameState.blastTiles.length === 0) {
                shortcutWaypoints = null;
            } else {
                rebuildPathWithBlasts();
            }
            rv.phase = 'returning';
        }
    } else if (rv.phase === 'returning') {
        const dx = rv.baseX - rv.x;
        const dy = rv.baseY - rv.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 3) {
            gameState.repairVehicle = null; // Done
        } else {
            rv.x += (dx / dist) * rv.speed * dt;
            rv.y += (dy / dist) * rv.speed * dt;
        }
    }
}

// Draw repair vehicle
function drawRepairVehicle() {
    const rv = gameState.repairVehicle;
    if (!rv) return;

    const x = rv.x, y = rv.y;

    // Vehicle body (orange construction truck)
    ctx.fillStyle = '#ff8f00';
    ctx.fillRect(x - 8, y - 6, 16, 8);
    // Cab
    ctx.fillStyle = '#ffa726';
    ctx.fillRect(x - 10, y - 4, 4, 6);
    // Wheels
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(x - 5, y + 3, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 5, y + 3, 2.5, 0, Math.PI * 2); ctx.fill();
    // Crane/arm on top
    ctx.strokeStyle = '#e65100';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 2, y - 6);
    ctx.lineTo(x + 2, y - 12);
    ctx.lineTo(x + 8, y - 10);
    ctx.stroke();
    // Flashing light
    if (Math.floor(Date.now() / 300) % 2 === 0) {
        ctx.fillStyle = '#ff0';
        ctx.beginPath(); ctx.arc(x, y - 8, 2, 0, Math.PI * 2); ctx.fill();
    }
}

// ============================================================
// START SCREEN - Heroic Battlefield Canvas
// ============================================================
(function drawStartScreen() {
    const sc = document.getElementById('startCanvas');
    if (!sc) return;
    const sctx = sc.getContext('2d');
    sc.width = window.innerWidth;
    sc.height = window.innerHeight;
    const W = sc.width, H = sc.height;

    // Sky gradient - dramatic fiery sunset
    const skyGrad = sctx.createLinearGradient(0, 0, 0, H * 0.55);
    skyGrad.addColorStop(0, '#0c0c2a');
    skyGrad.addColorStop(0.25, '#1e0e3a');
    skyGrad.addColorStop(0.45, '#4a1525');
    skyGrad.addColorStop(0.65, '#8b3020');
    skyGrad.addColorStop(0.85, '#d46010');
    skyGrad.addColorStop(1, '#ff8800');
    sctx.fillStyle = skyGrad;
    sctx.fillRect(0, 0, W, H * 0.55);

    // Distant mountains - silhouette against bright sky
    sctx.fillStyle = '#2a1828';
    sctx.beginPath();
    sctx.moveTo(0, H * 0.45);
    for (let x = 0; x <= W; x += 3) {
        const y = H * 0.45 - Math.sin(x * 0.003) * 40 - Math.sin(x * 0.007 + 1) * 25 - Math.sin(x * 0.015 + 2) * 12;
        sctx.lineTo(x, y);
    }
    sctx.lineTo(W, H * 0.55);
    sctx.lineTo(0, H * 0.55);
    sctx.fill();

    // Horizon glow - intense fire on horizon
    const horizonGlow = sctx.createRadialGradient(W * 0.5, H * 0.52, 0, W * 0.5, H * 0.52, W * 0.55);
    horizonGlow.addColorStop(0, 'rgba(255, 130, 20, 0.5)');
    horizonGlow.addColorStop(0.5, 'rgba(255, 80, 0, 0.2)');
    horizonGlow.addColorStop(1, 'rgba(255, 50, 0, 0)');
    sctx.fillStyle = horizonGlow;
    sctx.fillRect(0, H * 0.35, W, H * 0.25);

    // Ground - battlefield lit by fires
    const groundGrad = sctx.createLinearGradient(0, H * 0.55, 0, H);
    groundGrad.addColorStop(0, '#3a3018');
    groundGrad.addColorStop(0.3, '#2a2210');
    groundGrad.addColorStop(1, '#12100a');
    sctx.fillStyle = groundGrad;
    sctx.fillRect(0, H * 0.55, W, H * 0.45);

    // Ground texture - dirt patches
    for (let i = 0; i < 60; i++) {
        const gx = Math.random() * W;
        const gy = H * 0.58 + Math.random() * H * 0.4;
        const gr = 5 + Math.random() * 20;
        sctx.fillStyle = `rgba(${30 + Math.random()*20}, ${25 + Math.random()*15}, ${10 + Math.random()*10}, ${0.2 + Math.random()*0.3})`;
        sctx.beginPath();
        sctx.ellipse(gx, gy, gr, gr * 0.4, Math.random() * Math.PI, 0, Math.PI * 2);
        sctx.fill();
    }

    // Trenches / lines in ground
    for (let i = 0; i < 5; i++) {
        const ty = H * 0.65 + i * H * 0.06;
        sctx.strokeStyle = `rgba(15, 12, 5, ${0.4 + i * 0.1})`;
        sctx.lineWidth = 2;
        sctx.beginPath();
        sctx.moveTo(0, ty);
        for (let x = 0; x <= W; x += 5) {
            sctx.lineTo(x, ty + Math.sin(x * 0.01 + i) * 3);
        }
        sctx.stroke();
    }

    // Helper: draw isometric tank
    function drawTank(x, y, scale, facing, color) {
        sctx.save();
        sctx.translate(x, y);
        const s = scale;
        const dx = facing, dy = facing * 0.5;
        const px = -dy, py = dx * 0.5;

        // Shadow
        sctx.fillStyle = 'rgba(0,0,0,0.3)';
        sctx.beginPath();
        sctx.ellipse(0, 4 * s, 20 * s, 8 * s, 0, 0, Math.PI * 2);
        sctx.fill();

        // Tracks
        sctx.fillStyle = '#1a1a1a';
        sctx.beginPath();
        sctx.moveTo((-18*dx - 8*px)*s, (-18*dy - 8*py)*s);
        sctx.lineTo((18*dx - 8*px)*s, (18*dy - 8*py)*s);
        sctx.lineTo((18*dx - 4*px)*s, (18*dy - 4*py)*s);
        sctx.lineTo((-18*dx - 4*px)*s, (-18*dy - 4*py)*s);
        sctx.fill();
        sctx.beginPath();
        sctx.moveTo((-18*dx + 8*px)*s, (-18*dy + 8*py)*s);
        sctx.lineTo((18*dx + 8*px)*s, (18*dy + 8*py)*s);
        sctx.lineTo((18*dx + 4*px)*s, (18*dy + 4*py)*s);
        sctx.lineTo((-18*dx + 4*px)*s, (-18*dy + 4*py)*s);
        sctx.fill();

        // Hull
        const hullColor = color || '#3a5a30';
        sctx.fillStyle = hullColor;
        sctx.beginPath();
        sctx.moveTo((-14*dx - 6*px)*s, (-14*dy - 6*py - 6)*s);
        sctx.lineTo((14*dx - 6*px)*s, (14*dy - 6*py - 6)*s);
        sctx.lineTo((14*dx + 6*px)*s, (14*dy + 6*py - 6)*s);
        sctx.lineTo((-14*dx + 6*px)*s, (-14*dy + 6*py - 6)*s);
        sctx.fill();

        // Hull top highlight
        sctx.fillStyle = 'rgba(255,255,255,0.08)';
        sctx.fill();

        // Turret
        sctx.fillStyle = '#2a4a22';
        sctx.beginPath();
        sctx.ellipse(0, -8 * s, 7 * s, 5 * s, 0, 0, Math.PI * 2);
        sctx.fill();

        // Gun barrel
        sctx.strokeStyle = '#1a1a1a';
        sctx.lineWidth = 3 * s;
        sctx.beginPath();
        sctx.moveTo(0, -8 * s);
        sctx.lineTo(dx * 22 * s, (dy * 22 - 8) * s);
        sctx.stroke();

        // Muzzle brake
        sctx.strokeStyle = '#2a2a2a';
        sctx.lineWidth = 4 * s;
        sctx.beginPath();
        sctx.moveTo(dx * 20 * s, (dy * 20 - 8) * s);
        sctx.lineTo(dx * 24 * s, (dy * 24 - 8) * s);
        sctx.stroke();

        sctx.restore();
    }

    // Helper: draw soldier silhouette
    function drawSoldier(x, y, scale, facing, variant) {
        sctx.save();
        sctx.translate(x, y);
        const s = scale;

        // Shadow
        sctx.fillStyle = 'rgba(0,0,0,0.25)';
        sctx.beginPath();
        sctx.ellipse(0, 2 * s, 5 * s, 2 * s, 0, 0, Math.PI * 2);
        sctx.fill();

        // Legs
        sctx.strokeStyle = '#1a2a1a';
        sctx.lineWidth = 2 * s;
        const legOff = variant === 1 ? 2 : -1;
        sctx.beginPath();
        sctx.moveTo(-1 * s, -2 * s);
        sctx.lineTo((-2 + legOff * facing) * s, 2 * s);
        sctx.stroke();
        sctx.beginPath();
        sctx.moveTo(1 * s, -2 * s);
        sctx.lineTo((2 - legOff * facing) * s, 2 * s);
        sctx.stroke();

        // Body
        sctx.fillStyle = '#3a5a2a';
        sctx.fillRect(-3 * s, -8 * s, 6 * s, 7 * s);

        // Head / helmet
        sctx.fillStyle = '#4a6a38';
        sctx.beginPath();
        sctx.arc(0, -10 * s, 3 * s, 0, Math.PI * 2);
        sctx.fill();
        sctx.fillStyle = '#3a5a2a';
        sctx.fillRect(-3.5 * s, -11 * s, 7 * s, 2 * s);

        // Rifle
        sctx.strokeStyle = '#1a1a1a';
        sctx.lineWidth = 1.5 * s;
        sctx.beginPath();
        sctx.moveTo(facing * 2 * s, -6 * s);
        sctx.lineTo(facing * 10 * s, -4 * s);
        sctx.stroke();

        sctx.restore();
    }

    // Helper: draw artillery piece
    function drawArtillery(x, y, scale, facing) {
        sctx.save();
        sctx.translate(x, y);
        const s = scale;

        // Shadow
        sctx.fillStyle = 'rgba(0,0,0,0.3)';
        sctx.beginPath();
        sctx.ellipse(0, 3 * s, 18 * s, 6 * s, 0, 0, Math.PI * 2);
        sctx.fill();

        // Wheels
        sctx.fillStyle = '#1a1a1a';
        sctx.beginPath(); sctx.arc(-8 * s, 0, 4 * s, 0, Math.PI * 2); sctx.fill();
        sctx.beginPath(); sctx.arc(8 * s, 0, 4 * s, 0, Math.PI * 2); sctx.fill();

        // Trail (ground support)
        sctx.strokeStyle = '#2a2a1a';
        sctx.lineWidth = 3 * s;
        sctx.beginPath();
        sctx.moveTo(-facing * 18 * s, 2 * s);
        sctx.lineTo(0, -2 * s);
        sctx.stroke();

        // Gun shield
        sctx.fillStyle = '#3a4a2a';
        sctx.fillRect(-5 * s, -10 * s, 10 * s, 8 * s);

        // Barrel
        sctx.strokeStyle = '#2a2a1a';
        sctx.lineWidth = 4 * s;
        sctx.beginPath();
        sctx.moveTo(0, -8 * s);
        sctx.lineTo(facing * 26 * s, -14 * s);
        sctx.stroke();

        // Muzzle brake
        sctx.strokeStyle = '#3a3a2a';
        sctx.lineWidth = 6 * s;
        sctx.beginPath();
        sctx.moveTo(facing * 24 * s, -13.5 * s);
        sctx.lineTo(facing * 28 * s, -15 * s);
        sctx.stroke();

        sctx.restore();
    }

    // Helper: draw explosion
    function drawExplosion(x, y, scale) {
        sctx.save();
        sctx.translate(x, y);
        const s = scale;

        // Outer glow
        const grad = sctx.createRadialGradient(0, 0, 0, 0, 0, 35 * s);
        grad.addColorStop(0, 'rgba(255, 230, 80, 0.9)');
        grad.addColorStop(0.3, 'rgba(255, 150, 20, 0.6)');
        grad.addColorStop(0.6, 'rgba(255, 70, 0, 0.3)');
        grad.addColorStop(1, 'rgba(150, 30, 0, 0)');
        sctx.fillStyle = grad;
        sctx.beginPath();
        sctx.arc(0, 0, 30 * s, 0, Math.PI * 2);
        sctx.fill();

        // Core
        sctx.fillStyle = 'rgba(255, 255, 200, 0.8)';
        sctx.beginPath();
        sctx.arc(0, -2 * s, 6 * s, 0, Math.PI * 2);
        sctx.fill();

        // Sparks
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + 0.3;
            const r = 10 + Math.random() * 15;
            sctx.fillStyle = `rgba(255, ${150 + Math.random()*100|0}, 0, ${0.5 + Math.random()*0.4})`;
            sctx.beginPath();
            sctx.arc(Math.cos(angle) * r * s, Math.sin(angle) * r * s - 2 * s, (1 + Math.random() * 2) * s, 0, Math.PI * 2);
            sctx.fill();
        }

        sctx.restore();
    }

    // Helper: smoke column
    function drawSmoke(x, y, scale) {
        for (let i = 0; i < 6; i++) {
            const sy = y - i * 12 * scale;
            const r = (4 + i * 3) * scale;
            const alpha = 0.15 - i * 0.02;
            sctx.fillStyle = `rgba(40, 40, 40, ${Math.max(0, alpha)})`;
            sctx.beginPath();
            sctx.arc(x + Math.sin(i * 1.2) * 4 * scale, sy, r, 0, Math.PI * 2);
            sctx.fill();
        }
    }

    // Helper: barbed wire
    function drawBarbedWire(x, y, len) {
        sctx.strokeStyle = 'rgba(60, 60, 50, 0.5)';
        sctx.lineWidth = 1;
        sctx.beginPath();
        for (let i = 0; i <= len; i += 4) {
            const wy = y + Math.sin(i * 0.8) * 3;
            sctx.lineTo(x + i, wy);
        }
        sctx.stroke();
        // Barbs
        for (let i = 0; i < len; i += 8) {
            sctx.strokeStyle = 'rgba(80, 80, 60, 0.4)';
            sctx.beginPath();
            sctx.moveTo(x + i, y + Math.sin(i * 0.8) * 3);
            sctx.lineTo(x + i + 2, y + Math.sin(i * 0.8) * 3 - 4);
            sctx.stroke();
        }
    }

    // ---- SCENE COMPOSITION ----

    // Barbed wire in foreground
    drawBarbedWire(W * 0.05, H * 0.72, W * 0.25);
    drawBarbedWire(W * 0.65, H * 0.78, W * 0.3);

    // Far background tanks (small, silhouette against fire)
    drawTank(W * 0.15, H * 0.56, 0.5, 1, '#2a3828');
    drawTank(W * 0.35, H * 0.54, 0.45, 1, '#283220');
    drawTank(W * 0.82, H * 0.55, 0.48, -1, '#2a2820');

    // Mid-ground explosions and smoke
    drawExplosion(W * 0.45, H * 0.52, 1.2);
    drawExplosion(W * 0.72, H * 0.48, 0.8);
    drawSmoke(W * 0.48, H * 0.50, 1.0);
    drawSmoke(W * 0.25, H * 0.53, 0.7);
    drawSmoke(W * 0.78, H * 0.52, 0.8);

    // Mid-ground soldiers advancing (left side)
    drawSoldier(W * 0.08, H * 0.62, 1.2, 1, 0);
    drawSoldier(W * 0.12, H * 0.64, 1.3, 1, 1);
    drawSoldier(W * 0.16, H * 0.63, 1.1, 1, 0);
    drawSoldier(W * 0.20, H * 0.65, 1.25, 1, 1);
    drawSoldier(W * 0.06, H * 0.66, 1.15, 1, 0);

    // Mid-ground soldiers (right side, facing left - enemy)
    drawSoldier(W * 0.85, H * 0.61, 1.1, -1, 0);
    drawSoldier(W * 0.88, H * 0.63, 1.2, -1, 1);
    drawSoldier(W * 0.92, H * 0.62, 1.15, -1, 0);

    // Main tanks (prominent, foreground)
    drawTank(W * 0.28, H * 0.70, 1.6, 1, '#4a6a38');
    drawTank(W * 0.62, H * 0.72, 1.7, -1, '#5a4a32');

    // Muzzle flash on right tank
    sctx.save();
    const mfx = W * 0.62 - 24 * 1.5, mfy = H * 0.72 - 8 * 1.5;
    const mfGrad = sctx.createRadialGradient(mfx, mfy, 0, mfx, mfy, 18);
    mfGrad.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
    mfGrad.addColorStop(0.5, 'rgba(255, 150, 0, 0.4)');
    mfGrad.addColorStop(1, 'rgba(255, 100, 0, 0)');
    sctx.fillStyle = mfGrad;
    sctx.beginPath();
    sctx.arc(mfx, mfy, 18, 0, Math.PI * 2);
    sctx.fill();
    sctx.restore();

    // Artillery pieces
    drawArtillery(W * 0.10, H * 0.76, 1.3, 1);
    drawArtillery(W * 0.88, H * 0.80, 1.2, -1);

    // Foreground soldiers (larger, silhouette feel)
    drawSoldier(W * 0.30, H * 0.78, 1.8, 1, 0);
    drawSoldier(W * 0.35, H * 0.80, 2.0, 1, 1);
    drawSoldier(W * 0.70, H * 0.79, 1.9, -1, 0);

    // Foreground explosion - big and bright
    drawExplosion(W * 0.50, H * 0.68, 2.2);
    drawSmoke(W * 0.52, H * 0.65, 1.6);
    drawExplosion(W * 0.38, H * 0.60, 1.3);

    // Sandbag bunker (left foreground)
    sctx.fillStyle = '#3a3520';
    for (let i = 0; i < 4; i++) {
        sctx.beginPath();
        sctx.ellipse(W * 0.04 + i * 12, H * 0.85, 8, 5, 0, 0, Math.PI * 2);
        sctx.fill();
    }
    for (let i = 0; i < 3; i++) {
        sctx.beginPath();
        sctx.ellipse(W * 0.046 + i * 12, H * 0.85 - 8, 8, 5, 0, 0, Math.PI * 2);
        sctx.fill();
    }

    // Distant fire/burning - larger and brighter
    for (let i = 0; i < 5; i++) {
        const fx = W * (0.15 + i * 0.17);
        const fy = H * 0.53;
        const frad = 12 + Math.random() * 8;
        const fgrad = sctx.createRadialGradient(fx, fy, 0, fx, fy, frad);
        fgrad.addColorStop(0, 'rgba(255, 200, 50, 0.7)');
        fgrad.addColorStop(0.5, 'rgba(255, 100, 0, 0.3)');
        fgrad.addColorStop(1, 'rgba(255, 60, 0, 0)');
        sctx.fillStyle = fgrad;
        sctx.beginPath();
        sctx.arc(fx, fy, frad, 0, Math.PI * 2);
        sctx.fill();
    }

    // Stars in dark sky
    for (let i = 0; i < 40; i++) {
        const sx = Math.random() * W;
        const sy = Math.random() * H * 0.3;
        const sr = 0.5 + Math.random() * 1;
        sctx.fillStyle = `rgba(255, 255, 255, ${0.2 + Math.random() * 0.5})`;
        sctx.beginPath();
        sctx.arc(sx, sy, sr, 0, Math.PI * 2);
        sctx.fill();
    }

    // Fog of war overlay at bottom
    const fogGrad = sctx.createLinearGradient(0, H * 0.85, 0, H);
    fogGrad.addColorStop(0, 'rgba(10, 10, 15, 0)');
    fogGrad.addColorStop(1, 'rgba(10, 10, 15, 0.8)');
    sctx.fillStyle = fogGrad;
    sctx.fillRect(0, H * 0.85, W, H * 0.15);

    // Atmospheric haze
    const hazeGrad = sctx.createLinearGradient(0, H * 0.5, 0, H * 0.6);
    hazeGrad.addColorStop(0, 'rgba(80, 40, 10, 0.12)');
    hazeGrad.addColorStop(1, 'rgba(80, 40, 10, 0)');
    sctx.fillStyle = hazeGrad;
    sctx.fillRect(0, H * 0.5, W, H * 0.1);

    // Vignette overlay - subtle
    const vignette = sctx.createRadialGradient(W/2, H/2, W * 0.3, W/2, H/2, W * 0.75);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
    sctx.fillStyle = vignette;
    sctx.fillRect(0, 0, W, H);

    // Handle resize
    window.addEventListener('resize', () => {
        const ss = document.getElementById('start-screen');
        if (ss && !ss.classList.contains('hidden')) {
            drawStartScreen();
        }
    });
})();

// ============================================================
// TUTORIAL SYSTEM
// ============================================================
const tutorialSteps = [
    { text: "Place towers on <span style='color:#4caf50;font-weight:bold'>green tiles</span> to defend your base. Select a tower type from the panel below.", target: '#tower-panel', arrowDir: 'down' },
    { text: "Click a <span style='color:#ffd700;font-weight:bold'>tower type</span>, then click on a green tile on the map to place it.", target: '#gameCanvas', arrowDir: 'up' },
    { text: "Enemies follow the road from <span style='color:#ff4444;font-weight:bold'>SPAWN</span> to your <span style='color:#4caf50;font-weight:bold'>BASE</span>. Don't let them through!", target: '#gameCanvas', arrowDir: 'up' },
    { text: "Towers <span style='color:#ffd700;font-weight:bold'>rank up</span> by destroying enemies. Higher ranks deal more damage and gain bonus HP.", target: '#tower-panel', arrowDir: 'down' },
    { text: "Use <span style='color:#ff9800;font-weight:bold'>Commander Abilities</span> in the top bar &mdash; Airstrike, Landmine, Supply Drop, and Demolish road tiles.", target: '#ability-bar', arrowDir: 'up' },
    { text: "<span style='color:#ffd700;font-weight:bold'>Fuse</span> two adjacent same-type towers to create powerful combined units with bonus stats!", target: '#tower-panel', arrowDir: 'down' },
    { text: "Press <span style='color:#4caf50;font-weight:bold'>SEND WAVE</span> when you're ready for battle! Good luck, Commander.", target: '#next-wave-btn', arrowDir: 'down' }
];
let tutorialActive = false, tutorialStep = 0;
function shouldShowTutorial() { return !localStorage.getItem('td_tutorial_done'); }
function startTutorial() { if (!shouldShowTutorial()) return; tutorialActive = true; tutorialStep = 0; document.getElementById('tutorial-overlay').classList.remove('hidden'); showTutorialStep(); }
function endTutorial() { tutorialActive = false; localStorage.setItem('td_tutorial_done', '1'); document.getElementById('tutorial-overlay').classList.add('hidden'); }
function showTutorialStep() {
    const step = tutorialSteps[tutorialStep];
    const highlight = document.getElementById('tutorial-highlight'), popup = document.getElementById('tutorial-popup'), arrow = document.getElementById('tutorial-arrow');
    document.getElementById('tutorial-step-indicator').textContent = `STEP ${tutorialStep + 1} OF ${tutorialSteps.length}`;
    document.getElementById('tutorial-text').innerHTML = step.text;
    document.getElementById('tutorial-next-btn').textContent = tutorialStep === tutorialSteps.length - 1 ? 'FINISH' : 'NEXT';
    const targetEl = document.querySelector(step.target); if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect(), pad = 6;
    highlight.style.left = (rect.left - pad) + 'px'; highlight.style.top = (rect.top - pad) + 'px';
    highlight.style.width = (rect.width + pad * 2) + 'px'; highlight.style.height = (rect.height + pad * 2) + 'px';
    arrow.className = '';
    const popupWidth = 340;
    if (step.arrowDir === 'down') {
        popup.style.left = Math.max(10, Math.min(rect.left + rect.width / 2 - popupWidth / 2, window.innerWidth - popupWidth - 10)) + 'px';
        popup.style.top = Math.max(10, rect.top - 210) + 'px'; popup.style.bottom = 'auto'; popup.style.right = 'auto';
        arrow.classList.add('arrow-down'); arrow.style.left = (rect.left + rect.width / 2 - 12) + 'px'; arrow.style.top = (rect.top - pad - 18) + 'px'; arrow.style.bottom = 'auto'; arrow.style.right = 'auto';
    } else {
        popup.style.left = Math.max(10, Math.min(rect.left + rect.width / 2 - popupWidth / 2, window.innerWidth - popupWidth - 10)) + 'px';
        popup.style.top = (rect.bottom + 30) + 'px'; popup.style.bottom = 'auto'; popup.style.right = 'auto';
        arrow.classList.add('arrow-up'); arrow.style.left = (rect.left + rect.width / 2 - 12) + 'px'; arrow.style.top = (rect.bottom + pad + 2) + 'px'; arrow.style.bottom = 'auto'; arrow.style.right = 'auto';
    }
}
document.getElementById('tutorial-next-btn').addEventListener('click', () => { tutorialStep++; if (tutorialStep >= tutorialSteps.length) endTutorial(); else showTutorialStep(); });
document.getElementById('tutorial-skip-btn').addEventListener('click', () => endTutorial());
window.addEventListener('resize', () => { if (tutorialActive) showTutorialStep(); });

// ============================================================
// MAP SELECTION
// ============================================================
function drawMapPreview(canvasEl, mapId) {
    const mapDef = MAP_DEFINITIONS[mapId]; if (!mapDef || !canvasEl) return;
    const ctx2 = canvasEl.getContext('2d'), W = canvasEl.width, H = canvasEl.height;
    const cellW = W / GRID_COLS, cellH = H / GRID_ROWS;
    ctx2.fillStyle = '#1a1a2e'; ctx2.fillRect(0, 0, W, H);
    ctx2.strokeStyle = 'rgba(255,255,255,0.06)'; ctx2.lineWidth = 0.5;
    for (let c = 0; c <= GRID_COLS; c++) { ctx2.beginPath(); ctx2.moveTo(c * cellW, 0); ctx2.lineTo(c * cellW, H); ctx2.stroke(); }
    for (let r = 0; r <= GRID_ROWS; r++) { ctx2.beginPath(); ctx2.moveTo(0, r * cellH); ctx2.lineTo(W, r * cellH); ctx2.stroke(); }
    for (const p of mapDef.path) { ctx2.fillStyle = 'rgba(139, 119, 80, 0.6)'; ctx2.fillRect(p.c * cellW, p.r * cellH, cellW, cellH); }
    ctx2.strokeStyle = '#ffd700'; ctx2.lineWidth = 2; ctx2.lineJoin = 'round'; ctx2.beginPath();
    mapDef.path.forEach((p, i) => { const x = (p.c + 0.5) * cellW, y = (p.r + 0.5) * cellH; i === 0 ? ctx2.moveTo(x, y) : ctx2.lineTo(x, y); });
    ctx2.stroke();
    const s = mapDef.path[0], e = mapDef.path[mapDef.path.length - 1];
    ctx2.fillStyle = '#4caf50'; ctx2.beginPath(); ctx2.arc((s.c + 0.5) * cellW, (s.r + 0.5) * cellH, 5, 0, Math.PI * 2); ctx2.fill();
    ctx2.fillStyle = '#f44336'; ctx2.beginPath(); ctx2.arc((e.c + 0.5) * cellW, (e.r + 0.5) * cellH, 5, 0, Math.PI * 2); ctx2.fill();
    ctx2.font = 'bold 9px sans-serif'; ctx2.textAlign = 'center';
    ctx2.fillStyle = '#4caf50'; ctx2.fillText('START', (s.c + 0.5) * cellW, (s.r + 0.5) * cellH - 8);
    ctx2.fillStyle = '#f44336'; ctx2.fillText('BASE', (e.c + 0.5) * cellW, (e.r + 0.5) * cellH - 8);
}
function showMapSelection() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over').classList.add('hidden');
    document.getElementById('map-select-screen').classList.remove('hidden');
    document.querySelectorAll('.map-preview').forEach(c => drawMapPreview(c, c.getAttribute('data-map')));
}
function selectMap(mapId) {
    selectedMapId = mapId;
    const mapDef = MAP_DEFINITIONS[mapId]; if (!mapDef) return;
    PATH_CELLS = mapDef.path.slice();
    pathSet.clear(); PATH_CELLS.forEach(p => pathSet.add(`${p.c},${p.r}`));
    pathWaypoints = PATH_CELLS.map(p => gridCenter(p.c, p.r)); shortcutWaypoints = null;
    document.getElementById('map-select-screen').classList.add('hidden');
    startGame();
    setTimeout(() => startTutorial(), 400);
}
document.querySelectorAll('.map-select-btn').forEach(btn => { btn.addEventListener('click', (e) => { e.stopPropagation(); initAudio(); selectMap(btn.getAttribute('data-map')); }); });
document.querySelectorAll('.map-card').forEach(card => { card.addEventListener('click', () => { initAudio(); selectMap(card.getAttribute('data-map')); }); });
document.getElementById('map-back-btn').addEventListener('click', () => { document.getElementById('map-select-screen').classList.add('hidden'); document.getElementById('start-screen').classList.remove('hidden'); });

// Start / Restart
document.getElementById('start-btn').addEventListener('click', () => {
    initAudio();
    showMapSelection();
});

document.getElementById('restart-btn').addEventListener('click', () => {
    initAudio();
    showMapSelection();
});

// Continue from save
document.getElementById('continue-btn').addEventListener('click', () => { initAudio(); loadGame(); });
document.getElementById('delete-save-btn').addEventListener('click', () => deleteSave());
document.getElementById('save-btn').addEventListener('click', () => {
    if (!gameState.running) return;
    if (gameState.waveActive) { showSaveNotification('Cannot save during a wave'); return; }
    saveGame();
});
document.getElementById('load-btn').addEventListener('click', () => { if (hasSaveData()) { initAudio(); loadGame(); } });
updateContinueButton();

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
    if (!gameState.running) return;

    const keys = ['1', '2', '3', '4', '5', '6', '7'];
    const types = ['machinegun', 'slowdown', 'sniper', 'flamethrower', 'missile', 'emp', 'artillery'];
    const idx = keys.indexOf(e.key);

    if (idx !== -1) {
        const type = types[idx];
        const def = TOWER_DEFS[type];
        if (isTowerUnlocked(type) && gameState.money >= def.cost) {
            gameState.selectedAbility = null;
            document.querySelectorAll('.ability-btn').forEach(b => b.classList.remove('selected'));

            if (gameState.selectedTowerType === type) {
                gameState.selectedTowerType = null;
                document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
            } else {
                gameState.selectedTowerType = type;
                gameState.selectedTower = null;
                document.getElementById('tower-info').classList.add('hidden');
                document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
                document.querySelector(`[data-tower="${type}"]`).classList.add('selected');
            }
        }
    }

    // Ability hotkeys: Q, W, E
    if (e.key === 'q' || e.key === 'Q') {
        const cost = ABILITY_COSTS.airstrike;
        if (gameState.commandPoints >= cost) {
            gameState.selectedAbility = 'airstrike';
            gameState.selectedTowerType = null;
            document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
            document.querySelectorAll('.ability-btn').forEach(b => b.classList.remove('selected'));
            document.querySelector('[data-ability="airstrike"]').classList.add('selected');
        }
    }
    if (e.key === 'w' || e.key === 'W') {
        const cost = ABILITY_COSTS.landmine;
        if (gameState.commandPoints >= cost) {
            gameState.selectedAbility = 'landmine';
            gameState.selectedTowerType = null;
            document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
            document.querySelectorAll('.ability-btn').forEach(b => b.classList.remove('selected'));
            document.querySelector('[data-ability="landmine"]').classList.add('selected');
        }
    }
    if (e.key === 'e' || e.key === 'E') {
        if (gameState.commandPoints >= ABILITY_COSTS.supply) {
            useSupplyDrop();
        }
    }

    if (e.key === 'Escape') {
        gameState.selectedTowerType = null;
        gameState.selectedTower = null;
        gameState.selectedAbility = null;
        document.getElementById('tower-info').classList.add('hidden');
        document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
        document.querySelectorAll('.ability-btn').forEach(b => b.classList.remove('selected'));
    }

    if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        startWave();
    }
});

// ---- Speed Controls ----
function setGameSpeed(speed) {
    gameSpeedMultiplier = speed;
    document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.speed) === speed));
}
document.querySelectorAll('.speed-btn').forEach(btn => { btn.addEventListener('click', (e) => { e.stopPropagation(); setGameSpeed(parseInt(btn.dataset.speed)); }); });
window.addEventListener('keydown', (e) => { if (e.key === ',') setGameSpeed(1); if (e.key === '.') setGameSpeed(2); if (e.key === '/') setGameSpeed(3); });

// ---- Target Mode Buttons ----
document.querySelectorAll('.target-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); if (!gameState.selectedTower) return;
        gameState.selectedTower.targetMode = btn.dataset.mode;
        document.querySelectorAll('.target-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// ---- Initialize ----
initGrid();
recalcPathWaypoints();
setInterval(gameLoop, FRAME_INTERVAL);
