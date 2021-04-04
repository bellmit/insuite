#!/Users/rrrw/.nvm/versions/node/v10.16.0/bin/node

const primaries = [
    'AB',
    'DO',
    'SL',
    'RS'
];

const primariesExt = [
    'BZ',
    'OKo',
    'MD'
];

const secondaries = [
    'BB',
    'MK',
    'NS',
    'RW'
];

const secondariesExt = [
    'OKl',
    'MDv',
    'MSe',
    'VL'
];


function printResult(dev, message) {
    console.log(`${message} ${dev}`);
}

function printReviewersExt(arr) {
    printResult(arr[0], 'EXTMOJ Primary:  ');
    printResult(arr[1], 'EXTMOJ Secondary:  ');
}

function printReviewers(arr) {
    printResult(arr[0], 'MOJ Primary:  ');
    printResult(arr[1], 'MOJ Secondary:  ');
}

function getRandomFromArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

let reviewersExt1 = [...primaries, ...primariesExt];
let reviewersExt2 = [...secondaries, ...secondariesExt];


console.log(`\n\nIf EXTMOJ Ticket`);
printReviewersExt([
    getRandomFromArray(reviewersExt1),
    getRandomFromArray(reviewersExt2)
]);
console.log(`\n\nIf MOJ Ticket`);
printReviewers([
    getRandomFromArray(primaries),
    getRandomFromArray(secondaries)
]);

