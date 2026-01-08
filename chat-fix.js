// MILUZ - Fix para función sendMessage
// Reemplaza la función sendMessage del index.html con headers correctos

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;
  
  addMessageToChat(message, 'user');
  input.value = '';
  addMessageToChat('Pensando...', 'bot', true);
  
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });
    
    const data = await response.json();
    const messages = document.getElementById('chat-messages');
    messages.removeChild(messages.lastChild);
    addMessageToChat(data.response || 'Lo siento, hubo un error. Inténtalo de nuevo.', 'bot');
  } catch (error) {
    console.error('Error:', error);
    const messages = document.getElementById('chat-messages');
    messages.removeChild(messages.lastChild);
    addMessageToChat('Error de conexión. Por favor intenta de nuevo.', 'bot');
  }
}
