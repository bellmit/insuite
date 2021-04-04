/**
 * User: michael.kleinert
 * Date: 6/12/20  12:40 PM
 * (c) 2020, Doc Cirrus GmbH, Berlin
 */
/*global YUI, ko*/
YUI.add( 'DCRouteOverrideCollection', function( Y /*, NAME */ ) {
    'use strict';

    /**
     * @class DCRouteOverrideCollection
     * @param {Y.doccirrus.DCRouteOverride[]} items
     * @constructor
     * @beta
     */
    function DCRouteOverrideCollection( items ) {
        var self = this;
        /**
         * @type {Y.doccirrus.DCRouteOverride[]}
         * @private
         */
        this._items = [];
        if( Array.isArray( items ) ) {
            items.forEach( function( item ) {
                self.push( new Y.doccirrus.DCRouteOverride( item ) );
            } );
        }
    }

    /**
     * Pushes a new item to the collection. May be a config object, or a real one.
     * @param {Y.doccirrus.DCRouteOverride|object} configOrObject
     * @returns {this}
     */
    DCRouteOverrideCollection.prototype.push = function push( configOrObject ) {
        var alreadyAdded = false;

        // only add the same objects once
        if( configOrObject instanceof Y.doccirrus.DCRouteOverride ) {
            alreadyAdded = this._items.some( function( existingObject ) {
                return existingObject.uid === configOrObject.uid;
            } );
            if( !alreadyAdded ) {
                this._items.push( configOrObject );
            }
        } else {
            this._items.push( new Y.doccirrus.DCRouteOverride( configOrObject ) );
        }
        return this;
    };

    /**
     * Returns all matching DCRouteOverrides matching to a given URL / href string
     * @param {string|URL} hrefOrURL
     * @returns {Y.doccirrus.DCRouteOverride[]}
     */
    DCRouteOverrideCollection.prototype.match = function match( hrefOrURL ) {
        var
            targetURL = (hrefOrURL instanceof URL) ? hrefOrURL : new URL( hrefOrURL ),
            overridesIdentified = [],
            i, l;

        for( i = 0, l = this._items.length; i < l; i++ ) {
            if( this._items[i].match( targetURL ) ) {
                overridesIdentified.push( this._items[i] );
            }
        }

        return overridesIdentified;
    };

    /**
     * @param {string|URL} hrefOrURL
     */
    DCRouteOverrideCollection.prototype.process = function process( hrefOrURL ) {
        var routeOverrides = this.match( hrefOrURL );
        if( routeOverrides.length > 1 ) {
            // multiple overrides found
            DCRouteOverrideCollection.prototype._createSelectionModal( routeOverrides, function routeSelected( routeOverride ) {
                if( routeOverride instanceof Y.doccirrus.DCRouteOverride ) {
                    routeOverride.redirectBasedOnSourceURL( hrefOrURL );
                }
            } );
        } else if( routeOverrides.length === 1 ) {
            // just a single route override found
            routeOverrides[0].redirectBasedOnSourceURL( hrefOrURL );
        }
    };

    /**
     * Creates a selection modal for the user to choose a route
     * @param {Y.doccirrus.DCRouteOverride[]} routeOverrides
     * @param {function} callback
     * @private
     */
    DCRouteOverrideCollection.prototype._createSelectionModal = function _createSelectionModal( routeOverrides, callback ) {
        var
            i18n = Y.doccirrus.i18n,
            node = Y.Node.create( '<div></div>' ),
            modal,
            /**
             * @type {null|Y.doccirrus.DCRouteOverride}
             */
            goOnWithRoute = null;

        if( Array.isArray( routeOverrides ) && routeOverrides.length > 0 ) {
            // show the modal
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'routeoverride-modal',
                'InCaseMojit',
                {},
                node,
                function() {
                    // apply the data to the template
                    var applyBindings = {
                        routeOverrides: routeOverrides,
                        header: i18n( 'InCaseMojit.routeoverride_modal.header' ),
                        selectQuestion: i18n( 'InCaseMojit.routeoverride_modal.selectQuestion' ),
                        selectedRoute: ko.observable( routeOverrides[0].uid ) // pre-select first
                    };

                    ko.applyBindings( applyBindings, node.getDOMNode() );

                    modal = Y.doccirrus.DCWindow.dialog( {
                        title: i18n( 'InCaseMojit.routeoverride_modal.title' ),
                        type: 'info',
                        message: node,
                        window: {
                            width: 'large',
                            maximizable: true,
                            buttons: {
                                header: [],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        name: 'SELECTROUTEOVERRIDE',
                                        label: i18n( 'InCaseMojit.routeoverride_modal.buttons.SELECTROUTEOVERRIDE' ),
                                        action: function onSelectButtonClick( e ) {
                                            var selectedRouteUId = ko.unwrap( applyBindings.selectedRoute );
                                            if( selectedRouteUId ) {
                                                e.target.button.disable();
                                                goOnWithRoute = routeOverrides.find( function( routeOverride ) {
                                                    return routeOverride.uid === selectedRouteUId;
                                                } );
                                                modal.close();
                                            }
                                        }
                                    } )
                                ]
                            }
                        },
                        callback: function onOverrideChoosen() {
                            if( typeof callback === "function" && goOnWithRoute ) {
                                callback( goOnWithRoute );
                                modal = null;
                            }
                        }
                    } );
                } );
        }
    };

    /**
     * @property DCRouteOverrideCollection
     * @for doccirrus
     * @type {DCRouteOverrideCollection}
     */
    Y.doccirrus.DCRouteOverrideCollection = DCRouteOverrideCollection;

}, '0.0.1', {
    requires: [
        'oop',
        'doccirrus',
        'DCRouteOverride',
        'DCWindow'
    ]
} );