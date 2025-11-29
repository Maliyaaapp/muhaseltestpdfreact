// Cleanup Duplicates Script
// Run this in your browser console to clean up localStorage duplicates

(function cleanupDuplicates() {
  const tables = ['fees', 'installments', 'students'];
  
  tables.forEach(table => {
    try {
      const data = localStorage.getItem(table);
      if (!data) {
        console.log(`No data found for ${table}`);
        return;
      }
      
      const items = JSON.parse(data);
      if (!Array.isArray(items)) {
        console.log(`${table} is not an array`);
        return;
      }
      
      const originalCount = items.length;
      
      // Deduplicate by ID
      const seenIds = new Set();
      const uniqueItems = items.filter(item => {
        if (!item?.id) return true;
        if (seenIds.has(item.id)) {
          console.log(`Found duplicate in ${table}: ${item.id}`);
          return false;
        }
        seenIds.add(item.id);
        return true;
      });
      
      const removedCount = originalCount - uniqueItems.length;
      
      if (removedCount > 0) {
        localStorage.setItem(table, JSON.stringify(uniqueItems));
        console.log(`✅ Removed ${removedCount} duplicates from ${table}`);
      } else {
        console.log(`✅ No duplicates found in ${table}`);
      }
      
      // Also clean up cache
      const cacheKey = `${table}_cache`;
      const cacheData = localStorage.getItem(cacheKey);
      if (cacheData) {
        try {
          const cache = JSON.parse(cacheData);
          if (cache?.data && Array.isArray(cache.data)) {
            const seenCacheIds = new Set();
            cache.data = cache.data.filter(item => {
              if (!item?.id) return true;
              if (seenCacheIds.has(item.id)) return false;
              seenCacheIds.add(item.id);
              return true;
            });
            localStorage.setItem(cacheKey, JSON.stringify(cache));
            console.log(`✅ Cleaned cache for ${table}`);
          }
        } catch (e) {
          console.error(`Error cleaning cache for ${table}:`, e);
        }
      }
      
      // Clean up filtered caches
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`${table}_`) && key.endsWith('_cache') && key.includes('{')) {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed filtered cache: ${key}`);
        }
      });
      
    } catch (error) {
      console.error(`Error processing ${table}:`, error);
    }
  });
  
  console.log('\n🎉 Cleanup complete! Please refresh the page.');
})();
