/**
 * User: md
 * Date: 30/04/18
 * (c) 2018, Doc Cirrus GmbH, Berlin
 */

/*global YUI, ko */

'use strict';

YUI.add( 'DCSelectRuleParentModal', function( Y ) {
        var
            i18n = Y.doccirrus.i18n,
            Disposable = Y.doccirrus.KoViewModel.getDisposable(),
            MODAL_TITLE = i18n( 'IncaseAdminMojit.rules.tree.select_parent_title' );

        function CopyModel( data ) {
            CopyModel.superclass.constructor.call( this, data );
        }

        Y.extend( CopyModel, Disposable, {
            initializer: function CopyModel_initializer( data ) {
                var
                    self = this;

                self.initCopy( data );
            },

            initCopy: function( data ) {
                var
                    self = this,
                    dcSZ = Y.doccirrus.schemas.rule.getDcSZId(),
                    dcPKV = Y.doccirrus.schemas.rule.getDcPKVId(),
                    dcPractice = Y.doccirrus.schemas.rule.getPracticeDirId(),
                    unfilteredFolders = (Y.doccirrus.schemas.rule.defaultItems || []).filter( function(el){
                        return null === el.parent || el._id === dcSZ;
                    }),
                    filterFunction = function(el){
                        return -1 !== [ dcSZ, dcPractice ].indexOf( el._id );
                    };


                self.currentParent = data && data.currentParent || {};
                self.dialogTextMainI18n = i18n('IncaseAdminMojit.rules.tree.select_parent_dialog_text');

                self.ruleParents = ko.observableArray( (unfilteredFolders || []).filter( filterFunction ) );
                self.selected = ko.observable();
                if ( Y.Array.find( self.ruleParents(), function(el){ return el._id === self.currentParent._id; }) ){
                    self.selected( self.currentParent._id );
                } else if (self.currentParent._id === dcPKV){
                    self.selected( dcSZ );
                } else {
                    self.selected( dcPractice );
                }

            }

        } );

        function CopyModal() {

        }

        CopyModal.prototype.showDialog = function( data ) {
            return new Promise( function( resolve ) {
                function show() {
                    var
                        modal,
                        node = Y.Node.create( '<div></div>' ),
                        copyModelInstance = new CopyModel( data || {} );


                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'select_rule_parent_modal',
                        'IncaseAdminMojit',
                        {},
                        node,
                        function() {
                            modal = new Y.doccirrus.DCWindow( {
                                className:  'DCWindow-SelectRuleParent',
                                bodyContent: node,
                                title: MODAL_TITLE,
                                icon: Y.doccirrus.DCWindow.ICON_LIST,
                                width: Y.doccirrus.DCWindow.SIZE_MEDIUM,
                                centered: true,
                                modal: true,
                                render: document.body,
                                buttons: {
                                    header: ['close'],
                                    footer: [
                                        Y.doccirrus.DCWindow.getButton( 'CANCEL', {
                                            action: function() {
                                                modal.close();
                                                resolve( {
                                                    confirmed: false
                                                } );
                                            }
                                        }),
                                        Y.doccirrus.DCWindow.getButton( 'OK', {
                                            isDefault: true,
                                            action: function() {
                                                modal.close();
                                                resolve( {
                                                    confirmed: true,
                                                    selected: copyModelInstance.selected()
                                                } );
                                            }
                                        } )
                                    ]
                                }
                            } );
                            modal.set( 'focusOn', [] );

                            ko.applyBindings( copyModelInstance, node.getDOMNode().querySelector( '#selectRuleParent' ) );
                        }
                    );

                }
                show();
            });
        };
        Y.namespace( 'doccirrus.modals' ).selectRuleParentModal = new CopyModal();

    },
    '0.0.1',
    {
        requires: [
            'oop',
            'DCWindow',
            'doccirrus',
            'KoViewModel'
        ]
    }
);
