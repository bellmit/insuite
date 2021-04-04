/*
 * Copyright (c) 2012 Yahoo! Inc. All rights reserved.
 */

/*global YUI */


YUI.add( 'MISMojit', function( Y, NAME ) {

        var
            moment = require( 'moment' );

        // add meta data being the same for all routes
        function addCentralMetaData( ac ) {
            ac.assets.addBlob( '<meta name = "author" content = "Doc Cirrus GmbH">', 'top' );
            ac.assets.addBlob( '<meta name = "robots" content = "all">', 'top' );
            ac.assets.addBlob( '<meta name = "google-site-verification" content = "CWGMjAqb622YQ3EreWNTNRX9de7ReuhLCp5oBDp-DOs">', 'top' );
            ac.assets.addBlob( '<meta http-equiv = "content-type" content = "text/html; charset=utf-8">', 'top' );
            ac.assets.addBlob( '<meta name = "description" content = "Doc Cirrus - Your Safe Medical Cloud">', 'top' );
        }

        function beDone( ac, data, meta ) {
            ac.assets.addCss( './css/mis.css' );
            // remove and allow caching for production TODO
            //ac.assets.addBlob('name = "Cache-Control" content = "no-cache"', 'top');
            //ac.assets.addBlob('name = "Pragma" content = "no-cache"', 'top');
            ac.done( {
                status: 'Mojito is working',
                data: data || {}
            }, meta );
        }

        /**
         * The MISMojit module.
         *
         * @module MISMojit
         */

        /**
         * Constructor for the Controller class.
         *
         * @class Controller
         * @constructor
         */
        Y.namespace( 'mojito.controllers' )[NAME] = {

            main: function( ac ) {
                Y.log( 'Entering main ...', 'debug', NAME );
                var
                    envJson = require( 'dc-core' ).config.load( process.cwd() + '/env.json' ),
                    streamer = envJson.streamer,
                    req = ac.http.getRequest();

                ac.pageData.set( 'streamerURL', streamer && streamer.url );

                if( Y.doccirrus.auth.isISD() && (0 > req.url.indexOf( '/iscd' )) ) {
                    if( Y.doccirrus.auth.isDOQUVIDE() ) {
                        Y.doccirrus.utils.redirect( '/iscd/dispatcher#/prcs', ac );
                    } else {
                        Y.doccirrus.utils.redirect( '/iscd/dispatcher#/requests/failed', ac );
                    }

                } else {
                    ac.done( {
                        status: 'ok',
                        data: Y.config.insuite || {
                            version: '---'
                        }
                    }, {
                        http: {},
                        isd: Y.doccirrus.auth.isISD()
                    } );
                }
            },

            version: function( ac ) {
                Y.log( 'Entering version ...', 'debug', NAME );
                var
                    envJson = require( 'dc-core' ).config.load( process.cwd() + '/env.json' ),

                    streamer = envJson.streamer,
                    streamerURL = streamer && streamer.url,
                    data = Y.merge( Y.config.insuite || { version: '---' }, { streamerURL: streamerURL } );

                ac.pageData.set( 'streamerURL', streamerURL );
                ac.pageData.set( 'version', data );

                ac.done( {
                    infoMail: Y.doccirrus.email.getServiceConf( 'infoService' ).to,
                    status: 'ok'
                }, {
                    http: {},
                    title: Y.doccirrus.i18n( 'general.PAGE_TITLE.HELP' ) + '-' + Y.doccirrus.i18n( 'top_menu.LBL_MENU_VERSION' )
                } );

            },

            handbuch: function( ac ) {
                const
                    docsJSON = Y.doccirrus.utils.tryGetConfig( 'docs.json' ),
                    isSwiss = Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland(),
                    docConfig = !isSwiss ? docsJSON.de : docsJSON.ch,
                    query = ac.params.getFromUrl();
                let
                    pathname = docConfig.pathname;


                if( query.video ) {
                    pathname = docConfig.videoPathname || `${pathname}/Videoanleitungen`;
                }

                Y.log( 'Entering handbuch ...', 'debug', NAME );

                ac.pageData.set( 'pathname', pathname );
                ac.done( {
                    status: 'Mojito is working',
                    data: {}
                }, {
                    http: {},
                    title: Y.doccirrus.i18n( 'general.PAGE_TITLE.HELP' ) + '-' + Y.doccirrus.i18n( 'top_menu.LBL_MENU_HANDBUCH' )
                } );
            },

            shop: function( ac ) {
                Y.log( 'Entering shop ...', 'debug', NAME );

                ac.done( {
                    status: 'Mojito is working',
                    data: {}
                }, {
                    http: {},
                    title: Y.doccirrus.i18n( 'general.PAGE_TITLE.HELP' ) + '-' + Y.doccirrus.i18n( 'top_menu.LBL_MENU_SHOP' )
                } );

            },

            faq: function( ac ) {
                Y.log( 'Entering faq ...', 'debug', NAME );
                var
                    browsersVersions = Y.doccirrus.browsersinfo.getMinimalVersions();

                ac.done( {
                    status: 'Mojito is working',
                    data: {},
                    chromeVersion: browsersVersions.chrome,
                    ffVersion: browsersVersions.ff,
                    safariVersion: browsersVersions.safari,
                    microsoftEdgeVersion: browsersVersions.microsoftEdgeVersion,
                    safariMobileVersion: browsersVersions.safariMobile,
                    androidVersion: browsersVersions.android
                }, {
                    http: {},
                    title: Y.doccirrus.i18n( 'general.PAGE_TITLE.HELP' ) + '-' + Y.doccirrus.i18n( 'top_menu.LBL_MENU_FAQ' )
                } );
            },

            terms: function( ac ) {
                Y.log( 'Entering terms ...', 'debug', NAME );

                ac.done( {
                    status: 'Mojito is working',
                    data: {}
                }, {
                    http: {},
                    title: Y.doccirrus.i18n( 'general.PAGE_TITLE.HELP' ) + '-' + Y.doccirrus.i18n( 'top_menu.LBL_MENU_TERMS' )
                } );
            },

            directives: function( ac ) {
                Y.log( 'Entering directives ...', 'debug', NAME );

                ac.done( {
                    status: 'Mojito is working',
                    data: {}
                }, {
                    http: {},
                    title: Y.doccirrus.i18n( 'general.PAGE_TITLE.HELP' ) + '-' + Y.doccirrus.i18n( 'top_menu.LBL_MENU_MED_DIRECTIVES' )
                } );
            },

            tools: function( ac ) {
                Y.log( 'Entering directives ...', 'debug', NAME );

                ac.assets.addCss('./css/xterm.css');
                ac.assets.addJs('./js/xterm.js');
                ac.assets.addJs('./js/addons/fit/fit.js');

                ac.done( {
                    status: 'Mojito is working',
                    data: {}
                }, {
                    http: {},
                    title: Y.doccirrus.i18n( 'general.PAGE_TITLE.HELP' ) + '-' + Y.doccirrus.i18n( 'top_menu.LBL_MENU_SUPPORT_TOOLS' )
                } );
            },

            patient_declarations: function( ac ) {
                Y.log( 'Entering directives ...', 'debug', NAME );

                ac.done( {
                    status: 'Mojito is working',
                    data: {}
                }, {
                    http: {},
                    title: Y.doccirrus.i18n( 'general.PAGE_TITLE.HELP' ) + '-' + Y.doccirrus.i18n( 'top_menu.LBL_MENU_PATIENT_DECLARATIONS' )
                } );
            },

            impress: function( ac ) {

                addCentralMetaData( ac );
                ac.assets.addBlob( '<meta name = "keywords" content = "Doc Cirrus Impressum">', 'top' );

                ac.done( {
                    status: 'Mojito is working',
                    data: {}
                }, {
                    http: {},
                    title: Y.doccirrus.i18n( 'general.PAGE_TITLE.HELP' )
                } );

            },

            tutorial: function( ac ) {
                var
                    envJson = require( 'dc-core' ).config.load( process.cwd() + '/env.json' ),

                    streamer = envJson.streamer,
                    streamerURL = streamer && streamer.url;

                if( streamerURL ) {
                    Y.log( 'Entering tutorial ...', 'debug', NAME );
                    ac.done( {
                        status: 'ok',
                        data: { streamerURL: streamerURL }
                    }, {
                        http: {},
                        title: Y.doccirrus.i18n( 'general.PAGE_TITLE.HELP' ) + '-' + Y.doccirrus.i18n( 'top_menu.LBL_MENU_VIDEO_TUTORIALS' )
                    } );
                }
                else {
                    Y.log( 'No streamer', 'debug', NAME );
                    ac.done( {
                        status: 'ok',
                        data: {}
                    }, {
                        http: {},
                        title: Y.doccirrus.i18n( 'general.PAGE_TITLE.HELP' ) + '-' + Y.doccirrus.i18n( 'top_menu.LBL_MENU_VIDEO_TUTORIALS' )
                    } );
                }
            },

            /**
             * help page that illustrates local and remote url examples
             * @param   {Object}          ac
             */
            addresses: function( ac ) {
                var
                    req = ac.http.getRequest(),
                    user = req.user,
                    prcUrl;

                Y.log( 'Entering addresses...', 'debug', NAME );

                prcUrl = Y.doccirrus.auth.getGeneralExternalUrl( user );

                Y.doccirrus.api.cli.getPRCIP( {
                    callback: function( err, ip ) {
                        if( err ) {
                            Y.log( 'error in getting local IP: ' + JSON.stringify( err ), 'error', NAME );
                        }
                        let address1 = '';
                        let address2 = '';
                        if( ip ) {
                            address1 = 'http://' + ip;
                            address2 = 'https://' + ip;
                        }

                        ac.done( {
                            local: address1,
                            local_secure: address2,
                            remote: prcUrl,
                            status: 'success'
                        }, {
                            http: {}
                        } );
                    }
                } );
            },

            waitingroom: function( ac ) {

                Y.log( 'Entering waitingroom ...', 'debug', NAME );

                beDone( ac, {
                    moment: moment
                }, {
                    noTopMenu: true,
                    http: {},
                    title: Y.doccirrus.i18n( 'general.PAGE_TITLE.SERVICES' )
                } );

            },

            // ========================  REST ============================
            /**
             * REST interface for physicians
             * @param   {Object}          ac
             */
            physician: function( ac ) {
                var
                    meta = {
                        'http': {
                            headers: {
                                'content-type': 'text/json'
                            }
                        }
                    },
                    user = ac.rest.user,
                    req = ac.rest.query,
                    myAc = ac,
                    options = {},
                    result;

                if( '' === req ) {
                    req = {
                        type: 'PHYSICIAN'
                    };
                } else {
                    req.type = 'PHYSICIAN';
                }
                Y.log( 'Entering physician ...', 'debug', NAME );

                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: 'employee',
                    user,
                    query: req,
                    options: options
                }, function( err, resp ) {
                    if( err ) {
                        Y.log( 'Failed loading physician data set: ' + err, 'info', NAME );
                        myAc.done( {
                            status: '500',
                            data: err
                        } );
                    }

                    result = JSON.stringify( resp );

                    myAc.done( {
                        status: 'Mojito is working.',
                        data: result
                    }, meta );
                } );

            },

            /**
             * Insert new record(s) or overwrite (them).
             * @param   {Object}          ac
             */
            post: function POST( ac ) {
                var
                    data = ac.rest.originalparams,
                    callback = this._getCallback( ac ),
                    myAc = ac;

                //  Clean of XSS and other bad stuff before inserting into database
                data = Y.doccirrus.filters.cleanDbObject( data );
                Y.doccirrus.mongodb.runDb( {
                    model: ac.rest.model,
                    action: 'post',
                    user: ac.rest.user,
                    data: data,
                    options: myAc.rest.options,
                    callback: callback
                } );
            },

            get: function( ac ) {

                var
                    that = this,
                    callback = this._getCallback( ac );

                if( 'intime' === ac.rest.model ) {
                    Y.log( 'Model is intime, cleaning...', 'debug', NAME );
                    that.getintime( ac );
                    return;
                }

                if( 'message' === ac.rest.model ) {
                    Y.doccirrus.api.message.getMessage( ac, callback );
                    return;
                }

                Y.doccirrus.mongodb.runDb( {
                    action: 'get',
                    model: ac.rest.model,
                    user: ac.rest.user,
                    query: ac.rest.query,
                    options: ac.rest.options
                }, callback );
            },

            /**
             *  Get intime object and fix up itsd attachments if necessary
             *  @param {Object} ac
             */
            getintime: function( ac ) {

                Y.log( 'Loading / checking intime object.', 'debug', NAME );

                var
                    intimeSet,
                    mediaSet,
                    allDone = this._getCallback( ac ),
                    recursionCount = 50,
                    firstImageCheck = true,
                    resetImages = false,
                    defaultImages = {
                        'logo': process.cwd() + '/mojits/MISMojit/assets/images/intime_logo.jpg',
                        'carousel0': process.cwd() + '/mojits/MISMojit/assets/images/intime_carousel0.jpg',
                        'carousel1': process.cwd() + '/mojits/MISMojit/assets/images/intime_carousel1.jpg',
                        'carousel2': process.cwd() + '/mojits/MISMojit/assets/images/intime_carousel2.jpg',
                        'carousel3': process.cwd() + '/mojits/MISMojit/assets/images/intime_carousel3.jpg',
                        'carousel4': process.cwd() + '/mojits/MISMojit/assets/images/intime_carousel4.jpg'
                    };

                /**
                 *  Fallback in case getModel and execute calls it
                 *  @param  {Object}            err         Or maybe a string?
                 */
                function nullCallback( err ) {
                    Y.log( 'Error: ' + err, 'warn', NAME );
                    Y.doccirrus.utils.reportErrorJSON( ac, 500, err );
                }

                /**
                 *  First step is to load the intime model, once we have it, list all intime objects
                 *  @param  {Object}            query
                 */
                function onIntimeModelLoaded(query) {
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: ac.rest.model,
                        user: ac.rest.user,
                        query: query || ac.rest.query,
                        options: ac.rest.options
                    }, (err, result) => onIntimeSetLoaded(err, result, query) );
                }

                /**
                 *  Next is to check whether there are any intime objects in the database, we need to create one if not
                 *  @param  {Object}         err
                 *  @param  {Array}          resp
                 *  @param  {Object}         query
                 */
                function onIntimeSetLoaded( err, resp, query ) {
                    if( err ) {
                        nullCallback( err );
                        return;
                    }

                    var
                        defaultItems = {
                            _id: '51C8020EA6B338823D000018',
                            logo: [],
                            active: true,
                            carousel: [],
                            headline: 'Prof. Dr. med. Maja Musterfrau',
                            subheadline: 'FÄin für Unfallchirurgie | FÄin für Orthopädie und orthopädische Chirurgie'
                        },
                        i;

                    intimeSet = resp;

                    //  create a new intime object if none in database

                    Y.log( 'intimeSet loaded ' + resp.length + ' items.', 'debug', NAME );
                    Y.log( JSON.stringify( resp ), 'debug', NAME );

                    if( 0 === intimeSet.length && !query) {
                        //additionally check if collection is empty
                        onIntimeModelLoaded( {} );
                        return;
                    }

                    if( 0 === intimeSet.length ) {

                        //  schema does not always exist
                        if( Y.doccirrus.schemas.hasOwnProperty( 'intime-schema' ) ) {
                            defaultItems = Y.doccirrus.schemas['intime-schema'].defaultItems;
                        }

                        //  safe, but needs taint to pass strict checks
                        defaultItems = Y.doccirrus.filters.cleanDbObject( defaultItems );

                        Y.log( 'No intimes in database, creating from template on schema...', 'info', NAME );

                        Y.doccirrus.mongodb.runDb( {
                                action: 'post',
                                model: ac.rest.model,
                                user: ac.rest.user,
                                data: defaultItems,
                                options: { overwrite: true }
                            }, function onImtimeCreated( err, newIntimeId ) {            //  callback
                                if( err ) {
                                    nullCallback( 'Error creating intime object: ' + err );
                                    return;
                                }

                                Y.log( 'Intime object created: ' + newIntimeId, 'info', NAME );
                                //  re-run query now that we have an intime object
                                recursionCount--;
                                if( 0 === recursionCount ) {
                                    nullCallback( 'Exhausted attempts to create Intime object' );
                                    return;
                                }
                                onIntimeModelLoaded();
                            }
                        );

                        return;
                    }

                    if(query){
                        intimeSet = [];
                    }

                    function onDeletedSpuriousintime( /*err, resp*/ ) {   //  callback
                        //  reload the list of intimes after deletion
                        onIntimeModelLoaded();
                    }

                    //  enforce single inteime object per database

                    if( intimeSet.length > 1 ) {
                        for( i in intimeSet ) {
                            if( intimeSet[i] && intimeSet[i]._id && i > 0 ) {
                                Y.log( 'Removing extraneous intime object: ' + JSON.stringify( intimeSet[i] ), 'warn', NAME );

                                Y.doccirrus.mongodb.runDb( {
                                    action: 'delete',
                                    model: 'intime',
                                    user: ac.rest.user,
                                    query: { '_id': intimeSet[i]._id },
                                    options: {}
                                }, onDeletedSpuriousintime );

                                // this function will be called again when deletion calls back
                                return;
                            }
                        }
                    }

                    //  there is at least one intime object in the db, get a media model so we can query attached images
                    onMediaModelLoaded();
                }

                /**
                 *  Called when db layer returns a new media model, we use it to get all images attached to intimes
                 *  @param model    {object}    A DC media model
                 */

                function onMediaModelLoaded() {
                    Y.log( 'Media model loaded.', 'debug', NAME );
                    Y.doccirrus.mongodb.runDb( {
                        action: 'get',
                        model: 'media',
                        user: ac.rest.user,
                        query: {
                            'ownerCollection': 'intime',
                            'ownerId': intimeSet[0] && intimeSet[0]._id && intimeSet[0]._id.toString()
                        },
                        options: ac.rest.options
                    }, onMediaSetLoaded );
                }

                /**
                 *  Called when the database returns the set of media models
                 *  @param err
                 *  @param resp
                 */

                function onMediaSetLoaded( err, resp ) {
                    if( (err) || ('undefined' === typeof resp) ) {
                        nullCallback( 'Could not load media attached to intimes: ' + err );
                        return;
                    }

                    //  we have the set of media objects and the set of intime objects, checks for any missing images
                    Y.log( 'Mediaset loaded ' + resp.length + ' items.', 'debug', NAME );
                    mediaSet = resp;

                    //  if all carousel images have been deleted then we need to recreate them
                    var i;
                    if( true === firstImageCheck ) {
                        firstImageCheck = false;
                        resetImages = true;

                        for( i = 0; i < mediaSet.length; i++ ) {

                            if( 'carousel' === mediaSet[i].label.substring( 0, 8 ) ) {
                                resetImages = false;
                            }
                        }
                    }

                    //  reset next image if we're doing that
                    if( true === resetImages ) {
                        checkForMissingImages();
                    } else {
                        allDone( null, intimeSet );
                    }

                }

                /**
                 *  Replace any outstanding images, one at a time
                 *  intimeSet and mediaSet must be loaded by this point
                 */

                function checkForMissingImages() {
                    Y.log( 'Checking for missing images.', 'debug', NAME );

                    var
                        found, //  for searching mediaset [bool]
                        i, //  loop counter for intimeSet [int]
                        j, //  loop counter for mediaSet [int]
                        k;          //  enumerates over defaultImages [string]

                    //  |intimeSet|~1, |k| is small, |j| is small, so this join isn't as n^3 as it might seem

                    for( i = 0; i < intimeSet.length; i++ ) {
                        for( k in defaultImages ) {
                            if( defaultImages.hasOwnProperty( k ) ) {

                                //  check that this intime has an attachment with this label

                                found = false;
                                for( j = 0; j < mediaSet.length; j++ ) {
                                    if(
                                        (mediaSet[j].label === k) &&
                                        (intimeSet[i]._id.toString() === mediaSet[j].ownerId)
                                    ) {
                                        found = true;
                                    }
                                }

                                if( false === found ) {
                                    attachImage( k, defaultImages[k], intimeSet[i]._id.toString() );
                                    // checkForMissingImages will be called again when the image is attached
                                    return;
                                }
                            }
                        }
                    }

                    //  if we get to this point then all intimes have all image spots, we're done
                    //  ***** EXIT POINT *****
                    Y.log( 'Completed checking/creating intime, returning', 'debug', NAME );
                    allDone( null, intimeSet );
                }

                /**
                 *
                 *  @param label    {string}    as per defaultImages
                 *  @param file     {string}    location of template file
                 *  @param intimeId {string}    new owner ID of image
                 */

                function attachImage( label, file, intimeId ) {
                    Y.log( 'Attaching image ' + file + ' to intime ' + intimeId + ' with label ' + label, 'debug', NAME );

                    function onImgSaved( err, newId ) {

                        if( err ) {
                            nullCallback( 'Could not save default intime image: ' + err );
                            return;
                        }

                        //  we're done attaching this image, move on to the next one
                        Y.log( 'Saved default intime image: ' + newId, 'info', NAME );

                        recursionCount--;
                        if( 0 === recursionCount ) {
                            nullCallback( 'Exhausted attempts to attach image: ' + label );
                            return;
                        }

                        setImmediate(
                            //  processing on next tick because db does not always show recently posted
                            //  object in next query if made immediately.
                            function() {
                                onMediaModelLoaded();
                            }
                        );

                    }

                    Y.doccirrus.media.importMediaFromFile( ac.rest.user, file, 'intime', intimeId, file, label, 'OTHER', (err, result) => {
                        onImgSaved( err, result._id );
                    } );

                }

                //  start this chain of events
                onIntimeModelLoaded();

            },

            /**
             * Requires an ID --> then updates the record with new data.
             * Idempotent -- i.e. if called several times, will have same effect on the record.
             * Of course, if another process changes the record in between calls, the idempotency
             * still holds, but the results may be not what one expected!
             * @param   {Object}            ac
             */
            put: function PUT( ac ) {
                var
                    data = ac.rest.originalparams,
                    callback = this._getCallback( ac );

                data = Y.doccirrus.filters.cleanDbObject( data );
                Y.doccirrus.mongodb.runDb( {
                    action: 'put',
                    model: ac.rest.model,
                    user: ac.rest.user,
                    query: ac.rest.query,
                    fields: ac.rest.field,
                    data
                }, callback );
            },

            /**
             * Delete a record or records.
             * @param   {Object}            ac
             */
            'delete': function DELETE( ac ) {
                var
                    callback = this._getCallback( ac );

                function deleteFn() {
                    Y.doccirrus.mongodb.runDb( {
                        action: 'delete',
                        user: ac.rest.user,
                        model: ac.rest.model,
                        query: ac.rest.query,
                        callback: callback
                    } );
                }

                if( 'patient' === ac.rest.model ) {

                    Y.doccirrus.api.patient.deleteCheck( ac.rest.user, ac.rest.query._id,
                        function returnStatus( err, status ) {
                            if( err ){
                                Y.doccirrus.utils.reportErrorJSON( ac, 403, 'Kann nicht geloescht werden' );
                            } else if( status === 0 ) { // ok to delete
                                deleteFn();
                            } else {
                                Y.doccirrus.utils.reportErrorJSON( ac, 403, 'Kann nicht geloescht werden' );
                            }
                        } );

                } else { // for other models
                    deleteFn();
                }
            },
            /**
             * ex. : schedule._id
             eventIds: ["525E71EF79F2F26D8300002D"]
             content: "text"
             * @param   {Object}            ac
             * @return {*} callback
             */
            callpatient: function( ac ) {
                var
                    callback = this._getCallback( ac ),
                    data = ac.rest.originalparams,
                    eventIds = data.eventIds,
                    user = ac.rest.user,
                    idList = [];

                Y.log( 'callpatient called. Event IDs: ' + JSON.stringify( eventIds ), 'debug', NAME );
                function messageSchedules( cb ) {
                    var
                        myResults = [];
                    eventIds.forEach( function( schedule ) {
                        idList.push( schedule._id );
                    } );

                    function sendSchedules( err, results ) {
                        if( err ) {
                            errorHandler( 'Could not get schedules: ' + err );
                        }
                        myResults = myResults.concat( results );
                        Y.log( 'callpatient for events: ' + results.length, 'debug', NAME );
                        Y.doccirrus.patalert.alertEvents( user, myResults, { called: true }, cb );
                    }

                    Y.doccirrus.mongodb.runDb( {
                        user: user,
                        model: 'schedule',
                        query: { _id: { $in: idList } },
                        options: {},
                        callback: sendSchedules
                    } );
                }

                function errorHandler( error ) {
                    Y.doccirrus.utils.reportErrorJSON( ac, 500, 'Problem Messaging Patient: ' + error );
                }

                //#1 load all schedules first
                if( eventIds && Array.isArray( eventIds ) ) {
                    messageSchedules( function( error ) {
                        if( !error ) {
                            return callback( null, [] );
                        }
                        errorHandler( error );
                    } );
                } else {
                    return callback( { type: 'ERROR', text: 'Variable "messages" has to be an array of messages' } );
                }
            },

            /**
             * store the transfer data temporarily and locally and issue a TAN if this transfer is authorized
             * this is called only from PUCProxy
             * @param   {Object}            ac
             */
            initpatienttransfer: function( ac ) {
                var
                    params = ac.rest.originalparams,
                    user = ac.rest.user,
                    callback = this._getCallback( ac ),
                    patientPin,
                    activityIds = params.activityIds,
                    targetData = params.targetData,// {practiceId,practiceName},
                    sourceData = params.sourceData,// {practiceId, practiceName}
                    patientId = sourceData.patientId,
                    transfersRequest,
                    mobileNo,
                    TAN;

                function reportError( msg, code ) {
                    var frontendMsg = (500 === code) ? 'server error' : 'invalid params';
                    Y.doccirrus.utils.reportErrorJSON( ac, code || 500, frontendMsg );
                    Y.log( msg, 'error', NAME );
                }

                function allDone( err ) {
                    if( err ) {
                        Y.log( 'initpatienttransfer: error in sending sms to patient: ' + JSON.stringify( err.message || err ), 'error', NAME );
                        return callback( err );
                    }
                    callback( null, { eTAN: patientPin.pin } ); // reply back to PP
                }

                // send the TAN to patient
                function sendSMS( err, result ) {
                    if( err || !result || !result[0] ) {
                        reportError( err || 'no record found for practice profile' );
                        return;
                    }

                    var
                        practice = result[0],
                        subject = 'Datentransfer von ' + practice.coname + ' zu ' + targetData.practiceName,
                        text = 'Ihre TAN lautet: ' + TAN,
                        content = {};

                    text = subject + '\n' + text;

                    content.text = text;
                    content.receiver = mobileNo;
                    content.channel = 'SMS';

                    Y.log( 'sending TAN SMS to: ' + mobileNo, ' text=' + text, 'debug', NAME );

                    Y.doccirrus.communication.dispatchSMS( user, {
                        phone: mobileNo,
                        subject: subject,
                        text: text,
                        receiverId: patientId
                    }, allDone );
                }

                // get patient's mobile number
                function getPatientContact( err, result ) {
                    var patient;
                    if( err || !result || !result[0] ) { // check all in one place
                        reportError( err || 'patient not found: _id=' + patientId, (err) ? 500 : 400 );
                        return;
                    }

                    patient = result[0];
                    if( patient.communications ) {
                        patient.communications.forEach( function( comm ) {
                            if( 'MOBILEPRIV' === comm.type || 'MOBILEJOB' === comm.type ) {
                                if( !mobileNo || true === comm.preferred ) {
                                    mobileNo = comm.value; // replace the number already found only if the new one is preferred
                                }
                            }
                        } );
                    }

                    if( !mobileNo ) {
                        reportError( 'the patient doesnt have any mobile number', 400 ); // TODO shall we try email?
                        return;
                    }

                    Y.doccirrus.api.calevent.ppAccessCheck( user, true, patient, function( err1 ) {
                        if( err1 ) {
                            return callback( err1 );
                        }
                        patient.patientTransfer = transfersRequest;

                        //mongooselean.save_fix
                        Y.doccirrus.mongodb.runDb( {
                            user: user,
                            model: 'patient',
                            action: 'put',
                            query: {
                                _id: patient._id
                            },
                            fields: Object.keys(patient),
                            data: Y.doccirrus.filters.cleanDbObject(patient)
                        }, function( err ) {
                            if( err ) {
                                callback( err );
                                return;
                            }
                            Y.log( 'transfer request registered: ' + JSON.stringify( transfersRequest ), 'info', NAME );
                            Y.doccirrus.mongodb.runDb(
                                {
                                    user: user,
                                    model: 'practice',
                                    action: 'get',
                                    query: { dcCustomerNo: sourceData.practiceId }, // this query doesn't matter actually
                                    callback: sendSMS
                                } );
                        });
                    } );
                }

                if( !patientId || !activityIds || !sourceData || !targetData ) {
                    reportError( 'insufficient params', 400 );
                    return;
                }

                Y.log( 'generate TAN for patient._id=' + patientId, 'debug', NAME );
                patientPin = Y.doccirrus.authpub.getPatientPin( patientId );
                Y.log( 'TAN generated: ' + patientPin.pin, 'debug', NAME );

                TAN = patientPin.pin; // to send to user's phone
                patientPin.pin = Y.doccirrus.authpub.getPortalPin( patientPin ); // replace pin with a hash value
                transfersRequest = {
                    eTAN: patientPin.pin,
                    activityIds: activityIds,
                    targetCustNo: targetData.practiceId,
                    date: Date.now()
                }; // to remember the request for short time

                Y.doccirrus.mongodb.runDb(
                    {
                        user: user,
                        model: 'patient',
                        action: 'get',
                        query: { _id: patientId },
                        callback: getPatientContact
                    }
                );

            },

            /**
             * do the transfer here
             * this is called only from PUCProxy
             * all required data are already available locally, so we don't get anything from caller except patientId and eTAN
             * @param   {Object}            ac
             */
            exportpatientdata: function( ac ) {

                var
                    params = ac.rest.originalparams,
                    callback = this._getCallback( ac ),
                    user = ac.rest.user,
                    patientId = params.patientId, // source patientId
                    eTAN = params.eTAN,
                    myTransfer,
                    target;

                Y.doccirrus.utils.logParams( ac, 'exportpatientdata, params=', 'debug', NAME );

                function report( msg, code, level ) {
                    if( !level || 'error' === level ) {
                        let error_message = (500 === code) ? 'server error' : 'invalid params';
                        return callback( Y.doccirrus.errors.rest( code || 500, error_message ) );
                    }
                    Y.log( msg, level || 'error', NAME );
                }

                if( !eTAN ) {
                    report( 'illegal transfer request', 400, 'warn' );
                    return;
                }

                function allDone( err, data ) {
                    if( !err ) {
                        Y.log( 'exportpatientdata: transfer message sent, status:' + JSON.stringify( data ), 'debug', NAME );
                        return callback( null, { status: data.status } ); // let PP know what happened, specially in case the transfer is not permitted
                    }
                    report( err, data.statusCode ); // 401 or 500
                }

                function prepareToSend( err, result ) {
                    var activities;
                    if( err ) {
                        report( err, 500 );
                        return;
                    }
                    if( !result || !result[0] ) {
                        Y.log( 'no data for patient to be transferred', 'info', NAME );
                        allDone( null );
                        return;
                    } else {
                        activities = result;
                    }

                    for( let i = activities.length - 1; i >= 0; i-- ) {
                        if( 'APPROVED' === activities[i].status ) {
                            delete activities[i].employeeId;
                        } else { // not approved will not be sent
                            activities.splice( i, 1 );
                        }
                    }
                    // clean data
                    var actStr = JSON.stringify( activities );
                    actStr = actStr.replace( /"_id":"[\dA-Fa-f]+",?/g, '' ); // remove all _ids
                    actStr = actStr.replace( /,}/g, '}' );
                    activities = JSON.parse( actStr );

                    Y.log( 'exporting ' + activities.length + ' activities for patient: ' + patientId, 'info', NAME );

                    // send the transfer as a message via PUC to the target PRC
                    Y.doccirrus.communication.sendTransferMessage( user, activities, patientId, target, eTAN, allDone );

                }

                function getTransferData( err, result ) {
                    if( err || !result || !result[0] || !result[0].patientTransfer ) {
                        callback( err || Y.doccirrus.errors.rest( 400, 'invalid patient id' ) );
                        return;
                    }

                    myTransfer = result[0].patientTransfer;
                    if( 600000 < Date.now() - myTransfer.date ) {
                        report( 'the ETAN has been expired', 409, 'error' );
                        return;
                    }

                    target = myTransfer.targetCustNo; // PUC will find the target host using this ID

                    if( eTAN === myTransfer.eTAN && myTransfer.activityIds ) {
                        Y.log( 'eTAN is valid, going for transfer, patientId=' + patientId, 'debug', NAME );
                        // get all relevant activities TODO a more elaborated filtering will be implemented (simplified casefile)
                        Y.doccirrus.mongodb.runDb(
                            {
                                user: user,
                                model: 'activity',
                                query: { patientId: patientId, _id: { $in: myTransfer.activityIds.split( ',' ) } },
                                options: {},
                                callback: prepareToSend
                            }
                        );

                    } else {
                        report( 'the ETAN is not valid', 409, 'error' );
                    }
                }

                Y.doccirrus.mongodb.runDb(
                    {
                        user: user,
                        model: 'patient',
                        action: 'get',
                        query: { _id: patientId },
                        callback: getTransferData
                    }
                );
            },

            /**
             * only PUC calls this, through its general message system
             * all the data we need comes from PUC as a message
             * we change activity status to DIRTY_IMPORT
             * @param   {Object}            ac
             */
            importpatientdata: function( ac ) {
                var
                    message = ac.rest.originalparams,
                    data = Y.doccirrus.communication.getMessageContent( message ),
                    callback = this._getCallback( ac ),
                    user = ac.rest.user,
                    patientId = message.patientId, // target patientId
                    employeeId,
                    activities;

                Y.log( 'starting to import patient data, message = ' + JSON.stringify( message ), 'debug', NAME );

                function reportError( msg, code ) {
                    var frontendMsg = (500 === code) ? 'server error' : 'invalid params';
                    Y.doccirrus.utils.reportErrorJSON( ac, code || 500, frontendMsg );
                    Y.log( 'importpatientdata: ' + msg, 'error', NAME );
                    callback( 'invalid params' );
                }

                if( !data || !data.activities || !data.activities[0] || !patientId ) {
                    reportError( 'insufficient params: !data || !data.activities || !data.activities[0] || !patientId', 400 );
                    return;
                } else {
                    activities = data.activities;
                }

                function allDone( err ) {
                    if( err ) {
                        reportError( 'problem in posting activities: ' + err );
                        return;
                    }
                    callback( null, { status: 'imported' } );
                }

                function postActivities( err, result ) {
                    if( err ) {
                        reportError( 'problem in get patient: ' + err );
                        return;
                    }
                    if( !result || !result[0] ) {
                        reportError( 'target patient does not exist', 401 ); // but he has a patientreg for this practice, the reason could be cold registration
                        return;
                    }

                    for( let i = activities.length - 1; i >= 0; i-- ) {
                        activities[i].status = Y.doccirrus.schemas.activity.getForeignEnum(); // as in activity schema
                        activities[i].patientId = patientId;
                        activities[i].employeeId = employeeId;
                    }

                    Y.log( 'importing ' + activities.length + ' activities for patient: ' + patientId, 'info', NAME );
                    activities = Y.doccirrus.filters.cleanDbObject( activities );
                    Y.doccirrus.mongodb.runDb(
                        {
                            user: user,
                            model: 'activity',
                            action: 'post',
                            data: activities,
                            callback: allDone
                        }
                    );

                }

                Y.doccirrus.api.employee.getLastPhysicianId( user, function( err, id ) {
                    if( err ) {
                        callback( err );
                        return;
                    }
                    employeeId = id;
                    // see if the patient really exists in this practice
                    Y.doccirrus.mongodb.runDb(
                        {
                            user: user,
                            model: 'patient',
                            action: 'get',
                            query: { _id: patientId },
                            callback: postActivities
                        }
                    );
                } );
            }
        };
    },
    '0.0.1', {
        requires: [
            'mojito',
            'mojito-assets-addon',
            'mojito-config-addon',
            'mojito-models-addon',
            'mojito-params-addon',
            'mojito-http-addon',
            'mojito-data-addon',
            'addons-viewengine-jade',
            'location-api',
            'mojito-intl-addon'
        ]
    }
);
