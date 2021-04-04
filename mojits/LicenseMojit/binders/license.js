/**
 * User: pi
 * Date: 01/06/16  11:35
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
'use strict';

YUI.add( 'LicenseBinderIndex', function( Y, NAME ) {


    var 
        i18n = Y.doccirrus.i18n,
        KoViewModel = Y.doccirrus.KoViewModel,
        INTRO = i18n('LicenseMojit.LicenseBinderIndex.text.INTRO'),
        SPECIAL_TEXT = i18n('LicenseMojit.LicenseBinderIndex.text.SPECIAL_TEXT'),
        TEXT_BEFORE_LINK = i18n('LicenseMojit.LicenseBinderIndex.text.TEXT_BEFORE_LINK'),
        LINK = i18n('LicenseMojit.LicenseBinderIndex.text.LINK'),
        TEXT_AFTER_LINK = i18n('LicenseMojit.LicenseBinderIndex.text.TEXT_AFTER_LINK'),
        ENDING = i18n('LicenseMojit.LicenseBinderIndex.text.ENDING');
    
    
    function LicensePageModel( config ) {
        LicensePageModel.superclass.constructor.call( this, config );
    }
    LicensePageModel.ATTRS = {
        /**
         * type of missing license
         */
        licenseType: {
            value: '',
            lazyAdd: false
        }
    };

    Y.extend( LicensePageModel, KoViewModel.getDisposable(), {
        initializer: function() {
             var 
                 self = this;
            self.initLicensePageModel();
        },
        initLicensePageModel: function LicensePageModel_initLicensePageModel(){
            var 
                self = this,
                licenseType = self.get('licenseType') + '',
                imagePath = '/static/DocCirrus/assets/images/license/' + licenseType.toLowerCase();
            
            self.intro = Y.Lang.sub( INTRO, { moduleName: licenseType } );
            self.specialText = SPECIAL_TEXT[ licenseType.toUpperCase() ] || [];
            self.textBeforeLink = TEXT_BEFORE_LINK;
            self.textAfterLink = TEXT_AFTER_LINK;
            self.ending = ENDING;
            self.link = LINK;
            self.picUrl = imagePath + '-screenshot.jpg';
            self.logoUrl = imagePath + '-logo.svg';
            self.logoCss = ko.observable('licenseLogo-' + licenseType);
            self.licenseType = licenseType;
        },
        showEmailModal: function LicensePageModel_showEmailModal(){
            var
                self = this;
            Y.doccirrus.modals.licenseEmailModal.show( { data: { licenseType: self.get( 'licenseType' ) } } );
        },
        destructor: function() {
        }
    });
    
    /**
     * @class LicenseBinder
     * @extends Y.doccirrus.DCBinder
     * @constructor
     */
    function LicenseBinder() {
        LicenseBinder.superclass.constructor.apply( this, arguments );
    }

    Y.extend( LicenseBinder, Y.doccirrus.DCBinder, {
        /**
         * @property intro
         * @type {ko.observable}
         */
        intro: null,
        /**
         * @property mid
         * @type {ko.observable}
         */
        mid: null,
        /**
         * @property ending
         * @type {ko.observable}
         */
        ending: null,
        /** @private */
        initializer: function() {
            var
                self = this;
            self.initObservables();
        },
        initObservables: function LicenseBinder_initObservables() {
            var
                self = this;
            self.licensePageModel = ko.observable( null );
        },
        /** @private */
        destructor: function() {
        },
        applyBindings: function LicenseBinder_applyBindings() {
            var
                self = this;
            LicenseBinder.superclass.applyBindings.apply( self, arguments );
            self.updateData();

        },
        updateData: function LicenseBinder_updateData() {
            var
                self = this,
                licenseType = self.get( 'mojitProxy' ).pageData.get( 'licenseType' ),
                licensePageModel = new LicensePageModel( { licenseType: licenseType } );

            self.licensePageModel( licensePageModel );
        }
    } );


    Y.namespace( 'mojito.binders' )[NAME] = new LicenseBinder( {
        binderName: NAME,
        initialData: {
        }
    } );

}, '0.0.1', {
    requires: [
        'oop',
        'mojito-client',
        'KoViewModel',
        'doccirrus',
        'DCBinder',
        'DCLicenseEmailModal'
    ]
} );