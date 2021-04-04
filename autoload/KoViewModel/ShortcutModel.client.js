/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'ShortcutModel', function( Y/*, NAME */ ) {

    var
        KoViewModel = Y.doccirrus.KoViewModel,
        i18n = Y.doccirrus.i18n;

    function ShortcutModel( config ) {
        ShortcutModel.superclass.constructor.call( this, config );
    }

    ShortcutModel.ATTRS = {
        activityList: {
            value: [],
            lazyAdd: false
        },
        practiceForms: {
            value: [],
            lazyAdd: false
        },
        docCirrusForms: {
            value: [],
            lazyAdd: false
        },
    };

    Y.extend( ShortcutModel, KoViewModel.getBase(), {

        initShortcutSelect2: function() {
            var
                self = this;

            self.shortcutSelect2 = {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        return ko.unwrap( self.actType );
                    },
                    write: function( $event ) {
                        self.actType( $event.val );
                    }
                } ) ),
                select2: {
                    placeholder: i18n( 'IncaseAdminMojit.incase_tab_shorcuts.selectForm.PLACEHOLDER' ),
                    allowClear: true,
                    data: self.get( 'activityList' ).map( function( item ) {
                        return {
                            id: item.val,
                            text: item.i18n
                        };
                    } )
                }
            };
        },

        initSelect2Form: function( data ) {
            var
                self = this;
            return {
                val: self.addDisposable( ko.computed( {
                    read: function() {
                        var
                            formId = ko.unwrap( self.formId );
                        return formId;
                    },
                    write: function( $event ) {
                        self.formId( $event.val );
                        if( $event.added ) {
                            self.description( $event.added.text );
                        }
                    }
                } ) ),
                select2: {
                    width: '100%',
                    placeholder: i18n( 'IncaseAdminMojit.incase_tab_shorcuts.selectForm.PLACEHOLDER' ),
                    allowClear: true,
                    data: data
                }
            };
        },

        initializer: function ShortcutModel_initializer() {

            var self = this;

            self.initShortcutSelect2();
            self.select2DCForm = self.initSelect2Form( self.get( 'docCirrusForms' ) );
            self.select2PCForm = self.initSelect2Form( self.get( 'practiceForms' ) );

            self.allowToSelectForm = ko.pureComputed( function() {
                var actType = ko.unwrap( self.actType );
                return !(actType && Y.doccirrus.schemas.activity.hasForm( actType ));
            } );

        },
        destructor: function ShortcutModel_destructor() {
        }

    }, {
        schemaName: 'shortcut',
        NAME: 'ShortcutModel'
    } );

    KoViewModel.registerConstructor( ShortcutModel );

}, '0.0.1', {
    requires: [
        'oop',
        'KoViewModel',
        'shortcut-schema'
    ]
} );
