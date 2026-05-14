async function loadComponent(url, selector) {
  const placeholder = document.querySelector(selector);
  if (!placeholder) {
    console.warn(`[LayoutLoader] Placeholder ${selector} не найден`);
    return;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    placeholder.outerHTML = html;
    console.log(`[LayoutLoader] ${url} загружен успешно`);
  } catch (err) {
    console.error(`[LayoutLoader] Ошибка загрузки ${url}:`, err);
    placeholder.innerHTML = `
      <div style="padding: 12px; background: #fee2e2; border: 1px solid #ef4444;">
        ⚠️ Не удалось загрузить ${url}. Запустите через локальный сервер.
      </div>
    `;
  }
}

function removeSearchIcon() {
  // Ищем SVG с path лупы (характерные команды: M21, C21, circle)
  const allSvgs = document.querySelectorAll('svg');
  allSvgs.forEach(svg => {
    const paths = svg.querySelectorAll('path');
    const hasSearchPath = Array.from(paths).some(p => {
      const d = p.getAttribute('d') || '';
      // Лупа обычно содержит круг + палку
      return (d.includes('M21') && d.includes('C21')) || 
             (d.includes('m21') && d.includes('c21')) ||
             d.includes('circle') ||
             (d.length > 50 && d.includes('M') && d.includes('L'));
    });
    
    if (hasSearchPath) {
      const btn = svg.closest('button') || svg.closest('a') || svg.parentElement;
      if (btn) {
        btn.remove();
        console.log('[LayoutLoader] Удалена иконка поиска');
      }
    }
  });

  // Также ищем по aria-label / title
  document.querySelectorAll('button, a').forEach(el => {
    const label = (el.getAttribute('aria-label') || el.getAttribute('title') || '').toLowerCase();
    if (label.includes('поиск') || label.includes('search')) {
      el.remove();
      console.log('[LayoutLoader] Удалена кнопка поиска по aria-label/title');
    }
  });
}

async function initLayout() {
  console.log('[LayoutLoader] Начинаем загрузку layout...');

  await Promise.all([
    loadComponent('components/header.html', '#layout-header'),
    loadComponent('components/footer.html', '#layout-footer')
  ]);

  // Ждём следующего тика, чтобы DOM точно обновился после outerHTML
  await new Promise(r => setTimeout(r, 0));

  // Удаляем иконку поиска
  removeSearchIcon();

  // Убираем target="_blank" у внутренних ссылок
  document.querySelectorAll('a[target="_blank"]').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (
      !href.startsWith('http') ||
      href.includes(window.location.hostname) ||
      href.includes('localhost')
    ) {
      a.removeAttribute('target');
    }
  });

  console.log('[LayoutLoader] guestNav найден?', !!document.getElementById('guestNav'));
  console.log('[LayoutLoader] loggedNav найден?', !!document.getElementById('loggedNav'));
  console.log('[LayoutLoader] access_token в localStorage?', !!localStorage.getItem('access_token'));

  try {
    const { initAuthHeader } = await import('./auth-module.js?v=4');
    await initAuthHeader();
    console.log('[LayoutLoader] initAuthHeader выполнен');
  } catch (err) {
    console.error('[LayoutLoader] Ошибка auth:', err);
  }

  try {
    const { initNotifications } = await import('./notification.js?v=4');
    initNotifications();
    console.log('[LayoutLoader] initNotifications выполнен');
  } catch (err) {
    console.error('[LayoutLoader] Ошибка notifications:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLayout);
} else {
  initLayout();
}