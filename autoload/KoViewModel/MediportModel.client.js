/**
 * User: dcdev
 * Date: 5/9/19  3:49 PM
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'MediportModel', function( Y ) {
        /**
         * @module MediportModel
         */

    var KoViewModel = Y.doccirrus.KoViewModel;

    function MediportModel( config ) {
        MediportModel.superclass.constructor.call( this, config );
    }

    MediportModel.ATTRS = {

    };

    Y.extend( MediportModel, KoViewModel.getBase(), {
        initializer: function MediportModel_initializer() {
            var self = this;
            self.incomingPath = self.initialConfig.data.incomingFileDirPath;
            self.outgoingPath = self.initialConfig.data.outgoingFileDirPath;
            self.name = self.initialConfig.data.name;
            self.devices = self.initialConfig.data.deviceServers;
        },
        destructor: function FlowSinkMediportModel_destructor() {
        },
        initFlowSinkMediport: function FlowSinkMediportModel_initFlowSinkMediport() {
        },
        getName: function FlowSinkMediportModel_getName() {
            var
                resourceTypes = Y.doccirrus.schemas.v_flowsource.types.ResourceType_E.list,
                result = '';
            resourceTypes.some( function( resourceType ) {
                if( Y.doccirrus.schemas.v_flowsource.resourceTypes.FILE === resourceType.val ) {
                    result = resourceType.i18n;
                    return true;
                }
                return false;
            } );
            return result;
        },
        configure: function FlowSinkMediportModel_configure() {}
    }, {
        schemaName: 'mediport',
        NAME: 'MediportModel'
    } );
    KoViewModel.registerConstructor( MediportModel );
}, '0.0.1',
    {
        requires: [
            'oop',
            'KoViewModel',
            'mediport-schema',
            'v_flowsource-schema'
        ]
    });