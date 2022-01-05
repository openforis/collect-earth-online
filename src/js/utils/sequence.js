/// Array Functions ///

export function sameContents(array1, array2) {
    return array1.every(e => array2.includes(e)) && array2.every(e => array1.includes(e));
}

export function intersection(array1, array2) {
    return array1.filter(value => array2.includes(value));
}

export function partition(array, n) {
    return array.length ? [array.splice(0, n)].concat(partition(array, n)) : [];
}

export function last(array) {
    return array[array.length - 1];
}

export function safeLength(arr) {
    return (arr || []).length;
}

export function removeAtIndex(arr, index) {
    return arr.slice(0, index).concat(arr.slice(index + 1, arr.length));
}

/// Set Functions ///

// set.delete is in place.  This function will then return the set so it can be referenced.
export function removeFromSet(set, value) {
    set.delete(value);
    return set;
}

/// Object Functions ///

// *** Note, number keys will be sent to fn as a string.

/**
 * Returns object where fn is applied to the key value pair..
 * @param {object} obj
 * @param {function(entry): entry} fn
 * @returns {object}
 **/
export function mapObject(obj, fn) {
    return Object.entries(obj).reduce((acc, cur) => {
        const [key, val] = fn(cur);
        return {...acc, [key]: val};
    }, {});
}

/**
 * Returns array where fn is applied to the key value pair..
 * @param {object} obj
 * @param {function(entry): any} fn
 * @returns {array}
 **/
export function mapObjectArray(obj, fn) {
    return Object.entries(obj).reduce((acc, cur) => [...acc, fn(cur)], []);
}

/**
 * Returns object where fn is applied to just the values.
 * @param {object} obj
 * @param {function(val): val} fn
 * @returns {object}
 **/
export function mapVals(obj, fn) {
    return Object.entries(obj).reduce((acc, cur) => ({...acc, [cur[0]]: fn(cur[1])}), {});
}

/**
 * Returns object filtered by applying the pred the key value pair.
 * Note, number keys will be sent to fn as a string.
 * @param {object} obj
 * @param {function(entry): boolean)} pred
 * @returns {object}
 **/
export function filterObject(obj, pred) {
    return Object.entries(obj).reduce((acc, cur) => (
        pred(cur)
            ? {...acc, [cur[0]]: cur[1]}
            : acc
    ), {});
}

/**
 * Returns key value pair of value that matches pred.
 * @param {object} obj
 * @param {function(entry): boolean} pred
 * @returns {entry}
 **/
export function findObject(obj, pred) {
    return Object.entries(obj).find(entry => pred(entry));
}

/**
 * Returns the first entry of an object.
 * @param {object} obj
 * @returns {entry}
 **/
export function firstEntry(obj) {
    return Object.entries(obj)[0] || [];
}

/**
 * Returns true if every val matches pred.
 * @param {object} obj
 * @param {function(entry): boolean} pred
 * @returns {boolean}
 **/
export function everyObject(obj, pred) {
    return Object.entries(obj).every(e => pred(e));
}

/**
 * Returns true if any entry matches pred.
 * @param {object} obj
 * @param {function(entry): boolean} pred
 * @returns {boolean}
 **/
export function someObject(obj, pred) {
    return Object.entries(obj).some(e => pred(e));
}

/**
 * Returns the number of key val pairs in object.
 * @param {object} obj
 * @returns {integer}
 **/
export function lengthObject(obj) {
    return Object.keys(obj).length;
}
