/*
 @author: dd
 @date: 2013/02/01
 */

/*jslint anon:true, nomen:true*/
/*global YUI, ko */

'use strict';

YUI.add( 'dcmarkerseveritymodel', function( Y ) {

        function MarkerSeverityModel( markerPriority ) {
            var
                self = this;
            self._modelName = 'MarkerSeverityModel';
            Y.doccirrus.uam.ViewModel.call( self );

            self._schemaName = 'severity';
            self._runBoilerplate( markerPriority );

            self._name = ko.computed(function(){
                var severity = self.severity(),
                    definition = Y.Array.find(self._severityList, function(item){
                        return item.val === severity;
                    });
               return definition.i18n;
            });

            self._addDisposable( ko.computed( function() {
                var
                    color = self.color(),
                    isInitial = ko.computedContext.isInitial();
                if( !isInitial ) {
                    Y.doccirrus.jsonrpc.api.severity.update( {
                        data: { color: color },
                        query: { _id: self._id },
                        fields: ['color']
                    } );
                }
            } ).extend( { rateLimit: 700 } ) );
        }

        Y.namespace( 'doccirrus.uam' ).MarkerSeverityModel = MarkerSeverityModel;
    },
    '0.0.1', {requires: [
        'dcviewmodel',
        'dcsubviewmodel'
    ] }
);
