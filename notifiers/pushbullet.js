const axios = require('axios');

function send(config, title, body, isCurrentlyUp) {
    console.log('Attempting to send Pushbullet notification...');
    axios.post('https://api.pushbullet.com/v2/pushes', {
        type: 'note',
        title: title,
        body: body
    }, {
        headers: {
            'Access-Token': config.api_key,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('Pushbullet notification sent successfully:', response.data);
    })
    .catch(error => {
        console.error('Error sending Pushbullet notification:', error.message);
    });
}

module.exports = {
    send: send
};