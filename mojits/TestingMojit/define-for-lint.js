/**
 *  This file is not intended to be run.
 *
 *  This is an attempt to get webstorm to mute warnings about valid ko and jadeRepository calls
 *
 *  see: http://devnet.jetbrains.com/message/5504337#5504337
 *
 *  @author  strix
 */



/*jslint latedef:false */
/*exported ko */

function ko() {

    function nullObjectObjectFunction( someObject, someOtherObject ) {
        console.log('I should never be run: ' + JSON.stringify( someObject ) + ' ' + JSON.stringify( someOtherObject ));
    }

    function nullMixedFunction( someValue ) {
        console.log('I should never be run: ' + JSON.stringify( someValue ));
    }

    function nullArrayFunction( someArray ) {
        console.log('I should never be run: ' + JSON.stringify( someArray ));
    }

    function nullArrayFunctionWithCb( someArray, someFunction ) {
        console.log('I should never be run: ' + JSON.stringify( someArray ));
        someFunction();
    }

    dcYUIExtensions();
    reqParams();

    return {
        'applyBindings': nullObjectObjectFunction,
        'observable': nullMixedFunction,
        'observableArray': nullArrayFunction,
        'cleanNode': nullMixedFunction,
        'utils': {
            'arrayForEach': nullArrayFunctionWithCb,
            'arrayFirst': nullArrayFunctionWithCb
        }
    };
}

function dcYUIExtensions() {
    return {
        'dcJadeRepository': {}
    };
}

function reqParams() {
    return {
        params: {
            'patientTab': '',
            'iid': ''
        }
    };
}