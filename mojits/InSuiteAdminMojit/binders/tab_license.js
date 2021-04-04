/*global fun:true, ko, $ */
/*exported fun */

fun = function _fn( Y ) {
    var
        i18n = Y.doccirrus.i18n,
        HIDDEN_ADDITIONAL_SERVICES = [
            Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTOR_EXPERT_SYSTEM,
            Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTOR_SELECTIVECARE_SYSTEM,
            Y.doccirrus.schemas.settings.additionalServiceKinds.INSPECTOR_LEARNING_SYSTEM
        ];

    function getSettings( node ) {
        var licenses = Y.doccirrus.auth.getLicenseData(),
            appRegs = Y.doccirrus.auth.getAppRegs() || [],
            licenseScope_T = Y.doccirrus.schemas.settings.licenseSchema.LicenseScope_T,
            bindings = {},
            appRegMap = {};
        bindings.licenseHeaderI18n = i18n( 'InSuiteAdminMojit.tab_license.header' );
        bindings.specialModulesTextI18n = i18n( 'licenseManager.specialModules.i18n' );
        bindings.baseSystemLevelTextI18n = i18n( 'licenseManager.baseSystemLevel.i18n' );
        bindings.baseSystemLevelI18n = i18n('CRMMojit.crm_company_browser_tab.title.BASE_SYSTEM_LEVEL');
        bindings.baseSystemLevelNoteI18n = i18n('InSuiteAdminMojit.tab_license.BASE_SYSTEM_LEVEL_NOTE');
        bindings.baseServicesTextI18n = i18n( 'licenseManager.baseServices.i18n' );
        bindings.additionalServicesTextI18n = i18n( 'licenseManager.additionalServices.i18n' );
        bindings.telematikServicesTextI18n = i18n( 'licenseManager.telematikServices.i18n' );
        bindings.supportLevelTextI18n = i18n( 'licenseManager.supportLevel.i18n' );
        bindings.solutionsTextI18n = i18n( 'licenseManager.solutions.i18n' );
        bindings.solsNotSupportedTextI18n = i18n( 'AppTokenMojit.AppAccessManager.text.SOLS_NOT_SUPPORTED' );
        bindings.isSolsSupported = Y.doccirrus.auth.isSolsSupported();

        appRegs.forEach( function( appReg ) {
            appRegMap[ appReg.appName ] = appReg;
        } );
        bindings.hasInTi = ko.observable(Y.doccirrus.auth.hasAdditionalService( 'inTi' ) );

        Object.keys( licenseScope_T ).forEach( function( serviceType ) {
            var serviceSchemaType = licenseScope_T[ serviceType ].type,
                serviceVal = licenses[ serviceType ],
                serviceValType = Object.prototype.toString.call( serviceVal );
            /**
             * filter trial dates
             */
            if( Y.doccirrus.schemas.settings.licenseSchema[ serviceSchemaType ] && Y.doccirrus.schemas.settings.licenseSchema[ serviceSchemaType ].list ) {
                bindings[ serviceType ] = Y.doccirrus.schemas.settings.licenseSchema[ serviceSchemaType ].list.map( function( item ) {
                    item = Y.clone( item, true );
                    if( "[object String]" === serviceValType ) {
                        item.checked = serviceVal;
                    } else if( "[object Array]" === serviceValType ) {
                        item.checked = -1 !== serviceVal.indexOf( item.val );
                    }
                    item.desc = i18n( "InSuiteAdminMojit.insuiteadmin.basesystemdesc." + item.val );
                    // ARE-31 no need to display inSpectorLearningSystem, inSpectorExpertSystem, inSpectorSelectiveCareSystem licenses.
                    if( HIDDEN_ADDITIONAL_SERVICES.indexOf(item.val) !== -1 ) {
                        return null;
                    }
                    return item;
                } );

                bindings[ serviceType ] = bindings[ serviceType ].filter( function( item ) {
                   return item !== null;
                });
            } else if( 'solutions' === serviceType ) {
                bindings[ serviceType ] = licenses[ serviceType ] && ko.observableArray( licenses[ serviceType ].map( function( appName ) {
                    var
                        appReg = appRegMap[ appName ] || {};
                    return {
                        title: appReg.title || appReg.appName,
                        desc: appReg.description || ''
                    };
                } ) );
            } else if( 'doctorsAmount' === serviceType ) {
                if( '0' === licenses[ serviceType ] ) {
                    bindings[ serviceType ] = '';
                } else {
                    bindings[ serviceType ] = licenses[ serviceType ];
                }
            }
        } );

        ko.applyBindings( bindings, node );
        $( '[data-toggle="popover"]' ).popover();
    }

    return {

        registerNode: function( node ) {
            getSettings( node.getDOMNode() );
        },

        deregisterNode: function( node ) {
            ko.cleanNode( node.getDOMNode() );
        }
    };
};
