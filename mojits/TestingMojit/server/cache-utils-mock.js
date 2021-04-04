/**
 * User: pi
 * Date: 05.12.17  12:42
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

function mockCacheUtils( Y ) {
    const
        dataMap = new Map(),
        original = Y.doccirrus.cacheUtils.adapter;
    Y.doccirrus.cacheUtils.adapter._set = Y.doccirrus.cacheUtils.adapter.set;
    Y.doccirrus.cacheUtils.adapter.set = function( params, callback ) {
        const
            {key, data} = params;
        dataMap.set( key, data );
        callback( null, 'OK' );
    };
    Y.doccirrus.cacheUtils.adapter._get = Y.doccirrus.cacheUtils.adapter.get;
    Y.doccirrus.cacheUtils.adapter.get = function( params, callback ) {
        const
            {key} = params;
        callback( null, dataMap.get( key ) );
    };

    Y.doccirrus.cacheUtils.adapter._del = Y.doccirrus.cacheUtils.adapter.del;
    Y.doccirrus.cacheUtils.adapter.del = function( params, callback ) {
        const
            {key} = params;

        let
            result = [];

        if( Array.isArray( key ) ) {
            key.forEach( item => {
                result.push( dataMap.delete( item ) );
            } );
        } else {
            result.push( dataMap.delete( key ) );
        }

        callback( null, result.filter( Boolean ).length );
    };

    Y.doccirrus.cacheUtils.adapter._keys = Y.doccirrus.cacheUtils.adapter.keys;
    Y.doccirrus.cacheUtils.adapter.keys = function( params, callback ) {
        const
            {key} = params;
        const pattern = new RegExp( key.replace( /\*\*/g, '*' ).replace( /\*/g, '.*?' ) ),
            keys = [...dataMap.keys()];
        callback( null, keys.filter( _key => pattern.test( _key ) ) );
    };
    return original;

}

module.exports = mockCacheUtils;