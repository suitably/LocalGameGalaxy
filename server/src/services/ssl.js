const forge = require('node-forge');
const crypto = require('crypto');

function getHttpsOptions(config) {
    let pem;

    if (config.ssl && config.ssl.key && config.ssl.cert) {
        console.log('Loading existing SSL certificate...');
        pem = {
            private: config.ssl.key,
            cert: config.ssl.cert
        };
    } else {
        console.log('Generating standardized RSA certificate (node-forge)...');
        const pki = forge.pki;
        const keys = pki.rsa.generateKeyPair(2048);
        const cert = pki.createCertificate();
        cert.publicKey = keys.publicKey;
        // RANDOM SERIAL to avoid browser errors (SEC_ERROR_REUSED_ISSUER_AND_SERIAL)
        cert.serialNumber = crypto.randomBytes(16).toString('hex');
        cert.validity.notBefore = new Date();
        cert.validity.notAfter = new Date();
        cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10); // 10 years
        const attrs = [
            { name: 'commonName', value: 'MelodiqHelper' },
            { name: 'countryName', value: 'US' },
            { shortName: 'ST', value: 'Virginia' },
            { name: 'organizationName', value: 'Melodiq' },
            { shortName: 'OU', value: 'Helper' }
        ];
        cert.setSubject(attrs);
        cert.setIssuer(attrs);
        cert.setExtensions([
            { name: 'basicConstraints', cA: true },
            { name: 'keyUsage', keyCertSign: true, digitalSignature: true, nonRepudiation: true, keyEncipherment: true, dataEncipherment: true },
            { name: 'extKeyUsage', serverAuth: true, clientAuth: true, codeSigning: true, emailProtection: true, timeStamping: true },
            { name: 'nsCertType', client: true, server: true, email: true, objsign: true, sslCA: true, emailCA: true, objCA: true }
        ]);
        // Self-sign with SHA256
        cert.sign(keys.privateKey, forge.md.sha256.create());

        pem = {
            private: pki.privateKeyToPem(keys.privateKey),
            cert: pki.certificateToPem(cert)
        };

        // Save to config
        config.ssl = {
            key: pem.private,
            cert: pem.cert
        };
        console.log('New SSL certificate generated and saved.');
    }

    return {
        key: pem.private,
        cert: pem.cert,
        minVersion: 'TLSv1',
        ciphers: 'ALL:!EXPORT:!LOW:!aNULL:!eNULL:!SSLv2'
    };
}

module.exports = {
    getHttpsOptions
};
