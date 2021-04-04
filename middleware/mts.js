"use strict";

var
    db = require( 'dc-core' ).db,
    dcauth = require( 'dc-core' ).auth,
    databases,
    initialDatabases;

function checkMTS( req, res, next ) {

    if( dcauth.isVPRC() ) {
        if( req && req.url ) {
            // list of public routes allowed for MTS  cleanup MOJ-13542
            if( req.url.startsWith( '/3/statuscheck' ) ||
                req.url.startsWith( '/3/test/:toggleLogging' ) ) {
                return next();
            }
        }
        let host = req.headers.host;
        if( !host ) {
            return res.sendStatus( 505 );
        }

        let tenantId = dcauth.getTenantFromHost( host );

        if( !databases.length ) {
            databases = [].concat( initialDatabases );
            db.getDbList( function( err, result ) {
                if( err ) {
                    return res.sendStatus( 404 );
                }
                if( result && result.databases ) {
                    result.databases.forEach( function( db ) {
                        databases.push( db.name );
                    } );
                    databases.push( 'insuite' );

                    if( databases.some( function( item ) {
                            return tenantId.toString() === item;
                        } ) ) {
                        return next();
                    } else {
                        return res.sendStatus( 404 );
                    }
                } else {
                    return res.sendStatus( 404 );
                }
            } );
        } else {
            if( databases.some( function( item ) {
                    return tenantId.toString() === item;
                } ) ) {
                return next();
            } else {
                return res.sendStatus( 404 );
            }
        }
    } else {
        return next();
    }
}

module.exports = function getMiddleware( dbs ) {
    initialDatabases = dbs;
    databases = [];
    return checkMTS;
};