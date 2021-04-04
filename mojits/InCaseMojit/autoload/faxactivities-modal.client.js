/**
 * User: pi
 * Date: 25/03/15  16:30
 * (c) 2015, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko, async */

'use strict';

YUI.add( 'DCFaxActivitiesModal', function( Y ) {

    var unwrap = Y.doccirrus.commonutils.unwrap,
        i18n = Y.doccirrus.i18n,
        TARGETDEFAULT = i18n( 'InCaseMojit.mailActivities.TARGETDEFAULT' );

    function showError( errors ) {

        if( errors && errors[0] ) {
            Y.Array.invoke( errors, 'display', 'error' );
        } else {
            Y.doccirrus.DCWindow.notice( {
                message: 'Ein Fehler ist aufgetreten.'
            } );
        }
    }

    function getContentReplaced( activities, currentUser, target ) {
        var targetName = target || TARGETDEFAULT;

        var actTypei18n = "activity-schema.Activity_E.";

        var activityString = [];

        activities.forEach( function( activity ) {
            activityString.push(
                i18n( actTypei18n + activity.actType ) + "\n" +
                activity.content + "\n"
            );
        } );

        return i18n( 'InCaseMojit.mailActivities.BODY' )
            .replace( "[target]", targetName )
            .replace( "[activity list]", activityString.join( "------\n" ) )
            .replace( "[doctor title]", "" )
            .replace( "[doctor firstname]", currentUser.firstname )
            .replace( "[doctor lastname]", currentUser.lastname )
            .replace( "[locationname]", (currentUser.currentLocation && ", " + currentUser.currentLocation) || "" );
    }

    function FaxSendModel( activities, patient, currentUser ) {

        var
            self = this,
            faxValidation = Y.doccirrus.validations.common.fax[0],
            mandatoryValidation = Y.doccirrus.validations.common.mandatory[0],
            gatewayValidation = Y.doccirrus.validations.common.email[0];

        self.targetI18n = i18n( 'InCaseMojit.mailActivities.TARGET' );
        self.faxNuberI18n = i18n( 'InCaseMojit.faxActivities.label.FAX_NUMBER');
        self.emailGatewayI18n = i18n( 'InCaseMojit.faxActivities.label.EMAIL_GATEWAY' );
        self.messageI18n = i18n( 'general.title.MESSAGE' );

        self.faxNumber = ko.observable();
        self.faxNumber.hasError = ko.observable();
        self.faxNumber.validationMessages = ko.observableArray();
        self.faxNumber.readOnly = ko.observable( true );

        self.gateway = ko.observable( (currentUser.currentLocationObj && currentUser.currentLocationObj.emailFaxGateway) || "" );
        self.gateway.hasError = ko.observable();
        self.gateway.validationMessages = ko.observableArray();

        self.content = ko.observable();
        self.content.readOnly = ko.observable( true );

        self.faxType = ko.observable();
        self.faxType.hasError = ko.observable( true );
        self.faxType.errorMessage = ko.observable( [i18n( 'InCaseMojit.mailActivities.TARGETERROR' )] );

        self.faxTypes = [];

        function validateFaxNumber( newValue ) {
            var hasError = false,
                msg = [];
            self.faxNumber.validationMessages( [] );
            if( !newValue ) {
                msg.push( Y.Lang.sub( mandatoryValidation.msg, { PATH: 'fax' } ) );
                hasError = true;
            }
            if( !faxValidation.validator( newValue ) ) {
                hasError = true;
                msg.push( faxValidation.msg );
            }
            self.faxNumber.hasError( hasError );
            self.faxNumber.validationMessages( msg );
            return !hasError;
        }

        function validateEmailGateWay( newValue ) {
            var hasError = false,
                msg = [];
            self.gateway.validationMessages( [] );
            if( !newValue ) {
                msg.push( Y.Lang.sub( mandatoryValidation.msg, { PATH: 'email' } ) );
                hasError = true;
            }
            if( !gatewayValidation.validator( newValue ) ) {
                hasError = true;
                msg.push( gatewayValidation.msg );
            }
            self.gateway.hasError( hasError );
            self.gateway.validationMessages( msg );
            return !hasError;
        }

        function attachToFaxTypes( com, targetPrefix, owner ) {
            var name = "";
            if( owner.firstname && owner.lastname ) {
                name = owner.firstname + " " + owner.lastname;
                if( owner.title ) {
                    name = owner.title + " " + name;
                }
            } else if( owner.institutionName ) {
                name = TARGETDEFAULT;
            } else {
                name = TARGETDEFAULT;
            }
            if( ["FAXPRIV", "FAXJOB"].indexOf( com.type ) >= 0 ) {
                self.faxTypes.push( {
                    val: self.faxTypes.length + 1,
                    i18n: targetPrefix + " (" + com.value + " (" + {
                        FAXPRIV: "privat",
                        FAXJOB: "beruflich"
                    }[com.type] + "))",
                    fax: com.value,
                    name: name
                } );
            }
        }

        if ( patient.communications ) {
            let communications = unwrap( patient.communications );
            if (Array.isArray( communications ) ) {
                communications.forEach( function( com ) {
                    let
                        type = unwrap( com.type ),
                        value = unwrap( com.value );

                    if( ["FAXPRIV", "FAXJOB"].indexOf( type ) >= 0 ) {
                        self.faxTypes.push( {
                            val: self.faxTypes.length + 1,
                            i18n: i18n( 'InCaseMojit.mailActivities.TARGETPATIENT' ) + " (" + value + " (" + {
                                FAXPRIV: "privat",
                                FAXJOB: "beruflich"
                            }[type] + "))",
                            fax: value,
                            name: unwrap( patient.firstname ) + " " + unwrap( patient.lastname )
                        } );
                    }
                } );
            }
        }


        if ( patient.physiciansData && patient.physiciansData.forEach ) {
            patient.physiciansData.forEach( function( physician ) {
                physician.communications.forEach( function( com ) {
                    attachToFaxTypes( com, i18n( 'InCaseMojit.mailActivities.TARGETREFPHYS' ), physician );
                } );
            } );
        }

        if ( patient.familyDoctorData && patient.familyDoctorData.communications ) {
            patient.familyDoctorData.communications.forEach( function( com ) {
                attachToFaxTypes( com, i18n( 'InCaseMojit.mailActivities.TARGETPHYSICIAN' ), patient.familyDoctorData );
            } );
        }

        if ( patient.institutionData && patient.institutionData.communications ) {
            patient.institutionData.communications.forEach( function( com ) {
                attachToFaxTypes( com, i18n( 'InCaseMojit.mailActivities.TARGETINSTITUTION' ), patient.institutionData );
            } );
        }

        self.faxTypes.push( { val: "other", i18n: i18n( 'InCaseMojit.mailActivities.TARGETOTHER' ) } );

        if( self.faxTypes.length > 1 ) {
            self.faxTypes.unshift( {
                val: "select", i18n: i18n( 'InCaseMojit.mailActivities.TARGETSELECT' )
            } );
        }

        self.gateway.subscribe( function( newValue ) {
            validateEmailGateWay( newValue );
        } );

        self.faxNumber.subscribe( function( newValue ) {
            validateFaxNumber( newValue );
        } );

        self.faxType.subscribe( function( val ) {
            var target = "";
            switch( val ) {
                case "select":
                    self.faxNumber.readOnly( true );
                    self.faxType.hasError( true );
                    break;
                case "other":
                    self.faxType.hasError( false );
                    self.faxNumber.readOnly( false );
                    self.content.readOnly( false );
                    break;
                default:
                    target = self.faxTypes[val].name;
                    self.faxNumber( self.faxTypes[val].fax );
                    self.faxType.hasError( false );
                    self.faxNumber.readOnly( true );
                    self.content.readOnly( false );
            }
            self.target = target || TARGETDEFAULT;
            self.content( getContentReplaced( activities, currentUser, target ) );
        } );

        self.areFieldsValid = function() {
            var valid = true;
            validateFaxNumber( self.faxNumber() );
            validateEmailGateWay( self.gateway() );
            if( self.faxNumber.hasError() ) {
                valid = false;
            }
            if( self.gateway.hasError() ) {
                valid = false;
            }
            return valid;
        };

        self.getData = function() {
            var data = {
                subject: self.faxNumber(),
                content: self.content(),
                email: self.gateway(),
                targetName: self.target
            };

            if (currentUser.currentLocationObj && currentUser.currentLocationObj.email) {
                data.template = {
                    locationMail: currentUser.currentLocationObj.email,
                    locationName: currentUser.currentLocationObj.locname
                };
            }
            return data;
        };

        self.areFieldsValid();
    }

    function FaxActivitiesModel( activities, patient, currentUser ) {
        var
            self = this;
        self.step2_messageI18n = i18n('InCaseMojit.mailActivities.STEP2_MESSAGE');
        self.currentStep = ko.observable( 1 );

        self.isVisibleOn = function( step ) {
            return ko.computed( function() {
                var currentStep = self.currentStep();
                return step === 'step' + currentStep;
            } );
        };

        self.faxModel = new FaxSendModel( activities, patient, currentUser );

        self.isFaxModelValid = function() {
            return self.faxModel.areFieldsValid();
        };

        self.faxModel.content( getContentReplaced( activities, currentUser ) );
    }

    function FaxActivitiesModal() {
    }

    FaxActivitiesModal.prototype.showDialog = function( activities, patient, currentUser, callback ) {
        function load() {
            var modal,
                node = Y.Node.create( '<div></div>' ),
                faxActivitiesModel = new FaxActivitiesModel( activities, patient, currentUser );
            YUI.dcJadeRepository.loadNodeFromTemplate(
                'faxactivities_modal',
                'InCaseMojit',
                {},
                node,
                function() {
                    modal = new Y.doccirrus.DCWindow( {
                        className: 'DCWindow-Appointment',
                        bodyContent: node,
                        title: i18n( 'InCaseMojit.faxActivities.TITLE' ),
                        icon: Y.doccirrus.DCWindow.ICON_LIST,
                        width: Y.doccirrus.DCWindow.SIZE_LARGE,
                        minWidth: Y.doccirrus.DCWindow.SIZE_LARGE,
                        centered: true,
                        modal: true,
                        render: document.body,
                        buttons: {
                            header: ['close'],
                            footer: [
                                Y.doccirrus.DCWindow.getButton( 'CANCEL' ),
                                Y.doccirrus.DCWindow.getButton( 'OK', {
                                    label: i18n( 'InCaseMojit.faxActivities.BUTTON.SEND' ),
                                    isDefault: true,
                                    action: function() {
                                        var currentStep = faxActivitiesModel.currentStep(),
                                            modal = this,
                                            faxDetails;

                                        if( 2 === currentStep ) {
                                            if( faxActivitiesModel.isFaxModelValid() ) {
                                                faxDetails = faxActivitiesModel.faxModel.getData();
                                                faxDetails.activities = activities.map( function( activity ) {
                                                    return activity._id;
                                                } );
                                                modal.close();
                                                return callback( faxDetails );
                                            }
                                        } else if( 1 >= currentStep ) {
                                            faxActivitiesModel.currentStep( currentStep + 1 );
                                        }
                                    }
                                } )
                            ]
                        }
                    } );
                    ko.applyBindings( faxActivitiesModel, node.getDOMNode().querySelector( '#FaxActivities' ) );

                    ko.computed( function() {
                        var
                            modelValid = faxActivitiesModel.isFaxModelValid(),
                            okBtn = modal.getButton( 'OK' ).button;
                        if( modelValid ) {
                            okBtn.enable();
                        } else {
                            okBtn.disable();
                        }
                    } );
                }
            );
        }

        function show() {
            async.parallel( {
                physiciansData: function( parallelCb ) {
                    let physicians = unwrap( patient.physicians );

                    async.map(
                        physicians,
                        function( val, callback ) {
                            Y.doccirrus.jsonrpc.api.basecontact.read( {
                                query: {
                                    _id: val
                                }
                            } ).done( function( res ) {
                                callback( null, res.data[0] );
                            } ).fail( callback );
                        },
                        function( err, physicians ) {
                            if( !err ) {
                                let familyDoctor = unwrap( patient.familyDoctor );

                                patient.physiciansData = physicians;
                                Y.doccirrus.jsonrpc.api.basecontact.read( {
                                    query: {
                                        _id:familyDoctor
                                    }
                                } ).then( function( familyDoctor ) {
                                    let institution = unwrap( patient.institution );

                                    patient.familyDoctorData = familyDoctor.data[0];
                                    return Y.doccirrus.jsonrpc.api.basecontact.read( {
                                        query: {
                                            _id: institution
                                        }
                                    } );
                                } ).done( function( institutionData ) {
                                    patient.institutionData = institutionData.data[0];
                                    parallelCb( err );
                                } );
                            } else {
                                showError( err );
                                parallelCb( err );
                            }
                        }
                    );
                },

                location: function( parallelCb ) {
                    var
                        locs = [activities[0].locationId];
                    locs.push( Y.doccirrus.schemas.location.getMainLocationId() );

                    Y.doccirrus.jsonrpc.api.location
                        .read( {
                            query: {
                                $and: [
                                    {
                                        _id: {
                                            "$in": locs
                                        }
                                    },
                                    { "emailFaxGateway": { $exists: true, $ne: "" } }
                                ]
                            }
                        } )
                        .done( function( res ) {
                            var
                                locationsResult = res.data;

                            // Use user location, not the main
                            if( 1 < locationsResult.length ) {
                                parallelCb( null, locationsResult.filter( function( loc ) {
                                    return loc._id !== Y.doccirrus.schemas.location.getMainLocationId();
                                } )[0] );
                            } else if( 1 === locationsResult.length ) {
                                parallelCb( null, res.data[0] );
                            } else {
                                parallelCb( null, null );
                            }
                        } )
                        .fail( parallelCb );
                }

            }, function( parallelError, parallelResult ) {
                if( parallelError ) {
                    showError( parallelError );
                } else {
                    currentUser.currentLocationObj = parallelResult.location;
                    load();
                }
            } );
        }

        show();
    };

    Y.namespace( 'doccirrus.modals' ).faxActivitiesModal = new FaxActivitiesModal();

}, '0.0.1', {
    requires: [
        'DCWindow',
        'dcvalidations',
        'dccommonutils'
    ]
} );
