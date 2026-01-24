document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const content = document.getElementById('content');
    const pwaBtn = document.getElementById('pwa-install-btn');
    const toggleBtn = document.getElementById('toggle-sidebar-btn');
    const closeBtn = document.getElementById('close-sidebar-btn');
    let deferredPrompt;

    function toggleSidebar() {
        if (!sidebar || !overlay || !content) return;
        const isMobile = window.innerWidth < 1024;
        const isClosed = sidebar.classList.contains('-translate-x-full');

        if (isClosed) {
            sidebar.classList.remove('-translate-x-full');
            if (isMobile) {
                overlay.classList.remove('hidden');
            } else {
                content.classList.add('lg:ml-72');
            }
        } else {
            sidebar.classList.add('-translate-x-full');
            if (isMobile) {
                overlay.classList.add('hidden');
            } else {
                content.classList.remove('lg:ml-72');
            }
        }
    }

    if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
    if (closeBtn) closeBtn.addEventListener('click', toggleSidebar);
    if (overlay) overlay.addEventListener('click', toggleSidebar);

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (window.innerWidth >= 1024 && overlay) {
                overlay.classList.add('hidden');
            }
        }, 100);
    }, { passive: true });

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    if (pwaBtn) {
        pwaBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    deferredPrompt = null;
                    pwaBtn.classList.add('hidden');
                }
            }
        });
    }

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
        });
    }
});