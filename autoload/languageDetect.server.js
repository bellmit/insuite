const
    NAME = 'languageDetect',
    moment = require( 'moment' );
let
    Y;

function handle( req, res, next ) {

    Y.doccirrus.api.admin.getLanguage({
        user: Y.doccirrus.auth.getSUForLocal(),
        data: {},
        callback: (err, result) => {
            if(err){
                Y.log(`Error getting language ${err.message}`, 'error', NAME );
            }
            req.context.lang = result && 'function' === typeof result.toLowerCase && result.toLowerCase() || 'de';
            // set moment to use specific lang on backend
            moment.locale( req.context.lang );
            next();
        }
    });
}

module.exports = function( _Y ) {
    Y = _Y;
    return handle;
};
