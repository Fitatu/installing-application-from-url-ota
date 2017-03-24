var app = require('express')();

function onListeningSuccess() {
    console.log('Server starting: SUCCESS');
}

app.get('/', function (req, res) {
    res.send('Server listening...');
});

app.get('/fitatu.ipa', function (req, res) {
    res.setHeader("Content-Type", 'application/octet-stream');
    res.sendFile(__dirname + '/apps/fitatu.ipa');
});

app.get('/manifest.plist', function (req, res) {
    res.setHeader("Content-Type", 'text/plain');
    res.sendFile(__dirname  + '/manifest.plist');
});

app.listen(3000, onListeningSuccess);
