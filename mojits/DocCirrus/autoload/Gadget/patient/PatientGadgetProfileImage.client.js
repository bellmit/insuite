/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'PatientGadgetProfileImage', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetProfileImage
     */
    var
        unwrap = ko.unwrap,

        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadget = KoViewModel.getConstructor( 'PatientGadget' );

    /**
     * @constructor
     * @class PatientGadgetProfileImage
     * @extends PatientGadget
     */
    function PatientGadgetProfileImage() {
        PatientGadgetProfileImage.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetProfileImage, PatientGadget, {
        /** @private */
        initializer: function() {
            var
                self = this;

            self.initProfilePicture();
        },
        /** @private */
        destructor: function() {
        },
        // NOTE: This is the same as in "MirrorActivityPatientInfoViewModel" formerly known as ""ActivityPatientInfoViewModel""
        mediaSetImgFromDefaultProfilePicture: null,
        initProfilePicture: function() {
            var
                self = this,
                binder = self.get( 'binder' ),
                currentPatient = unwrap( binder.currentPatient ),
                imageSettings = {
                    ownerCollection: 'patient',
                    ownerId: currentPatient._id,
                    label: 'logo',
                    widthPx: 133,
                    heightPx: 170,

                    thumbWidth: 133,
                    thumbHeight: 170
                };

            self.mediaSetImgFromDefaultProfilePicture = imageSettings;
        }
    }, {
        NAME: 'PatientGadgetProfileImage',
        ATTRS: {}
    } );

    KoViewModel.registerConstructor( PatientGadgetProfileImage );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'PatientGadget',

        'dcutils',

        'dcmedia',
        // things required by 'dcmedia' which it does not require:
        'dcblindproxy'
    ]
} );
