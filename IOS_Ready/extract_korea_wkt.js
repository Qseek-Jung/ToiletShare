import https from 'https';

const url = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const geojson = JSON.parse(data);
            const korea = geojson.features.find(f => f.properties['ISO3166-1-Alpha-3'] === 'KOR');

            if (!korea) {
                console.error('South Korea (KOR) not found in the dataset.');
                process.exit(1);
            }

            // GeoJSON to WKT converter
            function toWKT(geometry) {
                if (geometry.type === 'Polygon') {
                    return `POLYGON(${formatRings(geometry.coordinates)})`;
                } else if (geometry.type === 'MultiPolygon') {
                    return `MULTIPOLYGON(${geometry.coordinates.map(poly => `(${formatRings(poly)})`).join(',')})`;
                }
                return null;
            }

            function formatRings(rings) {
                return rings.map(ring => {
                    return `(${ring.map(coord => `${coord[0]} ${coord[1]}`).join(',')})`;
                }).join(',');
            }

            const wkt = toWKT(korea.geometry);
            console.log(wkt);

        } catch (e) {
            console.error('Error parsing JSON:', e);
            process.exit(1);
        }
    });

}).on('error', (err) => {
    console.error('Error fetching data:', err);
    process.exit(1);
});
