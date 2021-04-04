/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko */
YUI.add( 'CaseFolderCollection', function( Y/*, NAME*/ ) {
    'use strict';
    /**
     * @module CaseFolderCollection
     */
    Y.namespace( 'doccirrus' );
    var
        unwrap = ko.unwrap,
        i18n = Y.doccirrus.i18n,

        KoViewModel = Y.doccirrus.KoViewModel,
        Collection = KoViewModel.getConstructor( 'Collection' );

    function CaseFolderCollection( config ) {
        CaseFolderCollection.superclass.constructor.call( this, config );
    }

    Y.extend( CaseFolderCollection, Collection, {
        initializer: function() {
            var
                self = this;

            self.activeCaseFolderId = ko.observable();
        },
        destructor: function() {

        },
        load: function( parameters ) {
            parameters = parameters || {};
            var
                self = this,
                patientId = parameters.patientId,
                binder = self.get( 'binder' ),
                incaseconfiguration = binder && binder.getInitialData( 'incaseconfiguration' );

            return Y.doccirrus.jsonrpc.api.casefolder
                .getCaseFolderForCurrentEmployee( {query: {patientId: patientId}} )
                .then( function( response ) {
                    var
                        preparedCaseFolder,
                        data = Array.isArray( response.data ) && response.data || [],
                        activitiesPrepared = data.pop();
                    if( ( incaseconfiguration && incaseconfiguration.applyPreparedCaseFolder ) || ( activitiesPrepared && activitiesPrepared.activitiesCount ) ) {
                        preparedCaseFolder = {_id: Y.doccirrus.schemas.casefolder.getPreparedCaseFolderId(), title: i18n('casefolder-api.PREPARED'), type: 'PREPARED' };
                        data.push( preparedCaseFolder );
                    }
                    return data;
                } )
                .done( function( folders ) {
                    self.items( folders );
                } );
        },
        getTabById: function( id ) {
            return this.find( function( caseFolder ) {
                return caseFolder._id === id;
            } );

        },
        getActiveTab: function() {
            return this.getTabById( unwrap( this.activeCaseFolderId ) );
        },
        getLastOfType: function( type ) {
            var
                filtered = this.filter( function( caseFolder ) {
                    return caseFolder.type === type;
                } );

            if( filtered.length ) {
                return filtered[filtered.length - 1];
            }

            return null;
        },
        getLastOfAdditionalType: function( type ) {
            var
                filtered = this.filter( function( caseFolder ) {
                    return caseFolder.additionalType === type;
                } );

            if( filtered.length ) {
                return filtered[filtered.length - 1];
            }

            return null;
        },
        getCaseFolders: function() {
            return this.filter( function( caseFolder ) {
                return !caseFolder.imported && (Boolean( caseFolder.type ) || Y.doccirrus.schemas.casefolder.additionalTypes.QUOTATION === caseFolder.additionalType);
            } );
        },
        canCreateActivity: function( params ) {
            params = params || {};
            var
                caseFolderId = params.caseFolderId,
                caseFolder = (caseFolderId) ? this.getTabById( caseFolderId ) : this.getActiveTab(),
                CARDIO_1_TYPE = Y.doccirrus.schemas.casefolder.additionalTypes.CARDIO,
                CARDIO_2_TYPE = Y.doccirrus.schemas.casefolder.additionalTypes.DOQUVIDE,
                CARDIO_3_TYPE = Y.doccirrus.schemas.casefolder.additionalTypes.CARDIACFAILURE,
                CARDIO_4_TYPE = Y.doccirrus.schemas.casefolder.additionalTypes.STROKE,
                CARDIO_5_TYPE = Y.doccirrus.schemas.casefolder.additionalTypes.DQS,
                CARDIO_6_TYPE = Y.doccirrus.schemas.casefolder.additionalTypes.CHD,
                PREGNANCY_TYPE = Y.doccirrus.schemas.casefolder.additionalTypes.PREGNANCY;

            //  must have a casefolder
            if ( !caseFolder || !Boolean( caseFolder._id ) ) {
                return false;
            }

            //  must not be imported (locked, historical)
            if ( caseFolder.imported ) {
                return false;
            }

            return (
                    caseFolder.type ||
                    'QUOTATION' === caseFolder.additionalType ||
                    CARDIO_1_TYPE === caseFolder.additionalType ||
                    CARDIO_2_TYPE === caseFolder.additionalType ||
                    CARDIO_3_TYPE === caseFolder.additionalType ||
                    CARDIO_4_TYPE === caseFolder.additionalType ||
                    CARDIO_5_TYPE === caseFolder.additionalType ||
                    CARDIO_6_TYPE === caseFolder.additionalType ||
                    PREGNANCY_TYPE === caseFolder.additionalType
            );
        },
        getActivePregnancy: function() {
            var
                filtered = this.filter( function( caseFolder ) {
                    return (
                        ( 'PREGNANCY' === caseFolder.additionalType ) &&
                        ( false === caseFolder.disabled )
                    );
                } );

            if( filtered.length ) {
                return filtered[filtered.length - 1];
            }

            return null;
        }
    }, {
        NAME: 'CaseFolderCollection',
        ATTRS: {
            binder: {
                valueFn: function() {
                    return Y.doccirrus.utils.getMojitBinderByType( 'InCaseMojit' ) || Y.doccirrus.utils.getMojitBinderByType( 'MirrorPatientMojit' );
                },
                lazyAdd: false
            }
        }
    } );

    KoViewModel.registerConstructor( CaseFolderCollection );

}, '3.16.0', {
    requires: [
        'oop',
        'KoViewModel',
        'Collection',

        'JsonRpcReflection-doccirrus',
        'JsonRpc'
    ]
} );
