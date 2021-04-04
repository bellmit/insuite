/**
 * User: as
 * Date: 17.05.18  18:17
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

module.exports = (Y, NAME) => ({
    getCache(key){
        return new Promise( resolve => {
            if( Y.doccirrus.cacheUtils.dataCache.isClientConnected() ) {
                Y.doccirrus.cacheUtils.dataCache.getData( {key}, ( err, res ) => {
                    if( err ) {
                        Y.log( `Failed to get ${key}: ${err}`, 'debug', NAME );
                        resolve( null );
                    } else {
                        resolve( res || null );
                    }
                } );
            } else {
                Y.log( `Failed to get ${key}: Redis not connected`, 'debug', NAME );
                resolve( null );
            }
        } );
    },
   setCache( key, data ){
        return new Promise( resolve => {
            if( Y.doccirrus.cacheUtils.dataCache.isClientConnected() ) {
                Y.doccirrus.cacheUtils.dataCache.setData( {key, data}, err => {
                    if( err ) {
                        Y.log( `Failed to set ${key}: ${err}`, 'info', NAME );
                    }
                    Y.log( `Cached ${key}: ${data} `, 'info', NAME );
                    resolve();
                } );
            } else {
                Y.log( `Failed to set ${key}: Redis not connected`, 'debug', NAME );
                setTimeout( () => this.setCache( key, data ), 2000 );
                resolve();
            }
        } );
    }
});