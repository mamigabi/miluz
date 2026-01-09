// MILUZ Chat - COMPLETO con Audio, Video y Pantalla Compartida

// ===== FUNCIONES BÁSICAS DE CHAT =====
function addMessageToChat(text, sender, isLoading = false) {
  const messagesDiv = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message ' + sender + '-message';
  messageDiv.textContent = text;
  if (isLoading) messageDiv.classList.add('loading');
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;
  
  addMessageToChat(message, 'user');
  input.value = '';
  addMessageToChat('Pensando...', 'bot', true);

      // Validar riesgo antes de enviar al chat
      try {
                const riskCheck = await fetch('/api/risk', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ message })
                                        });
                const riskData = await riskCheck.json();

                const riskAlertDiv = document.getElementById('risk-alert');
                const riskMessageSpan = document.getElementById('risk-message');

                if (riskData.violations && riskData.violations.length > 0) {
                              const violationMessages = riskData.violations.map(v => v.message).join('<br>');
                              riskMessageSpan.innerHTML = violationMessages;
                              const hasCritical = riskData.violations.some(v => v.severity === 'critical');
                              riskAlertDiv.className = hasCritical ? 'risk-alert danger' : 'risk-alert warning';
                              riskAlertDiv.style.display = 'block';

                              if (hasCritical) {
                                                // Remover mensaje "Pensando..."
                                                const loadingMsg = messagesDiv.querySelector('.loading');
                                                if (loadingMsg) loadingMsg.remove();
                                                addMessageToChat('⛔ Operación bloqueada por riesgo crítico.', 'bot');
                                                return;
                                            }
                          } else {
                              riskAlertDiv.style.display = 'none';
                          }
            } catch (error) {
                console.error('Error en validación de riesgo:', error);
                // Si falla la validación de riesgo, continuar con el chat (fail-safe)
            }
  
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    
    const data = await response.json();
    const messages = document.getElementById('chat-messages');
    const loadingMsg = messages.querySelector('.loading');
    if (loadingMsg) messages.removeChild(loadingMsg);
    addMessageToChat(data.response || 'Error procesando mensaje', 'bot');
  } catch (error) {
    console.error('Error:', error);
    const messages = document.getElementById('chat-messages');
    const loadingMsg = messages.querySelector('.loading');
    if (loadingMsg) messages.removeChild(loadingMsg);
    addMessageToChat('Error de conexión. Verifica tu conexión a internet.', 'bot');
  }
}

// ===== FUNCIONALIDAD DE VOZ =====
let recognition = null;
let isRecording = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.continuous = false;
  recognition.interimResults = false;
  
  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    document.getElementById('chat-input').value = transcript;
    sendMessage();
  };
  
  recognition.onend = function() {
    isRecording = false;
    const voiceBtn = document.getElementById('voice-btn');
    if (voiceBtn) voiceBtn.classList.remove('recording');
  };
}

function toggleVoice() {
  if (!recognition) {
    alert('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.');
    return;
  }
  
  const voiceBtn = document.getElementById('voice-btn');
  if (isRecording) {
    recognition.stop();
    isRecording = false;
    voiceBtn.classList.remove('recording');
  } else {
    recognition.start();
    isRecording = true;
    voiceBtn.classList.add('recording');
  }
}

// ===== FUNCIONALIDAD DE VIDEOLLAMADA =====
let localStream = null;
let isVideoCallActive = false;

async function startVideoCall() {
  if (isVideoCallActive) {
    stopVideoCall();
    return;
  }
  
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ 
      audio: true, 
      video: { width: 1280, height: 720 } 
    });
    
    isVideoCallActive = true;
    const videoBtn = document.getElementById('video-call-btn');
    if (videoBtn) {
      videoBtn.innerHTML = '⏹️ Finalizar Video';
      videoBtn.style.background = 'linear-gradient(135deg, #E53E3E, #C53030)';
    }
    
    // Crear contenedor de video
    const videoContainer = document.createElement('div');
    videoContainer.id = 'video-container';
    videoContainer.style.cssText = 'position: fixed; top: 80px; right: 20px; width: 400px; height: 300px; border-radius: 15px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.4); z-index: 10000; background: #000;';
    
    const video = document.createElement('video');
    video.id = 'local-video';
    video.srcObject = localStream;
    video.autoplay = true;
    video.muted = true;
    video.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
    
    videoContainer.appendChild(video);
    document.body.appendChild(videoContainer);
    
    addMessageToChat('📹 Videollamada iniciada. MILUZ puede ver y analizar lo que compartes.', 'bot');
  } catch (error) {
    console.error('Error accessing camera:', error);
    alert('Error al acceder a la cámara. Verifica los permisos.');
  }
}

function stopVideoCall() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  
  const videoContainer = document.getElementById('video-container');
  if (videoContainer) videoContainer.remove();
  
  const videoBtn = document.getElementById('video-call-btn');
  if (videoBtn) {
    videoBtn.innerHTML = '📹 Videollamada';
    videoBtn.style.background = 'linear-gradient(135deg, #ff6b6b, #ee5a6f)';
  }
  
  isVideoCallActive = false;
  addMessageToChat('📹 Videollamada finalizada.', 'bot');
}

// ===== FUNCIONALIDAD DE COMPARTIR PANTALLA =====
let screenStream = null;
let isScreenSharing = false;

async function toggleScreenShare() {
  if (isScreenSharing) {
    stopScreenShare();
    return;
  }
  
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ 
      video: { cursor: 'always' }, 
      audio: false 
    });
    
    isScreenSharing = true;
    
    // Crear contenedor para pantalla compartida
    const screenContainer = document.createElement('div');
    screenContainer.id = 'screen-container';
    screenContainer.style.cssText = 'position: fixed; top: 80px; left: 20px; width: 500px; height: 375px; border-radius: 15px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.4); z-index: 10000; background: #000;';
    
    const video = document.createElement('video');
    video.id = 'screen-video';
    video.srcObject = screenStream;
    video.autoplay = true;
    video.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';
    
    screenContainer.appendChild(video);
    document.body.appendChild(screenContainer);
    
    addMessageToChat('🖥️ Pantalla compartida. MILUZ puede analizar tus gráficos en tiempo real.', 'bot');
    
    screenStream.getVideoTracks()[0].onended = () => {
      stopScreenShare();
    };
  } catch (error) {
    console.error('Error sharing screen:', error);
    alert('Error al compartir pantalla. Intenta de nuevo.');
  }
}

function stopScreenShare() {
  if (screenStream) {
    screenStream.getTracks().forEach(track => track.stop());
    screenStream = null;
  }
  
  const screenContainer = document.getElementById('screen-container');
  if (screenContainer) screenContainer.remove();
  
  isScreenSharing = false;
  addMessageToChat('🖥️ Pantalla compartida finalizada.', 'bot');
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
  // Configurar input de chat
  const input = document.getElementById('chat-input');
  if (input) {
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') sendMessage();
    });
  }
  
  // Mensaje de bienvenida
  addMessageToChat('👋 ¡Hola! Soy MILUZ, tu mentora de trading institucional.', 'bot');
  addMessageToChat('🎯 Puedo ayudarte con estrategias BlackSheep, análisis de flujo de órdenes, psicotrading y más.', 'bot');
  addMessageToChat('🎥 Usa los botones para videollamada o compartir pantalla si quieres que analice tus gráficos en vivo.', 'bot');
  
  console.log('✅ MILUZ Chat cargado correctamente con todas las funcionalidades multimodales');
});

// ===== GEMINI VISION - ANÁLISIS DE GRÁFICOS =====
async function analyzeChart(input) {
      const file = input.files[0];
    if (!file || !file.type.startsWith('image/')) {
        addMessageToChat('⚠️ Selecciona una imagen válida', 'bot');
        return;
    }
    addMessageToChat('📊 Analizando gráfico...', 'bot', true);
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const response = await fetch('/api/vision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: e.target.result })
            });
            const data = await response.json();
            const loadingMsg = document.querySelector('.chat-messages .loading');
            if (loadingMsg) loadingMsg.remove();
            if (data.success) addMessageToChat(data.analysis, 'bot');
            else addMessageToChat('⚠️ Error: ' + (data.error || 'Desconocido'), 'bot');
        } catch (error) {
            console.error('Error vision:', error);
            const loadingMsg = document.querySelector('.chat-messages .loading');
            if (loadingMsg) loadingMsg.remove();
            addMessageToChat('⚠️ Error al analizar gráfico', 'bot');
        }
    };
    reader.readAsDataURL(file);
    input.value = '';
}
