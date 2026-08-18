const COLORS = {
    organic: '#7fa66f',
    recyclable: '#3f8ab0',
    e_waste: '#c98a3b',
    facility: '#e7ece9',
};

const map = L.map('map', { zoomControl: true }).setView([26.4499, 80.3319], 12); // default: Kanpur

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19,
}).addTo(map);

async function loadData() {
    const res = await fetch('/api/dashboard/geojson/');
    const data = await res.json();

    let requestCount = 0, facilityCount = 0, routeCount = 0;
    const feed = document.getElementById('feed');
    feed.innerHTML = '';

    data.features.forEach((feature) => {
        const { kind } = feature.properties;

        if (kind === 'request') {
            requestCount++;
            const [lon, lat] = feature.geometry.coordinates;
            const color = COLORS[feature.properties.waste_class] || '#888';
            L.circleMarker([lat, lon], {
                radius: 7, color, fillColor: color, fillOpacity: 0.85, weight: 2,
            })
                .addTo(map)
                .bindPopup(`Request #${feature.properties.id} — ${feature.properties.waste_class} (${feature.properties.status})`);

            const item = document.createElement('div');
            item.className = 'feed-item';
            item.innerHTML = `<span class="fi-class">#${feature.properties.id} · ${feature.properties.waste_class}</span><br><span class="fi-status">${feature.properties.status}</span>`;
            feed.appendChild(item);
        }

        if (kind === 'facility') {
            facilityCount++;
            const [lon, lat] = feature.geometry.coordinates;
            L.marker([lat, lon], {
                icon: L.divIcon({
                    className: '',
                    html: `<div style="width:12px;height:12px;border-radius:2px;background:${COLORS.facility};border:2px solid #10151a;"></div>`,
                }),
            })
                .addTo(map)
                .bindPopup(`${feature.properties.name} (${feature.properties.facility_type})`);
        }

        if (kind === 'route') {
            routeCount++;
            const latlngs = feature.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
            L.polyline(latlngs, { color: COLORS.recyclable, weight: 3, opacity: 0.8 })
                .addTo(map)
                .bindPopup(`Route #${feature.properties.id} — ${feature.properties.distance_km?.toFixed(1)} km, ${feature.properties.duration_min?.toFixed(0)} min`);
        }
    });

    document.getElementById('stat-requests').textContent = requestCount;
    document.getElementById('stat-facilities').textContent = facilityCount;
    document.getElementById('stat-routes').textContent = routeCount;

    if (requestCount === 0) {
        feed.innerHTML = '<p class="feed-empty">No active requests yet.</p>';
    }
}

loadData();
setInterval(loadData, 15000); // poll every 15s
