const fs = require('fs');

async function getDocs() {
  const result = await fetch('https://registry.npmjs.org/opensheetmusicdisplay');
  const data = await result.json();
  const version = Object.keys(data.versions).reverse()[0];
  const latest = data.versions[version];
  console.log(latest.name, latest.version);
}
getDocs();
