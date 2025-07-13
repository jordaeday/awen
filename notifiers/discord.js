const axios = require('axios');

function send(config, title, body, isCurrentlyUp) {
    console.log('Attempting to send Discord notification...');
    axios.post(config.webhook_url, {
        content: body,
        username: 'Awen Website Monitor',
        embeds: [{
            title: title,
            description: body,
            color: isCurrentlyUp ? 3066993 : 15158332 // Green for up, Red for down
        }]
    })
    .then(response => {
        console.log('Discord notification sent successfully:', response.data);
    })
    .catch(error => {
        console.error('Error sending Discord notification:', error.message);
    });
}

module.exports = {
    send: send
};