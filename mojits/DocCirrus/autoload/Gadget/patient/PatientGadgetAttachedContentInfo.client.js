/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'PatientGadgetAttachedContentInfo', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetAttachedContentInfo
     */
    var
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,

        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadget = KoViewModel.getConstructor( 'PatientGadget' ),
        i18n = Y.doccirrus.i18n;

    /**
     * @constructor
     * @class PatientGadgetAttachedContentInfo
     * @extends PatientGadget
     */
    function PatientGadgetAttachedContentInfo() {
        PatientGadgetAttachedContentInfo.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetAttachedContentInfo, PatientGadget, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.initAttachedContentInfo();
        },
        /** @private */
        destructor: function() {
        },
        // NOTE: This is mostly the same as in "MirrorActivityPatientInfoViewModel" formerly known as ""ActivityPatientInfoViewModel""
        // NOTE: - removed "showAttachedContentHeader" &  adjusted "showAttachedContentInfo"
        attachedContentText: null,
        attachedContentColor: null,
        showAttachedContentInfo: null,
        initAttachedContentInfo: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                severityMap = binder.getInitialData( 'severityMap' ),
                currentPatient = peek( binder.currentPatient );

            self.attachedContentI18n = i18n( 'PatientGadget.PatientGadgetAttachedContentInfo.i18n' );

            self.attachedContentText = ko.computed( function() {

                return unwrap( currentPatient.attachedContent );
            } );

            self.attachedContentColor = ko.computed( function() {
                var
                    severity = unwrap( currentPatient.attachedSeverity ),
                    color = '';
                if( severity && severityMap ) {
                    color = severityMap[ severity ] && severityMap[ severity ].color || color;
                }
                return color;
            } );

            self.showAttachedContentInfo = ko.computed( function() {
                var
                    attachedContent = unwrap( self.attachedContentText );

                if( Y.Lang.isString( attachedContent ) ) {
                    attachedContent = attachedContent.trim();
                }

                return Boolean( attachedContent );
            } );
        },
        detachActivity: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( binder.currentPatient );
            currentPatient.detachActivity();
        }
    }, {
        NAME: 'PatientGadgetAttachedContentInfo',
        ATTRS: {}
    } );

    KoViewModel.registerConstructor( PatientGadgetAttachedContentInfo );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'PatientGadget',

        'dcutils'
    ]
} );
