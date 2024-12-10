// server.js
const express = require('express');
const cors = require('cors'); // Importa el middleware CORS
require('dotenv').config();  // Cargar el archivo .env


const app = express();
app.use(cors());
const port = 3000;

const API_KEY = process.env.API_KEY; // Tu API Key
// El ID de la playlist puede ser pasado en el parámetro de la URL
app.get('/playlist-duration', async (req, res) => {
    const playlistId = req.query.playlistId;
    
    if (!playlistId) {
        return res.status(400).json({ error: 'Playlist ID is required' });
    }

    try {
        const duration = await fetchPlaylistDuration(API_KEY, playlistId);
        res.json({ duration });
    } catch (error) {
        console.error('Error details:', error); // Agregado para ver más detalles del error
        res.status(500).json({ error: 'Failed to fetch playlist duration', details: error.message });
    }
});

async function fetchPlaylistDuration(apiKey, playlistId) {
    let totalDurationInSeconds = 0;
    let nextPageToken = '';
    const durationRegex = /PT(\d+H)?(\d+M)?(\d+S)?/;

    try {
        do {
            console.log(`Fetching playlist items for page token: ${nextPageToken}`);
            const playlistResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=50&pageToken=${nextPageToken}&key=${apiKey}`
            );

            if (!playlistResponse.ok) {
                throw new Error(`Failed to fetch playlist items: ${playlistResponse.statusText}`);
            }

            const playlistData = await playlistResponse.json();
            console.log('Playlist Data:', playlistData); // Imprime los datos de la lista de reproducción

            if (!playlistData.items || playlistData.items.length === 0) {
                throw new Error('No items found in the playlist.');
            }

            const videoIds = playlistData.items.map(item => item.contentDetails.videoId).join(',');

            console.log(`Fetching video details for videos: ${videoIds}`);
            const videoResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`
            );

            if (!videoResponse.ok) {
                throw new Error(`Failed to fetch video details: ${videoResponse.statusText}`);
            }

            const videoData = await videoResponse.json();
            console.log('Video Data:', videoData); // Imprime los detalles de los videos

            for (const video of videoData.items) {
                const match = video.contentDetails.duration.match(durationRegex);
                const hours = parseInt(match[1]?.replace('H', '') || 0);
                const minutes = parseInt(match[2]?.replace('M', '') || 0);
                const seconds = parseInt(match[3]?.replace('S', '') || 0);
                totalDurationInSeconds += hours * 3600 + minutes * 60 + seconds;
            }

            nextPageToken = playlistData.nextPageToken || '';
        } while (nextPageToken);

        const hours = Math.floor(totalDurationInSeconds / 3600);
        const minutes = Math.floor((totalDurationInSeconds % 3600) / 60);
        const seconds = totalDurationInSeconds % 60;

        return `${hours}h ${minutes}m ${seconds}s`;
    } catch (error) {
        console.error('Error details:', error); // Agregado para más detalles
        throw new Error('Failed to calculate playlist duration.');
    }
}


//test
app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
