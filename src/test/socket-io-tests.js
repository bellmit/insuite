/**
 * User: pi
 * Date: 22/04/16  16:07
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global io */
"use strict";

/**
 * Test via browser:
 */

// 1. Go to socket.io or any page where you can have "IO"
// ----- Login part
var
    socket = io('http://ciprcs.intra.doc-cirrus.com/'); // server url


socket.on('login', function(){ console.warn('get message', arguments); });
socket.emit('login', {tenantId:'0', username:'QArzt1188', password:'7dd9282ef9df7182b03f4ffd75f7643663ce30d34486142ec861f4a99858b1ab50822b273e85523b3e11c203f3c790e3285bc23be375fb6c557461e3d579e498'}); // password hash for X123123
// ------

/// ----- Subscription part
socket.on('SUBSCRIBE_COLLECTION', function( message ){ console.warn('collection changed', message ); });
socket.emit('SUBSCRIBE_COLLECTION', {collection:'employee'});
//socket.emit('SUBSCRIBE_COLLECTION', {collection:'employee', documentId: '56fd390b976c7397085c1d8d'}); //subscribe specific Id
socket.emit('SUBSCRIBE_COLLECTION', {collection:'identity'});
socket.emit('SUBSCRIBE_COLLECTION', {collection:'role'});
// ------
// 2. Go to specified server. e.g. prcs.ci.dc, login, and change the collections.

// ------ release subscription
socket.emit('RELEASE_SUBSCRIPTION', {collection:'identity'});
// ------
// 3. Go to UI and change the collection. "collection changed" should not be shown.

// ------ logout
socket.emit('logout');
// ------




/**
 * Test via node shell:
 */
// 1. Go to any place where node module "socket.io-client" is available and run node
socket = require( "socket.io-client" )('http://ciprcs.intra.doc-cirrus.com/');
// rest is the same



/**
 * Configurable script
 */

// 1. change values
var
    _socket,
    server = 'http://ciprcs.intra.doc-cirrus.com/',
    isBrowser = false,
    tenantId = '0',
    username = 'QArzt1188',
    password = '7dd9282ef9df7182b03f4ffd75f7643663ce30d34486142ec861f4a99858b1ab50822b273e85523b3e11c203f3c790e3285bc23be375fb6c557461e3d579e498', // password hash for X123123
    subscription = [
        {
            collection:'employee',
            documentId: '56fd390b976c7397085c1d8d'
        },
        {
            collection:'identity'
        },
        {
            collection:'role'
        }
    ];
// 2. init functions
function login(){
    if(isBrowser){
        _socket = io(server);
    } else {
        _socket = require( "socket.io-client" )(server);
    }
    _socket.on('login', function(){ console.warn('get message', arguments); });
    _socket.emit('login', {tenantId: tenantId, username: username, password: password});
}
function subscribe(){
    _socket.on('SUBSCRIBE_COLLECTION', function( message ){ console.warn('collection changed', message); });
    subscription.forEach( function(data){
        _socket.emit('SUBSCRIBE_COLLECTION', data);
    });
}
function logout(){
    _socket.emit('logout');
}
function releaseAll(){
    subscription.forEach( function(data){
        _socket.emit('RELEASE_SUBSCRIPTION', data);
    });
}

// 3. use these functions
login();
subscribe();
releaseAll();
logout();