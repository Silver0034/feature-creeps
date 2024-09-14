import { useEffect } from 'react'
import { Handshake } from '@utilities/web-socket'

const SimplePeerScript = () => {
	useEffect(() => {
		// Create a script element
		const script = document.createElement('script')
		script.src = '/node_modules/simple-peer/simplepeer.min.js'
		script.async = true

		// Append the script to the document body
		document.body.appendChild(script)

		// Function to generate QR code
		const run = () => {
			const p = new SimplePeer({
				initiator: location.hash === '#1',
				trickle: false
			})

			let i = 1
			function sendMsg() {
				p.send('Message ' + i++)
			}

			// Set up the WebSocket handshake connection.
			const handshake = new Handshake()
			function customHandler(event) {
				p.signal(JSON.parse(event.data))
				console.log(`Received message from server: ${event.data}`)
			}
			handshake.setHandleMessage(customHandler)
			handshake.connect()

			// Handle errors.
			p.on('error', (err) => console.log('error', err))
			// Handle handshakes.
			p.on('signal', (data) => {
				console.log('SIGNAL', JSON.stringify(data))
				handshake.send(JSON.stringify(data))
			})
			// Establish connection.
			p.on('connect', () => {
				console.log('CONNECT')
				p.send('whatever' + Math.random())
				if (location.hash === '#1') {
					setInterval(sendMsg, 1000)
				}
			})
			// Receive data.
			p.on('data', (data) => {
				console.log('data: ' + data)
			})
		}

		// Generate QR code after the script is loaded
		script.onload = run

		// Cleanup the script when the component unmounts
		return () => {
			document.body.removeChild(script)
		}
	}, [])

	return (
		<>
			<form>
				<textarea id='incoming'></textarea>
				<button type='submit'>submit</button>
			</form>
			<pre id='outgoing'></pre>
			<video src='' id='video'></video>
		</>
	)
}

export default SimplePeerScript
