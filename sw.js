self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip internal resources
    if (url.origin === location.origin && !url.searchParams.has('url')) return;

    // Route everything through the proxy
    let target = url.searchParams.get('url') || event.request.url;
    const proxiedUrl = '/proxy?url=' + encodeURIComponent(target);

    event.respondWith(
        fetch(proxiedUrl).catch(() => fetch(event.request))
    );
});
