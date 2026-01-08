// MILUZ Chat - Simple y Funcional
function addMessageToChat(text, sender) {
  const messagesDiv = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message ' + sender + '-message';
  messageDiv.textContent = text;
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;
  
  addMessageToChat(message, 'user');
  input.value = '';
  addMessageToChat('Pensando...', 'bot');
  
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    
    const data = await response.json();
    const messages = document.getElementById('chat-messages');
    messages.removeChild(messages.lastChild);
    addMessageToChat(data.response || 'Error', 'bot');
  } catch (error) {
    const messages = document.getElementById('chat-messages');
    messages.removeChild(messages.lastChild);
    addMessageToChat('Error de conexión', 'bot');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const input = document.getElementById('chat-input');
  input.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
  });
  addMessageToChat('¡Hola! Soy MILUZ, tu mentora de trading. ¿En qué puedo ayudarte?', 'bot');
});
