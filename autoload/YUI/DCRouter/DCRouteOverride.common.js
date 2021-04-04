/**
 * User: michael.kleinert
 * Date: 6/12/20  12:40 PM
 * (c) 2020, Doc Cirrus GmbH, Berlin
 */
/*global YUI*/
YUI.add( 'DCRouteOverride', function( Y ) {
    'use strict';

    /**
     * @class DCRouteOverride
     * @param {object} input
     * @param {string|RegExp|null} input.pathMatch
     * @param {string|RegExp|null} input.hashMatch
     * @param {string|function|null} input.pathReplace
     * @param {string|function|null} input.hashReplace
     * @param {"STRING"|"REGEXP"|undefined} input.pathStringMatchType
     * @param {"STRING"|"REGEXP"|undefined} input.hashStringMatchType
     * @param {string} input.appName
     * @param {string|undefined} input.description
     * @param {string|null|undefined} input.appIcon
     * @param {string|undefined} input.uid
     * @constructor
     * @beta
     */
    function DCRouteOverride( input ) {

        // validate input
        if( !DCRouteOverride.checkMatchType( input.pathMatch ) ) {
            throw new TypeError( "DCRouteOverride pathMatch must be of type string, RegExp, function or null" );
        }
        if( !DCRouteOverride.checkMatchType( input.hashMatch ) ) {
            throw new TypeError( "DCRouteOverride hashMatch must be of type string, RegExp, function or null" );
        }
        if( !DCRouteOverride.checkReplaceType( input.pathReplace ) ) {
            throw new TypeError( "DCRouteOverride pathReplace must be of type string, function or null" );
        }
        if( !DCRouteOverride.checkReplaceType( input.hashReplace ) ) {
            throw new TypeError( "DCRouteOverride hashReplace must be of type string, function or null" );
        }

        if( DCRouteOverride.STRINGMATCHTYPE.indexOf( input.pathStringMatchType ) === -1 ) {
            input.pathStringMatchType = DCRouteOverride.STRINGMATCHTYPE[0];
        }
        if( DCRouteOverride.STRINGMATCHTYPE.indexOf( input.hashStringMatchType ) === -1 ) {
            input.hashStringMatchType = DCRouteOverride.STRINGMATCHTYPE[0];
        }

        if( typeof input.appName !== "string" ) {
            throw new TypeError( "DCRouteOverride appName must be of type string" );
        }

        // store parameters in class
        /**
         * @type {string|RegExp|null}
         */
        this.pathMatch = input.pathMatch;

        /*
         * @type {string|RegExp|null}
         */
        this.hashMatch = input.hashMatch;

        /**
         * @type {string|Function|null}
         */
        this.pathReplace = input.pathReplace;

        /**
         * @type {string|Function|null}
         */
        this.hashReplace = input.hashReplace;

        /**
         * @type {"REGEXP"}
         * @type {"STRING"}
         */
        this.pathStringMatchType = input.pathStringMatchType;
        /**
         * @type {"REGEXP"}
         * @type {"STRING"}
         */
        this.hashStringMatchType = input.hashStringMatchType;

        /**
         * @type {string}
         */
        this.appName = input.appName;

        /**
         * @type {string}
         */
        this.description = (typeof input.description === "string") ? input.description : "";

        /**
         * A unique ID for this override, in case multiple overrides for the same path from the same sol exists.
         * @type {string}
         */
        this.uid = (typeof input.uid === "string") ? input.uid : input.appName + "-" + (Math.random() * 1000000000).toFixed( 0 );

        /**
         * @type {string|null}
         */
        this.appIcon = (typeof input.appIcon === "string") ? input.appIcon : null;
    }

    /**
     * Checks the match type, and returns true or false.
     * @param {any} variable
     * @returns {boolean}
     */
    DCRouteOverride.checkMatchType = function checkMatchType( variable ) {
        switch( true ) {
            case typeof variable === "string":
            case typeof variable === "function":
            case variable instanceof RegExp:
            case variable === null:
                return true;
            default:
                return false;
        }
    };

    /**
     * Checks the replace type, and returns true or false.
     * @param {any} variable
     * @returns {boolean}
     */
    DCRouteOverride.checkReplaceType = function checkReplaceType( variable ) {
        switch( true ) {
            case typeof variable === "string":
            case variable instanceof RegExp:
            case variable === null:
                return true;
            default:
                return false;
        }
    };

    /**
     * Returns true, if a match is given or false if not.
     * @param {string|URL} hrefOrURL
     * @returns {boolean}
     * @static
     */
    DCRouteOverride.prototype.match = function match( hrefOrURL ) {
        var
            targetURL = (hrefOrURL instanceof URL) ? hrefOrURL : new URL( hrefOrURL ),
            searchParams = targetURL.searchParams,
            hasPathMatch = false,
            hasHashMatch = false,
            pathMatchRequired = (this.pathMatch !== null),
            hashMatchRequired = (this.hashMatch !== null),

            /**
             * an override flag is embed in all overridden URLs,
             * to avoid infinite override loops => just a single one is allowed
             */
            overrideFlagExists = (searchParams.has( DCRouteOverride.PARAM_OVERRIDDENFLAG )),

            // ignore all overrides, if a certain query param is given
            ignoreAllOverrides = searchParams.has( DCRouteOverride.PARAM_IGNOREOVERRIDES ) &&
                                 searchParams.get( DCRouteOverride.PARAM_IGNOREOVERRIDES ) === "true";

        /**
         * if we ignore all overrides, return
         */
        if( ignoreAllOverrides ) {
            return false;
        }

        /**
         * if the URL has been overridden
         */
        if( overrideFlagExists ) {
            return false;
        }

        /**
         * Match path.
         */
        if( pathMatchRequired ) {
            hasPathMatch = this.isAllowedPath( targetURL.pathname, 'source' ) &&
                           this._hasMatch( targetURL.pathname, this.pathMatch, this.pathStringMatchType );
        }

        /**
         * Match hash.
         */
        if( hashMatchRequired ) {
            hasHashMatch = this._hasMatch( targetURL.hash, this.hashMatch, this.hashStringMatchType );
        }

        // return final result
        return (hasPathMatch || !pathMatchRequired) && (hasHashMatch || !hashMatchRequired);
    };

    /**
     * @param {string} valueToMatch
     * @param {string|RegExp|null}match
     * @param {"STRING"|"REGEXP"} stringMatchType
     * @returns {boolean}
     * @private
     */
    DCRouteOverride.prototype._hasMatch = function _hasMatch( valueToMatch, match, stringMatchType ) {
        switch( true ) {
            case typeof match === "string" && stringMatchType === "STRING":
                return valueToMatch === match;
            case typeof match === "string" && stringMatchType === "REGEXP":
                match = new RegExp( match );
                return valueToMatch.match( match ) !== null;
            case match instanceof RegExp:
                return valueToMatch.match( match ) !== null;
        }
        return false;
    };

    /**
     * Returns the override URL, if a match is given or the sourceURL,
     * if not, or if the path is among the forbidden paths.
     * @param {string|URL} hrefOrURL
     * @returns {URL|null}
     * @static
     */
    DCRouteOverride.prototype.getOverrideURL = function getOverrideURL( hrefOrURL ) {
        var
            sourceURL = (hrefOrURL instanceof URL) ? hrefOrURL : new URL( hrefOrURL ),
            targetURL = new URL( sourceURL );

        if( this.match( hrefOrURL ) ) {
            targetURL = new URL( sourceURL.toString() );

            // path replacement
            if( this.pathMatch !== null ) {
                switch( true ) {
                    case typeof this.pathReplace === "string" && this.pathStringMatchType === "STRING":
                        targetURL.pathname = this.pathReplace;
                        break;
                    case typeof this.pathReplace === "string" && this.pathStringMatchType === "REGEXP":
                        targetURL.pathname = targetURL.pathname.replace(
                            (this.pathMatch instanceof RegExp) ? this.pathMatch : new RegExp( this.pathMatch ),
                            this.pathReplace
                        );
                        break;
                    case typeof this.pathReplace === "function":
                        targetURL.pathname = this.pathReplace( targetURL.pathname );
                        break;
                }

                // ensure value starts with "/"
                if( targetURL.pathname.indexOf( "/" ) !== 0 ) {
                    targetURL.pathname = "/" + targetURL.pathname;
                }
            }

            if( this.hashMatch !== null ) {
                switch( true ) {
                    case typeof this.hashReplace === "string" && this.hashStringMatchType === "STRING":
                        targetURL.hash = this.hashReplace;
                        break;
                    case typeof this.hashReplace === "string" && this.hashStringMatchType === "REGEXP":
                        targetURL.hash = targetURL.hash.replace(
                            (this.hashMatch instanceof RegExp) ? this.hashMatch : new RegExp( this.hashMatch ),
                            this.hashReplace
                        );
                        break;
                    case typeof this.hashReplace === "function":
                        targetURL.hash = this.hashReplace( targetURL.hash );
                        break;
                }

                // ensure value starts with "#"
                if( targetURL.hash.indexOf( "#" ) !== 0 ) {
                    targetURL.hash = "#" + targetURL.hash;
                }
            }

            // add the override flag
            if( !targetURL.searchParams.has( DCRouteOverride.PARAM_OVERRIDDENFLAG ) ) {
                targetURL.searchParams.set( DCRouteOverride.PARAM_OVERRIDDENFLAG, "true" );
            }

            // ensure that the path is among the allowed paths
            if( !this.isAllowedPath( targetURL.pathname, 'target' ) ) {
                return sourceURL;
            }
        }

        return targetURL;
    };

    /**
     * @returns {string} /sol/ + appName
     */
    DCRouteOverride.prototype.getSolPath = function getSolPath() {
        return "/sol/" + this.appName;
    };

    /**
     * Returns /sol/ + appName + path in the sol, given as string or array of strings, which will be joined by "/".
     * @returns {string|null}
     */
    DCRouteOverride.prototype.getSolIconPath = function getSolIconPath() {
        var returnPath = null;
        if( typeof this.appIcon === "string" ) {
            returnPath = this.getSolPath();
            if( this.appIcon.indexOf( "/" ) !== 0 ) {
                returnPath = returnPath + "/";
            }
            return returnPath + this.appIcon;
        }
        return returnPath;
    };

    /**
     * Checks if a given path is among the allowed source/target paths.
     * Paths allowed are defined as static array, which is given by Doc Cirrus,
     * and extended with the sol path itself.
     * @param {string} path
     * @param {"source"|"target"} sourceOrTarget
     * @returns {boolean}
     */
    DCRouteOverride.prototype.isAllowedPath = function isAllowedPath( path, sourceOrTarget ) {
        var
            allowedPaths = [
                // always allow from and to the sol itself
                this.getSolPath()
            ].concat( (sourceOrTarget === "source") ? DCRouteOverride.ALLOWED_SOURCEPATHS : DCRouteOverride.ALLOWED_TARGETPATHS ),
            i, l;

        if( typeof path === "string" ) {
            for( i = 0, l = allowedPaths.length; i < l; i++ ) {
                if( path.indexOf( allowedPaths[i] ) === 0 ) {
                    return true;
                }
            }

            /**
             * Exact matches of allowed paths
             */
            if( sourceOrTarget === "target" ) {
                switch( path ) {
                    /**
                     * Allow an exact match to "/" as target,
                     * since sols may have their UI on the main page.
                     * E.g. "prc.dev.dc/#/amts"
                     */
                    case "/":
                        return true;
                }
            }
        }
        return false;
    };

    /**
     * Redirect function to set window.location based on the input href
     * @param {string|URL} hrefOrURL
     * @private
     */
    DCRouteOverride.prototype.redirectBasedOnSourceURL = function( hrefOrURL ) {
        var
            sourceURL = (hrefOrURL instanceof URL) ? hrefOrURL : new URL( hrefOrURL ),
            targetURL = this.getOverrideURL( sourceURL );
        if( targetURL ) {
            window.location.href = targetURL.toString();
        }
    };

    /**
     * Query param to ignore any route overrides.
     * @type {string}
     */
    DCRouteOverride.PARAM_IGNOREOVERRIDES = 'ignoreRouteOverride';

    /**
     * Query param to flag an already performed override and therefore prevent loops.
     * @type {string}
     */
    DCRouteOverride.PARAM_OVERRIDDENFLAG = 'overriddenRoute';

    /**
     * Array of allowed paths that may be overridden.
     * @type {string[]}
     */
    DCRouteOverride.ALLOWED_SOURCEPATHS = Object.freeze( [
        "/incase"
    ] );

    /**
     * Array of allowed paths that may be used as redirection target.
     * @type {string[]}
     */
    DCRouteOverride.ALLOWED_TARGETPATHS = Object.freeze( [] );

    /**
     * Replacement types for type STRING and REGEXP
     * @type {string[]}
     */
    DCRouteOverride.STRINGMATCHTYPE = Object.freeze( [
        "STRING",
        "REGEXP"
    ] );

    /**
     * @property DCRouteOverride
     * @for doccirrus
     * @type {DCRouteOverride}
     */
    Y.doccirrus.DCRouteOverride = DCRouteOverride;

}, '0.0.1', {
    requires: [
        'oop',
        'doccirrus'
    ]
} );
