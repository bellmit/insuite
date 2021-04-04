

var Y;
var Handlebars  = require("handlebars");
var Moment      = require('moment');
var callback = function() {};

//-- Quick Internal Helpers --
//-- Find out if it's the generic JSON Argument from Handlebards -
function _isHandlebarsContext(arg){
    return arg instanceof Object && arg.data instanceof Object;
}


//-- Just comments
function DC() {
    return;
}

//-- Write line --
function write_line(){
    /*jshint validthis:true */
    var i,
        ddd,
        value = '',
        context = this,
        key = arguments[0],
        lastArgIsHbContext = _isHandlebarsContext(arguments[arguments.length-1] ),
        values = Array.prototype.slice.call(arguments, 1, (lastArgIsHbContext) ? arguments.length - 1 : arguments.length);

    //-- Data control --
    if (!values.length){
        callback({error: '001', msg: 'Missing value' });
        return 'ERROR Missing value ' + key;
    }
    if (!key)  {
        callback({error: '002', msg: 'Missing key' });
        return 'ERROR Missing key ' + values;
    }

    for(i = 0; values.length > i; i++){
        //---------------------------------------------------------
        //-- HACK: If value comes as { v:'1010101010', k:'0210' }
        //-- we just extract the final (v)alue
        //---------------------------------------------------------
        value += values[i];
    }
    value = value.replace( /(\r\n|\n|\r)/gm, ' ' ).trim();

    // remove only whitespace strings
    if(!value.match(/\S/)){
        value = '';
    }

    //-- Result should be `ddd+key+value` where:
    //-- ddd   - length of `value` + 9, formatted as `000`
    //-- key   - KBV Key for a given field
    //-- value - `value` we want to output
    ddd = '00'.concat(value.length + 9).slice(-3);

    callback({
        key: key,
        value: value,
        context: context
    });
    return new Handlebars.SafeString(ddd + key + value);
}

//-- Write line with break
function write_line_with_break(key, value){
    /*jshint validthis:true */
    //-- A normal KBV line should be `ddd+key+value+'CR+LF'`
    //-- since write_line only provide the basics, we concat.
    return write_line.call(this, key, value)+'\r\n';
}

//-- Write date --
function write_date(key, value, format){
    /*jshint validthis:true */
    var _format = format;

    //-- By default parsing --
    if(_isHandlebarsContext(format)){ _format = 'YYYYMMDD'; }
    //-- Format date --
    value = value || '';
    var date = new Moment(value);

    //-- Validating if source can be date and format --
    if (date.isValid()){
        value = date.format(_format);
    } else {
        Y.log('Error 003 parsing date: ' + key + ' ' + value, 'error');
    }

    return write_line.call(this, key, value);
}

function dob( key, value ) {
    /*jshint validthis:true */
    var i, arr, dateStr = '';
    if( 'string' === typeof value ) {
        // transform to new (KVK-Ablöse) KBV-Date-Format YYYYMMDD
        arr = value.split( '.' );
        for( i = arr.length - 1; i >= 0; i-- ) {
            dateStr += arr[i];
        }
    }
    return write_line.call( this, key, dateStr );
}

function optional(key, value){
    /*jshint validthis:true */
    if(!value) {
        return;
    }
    return '\r\n' + write_line.call(this, key, value);
}
function daySeparation(key, value, value1 ){
    var time = value1 || value;
    /*jshint validthis:true */
    if(!time || 'string' !== typeof time) {
        return;
    }
    return '\r\n' + write_line.call(this, key, time.replace(':', ''));
}

function optionalHeader(key, value){
    /*jshint validthis:true */
    if(!value) {
        return;
    }
    return '\r\n' + write_line.call(this, key, value);
}

function write_time( key, value ) {
    /*jshint validthis:true */
    if(!value){
        return;
    }
    var time = new Moment(value,'HH:mm');
    if(time && time.isValid()){
        value = time.format('HHmm');
    } else {
        value = '';
    }
    return '\r\n' + write_line.call(this, key, value);
}

function chunk(key, value) {
    /*jshint validthis:true */
    var lines = '\r\n';
    if(!value) {
        return;
    }
    // replace all os newlines with whitespace and trim to prevent whitespace lines at the end
    value = value.replace(/(\r\n|\n|\r|\t|\v|\f|\u2028|\u2029)/gm, ' ' ).replace(/\s\s+/gm, ' ').trim();
    var iterations = Math.floor(value.length / 60);

    for(let i = 0; i <= iterations; i++ ){
        let val = value.substring(i*60, (i+1)*60);
        if(i === iterations){
            if('' === val) {
                lines = lines.substring(0, lines.length-2 );
                continue;
            }
            lines += write_line.call(this, key, val);
        } else {
            lines += write_line_with_break.call(this, key, val);
        }

    }
    return new Handlebars.SafeString(lines);
}

function scheinDiagnosis( key, text, icds ) {
    /*jshint validthis:true */
    var self = this;
    text = chunk.call( this, key, text ) || '';
    if( Array.isArray( icds ) && icds.length ) {
        icds.forEach( function( icd ) {
            text += '\r\n' + write_line.call( self, key, icd );
        } );
    }
    return text || undefined;
}

function officialNo( val ) {
    /*jshint validthis:true */
    var isAsvPseudoNo = null !== Y.doccirrus.regexp.isAsvPseudoNo.exec( val );
    if( isAsvPseudoNo ) {
        return '\r\n' + write_line.call( this, '0223', val );
    }
    return '\r\n' + write_line.call( this, '0212', val );
}

//-- Advanced --
function gender(key, data){
    /*jshint validthis:true */
    var _data = "U";

    switch(data){
        case 'MALE'     :
            _data = 'M';
            break;
        case 'FEMALE'   :
            _data = 'W';
            break;
        case 'UNDEFINED':
            _data = 'X';
            break;
        case 'VARIOUS':
            _data = 'D';
            break;
    }

    return write_line.call(this, key, _data);
}

function diagnosisCert(key, data){
    /*jshint validthis:true */
    var _data = "";
    if(!data || "NONE"===data ){
        return;
    }

    switch(data){
        case 'CONFIRM'     :
            _data = 'G';
            break;
        case 'TENTATIVE'   :
            _data = 'V';
            break;
        case 'ASYMPTOMATIC'   :
           _data = 'Z';
            break;
        case 'EXCLUDE'   :
            _data = 'A';
            break;
    }

    return '\r\n' + write_line.call(this, key, _data);
}

function hospitalStay(key, from, to){
    /*jshint validthis:true */
    if(!from || !to){
        return;
    }

    from = new Moment(from);
    to = new Moment(to);

    if(!from.isValid() && !to.isVald()){
        return;
    }

    return '\r\n' + write_line.call(this, key, from.format('YYYYMMDD'), to.format('YYYYMMDD'));
}

function insuranceNumber( insNo ) {
    /*jshint validthis:true */
    var lines = '';
    if( Y.doccirrus.validations.kbv._egkNo( insNo ) ) {
        lines += '\r\n' + write_line.call( this, '3119', insNo );
    } else if( Y.doccirrus.validations.kbv._kvkNo( insNo ) ) {
        lines += '\r\n' + write_line.call( this, '3105', insNo );
    } else if( insNo ) {
        lines += '\r\n' + write_line.call( this, '3119', insNo );
    }

    if( !lines ) {
        return;
    }

    return new Handlebars.SafeString( lines );
}

function ifReplacement ( cardSwipe, timestamp, options ) {
    /*jshint validthis:true */
    var cardSwipeQuarter,
        scheinQuarter;

    if( !cardSwipe || !timestamp){
        return options.fn(this);
    }

    cardSwipeQuarter = new Moment(cardSwipe).quarter();
    scheinQuarter = new Moment(timestamp).quarter();

    if(scheinQuarter !== cardSwipeQuarter){
        return options.fn(this);
    }

    return options.inverse(this);
}

// deprecated since Q1 2019
function egkType( key, cardType ) {
    /*jshint validthis:true */

    if( !invoiceIsBefore( this, '1', '2019' ) ) {
        return;
    }

    var val = '0',
        map = {
        'G1plus': '2',
        'G2': '3'
    };

    if(cardType){
        val = map[cardType] || '0';
    }

    return '\r\n' + write_line.call(this, key, val);
}

function endOfNextQ( q, y ) {
    var m;
    if( 1 > q || 4 < q) {
        return;
    }
    if(q === 4){
        q = 1;
        y++;
    } else {
        q++;
    }
    m = q * 3;

    return new Moment( m + '.' + y, 'M.YYYY').endOf('month');
}

function insuranceValidTo( key, value, format ) {
    /*jshint validthis:true */
    var date,
        scheinDate;
    if(!value){
        scheinDate = new Moment(this.timestamp);
        if(scheinDate && scheinDate.isValid()){
            date = endOfNextQ(scheinDate.quarter(), scheinDate.year() );
            value = (date) ? date.toJSON() : undefined ;
        }
    }
    return write_date.call(this, key, value, format);
}

function iff (v1, operator, v2, options) {
    /*jshint validthis:true */
    switch (operator) {
        case '==':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '!=':
            return (v1 !== v2) ? options.fn(this) : options.inverse(this);
        case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
        default:
            return options.inverse(this);
    }
}

function oDate( key, value, format ) {
    /*jshint validthis:true */
    if(!value){
        return;
    }
    return '\r\n' + write_date.call(this, key, value, format);
}

function oFromTo( key, from, to ) {
    /*jshint validthis:true */
    if(!from && !to){
        return;
    }
    from = new Moment(from);
    to = new Moment(to);
    if(!from.isValid() && !to.isValid()){
        return;
    }
    return '\r\n' + write_line.call(this, key, from.format('YYYYMMDD'), to.format('YYYYMMDD'));
}

function checkbox( key, value ) {
    /*jshint validthis:true */
    if(!value){
        return;
    }
    return '\r\n' + write_line.call(this, key, '1');
}

function oOr( key, valueA, valueB ) {
    /*jshint validthis:true */
    if(valueA){
        return '\r\n' + write_line.call(this, key, valueA);
    } else if(valueB) {
        return '\r\n' + write_line.call( this, key, valueB );
    }
    return;
}

function l60( key, value ) {
    /*jshint validthis:true */
    if(value){
        value = value.slice(0, 60);
    }
    return write_line.call(this, key, value);
}

function oArray( key, values ) {
    /*jshint validthis:true */
    var i, len, value,
        lines = '';

    if(!values || !values.length){
        return;
    }
    for(i = 0, len = values.length; i < len; i++){
        value = values[i];
        if(value && 'string' === typeof value){
            lines += '\r\n' +  write_line.call(this, key, value);
        }
    }
    if(0 === lines.length){
        return;
    }
    return new Handlebars.SafeString(lines);
}

function oDiagnosisSite( key, value ) {
    /*jshint validthis:true */
    if(!value){
        return;
    }
    return '\r\n' +  write_line.call(this, key, value[0]);
}

function treatmentDate( key, timestamp, format ) {
    /*jshint validthis:true */
    // add new 5000 field (Leistungstag) for first treatment on day or if day separation is set
    if( this._isFirstOnDay || this.daySeparation ) {
        return '\r\n' + write_date.call( this, key, timestamp, format );
    }
}

function wop( key, scheinWOP, insuranceWOP ) {
    /*jshint validthis:true */
    if('0102' === this.scheinType || '0103' === this.scheinType){
        if(scheinWOP){
            return '\r\n' + write_line.call(this, key, scheinWOP);
        }
    }
    if(insuranceWOP){
        return '\r\n' + write_line.call(this, key, insuranceWOP);
    }
}

function FK5012Set( set ) {
    /*jshint validthis:true */
    var i, j, len, fks, lines = '';
    if(!set || !Array.isArray(set) || !set.length){
        return;
    }
    for(i = 0, len = set.length; i < len; i++){
        fks = set[i];
        if(fks.fk5012 && fks.fk5011Set && Array.isArray(fks.fk5011Set)){
            lines += '\r\n' +  write_line.call(this, '5012', fks.fk5012);
            for(j = 0; j < fks.fk5011Set.length; j++){
                lines += chunk.call(this, '5011', fks.fk5011Set[j].fk5011);
            }
            if( fks.fk5074 ) {
                lines += '\r\n' + write_line.call( this, '5074', fks.fk5074 );
            }
            if( fks.fk5075 ) {
                lines += '\r\n' + write_line.call( this, '5075', fks.fk5075 );
            }
        }
    }
    if(0 === lines.length){
        return;
    }
    return new Handlebars.SafeString(lines);
}

function FK5020Set( set ) {
    /*jshint validthis:true */
    var i, len, fks, lines = '';
    if(!set || !Array.isArray(set) || !set.length){
        return;
    }
    for(i = 0, len = set.length; i < len; i++){
        fks = set[i];
        if(fks.fk5020 && fks.fk5021){
            lines += '\r\n' +  write_line.call(this, '5020', (fks.fk5020) ? '1' : '0');
            lines += '\r\n' +  write_line.call(this, '5021', fks.fk5021);
        }
    }
    if(0 === lines.length){
        return;
    }
    return new Handlebars.SafeString(lines);
}

function FK5035Set( set ) {
    /*jshint validthis:true */
    var i, len, fks, lines = '';
    if(!set || !Array.isArray(set) || !set.length){
        return;
    }
    for(i = 0, len = set.length; i < len; i++){
        fks = set[i];

        if( fks.fk5035 ) {
            lines += '\r\n' + write_line.call( this, '5035', fks.fk5035 );
        }
        if( fks.fk5035 && fks.fk5041 ) {
            lines += '\r\n' + write_line.call( this, '5041', fks.fk5041 );
        }
    }
    if(0 === lines.length){
        return;
    }
    return new Handlebars.SafeString(lines);
}

function FK5042Set( set ) {
    /*jshint validthis:true */
    var i, len, fks, lines = '';
    if(!set || !Array.isArray(set) || !set.length){
        return;
    }
    for(i = 0, len = set.length; i < len; i++){
        fks = set[i];
        if(fks.fk5042 && fks.fk5043){
            lines += '\r\n' +  write_line.call(this, '5042', fks.fk5042);
            lines += '\r\n' +  write_line.call(this, '5043', fks.fk5043);
        }
    }
    if(0 === lines.length){
        return;
    }
    return new Handlebars.SafeString(lines);
}

function FK5036Set( set ) {
    /*jshint validthis:true */
    var i, len, fks, lines = '';
    if(!set || !Array.isArray(set) || !set.length){
        return;
    }
    for(i = 0, len = set.length; i < len; i++){
        fks = set[i];
        if(fks.fk5036) {
            lines += '\r\n' +  write_line.call(this, '5036', fks.fk5036);
        }
    }
    if(0 === lines.length){
        return;
    }
    return new Handlebars.SafeString(lines);
}

function FK4235Set( set ) {
    /*jshint validthis:true */
    var i, j, len, len_j, fks, fk_j, lines = '';
    var self = this;

    function renderFk4251( fk4251 ) {
        if( fk4251.fk4251 ) {
            lines += '\r\n' + write_line.call( self, '4251', fk4251.fk4251 );
        }
    }

    if( !set || !Array.isArray( set ) || !set.length ) {
        return;
    }
    for( i = 0, len = set.length; i < len; i++ ) {
        fks = set[i];
        if( fks.fk4235 ) {
            lines += '\r\n' + write_date.call( this, '4235', fks.fk4235, 'YYYYMMDD' );
            if( fks.fk4299 ) {
                lines += '\r\n' + write_line.call( this, '4299', fks.fk4299 );
            }
            if( fks.fk4247 ) {
                lines += '\r\n' + write_date.call( this, '4247', fks.fk4247, 'YYYYMMDD' );
            }

            if( fks.fk4250 ) {
                lines += '\r\n' + write_line.call( this, '4250', '1' );
                if( fks.fk4251Set && fks.fk4251Set.length ) {
                    fks.fk4251Set.forEach( renderFk4251 );
                }
            }

            if( fks.fk4252 ) {
                lines += '\r\n' + write_line.call( this, '4252', ('' + fks.fk4252) );
            }

            if( fks.fk4244Set && Array.isArray( fks.fk4244Set ) && fks.fk4244Set.length ) {
                for( j = 0, len_j = fks.fk4244Set.length; j < len_j; j++ ) {
                    fk_j = fks.fk4244Set[j];
                    if( fk_j.fk4244 && fk_j.fk4246 ) {
                        lines += '\r\n' + write_line.call( this, '4253', fk_j.fk4244 );
                        lines += '\r\n' + write_line.call( this, '4254', fk_j.fk4246 );
                    }
                }
            }

            if( fks.fk4255 ) {
                lines += '\r\n' + write_line.call( this, '4255', ('' + fks.fk4255) );
            }

            if( fks.fk4256Set && Array.isArray( fks.fk4256Set ) && fks.fk4256Set.length ) {
                for( j = 0, len_j = fks.fk4256Set.length; j < len_j; j++ ) {
                    fk_j = fks.fk4256Set[j];
                    if( fk_j.fk4244 && fk_j.fk4246 ) {
                        lines += '\r\n' + write_line.call( this, '4256', fk_j.fk4244 + (/\d+[A-Z]$/.test(fk_j.fk4244) ? '': 'B'));
                        lines += '\r\n' + write_line.call( this, '4257', fk_j.fk4246 );
                    }
                }
            }
        }
    }
    if( 0 === lines.length ) {
        return;
    }
    return new Handlebars.SafeString( lines );
}

function multiplicator( key, value ) {
    /*jshint validthis:true */
    // muliplicator is always a number 002-999
    if( value ) {
        value = ('000' + value).slice( -3 );
        return '\r\n' + write_line.call( this, key, value );
    }
}

function writeAddresses( addresses ) {
    /*jshint validthis:true */

    var official,
        postbox,
        lines = '',
        self = this;

    function writeLine( key, wrappedValue ) {
        if(wrappedValue){
            lines += '\r\n' +  write_line.call(self, key, wrappedValue);
        }
    }

    if(addresses && !Array.isArray(addresses) || !addresses.length){
        return;
    }

    addresses.forEach( function( address ) {
        if('OFFICIAL' === address.kind){
            official = address;
        } else if('POSTBOX' === address.kind){
            postbox = address;
        }
    });

    if(official){
        writeLine('3107', official.street);
        writeLine('3109', official.houseno);
        writeLine('3115', official.addon);
        writeLine('3112', official.zip);
        writeLine('3114', official.countryCode);
        writeLine('3113', official.city);
    }

    if(postbox){
        writeLine('3121', postbox.zip);
        writeLine('3122', postbox.city);
        writeLine('3123', postbox.postbox);
        writeLine('3124', postbox.countryCode);
    }

    if(0 === lines.length){
        return;
    }

    return new Handlebars.SafeString(lines);
}

function scheinDate( key, _scheinDate, timestamp, format ) {
    /*jshint validthis:true */
    return write_date.call( this, key, _scheinDate || timestamp, format );
}

function omimCodes( omimCodes ) {
    /*jshint validthis:true */
    var self = this,
        lines = '';

    function writeLine( key, wrappedValue ) {
        if( wrappedValue ) {
            lines += '\r\n' + write_line.call( self, key, wrappedValue.slice( 0, 60 ) );
        }
    }

    (omimCodes || []).forEach( function( omim ) {
        writeLine( '5070', omim.fk5070 );
        writeLine( '5072', omim.fk5072 );
        writeLine( '5071', omim.fk5071 );
        writeLine( '5073', omim.fk5073 );
    } );

    if( 0 === lines.length ) {
        return;
    }

    return new Handlebars.SafeString( lines );
}

function adtVersion( key, quarter, year ) {
    /*jshint validthis:true */
    var quarterYear = quarter + '/' + year,
        version;
    switch( quarterYear ) {
        case '2/2021':
            version = 'ADT0421.01';
            break;
        case '1/2021':
            version = 'ADT0121.01';
            break;
        case '4/2020':
            version = 'ADT1020.01';
            break;
        case '3/2020':
            version = 'ADT0720.01';
            break;
        case '2/2020':
            version = 'ADT0420.01';
            break;
        case '1/2020':
            version = 'ADT0120.01';
            break;
        case '4/2019':
            version = 'ADT1019.01';
            break;
        case '3/2019':
            version = 'ADT0719.01';
            break;
        case '2/2019':
            version = 'ADT0419.01';
            break;
        case '1/2019':
            version = 'ADT0119.01';
            break;
        case '4/2018':
            version = 'ADT1018.01';
            break;
        case '3/2018':
            version = 'ADT0718.01';
            break;
        case '2/2018':
            version = 'ADT0418.01';
            break;
        case '1/2018':
            version = 'ADT0118.01';
            break;
        case '4/2017':
            version = 'ADT1017.01';
            break;
        case '3/2017':
            version = 'ADT0717.01';
            break;
        case '2/2017':
            version = 'ADT0417.01';
            break;
        default:
            version = 'ADT0118.01';
    }
    return write_line.call(this, key, version);
}

function invoiceIsBefore( schein, quarter, year ) {
    return Moment( `${schein.invoiceQuarter}/${schein.invoiceYear}`, 'Q/YYYY' ).isBefore( Moment( `${quarter}/${year}`, 'Q/YYYY' ) );
}

function persGroup( key, value ) {
    /*jshint validthis:true */
    if( invoiceIsBefore( this, '3', '2018' ) ) {
        return optional.call( this, key, value );
    }

    return '\r\n' + write_line.call( this, key, Y.doccirrus.kbvcommonutils.mapPersGroupToKVDT( value ) );
}

function dmp( key, value ) {
    /*jshint validthis:true */
    if( invoiceIsBefore( this, '3', '2018' ) ) {
        return optional.call( this, key, value );
    }
    return '\r\n' + write_line.call( this, key, Y.doccirrus.kbvcommonutils.mapDmpToKVDT( value ) );
}

function patientNo( key, scheinId, patientNo, createUniqCaseIdentNoOnInvoice ) {
    var value;
    if( createUniqCaseIdentNoOnInvoice ) {
        value = `${patientNo}_${scheinId}`.substring( 0, 15 );
    } else {
        value = patientNo;
    }
    return write_line.call( this, key, value );
}

function scheinReferrer( asvReferrer, scheinEstablishment, scheinRemittor ) {
    var isAsvPseudoNo, result;

    if( !scheinEstablishment || !scheinRemittor ) {
        return;
    }

    if( asvReferrer ) {
        isAsvPseudoNo = null !== Y.doccirrus.regexp.isAsvPseudoNo.exec( scheinRemittor );
        result = '\r\n' + write_line.call( this, '4226', scheinEstablishment );
        result += '\r\n' + write_line.call( this, isAsvPseudoNo ? '4249' : '4242', scheinRemittor );
    } else {
        result = '\r\n' + write_line.call( this, '4218', scheinEstablishment );
        result += '\r\n' + write_line.call( this, '4242', scheinRemittor );
    }

    return result;
}

function scheinInitiator( asvInitiator, bsnrErstveranlasserfk4218, lsnrErstveranlasserfk4241 ) {
    var isAsvPseudoNo, result;

    if( !bsnrErstveranlasserfk4218 || !lsnrErstveranlasserfk4241 ) {
        return;
    }

    if( asvInitiator ) {
        isAsvPseudoNo = null !== Y.doccirrus.regexp.isAsvPseudoNo.exec( lsnrErstveranlasserfk4241 );
        result = '\r\n' + write_line.call( this, '4225', bsnrErstveranlasserfk4218 );
        result += '\r\n' + write_line.call( this, isAsvPseudoNo ? '4248' : '4241', lsnrErstveranlasserfk4241 );
    } else {
        result = '\r\n' + write_line.call( this, '4217', bsnrErstveranlasserfk4218 );
        result += '\r\n' + write_line.call( this, '4241', lsnrErstveranlasserfk4241 );
    }

    return result;
}

//-- Registering KBV Helpers to Global --
function register(_Y, _cb){
    callback = ('function' === typeof _cb) ? _cb : callback;


    Y = _Y;

    Handlebars.registerHelper('DC', DC);
    Handlebars.registerHelper('l', write_line);
    Handlebars.registerHelper('lwb', write_line_with_break);
    Handlebars.registerHelper('d', write_date);
    Handlebars.registerHelper('gender', gender);
    Handlebars.registerHelper('diagnosisCert', diagnosisCert);
    Handlebars.registerHelper('hospitalStay', hospitalStay);
    Handlebars.registerHelper('chunk', chunk);
    Handlebars.registerHelper('o', optional);
    Handlebars.registerHelper('daySeparation', daySeparation);
    Handlebars.registerHelper('oH', optionalHeader);
    Handlebars.registerHelper('oDate', oDate);
    Handlebars.registerHelper('oTime', write_time);
    Handlebars.registerHelper('insuranceNumber', insuranceNumber);
    Handlebars.registerHelper('insuranceValidTo', insuranceValidTo);
    Handlebars.registerHelper('ifReplacement', ifReplacement);
    Handlebars.registerHelper('egkType', egkType);
    Handlebars.registerHelper('iff', iff);
    Handlebars.registerHelper('oFromTo', oFromTo);
    Handlebars.registerHelper('checkbox', checkbox);
    Handlebars.registerHelper('oOr', oOr);
    Handlebars.registerHelper('l60', l60);
    Handlebars.registerHelper('oArray', oArray);
    Handlebars.registerHelper('oDiagnosisSite', oDiagnosisSite);
    Handlebars.registerHelper('dob', dob);
    Handlebars.registerHelper('wop', wop);
    Handlebars.registerHelper('FK5035Set', FK5035Set);
    Handlebars.registerHelper('FK5020Set', FK5020Set);
    Handlebars.registerHelper('FK5042Set', FK5042Set);
    Handlebars.registerHelper('FK5036Set', FK5036Set);
    Handlebars.registerHelper('FK5012Set', FK5012Set);
    Handlebars.registerHelper('FK4235Set', FK4235Set);
    Handlebars.registerHelper('treatmentDate', treatmentDate);
    Handlebars.registerHelper('scheinDiagnosis', scheinDiagnosis);
    Handlebars.registerHelper('multiplicator', multiplicator);
    Handlebars.registerHelper('addresses', writeAddresses);
    Handlebars.registerHelper('scheinDate', scheinDate);
    Handlebars.registerHelper('officialNo', officialNo);
    Handlebars.registerHelper('omimCodes', omimCodes);
    Handlebars.registerHelper('adtVersion', adtVersion);
    Handlebars.registerHelper('persGroup', persGroup);
    Handlebars.registerHelper('dmp', dmp);
    Handlebars.registerHelper('patientNo', patientNo);
    Handlebars.registerHelper('scheinReferrer', scheinReferrer);
    Handlebars.registerHelper('scheinInitiator', scheinInitiator);
}

module.exports.register = register;

