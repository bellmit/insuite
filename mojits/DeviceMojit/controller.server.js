/**
 * User: pi
 * Date: 26/02/15  15:05
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */
/*global YUI */



YUI.add( 'DeviceMojit', function( Y, NAME ) {

    /**
     *
     * @module DeviceMojit
     */

    async function getDataForTemplateOfSerial( ac ) {
        var sddlList = Y.doccirrus.api.sdManager.getDownloadList();

        return {
            tenant: ac._adapter.req.user.tenantId,
            server: (ac._adapter.req.user.prc ? ac._adapter.req.user.prc.split( '/' )[2] : ac._adapter.req.headers.host),
            downloadables: sddlList.dir,
            downloadables_mac: sddlList.dir_mac,
            downloadables_win: sddlList.dir_win,
            downloadables_linux: sddlList.dir_linux,
            downloadables_node: sddlList.dir_node
        };
    }

    function getDataForTemplateOfCardreader( ac ) {
        var
            path = Y.doccirrus.auth.getDirectories( 'download' ) + '/',
            dir,
            dir_mac = [],
            dir_win = [],
            dir_linux = [],
            fs = require( 'fs' );

        if( path && path !== '/' && fs.existsSync( path ) ) {
            dir = fs.readdirSync( path );
        }
        else {
            Y.log( 'getDataForTemplateOfCardreader: invalid Directory: ' + path, 'warn', NAME );
        }

        if( !dir ) {
            dir = [];
        }

        dir.forEach( function( entry ) {
            /* this is temporary code - currently the device server for Switzerland is newer
               than the German one, but these device servers are compatible. See MOJ-11903
             */
            function getFilesByNameAndOS( name ) {
                if( entry.match( new RegExp( name ) ) ) {
                    if( entry.indexOf( 'osx' ) > -1 ) {
                        dir_mac.push( entry );
                    } else if( entry.indexOf( 'win' ) > -1 ) {
                        dir_win.push( entry );
                    } else if( entry.indexOf( 'linux' ) > -1 ) {
                        dir_linux.push( entry );
                    }
                }
            }

            if( Y.doccirrus.commonutils.doesCountryModeIncludeGermany() ) {
                getFilesByNameAndOS( '^DC_Device_Server' );
            }
            if( Y.doccirrus.commonutils.doesCountryModeIncludeSwitzerland() ) {
                getFilesByNameAndOS( '^SWISS_DC_Device_Server' );
            }
        } );

        return {
            tenant: ac._adapter.req.user.tenantId,
            ips: (ac._adapter.req.user.prc ? ac._adapter.req.user.prc.split( '/' )[2] : ac._adapter.req.headers.host),
            port: '',
            protocol: (ac._adapter.req.client.encrypted ? 'https' : 'http'),
            downloadables: dir,
            downloadables_mac: dir_mac,
            downloadables_win: dir_win,
            downloadables_linux: dir_linux
        };
    }
    
    function getDataForTemplateOfFlowlog( ac ) {
        ac.assets.addCss( '/static/DeviceMojit/assets/css/tab_flowlog.css' );
        return {};
    }

    /**
     * Constructor for the Controller class.
     *
     * @class Controller
     * @constructor
     */
    Y.namespace( 'mojito.controllers' )[NAME] = {


        /**
         *  Method corresponding to the 'device_nav' action.
         * @param {Object} ac The ActionContext that provides access
         *        to the Mojito API.
         */
        device_nav: async function( ac ) {
            var
                meta = {http: {}, noTopMenu: false, title: Y.doccirrus.i18n('general.PAGE_TITLE.CONFIGURATION')};


            if( !Y.doccirrus.auth.hasModuleAccess( ac.http.getRequest() && ac.http.getRequest().user, NAME ) ) {
                Y.doccirrus.utils.redirect( `/license?licenseType=${Y.doccirrus.auth.getRequiredLicense( NAME )}`, ac );
                return;
            }
            if( !Y.doccirrus.auth.hasSectionAccess( ac.http.getRequest().user, 'DeviceMojit.inport' ) ) {
                Y.log( 'No admin account... aborting' );
                Y.doccirrus.utils.redirect( '/', ac );
            } else {
                ac.pageData.set( 'tenant', ac._adapter.req.user.tenantId );
                ac.pageData.set( 'tab_cardreader', getDataForTemplateOfCardreader( ac ) );
                ac.pageData.set( 'tab_serial', await getDataForTemplateOfSerial( ac ) );
                ac.pageData.set( 'tab_flowlog', getDataForTemplateOfFlowlog( ac ) );
                ac.done( {}, meta );
            }
        }
    };

}, '0.0.1', {requires: [
    'mojito',
    'mojito-http-addon',
    'mojito-assets-addon',
    'mojito-params-addon',
    'mojito-models-addon',
    'mojito-intl-addon',
    'mojito-data-addon'
]} );
