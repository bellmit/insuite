/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'PatientGadgetIFrame', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module PatientGadgetIFrame
     */
    var
        getObject = Y.doccirrus.commonutils.getObject,
        unwrap = ko.unwrap,
        peek = ko.utils.peekObservable,
        GADGET = Y.doccirrus.gadget,
        GADGET_CONST = GADGET.constants,
        TPL_PATH_PATIENT = GADGET_CONST.paths.TPL_PATIENT,
        KoViewModel = Y.doccirrus.KoViewModel,
        PatientGadget = KoViewModel.getConstructor( 'PatientGadget' );

    /**
     * @constructor
     * @class PatientGadgetIFrame
     * @extends PatientGadget
     */
    function PatientGadgetIFrame() {
        PatientGadgetIFrame.superclass.constructor.apply( this, arguments );
    }

    Y.extend( PatientGadgetIFrame, PatientGadget, {
        /** @private */
        initializer: function() {
            this.initPatientGadgetIFrame();
        },
        initPatientGadgetIFrame: function() {
            var
                self = this,
                model = self.get( 'gadgetModel' );
            this.iframeSettings = ko.observable();
            this.addDisposable( ko.computed( function() {
                var
                    modelConfig = unwrap( model.config ) || {},
                    iframeSettings = modelConfig.iframeSettings,
                    binder = self.get( 'binder' ),
                    currentPatient = peek( binder.currentPatient ) || {},
                    partnerIds = peek(currentPatient.partnerIds),
                    paramsToPass = [
                        'patientId=' + peek(currentPatient._id),
                        'patientNo=' + peek(currentPatient.patientNo)
                    ];
                partnerIds.forEach( function( partnerId ) {
                    paramsToPass.push( partnerId.extra + '=' + partnerId.patientId );
                } );
                if( iframeSettings ) {
                    self.iframeSettings( {
                        url: iframeSettings.url + '?' + paramsToPass.join( '&' )
                    } );
                } else {
                    self.iframeSettings( null );
                }

            } ) );
        },
        /** @private */
        destructor: function() {
        },
        editable: true
    }, {
        NAME: 'PatientGadgetIFrame',
        ATTRS: {
            editTemplate: {
                valueFn: function() {
                    return Y.doccirrus.jsonrpc.api.jade
                        .renderFile( { noBlocking: true, path: TPL_PATH_PATIENT + 'PatientGadgetIFrameConfigDialog' } )
                        .then( function( response ) {
                            return response.data;
                        } );
                }
            },
            editBindings: {
                getter: function() {
                    var
                        self = this,
                        model = self.get( 'gadgetModel' ),
                        modelConfig = unwrap( model.config ),
                        iframeSettings = getObject( 'iframeSettings', modelConfig ),
                        bindings = {},
                        appRegs = Y.doccirrus.auth.getAppRegs() || [],
                        appRegSelect2List = [];
                    appRegs.forEach( function( appReg ) {
                        appReg.uiConfiguration.some( function( config ) {
                            var
                                url,
                                elem,
                                testLicense = Y.doccirrus.auth.hasSupportLevel( Y.doccirrus.schemas.settings.supportLevels.TEST );
                            if( config.type === Y.doccirrus.schemas.appreg.uiConfigurationTypes.PATIENT_GADGET ) {
                                url = config.targetUrl;
                                if( Y.doccirrus.schemas.apptoken.appTokenTypes.LOCAL === appReg.type || Y.doccirrus.schemas.apptoken.appTokenTypes.BUILTIN === appReg.type ) {
                                    elem = document.createElement( "a" );
                                    elem.href = url;

                                    if( !testLicense || location.host === elem.host ) {
                                        url = Y.doccirrus.infras.getPrivateURL( elem.pathname + (elem.hash || '') );
                                    }
                                }
                                appRegSelect2List.push( {
                                    text: appReg.title || appReg.appName,
                                    id: url
                                } );
                                return true;
                            }
                        } );
                    } );

                    /** handle toJSON **/
                    bindings.toJSON = function() {
                        var
                            iframeSettings = peek( bindings.iframeSettings ),
                            result = {
                                iframeSettings: {
                                    url: iframeSettings.id,
                                    title: iframeSettings.text
                                }
                            };

                        return result;
                    };

                    bindings.iframeSettings = ko.observable( iframeSettings && {
                        id: iframeSettings.url,
                        text: iframeSettings.title
                    } );
                    bindings.urlSelect2 = {
                        data: self.addDisposable( ko.computed( {
                            read: function() {
                                var
                                    iframeSettings = unwrap( bindings.iframeSettings );
                                return iframeSettings;
                            },
                            write: function( $event ) {
                                bindings.iframeSettings( $event.added );
                            }
                        } ) ),
                        select2: {
                            allowClear: true,
                            data: appRegSelect2List,
                            createSearchChoice: function( term ) {
                                return {
                                    id: term,
                                    text: term
                                };
                            }
                        }
                    };

                    return bindings;
                }
            }

        }
    } );

    KoViewModel.registerConstructor( PatientGadgetIFrame );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'PatientGadget',

        'dcutils',
        'JsonRpcReflection-doccirrus',
        'JsonRpc'
    ]
} );
