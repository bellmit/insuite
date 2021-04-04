/*
 * Copyright (c) 2012 Doc Cirrus GmbH
 * all rights reserved.
 */

/*global YUI, $ */
YUI.add( 'PatientAlertBinderMain', function( Y, NAME ) {
        'use strict';

        /**
         * Constructor for the patientBinderIndex class.
         *
         * @class patientBinderIndex
         * @constructor
         */
        Y.namespace( 'mojito.binders' )[NAME] = {

            /** using client side Jade so we need to announce who we are. */
            jaderef: 'PatPortalMojit',

            /**
             * Binder initialization method, invoked after all binders on the page
             * have been constructed.
             */
            init: function( mojitProxy ) {
                this.mojitProxy = mojitProxy;
            },

            /**
             * The binder method, invoked to allow the mojit to attach DOM event
             * handlers.
             *
             * @param loadOnly {Boolean}  loads the menu, but does not load any tab, if true
             * @param node {Node} The DOM node to which this mojit is attached.
             */
            bind: function( node, loadOnly ) {

                //////////////// handling of general parts

                var
                // pick up page elements from view that we want to work with
                    initialized = false,
                    publicTemplates = ['waitingtime', 'login', 'patregister', 'patientalert', 'patregister_success' ],
                    protectedTemplates = ['practices', 'schedules', 'plannedschedule', 'account'];

                function finalizeLoadTemplate(templateName) {
                    return function process( err ) {
                        if( err ) {
                            Y.log( 'ERROR loading pug template (' + templateName + '): ' + err, 'error', NAME );
                        }
                    };
                }

                ////////////// menu handling

                // menu tab activation
                function menuTabChange( entry ) {
                    var navbar = $( '.navbar-ex1-collapse' );
                    $( 'li', '.nav' ).each( function( index, li ) {
                        $( li ).attr('class', '');
                    });
                    $( entry ).addClass('active');
                    if( navbar.hasClass( 'in' ) ) {
                        navbar.collapse( 'hide' );
                    }
                }

                function showTab( tabName ) {
                    //check if template is public visible
                    if( publicTemplates.indexOf( tabName ) >= 0 ) {
                        $( '#upperDiv' ).html( '' );
                        YUI.dcJadeRepository.loadNodeFromTemplate(
                            tabName,
                            'PatPortalMojit', {},
                            node.one( '#upperDiv' ),
                            finalizeLoadTemplate(tabName)
                        );
                    } else {
                        //redirect to intime/patient if it is not
                        if( protectedTemplates.indexOf( tabName ) >= 0 ) {
                            document.location = '/intime/patient?tab=' + tabName;
                        } else {
                            // corrupt link go to standard intime
                            document.location = '/intime/patient';
                        }
                    }
                }

                function handleTabRequest( tab ) {
                    menuTabChange( $( '#' + tab ) );
                    showTab( tab );
                }

                function getCustomTab( params ) {
                    return (params.regs !== undefined && params.regs === 'ok')?
                        'patregister_success':undefined;
                }

                function initButtons() {
                    $( '#btnSend' ).addClass( 'disabled' );

                    $( 'li', '.nav' ).on( 'click',
                        function( e ) {
                            menuTabChange( e.currentTarget );
                            handleTabRequest( e.currentTarget.id );
                        } );

                    $('form').on( 'submit', function() {
                        return false;
                    });

                    $('.panel').on( 'click', function( e ) {
                        $( '.panel-info' ).removeClass( 'panel-info' ).addClass( 'panel-default' );
                        $( e.currentTarget ).removeClass( 'panel-default' ).addClass( 'panel-info' );
                    });
                }

                function initSinglePageApp( isInitialized, loadOnly ) {
                    var
                        initTab = 'waitingtime',
                        params = Y.doccirrus.utils.getQueryParams( document.location.search ),
                        tabRequest = params.tab,
                        customTab = getCustomTab( params );

                    if( !isInitialized ) {
                        if( !( typeof loadOnly === 'boolean' && loadOnly ) ) {
                            if( customTab !== undefined && tabRequest === undefined ) {
                                handleTabRequest( customTab );
                            } else {
                                if( tabRequest !== undefined ) {
                                    handleTabRequest( tabRequest );
                                } else {
                                    if( '' === $( '#upperDiv' ).html() ) {
                                        handleTabRequest( initTab );
                                    }
                                }
                            }
                        }
                        initButtons();
                        initialized = true;
                    }
                }
                initSinglePageApp( initialized, loadOnly );
            }
        };
    }, '0.0.1',
    {requires: [
        'event-mouseenter',
        'mojito-client',
        'mojito-rest-lib',
        'patientalert-schema',
        'dcutils',
        'dcschemaloader',
        'dcvalidations',
        'slider-base'
    ]}
);
