const sjcl = require('./sjcl');

const aesParams = {
    ks: 256,
    mode: 'ccm',
    cipher: 'aes'
};

const doccirrus = {
    genkey: () => {
        var pair = sjcl.ecc.elGamal.generateKeys(256, 0);
        var publicKey = pair.pub.get();
        var secret = pair.sec.get();

        return {
            publicKey: sjcl.codec.base64.fromBits(publicKey.x.concat(publicKey.y)),
            secret: sjcl.codec.base64.fromBits(secret)
        };
    },

    getSharedSecret: (mySecret, theirPublicKey) => {
        var pub = new sjcl.ecc.elGamal.publicKey(
            sjcl.ecc.curves.c256,
            sjcl.codec.base64.toBits(theirPublicKey)
        );

        var sec = new sjcl.ecc.elGamal.secretKey(
            sjcl.ecc.curves.c256,
            sjcl.ecc.curves.c256.field.fromBits(sjcl.codec.base64.toBits(mySecret))
        );

        return sec.dh(pub); //sjcl.codec.base64.fromBits(sec.dh(pub));
    },

    stringifySecret( sec ){
        return sjcl.codec.base64.fromBits(sec);
    },

    encrypt: (key, str) => {
        return sjcl.encrypt(
            key,
            str,
            aesParams, {}
        );
    },

    encryptDCJson: (key, json) => {
        const jsonText = JSON.stringify(json);
        const toEncryptText = JSON.stringify({
            d: Date.now(),
            m: jsonText
        });
        return doccirrus.encrypt(key, toEncryptText);
    },

    decrypt: (key, str) => {
        return sjcl.decrypt(
            key,
            str,
            aesParams, {}
        );
    },

    sha1hash: (input) => {
        return sjcl.codec.hex.fromBits(sjcl.hash.sha1.hash(input));
    }
};

module.exports = doccirrus;