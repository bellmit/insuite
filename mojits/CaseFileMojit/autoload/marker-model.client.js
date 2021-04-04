/*
 @author: ts
 @date: 2014/01/19
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'dcmarkermodel', function( Y ) {

        function MarkerModel( marker ) {
            var
                self = this;

            self._modelName = 'MarkerModel';
            Y.doccirrus.uam.ViewModel.call( self );

            self._schemaName = 'marker';
            self._runBoilerplate( marker );


            self._iconRel = ko.computed( {
                read: function() {
                    var icon = self.icon();
                    return Y.doccirrus.uam.MarkerIconArrayModel.getById( icon );
                },
                owner: self
            } );
            self._severityRel = ko.computed( {
                read: function() {
                    var severity = self.severity();
                    return Y.doccirrus.uam.MarkerSeverityArrayModel.getBySeverity( severity );
                },
                owner: self
            } );
            self._colorRel = ko.computed( {
                read: function() {
                    var severity = self.severity();
                    var result = Y.doccirrus.uam.MarkerSeverityArrayModel.getBySeverity( severity );
                    return result ? result.color() : '';
                },
                write: function( value ) {
                    var severity = self.severity();
                    var result = Y.doccirrus.uam.MarkerSeverityArrayModel.getBySeverity( severity );
                    if( result instanceof Y.doccirrus.uam.MarkerSeverityModel ) {
                        result.color( value );
                        return true;
                    }
                },
                owner: self
            } );

            var _select2Icon = ko.computed( {
                read: function() {
                    return ko.unwrap( self.icon );
                },
                write: function( $event ) {
                    self.icon( $event.val );
                }
            } );

            self._addDisposable( _select2Icon );

            function formatMarkers(obj){
                return '<span class="'+ obj.id +'", style="color: '+self._colorRel()+' ">';
            }

            self.select2Icon = {
                val: _select2Icon,
                select2: {
                    dropdownAutoWidth : true,
                    data: function() {
                        return {
                            results: Y.doccirrus.uam.MarkerIconArrayModel.markerIconList().map( function( entry ) {
                                return { id: entry._id, text: ko.unwrap( entry.text )};
                            } )
                        };
                    },
                    formatResult: formatMarkers,
                    formatSelection: formatMarkers
                }
            };

            var update = function() {

                var data = {
                    description: self.description(),
                    icon: self.icon(),
                    severity: self.severity()
                };

                if( self.description.validateNow().valid ) {
                    Y.doccirrus.jsonrpc.api.marker.update( {
                        data: data,
                        query: { _id: self._id },
                        fields: ['description', 'icon', 'severity']
                    } );
                }

            };

            self._addDisposable( self.description.subscribe( update ) );
            self._addDisposable( self.icon.subscribe( update ) );
            self._addDisposable( self.severity.subscribe( update ) );

        }

        Y.namespace( 'doccirrus.uam' ).MarkerModel = MarkerModel;
    },
    '0.0.1', {requires: [
        'dcviewmodel',
        'dcsubviewmodel',
        'dcmarkericonmodel',
        'dcmarkerseveritymodel',
        'dcmarkericonarraymodel',
        'dcmarkerseverityarraymodel'
    ] }
);