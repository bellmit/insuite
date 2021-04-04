/**
 * User: martinpaul
 * Date: 21.06.13  11:56
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */
/*global YUI, $, moment, ko */
//TRANSLATION INCOMPLETE!! MOJ-3201

YUI.add( 'PatRegBinder', function( Y, NAME ) {

        "use strict";

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
             * @param node {Node} The DOM node to which this mojit is attached.
             */
            bind: function( node ) {

                var
                    btnSendReg = $( '#btnSendReg' ),
                    talkField = $( '#talk' ),
                    firstNameField = $( '#firstname' ),
                    lastNameField = $( '#lastname' ),
                    dobField= $( '#dobField' ),
                    dobContainer = $( '#dobDiv' ), //eslint-disable-line no-unused-vars
                    emailField = $( '#email' ),
                    phoneField = $( '#mobile' ),
                    pw1Field = $( '#password' ),
                    pw2Field = $( '#password2' ),
                    privacyField = $( '#privacy' ),
                    intimeSlaField = $( '#intimesla' ),
                    patientIdField = $( '#patientId' ),
                    passwordsMatch = ko.observable(true),
                    customerId = this.mojitProxy.pageData.get( 'customerId' ),
                    i18n = Y.doccirrus.i18n;

                function handleSubmitResponse( xhr ) {
                    var //SUBMIT_SUCCESS = i18n('patientRegistration.patientdcregister.SUBMIT_SUCCESS'),
                        SUBMIT_FAIL = i18n('patientRegistration.patientdcregister.SUBMIT_FAIL');

                    if( undefined !== xhr ) {
                        switch( xhr.status ) {
                            case 200:
                                $( '#patregister' ).html( '' );
                                YUI.dcJadeRepository.loadNodeFromTemplate( 'patregister_success', 'PatPortalMojit', {}, node.one( '#patregister' ), function() {
                                } );
                                break;
                            case 400:
                            case 302:
                            case 500:
                                Y.doccirrus.utils.loadingDialog( 'error', SUBMIT_FAIL );
                                break;
                        }
                    }
                    // add additional code handling  TODO MOJ-413
                    // this has to be tested
                }

                btnSendReg.on( 'click', handleSubmit );
                function handleSubmit() {
                    var
                        patientId, //eslint-disable-line no-unused-vars
                        pwHash,
                        data = {},
                        dateFmt,
                        dob;

                    if( !Y.doccirrus.utils.isNodeDCValid( node ) ) {
                        return;
                    }

                    if( !privacyField.is( ':checked' ) || !intimeSlaField.is( ':checked' ) ) {
                        privacyField.parents( '.control-group:first' ).addClass( 'has-error' );
                        return;
                    }

                    if( pw1Field.val() === pw2Field.val() ) {
                        patientId = patientIdField.val();
                        pwHash = Y.doccirrus.authpub.getPasswordHash( pw1Field.val() );

                        dateFmt = ( Y.UA.ios) ? 'YYYY-MM-DD HH' : 'DD.MM.YYYY HH';
                        dob = moment( dobField.val() + ' 10', dateFmt ).local().toJSON();

                        data = {
                            patientId: patientIdField.val() || '',
                            customerId: customerId,
                            talk: talkField.val(),
                            firstname: firstNameField.val(),
                            lastname: lastNameField.val(),
                            dob: dob,
                            email: emailField.val(),
                            phone: phoneField.val(),
                            pw: pwHash
                        };
                        // send stuff to custom function
                        Y.doccirrus.ajax.send( {
                            type: 'POST',
                            url: '/1/patientreg/:patientDCRegister',
                            data: data,
                            success: function( body, status, xhr ) {
                                var
                                    errors = Y.doccirrus.errorTable.getErrorsFromResponse( body );
                                if( errors.length ) {
                                    Y.Array.invoke( errors, 'display', 'error' );
                                } else {
                                    handleSubmitResponse( xhr );
                                }
                            },
                            error: function( xhr ) {
                                handleSubmitResponse( xhr );
                            }
                        } );

                    } else {
                        pw1Field.parents( '.form-group:first' ).addClass( 'has-error' );
                        pw2Field.parents( '.form-group:first' ).addClass( 'has-error' );
                    }
                }

                function handleInputFocus( e ) {
                    var
                        target = $( e.currentTarget ),
                        tooltip, match,
                        debug = function( what ) {
                            Y.log( '-> ' + target.attr( 'id' ) + ': ' + what + ' tooltip on ' + e.type, 'debug', NAME );
                        };

                    if( !Y.UA.ios ) {
                        tooltip = $( '.tooltip', target.parent() );
                        switch( e.type ) {
                            case 'focusin':
                            case 'keyup':
                            case 'change':
                                if( target.closest( '.control-group' ).hasClass( 'has-error' ) ) {
                                    tooltip.tooltip( 'show' );
                                    $( '.tooltip-inner', tooltip ).css( 'max-width', '' );
                                    debug( 'showing' );
                                }
                                break;
                            default:
                                tooltip.tooltip( 'hide' );
                                debug( 'hiding' );
                        }
                    }

                    /**
                     * depending on the current input, we format the interface elements,
                     * which were not validated by dcvalidate
                     */
                    switch (target.attr( 'id' )) {
                        /**
                         * enable speed declaration of the dob:
                         * TTMMJJJJ is automatically converted to TT.MM.JJJJ
                         */
                        case dobField.attr( 'id' ):
                            match = dobField.val().match( new RegExp( "(\\d{2})(\\d{2})(\\d{4})", "i" ) );
                            if( match && Array.isArray( match ) && match.length > 3 ) {
                                dobField.val( match[1] + '.' + match[2] + '.' + match[3] );
                            }
                            break;

                        /**
                         * check equality of passwords
                         */
                        case pw2Field.attr( 'id' ):
                            passwordsMatch(pw1Field.val() === pw2Field.val());
                            target.parents( '.form-group:first' ).toggleClass( 'has-error', pw1Field.val() !== pw2Field.val() );

                            break;
                    }
                }

                function validStatusChanged( valid ) {
                    Y.log( 'Valid status now: ' + valid, 'info', NAME );
                    btnSendReg.toggleClass( 'disabled' , !valid );
                }

                Y.doccirrus.utils.registerDCValidationAtNode( node, validStatusChanged );
                Y.doccirrus.utils.isNodeDCValid( node );

                $( 'body' ).
                    on( 'focusin change keyup blur focusout', 'input', handleInputFocus ).
                    on( 'click', 'input[type="checkbox"]', function( event ) {
                        $( event.currentTarget ).parents( '.control-group' ).removeClass( 'has-error' );
                    }
                );

                Y.mojito.binders.PatientAlertBinderMain.bind( node, true );

                function PatientDCRegisterVM() {
                    var
                        self = this;

                    self.headerI18n = i18n( 'PatPortalMojit.patientdcregister.header' );
                    self.registerInfoI18n = i18n( 'PatPortalMojit.patientdcregister.registerInfo' );
                    self.talkI18n = i18n( 'person-schema.Talk_E.i18n' );
                    self.talkMaleI18n = i18n( 'person-schema.Talk_E.MR' );
                    self.talkFemaleI18n = i18n( 'person-schema.Talk_E.MS' );
                    self.talkNoneI18n = i18n( 'person-schema.Talk_E.NONE' );
                    self.firstnameI18n = i18n( 'person-schema.Person_T.firstname.i18n' );
                    self.lastnameI18n = i18n( 'person-schema.Person_T.lastname.i18n' );
                    self.kbvDobI18n = i18n( 'person-schema.Person_T.kbvDob' );
                    self.emailI18n = i18n( 'PatPortalMojit.patientdcregister.email' );
                    self.mobileI18n = i18n( 'PatPortalMojit.patientdcregister.mobile' );
                    self.passwordI18n = i18n( 'PatPortalMojit.patientdcregister.password' );
                    self.password2I18n = i18n( 'PatPortalMojit.patientdcregister.password2' );
                    self.privacyStatementI18n = i18n( 'PatPortalMojit.patientdcregister.privacyStatement' );
                    self.termsOfUseI18n = i18n( 'PatPortalMojit.patientdcregister.termsOfUse' );
                    self.btnSendRegI18n = i18n( 'PatPortalMojit.patientdcregister.btnSendReg' );
                    self.registerViaMailURLI18n = i18n( 'PatPortalMojit.patientdcregister.registerViaMailURL' );
                    self.kbvDobPlaceholderI18n = i18n( 'PatPortalMojit.patientdcregister.kbvDobPlaceholder' );
                    self.passwordsMatch = passwordsMatch;
                    self.passwordsDontMatch = i18n( 'PatPortalMojit.patientdcregister.passwordsDontMatch' );
                }

                ko.applyBindings( new PatientDCRegisterVM(), this.mojitProxy._node._node );
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
        'slider-base',
        'PatientAlertBinderMain',
        'patient-schema'
    ]}
);
