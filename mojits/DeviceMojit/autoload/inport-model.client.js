/*
 @author: rw
 @date: 2014/1/28
 */

/*jslint anon:true, nomen:true*/
/*global YUI */

'use strict';

YUI.add( 'inportmodel', function( Y ) {

        function InportModel( data ) {

            var
                self = this;
            self._modelName = 'inportModel';
            Y.doccirrus.uam.ViewModel.call( self );
            self._dataUrl = '/1/inport';

            self._schemaName = 'inport';
            
            self._runBoilerplate( data );

            this._parserList =  ["none", "Visutron PLUS", "Nikon Speedy-K","Tomey TL-3000", "Leica"];
            this._parityList =  ["none", "even", "odd", "mark", "space"];
            this._baudrateList = [  50, 75, 110, 134, 150, 200, 300, 600, 1200, 1800, 2400, 4800, 9600, 19200, 38400, 57600, 115200  ];
            this._databitsList = [5,6,7,8];
            this._stopbitsList = [1, 1.5, 2];
            
            //alert(JSON.stringify(self._serializeToJS()));

        }
        
        Y.namespace( 'doccirrus.uam' ).InportModel = InportModel;
    },
    '0.0.1', {requires: [
        'inport-schema',
        'dcviewmodel',
        'KoUI-all'
    ] }
);