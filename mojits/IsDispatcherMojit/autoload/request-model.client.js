/**
 * User: do
 * Date: 02/03/15  15:29
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


/*global YUI, ko */
'use strict';

YUI.add( 'dcrequestmodel', function( Y ) {

        var i18n = Y.doccirrus.i18n,
            unwrap = ko.unwrap;

        function DispatchActivityModel( config ) {
            var self = this;
            self._modelName = 'DispatchActivityModel';
            Y.doccirrus.uam.ViewModel.call( self );
            self._schemaName = 'dispatchrequest.dispatchActivities.activities';
            Y.doccirrus.uam.SubViewModel.call( self, config );
            self._runBoilerplate( config );
            self._generateDependantModels();
            self.isValid = ko.observable( self.valid() );
        }

        /**
         * @param config
         * @constructor
         */
        function DispatchRequestActivityModel( config ) {

            var self = this;

            self._modelName = 'DispatchRequestActivityModel';
            Y.doccirrus.uam.ViewModel.call( self );
            self._schemaName = 'dispatchrequest.dispatchActivities';
            self._runBoilerplate( config );

            Y.doccirrus.uam.SubViewModel.call( self, config );
            self.activities._arrayOf = 'DispatchActivityModel';

            self.actTypeTranslation = Y.doccirrus.schemaloader.getEnumListTranslation( 'activity', 'Activity_E', self.actType(), 'i18n', '' );

            self._generateDependantModels();

            self.readOnly = ko.pureComputed( config.parent.readOnly.bind( parent ) );
        }

        Y.doccirrus.uam.DispatchRequestActivityModel = DispatchRequestActivityModel;
        Y.doccirrus.uam.DispatchActivityModel = DispatchActivityModel;

        function RequestModel( request ) {

            var
                self = this;

            self._modelName = 'RequestModel';

            Y.doccirrus.uam.ViewModel.call( self );

            self._schemaName = 'dispatchrequest';
            self._runBoilerplate( request );
            self._dataUrl = '/1/dispatchrequest';
            self._validatable( true );

            self.dispatchActivities._arrayOf = 'DispatchRequestActivityModel';

            self.formattedStatus = ko.observable();

            self.readOnly = ko.pureComputed( function() {
                return (self.status() !== 0);
            } );

            self.thumbSize = 240;

            // Manually set the fields that are not in the schema
            self.url = request.url;
            self.contentType = request.contentType;
            self.caption = request.caption;
            self.bsnr.hasError = ko.observable( false );
            self.bsnr.validationMessages = ko.observableArray( [i18n( 'IsDispatcherMojit.tab_requests.validation_msg.bsnr' )] );

            self.lanr.hasError = ko.observable( false );
            self.lanr.validationMessages = ko.observableArray( [i18n( 'IsDispatcherMojit.tab_requests.validation_msg.lanr' )] );

            self.patientId.hasError = ko.observable( false );
            self.patientId.validationMessages = ko.observableArray( [i18n( 'IsDispatcherMojit.tab_requests.validation_msg.patientId' )] );

            self.selectedLocation = ko.observable();

            if( !self.readOnly() ) {

                self.validateSelect2();

                self._addDisposable( ko.computed( function() {
                    ko.unwrap( self.selectedLocation );
                    self.bsnr.hasError( !self.selectedLocation() );
                } ) );

                self._addDisposable( ko.computed( function() {
                    var lanr = ko.unwrap( self.lanr );
                    self.lanr.hasError( !(lanr && self.selectedLocation()) );
                } ) );

                self._addDisposable( ko.computed( function() {
                    var patientId = ko.unwrap( self.patientId );
                    self.patientId.hasError( !(patientId && self.selectedLocation()) );
                } ) );
            }

            if( self.url && self.contentType ) {
                self.thumbUrl = ko.computed( function() {
                    var
                        contentType = ko.unwrap( self.contentType ),
                        fullUrl = Y.doccirrus.infras.getPrivateURL( ko.unwrap( self.url ) ),
                        mime = contentType.replace( '/', '_' ).toUpperCase(),
                        mediaIdMatch = /\/media\/(.*?)_/i.exec( fullUrl ),
                        mediaId = mediaIdMatch[ 1 ],
                        transform = self.thumbSize + 'x' + self.thumbSize,
                        thumbUrl;

                    thumbUrl = '/media/' + mediaId + '_' + transform + '.IMAGE_JPEG.jpg';

                    if( 'VIDEO_MP4' === mime || 'VIDEO_X-MSVIDEO' === mime || 'VIDEO_X-QUICKTIME' === mime ) {
                        thumbUrl = '/static/MediaMojit/assets/images/playthumb.png';
                    }

                    if( mime === 'APPLICATION_PDF' ) {
                        thumbUrl = '/media/' + mediaId + '_' + self.thumbSize + 'x-1.IMAGE_JPEG.jpg';
                    }

                    if( mime === 'IMAGE_GIF' ) {
                        thumbUrl = '/media/' + mediaId + '_' + transform + '.IMAGE_GIF.gif';
                    }

                    if( mime === 'AUDIO_MPEG' || mime === 'AUDIO_MP3' || mime === 'AUDIO_X-DSS' || mime === 'AUDIO_X-DS2' ) {
                        thumbUrl = '/static/MediaMojit/assets/images/playthumb.png';
                    }

                    thumbUrl = Y.doccirrus.infras.getPrivateURL( thumbUrl );
                    return thumbUrl;
                } );
            }

            self.fullUrl = ko.computed( function() {
                var
                    fullUrl = Y.doccirrus.infras.getPrivateURL( ko.unwrap( self.url ) );

                if( -1 !== fullUrl.indexOf( 'APPLICATION_PDF' ) ) {
                    fullUrl = fullUrl.replace( 'displayimage', 'downloadpdf' );
                }

                return fullUrl;
            } );

            self._generateDependantModels();
            self.initSelect2BSNR();
            self.initSelect2LANR();
            self.initSelect2Patient();
        }

        RequestModel.prototype.validateSelect2 = function() {

            var
                self = this;

            return new Promise( function( resolve ) {
                Y.doccirrus.jsonrpc.api.mirrorlocation.read( {
                    query: {
                        commercialNo: self.bsnr()
                    }
                } ).done( function( response ) {

                    if( response.data && response.data.length > 0 ) {
                        self.selectedLocation( response.data[0] );
                        if( true === response.data[0].isMainLocation ) {
                            self.selectedLocation().mainLocation = "000000000000000000000001";
                        }

                        Y.doccirrus.jsonrpc.api.mirroremployee.read( {
                            query: {
                                prcCustomerNo: self.selectedLocation().prcCustomerNo,
                                officialNo: self.lanr(),
                                "locations._id": self.selectedLocation().mainLocation || self.selectedLocation()._id,
                                isActive: true
                            }
                        } ).then( function( response ) {
                            if( response.data && response.data.length > 0 ) {

                                if( !self.employeeId() ) {
                                    self.employeeId( response.data[0]._id );
                                }

                            } else {
                                self.lanr.hasError( true );
                            }

                            return Y.doccirrus.jsonrpc.api.mirrorpatient.read( {
                                query: {
                                    prcCustomerNo: self.selectedLocation().prcCustomerNo,
                                    "partnerIds.patientId": self.patientId()
                                }
                            } );
                        } ).then( function( result ) {
                            if( result && result.data.length === 0 ) {
                                self.patientId.hasError( true );
                                resolve( {hasError: true} );
                            } else {
                                resolve( {hasError: false} );
                            }
                        } );
                    }
                } );
            } );
        };

        RequestModel.prototype.hasInvalidActivity = function() {
            var dacts = this.dispatchActivities(),
                hasInvalid = false,
                activities = ko.unwrap( this.dispatchActivities()[0].activities ),
                i;

            if( dacts && dacts.length > 0 ) {
                for( i = 0; i < activities.length; i++ ) {
                    if( !activities[i].isValid() ) {
                        hasInvalid = true;
                        return hasInvalid;
                    }
                }
            }
            return hasInvalid;
        };

        RequestModel.prototype.isValid = function() {
            return this.validateSelect2();
        };

        RequestModel.prototype.initSelect2BSNR = function() {
            var
                self = this;

            self.select2BSNR = {
                data: ko.computed( {
                    read: function() {
                        return {
                            text: ko.unwrap( self.bsnr )
                        };
                    },
                    write: function( $event ) {
                        self.bsnr( $event.added.text );
                        self.selectedLocation( $event.added.data.loc );
                        if( true === self.selectedLocation().isMainLocation ) {
                            self.selectedLocation().mainLocation = "000000000000000000000001";
                        }
                    }
                } ),
                select2: {
                    width: '100%',
                    query: function( query ) {
                        Y.doccirrus.jsonrpc.api.mirrorlocation.read( {
                            query: {
                                commercialNo: {$exists: true, $ne: ''},
                                $or: [
                                    {
                                        commercialNo: {
                                            $regex: '^' + query.term,
                                            $options: 'i'
                                        }
                                    },
                                    {
                                        locname: {
                                            $regex: query.term,
                                            $options: 'i'
                                        }
                                    }]
                            }
                        } ).done( function( response ) {
                                var
                                    data = response.data;
                                query.callback( {
                                    results: data.map( function( loc ) {
                                        if( !loc ) {
                                            return loc;
                                        }
                                        return {
                                            id: loc.commercialNo,
                                            text: loc.commercialNo,
                                            data: {
                                                loc: loc,
                                                locname: loc.locname
                                            }
                                        };
                                    } )
                                } );
                            }
                        ).fail( function() {
                            query.callback( {
                                results: []
                            } );
                        } );
                    },
                    formatResult: function( obj ) {
                        var loc = obj.data;
                        return obj.text + ' - ' + loc.locname;
                    }

                }
            };
        };

        RequestModel.prototype.initSelect2LANR = function() {
            var
                self = this;

            self.select2LANR = {
                data: ko.computed( {
                    read: function() {
                        return {
                            text: unwrap( self.lanr )
                        };
                    },
                    write: function( $event ) {
                        self.lanr( $event.added.text );
                        self.employeeId( $event.added.id );
                    }
                } ),
                select2: {
                    width: '100%',
                    query: function( query ) {
                        if( self.selectedLocation() ) {
                            Y.doccirrus.jsonrpc.api.mirroremployee.read( {
                                query: {
                                    prcCustomerNo: self.selectedLocation().prcCustomerNo,
                                    "locations._id": self.selectedLocation().mainLocation || self.selectedLocation()._id,
                                    isActive: true,
                                    $or: [
                                        {
                                            officialNo: {
                                                $exists: true,
                                                $ne: ''
                                            },
                                            firstname: {
                                                $regex: query.term,
                                                $options: 'i'
                                            }
                                        }, {
                                            officialNo: {
                                                $exists: true,
                                                $ne: ''
                                            },
                                            lastname: {
                                                $regex: query.term,
                                                $options: 'i'
                                            }
                                        }, {
                                            officialNo: {
                                                $regex: '^' + query.term,
                                                $options: 'i',
                                                $exists: true,
                                                $ne: ''
                                            }
                                        }]
                                }
                            } ).done( function( response ) {
                                    var
                                        data = response.data;
                                    query.callback( {
                                        results: data.map( function( empl ) {
                                            if( !empl ) {
                                                return empl;
                                            }
                                            return {
                                                id: empl._id,
                                                text: empl.officialNo,
                                                data: {
                                                    fistName: empl.firstname,
                                                    lastName: empl.lastname
                                                }
                                            };
                                        } )
                                    } );
                                }
                            ).fail( function() {
                                query.callback( {
                                    results: []
                                } );
                            } );
                        } else {
                            query.callback( {
                                results: []
                            } );
                        }
                    },
                    formatResult: function( obj ) {
                        var empl = obj.data;
                        return obj.text + ' - ' + empl.fistName + ' ' + empl.lastName;
                    }

                }
            };
        };

        RequestModel.prototype.initSelect2Patient = function() {
            var
                self = this;

            function setEmployee() {
                Y.doccirrus.jsonrpc.api.mirroremployee.read( {
                    query: {
                        prcCustomerNo: self.selectedLocation().prcCustomerNo,
                        officialNo: {$exists: true, $ne: ''},
                        "locations._id": self.selectedLocation().mainLocation || self.selectedLocation().id,
                        isActive: true
                    }
                } ).done( function( res ) {
                    var emp = res.data[0];
                    self.lanr( emp.officialNo );
                    self.employeeId( emp._id );
                } );
            }

            self.select2Patient = {
                data: ko.computed( {
                    read: function() {
                        return {
                            text: ko.unwrap( self.patientId )
                        };
                    },
                    write: function( $event ) {

                        self.patientId( $event.added.text );
                        var selectedLocationWas = unwrap( self.selectedLocation ),
                            patientLocation = $event.added.data.prcCustomerNo;

                        if( !selectedLocationWas || (selectedLocationWas && unwrap( selectedLocationWas.prcCustomerNo ) !== patientLocation) ) {
                            Y.doccirrus.jsonrpc.api.mirrorlocation.read( {
                                query: {
                                    prcCustomerNo: patientLocation,
                                    commercialNo: {$exists: true, $ne: ''}
                                }
                            } ).done( function( result ) {
                                var loc = result.data[0];

                                self.bsnr( loc.commercialNo );
                                self.selectedLocation( loc );
                                if( true === self.selectedLocation().isMainLocation ) {
                                    self.selectedLocation().mainLocation = "000000000000000000000001";
                                }
                                setEmployee();
                            } );
                        } else if( self.lanr.hasError() ) {
                            setEmployee();
                        }
                    }
                } ),
                select2: {
                    width: '100%',
                    query: function( query ) {
                        Y.doccirrus.jsonrpc.api.mirrorpatient.read( {
                            query: (function() {
                                var q = {},
                                    selectedLocation = unwrap( self.selectedLocation );

                                if( selectedLocation && selectedLocation.prcCustomerNo ) {
                                    q = Y.mix( q, {prcCustomerNo: self.selectedLocation().prcCustomerNo} );
                                }

                                q = Y.mix( q, {
                                    $or: [
                                        {
                                            "partnerIds.patientId": {
                                                $regex: '^' + query.term,
                                                $options: 'i',
                                                $exists: true,
                                                $ne: ''
                                            }
                                        },
                                        {
                                            lastname: {
                                                $regex: query.term,
                                                $options: 'i'
                                            },
                                            "partnerIds.patientId": {
                                                $exists: true,
                                                $ne: ''
                                            }
                                        },
                                        {
                                            firstname: {
                                                $regex: query.term,
                                                $options: 'i'
                                            },
                                            "partnerIds.patientId": {
                                                $exists: true,
                                                $ne: ''
                                            }
                                        }]
                                } );

                                return q;
                            }())
                        } ).done( function( response ) {
                                var
                                    data = response.data;
                                query.callback( {
                                    results: data.map( function( patient ) {
                                        if( !patient ) {
                                            return patient;
                                        }

                                        return {
                                            id: patient._id,
                                            text: Y.doccirrus.schemas.patient.getGHDPartnerId( patient ),
                                            data: {
                                                fistName: patient.firstname,
                                                lastName: patient.lastname,
                                                prcCustomerNo: patient.prcCustomerNo
                                            }
                                        };
                                    } )
                                } );
                            }
                        ).fail( function() {
                            query.callback( {
                                results: []
                            } );
                        } );
                    },
                    formatResult: function( obj ) {
                        var patient = obj.data;
                        return obj.text + ' - ' + patient.fistName + ' ' + patient.lastName;
                    }

                }
            };
        };

        Y.namespace( 'doccirrus.uam' ).RequestModel = RequestModel;

    },
    '0.0.1', {requires: ['dcviewmodel', 'patient-schema', 'mirrorlocation-schema', 'mirroremployee-schema']}
);