const roomCode = 'GUIJ'
const qrcode = new QRCode(\{
    content: location.host + '/client/?room=' + roomCode,
    padding: 4,
    width: 256,
    height: 256,
    color: '#000000',
    background: '#ffffff',
    ecl: 'M'
\})

const svg = qrcode.svg()
document.querySelector('.room-qr').innerHTML = svg