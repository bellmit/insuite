/**
 * User: do
 * Date: 12/08/15  12:51
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */

/*jslint anon:true, sloppy:true, nomen:true*/
/*global YUI, ko, moment */
'use strict';
YUI.add( 'PatientHistoryBinderIndex', function( Y, NAME ) {
    function sortItems( a, b ) {
        return new Date( a.timestamp ) - new Date( b.timestamp );
    }

    function renderActivity( activity ) {
        return activity.actType + (activity.code ? ' ' + activity.code + ' ' : '') + ' ' + activity.content;
    }

    function renderPatientVersion( patient ) {
        var str = 'PATIENTVERSION ',
            publicInsurance = Y.doccirrus.schemas.patient.getInsuranceByType( patient, 'PUBLIC' );

        if( publicInsurance && publicInsurance.cardSwipe ) {
            str += publicInsurance.cardSwipe;
        }

        return str;
    }

    function Item( data, history ) {
        var
            itemDate = moment( data.timestamp ).format( 'DD.MM.YYYY' ),
            itemTime = moment( data.timestamp ).format( 'HH:mm' );
        this.date = itemDate;
        this.time = itemTime;
        this.raw = data;
        this.content = this.getContent( data );
        this.onClick = function( vm ) {
            history.rawDisplay( JSON.stringify( vm.raw, null, '    ' ) );
            if( vm.raw._relatedPatientVersionId ) {
                history.highlight( vm.raw._relatedPatientVersionId );
            }
        };
    }

    Item.prototype.getContent = function() {
        if( this.raw.actType ) {
            return renderActivity( this.raw );
        } else {
            return renderPatientVersion( this.raw );
        }
    };

    function PatientHistory( data ) {
        var self = this,
            items = data.patientVersions.concat( data.activities );

        self.days = [];
        items.sort( sortItems );
        items.forEach( function( item ) {
            self.addItem( new Item( item, self ) );
        } );
        this.highlight = ko.observable();
        this.rawDisplay = ko.observable( '' );
    }

    PatientHistory.prototype.addItem = function( item ) {
        var day = this.getDayByDate( item.date );

        day.addItem( item );

    };

    PatientHistory.prototype.getDayByDate = function( date ) {
        var found;

        this.days.some( function( _day ) {
            if( _day.date === date ) {
                found = _day;
                return true;
            }
        } );

        if( !found ) {
            found = new Day( date );
            this.days.push( found );
        }

        return found;
    };

    function Day( date ) {
        this.date = date;
        this.times = [];
    }

    Day.prototype.getItemByTime = function( time ) {
        var found;
        this.times.some( function( _time ) {
            if( _time.time === time ) {
                found = _time;
                return true;
            }
        } );

        if( !found ) {
            found = new Time( time );
            this.times.push( found );
        }

        return found;
    };

    Day.prototype.addItem = function( item ) {
        var time = this.getItemByTime( item.time );
        time.addItem( item );
    };

    function Time( time ) {
        this.time = time;
        this.items = [];
    }

    Time.prototype.addItem = function( item ) {
        this.items.push( item );
    };

    Y.namespace( 'mojito.binders' )[NAME] = {

        jaderef: 'CaseFileMojit',

        init: function( mojitProxy ) {
            this.mojitProxy = mojitProxy;
        },
        bind: function() {
            Y.doccirrus.jsonrpc.api.patient.getPatientHistory( {
                patientId: '55d48722062810ec1116abed',
                caseFolderId: '55784ca967740a3d120edc08',
                quarter: '32015'
            } ).done( function( response ) {
                ko.applyBindings( new PatientHistory( response.data ), document.getElementById( 'patientHistory' ) );
            } ).fail( function( response ) {
                Y.log( 'could not get patient history ' + response, 'error', NAME );
            } );

        }
    };

}, '0.0.1', {
    requires: [
        'event-mouseenter',
        'mojito-client',
        'mojito-rest-lib',
        'dccommonutils',
        'JsonRpcReflection-doccirrus',
        'JsonRpc'
    ]
} );