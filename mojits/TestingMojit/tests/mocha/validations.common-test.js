/**
 * User: abhijit.baldawa
 * Date: 09.09.19  14:51
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*global Y, it, describe */

const proxyAddressFormats = [
    {proxy: 'http://user:password@example.com:8080', resultText: 'Accepts', result: true},
    {proxy: 'http://user:*pswD124@10.10.10.10:8080', resultText: 'Accepts', result: true},
    {proxy: 'http://squid.intra.doc-cirrus.com:3128', resultText: 'Accepts', result: true},
    {proxy: 'http://user:password@example.c:8080', resultText: 'Rejects', result: false},
    {proxy: 'http://user:*pswD124@10.10.10:8080', resultText: 'Rejects', result: false},
    {proxy: 'http://user:*pswD124@myexample.c1m:8', resultText: 'Rejects', result: false}
];

const kNumberChFormats = [
    {proxy: '123456789', resultText: 'Accepts', result: true},
    {proxy: '123ABC', resultText: 'Accepts', result: true},
    {proxy: 12345, resultText: 'Accepts', result: true},
    {proxy: [1, 2, 3], resultText: 'Rejects', result: false},
    {proxy: {1: "1234"}, resultText: 'Rejects', result: false},
    {proxy: "", resultText: 'Rejects', result: false},
    {proxy: 0, resultText: 'Accepts', result: true}
];

describe( `Test Doc cirrus validation methods inside 'validations.common.js'`, function() {
    describe( `#Y.doccirrus.validations.common._Admin_T_proxy`, function() {
        proxyAddressFormats.forEach( ( proxyObj ) => {
            it( `${proxyObj.resultText} proxy address input '${proxyObj.proxy}'`, function() {
                Y.doccirrus.validations.common._Admin_T_proxy( proxyObj.proxy ).should.equal( proxyObj.result );
            } );
        } );
    } );

    describe( `#Y.doccirrus.validations.common.kNumber_CH`, function() {
        kNumberChFormats.forEach( ( kNumObj ) => {
            it( `${kNumObj.resultText} K-number (CH) input '${kNumObj.proxy}' of type ${(Array.isArray( kNumObj.proxy ) ? "Array" : typeof (kNumObj.proxy))}`, function() {
                Y.doccirrus.validations.common.kNumber_CH( kNumObj.proxy ).should.equal( kNumObj.result );
            } );
        } );
    } );
} );