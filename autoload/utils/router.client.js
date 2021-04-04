/**
 * A simple router to enable deep linking in client.
 * For Ex. to be used for messagecenter links that navigate to a certain dialog.
 *
 * route:
 * /casefile/#/patient/:pid/insurance/:iid
 * matches:
 * /casefile/#/patient/123/insurance/345
 * callback gets params as first argument:
 * { pid: '123', iid: '345' }
 *
 * If there is a query like:
 * /casefile/?field=cardNo#/patient/123/insurance/345
 * the second argument will be the query:
 * { field: 'cardNo' }
 * if no querystring is added to the url it will be an empty object.
 *
 * The third argument is the matching path.
 *
 * Ids can be optional for ex.
 * /casefile/#/patient/:pid?
 * matches:
 * /casefile/#/patient/123 and
 * /casefile/#/patient/
 *
 * Uses the YUI namespace.
 *
 */


/*global YUI */
YUI.add( 'dcclientrouter', function( Y, NAME ) {
        'use strict';

        Y.log( 'Initializing client router module', 'info', NAME );

        /**
         * @class Router
         * @param routes {Object} key: route, value: callback
         */
        function Router( routes ) {
            var i;
            routes = routes || {};
            this.routes = [];
            this.isStarted = false;

            for( i in routes ) {
                if( routes.hasOwnProperty( i ) ) {
                    this.addRoute( i, routes[i] );
                }
            }
        }

        Router.prototype.addRoute = function( path, fn ) {
            this.routes.push( new Route( path, fn ) );
        };

        /**
         * Gets the current hash and executes the matching route if there is one.
         */
        Router.prototype.start = function() {
            if(this.isStarted){
                return;
            }
            this.isStarted = true;

            var route,
                path = location.hash.split( '#' )[1] || '',
                i,
                params = {},
                query = Router.parseQueryString( location.search );

            for( i = 0; i < this.routes.length; i++ ) {
                route = this.routes[i];
                if( route.match( path, params ) ) {
                    route.fn.call( this, params, query, path );
                    break;
                }
            }
        };

        Router.parseQueryString = function( qs ) {
            var i, pair,
                vars,
                query = {};
            qs = decodeURIComponent( qs.substring( 1 ) );
            vars = qs.split( '&' );
            for( i = 0; i < vars.length; i++ ) {
                pair = vars[i].split( '=' );
                query[pair[0]] = pair[1];
            }
            return query;
        };

        function Route( path, fn ) {
            this.path = path;
            this.fn = fn;
            this.keys = [];
            this.regex = pathToRegex( path, this.keys );
        }

        function pathToRegex( path, keys ) {
            path = path
                .concat( '/?' )
                .replace( /\/\(/g, '(?:/' )
                .replace( /(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g, function( _, slash, format, key, capture, optional ) {
                    keys.push( { name: key, optional: !!optional } );
                    slash = slash || '';
                    return '' + (optional ? '' : slash) + '(?:' + (optional ? slash : '') + (format || '') +
                           (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')' + (optional || '');
                } )
                .replace( /([\/.])/g, '\\$1' )
                .replace( /\*/g, '(.*)' );
            return new RegExp( '^' + path + '$' );
        }

        Route.prototype.match = function( path, params ) {
            var i,
                key,
                keys = this.keys,
                val,
                match = this.regex.exec( decodeURIComponent( path ) );
            if( !match ) {
                return false;
            }

            for( i = 1; i < match.length; i++ ) {
                key = keys[i - 1];
                val = 'string' === typeof match[i] ? decodeURIComponent( match[i] ) : match[i];
                if( key ) {
                    params[key.name] = val;
                }
            }
            return true;
        };

        Y.namespace( 'doccirrus' ).ClientRouter = Router;

    },
    '0.0.1', {requires: []}
);