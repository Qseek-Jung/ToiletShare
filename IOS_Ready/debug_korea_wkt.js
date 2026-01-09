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
            console.log("Total features:", geojson.features.length);
            const countries = geojson.features.map(f => `${f.properties.ISO_A3} (${f.properties.ADMIN})`).slice(0, 20); // Print first 20
            console.log("First 20 countries:", countries);

            const korea = geojson.features.find(f =>
                (f.properties.ISO_A3 && f.properties.ISO_A3.includes('KOR')) ||
                (f.properties.ADMIN && f.properties.ADMIN.includes('Korea'))
            );

            if (korea) {
                console.log("Found Korea candidate:", korea.properties);
            } else {
                console.log("Korea not found even with loose search.");
            }

        } catch (e) {
            console.error('Error parsing JSON:', e);
            // Print first 500 chars to see what we got
            console.log(data.substring(0, 500));
        }
    });

}).on('error', (err) => {
    console.error('Error fetching data:', err);
});
