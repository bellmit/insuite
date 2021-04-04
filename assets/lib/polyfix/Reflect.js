/// <reference path="./es6.d.ts" />
/// <reference path="./Reflect.d.ts" />
// Harmony Reflect
// (C) 2015 Alex Mattrick. MIT License.
var hasOwnProperty = Object.prototype.hasOwnProperty;
var Reflect;
(function (Reflect) {
    // 26.1.1
    function apply(target, thisArgument, argumentsList) {
        // 1. If IsCallable(target) is false, throw a TypeError exception.
        if (!IsCallable(target)) {
            throw new TypeError(target + ' is not callable.');
        }
        // 2. Let args be CreateListFromArrayLike(argumentsList).
        var args = CreateListFromArrayLike(argumentsList);
        // 3. ReturnIfAbrupt(args)
        // 4. Perform PrepareForTailCall().
        // 5. Return Call(target, thisArgument, args)
        return target.apply(thisArgument, args);
    }
    Reflect.apply = apply;
    // 26.1.2
    function construct(target, argumentsList, newTarget) {
        // 1. If IsConstructor(target) is false, throw a TypeError exception.
        // if (!IsConstructor(target)) {
        //  throw new TypeError();
        // }
        // 2. If newTarget is not present, let newTarget be target.
        if (newTarget === void 0) { newTarget = target; }
        // 3. Else, if IsConstructor(newTarget) is false, throw a TypeError exception.
        // if (!IsConstructor(newTarget)) {
        //   throw new TypeError();
        // }
        // 4. Let args be CreateListFromArrayLike(argumentsList).
        var args = CreateListFromArrayLike(argumentsList);
        // 5. ReturnIfAbrupt(args).
        // 6. Return Construct(target, args, newTarget).
        return Construct(target, args, newTarget);
    }
    Reflect.construct = construct;
    construct.length = 2;
    // 26.1.3
    function defineProperty(target, propertyKey, attributes) {
        // 1. If Type(target) is not Object, throw a TypeError exception.
        if (typeof target !== 'object') {
            throw new TypeError();
        }
        // 2. Let key be ToPropertyKey(propertyKey).
        var key = ToPropertyKey(propertyKey);
        // 3. ReturnIfAbrupt(key).
        // 4. Let desc be ToPropertyDescriptor(attributes).
        var desc = attributes;
        // 5. ReturnIfAbrupt(desc).
        // 6. Return target.[[DefineOwnProperty]](key, desc).
        try {
            Object.defineProperty(target, key, desc);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    Reflect.defineProperty = defineProperty;
    function deleteProperty(target, propertyKey) {
        if (typeof target !== 'object') {
            throw new TypeError();
        }
        var key = ToPropertyKey(propertyKey);
        try {
            return delete target[key];
        }
        catch (e) {
            return false;
        }
    }
    Reflect.deleteProperty = deleteProperty;
    function enumerate(target) {
        if (typeof target !== 'object') {
            throw new TypeError();
        }
        var keys = [];
        for (var key_1 in target) {
            keys.push(key_1);
        }
        return createArrayIterator(keys);
    }
    Reflect.enumerate = enumerate;
    function get(target, propertyKey, receiver) {
        if (receiver === void 0) { receiver = target; }
        if (typeof target !== 'object') {
            throw new TypeError('Reflect.get: target must be an object.');
        }
        var desc = Object.getOwnPropertyDescriptor(target, propertyKey);
        if (typeof desc.get === 'function') {
            return desc.get.call(receiver);
        }
        else {
            return target[propertyKey];
        }
    }
    Reflect.get = get;
    get.length = 2;
    function getOwnPropertyDescriptor(target, propertyKey) {
        if (typeof target !== 'object') {
            throw new TypeError();
        }
        var key = ToPropertyKey(propertyKey);
        // let desc = GetOwnProperty(target, key);
        return Object.getOwnPropertyDescriptor(target, key);
    }
    Reflect.getOwnPropertyDescriptor = getOwnPropertyDescriptor;
    function getPrototypeOf(target) {
        if (typeof target !== 'object') {
            throw new TypeError();
        }
        return Object.getPrototypeOf(target);
    }
    Reflect.getPrototypeOf = getPrototypeOf;
    function has(target, propertyKey) {
        if (typeof target !== 'object') {
            throw new TypeError();
        }
        var key = ToPropertyKey(propertyKey);
        return HasProperty(target, key);
    }
    Reflect.has = has;
    function isExtensible(target) {
        if (typeof target !== 'object') {
            throw new TypeError();
        }
        return Object.isExtensible(target);
    }
    Reflect.isExtensible = isExtensible;
    function ownKeys(target) {
        if (typeof target !== 'object') {
            throw new TypeError();
        }
        var keys = OwnPropertyKeys(target);
        return CreateListFromArrayLike(keys);
    }
    Reflect.ownKeys = ownKeys;
    function preventExtensions(target) {
        if (typeof target !== 'object') {
            throw new TypeError();
        }
        try {
            Object.preventExtensions(target);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    Reflect.preventExtensions = preventExtensions;
    function set(target, propertyKey, value, receiver) {
        if (receiver === void 0) { receiver = target; }
        if (typeof target !== 'object') {
            throw new TypeError();
        }
        var key = ToPropertyKey(propertyKey);
        try {
            target[key] = value;
            return true;
        }
        catch (e) {
            return false;
        }
    }
    Reflect.set = set;
    set.length = 3;
    function setPrototypeOf(target, proto) {
        if (typeof target !== 'object') {
            throw new TypeError();
        }
        if (typeof proto !== 'object' && proto !== null) {
            throw new TypeError();
        }
        try {
            if (typeof Object.setPrototypeOf === 'function') {
                Object.setPrototypeOf(target, proto);
            }
            else {
                target.__proto__ = proto;
            }
            return true;
        }
        catch (e) {
            return false;
        }
    }
    Reflect.setPrototypeOf = setPrototypeOf;
})(Reflect || (Reflect = {}));
;
var context = typeof global !== 'undefined' ? global : window;
if (typeof context.Reflect !== 'object') {
    context.Reflect = Reflect;
}
else {
    for (var key in Reflect) {
        if (Reflect.hasOwnProperty(key) && typeof context.Reflect[key] === 'undefined') {
            context.Reflect[key] = Reflect[key];
        }
    }
}
// Specs Internal Methods
// 7.2.3 IsCallable (argument)
function IsCallable(obj) {
    return (typeof obj !== 'object') && (typeof obj.call === 'function');
}
// 7.3.17 CreateListFromArrayLike (obj [, elementTypes])
var defaultElementTypes = ['undefined', 'null', 'boolean', 'string', 'symbol', 'number', 'object'];
function CreateListFromArrayLike(obj, elementTypes) {
    if (elementTypes === void 0) { elementTypes = defaultElementTypes; }
    if (typeof obj !== 'object') {
        throw new TypeError();
    }
    var len = Number(obj.length);
    var list = [], index = 0;
    while (index < len) {
        var indexName = ToString(index);
        var next = obj[indexName];
        if (elementTypes.indexOf(Type(next)) === -1) {
            throw new TypeError();
        }
        list.push(next);
        index++;
    }
    return list;
}
function Type(obj) {
    return (obj === null) ? 'null' : typeof obj;
}
// 7.1.12 ToString
function ToString(arg) {
    if (typeof arg === 'symbol') {
        throw new TypeError();
    }
    else {
        return String(arg);
    }
}
function Construct(F, argumentsList, newTarget) {
    if (argumentsList === void 0) { argumentsList = []; }
    if (newTarget === void 0) { newTarget = F; }
    // assert(IsConstructor(F));
    // assert(IsConstructor(newTarget));
    return new ((_a = Function.prototype.bind).call.apply(_a, [F, newTarget].concat(argumentsList)));
    var _a;
}
function assert(condition) {
    if (!condition)
        throw new Error();
}
// 7.1.14
function ToPropertyKey(arg) {
    return (typeof arg === 'symbol') ? arg : String(arg);
}
// 7.2.7
function IsPropertyKey(arg) {
    return (typeof arg === 'string' || typeof arg === 'symbol');
}
// 7.3.10
function HasProperty(O, P) {
    assert(Type(O) === 'object');
    assert(IsPropertyKey(P));
    return P in O;
}
// 9.1.12 [[]]
function OwnPropertyKeys(obj) {
    var keys = [];
    var propertyNames = Object.getOwnPropertyNames(obj);
    for (var P = 0; propertyNames.indexOf(String(P)) !== -1; P++) {
        keys.push(P);
    }
    keys = keys.concat(propertyNames.filter(function (name) { return isNaN(Number(name)); }));
    if (typeof Object.getOwnPropertySymbols === 'function') {
        keys = keys.concat(Object.getOwnPropertySymbols(obj));
    }
    return keys;
}
function createArrayIterator(arr) {
    var index = 0;
    return (_a = {},
        _a[Symbol.iterator] = function () {
            return this;
        },
        _a.next = function () {
            if (index < arr.length) {
                return { done: false, value: arr[index++] };
            }
            else {
                return { done: true };
            }
        },
        _a
    );
    var _a;
}
