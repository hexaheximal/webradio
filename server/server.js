import { WebSocketServer } from 'ws';
import wav from 'node-wav';
import fs from 'fs';

console.log("Loading audio file...");

let buffer = fs.readFileSync("test.wav");
let result = wav.decode(buffer);
const chunkLength = 1;

console.log(`Sample rate: ${result.sampleRate}`);

const wss = new WebSocketServer({
	port: 3000,
	perMessageDeflate: {
		zlibDeflateOptions: {
			// See zlib defaults.
			chunkSize: 1024,
			memLevel: 7,
			level: 3
		},
		zlibInflateOptions: {
			chunkSize: 10 * 1024
		},
		// Other options settable:
		clientNoContextTakeover: true, // Defaults to negotiated value.
		serverNoContextTakeover: true, // Defaults to negotiated value.
		serverMaxWindowBits: 10, // Defaults to negotiated value.
		// Below options specified as default values.
		concurrencyLimit: 10, // Limits zlib concurrency for perf.
		threshold: 1024 // Size (in bytes) below which messages
		// should not be compressed if context takeover is disabled.
	}
});

wss.on("connection", (ws) => {
	//console.log("Connected to client!");
	
	let chunk = 0;
	
	const interval = setInterval(() => {
		if (chunk > result.channelData[0].length) {
			//console.log("Finished!");
			ws.send(JSON.stringify({type: "end"}));
			clearInterval(interval);
			return;
		}
		
		ws.send(JSON.stringify({type: "progress", current: Math.floor(chunk / result.sampleRate), total: Math.floor(result.channelData[0].length / result.sampleRate)}));
		
		//console.log(`${chunk / result.sampleRate} / ${result.channelData[0].length / result.sampleRate}`);
		
		// TODO: stereo support
		
		ws.send(result.channelData[0].slice(chunk, chunk + (result.sampleRate * chunkLength)));
		chunk += result.sampleRate * chunkLength;
	}, 1000 * chunkLength);

	/*ws.on("message", () => {
		ws.send(`Random number: ${Math.random()}`);
	});*/
	
	ws.on("close", () => {
		clearInterval(interval);
	});
	
	ws.send(JSON.stringify({type: "metadata", songName: "SuperTux Advance - Emotional Deluge", sampleRate: result.sampleRate, chunkLength}));
});

console.log("WebSocket Server listening on port 3000");
