/*
 @user: jm
 @date: 2016-03-02
 */

/**
 * Library for biotronik
 * proof of concept/prototype - code depicted here does not reflect anyone's standards
 */

/*global YUI */

'use strict';

YUI.add( 'biotronik-api',
    function( Y, NAME ) {
        const
            {formatPromiseResult} = require( 'dc-core' ).utils;

        dbg( "loading xdt stuff" );

        Y.log( "message", "level", NAME );

        //todo: store somewhere meaningful

        /**
         * @class Biotronik
         */
        let Biotronik = function() {
            this.name = NAME;
            let biotronik = this;

            const
                https = require( 'https' ),
                moment = require( 'moment' ),
                parseString = require( 'xml2js' ).parseString;

            async function getOptions( user ) {
                let
                    options = [],
                    [err, results] = await formatPromiseResult(
                        Y.doccirrus.mongodb.runDb( {
                            migrate: true,
                            user,
                            model: 'cardioconfiguration',
                            useCache: false,
                            action: 'get',
                            query: {}
                        } )
                    );
                if( err ) {
                    Y.log( `Error getting cardioconfiguration ${err.message}`, 'error', NAME );
                    throw( err );
                }
                if( !results.length ) {
                    throw new Error( "unable to fetch config" );
                }
                for( let res of results ) {

                    if( !res.cert || !res.certPass || !res.userId || !res.userSecret || !res.host || !res.port ) {
                        Y.log( `Incomplete biotronic config ${res._id} ${res.name || ''}`, 'warn', NAME );
                        continue;
                    }

                    let
                        exportClientCert = res.cert,
                        pfx = new Buffer( exportClientCert, "Base64" ),
                        auth = res.userId + ":" + res.userSecret,
                        passphrase = res.certPass,
                        {host, port} = res;

                    options = [
                        ...options, {
                            host,
                            port,
                            path: "/",
                            method: "GET",
                            auth: auth,
                            pfx: pfx,
                            passphrase: passphrase
                        }];
                }
                return options;
            }

            function parseXML( exportXml ) {
                return new Promise( ( resolve, reject ) => {
                    try {
                        parseString( exportXml, function( err, result ) {
                            if( err ) {
                                return reject( err );
                            }
                            result = result[Object.keys( result )[0]];

                            function toRealJSON( part ) {
                                var ret = {};
                                if( Array.isArray( part ) ) {
                                    part.forEach( element => {
                                        if( element.$ && element.$.name ) {
                                            let val = {},
                                                key = element.$.name;
                                            if( element._ ) {
                                                switch( element.$.type ) {
                                                    case "DateTime":
                                                        val = moment( element._, "YYYYMMDD-HHmmssZ" ).toDate();
                                                        break;
                                                    case "application/pdf":
                                                        val = new Buffer( element._, element.$.encoding );
                                                        break;
                                                    case "Numeric":
                                                        val = ( typeof element._ === 'number' ) ?  element._ : +(element._);
                                                        // NOTICE: When changing this conversion of "attr:unit" => "*_UNIT", change in cardio-api => getMedDataItems
                                                        if( element.$.unit ) {
                                                            if( ret[key + '_UNIT'] ) {
                                                                if( !Array.isArray( ret[key + '_UNIT'] ) ) {
                                                                    ret[key + '_UNIT'] = [ret[key + '_UNIT']];
                                                                }
                                                                ret[key + '_UNIT'].push( element.$.unit );
                                                            } else {
                                                                ret[key + '_UNIT'] = element.$.unit;
                                                            }
                                                        }
                                                        break;
                                                    default:
                                                        val = element._;
                                                }
                                            }
                                            if( element.section ) {
                                                Object.assign( val, toRealJSON( element.section ) );
                                            }
                                            if( element.value ) {
                                                Object.assign( val, toRealJSON( element.value ) );
                                            }
                                            if( ret[key] ) {
                                                if( !Array.isArray( ret[key] ) ) {
                                                    ret[key] = [ret[key]];
                                                }
                                                ret[key].push( val );
                                            } else {
                                                ret[key] = val;
                                            }
                                        }
                                    } );
                                } else if( 'object' === typeof part ) {
                                    Object.keys( part ).forEach( key => {
                                        part[key] = toRealJSON( part[key] );
                                    } );
                                }
                                return ret;
                            }

                            if( result.$ ) {
                                result.meta = result.$;
                                delete result.$;
                            }
                            var dataSet = result.dataset[0].section;
                            result.dataset = toRealJSON( dataSet );

                            //trying to cut signature down to more managable size/storability
                            try {
                                delete result.Signature[0].$;
                                result.Signature = result.Signature[0];
                                result.Signature.SignedInfo = result.Signature.SignedInfo[0];
                                result.Signature.SignedInfo.CanonicalizationMethod = result.Signature.SignedInfo.CanonicalizationMethod[0].$.Algorithm;
                                result.Signature.SignedInfo.SignatureMethod = result.Signature.SignedInfo.SignatureMethod[0].$.Algorithm;
                                result.Signature.SignedInfo.Reference = result.Signature.SignedInfo.Reference[0];
                                result.Signature.SignedInfo.Reference.URI = result.Signature.SignedInfo.Reference.$.URI;
                                delete result.Signature.SignedInfo.Reference.$;
                                result.Signature.SignedInfo.Reference.Transforms = result.Signature.SignedInfo.Reference.Transforms.map( transform => {
                                    return transform.Transform[0].$.Algorithm;
                                } );
                                result.Signature.SignedInfo.Reference.DigestMethod = result.Signature.SignedInfo.Reference.DigestMethod[0].$.Algorithm;
                                result.Signature.SignedInfo.Reference.DigestValue = result.Signature.SignedInfo.Reference.DigestValue[0];
                                result.Signature.SignatureValue = result.Signature.SignatureValue[0];
                                result.Signature.KeyInfo = result.Signature.KeyInfo[0];
                                result.Signature.KeyInfo.X509Data = result.Signature.KeyInfo.X509Data[0];
                                result.Signature.KeyInfo.X509Data.X509SubjectName = result.Signature.KeyInfo.X509Data.X509SubjectName[0];
                                result.Signature.KeyInfo.X509Data.X509Certificate = result.Signature.KeyInfo.X509Data.X509Certificate[0];
                            } catch( err ) {
                                Y.log( `Error due to unknown signature properties, deleting signature. ${err.message}`, 'error', NAME );
                                delete result.Signature;
                            }
                            resolve( result );
                        } );
                    } catch( err ) {
                        Y.log( `Error parsing XML ${err.message}`, 'error', NAME );
                        reject( err );
                    }
                } );
            }

            function getJSONfromXML( exportXml, cb ) {
                const Iconv = require( 'iconv' ).Iconv;
                let converted;

                if( 'string' !== typeof exportXml ) {
                    //try to encode to utf-8 from utf-16 buffer
                    try {
                        let iconv = new Iconv( 'UTF-16', 'UTF-8' );
                        converted = iconv.convert( exportXml );
                    } catch( ex ) {
                        converted = Object.assign( {}, exportXml );
                    }
                }

                parseXML( exportXml ).then( result => cb( null, result ) ).catch( () => {
                    Y.log( "retrying with UTF-16 encoding..", 'warn', NAME );
                    parseXML( converted ).then( result => cb( null, result ) ).catch( ( err ) => cb( err ) );
                } );
            }

            async function getExportJSONById( id, option, cb ) {
                let [err, exportXml] = await formatPromiseResult(
                    fetchData( option, '/rest/api/exports/' + id )
                );
                if( err ) {
                    Y.log( `Error getting XML record by id ${id} for ${option.host} : ${err.message}`, 'error', NAME );
                    return cb( err );
                }
                getJSONfromXML( exportXml, cb );
            }

            function fetchData( option, path ) {
                return new Promise( ( resolve, reject ) => {
                    option.path = path;
                    let
                        chunks = "",
                        req;

                    try {
                        req = https.request( option, function( res ) {
                            res.on( "data", function( chunk ) {
                                chunks += chunk;
                            } );
                            res.on( "end", function() {
                                if( res.statusCode === 200 ) {
                                    let response;
                                    try {
                                        response = JSON.parse( chunks );
                                    } catch( e ) {
                                        response = chunks;
                                    }
                                    resolve( response );
                                } else {
                                    reject( new Error( `Error getting ${option.path} : ${res.statusCode}` ) );
                                }
                            } );
                        } );
                        req.on( "error", function( err ) {
                            reject( err );
                        } );
                        req.end();
                    } catch( e ) {
                        reject( e );
                    }
                } );
            }

            async function getExportList( user, cb ) {
                let results = [],
                    [err, options] = await formatPromiseResult(
                        getOptions( user )
                    );
                if( err ) {
                    return cb( err );
                }

                for( let option of options ) {
                    let result;
                    [err, result] = await formatPromiseResult(
                        fetchData( option, '/rest/api/exports' )
                    );
                    if( err ) {
                        Y.log( `Error getting XML data ${err.message}`, 'error', NAME );
                    } else if( result ) {
                        results = [
                            ...results, {
                                option,
                                result
                            }];
                    }
                }
                cb( null, results );
            }

            biotronik.getExportList = getExportList;
            biotronik.getExportJSONById = getExportJSONById;
            biotronik.getJSONfromXML = getJSONfromXML;

        };

        /**
         * @method dbg
         * @param {String} msg
         */
        function dbg( msg ) {
            Y.log( "\x1b[90mbiotronik-api debug: " + msg + "\x1b[0m", "debug", NAME );
        }

        Y.namespace( 'doccirrus.api' ).biotronik = new Biotronik();

    },
    '0.0.1', {requires: []}
);
