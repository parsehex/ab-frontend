export function respawnHook(e) {
	if (!game || game.gameType === null) return; // Game isn't active
	if (!e.shiftKey) return;
	if (e.keyCode < 49 || e.keyCode > 53) return; // not 1-5 keys

	const chatinput = document.getElementById('chatinput');
	if (chatinput && chatinput === document.activeElement) return; // Chat is active

	const me = Players.getMe();
	let ship = '';
	const { keyCode } = e;
	if (keyCode === 49) ship = '1';
	else if (keyCode === 50) ship = '2';
	else if (keyCode === 51) ship = '3';
	else if (keyCode === 52) ship = '4';
	else if (keyCode === 53) ship = '5';
	else if (me.type && !me.spectate) ship = me.type;
	else return;

	Network.sendCommand('respawn', ship + '');
	e.stopPropagation();
	return true;
};
