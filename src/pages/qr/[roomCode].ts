import QRCode from 'qrcode-svg'

export const prerender = false;

export async function GET({ params }: { params: any }) {
	const { roomCode } = params
	
	if (!roomCode) {
		return new Response('Not found', { status: 404 })
	}

	console.log(__SITE__)

	const qrcode = new QRCode({
		content: `${__SITE__}/s/${roomCode}`,
		padding: 4,
		width: 256,
		height: 256,
		color: '#000000',
		background: '#ffffff',
		ecl: 'M'
	})

	const svg = qrcode.svg()

	return new Response(svg, {
		headers: {
			'Content-Type': 'image/svg+xml'
		}
	})
}
