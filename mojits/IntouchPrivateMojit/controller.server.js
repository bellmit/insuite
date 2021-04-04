/**
 * User: pi
 * Date: 26/02/15  15:05
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */



YUI.add( 'IntouchPrivateMojit', function( Y, NAME ) {

    const
        i18n = Y.doccirrus.i18n,
        {formatPromiseResult} = require('dc-core').utils;

    /**
     *
     * @module IntouchPrivateMojit
     */

    /**
     * Constructor for the Controller class.
     *
     * @class Controller
     * @constructor
     */
    Y.namespace( 'mojito.controllers' )[ NAME ] = {

        /**
         *  Method corresponding to the 'intouch_nav' action.
         * @param {Object} ac The ActionContext that provides access
         *        to the Mojito API.
         */
        intouch_nav: function( ac ) {
            var
                meta = { http: {}, title: Y.doccirrus.i18n( 'general.PAGE_TITLE.SERVICES' ) };

            Y.log( 'intouch_nav entered', 'info', NAME );

            ac.assets.addCss( './css/ko.css' );
            ac.assets.addCss( '/static/IntouchPrivateMojit/assets/css/intouch_nav.css' );
            ac.assets.addJs( Y.doccirrus.utils.getWorkaroundPath(), 'bottom' );
            ac.assets.addJs( Y.doccirrus.utils.getBundlePath( 'inTouchNav.bundle.js' ), 'bottom' );
            Y.doccirrus.forms.assethelper( ac );
            ac.done( {}, meta );

        },
        /**
         *  Method corresponding to the 'intouch_conference' action.
         * @param {Object} ac The ActionContext that provides access
         *        to the Mojito API.
         */
        intouch_conference: async function( ac ) {
            let
                meta = {http: {}, noTopMenu: true},
                req = ac.http.getRequest(),
                user = Y.doccirrus.auth.getUserByReq( req ),
                params = req && req.params,
                conferenceId = params && params[0],
                query = (req && req.query) || {},
                identityId = query.identityId,
                name = query.name,
                conferenceParams = {
                firstName: query.firstName,
                lastName: query.lastName,
                name: query.name,
                identityId: query.identityId,
                dcCustomerNo: query.dcCustomerNo,
                teleConsult: query.teleConsult,
                lightVersion: query.light
            };

            function setData( data ) {
                ac.pageData.set( 'conferenceName', conferenceId );
                ac.pageData.set( 'firstName', data.firstName );
                ac.pageData.set( 'lastName', data.lastName );
                ac.pageData.set( 'name', query.name );
                ac.pageData.set( 'identityId', data.identityId );
                ac.pageData.set( 'dcCustomerNo', data.dcCustomerNo );
                ac.pageData.set( 'host', data.host );
                ac.pageData.set( 'audioOnly', query.audioOnly );
                ac.pageData.set( 'privateCall', query.privateCall );
                ac.pageData.set( 'teleConsult', data.teleConsult );
                ac.pageData.set( 'consultNote', data.consultNote );
                ac.pageData.set( 'lightVersion', query.light );
                Y.doccirrus.forms.assethelper( ac );

            }

            Y.log( 'intouch_conference entered', 'info', NAME );
            ac.assets.addCss( './css/ko.css' );
            ac.assets.addCss( '/static/IntouchPrivateMojit/assets/css/intouch_nav.css' );

            if( user && conferenceId && identityId ) {
                let
                    callAudit,
                    err, results,
                    person,
                    isHost = false;

                [err, results] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                    user,
                    model: 'callaudit',
                    action: 'get',
                    query: {
                        callId: conferenceId
                    },
                    options: {
                        limit: 1,
                        sort: {_id: -1}
                    }
                } ) );

                if( err ) {
                    Y.log( `intouch_conference. Could not get callAudit for callId: ${conferenceId}. Error: ${JSON.stringify( err )}`, 'warn', NAME );
                    setData( conferenceParams );
                    ac.done( {}, meta );
                    return;
                }
                if( !results || !results[0] ) {
                    Y.log( `intouch_conference. callAudit not found. callId: ${conferenceId}.`, 'warn', NAME );
                    setData( conferenceParams );
                    ac.done( {}, meta );
                    return;
                }
                callAudit = results[0];
                if( callAudit.caller[0] && identityId === callAudit.caller[0].identityId ) {
                    person = callAudit.caller[0];
                    isHost = true;
                } else {
                    person = callAudit.callee.find( item => item.identityId === identityId );
                }
                if( !person && query.light ) {
                    // caller could be not the same as in callaudit for Videoconsultation
                    // so we put this person' indentityId as identityId in callaudit caller
                    let firstname = ( name && name.split(' ') && name.split(' ')[0] ) || '',
                        lastname = ( name && name.split(' ') && name.split(' ')[1] ) || '',
                    newCaller = {...callAudit.caller[0], identityId, firstname, lastname};
                    [err] = await formatPromiseResult( Y.doccirrus.mongodb.runDb( {
                        user,
                        model: 'callaudit',
                        action: 'update',
                        data: {$set: {
                                caller:  Y.doccirrus.filters.cleanDbObject(newCaller)
                            }},
                        fields: ['caller'],
                        query: {
                            callId: conferenceId
                        }
                    } ) );
                    if( err ) {
                        Y.log( `intouch_conference. Could not add new caller for callId: ${conferenceId}. Error: ${err.stack || err}`, 'warn', NAME );
                        setData( conferenceParams );
                        ac.done( {}, meta );
                        return;
                    }
                    person = newCaller;
                    isHost = true;
                }
                person = person || conferenceParams;
                setData( {
                    firstName: person.firstname,
                    lastName: person.lastname || person.email,
                    host: isHost,
                    identityId: person.identityId,
                    dcCustomerNo: person.dcCustomerNo,
                    teleConsult: callAudit.isTeleconsult,
                    consultNote: callAudit.consultNote
                } );
                ac.done( {}, meta );
            } else {
                setData( conferenceParams );
                ac.done( {}, meta );
            }
        },
        /**
         *  Method corresponding to the 'intouch_conference_one' action.
         * @param {Object} ac The ActionContext that provides access
         *        to the Mojito API.
         */
        intouch_conference_one: function( ac ) {
            var
                meta = { http: {}, noTopMenu: true },
                req = ac.http.getRequest(),
                params = req && req.params,
                query = (req && req.query) || {};

            Y.log( 'intouch_conference entered', 'info', NAME );

            ac.assets.addCss( './css/ko.css' );
            ac.assets.addCss( '/static/IntouchPrivateMojit/assets/css/intouch_nav.css' );
            ac.pageData.set( 'conferenceName', params && params[ 0 ] );
            ac.pageData.set( 'firstName', query.firstName );
            ac.pageData.set( 'lastName', query.lastName );
            ac.pageData.set( 'targetCall', query.targetCall );
            ac.pageData.set( 'identityId', query.identityId );
            ac.pageData.set( 'host', query.host );
            Y.doccirrus.forms.assethelper( ac );
            ac.done( {}, meta );
        },
        /**
         *  Method corresponding to the 'intouch_conference_camera' action.
         * @param {Object} ac The ActionContext that provides access
         *        to the Mojito API.
         */
        intouch_conference_camera: function( ac ) {
            var
                meta = { http: {}, noTopMenu: true },
                req = ac.http.getRequest(),
                params = req && req.params,
                query = (req && req.query) || {};

            Y.log( 'intouch_conference entered', 'info', NAME );

            ac.assets.addCss( './css/ko.css' );
            ac.assets.addCss( '/static/IntouchPrivateMojit/assets/css/intouch_nav.css' );
            ac.pageData.set( 'conferenceName', params && params[ 0 ] );
            ac.pageData.set( 'cameraName', query.cameraName );
            Y.doccirrus.forms.assethelper( ac );
            ac.done( {}, meta );
        },
        /**
         *  Method corresponding to the 'intouch_conference_screen_share' action.
         * @param {Object} ac The ActionContext that provides access
         *        to the Mojito API.
         */
        intouch_conference_screen_share: function( ac ) {
            var
                meta = { http: {}, noTopMenu: true },
                req = ac.http.getRequest(),
                params = req && req.params,
                query = (req && req.query) || {};

            Y.log( 'intouch_conference entered', 'info', NAME );

            ac.assets.addCss( './css/ko.css' );
            ac.assets.addCss( '/static/IntouchPrivateMojit/assets/css/intouch_nav.css' );
            ac.pageData.set( 'conferenceName', params && params[ 0 ] );
            ac.pageData.set( 'screenShareName', query.screenShareName );
            ac.pageData.set( 'screenCaptureMode', query.screenCaptureMode );
            Y.doccirrus.forms.assethelper( ac );
            ac.done( {}, meta );
        },

        wrongbrowser: function( ac ) {
            var meta = { http: {}, noTopMenu: true };
            Y.log( 'Entering wrongwebrtcbrowser...' );
            ac.done( {
                noteI18n: i18n('IntouchPrivateMojit.wrongbrowser.label.NOTE'),
                text1I18n: i18n('IntouchPrivateMojit.wrongbrowser.text.TEXT1'),
                text2I18n: i18n('IntouchPrivateMojit.wrongbrowser.text.TEXT2'),
                installNowI18n: i18n('IntouchPrivateMojit.wrongbrowser.label.INSTALL_NOW')
            }, meta );
        }

    };

}, '0.0.1', {
    requires: [
        'mojito',
        'mojito-http-addon',
        'mojito-assets-addon',
        'mojito-params-addon',
        'mojito-models-addon',
        'mojito-intl-addon',
        'mojito-data-addon'
    ]
} );
