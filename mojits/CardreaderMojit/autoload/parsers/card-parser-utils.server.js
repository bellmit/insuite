/**
 * User: do
 * Date: 16/02/18  12:53
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/

YUI.add( 'card-parser-utils', function( Y/*, NAME*/ ) { // eslint-disable-line no-undef

    /**
     * @modul doccirrus.cardreader.parsers.utils
     */

    const
        DCError = Y.doccirrus.commonerrors.DCError;

    /**
     * Cuts string to specified length.
     * @param {String} str
     * @param {Number} len
     * @returns {String}
     */
    function cutToLength( str, len ) {
        if( 'string' === typeof str ) {
            return str.substr( 0, len );
        }
        return '';
    }

    function mapGender( val ) {
        switch( val ) {
            // relates to the EGKMappingService class in Card Reader
            // case '1':
            //     return 'MALE';
            // case '2':
            //     return 'FEMALE';
            // case '-1':
            //     return 'UNKNOWN';
            case 'M':
                return 'MALE';
            case 'F':
                return 'FEMALE';
            case 'W':
                return 'FEMALE';
            case 'X':
                return 'UNDEFINED';
            default:
                return 'UNKNOWN';
        }
    }

    function mapTalk( val ) {
        return ('F' === val || 'W' === val) ? 'MS' : 'MR';
    }

    function getKbvDob( str ) {
        var
            parsed = /(\d\d\d\d)(\d\d)(\d\d)/.exec( str );

        if( null === parsed || 4 > parsed.length ) {
            return '';
        }
        return parsed[3] + '.' +
               parsed[2] + '.' +
               parsed[1];
    }

    function getPrivateInsurance( name ) {
        return new Promise( ( resolve, reject ) => {
            Y.doccirrus.api.catalog.getPKVKT( {
                originalParams: {
                    name
                },
                callback: ( err, result ) => {
                    if( err ) {
                        reject( err );
                        return;
                    }
                    resolve( {data: result.data && result.data[0], feedback: []} );
                }
            } );
        } );
    }

    function checkAndGetInsuranceData( user, iknr ) {
        return new Promise( ( resolve, reject ) => {
            const
                catalog = Y.doccirrus.api.catalog.getCatalogDescriptor( {
                    actType: '_CUSTOM',
                    short: 'SDKT'
                } );

            if( !catalog ) {
                throw Error( 'could not get catalog' );
            }

            Y.doccirrus.api.catalog.verifyKT( {
                user,
                originalParams: {
                    ik: iknr,
                    ktab: '00',
                    catalog: catalog.filename
                },
                callback: ( err, result ) => {
                    if( err ) {
                        reject( err );
                        return;
                    }
                    const
                        newResult = {
                            data: result.data && result.data[0],
                            feedback: []
                        };

                    if( 1 !== result.code ) {
                        newResult.feedback.push( {
                            code: result.status.code,
                            message: (new DCError( result.status.code )).message,
                            level: 'ERROR' // TODO?
                        } );
                    }

                    resolve( newResult );
                }
            } );
        } );
    }

    function getTerminalTypeFromDeviceType( deviceType ) {
        let terminalType = 'unknown';
        switch( deviceType ) {
            case 'stationary':
                terminalType = 'fixed';
                break;
            case 'mobile':
                terminalType = 'mobile';
                break;
        }
        return terminalType;
    }

    function hexStrToBuffer( hexStr ) {
        var arr = [];
        let cur = '';
        for( let i = 0; i < hexStr.length; i++ ) {
            cur += hexStr[i];
            if( cur.length === 2 ) {
                arr.push( parseInt( cur, 16 ) );
                cur = '';
            }
        }
        return Buffer.from( arr );
    }

    /**
     *  KVK is encoded in DIN 66003 (1974) 7-Bit-Code, Deutsche Referenzversion (mit Umlauten)
     *  Here 8 characters of ASCII are changed to umlauts. See following mapping.
     *
     * @param char
     * @returns String
     */
    const DIN66003_Mapping = {
        '[': 'Ä',
        '\\': 'Ö',
        ']': 'Ü',
        '{': 'ä',
        '|': 'ö',
        '}': 'ü',
        '~': 'ß'
    };

    function fixCharKvkChar( char ) {
        if( DIN66003_Mapping[char] ) {
            return DIN66003_Mapping[char];
        }
        return char;
    }

    function simpleAsn1Parser( buff, tags ) {
        const
            result = {},
            findTag = b => {
                return tags.find( el => el.tag === b );
            };
        let currentProp = null;

        const firstTagIndex = buff.indexOf( tags[0].tag );

        for( const b of (-1 === firstTagIndex ? buff : buff.slice( firstTagIndex, buff.length )) ) {
            let nextTag = findTag( b );
            if( nextTag && !result[nextTag.propName] ) {
                currentProp = result[nextTag.propName] = [];
            } else if( currentProp ) {
                currentProp.push( b );
            }
        }
        Object.keys( result ).forEach( key => {
            result[key] = Array.from( Buffer.from( result[key].splice( 1 ) ).toString() ).map( fixCharKvkChar ).join( '' );
        } );
        return result;
    }

    function parseStatusDetails( statusRawData ) {
        const
            tags = [
                {tag: Number( 0x91 ), propName: 'Einlesedatum'},
                {tag: Number( 0x92 ), propName: 'Zulassungsnummer'},
                {tag: Number( 0x93 ), propName: 'Prüfsumme'}
            ],
            details = statusRawData && statusRawData.details;
        if( !details ) {
            return null;
        }
        const
            buff = hexStrToBuffer( details ),
            result = simpleAsn1Parser( buff, tags );

        return result;
    }

    Y.namespace( 'doccirrus.cardreader.parsers' ).utils = {
        checkAndGetInsuranceData,
        getPrivateInsurance,
        cutToLength,
        mapGender,
        mapTalk,
        getKbvDob,
        getTerminalTypeFromDeviceType,
        simpleAsn1Parser,
        parseStatusDetails,
        NAME_MAX_LENGTH: 45,
        NAME_EXT_MAX_LENGTH: 20,
        STREET_MAX_LENGTH: 46,
        HOUSENO_MAX_LENGTH: 9,
        ZIP_MAX_LENGTH: 10,
        CITY_MAX_LENGTH: 40,
        COUNTRYCODE_MAX_LENGTH: 3,
        ADDON_MAX_LENGTH: 40,
        POSTBOX_MAX_LENGTH: 8,
        INSURANCE_NAME_MAX_LENGTH: 45

    };

}, '0.0.1', {
    lang: ['en', 'de'],
    requires: ['catalog-api', 'dccommonerrors']
} );
