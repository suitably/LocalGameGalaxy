const testUrl = (val) => {
    try {
        if (val.includes('token=')) {
            const parseUrl = val.startsWith('http') ? val : `http://${val}`;
            const urlObj = new URL(parseUrl);
            const extractedToken = urlObj.searchParams.get('token');
            
            if (extractedToken) {
                // mock setToken
                console.log("SET TOKEN:", extractedToken);
                urlObj.searchParams.delete('token');
                
                if (val.startsWith('http')) {
                    val = urlObj.toString();
                } else {
                    val = urlObj.toString().replace(/^http:\/\//, '');
                }
                val = val.replace(/\?$/, '').replace(/\/$/, '');
            }
        }
    } catch (err) {}
    console.log("FINAL URL:", val);
};

testUrl("http://192.168.0.173:3001/?token=12345");
testUrl("https://192.168.0.173:3001/?token=12345");
testUrl("192.168.0.173:3001/?token=12345");
testUrl("192.168.0.173:3001/?token=12345&foo=bar");
