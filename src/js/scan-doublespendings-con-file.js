/**
 * User: THB
 * Date: 22.03.21  08:28
 * (c) 2012, Doc Cirrus GmbH, Berlin
 */


const START_CON0 = 'con0';
const START_BESA = 'besa';
const START_RVSA = 'rvsa';
const START_ADT0 = 'adt0';
const START_ADT9 = 'adt9';
const START_CON9 = 'con9';

const protocol = {};
const toWatch5001 = [
    "03001",
    "03002", "03003", "03004", "03005", "03220", "03221", "18210", "18211",
    "18212", "18220", "18222", "08210", "08211", "08212", "08220", "08222", "08227",
    "08230", "08231", "26210", "26211", "26212", "26220", "26222", "26227", "09210",
    "09211", "09212", "09220", "09222", "09227", "04001", "04002", "04221", "04222",
    "13490", "13491", "13492", "13494", "13497"];

const contextToSave = {
    surname: '3101',
    name: '3102',
    dob: '3103',
    scheinid: '3003',
    insurenceNumber: '3105',
    patientnumber: '3000'
};

var foundDoubleSpending = false;
var detailed = true;
var lineNumber = 0;
var gpObj = { // GRUNDPAUSCHAL OBJ
    line: null,
    subBlock: []
};
var subGpObj = {
    line: null,
    subBlock: []
};
let writeToFile = true;
let context = {};


const getFkAndValue = (line) => { // FELDKENNUNG
    line = line.toString();
    return [line.substring( 3, 7 ), line.substring( 7, line.length- 2 )];
};

var file = 'src/js/Z01728888888_17.03.2021_12.31.CON'

var fileName = file.substr(0,file.length-4)


const util = require( 'util' );
const fs = require( 'fs' );
const appendFile = util.promisify( fs.appendFile );

var concatGpObjToWriteLine = (gpObj) => {
    // For one 5000 Block
    var res = '';
    if (gpObj.line){
        res = gpObj.line;
        // For every 5001 Block
        gpObj.subBlock.forEach(item => {
            res  += item.line;
            // for every Line in  5001 block
            item.subBlock.forEach((subline) => {
                res  += subline;
            });
        });

    }
    return res;
};
var filterGpObj = (gpObj) => {
    if (gpObj.subBlock.length) {
        let i;
        for (i=0; i<gpObj.subBlock.length;  i++){
            subGpObj = gpObj.subBlock[i];
            var fkAndValue1 = getFkAndValue(subGpObj.line);
            if (toWatch5001.includes( fkAndValue1[1])) {

                // error if missing context
                if( !context.name || !context.surname || !context.dob ) {
                    console.log( 'THB context without contextId', context );
                }
                let contextID = context.name + '.' + context.surname + '.' + context.dob;

                // write protocol context
                if( !protocol[contextID] ) {
                    protocol[contextID].context = context;
                    protocol[contextID].zugehoerigePauschalen = {};
                }

                // add protocol grundpauschale / zusatzpauschale OR delete lines.
                if( !protocol[contextID].zugehoerigePauschalen[fkAndValue1[1]] ) {
                    // no duplication detected

                    protocol[contextID].zugehoerigePauschalen[fkAndValue1[1]] = [{['Zeile: '+subGpObj.lineNumber]: 'Block gefunden'}];
                    // 5001 toggle :)
                } else {
                    foundDoubleSpending = true;
                    if (detailed) {
                        var details = { ['Zeile: '+subGpObj.lineNumber]:subGpObj.line.toString().substring(0,subGpObj.line.toString().length-2) },
                            lineNum = subGpObj.lineNumber;
                        for (let j=0; j<subGpObj.subBlock.length; j++){
                            details['Zeile: '+(lineNum+1+j)] = subGpObj.subBlock[j].toString().substring(0,subGpObj.subBlock[j].toString().length-2)
                        }
                        protocol[contextID].zugehoerigePauschalen[fkAndValue1[1]].push({['Zeile: '+subGpObj.lineNumber]: {state: 'Block gelöscht', deleted: details }});
                    } else {
                        protocol[contextID].zugehoerigePauschalen[fkAndValue1[1]].push({['Zeile: '+subGpObj.lineNumber]: 'Block gelöscht'});
                    }
                    // duplication detected
                    gpObj.subBlock[i].delete = true;
                }

            }

        }
        for (i=gpObj.subBlock.length-1; i>=0;  i--){
            var subBlock = gpObj.subBlock[i];
            if (subBlock.delete === true ){
                gpObj.subBlock.splice(i,1);
            }
        }
        if (!gpObj.subBlock.length){
            //delete 5000 header as well.
            gpObj.line = null;
        }
        return gpObj;
    }
};
const eachLine = function( path, iterator ) {
    let pending = false;
    return new Promise( ( resolve, reject ) => {
        let buff = Buffer.concat( [] );
        const readStream = fs.createReadStream( path );

        async function getLines() {
            let indexLineSeparator = buff.indexOf( Buffer.from( '\r\n' ) );
            if( indexLineSeparator >= 0 ) {
                indexLineSeparator += 2;
                const lineBuffer = Buffer.allocUnsafe(
                    indexLineSeparator );
                const tmp = Buffer.allocUnsafe( buff.length -
                                                indexLineSeparator );
                buff.copy( lineBuffer, 0, 0, indexLineSeparator );
                buff.copy( tmp, 0, indexLineSeparator );
                buff = tmp;
                await iterator( lineBuffer );
                return getLines();
            }
        }

        function endStream() {
            if( pending ) {
                setTimeout( endStream, 1000 );
            } else {
                resolve();
            }
        }

        readStream.on( 'data', async function( data ) {
            pending = true;
            this.pause();
            buff = Buffer.concat( [buff, data] );
            await getLines();
            this.resume();
            pending = false;
        } );

        readStream.on( 'end', endStream );
        readStream.on( 'error', function( err ) {
            reject( err );
        } );
    } );
};

async function writeLine( originalFilePath, mode, line ) {
    const targetFilePath = `${originalFilePath}${mode}`;
    return appendFile( targetFilePath, line );
}

// FÜR JEDEN PATIENTEN DARF IN EINEM QUARTAL
// PRO SATZART (SCHEIN) und PRO UNTERGRUPPE (4239)
// NUR EINMAL EINE ZP / GP NUMMER ABGERECHNET WERDEN.
// JEWAHLS DIE ÄLTESTE GEDOPPELTE GP / NP NUMMER MUSS GELÖSCHT
//WERDEN.


async function parseFile( filePath ) {
    let MODE = null;
    return eachLine( filePath, async function( line ) {
        let fkAndValue = getFkAndValue(line); // returns Feldkennung and Value of that.
        let fk5xxx =  Boolean(fkAndValue[0].match(/5\d\d\d/));
        lineNumber++;


        switch( fkAndValue[0] ) {
            case '0101': // DATENPAKETE
            case '0102':
            case '0103':
            case '0104':
                    MODE = 'schein';
                    break;
            case START_CON0:
            case START_BESA:
            case START_RVSA:
            case START_ADT0:
            case START_ADT9:
            case START_CON9:
                MODE = fkAndValue[0];
                break;
        }

        if (MODE === 'schein') {
            // build context
            for( const [key, fk] of Object.entries( contextToSave ) ) {
                if( fkAndValue[0] === fk ) {//strLine.includes( fk ) ) {

                        context[key] = fkAndValue[1]; // insert found match
                        if (context.name && context.surname && context.dob){
                            let contextID = context.name +'.'+ context.surname +'.'+ context.dob;
                            if (!protocol[contextID]){
                                protocol[contextID] = {};
                                protocol[contextID].context = context;
                                protocol[contextID].zugehoerigePauschalen = {};
                            }
                        }
                        break;
                    }
                }
            }
            // Found 5xxx

        if( fk5xxx) {
            writeToFile = false;
            if (fkAndValue[0] === '5000'){
                // create grundpausch Obj
                gpObj = {
                    lineNumber: lineNumber,
                    line: line,
                    subBlock: []
                };

            } else if (fkAndValue[0] === '5001') {

                if (subGpObj.line !== null) {
                    gpObj.subBlock.push(subGpObj);
                }

                // create new grundpauschale block
                subGpObj = {
                    lineNumber: lineNumber,
                    line: line,
                    subBlock: []
                };

            } else {
                subGpObj.subBlock.push(line);
            }


        } else {
            // no 5xxx
            if (gpObj.line !== null){
                if (subGpObj.line){
                    gpObj.subBlock.push(subGpObj);
                }

                // extend Protocol
                // filter Object
                gpObj = filterGpObj(gpObj);

               //write object to file
                line = concatGpObjToWriteLine(gpObj) + line;
                writeToFile = true;

                // reset gpObj
                subGpObj = {
                    line: null,
                    subBlock: []
                };
                gpObj = {
                    line: null,
                    subBlock: []
                };
            }


        }

        if (writeToFile) {
            return writeLine( fileName, '_da.CON', line );
        }
    } );
}

async function main() {
    // Maybe not needed on temp server dict.
    paths = [fileName+'_da.CON',fileName+'_da_protokol.json' ]
    try {
        paths.forEach((path) => {
            if (fs.existsSync(path)) {
                fs.unlinkSync(path)
            }
        })
    } catch(err) {
        console.error(err)
    }


    await parseFile( file );
    Object.keys(protocol).forEach(function(key) {
        if (Object.keys(protocol[key].zugehoerigePauschalen).length === 0){
            delete protocol[key]
        }
    });
    fs.writeFileSync(fileName+'_da_protokol.json', JSON.stringify(protocol, null, 2) , 'utf-8');


    console.log( '#THB:', util.inspect( protocol, false, null, true ))
}

main();