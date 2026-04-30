self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (url.origin === location.origin && !url.searchParams.has('url')) return;
    let target = url.searchParams.get('url') || event.request.url;
    event.respondWith(fetch('/proxy?url=' + encodeURIComponent(target)));
});
