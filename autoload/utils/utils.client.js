/**
 * User: rrrw
 * Date: 12.02.13  12:09
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/**
 * This is a library of useful DC methods that are available throughout mojito clients.
 *
 * I.e. for the browser.
 *
 * Uses the YUI namespace.
 *
 * move dc.js in here.... TODO
 *
 * MOST of this utils library deals with VALIDATION LOGIC.  see below to find out how the
 * logic works...
 * @module dcutils
 */


/*global YUI, jQuery, $, ko, moment, _ */
YUI.add( 'dcutils', function( Y, NAME ) {
        'use strict';

        var
            i18n = Y.doccirrus.i18n,
        // CONSTS
            ND_SCHEMA = '__dcv',
            ND_ERRMSG = '__erm',
        // this is the singleton Utils Object for the application
        // at the moment offers static functions
            myUtils,
            formIsValid,
            staticValidStatusChangedCb,
            staticMainNode;

        /**
         * namespace `doccirrus.utils`
         * @class doccirrus.utils
         */
        /**
         * @property utils
         * @for doccirrus
         * @type {doccirrus.utils}
         */
        /**
         * Constructor for the module class.
         *
         * @class DCUtils
         * @private
         */
        function DCUtils() {
            // purely static object at the moment, nothing in the instances.
        }

        /**
         * Get a property of an object via dot-delimited name string, and optionally create the property and any
         * ancestor properties that do not already exist. If dot-delimited syntax is not appropriate have a look at "Y.Object.getValue"
         * @deprecated
         * @method getObject
         * @for doccirrus.utils
         * @author Inspired by jQuery getObject - "Cowboy" Ben Alman.
         * @param {String|Array} parts Dot-delimited string representing a property name, for example: 'document', 'location.href', 'window.open' or 'foo.bar.baz'.
         * @param {Boolean} [create] Create final and intermediate properties if they don't exist. Defaults to false.
         * @param {Object} [obj] Optional context in which to evaluate name. Defaults to window if omitted.
         * @returns {window|*} An object reference or value on success, otherwise undefined.
         * @see doccirrus.commonutils.getObject
         */
        DCUtils.prototype.getObject = Y.doccirrus.commonutils.getObject;

        /**
         * Set a property of an object via dot-delimited name string, creating any ancestor properties that do not already exist.
         * @deprecated
         * @method setObject
         * @for doccirrus.utils
         * @author Inspired by jQuery getObject - "Cowboy" Ben Alman.
         * @param {String} name Dot-delimited string representing a property name, for example: 'document', 'location.href', 'window.open' or 'foo.bar.baz'.
         * @param {*} value Any valid JavaScript expression.
         * @param {Object} [context] Optional context in which to evaluate name. Defaults to window if omitted.
         * @returns {*|undefined} The value if set successfully, otherwise undefined.
         * @see doccirrus.commonutils.setObject
         */
        DCUtils.prototype.setObject = Y.doccirrus.commonutils.setObject;

        /**
         * Using dot-delimited name string, return whether a property of an object exists.
         * @deprecated
         * @method exists
         * @for doccirrus.utils
         * @author Inspired by jQuery getObject - "Cowboy" Ben Alman.
         * @param {String} name Dot-delimited string representing a property name, for example: 'document', 'location.href', 'window.open' or 'foo.bar.baz'.
         * @param {Object} [context] Optional context in which to evaluate name. Defaults to window if omitted.
         * @returns {Boolean} Whether or not the property exists.
         * @see doccirrus.commonutils.exists
         */
        DCUtils.prototype.exists = Y.doccirrus.commonutils.exists;

        /**
         * given a specName returns path or undefined
         * @method getUrl
         * @for doccirrus.utils
         * @param {String} specName
         * @returns {String|undefined}
         * @example
         * <pre>Y.doccirrus.utils.getUrl('inCaseMojit')</pre>
         */
        DCUtils.prototype.getUrl = function dcutils_getUrl( specName ) {
            return Y.doccirrus.commonutils.getUrl( specName );
        };

        /**
         * Works with standard form node classes (i.e. requires use of the .control-domain class
         * for groups of forms... TODO fail over to the whole form....
         *
         * Caches it's work by attaching the schema type objects it recovers to the YUI DOM nodes.
         *
         * Injects the error messages for this node into the node's data store.
         *
         * @method isStandardFormNodeValid
         * @param node  a YUI Node Class object.  Does not work with JQuery nodes!
         * @return {Boolean}
         * @deprecated
         */
        DCUtils.prototype.isStandardFormNodeValid = function( node ) {
            var
                type = node.getAttribute( 'name' ),
                pathname = node.getAttribute( 'dctype' ),
                schemaname = node.getAttribute( 'dcschema' ),
                schema = Y.doccirrus.schemaloader.getSchemaForSchemaName( schemaname ),
                path = ((pathname && schema) ?
                        Y.doccirrus.schemaloader.getPathForComplexType( schema, pathname ) :
                        undefined
                ),
                typeObj = node.getData( ND_SCHEMA ),
                contextObject,
                val,
                msg = '',
                nextNode,
                i,
                ok = true;

            if( !typeObj ) {
                if( '_simple' === schemaname ) {
                    typeObj = Y.doccirrus.schemaloader.getTypeForSchemaPath( schemaname, pathname );
                } else {
                    path = (path ? path + '.' + type : type );
                    typeObj = Y.doccirrus.schemaloader.getTypeForSchemaPath( schema, path );
                    if( !typeObj ) {
                        Y.log( 'Failed to getTypeForSchemaPath.', 'warn', NAME );
                        // FAIL EARLY!
                        return false;
                    }
                    node.setData( ND_SCHEMA, typeObj );
                }
            }

            // check mandatory
            val = node.get( 'type' );
            if( val !== 'checkbox' ) {
                val = node.get( 'value' );
                if( Array.isArray( typeObj.enum ) ) {
                    if( -1 === typeObj.enum.indexOf( val ) ) {
                        ok = false;
                        // probable programmer error
                        Y.log( 'Enum check failed: ' + val, 'warn', NAME );
                    }
                }
            } else {
                val = node.get( 'checked' );
            }
            if( typeObj.required ) {
                if( val &&
                    'bitte wählen' !== val ) {
                    ok = true;
                } else {
                    msg = Y.doccirrus.validations.common.getMongooseMandatoryMessage();
                    ok = false;
                }
            }
            if( Array.isArray( typeObj.validate ) ) {
                for( i = 0; i < typeObj.validate.length; i++ ) {
                    if( typeObj.validate[i] && typeObj.validate[i].validator ) {
                        if( Y.doccirrus.validations.common.isSimple( typeObj.validate[i].validator ) ) {
                            ok = typeObj.validate[i].validator( val ) && ok;
                        } else {
                            contextObject = Y.doccirrus.utils.processForm( node.ancestor( '.control-domain' ) );
                            // explicitly set context to our domain form object.
                            ok = typeObj.validate[i].validator.call( contextObject, val ) && ok;
                        }
                        if( !ok ) {
                            if( msg ) {
                                msg += ' ' + typeObj.validate[i].msg;
                            } else {
                                msg = typeObj.validate[i].msg + ' ';
                            }
                        }
                    }
                }
            }
            if( !ok && null !== node.ancestor() ) {
                nextNode = node.ancestor().one( '.help-inline' );
                if( !Y.Lang.isUndefined( typeObj.i18n ) ) {
                    msg = Y.Lang.sub( msg, {PATH: typeObj.i18n} );
                } else if( msg.indexOf( '{PATH}' ) > -1 ) {

                    // TODO: move schema mixing?
                    Y.log( 'missing Translation for something: ' + [typeObj, path, pathname, schemaname].join( ", " ), 'warn', NAME );

                }
                if( null !== nextNode ) {
                    nextNode.setAttribute( 'data-original-title', msg );
                }
                node.setData( ND_ERRMSG, msg );
            }
            return ok;

        };

        /**
         * produce output similar to JSON.stringify(),
         *
         * - default - only down to one level, use "complete" flag for whole thing
         * - does not trow TypeError on circular ref.
         *
         * @method safeStringify
         * @param object
         * @param complete
         * @returns {*}
         */
        DCUtils.prototype.safeStringify = function safeStringify( object, complete ) {
            var
                seen = [];
            if( 'object' !== typeof object ) {
                return JSON.stringify( object );
            }

            if( object.toJSON ) {
                return object.toJSON();
            }

            function flatten( key, value ) {
                var ret = value;
                if( value && 'object' === typeof value ) {
                    if( seen.indexOf( value ) !== -1 ) {
                        ret = '[CircularRef]';
                    }
                    else {
                        seen.push( value );
                    }
                }
                return ret;
            }

            function flattenOne( obj ) {
                var res = '{', key, init = true;
                for( key in obj ) {
                    if( obj.hasOwnProperty( key ) ) {
                        if( init ) {
                            init = false;
                        }
                        else {
                            init += ', ';
                        }
                        res = res + '"' + key + '":';
                        if( obj[key] && 'object' === typeof obj[key] ) {
                            res += '"[...]"';
                        } else {
                            res += obj[key];
                        }
                    }
                }
                res += '}';
                return res;
            }

            if( complete ) {
                return JSON.stringify( object, flatten );
            } else {
                return flattenOne( object );
            }

        };

        /**
         * @method setButtonVisibility
         * @param node
         * @param button
         * @deprecated
         */
        DCUtils.prototype.setButtonVisibility = function( node, button ) {
            if( myUtils.isNodeDCValid( node ) ) {
                button.removeClass( 'disabled' );
            } else {
                button.addClass( 'disabled' );
            }
        };

        /**
         * @method getQueryParams
         * @param qs
         * @returns {Object}
         */
        DCUtils.prototype.getQueryParams = function( qs ) {
            qs = qs.split( '+' ).join( ' ' );

            var params = {}, tokens,
                re = /[?&]?([^=]+)=([^&]*)/g;

            do {
                tokens = re.exec( qs );
                if( tokens ) {
                    params[decodeURIComponent( tokens[1] )] = decodeURIComponent( tokens[2] );
                }
            } while( tokens );

            return params;
        };

        /**
         * @method downloadFile
         * @param {String|Object} config
         */
        DCUtils.prototype.downloadFile = function( config ) {

            var isString = 'string' === typeof config,
                defaults = {
                    url: '',
                    type: 'iframe'
                },
                downloadFrame;
            if( !isString ) {
                config = config || {};
            } else {
                config = {
                    url: config
                };
            }
            config = Y.mix( defaults, config, true );

            switch( config.type ) {
                case 'iframe':
                    downloadFrame = document.createElement( "iframe" );
                    downloadFrame.style.display = 'none';
                    document.body.appendChild( downloadFrame );
                    downloadFrame.setAttribute( 'src', config.url );
                    break;
                default:
                    throw new Error( config.type + ' Not Implemented' );
            }
        };

        /*
         ***************  Validation and Error highlighting *************
         */
        // this can be much more efficiently organised by caching the
        // individual status.  For now we do the stupid going through all..
        // bear future TODO
        function checkValidStatus() {
            var result;
            // tmp message....
            result = myUtils.isNodeDCValid( staticMainNode );
            if( formIsValid !== result ) {
                staticValidStatusChangedCb( result );
            }
            formIsValid = result;
        }

        /**
         * @param isError
         * @param node
         * @deprecated
         */
        function highlightError( isError, node ) {
            var helpNode;

            if( node ) {
                helpNode = $( '.help-inline', node.getDOMNode() );
                if( helpNode.length ) {
                    // TODO add data-container="body" and deal with it
                    // FIXME html for content allowed, which is totally risky
                    helpNode.html( '<a href="#" class="tooltip" data-placement="right" data-toggle="tooltip" data-trigger="click focus manual" data-html="true"></a><i class="icon icon-hand-left"></i>' );
                }

                if( isError ) {
                    node.addClass( 'has-error' );
                    $( 'a', helpNode ).attr( 'title', helpNode.attr( 'data-original-title' ) );
                    $( 'i', helpNode ).addClass( 'icon-hand-left' );
                } else {
                    node.removeClass( 'has-error' );
                    $( 'a', helpNode ).attr( 'title', '' );
                    $( 'i', helpNode ).removeClass( 'icon-hand-left' );

                    // substitute icon in input-group with empty space, so bootstrap won't resize it awfully
                    if( helpNode.closest( '.substitute-icon' ).length ) {
                        $( 'i', helpNode ).html( '<p style="width:12px"></p>' );
                    }
                }
            }
        }

        /**
         * @method highlightError
         * @type {highlightError}
         * @deprecated
         */
        DCUtils.prototype.highlightError = highlightError;

        function handleValidation( node ) {
            var
                isValid,
                parent = node.ancestor( '.control-group, .form-group' ); // both bs2 and bs3
            isValid = Y.doccirrus.utils.isStandardFormNodeValid( node );
            highlightError( !isValid, parent );
            return isValid;
        }

        function handleValidationEvent( e ) {
            var // if a jQuery event is passed currentTarget will not be a Y.Node instance
                aYNode = e.currentTarget instanceof Y.Node ? e.currentTarget : Y.Node( e.currentTarget );

            handleValidation( aYNode );
            // needs to be optimised out...

            checkValidStatus();
        }

        /**
         * @method getPracticeNo
         * @param callback
         */
        DCUtils.prototype.getPracticeNo = function( callback ) {
            Y.doccirrus.jsonrpc.api.practice.read()
                .done( function( response ) {
                    var
                        data = response.data,
                        result;
                    result = data && data[ 0 ].dcCustomerNo;
                    callback( result );
                } );
        };

        DCUtils.prototype.getDistinct = function( originalArray, objKey ) {

            var trimmedArray = [],
                values = [],
                value,
                i;

            for( i = 0; i < originalArray.length; i++ ) {
                value = ( originalArray[i][objKey] && originalArray[i][objKey].toLowerCase().trim() ) || "";

                if( !value ) {
                    // for no "code", always push
                    trimmedArray.push( originalArray[i] );
                } else if( values.indexOf( value ) === -1 ) {
                    trimmedArray.push( originalArray[i] );
                    values.push( value );
                }
            }
            return trimmedArray;
        };

        /**
         * Additional check for bank account data select field. The field needs to be mandatory in
         * some circumstances.
         * @method checkBank
         * @param services user choosen services in array
         * @param node of the select field ( yui node )
         * @return {boolean} true if field is valid
         */
        DCUtils.prototype.checkBank = function( services, node ) {
            var
                i,
                isValid = true;
            if( undefined !== services ) {
                for( i = 0; i < services.length; i++ ) {
                    if( 'bitte wählen' === node.get( 'value' ) ) {
                        isValid = false;
                        highlightError( true, node.ancestor( '.control-group' ) );
                    } else {
                        highlightError( false, node.ancestor( '.control-group' ) );
                    }
                }
            } else {
                isValid = false;
            }
            return isValid;
        };

        /**
         * registerDCValidationAtNode
         *
         * Call this in your binder to enable automatic handling of 'change' events on input fields.
         *
         * If you need immediate validation after each key press, this will be possible FUTURE TODO
         *
         * You can now add validation to input elements (does not support DIVs yet!) using the following method.

         In your Jade you may have the following line:

         JADE:   input(type='text', name='email1', dcschema='employee', dctype='Communication_T').dcvalidate

         When validating an input in the client as in the line above the following rules apply:

         1. the schema 'employee' must be loaded and available in the browser.    "require"  employee-schema in the binder.
         == Diagnosis:  check your Y.log and you should see "employee-schema: Loading Schema employee-schema"

         2. the schema must have an element that has the type refered to by dctype.  If dctype is left away, then the element is directly under 'root' element.
         == Diagnosis:  console.dir(schema.describe())  will give you a description of the schema and you should see the type field there.

         3. there must be an element as specified by the name attribute within the element referred to by step 2. (above).  There must be an object in the schema with KEY = 'email1' in this case.  i.e. root/communications/email1  would be a "path" to the element that we actually want to validate.
         == Diagnosis: as for step 2. Additionally, check to see   whether email1 has validations:   {validate:"someFnName", required: true} are the elements to look for.


         Further, the bootstrap styling for errors is applied to the first parent node of the <input> which has the class .control-group  This allows you to apply the validation style to sets of radio buttons, and also to labels.

         * @method registerDCValidationAtNode
         * @param node  the node at which event delegation will occur.
         * @param statusCallback  (Boolean)  the callback is called with a boolean value whenever the status changes.
         *                        If you use this feature and supply a statusCallback, then you can only have _one_
         *                        node registered for DC Validation on the ENTIRE PAGE.
         * @deprecated
         */
        DCUtils.prototype.registerDCValidationAtNode = function( node, statusCallback ) {
            jQuery( node.getDOMNode() ).on( 'change', '.dcvalidate', handleValidationEvent ); //for lists / jQuery.select2
            node.delegate( 'keyup', handleValidationEvent, '.dcvalidate' ); // for text fields
            staticValidStatusChangedCb = statusCallback;
            staticMainNode = node;
            checkValidStatus();
            statusCallback( formIsValid );
        };

        /**
         * @method setupCountrySelect2
         * @param jq
         * @returns {jQuery}
         */
        DCUtils.prototype.setupCountrySelect2 = function( jq ) {
            return jq.select2( {
                minimumInputLength: 1,
                width: '100%',
                ajax: {
                    params: {
                        xhrFields: {
                            withCredentials: true
                        }
                    },
                    url: Y.doccirrus.infras.getPrivateURL( '/r/countries/' ),
                    data: function( term ) {
                        return {
                            action: 'countries',
                            itemsPerPage: 10,
                            term: term
                        };
                    },
                    results: function( data ) {
                        data = {
                            results: Y.Array.map( data, function( item ) {
                                return {id: item.sign, text: item.country};
                            } )
                        };
                        return data;
                    }
                },
                initSelection: function( element, callback ) {
                    var countryCode = element.val();
                    // request the country for countryCode
                    jQuery.ajax( {
                        type: 'GET',
                        xhrFields: {withCredentials: true},
                        url: Y.doccirrus.infras.getPrivateURL( '/r/countries/' ),
                        data: {action: 'countries', sign: countryCode},
                        success: function initSelectionSuccess( data ) {
                            var country = data && data[0] && data[0].country;
                            callback( {id: countryCode, text: country} );
                        }
                    } );
                },
                adaptContainerCssClass: function( cls ) {
                    // do not adapt those classnames
                    switch( cls ) {
                        case 'dcvalidate':
                            return null;
                    }
                    return cls;
                }
            } );
        };

        /**
         * Informs the utility that a Jade form has been loaded into a node.
         * @method jadeTemplateLoaded
         */
        DCUtils.prototype.jadeTemplateLoaded = function() {
            checkValidStatus();
            staticValidStatusChangedCb( formIsValid );
        };

        /**
         * @method isNodeDCValid
         * @param node
         * @returns {boolean}
         * @deprecated
         */
        DCUtils.prototype.isNodeDCValid = function( node ) {
            var
                subresult,
                result = true,
                msgs = '',
                list = node.all( '.dcvalidate' );
            list.each( function( item ) {
                    subresult = handleValidation( item );
                    result = (subresult && result); // don't trust the browsers JS optimizer...
                    if( !subresult ) {
                        msgs += (item.getData( ND_ERRMSG ) || '') + '\n';
                    }
                }
            );
            node.setData( ND_ERRMSG, msgs );
            return result;
        };

        /**
         * Creates a ready-to-submit object out of the form elements.
         *
         * DRAFT VERSION - may not work with all input elements
         *
         * Works by looking at INPUT elements within the given node. So, if
         * the node is poorly selected it can also work across several forms,
         * overwriting items with the same name.
         *
         * @method processForm
         * @param node
         * @return {Object}
         * @deprecated
         */
        DCUtils.prototype.processForm = function( node ) {
            var
                list,
                name,
                current,
                result = {},
                isCheckbox;
            list = node.all( 'input' ).concat( node.all( 'select' ) ).concat( node.all( 'textarea' ) );

            while( 0 < list.size() ) {
                current = list.shift();
                name = current.get( 'name' );
                // fields beginning with __ are internal
                if( 0 !== name.indexOf( '__' ) ) {
                    isCheckbox = ('checkbox' === current.get( 'type' ));
                    if( name ) {
                        if( isCheckbox ) {
                            if( current.get( 'checked' ) ) {
                                result[name] = current.get( 'value' );
                                if( result[name] === 'true' ) {
                                    result[name] = true;
                                }
                            } else {
                                result[name] = '';
                            }
                        } else {
                            if( current.getAttribute( 'multiple' ) ) {// support for multiple select
                                result[name] = jQuery( current.getDOMNode() ).val() || [];
                            } else {
                                result[name] = current.get( 'value' );
                            }
                            if( result[name] === 'undefined' ) {
                                result[name] = '';
                            }
                        }
                    }
                }
            }
            return result;
        };

        /**
         * @method processAuxForm
         * @param node
         * @param cssSelector
         * @returns {Array}
         * @deprecated
         */
        DCUtils.prototype.processAuxForm = function( node, cssSelector ) {
            cssSelector = cssSelector || '.auxframerow';
            var
                select2Data,
                list,
                name,
                value,
                list2,
                cnt = 0,
                subresult,
                resultList = [],
                checked,
                isCheckBoxUnchecked,
                dom;
            list = node.all( cssSelector );

            list.each( function( item ) {
                list2 = item.all( 'input' ).concat( item.all( 'select' ) ).concat( item.all( 'textarea' ) );
                subresult = {};
                list2.each( function( item2 ) {
                    checked = item2.get( 'checked' );
                    isCheckBoxUnchecked = ('checkbox' === item2.get( 'type' ) && !checked);
                    name = item2.get( 'name' );

                    // support select2 in a simple way. here used for country autocomplete
                    if( 'select2' === item2.getData( 'type' ) ) {
                        dom = item2.getDOMNode();
                        select2Data = $( dom ).select2( 'data' );
                        subresult[name] = select2Data.text;
                        subresult[item2.getData( 'id' )] = select2Data.id;
                        return;
                    }

                    // fields beginning with __ are internal
                    if( 0 !== name.indexOf( '__' ) ) {
                        if( isCheckBoxUnchecked ) {
                            value = '';
                        }
                        else {
                            value = item2.get( 'value' );
                        }
                        if( name &&
                            value &&
                            value !== 'bitte wählen' ) {
                            subresult[name] = value;
                        }
                    }
                } );
                if( 0 < Object.keys( subresult ).length ) {
                    resultList.push( subresult );
                }
                cnt++; // eslint-disable-line
            } );
            return resultList;
        };

        /**
         * Appropriate font color for background contrast.
         * @method getContrastColor
         * @param bgColor String e.g. '#00ff00'
         */
        DCUtils.prototype.getContrastColor = function getContrastColor( bgColor ) {
            var
                type;
            if( bgColor && '#' === bgColor[0] ) {
                type = Y.doccirrus.utils.getColorContrastType( bgColor );
                if( 'dark' === type ) {
                    return '#000000';
                }
                return '#ffffff';
            }
            // blue
            return '#0000ff';
        };

        /**
         * Get color contrast type
         * @method getColorContrastType
         * @param bgColor String e.g. '#00ff00'
         * @return {string} dark or light
         */
        DCUtils.prototype.getColorContrastType = function getColorContrastType( bgColor ) {
            var
                contrast,
                r = parseInt( bgColor.substr( 1, 2 ), 16 ),
                g = parseInt( bgColor.substr( 3, 2 ), 16 ),
                b = parseInt( bgColor.substr( 5, 2 ), 16 );

            //W3C color contrast
            contrast = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            if( contrast > 145 ) {
                return 'dark';
            }
            return 'light';
        };

        /**
         * Delete a calevent by provided data
         * @param {Object} data
         * @param {Boolean} [deleteAll=false] delete all future repetitions
         * @return {jQuery.Deferred}
         */
        DCUtils.prototype.deleteCalEvent = function( data, deleteAll ) {
            if( !Y.Lang.isObject( data ) ) {
                Y.log( 'deleteCalEvent: data not an object', 'warn', NAME );
            }
            var
                _id = '',
                params = {
                    eventType: Y.doccirrus.schemas.calendar.getEventType( data ),
                    linkSeries: data.linkSeries,
                    start: moment( data.start ).toJSON(),
                    deleteAll: deleteAll || false
                };
            if ( deleteAll && !data.linkSeries){ //if master in repetition
                params.linkSeries = data._id;
            }

            if( !deleteAll && data._id ) {
                _id = data._id;
            }

            return jQuery
                .ajax( {
                    type: 'DELETE',
                    xhrFields: {withCredentials: true},
                    url: Y.doccirrus.infras.getPrivateURL( '/1/calevent/' + _id ),
                    data: params
                } );
        };

        /**
         *
         * appends a modal div to the body and displays it or removes it from dom
         * callback function will be executed with true if user clicks on accept button
         *
         * @method confirmDialog
         * @param show boolean true for appending and showing the dialog
         * @param message the message to be displayed
         * @param title (optional) title of the modal dialog
         * @param callback function to handle the confirm result
         * @deprecated
         */
        DCUtils.prototype.confirmDialog = function confirmDialog( show, message, title, callback ) {
            var
                modal,
                node,
                cancel = i18n('general.button.CANCEL'),
                confirm = i18n('general.button.CONFIRM'),
                onShown = function() {
                    $( '#acceptModal', modal ).focus();
                },
                onHidden = function() {
                    $( '#confirmModal' ).remove();
                },
                onAccept = function() {
                    modal.modal( 'hide' );
                    callback( true );
                },
                onCancel = function() {
                    modal.modal( 'hide' );
                    callback( false );
                };
            if( undefined !== show ) {
                if( show ) {
                    //$( 'body' ).append( modalDiv );
                    node = Y.Node.create( '<div id="modalDiv"></div>' );
                    Y.Node.one( 'body' ).append( node );
                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'confirmmodal_bs3',
                        'DocCirrus',
                        {
                            title: title,
                            message: message,
                            cancel: cancel,
                            confirm: confirm
                        },
                        node,
                        function( /* err, data */ ) {
                            modal = $( '#confirmModal' );

                            modal.on( 'shown.bs.modal', onShown );
                            modal.on( 'hidden.bs.modal', onHidden );
                            $( '#acceptModal', modal ).keyup( function( event ) {
                                if( 13 === event.keyCode || 10 === event.keyCode ) {
                                    onAccept();
                                }
                            } ).click( onAccept );
                            $( '#cancelModal', modal ).keyup( function( event ) {
                                if( 13 === event.keyCode || 10 === event.keyCode ) {
                                    onCancel();
                                }
                            } ).click( onCancel );
                            modal.modal( 'show' );
                        }
                    );

                } else {
                    modal = $( '#confirmModal' );
                    if( undefined !== modal && modal.length ) {
                        modal.modal( 'hide' );
                        $( '#modalDiv' ).remove();
                        callback( false );
                    }
                }
            } else {
                callback( false );
            }
        };
        DCUtils.prototype.confirmDialog.title = {
            CONFIRMATION: i18n( 'utils_clientJS.confirmDialog.title.CONFIRMATION' )
        };
        DCUtils.prototype.confirmDialog.message = {
            APPOINTMENT_DELETE: i18n( 'utils_clientJS.confirmDialog.message.APPOINTMENT_DELETE' ),
            APPOINTMENT_DELETE_ALL: i18n( 'utils_clientJS.confirmDialog.message.APPOINTMENT_DELETE_ALL' )
        };

        /**
         * shows a loading dialog with 3 animated points and a message.
         *
         * @method loadingDialog
         * @param action show loading, success or error type dialog
         * @param message message to be displayed
         * @param callback(optional) give additional on hide callbacks
         * @deprecated
         */
        DCUtils.prototype.loadingDialog = function loadingDialog( action, message, callback ) {
            var
                modal,
                node = Y.Node.create( '<div></div>' ),
                cb = callback;

            function show( additionalCallback ) {
                Y.Node.one( 'body' ).append( node );
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'loadingmodal',
                    'DocCirrus',
                    {
                        message: message
                    },
                    node,
                    function( err /* , data*/ ) {
                        if( !err ) {
                            modal = $( '#loadingDiv' );
                            modal.on( 'click', function() {
                                modal.modal( 'hide' );
                            } );
                            modal.on( 'hidden.bs.modal', function() {
                                $( '#loadingDiv' ).remove();
                                if( 'function' === typeof cb ) {
                                    cb();
                                }
                            } );
                            modal.modal();
                            if( additionalCallback !== undefined && typeof additionalCallback === 'function' ) {
                                additionalCallback();
                            }
                        }
                    }
                );
            }

            function finish( hasError ) {
                var
                    showContainer = ( hasError ) ? '#errorContainer' : '#successContainer';
                modal = $( '#loadingDiv' );
                if( modal.length === 0 ) {
                    show( function() {
                        //console.log( 'callback ' + showContainer );
                        $( '#loadingContainer' ).addClass( 'hide' );
                        $( showContainer ).removeClass( 'hide' );
                    } );
                } else {
                    $( '#loadingContainer' ).addClass( 'hide' );
                    $( '#errorContainer' ).addClass( 'hide' );
                    $( '#successContainer' ).addClass( 'hide' );
                    $( showContainer ).removeClass( 'hide' );
                    $( '#loadingMessage' ).text( message );
                }
            }

            /**
             * Success will open the modal even if its not opened yet.
             */
            function success() {
                finish( false );
            }

            /**
             * Error will open the modal even if its not opened yet.
             */
            function error() {
                finish( true );
            }

            if( undefined !== action ) {
                switch( action ) {
                    case 'show':
                        show();
                        break;
                    case 'success':
                        success();
                        break;
                    case 'error':
                        error();
                        break;
                    case 'hide':
                        $( '#loadingDiv' ).remove();
                        break;
                }

            } else {
                $( '#loadingDiv' ).remove();
            }
        };

        /**
         *
         * appends a modal div to the body and displays it or removes it from dom
         *
         * @method informationDialog
         * @param show boolean true for appending and showing the dialog
         * @param message the message to be displayed
         * @param title (optional) title of the modal dialog
         * @param callback (optional) will be executed on click
         * @deprecated
         */
        DCUtils.prototype.informationDialog = function informationDialog( show, message, title, callback ) {
            var
                modal,
                node,
                hideEvent = 'hide.bs.modal';
            if( undefined !== show ) {
                if( show ) {
                    //$( 'body' ).append( modalDiv );
                    node = Y.Node.create( '<div id="modalDiv"></div>' );
                    Y.Node.one( 'body' ).append( node );
                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'informationmodal_bs3',
                        'DocCirrus',
                        {
                            title: title,
                            message: message
                        },
                        node,
                        function( /* err, data */ ) {
                            modal = $( '#informationModal' );
                            modal.on( hideEvent, function() {
                                $( '#modalDiv' ).remove();
                                if( undefined !== callback && typeof callback === 'function' ) {
                                    callback();
                                }
                            } );
                            $( '#acceptModal', modal ).click( function() {
                                modal.modal( 'hide' );
                            } );
                            modal.modal();
                        }
                    );

                } else {
                    modal = $( '#informationModal' );
                    if( undefined !== modal && modal.length ) {
                        modal.modal( 'hide' );
                        $( '#modalDiv' ).remove();
                    }
                }
            }
        };

        var mapMarkerChanges = function( callbackObj, checkedMarkers ) {
            var added = callbackObj.data.filter( function( marker ) {
                var flag = true;
                //marker is in callbackObj.data if = false else true;
                checkedMarkers().forEach( function( diaMarker ) {
                    if( marker._id === diaMarker._id ) {
                        flag = false;
                    }
                } );
                return flag;
            } );

            var removed = checkedMarkers().filter( function( marker ) {
                var flag = true;
                callbackObj.data.forEach( function( diaMarker ) {
                    if( marker._id === diaMarker._id ) {
                        flag = false;
                    }
                } );
                return flag;
            } );

            callbackObj.removedIds = removed.map( function( d ) {
                return d._id;
            } );
            callbackObj.addedIds = added.map( function( d ) {
                return d._id;
            } );

        };

        /**
         *
         * a modal div to select Markers from Y.doccirrus.uam.MarkerArrayModel
         *
         * @method patientMarkerDialog
         * @param parameters {Object} configuration object
         * @param parameters.title {String}(optional) title of the modal dialog
         * @param parameters.checkedMarkers {ko.observableArray}(optional) observable Array of Markers to preselect
         * @param parameters.checkedMarkersMax {Number}(optional) max checkable, defaults to 5
         * @param parameters.callback {Function}(optional) callback parameter is an Object with properties 'success' and
         *                              'data'
         *                              callback.success {Boolean} false if the user cancelled the dialog
         *                              callback.data {Array} Array of selected Markers
         * @example
         * <pre>Y.doccirrus.utils.patientMarkerDialog({
         *     checkedMarkers : currentPatient.markers,
         *     callback : function(dialog){
         *         if (dialog.success) {
         *             currentPatient.markers(dialog.data);
         *         }
         *     }
         * });</pre>
         * @deprecated
         */
        DCUtils.prototype.patientMarkerDialog = function patientMarkerDialog( parameters ) {
            var title = parameters.title || 'Zuordnung',
                callback = parameters.callback || function() {
                    },
                checkedMarkersMax = parameters.checkedMarkersMax || 5,
                checkedMarkers = parameters.checkedMarkers,
                callbackObj = {
                    success: false,
                    data: [],
                    addedIds: [],
                    removedIds: []
                },
                modal,
                node = Y.Node.create( '<div id="modalDiv"></div>' );
            Y.Node.one( 'body' ).append( node );
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'patientMarkerDialog',
                'DocCirrus',
                {
                    title: title
                },
                node,
                function( /* err, data */ ) {
                    modal = $( '#patientMarkerDialog' );
                    modal.on( 'hidden.bs.modal', function() {
                        $( '#patientMarkerDialog' ).remove();
                        $( node.getDOMNode() ).remove();
                        callback( callbackObj );
                    } );
                    $( '#acceptModal', modal ).click( function() {
                        callbackObj.data = $( ':checked', modal ).toArray().map( function( input ) {
                            return ko.dataFor( input );
                        } );

                        mapMarkerChanges( callbackObj, checkedMarkers );

                        callbackObj.success = true;
                        modal.modal( 'hide' );
                    } );
                    $( '#cancelModal', modal ).click( function() {
                        modal.modal( 'hide' );
                    } );

                    var applyBindings = {
                        MarkerSeverityArrayModel: Y.doccirrus.uam.MarkerSeverityArrayModel,
                        MarkerArrayModel: Y.doccirrus.uam.MarkerArrayModel,
                        MarkerIconArrayModel: Y.doccirrus.uam.MarkerIconArrayModel,
                        markerIsChecked: function( markerModel ) {
                            var gotObservable = checkedMarkers;
                            if( gotObservable ) {
                                gotObservable = Y.doccirrus.uam.utils.getObservableByVal(
                                    checkedMarkers(),
                                    markerModel._id,
                                    '_id'
                                );
                            }
                            return gotObservable ? true : false;
                        }
                    };

                    ko.applyBindings( applyBindings, modal.get( 0 ) );

                    $( '[type=checkbox]', modal ).change( function() {
                        var left = checkedMarkersMax - $( ':checked', modal ).length;
                        if( 0 > left ) {
                            this.checked = !this.checked;
                        }
                    } );

                    modal.modal( 'show' );
                }
            );
        };

        /**
         *
         * a modal div to select Markers from Y.doccirrus.uam.MarkerArrayModel
         *
         * @method selectMarkers
         * @param parameters {Object} configuration object
         * @param parameters.checkedMarkers {ko.observableArray}(optional) observable Array of Markers to preselect
         * @param parameters.checkedMarkersMax {Number}(optional) max checkable, defaults to 5
         * @example
         * <pre>Y.doccirrus.utils.selectMarkers({
         *     checkedMarkers : currentPatient.markers
         * }).on( {
         *      select: function( facade, select ) {
         *          currentPatient.markers( select.data );
         *      }
         *  } );</pre>
         */
        DCUtils.prototype.selectMarkers = function( options ) {
            options = options || {};
            var
                eventTarget = new Y.EventTarget();

            eventTarget.publish( 'cancel', {preventable: false} );
            eventTarget.publish( 'select', {preventable: false} );

            Y.use( [
                'doccirrus',
                'DCWindow'
            ], function selectMarkers() {
                var
                    windowConfig = options.windowConfig || {},
                    checkedMarkersConfig = ko.unwrap( options.checkedMarkers ) || [],
                    markup = [
                        // TODO: move to template
                        '<div class="markers_config_table">',
                        '<div class="text-right"><small>maximal 10 wählbar</small></div>',
                        '<table class="table table-bordered">',
                        '<colgroup><col width="32"/><col width="100%"/><col width="32"/></colgroup>',
                        '<thead><tr><th>Symbol</th><th>Bezeichnung</th><th>Wählen</th></tr></thead>',
                        '<tbody data-bind="foreach: markers">',
                        '<tr>',
                        '<td style="text-align:center;"><span data-bind="attr: { class: icon }, style: { color: color }"></span></td>',
                        '<td><span data-bind="text: description"></span></td>',
                        '<td><input type="checkbox" data-bind="checkedValue: $data._id, checked: $root.checkedMarkers, disable: $root.disableCheck($data._id)"/></td>',
                        '</tr>',
                        '</tbody>',
                        '</table>',
                        '</div>'
                    ].join( '' ),
                    severityMap = ko.observable(),
                    markers = ko.observableArray(),
                    checkedMarkers = ko.observableArray( checkedMarkersConfig.map( function( marker ) {
                        return marker._id;
                    } ) ),
                    bindings = {},
                    bodyContent = Y.Node.create( markup ),
                    dialog = new Y.doccirrus.DCWindow( Y.aggregate( {
                        className: 'DCWindow-SelectMarkers',
                        bodyContent: bodyContent,
                        title: 'Zuordnung',
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        width: Y.doccirrus.DCWindow.SIZE_LARGE,
                        height: 400,
                        minHeight: 400,
                        minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [
                                Y.merge( Y.doccirrus.DCWindow.getButton( 'CANCEL' ), options.buttonCancelConfig ),
                                Y.merge( Y.doccirrus.DCWindow.getButton( 'SAVE', {
                                    isDefault: true,
                                    action: function( e ) {
                                        var
                                            select = {
                                                addedIds: [],
                                                removedIds: []
                                            },
                                            currentMarkers = checkedMarkers(),
                                            previousMarkers = checkedMarkersConfig.map( function( marker ) {
                                                return marker._id;
                                            } ),
                                            allMap = {};

                                        markers().forEach( function( marker ) {
                                            allMap[marker._id] = marker;
                                        } );

                                        select.data = currentMarkers.map( function( id ) {
                                            return allMap[id];
                                        } );

                                        currentMarkers.forEach( function( id ) {
                                            if( -1 === previousMarkers.indexOf( id ) ) {
                                                select.addedIds.push( id );
                                            }
                                        } );
                                        previousMarkers.forEach( function( id ) {
                                            if( -1 === currentMarkers.indexOf( id ) ) {
                                                select.removedIds.push( id );
                                            }
                                        } );

                                        dialog.close( e );
                                        eventTarget.fire( 'select', {}, select );
                                        eventTarget.detachAll();

                                    }
                                } ), options.buttonSelectConfig )
                            ]
                        },
                        after: {
                            visibleChange: function( yEvent ) {
                                // also captures cancel for e.g.: ESC
                                if( !yEvent.newVal ) {
                                    setTimeout( function() { // delay for letting others fire first
                                        eventTarget.fire( 'cancel' );
                                        eventTarget.detachAll();

                                        bindings.markers.dispose();
                                        ko.cleanNode( bodyContent.getDOMNode() );

                                    }, 10 );
                                }
                            }
                        }
                    }, windowConfig, true ) );

                bindings.markers = ko.computed( function() {
                    var
                        items = markers(),
                        map = severityMap();

                    if( !(items.length && map) ) {
                        return [];
                    }

                    return items.map( function( marker ) {

                        return Y.merge( marker, {
                            color: map[marker.severity].color,
                            icon: marker.icon,
                            marker: marker
                        } );
                    } );
                } ).extend( {rateLimit: 0} );

                bindings.checkedMarkers = checkedMarkers;
                bindings.disableCheck = function( id ) {
                    var
                        items = checkedMarkers(),
                        count = items.length;

                    if( -1 !== items.indexOf( id ) ) {
                        return false;
                    }
                    if( count < 10 ) {
                        return false;
                    }

                    return true;
                };

                Y.doccirrus.jsonrpc.api.severity
                    .read()
                    .then( function( response ) {
                        var
                            results = Y.Lang.isArray( response.data ) && response.data || [],
                            result = {};

                        results.forEach( function( item ) {
                            result[item.severity] = item;
                        } );

                        return result;
                    } )
                    .done( function( data ) {
                        severityMap( data );
                    } );

                Y.doccirrus.jsonrpc.api.marker
                    .read()
                    .done( function( response ) {
                        if( Array.isArray( response.data ) ) {
                            markers( response.data );
                        }
                    } );

                ko.applyBindings( bindings, bodyContent.getDOMNode() );

            } );

            return eventTarget;
        };

        /**
         * provides physician-selector via dialog
         * subscribe to event 'select' to receive the selected physician
         * subscribe to event 'cancel' to receive cancellation
         * @example
         Y.doccirrus.utils
         .selectPhysician()
         .after( {
                    cancel: function() {
                        // do something
                    },
                    select: function( yEvent, physician ) {
                        // do something
                    }
                } );
         * @example
         Y.doccirrus.utils
         .selectPhysician({checkMode:'multi'})
         .after( {
                    cancel: function() {
                        // do something
                    },
                    select: function( yEvent, physicians ) {
                        // do something
                    }
                } );
         * @example
         Y.doccirrus.utils
         .selectPhysician({windowConfig:{title:'foo'},buttonSelectConfig:{label:'bar'}})
         .after( {
                    cancel: function() {
                        // do something
                    },
                    select: function( yEvent, physician ) {
                        // do something
                    }
                } );
         * @method selectPhysician
         * @param {Object} [options]
         * @param {String} [options.checkMode='single'] checkMode of checkbox column
         * @param {Object} [options.windowConfig=default] a config object which overwrites defaults for the window
         * @param {Object} [options.buttonSelectConfig=default] a config object which overwrites defaults for the select button
         * @param {Object} [options.buttonCancelConfig=default] a config object which overwrites defaults for the cancel button
         * @returns {Y.EventTarget}
         */
        DCUtils.prototype.selectPhysician = function selectPhysician( options ) {
            options = options || {};
            var
                eventTarget = new Y.EventTarget();

            eventTarget.publish( 'cancel', {preventable: false} );
            eventTarget.publish( 'select', {preventable: false} );

            Y.use( [
                'doccirrus',
                'basecontact-schema',
                'dcschemaloader',
                'JsonRpcReflection-doccirrus',
                'JsonRpc',
                'DCWindow',
                'KoUI-all'
            ], function selectPhysicianUse() {
                var
                    checkMode = Y.Lang.isUndefined( options.checkMode ) ? 'single' : options.checkMode,
                    windowConfig = options.windowConfig || {},
                    specialities = [],
                    physicianTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                        componentType: 'KoTable',
                        componentConfig: {
                            stateId: 'utils_clientJS-selectPhysician-physicianTable',
                            states: ['limit'],
                            fillRowsToLimit: false,
                            remote: true,
                            proxy: Y.doccirrus.jsonrpc.api.basecontact.read,
                            baseParams: {
                                query: {
                                    baseContactType: 'PHYSICIAN'
                                },
                                forPhysicianTable : true,
                                forContactsTable: true
                            },
                            columns: [
                                {
                                    componentType: 'KoTableColumnCheckbox',
                                    forPropertyName: 'checked',
                                    checkMode: checkMode
                                },
                                {
                                    label: i18n( 'utils_clientJS.selectPhysician.physicianTable.lastname.label' ),
                                    forPropertyName: 'lastname',
                                    isSortable: true,
                                    isFilterable: true
                                },
                                {
                                    label: i18n( 'utils_clientJS.selectPhysician.physicianTable.firstname.label' ),
                                    forPropertyName: 'firstname',
                                    isSortable: true,
                                    isFilterable: true
                                },
                                {
                                    label: i18n( 'utils_clientJS.selectPhysician.physicianTable.bsnrs.label' ),
                                    forPropertyName: 'bsnrs',
                                    width: '100px',
                                    isSortable: true,
                                    isFilterable: true
                                },
                                {
                                    label: i18n( 'patient-schema.Patient_T.asvTeamNumbers.i18n' ),
                                    forPropertyName: 'asvTeamNumbers',
                                    width: '100px',
                                    isSortable: true,
                                    isFilterable: true
                                },
                                {
                                    label: i18n( 'utils_clientJS.selectPhysician.physicianTable.officialNo.label' ),
                                    forPropertyName: 'officialNo',
                                    width: '100px',
                                    isSortable: true,
                                    isFilterable: true
                                },
                                {
                                    label: i18n( 'utils_clientJS.selectPhysician.physicianTable.communications.label' ),
                                    forPropertyName: 'communications.value',
                                    isSortable: true,
                                    isFilterable: true,
                                    renderer: function( meta ) {
                                        var
                                            value = meta.row.communications;

                                        if( Array.isArray( value ) ) {
                                            value = value.map( function( communication ) {
                                                return communication.value;
                                            } );
                                            return value.join( ',<br>' );
                                        }

                                        return '';
                                    }
                                },
                                {
                                    label: i18n( 'utils_clientJS.selectPhysician.physicianTable.expertise.label' ),
                                    forPropertyName: 'expertise',
                                    isSortable: true,
                                    isFilterable: true,
                                    renderer: function( meta ) {
                                        var expertise = meta.value,
                                            specialitiesList = specialities.slice(),
                                            oldExpertiseList = Y.doccirrus.schemas.basecontact.types.Expert_E.list,
                                            expertiseValues = [],
                                            result;
                                        oldExpertiseList.forEach( function( oldExpertise ) {
                                            specialitiesList.push( {id: oldExpertise.val, text: oldExpertise.i18n} );
                                        } );
                                        if( Array.isArray( expertise ) && expertise[0] ) {
                                            expertise.forEach( function( entry ) {
                                                expertiseValues.push( specialitiesList.find( function( item ) {
                                                    return item.id === entry;
                                                } ) );
                                            } );
                                        }
                                        if( Array.isArray( expertiseValues ) && expertiseValues.length ) {
                                            result = expertiseValues.filter( function( expertise ) {
                                                return Boolean( expertise && expertise.text );
                                            } ).map( function( expertise ) {
                                                return expertise.text;
                                            } );
                                            return result.join( ',<br>' );
                                        }
                                        return Y.doccirrus.schemaloader.getEnumListTranslation( 'basecontact', 'Expert_E', expertise, 'i18n', '' );
                                    }
                                },
                                {
                                    forPropertyName: 'addresses.0.city',
                                    label: i18n( 'person-schema.Address_T.city' ),
                                    title: i18n( 'person-schema.Address_T.city' ),
                                    isFilterable: true,
                                    isSortable: true,
                                    visible: true,
                                    pdfRenderer: function( meta ) {
                                        var exists = ( meta.row.addresses && meta.row.addresses[0] && meta.row.addresses[0].city );
                                        return exists ? meta.row.addresses[0].city : '';
                                    }
                                }
                            ],
                            selectMode: 'none',
                            exportCsvConfiguration: {
                                columns: [
                                    {
                                        forPropertyName: 'communications.value',
                                        stripHtml: true
                                    }
                                ]
                            }
                        }
                    } ),
                    bodyContent = Y.Node.create( '<div data-bind="template: physicianTable.template" style="margin: -20px"></div>' ),
                    dialog = new Y.doccirrus.DCWindow( Y.aggregate( {
                        className: 'DCWindow-SelectPhysician',
                        bodyContent: bodyContent,
                        title: i18n( 'utils_clientJS.selectPhysician.dialog.title' ),
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        height: 400,
                        minHeight: 400,
                        minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [
                                Y.merge( Y.doccirrus.DCWindow.getButton( 'CANCEL' ), options.buttonCancelConfig ),
                                Y.merge( Y.doccirrus.DCWindow.getButton( 'SELECT', {
                                    isDefault: true,
                                    action: function( e ) {
                                        var
                                            physicians = ko.unwrap( physicianTable.getComponentColumnCheckbox().checked ),
                                            select;

                                        if( !physicians.length ) {
                                            Y.doccirrus.DCWindow.notice( {
                                                type: 'warn',
                                                message: i18n( 'general.message.NO_SELECTION' )
                                            } );
                                        } else {

                                            e.target.button.disable();

                                            if( 'single' === checkMode ) {
                                                select = physicians[0];
                                            }
                                            else {
                                                select = physicians;
                                            }

                                            dialog.close( e );
                                            eventTarget.fire( 'select', {}, select );
                                            eventTarget.detachAll();

                                        }

                                    }
                                } ), options.buttonSelectConfig )
                            ]
                        },
                        after: {
                            visibleChange: function( yEvent ) {
                                // also captures cancel for e.g.: ESC
                                if( !yEvent.newVal ) {
                                    setTimeout( function() { // delay for letting others fire first
                                        eventTarget.fire( 'cancel' );
                                        eventTarget.detachAll();

                                        ko.cleanNode( bodyContent.getDOMNode() );
                                        physicianTable.dispose();

                                    }, 10 );
                                }
                            }
                        }
                    }, windowConfig, true ) );

                Promise.props( {
                    specialitiesList: Y.doccirrus.jsonrpc.api.kbv.fachgruppe().then( function( response ) {
                        return (response && response.data && response.data[0].kvValue || []).map( function( entry ) {
                            return {id: entry.key, text: entry.value};
                        } );
                    } )
                } ).then( function( result ) {
                    specialities = result.specialitiesList;

                    ko.applyBindings( {
                        physicianTable: physicianTable
                    }, bodyContent.getDOMNode() );

                } );
            } );

            return eventTarget;
        };

        /**
         * provides patient-selector via dialog
         * subscribe to event 'select' to receive the selected patient
         * subscribe to event 'cancel' to receive cancellation
         * @example
         Y.doccirrus.utils
         .selectPatient()
         .after( {
                    cancel: function() {
                        // do something
                    },
                    select: function( yEvent, patientId ) {
                        // do something
                    }
                } );
         * @example
         Y.doccirrus.utils
         .selectPatient({checkMode:'multi'})
         .after( {
                    cancel: function() {
                        // do something
                    },
                    select: function( yEvent, patientIds ) {
                        // do something
                    }
                } );
         * @example
         Y.doccirrus.utils
         .selectPatient({returnId:false})
         .after( {
                    cancel: function() {
                        // do something
                    },
                    select: function( yEvent, patientObject ) {
                        // do something
                    }
                } );
         * @example
         Y.doccirrus.utils
         .selectPatient({checkMode:'multi',returnId:false})
         .after( {
                    cancel: function() {
                        // do something
                    },
                    select: function( yEvent, patientObjects ) {
                        // do something
                    }
                } );
         * @example
         Y.doccirrus.utils
         .selectPatient({windowConfig:{title:'foo'},buttonSelectConfig:{label:'bar'}})
         .after( {
                    cancel: function() {
                        // do something
                    },
                    select: function( yEvent, patientId ) {
                        // do something
                    }
                } );
         * @method selectPatient
         * @param {Object} [options]
         * @param {String} [options.checkMode='single'] checkMode of checkbox column
         * @param {Boolean} [options.returnId=true] select returns id or patient objects
         * @param {Object} [options.windowConfig=default] a config object which overwrites defaults for the window
         * @param {Object} [options.buttonSelectConfig=default] a config object which overwrites defaults for the select button
         * @param {Object} [options.buttonCancelConfig=default] a config object which overwrites defaults for the cancel button
         * @returns {Y.EventTarget}
         */
        DCUtils.prototype.selectPatient = function selectPatient( options ) {
            options = options || {};
            var
                eventTarget = new Y.EventTarget();

            eventTarget.publish( 'cancel', {preventable: false} );
            eventTarget.publish( 'select', {preventable: false} );

            Y.use( [
                'doccirrus',
                'dcschemaloader',
                'person-schema',
                'patient-schema',
                'JsonRpcReflection-doccirrus',
                'JsonRpc',
                'DCWindow',
                'KoUI-all'
            ], function selectPatientUse() {
                var
                    checkMode = Y.Lang.isUndefined( options.checkMode ) ? 'single' : options.checkMode,
                    returnId = Y.Lang.isUndefined( options.returnId ) ? true : options.returnId,
                    windowConfig = options.windowConfig || {},
                    getWithoutSerialNumber = options.getWithoutSerialNumber || false,
                    patientTable = Y.doccirrus.KoUI.KoComponentManager.createComponent( {
                        componentType: 'KoTable',
                        componentConfig: {
                            stateId: 'utils_clientJS-selectPatient-patientTable',
                            states: ['limit'],
                            fillRowsToLimit: false,
                            remote: true,
                            proxy: Y.doccirrus.jsonrpc.api.patient.getForPatientBrowser,
                            baseParams: (!getWithoutSerialNumber) ? {} : {
                                query: {
                                    $or: [
                                        {"partnerIds.partnerId": {$ne: "CARDIO" }},
                                        {"partnerIds": {$elemMatch: {
                                            "partnerId": "CARDIO",
                                            $or: [
                                                {"patientId": ""},
                                                {"patientId": { $exists: false }},
                                                {"isDisabled": true}
                                            ]
                                        }}}
                                    ]

                                }
                            },
                            columns: [
                                {
                                    componentType: 'KoTableColumnCheckbox',
                                    forPropertyName: 'checked',
                                    checkMode: checkMode
                                },
                                {
                                    forPropertyName: 'lastname',
                                    label: i18n( 'InCaseMojit.patient_browserJS.placeholder.SURNAME' ),
                                    width: '35%',
                                    isSortable: true,
                                    sortInitialIndex: 0,
                                    isFilterable: true,
                                    renderer: function( meta ) {
                                        var data = meta.row;
                                        return data.lastname + (data.nameaffix ? ', ' + data.nameaffix : '') + (data.title ? ', ' + data.title : '');
                                    }
                                },
                                {
                                    forPropertyName: 'firstname',
                                    label: i18n( 'InCaseMojit.patient_browserJS.placeholder.FORENAME' ),
                                    width: '35%',
                                    isSortable: true,
                                    isFilterable: true
                                },
                                {
                                    forPropertyName: 'dob',
                                    label: i18n( 'InCaseMojit.patient_browserJS.label.DOB' ),
                                    width: '142px',
                                    isSortable: true,
                                    isFilterable: true,
                                    queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                    renderer: function( meta ) {
                                        var data = meta.row;
                                        if( data.kbvDob ) {
                                            return data.kbvDob;
                                        }
                                        return moment.utc( data.dob ).local().format( 'DD.MM.YYYY' );
                                    }
                                },
                                {
                                    forPropertyName: 'gender',
                                    label: i18n( 'InCaseMojit.patient_browserJS.label.SEX' ),
                                    width: '60px',
                                    renderer: function( meta ) {
                                        var gender = meta.value;

                                        switch( gender ) {
                                            case 'MALE':
                                                return 'm';
                                            case 'FEMALE':
                                                return 'w';
                                            case 'UNDEFINED':
                                                return 'x';
                                            case 'VARIOUS':
                                                return 'd';
                                            default:
                                                return 'u';
                                        }

                                    },
                                    isFilterable: true,
                                    queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                    filterField: {
                                        componentType: 'KoFieldSelect',
                                        options: Y.Array.filter( Y.doccirrus.schemas.patient.types.Gender_E.list, function( item ) {
                                            return Boolean( item.val );
                                        } ).map( function( item ) {
                                            var gender = item.val;

                                            switch( gender ) {
                                                case 'MALE':
                                                    return {val: gender, i18n: 'm'};
                                                case 'FEMALE':
                                                    return {val: gender, i18n: 'w'};
                                                case 'UNDEFINED':
                                                    return {val: gender, i18n: 'x'};
                                                case 'VARIOUS':
                                                    return {val: gender, i18n: 'd'};
                                                default:
                                                    return {val: gender, i18n: 'u'};
                                            }
                                        } ),
                                        optionsCaption: '',
                                        optionsText: 'i18n',
                                        optionsValue: 'val'
                                    }
                                },
                                {
                                    forPropertyName: 'insuranceStatus.type',
                                    label: i18n( 'InCaseMojit.patient_browserJS.placeholder.INSURANCE' ),
                                    width: '136px',
                                    visible: false,
                                    isSortable: true,
                                    isFilterable: true,
                                    renderer: function( meta ) {
                                        var
                                            data = meta.row,
                                            insuranceStatus = data.insuranceStatus;

                                        if( Array.isArray( insuranceStatus ) && insuranceStatus.length ) {
                                            return insuranceStatus.map( function( entry ) {
                                                return Y.doccirrus.schemaloader.getEnumListTranslation( 'person', 'Insurance_E', entry.type, 'i18n', '' );
                                            } ).join( ', ' );
                                        }

                                        return '';
                                    },
                                    queryFilterType: Y.doccirrus.DCQuery.ENUM_OPERATOR,
                                    filterField: {
                                        componentType: 'KoFieldSelect2',
                                        options: Y.doccirrus.schemas.person.types.Insurance_E.list,
                                        optionsText: 'i18n',
                                        optionsValue: 'val'
                                    }
                                },
                                {
                                    forPropertyName: 'communications.value',
                                    label: i18n( 'InCaseMojit.patient_browserJS.placeholder.CONTACT' ),
                                    width: '30%',
                                    isSortable: true,
                                    isFilterable: true,
                                    renderer: function( meta ) {
                                        var
                                            value = meta.row.communications;

                                        if( Array.isArray( value ) ) {
                                            value = value.map( function( communication ) {
                                                return communication.value;
                                            } );
                                            return value.join( ',<br>' );
                                        }

                                        return '';
                                    }
                                },
                                {
                                    forPropertyName: 'nextAppointment',
                                    isSortable: true,
                                    label: i18n( 'InCaseMojit.patient_browserJS.label.APPOINTMENT' ),
                                    width: '126px',
                                    visible: false,
                                    isFilterable: true,
                                    queryFilterType: Y.doccirrus.DCQuery.KBVDOB_OPERATOR,
                                    renderer: function( meta ) {
                                        var
                                            value = meta.value;

                                        if( value ) {
                                            return moment( value ).format( 'DD.MM.YYYY HH:mm' );
                                        }
                                        return '';
                                    }
                                },
                                {
                                    forPropertyName: 'patientNo',
                                    label: i18n( 'InCaseMojit.patient_browserJS.placeholder.NUMBER' ),
                                    width: '100px',
                                    visible: false,
                                    isSortable: true,
                                    isFilterable: true,
                                    collation: { locale: 'de', numericOrdering: true }
                                }
                            ],
                            selectMode: 'none'
                        }
                    } ),
                    bodyContent = Y.Node.create( '<div data-bind="template: patientTable.template" style="margin: -20px"></div>' ),
                    dialog = new Y.doccirrus.DCWindow( Y.aggregate( {
                        className: 'DCWindow-SelectPatient',
                        bodyContent: bodyContent,
                        title: i18n( 'utils_clientJS.selectPatient.dialog.title' ),
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        width: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        height: 400,
                        minHeight: 400,
                        minWidth: Y.doccirrus.DCWindow.SIZE_XLARGE,
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close', 'maximize'],
                            footer: [
                                Y.merge( Y.doccirrus.DCWindow.getButton( 'CANCEL' ), options.buttonCancelConfig ),
                                Y.merge( Y.doccirrus.DCWindow.getButton( 'SELECT', {
                                    isDefault: true,
                                    action: function( e ) {
                                        var
                                            checked = ko.unwrap( patientTable.getComponentColumnCheckbox().checked ),
                                            patientIds = checked.map( function( patient ) {
                                                return patient._id;
                                            } ),
                                            select;

                                        if( !checked.length ) {
                                            Y.doccirrus.DCWindow.notice( {
                                                type: 'warn',
                                                message: i18n( 'general.message.NO_SELECTION' )
                                            } );
                                        } else {

                                            e.target.button.disable();

                                            if( returnId ) {

                                                if( 'single' === checkMode ) {
                                                    select = patientIds[0];
                                                }
                                                else {
                                                    select = patientIds;
                                                }

                                                dialog.close( e );
                                                eventTarget.fire( 'select', {}, select );
                                                eventTarget.detachAll();
                                            }
                                            else {

                                                Y.doccirrus.jsonrpc.api.patient
                                                    .read( {query: {_id: {$in: patientIds}}} )
                                                    .then( function( response ) {
                                                        return response.data || [];
                                                    } ).done( function( patients ) {

                                                    if( 'single' === checkMode ) {
                                                        select = patients[0];
                                                    }
                                                    else {
                                                        select = patients;
                                                    }

                                                    dialog.close( e );
                                                    eventTarget.fire( 'select', {}, select );
                                                    eventTarget.detachAll();
                                                } );
                                            }

                                        }

                                    }
                                } ), options.buttonSelectConfig )
                            ]
                        },
                        after: {
                            visibleChange: function( yEvent ) {
                                // also captures cancel for e.g.: ESC
                                if( !yEvent.newVal ) {
                                    setTimeout( function() { // delay for letting others fire first
                                        eventTarget.fire( 'cancel' );
                                        eventTarget.detachAll();

                                        ko.cleanNode( bodyContent.getDOMNode() );
                                        patientTable.dispose();

                                    }, 10 );
                                }
                            }
                        }
                    }, windowConfig, true ) );

                ko.applyBindings( {
                    patientTable: patientTable
                }, bodyContent.getDOMNode() );

            } );

            return eventTarget;
        };

        /**
         *  Keep a local value in localStorage
         *
         *  All keys and values are assumed to be strings for simplicity and to be compatable with other stores
         *  NOTE: this uses localStorage by default, may in future support a cookie fallback for older browsers
         *  or a polyfill to Adobe Flash cookies.
         *
         * @method localValueSet
         *  @param  {string} key Uniquely identifies item to be stored
         *  @param  {string} newValue Replaces any previous value
         *  @param  {string} [userId] value is part of key
         *  @return {bool} True on success, false on failure
         */
        DCUtils.prototype.localValueSet = function( key, newValue, userId ) {
            var loggedInUser = userId || Y.doccirrus.auth.getUserId();

            //  check for legacy browsers, or browsers with localStorage disabled
            if( 'undefined' === (typeof localStorage) ) {
                return false;
            }
            if( ('object' === (typeof newValue)) ||
                ('boolean' === (typeof newValue)) ||
                ('number' === (typeof newValue)) ) {
                newValue = JSON.stringify( newValue );
            }

            //  compartmantalize localStorage by user
            key = loggedInUser + '_' + key;

            try {

                localStorage[key] = newValue;

                if( JSON.stringify( newValue ) === JSON.stringify( localStorage[key] ) ) {
                    return true;
                }
            } catch( e ) {
                Y.log( 'Could not store local value "' + key + '", browser does not expose localStorage', 'warn', NAME );
                return false;
            }

            Y.log( 'Could not store local value "' + key + '", browser does not expose localStorage', 'warn', NAME );
            return false;
        };

        /**
         *  Recover a value from localStorage
         *
         * @method localValueGet
         *  @param  {string} key    Value to be recovered from local storage
         *  @param  {string} [userId] value is part of key
         *  @return {string} Value, or empty string on failure
         */
        DCUtils.prototype.localValueGet = function( key, userId ) {
            var loggedInUser = userId || Y.doccirrus.auth.getUserId();

            if( 'undefined' === (typeof localStorage) ) {
                return '';
            }

            //  compartmentalize localStorqge by user
            key = loggedInUser + '_' + key;

            if( false === localStorage.hasOwnProperty( key ) ) {
                return '';
            }

            var storedValue = localStorage[key];

            if( 'object' === (typeof storedValue) ) {
                storedValue = JSON.stringify( storedValue );
            }

            return storedValue;
        };

        /**
         *  Clear a user associated values from local storage
         *
         * @method localValueClear
         */
        DCUtils.prototype.localValueClear = function() {
            var
                loggedInUser = Y.doccirrus.auth.getUserId(),
                prefix = loggedInUser + '_',
                associatedKeys = [];

            if( 'undefined' === (typeof localStorage) ) {
                return;
            }

            Y.Object.each( localStorage, function( v, k ) {
                if( 0 === k.indexOf( prefix ) ) {
                    associatedKeys.push( k );
                }
            } );

            associatedKeys.forEach( function( key ) {
                localStorage.removeItem( key );
            } );
        };

        /**
         *  Clear a user associated values from local storage and schemas
         *
         * @method localValueClearAll
         */
        DCUtils.prototype.localValueClearAll = function() {
            var
                loggedInUser = Y.doccirrus.auth.getUserId(),
                prefix = loggedInUser + '_',
                associatedKeys = [];

            if( 'undefined' === (typeof localStorage) ) {
                return;
            }
            Y.Object.each( localStorage, function( v, k ) {
                if( prefix === k.substring( 0, prefix.length ) ) {
                    associatedKeys.push( k );
                }
                if( 'schema' === k.substring( 0, 6 ) ) {
                    associatedKeys.push( k );
                }
            } );
            associatedKeys.forEach( function( key ) {
                localStorage.removeItem( key );
            } );
        };

        /**
         *  Keep a local value in sessionStorage
         *
         * @method sessionValueSet
         *  @param  {string} key Uniquely identifies item to be stored
         *  @param  {string} newValue Replaces any previous value
         *  @param  {string} [userId] value is part of key
         *  @return {bool} True on success, false on failure
         */
        DCUtils.prototype.sessionValueSet = function( key, newValue, userId ) {
            var loggedInUser = userId || Y.doccirrus.auth.getUserId();

            //  check for legacy browsers, or browsers with sessionValueSet disabled
            if( 'undefined' === (typeof sessionStorage) ) {
                return false;
            }
            if( ('object' === (typeof newValue)) ||
                ('boolean' === (typeof newValue)) ||
                ('number' === (typeof newValue)) ) {
                newValue = JSON.stringify( newValue );
            }

            //  sessionValueSet by user
            key = loggedInUser + '_' + key;

            try {

                sessionStorage[key] = newValue;

                if( JSON.stringify( newValue ) === JSON.stringify( sessionStorage[key] ) ) {
                    return true;
                }
            } catch( e ) {
                Y.log( 'Could not store session value "' + key + '", browser does not expose sessionStorage', 'warn', NAME );
                return false;
            }

            Y.log( 'Could not store session value "' + key + '", browser does not expose sessionStorage', 'warn', NAME );
            return false;
        };

        /**
         *  Recover a value from sessionStorage
         *
         * @method sessionValueGet
         *  @param  {string} key    Value to be recovered from sessionStorage
         *  @param  {string} [userId] value is part of key
         *  @return {string} Value, or empty string on failure
         */
        DCUtils.prototype.sessionValueGet = function( key, userId ) {
            var
                loggedInUser = userId || Y.doccirrus.auth.getUserId(),
                storedValue;

            if( 'undefined' === (typeof sessionStorage) ) {
                return '';
            }

            //  compartmentalize localStorqge by user
            key = loggedInUser + '_' + key;

            if( false === sessionStorage.hasOwnProperty( key ) ) {
                return '';
            }

            storedValue = sessionStorage[key];

            if( 'object' === (typeof storedValue) ) {
                storedValue = JSON.stringify( storedValue );
            }

            return storedValue;
        };

        /**
         * Returns the local storage filter object
         * @method getFilter
         * @return {object} local storage filter object
         */
        DCUtils.prototype.getFilter = function() {
            var filter = {};
            try {
                filter = JSON.parse( this.localValueGet( 'filter' ) );
            } catch( parseException ) {
                filter = {};
            }
            return filter;
        };

        /**
         *  Load all values from local storage as the properties of an object
         *
         * @method localValueAll
         *  @return         {object}    Copy of localStorage object
         */
        DCUtils.prototype.localValueAll = function() {

            var
                i,//% loop counter [int]
                localData = {};//% return value [object]

            if( 'undefined' === (typeof localStorage) ) {
                return '';
            }

            for( i = 0; i < localStorage.length; i++ ) {
                localData[localStorage.key( i )] = localStorage.getItem( localStorage.key( i ) );
            }

            return localData;
        };

        /**
         * Applies datepicker to all .date-picker class elements on the page.
         * These elements need class .input-group for bootstrap 3 too.
         * Example DOM:
         *      .form-group
         *          label(for="dob").control-label Geburtstag
         *          .date-picker.input-group
         *              input.form-control(value='01.01.1970')
         *
         * @method applyDatepicker
         * @param div {string|HTMLElement} look in a specified area for datepicker elements
         * @param options {object} specify options for the datetimepicker itself
         *                      - language {string} default: 'de'
         *                      - format {string} default: 'DD.MM.YYYY'
         * @see assets/lib/bootstrap/bootstrap-datetimepicker/4.7.14/js/bootstrap-datetimepicker-defaults.js
         * @see http://eonasdan.github.io/bootstrap-datetimepicker/
         * @deprecated
         */
        DCUtils.prototype.applyDatepicker = function( div, options ) {

            options = Y.aggregate( {
                format: jQuery.fn.datetimepicker.defaults.format
            }, options, true );

            div = div || 'body';

            var
                faIcon = Y.doccirrus.utils.hasDateDatepicker( options.format ) ? 'fa-calendar' : 'fa-clock-o',
                iconString = '<span class="input-group-addon add-on"><i class="fa ' + faIcon + '"></i></span>';

            $.each( $( '.date-picker', div ), function( index, dateContainer ) {
                dateContainer = $( dateContainer );
                // only apply datetimepicker once
                if( dateContainer.data( 'DateTimePicker' ) ) {
                    return true; // continue
                }
                $( iconString ).insertAfter( dateContainer.find( 'input' ) );
                dateContainer
                    .addClass( 'date' )
                    .datetimepicker( options );
            } );

        };

        /**
         * Exposes some private functions of bootstrap-datetimejs version : 4.7.14
         * @private
         */
        (function exposeDateTimePickerPrivateFunctions() {
            var
                actualFormat;

            /**
             * private function of bootstrap-datetimejs version : 4.7.14
             * @param granularity
             * @return {boolean}
             * @private
             */
            function isEnabled( granularity ) {
                if( typeof granularity !== 'string' || granularity.length > 1 ) {
                    throw new TypeError( 'isEnabled expects a single character string parameter' );
                }
                switch( granularity ) {
                    case 'y':
                        return actualFormat.indexOf( 'Y' ) !== -1;
                    case 'M':
                        return actualFormat.indexOf( 'M' ) !== -1;
                    case 'd':
                        return actualFormat.toLowerCase().indexOf( 'd' ) !== -1;
                    case 'h':
                    case 'H':
                        return actualFormat.toLowerCase().indexOf( 'h' ) !== -1;
                    case 'm':
                        return actualFormat.indexOf( 'm' ) !== -1;
                    case 's':
                        return actualFormat.indexOf( 's' ) !== -1;
                    default:
                        return false;
                }
            }

            /**
             * private function of bootstrap-datetimejs version : 4.7.14
             * @return {boolean}
             * @private
             */
            function hasTime() {
                return (isEnabled( 'h' ) || isEnabled( 'm' ) || isEnabled( 's' ));
            }

            /**
             * private function of bootstrap-datetimejs version : 4.7.14
             * @return {boolean}
             * @private
             */
            function hasDate() {
                return (isEnabled( 'y' ) || isEnabled( 'M' ) || isEnabled( 'd' ));
            }

            /**
             * get format from different provided cases
             * @param {String|Object|DateTimePicker|jQuery|HTMLElement} datePicker
             * @return {boolean}
             */
            function getFormatDateTimePicker( datePicker ) {
                var
                    format = false,
                    instance = null;

                if( 'string' === typeof datePicker ) {
                    format = datePicker;
                }
                else if( datePicker instanceof jQuery ) {
                    instance = datePicker.data( 'DateTimePicker' );
                    if( instance ) {
                        format = instance.format();
                    }
                }
                else if( typeof HTMLElement === "object" ? datePicker instanceof HTMLElement : //DOM2
                    datePicker && typeof datePicker === "object" && datePicker !== null && datePicker.nodeType === 1 && typeof datePicker.nodeName === "string" ) {

                    instance = jQuery( datePicker ).data( 'DateTimePicker' );
                    if( instance ) {
                        format = instance.format();
                    }
                }
                else if( Y.Lang.isObject( datePicker ) ) {
                    switch( Y.Lang.type( datePicker.format ) ) {
                        case 'function':
                            format = datePicker.format();
                            break;
                        default :
                            format = datePicker.format;
                            break;
                    }
                }

                if( !format ) {
                    format = 'L LT'; // the default format
                }

                return format;

            }

            /**
             * Uses private functions of bootstrap-datetimejs version : 4.7.14 to determine if a time is selectable
             * @param {String|Object|DateTimePicker|jQuery|HTMLElement} datePicker
             * @return {boolean}
             */
            DCUtils.prototype.hasTimeDatepicker = function DCUtils_hasTimeDatepicker( datePicker ) {
                actualFormat = getFormatDateTimePicker( datePicker );
                return hasTime();
            };

            /**
             * Uses private functions of bootstrap-datetimejs version : 4.7.14 to determine if a date is selectable
             * @param {String|Object|DateTimePicker|jQuery|HTMLElement} datePicker
             * @return {boolean}
             */
            DCUtils.prototype.hasDateDatepicker = function DCUtils_hasDateDatepicker( datePicker ) {
                actualFormat = getFormatDateTimePicker( datePicker );
                return hasDate();
            };

        })();

        /**
         * Call a patient on planned events. We suppose these patients have portal access with an email or mobile phone.
         *
         * eventIds is expected to be an array of schedule ids
         * @method callPatient
         */
        DCUtils.prototype.callPatient = function( eventIds, content, callback ) {
            var
                eventIdArr = [];

            //error cases:
            //#0 empty params
            //#1 patient has no email or phone number
            if( eventIds && callback ) {
                if( Array.isArray( eventIds ) ) {
                    eventIdArr = eventIdArr.concat( eventIds );
                } else {
                    callback( 'eventIds is expected to be of type array' );
                }
                $.ajax(
                    {
                        type: 'post',
                        xhrFields: {
                            withCredentials: true
                        },
                        url: Y.doccirrus.infras.getPrivateURL( '/r/callpatient/?action=callpatient' ),
                        data: {eventIds: eventIdArr, content: content},
                        //this is brutal use of success (=200) as mojito delivers no (useful) error messages with 40x or 50x codes
                        success: function( data ) {
                            if( data && 0 < data.length ) {
                                //cave: if not empty, data will contain errors!
                                callback( data /*=err*/, null );
                            }
                            else {
                                callback( null, null );
                            }
                        }
                    }
                );
            } else {
                callback( 'patientId must not be empty', null );
            }

        };

        /**
         * encapsulates query making for calevent GET request
         * not meant for search queries
         * @param url
         * @param params
         * @returns {string}
         * @deprecated
         */
        DCUtils.prototype.getCaleventGetUrl = function( params ) {
            var
                url = '/1/calevent/' + params._id,
                queryStr = 'scheduleId=' + params.scheduleId + '&' + 'start=' + params.start;
            return url + '?' + queryStr;
        };

        DCUtils.prototype.getLocationFromLocations = function( locationId ) {
            var location;
            if( locationId ) {
                location = (Y.mojito.binders.InCaseMojitBinder.getInitialData( 'location' ) || []).find( function( element ) {
                    return element._id === locationId;
                } );
                return location;
            }
        };

        DCUtils.prototype.getCustomLocationAndEmployee = function( currentPatient ) {
            var
                unwrap = ko.unwrap,
                customLocation,
                customEmployee,
                lastSchein,
                activeCaseFolderId = unwrap( currentPatient.activeCaseFolderId );

            return new Promise( function( resolve ) {
                Y.doccirrus.jsonrpc.api.patient.lastSchein( {
                    query: {
                        caseFolderId: unwrap( currentPatient.activeCaseFolderId ),
                        patientId: unwrap( currentPatient._id ),
                        timestamp: new Date()
                    }
                } )
                    .done( function( response ) {
                        lastSchein = response && response.data && response.data[0];
                        customLocation = Y.doccirrus.utils.getLocationFromLocations( lastSchein && lastSchein.locationId );
                        var employeeIdFromSchein = lastSchein && lastSchein.employeeId;
                        customEmployee = customLocation && customLocation.employees.find( function( elem ) {
                            return elem._id === employeeIdFromSchein;
                        } );
                    } )
                    .fail( function( error ) {
                        Y.log( 'last schein failed: ' + JSON.stringify( error ), 'error', NAME );
                    } )
                    .always( function() {
                        var currentCaseFolder,
                            currentCaseFolderType,
                            insuranceStatusFromCurrentCaseFolder,
                            employeeIdFromCaseFolder;

                        if( !customLocation ) {
                            currentCaseFolder = unwrap( currentPatient.caseFolderCollection.items ).find( function( element ) {
                                return element._id === activeCaseFolderId;
                            } );

                            currentCaseFolderType = currentCaseFolder && currentCaseFolder.type;
                            insuranceStatusFromCurrentCaseFolder = unwrap( currentPatient.insuranceStatus ).find( function( elem ) {
                                var loc = Y.doccirrus.utils.getLocationFromLocations( elem.locationId() );
                                if( !currentCaseFolderType && loc ) {
                                    return true;
                                } else {
                                    return elem.type() === currentCaseFolderType;
                                }
                            } );
                            customLocation = Y.doccirrus.utils.getLocationFromLocations( insuranceStatusFromCurrentCaseFolder && insuranceStatusFromCurrentCaseFolder.locationId() );
                            employeeIdFromCaseFolder = insuranceStatusFromCurrentCaseFolder && insuranceStatusFromCurrentCaseFolder.employeeId();

                            if( customLocation && employeeIdFromCaseFolder ) {
                                customEmployee = customLocation && customLocation.employees.find( function( elem ) {
                                    return elem._id === employeeIdFromCaseFolder;
                                } );
                            }
                        }
                        resolve( {
                            customLocation: customLocation,
                            customEmployee: customEmployee,
                            lastSchein: lastSchein
                        } );
                    } );
            } );
        };

        /**
         * Checks if users browser supports webRTC
         * @returns {boolean}
         */
        DCUtils.prototype.supportsWebRTC = function() {
            if( !navigator.getUserMedia && !navigator.mozGetUserMedia && !navigator.webkitGetUserMedia ) {
                return false;
            }
            if( !window.RTCPeerConnection && !window.webkitRTCPeerConnection && !window.mozRTCPeerConnection ) {
                return false;
            }
            return true;
        };

        DCUtils.prototype.getPatientTitle = function( currentPatient ) {
            var
                panelTitle = [],
                unwrap = ko.unwrap,
                kbvDob = unwrap( currentPatient.kbvDob ),
                dateOfDeath = unwrap( currentPatient.dateOfDeath ),
                age = unwrap( currentPatient.age ),
                personData = {
                    title: unwrap( currentPatient.title ),
                    nameaffix: unwrap( currentPatient.nameaffix ),
                    fk3120: unwrap( currentPatient.fk3120 ),
                    lastname: unwrap( currentPatient.lastname ),
                    firstname: unwrap( currentPatient.firstname )
                },
                personDisplay = Y.doccirrus.schemas.person.personDisplay( personData ),
                genderDisplay = '';

            panelTitle.push( personDisplay );
            panelTitle.push( ', ' );
            if( '00.00.0000' !== kbvDob) {
                panelTitle.push( kbvDob );
            }
            if( dateOfDeath ) {
                panelTitle.push( ' - ' );
                panelTitle.push( moment( dateOfDeath ).format( 'DD.MM.YYYY' ) );
            }
            panelTitle.push( ' (' );
            panelTitle.push( age );
            panelTitle.push( ') ' );

            switch( unwrap( currentPatient.gender ) ) {
                case 'MALE':
                    genderDisplay = 'M';
                    break;
                case 'FEMALE':
                    genderDisplay = 'W';
                    break;
                case 'UNDEFINED':
                    genderDisplay = 'X';
                    break;
                case 'VARIOUS':
                    genderDisplay = 'D';
                    break;
                default:
                    genderDisplay = 'U';
                    break;
            }
            panelTitle.push( genderDisplay );

            return panelTitle.join( '' );
        };

        myUtils = new DCUtils();

        (function() {
            var
                observable = null;

            function getBootstrapScreenWidthObservable() {
                if( !window.matchMedia ) {
                    Y.log( 'getBootstrapScreenWidthComputed: browser doesn\'t support "matchMedia"', 'error', NAME );
                }
                if( observable ) {
                    return observable;
                }
                var
                    queries = {
                        xs: '(max-width: 699px)', // (max-width: 767px)
                        sm: '(min-width: 700px) and (max-width: 991px)', // (min-width: 768px) and (max-width: 991px)
                        md: '(min-width: 992px) and (max-width: 1199px)', // (min-width: 992px) and (max-width: 1199px)
                        lg: '(min-width: 1200px)' // (min-width: 1200px)
                    };

                observable = ko.observable();

                Y.each( queries, function( query, key ) {
                    var
                        mediaQuery = window.matchMedia( query );

                    if( mediaQuery.matches ) {
                        observable( key );
                    }

                    mediaQuery.addListener( function( mediaQuery ) {
                        if( mediaQuery.matches ) {
                            observable( key );
                        }
                    } );
                } );

                return observable;
            }

            /**
             * Creates an observable which computes the current bootstrap screen width abbreviation, eg: xs, sm, md or lg
             * @method getBootstrapScreenWidthComputed
             * @param {Object} [options] a ko.computed options
             * @return {ko.computed}
             * @for doccirrus.utils
             * @static
             */
            myUtils.getBootstrapScreenWidthComputed = function getBootstrapScreenWidthComputed( options ) {
                options = options || {};
                options.read = getBootstrapScreenWidthObservable();
                return ko.computed( options );
            };

        })();

        /**
         * Y.use promise
         * @param modules
         * @returns {Promise}
         * @for doccirrus.utils
         */
        myUtils.requireYuiModule = function requireYuiModule( modules ) {
            return new Promise( function( resolve, reject ) {
                Y.use( modules, function( y, status ) {
                    if( status.success ) {
                        resolve( y );
                    }
                    else {
                        reject( status.msg );
                    }
                } );
            } );
        };

        /**
         * Returns a instantiated binder from "YMojito.client" by it's defined name
         * @param {String} type
         * @return {null|Object}
         */
        myUtils.getMojitBinderByType = function getMojitBinderByType( type ) {
            if( !Y.doccirrus.commonutils.exists( 'YMojito.client._mojits', window ) ) {
                return null;
            }
            var result = null;
            Y.each( window.YMojito.client._mojits, function( mojit ) {
                if( type === mojit.proxy.type ) {
                    result = mojit.proxy._binder;
                }
            } );
            return result;
        };

        /**
         * Let the user choose how to handle modifications via a dialog.
         * Returns an EventTarget. Possible Events are:
         * - 'cancel': user closes dialog or chooses to cancel further actions
         * - 'discard': user chooses to discard modifications, further actions should be done
         * - ('save': user chooses to save modifications, further actions should be done after saving)
         * @method confirmModificationsDialog
         * @param {Object} [parameters]
         * @param {Boolean} [parameters.saveButton=true]
         * @return {Y.EventTarget}
         * @for doccirrus.utils
         * @static
         */
        myUtils.confirmModificationsDialog = function confirmModificationsDialog( parameters ) {

            parameters = Y.merge( {
                saveButton: true
            }, parameters );

            var
                eventTarget = new Y.EventTarget();

            eventTarget.publish( 'cancel', {preventable: false} );
            eventTarget.publish( 'discard', {preventable: false} );
            eventTarget.publish( 'save', {preventable: false} );

            Y.use( ['DCWindow'], function() {
                var
                    buttonsHeader = [],
                    buttonsFooter = [];

                // cancel changes
                buttonsHeader.push( Y.doccirrus.DCWindow.getButton( 'close' ) );

                buttonsFooter.push( Y.doccirrus.DCWindow.getButton( 'CANCEL' ) );

                // discard changes
                buttonsFooter.push( Y.doccirrus.DCWindow.getButton( 'DISCARD', {
                    isDefault: true,
                    action: function confirmModificationsDialog_discard( e ) {
                        e.target.button.disable();
                        this.close();
                        eventTarget.fire( 'discard' );
                        eventTarget.detachAll();
                    }
                } ) );

                // show the save option if
                if( parameters.saveButton ) {

                    buttonsFooter.forEach( function confirmModificationsDialog_buttonsFooter_forEach( button ) {
                        button.isDefault = false;
                    } );

                    // save changes and then select
                    buttonsFooter.push( Y.doccirrus.DCWindow.getButton( 'SAVE', {
                        isDefault: true,
                        action: function confirmModificationsDialog_save( e ) {
                            e.target.button.disable();
                            this.close();
                            eventTarget.fire( 'save' );
                            eventTarget.detachAll();
                        }
                    } ) );

                }

                // notify
                Y.doccirrus.DCWindow.notice( {
                    message: i18n( 'general.message.CHANGES_NOT_SAVED' ),
                    window: {
                        id: 'confirmModificationsDialog',
                        width: 'medium',
                        buttons: {
                            header: buttonsHeader,
                            footer: buttonsFooter
                        },
                        after: {
                            visibleChange: function confirmModificationsDialog_cancel( yEvent ) {
                                // also captures cancel for e.g.: ESC
                                if( !yEvent.newVal ) {
                                    setTimeout( function() { // delay for letting others fire first
                                        eventTarget.fire( 'cancel' );
                                        eventTarget.detachAll();
                                    }, 10 );
                                }
                            }
                        }
                    }
                } );

            } );

            return eventTarget;

        };

        /**
         * Removes the mask for an area of the provided $element
         * (set by {{#crossLink "doccirrus.utils/showLoadingMask:method"}}{{/crossLink}})
         * @method showLoadingMask
         * @param {HTMLElement|jQuery|Y.Node} $element
         * @for doccirrus.utils
         * @static
         */
        myUtils.hideLoadingMask = function hideLoadingMask( $element ) {

            if( $element instanceof Y.Node ) {
                $element = $element.getDOMNode();
            }
            if( !($element instanceof jQuery) ) {
                $element = jQuery( $element );
            }

            $element.removeClass( 'dc-LoadingMask-visible' );
            $element.children( '.dc-LoadingMask' ).remove();

        };

        /**
         * Masks the area of the provided $element with a reason text
         * @method showLoadingMask
         * @param {HTMLElement|jQuery|Y.Node} $element
         * @param {String} [text=utils_clientJS.showLoadingMask.text]
         * @for doccirrus.utils
         * @static
         */
        myUtils.showLoadingMask = function showLoadingMask( $element, text ) {
            text = text || i18n( 'utils_clientJS.showLoadingMask.text' );
            var
                $mask;

            if( $element instanceof Y.Node ) {
                $element = $element.getDOMNode();
            }
            if( !($element instanceof jQuery) ) {
                $element = jQuery( $element );
            }

            myUtils.hideLoadingMask( $element );

            $element.addClass( 'dc-LoadingMask-visible' );
            $mask = jQuery( '<span class="dc-LoadingMask"></span>' );
            $element.append( $mask );
            $mask.append( '<span class="dc-LoadingMask-box"><span class="dc-LoadingMask-text">' + text + '</span></span>' );

        };

        /**
         * Displays "Support Account Activation" dialog
         * @method showSupportDialog
         * @for doccirrus.utils
         * @static
         */
        myUtils.showSupportDialog = function showSupportDialog() {
            Y.use( ['DCWindow', 'dc-comctl'], function() {

                var
                    bodyContent = Y.Node.create( '<div></div>' );

                function support_account_modal() {
                    var
                        bodyDom = bodyContent.getDOMNode(),
                        commentElement = bodyDom.querySelector( '[name=comment]' ),
                        durationElement = bodyDom.querySelector( '[name=duration]' ),
                        dialog = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-SupportAccountModal',
                            title: i18n( 'utils_clientJS.showSupportDialog.dialog.title' ),
                            bodyContent: bodyContent,
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_LARGE,
                            height: 350,
                            minHeight: 150,
                            minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                            centered: true,
                            modal: true,
                            dragable: true,
                            maximizable: false,
                            resizeable: true,
                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        label: 'OK',
                                        isDefault: true,
                                        action: function() {

                                            Y.doccirrus.ajax.send( {
                                                type: 'POST',
                                                url: Y.doccirrus.infras.getPrivateURL( '/1/employee/:activateSupportAccount' ),
                                                data: {
                                                    comment: (null !== commentElement ? commentElement.value : ''),
                                                    supportDuration: ( null !== durationElement ? durationElement.value : 4 )
                                                },
                                                contentType: 'application/json',
                                                xhrFields: {
                                                    withCredentials: true
                                                },
                                                success: function( body ) {
                                                    var
                                                        errors = Y.doccirrus.errorTable.getErrorsFromResponse( body );

                                                    if( errors && errors[0] ) {
                                                        Y.Array.invoke( errors, 'display', 'error' );
                                                    }
                                                    else {
                                                        Y.doccirrus.DCWindow.notice( {
                                                            type: 'success',
                                                            message: i18n( 'utils_clientJS.showSupportDialog.message.success' )
                                                        } );
                                                    }

                                                },
                                                error: function( error ) {
                                                    Y.log( 'error from activateSupportAccount: ' + JSON.stringify( error ), 'error', NAME );
                                                }
                                            } );

                                            dialog.close();

                                        }
                                    } )
                                ]
                            }
                        } );

                    function SupportAccountVM() {
                        var
                            self = this;

                        self.textDescriptionPreI18n = i18n( 'MISMojit.support_account_modal.text.description.PRE' );
                        self.textDescriptionPostI18n = i18n( 'MISMojit.support_account_modal.text.description.POST' );
                        self.commentLabelI18n = i18n( 'MISMojit.support_account_modal.field.comment.label' );
                        self.commentPlaceholderI18n = i18n( 'MISMojit.support_account_modal.field.comment.placeholder' );

                        self.durationList = Y.doccirrus.schemas.supportrequest.types.SupportDuration_E.list.map( function( item ) {
                            return {
                                label: item.i18n, value: item.val
                            };
                        } );
                    }

                    ko.applyBindings( new SupportAccountVM(), bodyContent.getDOMNode());

                }

                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'support_account_modal',
                    'MISMojit',
                    null,
                    bodyContent,
                    support_account_modal
                );

            } );
        };

        myUtils.selectFlow = function( model, obj ) {

            Y.doccirrus.jsonrpc.api.flow.getFlowsForCollection( {
                query: {
                    collectionName: model
                }
            } )
                .done( function( response ) {
                    var
                        data = response.data;
                    if( !data.length ) {
                        Y.doccirrus.DCWindow.notice( {
                            type: 'warn',
                            message: i18n( 'InCaseMojit.casefile_browserJS.message.CONFIG_FLOW' )
                        } );
                    } else {
                        Y.doccirrus.modals.selectFlowModal.showDialog( data, function( flow ) {
                            var
                                flowId = flow._id,
                                extraData = flow.extraData,
                                KoViewModel = Y.doccirrus.KoViewModel,
                                peek = ko.utils.peekObservable,
                                unwrap = ko.unwrap,
                                currentPatient = peek(KoViewModel.getViewModel( 'CaseFileViewModel' ).get( 'currentPatient' )),
                                checkedActivities = KoViewModel.getViewModel( 'CaseFileViewModel' ).activitiesTable.getComponentColumnCheckbox().checked();

                            Y.doccirrus.utils.getCustomLocationAndEmployee( currentPatient )
                                .then( function( result ) {
                                    Y.doccirrus.jsonrpc.api.flow.execute( {
                                        query: {
                                            _id: flowId
                                        },
                                        data: {
                                            sourceQuery: {
                                                _id: obj && obj._id
                                            },
                                            extraData: extraData,
                                            selectedCasefolderId: unwrap( currentPatient.activeCaseFolderId ),
                                            customLocation: result && result.customLocation,
                                            customEmployee: result && result.customEmployee,
                                            lastSchein: result && result.lastSchein,
                                            activeCaseFolderTab: currentPatient.caseFolderCollection.getActiveTab(),
                                            selectedActivities: checkedActivities
                                        }
                                    } )
                                        .done( function() {
                                            Y.doccirrus.DCSystemMessages.addMessage( {
                                                messageId: 'selectFlow-done',
                                                content: i18n( 'flow-api.FLOW_SUCCESS' )
                                            } );
                                        } )
                                        .fail( function( error ) {
                                            Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                                        } );
                                } );
                        } );
                    }
                } )
                .fail( function( error ) {
                    Y.Array.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );
        };

        /**
         * generate private and public keys for this client (browser) and store it locally
         * @param patientId used as storage id
         */
        myUtils.setKeysForDevice = function( patientId ) {
            var
                self = this,
                myKP = Y.doccirrus.authpub.createKeys(); // browser key pair
            self.localValueSet( patientId, JSON.stringify( myKP ) );
            return myKP;
        };

        /**
         * Removes private and public keys for this client (browser)
         * @param patientId used as storage id
         */
        myUtils.removeMyKeyForDevice = function( patientId ) {
            var
                self = this;
            self.localValueSet( patientId, null );
        };

        /**
         * @for dcutils
         * @event logoutRedirect
         * @description Fires when a logoutRedirect occurs.
         * @param {Event} event The Event
         * @type Event.Custom
         */
        Y.publish( 'logoutRedirect', {preventable: false} ); // casefile_detail
        myUtils.logoutRedirect = function logoutRedirect() {
            var
                path = document.location.pathname || '',
                hash = document.location.hash || '',
                fullPath = path + hash;
            Y.fire( 'logoutRedirect' );
            fullPath = ('/' === fullPath[0]) ? fullPath.substr( 1 ) : fullPath;
            document.location = '/logout?redirectTo=' + encodeURIComponent( fullPath );
        };

        // user must confirm logout if there are other tabs open for this session, otherwise logout straightaway
        myUtils.doLogout = function doLogout() {
            Y.doccirrus.ajax.send( {
                type: 'GET',
                xhrFields: {
                    withCredentials: true
                },
                url: Y.doccirrus.infras.getPrivateURL( '/1/settings/:countOpenTabs' ), // a dummy request just to refresh the session
                contentType: 'application/json',
                success: function( response ) {
                    var
                        data = response && response.data;
                    if( 2 > data.openTabs ) {
                        myUtils.logoutRedirect();
                        return;
                    }
                    Y.doccirrus.DCWindow.notice( {
                        type: 'info',
                        window: {
                            width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                            buttons: {
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                        label: i18n ( 'general.button.CANCEL' ),
                                        action: function() {
                                            this.close();
                                        }
                                    } ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        label: i18n ( 'general.button.CONFIRM' ),
                                        isDefault: true,
                                        action: function() {
                                            myUtils.logoutRedirect();
                                        }
                                    } )
                                ]
                            }
                        },
                        message: i18n ( 'utils_clientJS.closeDialog.message.BROWSER_TABS' )
                    } );
                },
                error: function() {
                    myUtils.logoutRedirect();
                }
            } );
        };

        /**
         * retreive the key pait from local storage
         * @param patientId
         * @return {object} {secret:'theSecret', publicKey:'theKey'}
         */
        myUtils.getKeysForDevice = function( patientId ) {
            var
                self = this, kp;
            kp = self.localValueGet( patientId );
            kp = kp && JSON.parse( kp );
            return kp;
        };

        /**
         * return true if this browser has a key pair for the patient
         * @param patientId
         * @return {boolean}
         */
        myUtils.hasDeviceKeys = function( patientId ) {
            var kp = this.getKeysForDevice( patientId );
            return kp && kp.secret && kp.publicKey && true;
        };

        /**
         * Converts bytes to a more readable string, e.g.:
         * 16777216 ~ 16 Megabyte
         * @param {Number} bytes
         * @returns {string}
         */
        myUtils.bytesAsNameString = function( bytes ) {
            var result = '',
                multiples,
                nMultiple,
                nApprox;
            for( multiples = ['Kilobyte', 'Megabyte', 'Gigabyte', 'Terabyte', 'Petabyte', 'Exabyte', 'Zettabyte', 'Yottabyte'], nMultiple = 0, nApprox = bytes / 1024; nApprox > 1; nApprox /= 1024, nMultiple++ ) {
                result = nApprox.toFixed( 0 ) + ' ' + multiples[nMultiple];
            }

            return result;
        };

        /**
         * Returns upload_max_filesize as readable string, e.g.:
         * 16 Megabyte
         * @returns {string}
         */
        myUtils.getUploadMaxFileSizeAsString = function() {
            var
                upload_max_filesize = myUtils.getObject( 'config.doccirrus.Env.upload_max_filesize', false, Y );

            if( !upload_max_filesize ) {
                return '';
            }
            return myUtils.bytesAsNameString( upload_max_filesize );
        };

        /**
         *  Create a unique labRequestId for LABREQUEST and REFERRAL type activities
         *  @return {string}
         */

        myUtils.generateLabRequestId = function() {
            return Math.floor( Date.now() / 100000000 ).toString( 36 ) + '' + Math.floor( Math.random() * 3656158440062975 - 0 ).toString( 36 );
        };

        /**
         * Shows a notice if provided files exceeds systems upload limit
         * @param {FileList|File[]} aFileList
         * @returns {boolean} exceeds
         */
        myUtils.notifyAboutFileSizeExceeds = function( aFileList ) {
            var
                upload_max_filesize = myUtils.getObject( 'config.doccirrus.Env.upload_max_filesize', false, Y ),
                fileList, fileSizeInBytes, maxSizeInBytes = upload_max_filesize, message = '';

            if( !upload_max_filesize ) {
                return false;
            }

            fileList = Y.Array.filter( aFileList, function( file ) {
                return Boolean( file && 'size' in file );
            } );

            if( !fileList.length ) {
                return false;
            }

            fileSizeInBytes = 0;

            fileList.forEach( function( file ) {
                fileSizeInBytes += file.size;
            } );

            if( fileSizeInBytes > maxSizeInBytes ) {
                message = Y.Lang.sub( i18n( 'utils_clientJS.notifyAboutFileSizeExceeds.messageFileSizeExceeds' ), {
                    bytesAsNameString: myUtils.getUploadMaxFileSizeAsString()
                } );
                Y.use( ['DCWindow'], function() {
                    Y.doccirrus.DCWindow.notice( {
                        message: message, type: 'warn', window: {
                            id: 'DCWindow-notifyAboutFileSizeExceeds',
                            width: 'medium'
                        }
                    } );
                } );
                return true;
            }
            return false;
        };

        /**
         * Several strip html techniques,
         * feel free to add more or improve.
         * @type {{safeStrip: function, regExp: function, jQueryText: function}}
         * @see: http://perfectionkills.com/the-poor-misunderstood-innerText/
         */
        myUtils.stripHTML = {
            /**
             * Strip via innerText and fallback to textContent.
             * NOTE: speed slow
             * NOTE: uses innerText (FF>=45)
             * NOTE: disallows to run arbitrary JS
             * @param {string} htmlString
             * @param {object} [options]
             * @param {boolean} [options.keepLinks=false]
             * @returns {string}
             */
            safeStrip: function( htmlString, options ) {
                if( 'string' !== typeof htmlString || '' === htmlString ) {
                    return '';
                }
                var
                    body = document.implementation.createHTMLDocument( '' ).body,
                    replaceBrWithNewLine = myUtils.stripHTML.safeStrip.replaceBrWithNewLine;

                if( undefined === replaceBrWithNewLine ) { // check buggy <br> replace with new line
                    myUtils.stripHTML.safeStrip.replaceBrWithNewLine = null;
                    replaceBrWithNewLine = myUtils.stripHTML.safeStrip.replaceBrWithNewLine = (myUtils.stripHTML.safeStrip( '<br>' ) !== "\n");
                }

                body.innerHTML = htmlString;

                if( true === replaceBrWithNewLine ) {
                    for( var i = 0, breaks = Array.prototype.slice.call( body.getElementsByTagName( 'br' ) || [] ), br; br = breaks[i]; i++ ) { // eslint-disable-line
                        br.parentNode.replaceChild( document.createTextNode( "\n" ), br );
                    }
                }

                if( options ) {
                    if( options.keepLinks ) {
                        for( var i = 0, links = Array.prototype.slice.call( body.querySelectorAll( 'a[href]:not([href=""]):not([href^="#"]):not([href^="javascript:"])' ) || [] ), link; link = links[i]; i++ ) { // eslint-disable-line
                            // convert to markdown style
                            link.parentNode.replaceChild( document.createTextNode( '[' + (link.innerText || link.textContent || '') + '](' + link.getAttribute( 'href' ) + ')' ), link );
                        }
                    }
                }

                return body.innerText || body.textContent || '';
            },
            /**
             * Strip via regular expression
             * NOTE: fast
             * NOTE: might not return the same as you would by highlighting the contents of an element with the cursor and then copy it to the clipboard
             * @param {string} htmlString
             * @returns {string}
             */
            regExp: function( htmlString ) {
                if( 'string' !== typeof htmlString || '' === htmlString ) {
                    if( 'number' === typeof htmlString || 'boolean' === typeof htmlString ) {
                        htmlString = htmlString.toString();
                    } else if( Array.isArray( htmlString ) ) {
                        return htmlString.join( ';' );
                    } else {
                        return '';
                    }
                }
                return htmlString.replace( Y.doccirrus.regexp.stripHtmlTags, '' );
            },
            /**
             *  Remove HTML from a string
             * NOTE: speed slow
             * NOTE: uses textContent
             * NOTE: might not return the same as you would by highlighting the contents of an element with the cursor and then copy it to the clipboard
             * NOTE: allows to run arbitrary JS e.g.: <img onerror="alert(\'could run arbitrary JS here\')" src=bogus>
             *  @param  html    {String}
             *  @returns        {Srting}
             */
            jQueryText: function( html ) {
                if( 'string' !== typeof html || '' === html ) {
                    return '';
                }
                return $( '<div>' + html + '</div>' ).text();
            },
            /**
             * Convert table html to human-readable string
             * Cell separator - ' '
             * Row separator - ', '
             * @param {string} htmlString
             * @returns {string}
             */
            convertTableToString: function(htmlString) {
                var table = $(htmlString),
                    trs = [],
                    tds = [],
                    lastIndexTr = 0,
                    lastIndexTd = 0,
                    res = '';

                if (table.is('table')) {
                    trs = table.find('tr');
                    lastIndexTr = trs.length - 1;

                    trs.each(function(i) {
                        tds = $(this).children('td');
                        lastIndexTd = tds.length - 1;

                        tds.each(function(i) {
                            res += $(this).text();
                            if (i < lastIndexTd) {
                                res += ' ';
                            }
                        });

                        if (i < lastIndexTr) {
                            res += ', ';
                        }
                    });

                }

                return res;
            }
        };
        /**
         * Apply activity settings to activity list
         * @param {object} actSettings
         * @returns {object}
         */
        myUtils.applySettingsToActivities = function(actSettings) {
            var activitySettings = actSettings,
            activitySettingsMap = Y.Array.reduce( activitySettings, {}, function( result, item ) {
                result[item.actType] = item;
                return result;
            }),
                actTypeConfig = Y.doccirrus.schemas.activity.getActTypeClientConfig(),
                ACTTYPEMAP = {},
                ACTTYPELIST = Y.Array.map( Y.doccirrus.schemas.activity.nameGroupedActivityTypeConfigs, function( item ) {
                    var
                        config = actTypeConfig[item.val],
                        activitySetting = activitySettingsMap[item.val],
                        result = Y.merge( item, {
                            visible: activitySetting && activitySetting.isVisible || false,
                            activeTab: config.activeTab,
                            disabledTabs: config.disabledTabs,
                            availableIn: config.availableIn || [],
                            editorView: item.functionality,
                            activitySetting: activitySetting,
                            blockForCaseFolderTypes: config.blockForCaseFolderTypes
                        } );
                    ACTTYPEMAP[item.val] = result;
                    return result;
                } );

            return  {
                list: ACTTYPELIST,
                map: ACTTYPEMAP
            };
        };

        /**
         * Create PostMessage Listener
        */

        myUtils.getPostMessageConnectionInstance = function (config) {
            function PostMessageConnection() {
                this.listeners = [];

                this.iframeWindows = new Map();
            }

            PostMessageConnection.prototype.setIframeWindow = function (iframeUrl, contentWindow) {
                this.iframeWindows.set(iframeUrl, contentWindow);

                return this;
            };

            /**
             * Remove the window by the iframeUrl key associated
             *
             * @param {string} iframeUrl
             * @return {PostMessageConnection}
             */
            PostMessageConnection.prototype.removeIframeWindow = function (iframeUrl) {
                this.iframeWindows.delete(iframeUrl);

                return this;
            };

            PostMessageConnection.prototype.resetWindows = function () {
                this.iframeWindows.clear();
            };

            PostMessageConnection.prototype.clean = function () {
                this.resetWindows();
                this.removeListeners();
            };

            PostMessageConnection.prototype.postMessageToIframe = function (messageObject, targetOrigin, iframeWindowReplacement) {
                var iframeWindow;

                if (!messageObject) {
                    throw new Error('No message object to post');
                }

                iframeWindow = iframeWindowReplacement || this.iframeWindows.get(messageObject.targetUrl);

                if (!iframeWindow) {
                    throw new Error('no iframeWindow available to post message');
                }

                iframeWindow.postMessage(messageObject, targetOrigin || window.location.origin);

                return this;
            };

            PostMessageConnection.prototype.postMessageToIframes = function (messageObject, targetOrigin) {
                Array.from( this.iframeWindows.keys() ).forEach(function (iframeUrl) {
                    this.postMessageToIframe(Object.assign(messageObject, { targetUrl: iframeUrl }), targetOrigin);
                }.bind(this));

                return this;
            };

            PostMessageConnection.prototype.addListener = function (listenerCb, solAction) {
                var listenerBuilder = solAction ? this.solListenerBase.bind(this, listenerCb, solAction) : listenerCb;

                this.listeners.push(listenerBuilder);
                window.addEventListener('message', listenerBuilder);

                return this;
            };

            PostMessageConnection.prototype.removeListeners = function () {
                this.listeners.forEach(function (listener) {
                    window.removeEventListener('message', listener);
                });

                return this;
            };

            PostMessageConnection.prototype.solListenerBase = function (listenerCb, solAction, event) {
                if (
                    this.isSolMessageAllowed(event) &&
                    event.data.action === solAction
                ) {
                    return listenerCb(event);
                }
            };

            PostMessageConnection.prototype.isSolMessageAllowed = function (event) {
                var data = event.data;

                if (event.origin === window.location.origin && data.isInsuitePage) {
                    return true;
                }

                if (
                    event.origin === window.location.origin &&
                    this.iframeWindows.size &&
                    data.targetUrl &&
                    data.isSol
                ) {
                    return Array.from( this.iframeWindows.keys() ).some(function (iframeUrl) {
                        return (
                            iframeUrl.indexOf(data.targetUrl) === 0 ||
                            data.targetUrl.indexOf(iframeUrl) === 0
                        );
                    });
                }

                return false;
            };

            /**
             * Helper to listen for GET_DATA_MODEL action, e.g. When iframeWindow queries the dataModel on init
             *
             * if there is any listenerId sent, that one is sent back.
             *
             * listenerCb should return an object with the dataModel which is then sent as payload
             *
             * @param {Function} listenerCb
             * @return {PostMessageConnection}
             */
            PostMessageConnection.prototype.onGetDataModel = function (listenerCb) {
                this.addListener(function (event) {
                    var listenerId = event && event.data && event.data.listenerId;

                    this.emitDataModelUpdate({
                        listenerId: listenerId,
                        payload: listenerCb(event),
                        targetUrl: event.data.targetUrl
                    }, window.location.origin, event.source);
                }.bind(this), 'GET_DATA_MODEL');

                return this;
            };

            /**
             * Helper to listen for PUT_DATA_MODEL action, e.g. When iframeWindow send and update to the dataModel
             *
             * if there is any listenerId sent, that one is sent back.
             *
             * listenerCb should return an object with the dataModel updated by inSuite, which is then sent as payload as confirmation proof.
             *
             * @param {Function} listenerCb
             * @return {PostMessageConnection}
             */
            PostMessageConnection.prototype.onDataModelUpdate = function (listenerCb) {
                this.addListener(function (event) {
                    var
                        listenerId = event && event.data && event.data.listenerId,
                        messageObject = {
                            payload: listenerCb(event),
                            targetUrl: event.data.targetUrl
                        };

                    if (listenerId) {
                        messageObject.listenerId = listenerId;
                    }

                    this.emitDataModelUpdate(messageObject, window.location.origin, event.source);
                }.bind(this), 'PUT_DATA_MODEL');

                return this;
            };

            /**
             * Helper to emit an update of the DataModel to inSuite.
             *
             * @param {Object} messageObject
             * @param {string} targetOrigin
             * @param {HTMLElement|undefined} iframeWindowReplacement
             * @return {PostMessageConnection}
             */
            PostMessageConnection.prototype.emitDataModelUpdate = function (messageObject, targetOrigin, iframeWindowReplacement) {
                var finalMessageObject = Object.assign({
                    action: 'PUT_DATA_MODEL',
                    isSol: true,
                    targetUrl: messageObject.targetUrl
                }, messageObject);


                /**
                 * When there is a listenerId, we send the update only to that specific targetUrl
                 *  e.g. When using PostMessage2InSuite.get/put from sdk-rest2-classmodel repo.
                 * Else we emit the dataModel update to all windows
                 */
                if (messageObject.listenerId) {
                    this.postMessageToIframe(finalMessageObject, targetOrigin, iframeWindowReplacement);
                } else {
                    this.postMessageToIframes(finalMessageObject, targetOrigin);
                }

                return this;
            };

            return new PostMessageConnection(config);
        };

        myUtils.debounceSelect2Query = function( func, wait, context ) {
            var timeout,
                lastQuery;
            return function( query ) {
                var later = function() {
                    timeout = null;
                    func.call( context, lastQuery );
                    lastQuery = null;
                };

                clearTimeout( timeout );
                timeout = setTimeout( later, wait );
                lastQuery = query;
            };
        };

        function IsModifiedObserver( observables, options ) {
            var self = this;
            self.observables = observables;
            self.lastUnModified = ko.observable();
            self.currentValues = [];
            self.isModified = ko.computed( function() {
                var lastUnModified = self.lastUnModified();
                self.currentValues = observables.map( function( observable ) {
                    var value = observable();
                    if( Array.isArray( value ) && options && options.trackArrayPaths ) {
                        value.forEach( function( element ) {
                            options.trackArrayPaths.forEach( function( path ) {
                                if( ko.isObservable( element[path] ) ) {
                                    element[path]();
                                }
                            } );

                        } );
                    }
                    return (value || '').toString();
                } );
                if( ko.computedContext.isInitial() ) {
                    self.lastUnModified( self.currentValues );
                    return false;
                }
                return !_.isEqual( lastUnModified, self.currentValues );
            } );
        }

        IsModifiedObserver.prototype.setUnModified = function() {
            var self = this;
            self.lastUnModified( self.currentValues );
        };

        myUtils.IsModifiedObserver = IsModifiedObserver;

         /*
        // NOTE: Get some time comparisons here
        function testStripHTML() {
            var
                retries = 10,
                cycles = 1000,
                testString = '<div>foo<br>bar<div>baz</div></div>',
                results = [],
                result;

            function testFn( name, test ) {
                test[name] = performance.now();
                for( var i = 0; i < cycles; i++ ) {
                    myUtils.stripHTML[name]( testString );
                }
                test[name] = performance.now() - test[name];
            }

            for( var i = 0; i < retries; i++ ) {
                result = {};
                testFn( 'safeStrip', result );
                testFn( 'regExp', result );
                testFn( 'jQueryText', result );
                results.push( result );
            }

            return results;

        }
        console.table( testStripHTML() )*/

        Y.namespace( 'doccirrus' ).utils = myUtils;

    },
    '0.0.1', {
        requires: [
            'oop',
            'doccirrus',
            'dccommonutils',
            'dcregexp'
        ]
    }
);
