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
            if (geojson.features.length > 0) {
                console.log("Keys in first feature properties:", Object.keys(geojson.features[0].properties));
                console.log("Values in first feature properties:", geojson.features[0].properties);
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
    });

}).on('error', (err) => {
    console.error('Error fetching data:', err);
});
