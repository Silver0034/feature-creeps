import { useEffect } from 'react'

const RoomCodeQR = () => {
	useEffect(() => {
		// Create a script element
		const script = document.createElement('script')
		script.src = '/node_modules/qrcode-svg/dist/qrcode.min.js'
		script.async = true

		// Append the script to the document body
		document.body.appendChild(script)

		// Function to generate QR code
		const generateQRCode = (roomCode) => {
			const qrcode = new window.QRCode({
				content: location.href + 'join/?r=' + roomCode,
				padding: 4,
				width: 256,
				height: 256,
				color: '#000000',
				background: '#ffffff',
				ecl: 'M'
			})
			document.querySelector('.room-code-qr').innerHTML = qrcode.svg()
		}

		// Generate QR code after the script is loaded
		const roomCode = 'GUIJ'
		script.onload = generateQRCode(roomCode)

		// Cleanup the script when the component unmounts
		return () => {
			document.body.removeChild(script)
		}
	}, [])

	return (
		<>
			<div className='room-code-qr'></div>
		</>
	)
}

export default RoomCodeQR
