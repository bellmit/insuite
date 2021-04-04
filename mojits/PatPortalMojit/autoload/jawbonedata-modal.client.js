/**
 * User: pi
 * Date: 06/08/15  13:55
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'DCJawboneData', function( Y ) {

        var i18n = Y.doccirrus.i18n,
            TITLE = i18n( 'PatPortalMojit.jawbonedataModal.title.MAIN' ),
            EXTENDED = 'extended_read';

        function JawboneDataModel( scopeList ) {
            var self = this;
            Y.doccirrus.uam.ViewModel.mixDisposable( self );
            self.scopes = ko.observableArray();
            self.selected = ko.observableArray();
            function createScope( scope ) {
                var result;
                if( EXTENDED === scope.value ) {
                    return;
                }
                result = {
                    value: ko.observable( true ),
                    name: scope.value,
                    i18n: scope.i18n
                };
                self.selected.push( scope.value );
                self._addDisposable( result.value.subscribe( function( newValue ) {
                    if( newValue ) {
                        self.selected.push( result.name );
                    } else {
                        self.selected.remove( result.name );
                    }
                } ) );
                self.scopes.push( result );
            }

            scopeList.forEach( function( scope ) {
                createScope( scope );
            } );
            self.getSelectedScopes = function() {
                var result = [EXTENDED],
                    selectedScopes = ko.utils.peekObservable( self.selected );
                return result.concat( selectedScopes );
            };

        }

        function JawboneDataModal() {

        }

        JawboneDataModal.prototype.showDialog = function( scopeList, callback ) {

            function show() {
                var
                    modal,
                    node = Y.Node.create( '<div></div>' ),
                    jawboneDataModel = new JawboneDataModel( scopeList );
                YUI.dcJadeRepository.loadNodeFromTemplate(
                    'jawbonedata_modal',
                    'PatPortalMojit',
                    {},
                    node,
                    function() {
                        modal = new Y.doccirrus.DCWindow( {
                            className: 'DCWindow-Appointment',
                            bodyContent: node,
                            title: TITLE,
                            icon: Y.doccirrus.DCWindow.ICON_LIST,
                            width: Y.doccirrus.DCWindow.SIZE_SMALL,
                            centered: true,
                            modal: true,
                            render: document.body,
                            buttons: {
                                header: ['close'],
                                footer: [
                                    Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                    Y.doccirrus.DCWindow.getButton( 'OK', {
                                        isDefault: true,
                                        action: function() {
                                            callback( jawboneDataModel.getSelectedScopes() );
                                            this.close();
                                        }
                                    } )
                                ]
                            },
                            after: {
                                destroy: function() {
                                    if( jawboneDataModel && jawboneDataModel._dispose ) {
                                        jawboneDataModel._dispose();
                                    }
                                }
                            }

                        } );
                        jawboneDataModel._addDisposable( ko.computed( function() {
                            var selected = jawboneDataModel.selected(),
                                button = modal.getButton( 'OK' ).button;
                            if( selected.length ) {
                                button.enable();
                            } else {
                                button.disable();
                            }
                        } ) );
                        jawboneDataModel.textMainI18n = i18n('PatPortalMojit.jawbonedataModal.text.MAIN');
                        ko.applyBindings( jawboneDataModel, node.getDOMNode().querySelector( '#jawboneDataModel' ) );
                    }
                );
            }

            show();

        };
        Y.namespace( 'doccirrus.modals' ).jawboneDataModal = new JawboneDataModal();

    },
    '0.0.1',
    {
        requires: [
            'DCWindow',
            'doccirrus'
        ]
    }
);
