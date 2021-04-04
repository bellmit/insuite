/*global fun:true, ko, moment, $, YUI, _, grecaptcha*/
/*exported fun */
fun = function _fn( Y, NAME ) {
    'use strict';

    var
        i18n = Y.doccirrus.i18n,
        TIME_FORMAT = i18n( 'general.TIME_FORMAT' ),
        NO_PHONE_NUM = i18n( 'PatPortalMojit.general.NO_PHONE_NUM' ),
        Disposable = Y.doccirrus.KoViewModel.getDisposable();

    function VCSchedulesModel( config ) {
        VCSchedulesModel.superclass.constructor.call( this, config );
    }

    Y.extend( VCSchedulesModel, Disposable, {
        initializer: function VCSchedulesModel_initializer( config ) {
            var
                self = this;
            self.mainNode = config.node;
            self.commonData = config.commonData;
            self.initVCSchedulesModel();
            self.initPatientInfoModel();
        },
        initVCSchedulesModel: function() {
            var
                self = this;
            Y.doccirrus.utils.showLoadingMask( self.mainNode );
            self.isReady = ko.observable( false );
            self.practice = self.commonData.practiceData;
            self.schedule = self.prepareSchedule( self.commonData.appointmentToBook );
            self.setModelIsReady();

            self.practiceI18n = i18n( 'PatPortalMojit.intime_practices_tab.text.PRACTICE' );
            self.firstnameI18n = i18n( 'general.title.FIRSTNAME' );
            self.lastnameI18n = i18n( 'general.title.LASTNAME' );
            self.emailI18n = i18n( 'PatPortalMojit.vc_schedules_tab.text.EMAIL' );
            self.emailVerifyI18n = i18n( 'general.title.EMAIL_SHORT' );
            self.confirmI18n = i18n( 'DCWindow.BUTTONS.OK' );
            self.acceptTermsOfUseI18n = i18n( 'PatPortalMojit.general.ACCEPT_TERMS_OF_USE_VC' );
            self.acceptPrivacyPolicyI18n = i18n( 'PatPortalMojit.general.ACCEPT_PRIVACY_POLICY' );
        },
        getRecaptchaSiteKey: function () {
            return new Promise(function(resolve, reject){
                Y.doccirrus.jsonrpc.api.patientportal.getRecaptchaSiteKey()
                    .done(function (response) {
                        if (!response || !response.data) {
                            reject('');
                        }
                        resolve(response.data);
                    })
                    .fail(function (error) {

                        Y.log("vc_schedules_tab: error loading grecaptcha key." + error);
                        reject('');
                    });

            });

        },
        initPatientInfoModel: function() {
            var self = this,
                validatorMandatory = Y.doccirrus.validations.common.mandatory[0],
                validatorLength = Y.doccirrus.validations.kbv.Person_T_lastname[0],
                validatorEmail = Y.doccirrus.validations.common.email[0],
                validatorEmailVerify = Y.doccirrus.validations.common.email[0];

            self.recaptchaToken = ko.observable();
            self.firstName = ko.observable();
            self.lastName = ko.observable();
            self.email = ko.observable();
            self.emailVerify = ko.observable();
            self.privacyPolicy = ko.observable( false );
            self.termsOfUse = ko.observable( false );

            self.firstName.validationMessages = ko.observableArray( [validatorMandatory.msg, validatorLength.msg.replace( '{PATH}', self.firstnameI18n )] );
            self.lastName.validationMessages = ko.observableArray( [validatorMandatory.msg, validatorLength.msg.replace( '{PATH}', self.lastnameI18n )] );
            self.email.validationMessages = ko.observableArray( [validatorEmail.msg] );
            self.emailVerify.validationMessages = ko.observableArray( [validatorEmail.msg] );

            self.getRecaptchaSiteKey()
                .then(function (recaptchaSiteKey) {
                    if (recaptchaSiteKey !== '') {
                        grecaptcha.render('example1', {
                            'sitekey': recaptchaSiteKey,
                            'callback': function (response) {
                                self.recaptchaToken(response);
                            },
                            'theme': 'light'
                        });
                    }
                }).catch(function (err) {
                    Y.log( 'Grecaptcha recaptchaSiteKey could not be loaded from server'+ err, 'debug', NAME );
                    self.recaptchaToken('NotDefined');
            });

            self.firstName.hasError = ko.computed( function() {
                var
                    value = (ko.unwrap( self.firstName ) || '').trim(),
                    lastName = ko.unwrap( self.lastName ) || '',
                    isValid = validatorMandatory.validator( value ) && validatorLength.validator( value );
                return !isValid && !lastName.trim();
            } );
            self.lastName.hasError = ko.computed( function() {
                var
                    value = (ko.unwrap( self.lastName ) || '').trim(),
                    firstName = ko.unwrap( self.firstName ) || '',
                    isValid = validatorMandatory.validator( value ) && validatorLength.validator( value );
                return !isValid && !firstName.trim();
            } );
            self.email.hasError = ko.computed( function() {
                var
                    value = ko.unwrap( self.email ),
                    isValid = validatorEmail.validator( value );
                return !isValid;
            });
            self.emailVerify.hasError = ko.computed(function () {
                var
                    value = ko.unwrap(self.emailVerify), // ITS A TRAP
                    isValid = validatorEmailVerify.validator(value);
                return !isValid;
            });
            self.privacyPolicy.hasError = ko.observable();
            self.termsOfUse.hasError = ko.observable();

            self._isValid = ko.computed(function () {
                var privacyPolicy = self.privacyPolicy(),
                    recaptchaToken = self.recaptchaToken() || '',
                    termsOfUse = self.termsOfUse();
                self.privacyPolicy.hasError(!privacyPolicy);
                self.termsOfUse.hasError(!termsOfUse);
                return !self.firstName.hasError() && !self.lastName.hasError() &&
                    !self.email.hasError() && privacyPolicy && termsOfUse && recaptchaToken;
            });
        },
        prepareSchedule: function( schedule ) {
            var
                self = this,
                locationName,
                locationPhone;
            // init
            schedule.formattedDate = '';
            schedule.locationData = '';
            schedule.calendarName = '';
            if( schedule.start ) {
                schedule.formattedDate = moment( schedule.start ).format( 'dd, DD.MM.' ) + ' ' + moment( schedule.start ).format( TIME_FORMAT );
            }
            locationName = self.commonData.appointmentData && self.commonData.appointmentData.locname || '';
            locationPhone = self.commonData.appointmentData && self.commonData.appointmentData.locphone || NO_PHONE_NUM;
            schedule.locationData = locationName + ' (' + locationPhone + ')';
            schedule.calendarName = schedule.calendar.name;
            if( schedule.scheduleTypeMeta && schedule.scheduleTypeMeta.data ) {
                schedule.scheduleTypeName = schedule.scheduleTypeMeta.data.name;
            }
            schedule.calendar = schedule.calendar._id;
            return schedule;
        },
        createPatientAndAppointment: function() {
            var self = this,
                dataToSend = Object.assign( {}, self.schedule, {
                    patientData: {
                        firstname: self.firstName(),
                        lastname: self.lastName(),
                        email: self.email(),
                        emailVerify: 'emailVerify' + (self.emailVerify() ? self.emailVerify() : ''),
                        token: self.recaptchaToken(),
                        insuranceStatus: []
                    }
                } );
            Y.doccirrus.jsonrpc.api.patientportal.makeVideoConference( {
                query: {
                    dcCustomerNo: self.practice.customerIdPrac
                },
                data: dataToSend
            } )
                .done( function() {
                    $( '#vcSchedulesBody' ).html( '' );
                    YUI.dcJadeRepository.loadNodeFromTemplate(
                        'vc_create_success',
                        'PatPortalMojit',
                        {
                            infoI18n: i18n( 'PatPortalMojit.vc_create_success.message.SUCCESS' )
                        },
                        self.mainNode.one( '#vcSchedulesBody' ),
                        function() {}
                    );
                } )
                .fail( function( error ) {
                    _.invoke( Y.doccirrus.errorTable.getErrorsFromResponse( error ), 'display' );
                } );
        },
        showError: function (err) {
            Y.doccirrus.DCWindow.notice({
                type: 'error',
                message: err && err.message || err,
                window: {
                    width: 'medium'
                }
            });
        },
        setModelIsReady: function () {
            var
                self = this;
            self.isReady( true );
            Y.doccirrus.utils.hideLoadingMask( self.mainNode );
        }
    } );

    return {
        registerNode: function( node, key, options ) {
            var
                vcSchedulesModel;
            if( options.binder.commonData && options.binder.commonData.appointmentToBook && options.binder.commonData.practiceData ) {
                vcSchedulesModel = new VCSchedulesModel( {node: node, commonData: options.binder.commonData} );
                ko.applyBindings( vcSchedulesModel, document.querySelector( '#vcSchedules' ) );
            } else {
                Y.doccirrus.nav.router.save( '/practices' );
            }
        },

        deregisterNode: function( node ) {
            Y.log( 'deregistered ' + (node || node._yuid), 'debug', NAME );
        }
    };
};