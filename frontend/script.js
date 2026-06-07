document.addEventListener('DOMContentLoaded', () => {
    // API Configuration - Works for both local and production
    const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
        ? 'http://localhost:5001' 
        : 'https://language-translator-backend-5ram.onrender.com';
    
    const sourceText = document.getElementById('source-text');
    const targetText = document.getElementById('target-text');
    const sourceLang = document.getElementById('source-lang');
    const targetLang = document.getElementById('target-lang');
    const translateBtn = document.getElementById('translate-btn');
    const swapBtn = document.getElementById('swap-langs');
    const charCountDisplay = document.getElementById('char-count');
    const translationStatus = document.getElementById('translation-status');
    const statusText = document.querySelector('.status-text');
    const statusIndicator = document.querySelector('.status-indicator');
    
    // Action Buttons
    const speakSource = document.getElementById('speak-source');
    const speakTarget = document.getElementById('speak-target');
    const copySource = document.getElementById('copy-source');
    const copyTarget = document.getElementById('copy-target');
    const clearBtn = document.getElementById('clear-text');
    const voiceInputBtn = document.getElementById('voice-input');
    const autoSpeakBtn = document.getElementById('auto-speak');
    let autoSpeakEnabled = false;

    // Speech Recognition Setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
            console.log("Microphone Active - Listening...");
            updateSystemStatus('LISTENING...', '#bc13fe');
            voiceInputBtn.classList.add('recording');
            addLogEntry("Mic active", "LISTENING", "SYS", "LOG");
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                sourceText.value = finalTranscript;
                sourceText.dispatchEvent(new Event('input'));
                updateSystemStatus('AUDIO DATA SYNCED', '#10b981');
                recognition.stop();
            } else if (interimTranscript) {
                sourceText.value = interimTranscript;
                updateSystemStatus('CAPTURING AUDIO...', '#bc13fe');
            }
        };

        recognition.onend = () => {
            voiceInputBtn.classList.remove('recording');
            if (isProcessing === false) {
                setTimeout(() => updateSystemStatus('CORE ACTIVE', '#00f2ff'), 2000);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                updateSystemStatus('PERMISSION_DENIED', '#ff003c');
            } else if (event.error === 'no-speech') {
                updateSystemStatus('NO_SPEECH_DETECTED', '#ff003c');
            } else {
                updateSystemStatus('SPEECH_ERR: ' + event.error.toUpperCase(), '#ff003c');
            }
            voiceInputBtn.classList.remove('recording');
        };
    }

    let isProcessing = false;

    // Character Count Update
    sourceText.addEventListener('input', () => {
        const count = sourceText.value.length;
        charCountDisplay.textContent = count;
        
        if (count >= 900) {
            charCountDisplay.classList.add('limit-warning');
        } else {
            charCountDisplay.classList.remove('limit-warning');
        }
        
        if (count > 0) {
            debouncedTranslate();
        } else {
            targetText.innerHTML = '<span class="cursor-blink">_</span>';
            updateSystemStatus('CORE ACTIVE', '#00f2ff');
            translationStatus.textContent = 'IDLE';
            translationStatus.style.color = 'var(--text-dim)';
        }
    });

    // Clear Data
    clearBtn.addEventListener('click', () => {
        sourceText.value = '';
        targetText.innerHTML = '<span class="cursor-blink">_</span>';
        charCountDisplay.textContent = '0';
        updateSystemStatus('CORE ACTIVE', '#00f2ff');
        translationStatus.textContent = 'IDLE';
        translationStatus.style.color = 'var(--text-dim)';
    });

    // Swap Languages with Animation
    swapBtn.addEventListener('click', () => {
        const tempLang = sourceLang.value;
        sourceLang.value = targetLang.value;
        targetLang.value = tempLang;

        const currentSource = sourceText.value;
        const currentTarget = targetText.innerText.replace('_', '');
        
        if (currentTarget && currentTarget !== 'Await input...') {
            sourceText.value = currentTarget;
            typewriterEffect(currentSource);
        }
        
        sourceText.dispatchEvent(new Event('input'));
    });

    // System Status Update
    function updateSystemStatus(text, color) {
        statusText.textContent = text;
        statusText.style.color = color;
        statusIndicator.style.background = color;
        if (color !== '#00f2ff') {
            statusIndicator.style.boxShadow = `0 0 10px ${color}`;
        } else {
            statusIndicator.style.boxShadow = 'none';
        }
    }

    // Typewriter Effect for Output
    function typewriterEffect(text) {
        targetText.innerHTML = '';
        let i = 0;
        const speed = 20; // ms per char

        function type() {
            if (i < text.length) {
                targetText.innerHTML = text.substring(0, i + 1) + '<span class="cursor-blink">_</span>';
                i++;
                setTimeout(type, speed);
            } else {
                targetText.innerHTML = text + '<span class="cursor-blink">_</span>';
            }
        }
        type();
    }

    // Translation Core Logic
    async function translate() {
        const text = sourceText.value.trim();
        if (!text) return;

        if (isProcessing) return;
        isProcessing = true;

        updateSystemStatus('NEURAL PROCESSING...', '#bc13fe');
        translationStatus.textContent = 'PROCESSING...';
        translationStatus.style.color = '#bc13fe';
        translateBtn.style.opacity = '0.5';

        try {
            // Calling backend API
            const response = await fetch(`${API_BASE_URL}/api/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    sourceLang: sourceLang.value,
                    targetLang: targetLang.value
                })
            });
            
            const data = await response.json();

            if (data.translatedText) {
                const translated = data.translatedText;
                typewriterEffect(translated);
                updateSystemStatus('DATA SYNCED', '#10b981');
                translationStatus.textContent = 'COMPLETE';
                translationStatus.style.color = '#10b981';
                
                // Save to Terminal History
                addLogEntry(text, translated, sourceLang.value, targetLang.value);
                
                // Auto-speak if enabled
                if (autoSpeakEnabled) {
                    setTimeout(() => speak(translated, targetLang.value), 500);
                }

                setTimeout(() => {
                    if (!isProcessing) updateSystemStatus('CORE ACTIVE', '#00f2ff');
                }, 2000);
            } else {
                throw new Error(data.error || "Neural link failed");
            }
        } catch (error) {
            console.error("Neural Error:", error);
            updateSystemStatus('SYSTEM ERROR', '#ff003c');
            translationStatus.textContent = 'ERROR';
            translationStatus.style.color = '#ff003c';
            
            let displayMsg = error.message;
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                displayMsg = 'BACKEND OFFLINE. CORE TRANSLATION SERVICE UNREACHABLE.';
            }
            targetText.innerHTML = `<span style="color: #ff003c">ERROR: ${displayMsg.toUpperCase()}</span>`;
        } finally {
            isProcessing = false;
            translateBtn.style.opacity = '1';
        }
    }

    // Debounce for Auto-translate
    let translationTimeout;
    function debouncedTranslate() {
        clearTimeout(translationTimeout);
        translationTimeout = setTimeout(() => {
            if (sourceText.value.length > 2) {
                translate();
            }
        }, 600); // 600ms delay after typing for fast response
    }

    translateBtn.addEventListener('click', translate);

    // Terminal History Logs
    let translationHistory = [];
    let allSessionLogs = [];

    async function loadHistory() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/history`);
            const data = await response.json();
            if (Array.isArray(data)) {
                translationHistory = data;
                // Merge persistent history logs with transient system logs
                const systemLogs = allSessionLogs.filter(log => !(['en-GB', 'hi-IN', 'de-DE'].includes(log.sLang) && ['en-GB', 'hi-IN', 'de-DE'].includes(log.tLang)));
                allSessionLogs = [...translationHistory, ...systemLogs];
                renderHistory();
            }
        } catch (err) {
            console.error("Failed to load history from backend:", err);
            // LocalStorage fallback
            translationHistory = JSON.parse(localStorage.getItem('translationHistory')) || [];
            const systemLogs = allSessionLogs.filter(log => !(['en-GB', 'hi-IN', 'de-DE'].includes(log.sLang) && ['en-GB', 'hi-IN', 'de-DE'].includes(log.tLang)));
            allSessionLogs = [...translationHistory, ...systemLogs];
            renderHistory();
        }
    }

    function renderHistory() {
        const historyContainer = document.getElementById('history-list');
        historyContainer.innerHTML = '';
        
        allSessionLogs.forEach(log => {
            const entry = document.createElement('div');
            
            // Check if it's a translation log (both sLang and tLang are valid lang codes)
            const isTranslation = ['en-GB', 'hi-IN', 'de-DE'].includes(log.sLang) && 
                                  ['en-GB', 'hi-IN', 'de-DE'].includes(log.tLang);
            
            if (isTranslation) {
                entry.className = 'log-entry interactive-log';
                entry.innerHTML = `
                    <span class="timestamp">[${log.timestamp}]</span>
                    <span class="cmd">${log.sLang.split('-')[0]}>${log.tLang.split('-')[0]}</span>
                    <span class="content">${log.source.substring(0, 20)}${log.source.length > 20 ? '...' : ''}</span>
                `;
                
                entry.onclick = () => {
                    sourceText.value = log.source;
                    sourceLang.value = log.sLang;
                    targetLang.value = log.tLang;
                    sourceText.dispatchEvent(new Event('input'));
                    translate();
                };
            } else {
                const isError = log.tLang === 'ERR';
                entry.className = `log-entry system-log ${isError ? 'error-log' : ''}`;
                entry.innerHTML = `
                    <span class="timestamp">[${log.timestamp}]</span>
                    <span class="cmd">${log.sLang}>${log.tLang}</span>
                    <span class="content">${log.source}</span>
                `;
            }

            historyContainer.prepend(entry);
        });
    }

    function addLogEntry(source, target, sLang, tLang) {
        const timestamp = new Date().toLocaleTimeString([], { hour12: false });
        
        const isTranslation = ['en-GB', 'hi-IN', 'de-DE'].includes(sLang) && 
                              ['en-GB', 'hi-IN', 'de-DE'].includes(tLang);
        
        const logItem = { timestamp, source, target, sLang, tLang };
        
        if (isTranslation) {
            // Add to persistent translation history
            translationHistory.push(logItem);
            if (translationHistory.length > 10) {
                translationHistory.shift();
            }
            localStorage.setItem('translationHistory', JSON.stringify(translationHistory));
        }
        
        // Add to runtime session logs
        allSessionLogs.push(logItem);
        if (allSessionLogs.length > 20) {
            allSessionLogs.shift();
        }
        
        renderHistory();
    }

    // Audio Stream (TTS) with Voice Selection
    function speak(text, lang) {
        if (!text || text === 'Await input...' || text === 'Translation will appear here...') return;
        
        // Cancel any existing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        
        // Try to find the best voice for the language
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
        if (voice) {
            utterance.voice = voice;
        }
        
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1;
        
        window.speechSynthesis.speak(utterance);
    }

    // Ensure voices are loaded (Chrome fix)
    window.speechSynthesis.onvoiceschanged = () => {
        console.log("Neural Voices Loaded");
    };

    speakSource.addEventListener('click', () => speak(sourceText.value, sourceLang.value));
    speakTarget.addEventListener('click', () => speak(targetText.innerText.replace('_', ''), targetLang.value));

    // Buffer Copy
    async function copyToClipboard(text) {
        if (!text || text === 'Await input...') return;
        try {
            await navigator.clipboard.writeText(text);
            updateSystemStatus('BUFFER COPIED', '#10b981');
            setTimeout(() => updateSystemStatus('CORE ACTIVE', '#00f2ff'), 2000);
        } catch (err) {
            console.error('Buffer error: ', err);
        }
    }

    copySource.addEventListener('click', () => copyToClipboard(sourceText.value));
    copyTarget.addEventListener('click', () => copyToClipboard(targetText.innerText.replace('_', '')));

    // Auto-Speak Toggle
    autoSpeakBtn.addEventListener('click', () => {
        autoSpeakEnabled = !autoSpeakEnabled;
        autoSpeakBtn.classList.toggle('active');
        autoSpeakBtn.style.color = autoSpeakEnabled ? 'var(--neon-cyan)' : 'var(--text-dim)';
        if (autoSpeakEnabled) {
            autoSpeakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            updateSystemStatus('AUTO_SPEAK ENABLED', '#10b981');
        } else {
            autoSpeakBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            updateSystemStatus('AUTO_SPEAK DISABLED', '#ff003c');
        }
        setTimeout(() => updateSystemStatus('CORE ACTIVE', '#00f2ff'), 2000);
    });

    // Voice Input Trigger
    voiceInputBtn.addEventListener('click', () => {
        if (!SpeechRecognition) {
            updateSystemStatus('API_NOT_SUPPORTED', '#ff003c');
            return;
        }

        if (voiceInputBtn.classList.contains('recording')) {
            recognition.stop();
        } else {
            try {
                // Set language dynamically
                recognition.lang = sourceLang.value;
                
                // Abort any previous session
                try { recognition.abort(); } catch(e) {}
                
                recognition.start();
                console.log("Speech recognition started for language: " + recognition.lang);
            } catch (err) {
                console.error("Failed to start speech recognition:", err);
                updateSystemStatus('MIC_INIT_ERROR', '#ff003c');
                addLogEntry("Mic Error", err.message, "SYS", "ERR");
            }
        }
    });

    // Initial System Check
    function systemCheck() {
        const hasSTT = !!SpeechRecognition;
        const hasTTS = !!window.speechSynthesis;
        
        addLogEntry("System check...", hasSTT && hasTTS ? "VOICE_READY" : "VOICE_LIMITED", "SYS", "LOG");
        
        if (!hasSTT) console.warn("Speech Recognition not supported in this browser.");
        if (!hasTTS) console.warn("Speech Synthesis not supported in this browser.");
    }

    // 3D Tilt Effect for Main Card
    const card = document.querySelector('.translator-interface');
    
    document.addEventListener('mousemove', (e) => {
        if (window.innerWidth < 992) {
            card.style.transform = 'none';
            return;
        }
        
        const xAxis = (window.innerWidth / 2 - e.pageX) / 40;
        const yAxis = (window.innerHeight / 2 - e.pageY) / 40;
        
        card.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
    });

    // Reset tilt on mouse leave
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'rotateY(0deg) rotateX(0deg)';
        card.style.transition = 'all 0.5s ease';
    });

    card.addEventListener('mouseenter', () => {
        card.style.transition = 'none';
    });

    // Neural Background Particles
    function initParticles() {
        const container = document.createElement('div');
        container.className = 'particles-container';
        document.body.appendChild(container);

        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            const size = Math.random() * 4 + 2;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            
            particle.style.animationDelay = `${Math.random() * 15}s`;
            particle.style.animationDuration = `${Math.random() * 10 + 10}s`;
            
            container.appendChild(particle);
        }
    }

    initParticles();
    loadHistory();
    systemCheck();

    // Global Error Capture for Terminal
    window.onerror = function(msg, url, lineNo, columnNo, error) {
        addLogEntry("Browser Error", msg, "JS", "ERR");
        return false;
    };
});
