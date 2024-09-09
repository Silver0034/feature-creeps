// Get the game state value from the session cookie
export function getGameStateValue() {
	let gameState = 0
	if (!document.cookie) return gameState
	const cookieArray = document.cookie.split('; ')
	cookieArray.forEach((cookie) => {
		const [name, value] = cookie.split('=')
		if (name === 'gameState') {
			gameState = parseInt(value)
		}
	})
	return gameState
}

export function emitGameStateChangeEvent() {
	const gameState = getGameStateValue()
	document.dispatchEvent(
		new CustomEvent('gameStateChange', { detail: gameState })
	)
}

export function setGameStateValue(value: number) {
	document.cookie = `gameState=${value}`
	emitGameStateChangeEvent()
}

export function refreshView() {
	const gameState = getGameStateValue()
	const views = document.querySelectorAll('.view') as NodeListOf<HTMLElement>
	if (!views) return
	views.forEach((view) => {
		view.style.display = 'none'
		const key = parseInt(view.getAttribute('data-view-key') || '0')
		if (key === gameState) view.style.display = 'block'
	})
}
document.addEventListener('gameStateChange', refreshView)
refreshView()
