const puppeteer = require('puppeteer');
const fs = require('fs');

async function run() {
    console.log('Starting puppeteer...');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('Navigating to local server...');
    await page.goto('http://localhost:5174/games/melodiq', { waitUntil: 'networkidle2' });
    
    // Create CDP session to take heap snapshots
    const client = await page.createCDPSession();
    
    console.log('Waiting 5 seconds for app to settle...');
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('Taking baseline snapshot...');
    await takeSnapshot(client, 'baseline.heapsnapshot');
    
    console.log('Waiting 30 seconds for leak to accumulate...');
    await new Promise(r => setTimeout(r, 30000));
    
    console.log('Taking target snapshot...');
    await takeSnapshot(client, 'target.heapsnapshot');
    
    await browser.close();
    console.log('Done!');
}

async function takeSnapshot(client, filename) {
    const stream = fs.createWriteStream(filename);
    let chunks = [];
    
    client.on('HeapProfiler.addHeapSnapshotChunk', ({ chunk }) => {
        stream.write(chunk);
    });
    
    await client.send('HeapProfiler.takeHeapSnapshot', {
        reportProgress: false,
        captureNumericValue: true,
        treatGlobalObjectsAsRoots: true
    });
    
    stream.end();
}

run().catch(console.error);
