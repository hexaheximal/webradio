import { createElement, render } from '@picoweb/core';

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let sampleRate = 44100;
let chunkLength = 1;

const audioBuffer = audioCtx.createBuffer(2, sampleRate * chunkLength, sampleRate);
let source = null;

function hhmmss(_seconds) {
	let hours = Math.floor(_seconds / 3600);
	let minutes = Math.floor((_seconds - (hours * 3600)) / 60);
	let seconds = _seconds - (hours * 3600) - (minutes * 60);

	if (hours < 10) {hours = "0" + hours;}
	if (minutes < 10) {minutes = "0" + minutes;}
	if (seconds < 10) {seconds = "0" + seconds;}
	
	return hours + ":" + minutes + ":" + seconds;
}

function playBuffer(buffer, sampleRate) {
	for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
		const nowBuffering = audioBuffer.getChannelData(channel);
		
		for (let i = 0; i < audioBuffer.length; i++) {
			nowBuffering[i] = buffer[i];
		}
	}

	// Play buffer
	
	source = audioCtx.createBufferSource();
	source.buffer = audioBuffer;
	source.connect(audioCtx.destination);
	source.start();
}

function App() {
	let status = createElement("h1", "Click the button to start streaming audio.");
	let progress = createElement("progress");
	let progressText = createElement("h4", "");
	let song = createElement("h3", "");
	let button = createElement("button", "Play");
	let playing = false;
	
	let socket = null;
	
	progress.style.display = "none";
	
	function play() {
		playing = true;
		button.innerText = "Stop";
		
		status.innerText = "Connecting...";
		
		socket = new WebSocket(location.hostname == "localhost" ? "ws://localhost:3000" : "wss://hexaheximal.com/radio/stream");
		
		window.socket = socket;
		
		socket.binaryType = "arraybuffer";

		socket.addEventListener("message", (message) => {
			if (typeof message.data == "string") {
				const jsonData = JSON.parse(message.data);
				
				if (jsonData.type == "metadata") {
					song.innerText = jsonData.songName;
					sampleRate = jsonData.sampleRate;
					chunkLength = jsonData.chunkLength;
					status.innerText = "Waiting for stream...";
					return;
				}
				
				if (jsonData.type == "progress") {
					progress.value = jsonData.current;
					progress.max = jsonData.total;
					progressText.innerText = `${hhmmss(jsonData.current)} / ${hhmmss(jsonData.total)}`;
					progress.style.display = "block";
					//progress.innerText = `${jsonData.current} / ${jsonData.total}`;
					return;
				}
				
				if (jsonData.type == "end") {
					status.innerText = "Stream ended.";
					song.innerText = "";
					progressText.innerText = "";
					button.innerText = "Play";
					progress.style.display = "none";
					playing = false;
					return;
				}
				
				return;
			}
			
			status.innerText = "Streaming...";
			
			playBuffer(new Float32Array(message.data), sampleRate);
		});
		
		socket.addEventListener("close", () => {
			source.stop();
			playing = false;
			status.innerText = "Disconnected!";
			song.innerText = "";
			button.innerText = "Play";
			progress.style.display = "none";
			progressText.innerText = "";
		});
	}
	
	button.on("click", () => {
		if (!playing) {
			play();
			return;
		}
		
		socket.close();
	});
	
	return createElement("div", {}, [
		status,
		song,
		progress,
		progressText,
		button
	]);
}

render(document.getElementById("app"), createElement(App));
