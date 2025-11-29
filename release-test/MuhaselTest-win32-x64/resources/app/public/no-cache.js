
  // Force no caching for debugging
  document.addEventListener('DOMContentLoaded', function() {
    console.log('No-cache script loaded - ' + new Date().toISOString());
    
    // Add metadata to indicate build time
    const meta = document.createElement('meta');
    meta.name = 'build-time';
    meta.content = new Date().toISOString();
    document.head.appendChild(meta);
    
    // Clear any browser cache
    if ('caches' in window) {
      caches.keys().then(function(names) {
        names.forEach(function(name) {
          caches.delete(name);
        });
      });
    }
  });
  