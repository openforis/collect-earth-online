var CACHE = 'gee-cache';

self.addEventListener('install', function(evt) {
    console.log('The service worker is being installed.');
    evt.waitUntil(precache());
});

self.addEventListener('fetch', function(evt) {
    console.log('The service worker is serving the asset.');
    evt.respondWith(fromNetwork(evt.request, 24000).catch(function () {
        return fromCache(evt.request);
    }));
});

function precache() {
    return caches.open(CACHE).then(function (cache) {
        return cache.addAll([
            // 'https://localhost:8888/ts/spectrals/-122.47674862385583/43.76407549182641',
            // 'https://localhost:8888/ts/images/-122.47674862385583/43.76407549182641/2000',
            // 'https://localhost:8888/ts/chip/-122.47674862385583/43.76407549182641/2000/215/tc',
            // 'https://localhost:8888/ts/image_chip/-122.47674862385583/43.76407549182641/LANDSAT/LE07/C01/T1_SR/LE07_046029_20000605/tc/255'
        ]);
    });
}

function fromNetwork(request, timeout) {
    return new Promise(function (fulfill, reject) {
        var timeoutId = setTimeout(reject, timeout);
        fetch(request).then(function (response) {
            clearTimeout(timeoutId);
            fulfill(response);
        }, reject);
    });
}

function fromCache(request) {
    return caches.open(CACHE).then(function (cache) {
        return cache.match(request).then(function (matching) {
            return matching || Promise.reject('no-match');
        });
    });
}