// ======= AJAX HANDLER MODULE =======
// Separerad modul för all AJAX/database-relaterad funktionalitet

// Rate Limiter
export const rateLimiter = {
  requests: [],
  maxRequests: 50, // Ökat från 10 till 50
  timeWindow: 60000, // 1 minut
  
  canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      console.warn('Rate limit exceeded');
      return false;
    }
    
    this.requests.push(now);
    return true;
  }
};

// Request Queue
export const requestQueue = {
  queue: [],
  processing: false,
  
  add(requestFn) {
    this.queue.push(requestFn);
    this.process();
  },
  
  async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      try {
        await request();
        await new Promise(resolve => setTimeout(resolve, 100)); // Kort paus mellan requests
      } catch (err) {
        console.error('Queue request failed:', err);
      }
    }
    this.processing = false;
  }
};

// Error Display
export function showUserError(message) {
  let errorDiv = document.getElementById('error-display');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.id = 'error-display';
    errorDiv.style.cssText = 'position:fixed;top:10px;right:10px;background:#dc3545;color:white;padding:12px 16px;border-radius:6px;z-index:1000;display:none;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-family:Arial,sans-serif;max-width:300px;';
    document.body.appendChild(errorDiv);
  }
  
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => errorDiv.style.display = 'none', 5000);
}

// Säker AJAX-funktion
export function echoAjax(data, retryCount = 0) {
  // Rate limiting check
  if (!rateLimiter.canMakeRequest()) {
    showUserError('För många förfrågningar. Vänta en stund.');
    return Promise.reject(new Error('Rate limited'));
  }

  // Endast validera att action finns
  if (!data || !data.action) {
    showUserError('Ogiltig data kunde inte skickas.');
    return Promise.reject(new Error('Invalid data - missing action'));
  }

  const maxRetries = 2;
  const timeout = 5000; // 5 sekunder

  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    fetch('https://echo.free.beeceptor.com', {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data) // Skicka all data direkt
    })
    .then(res => {
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res.json();
    })
    .then(res => {
      console.log("Echo response:", res);
      resolve(res);
    })
    .catch(err => {
      clearTimeout(timeoutId);
      console.error("Echo error:", err);
      
      // Retry vid nätverksfel
      if (retryCount < maxRetries && (err.name === 'AbortError' || err.message.includes('fetch') || err.message.includes('HTTP'))) {
        console.log(`Retrying... (${retryCount + 1}/${maxRetries})`);
        setTimeout(() => {
          echoAjax(data, retryCount + 1).then(resolve).catch(reject);
        }, 1000 * (retryCount + 1));
      } else {
        showUserError('Kunde inte spara ändringar efter flera försök.');
        reject(err);
      }
    });
  });
}

// Wrapper för att köa AJAX requests
export function queuedEchoAjax(data) {
  requestQueue.add(() => echoAjax(data));
}

// FLYTTAD FRÅN MAIN.JS: Tagg-uppdatering hantering
export const handleTagUpdate = (entityType, entityId, newTags, oldTags = []) => {
  const ajaxData = {
    action: "updateTags",
    entityType,
    entityId,
    tags: newTags,
    oldTags
  };
  queuedEchoAjax(ajaxData);
  console.log('Tags AJAX sent:', ajaxData);
};
