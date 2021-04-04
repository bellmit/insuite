/*global YUI */

YUI.add( 'tiUtils', function( Y/*, NAME*/ ) {
        'use strict';
        var i18n = Y.doccirrus.i18n;

        Y.namespace( 'doccirrus' ).tiUtils = {
            PinStatus: {
                VERIFIED: i18n( 'InSuiteAdminMojit.PinOperationModel.PinStatus.VERIFIED' ),
                TRANSPORT_PIN: i18n( 'InSuiteAdminMojit.PinOperationModel.PinStatus.TRANSPORT_PIN' ),
                EMPTY_PIN: i18n( 'InSuiteAdminMojit.PinOperationModel.PinStatus.EMPTY_PIN' ),
                BLOCKED: i18n( 'InSuiteAdminMojit.PinOperationModel.PinStatus.BLOCKED' ),
                VERIFIABLE: i18n( 'InSuiteAdminMojit.PinOperationModel.PinStatus.VERIFIABLE' ),
                DISABLED: i18n( 'InSuiteAdminMojit.PinOperationModel.PinStatus.DISABLED' )
            },
            requiredActionForPinStatus: {
                VERIFIED: null,
                TRANSPORT_PIN: 'ActivatePin',
                EMPTY_PIN: 'ActivatePin',
                BLOCKED: 'UnblockPin',
                VERIFIABLE: 'VerifyPin',
                DISABLED: null
            }
        };

    },
    '0.0.1', {requires: []}
);
