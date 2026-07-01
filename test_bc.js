const bc1 = new BroadcastChannel('test');
const bc2 = new BroadcastChannel('test');
bc2.onmessage = (e) => console.log('bc2 received:', e.data);
bc1.postMessage('hello');
setTimeout(() => console.log('done'), 100);
