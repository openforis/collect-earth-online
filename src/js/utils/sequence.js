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

/**
 * Returns object where fn is applied to the key value pair. fn must take and return [key, val].
 * Note, number keys will be sent to fn as a string.
 * @param {object} obj
 * @param {function([key, val]): [key, val]} fn
 * @returns {object}
 **/
export function mapObject(obj, fn) {
    return Object.keys(obj).reduce((acc, cur) => {
        const [key, val] = fn([cur, obj[cur]]);
        return {...acc, [key]: val};
    }, {});
}

/**
 * Returns object where fn is applied to just the keys.
 * Note, number keys will be sent to fn as a string.
 * @param {object} obj
 * @param {function(key): key} fn
 * @returns {object}
 **/
export function mapKeys(obj, fn) {
    return Object.keys(obj).reduce((acc, cur) => {
        const key = fn(cur);
        return {...acc, [key]: obj[cur]};
    }, {});
}

/**
 * Returns object where fn is applied to just the values.
 * @param {object} obj
 * @param {function(val): val} fn
 * @returns {object}
 **/
export function mapVals(obj, fn) {
    return Object.keys(obj).reduce((acc, cur) => {
        const val = fn(obj[cur]);
        return {...acc, [cur]: val};
    }, {});
}

/**
 * Returns object filtered by applying the pred to just the keys.
 * Note, number keys will be sent to fn as a string.
 * @param {object} obj
 * @param {function([key, val]): boolean)} pred
 * @returns {object}
 **/
export function filterObj(obj, pred) {
    return Object.keys(obj).reduce((acc, cur) => (
        pred([cur, obj[cur]])
            ? {...acc, [cur]: obj[cur]}
            : acc
    ), {});
}

/**
 * Returns object filtered by applying the pred to just the keys.
 * Note, number keys will be sent to fn as a string.
 * @param {object} obj
 * @param {function(key): boolean} pred
 * @returns {object}
 **/
export function filterKeys(obj, pred) {
    return Object.keys(obj).reduce((acc, cur) => (
        pred(cur) ? {...acc, [cur]: obj[cur]} : acc
    ), {});
}

/**
 * Returns object filtered by applying the pred to just the values.
 * @param {object} obj
 * @param {function(val): boolean} pred
 * @returns {object}
 **/
export function filterVals(obj, pred) {
    return Object.keys(obj).reduce((acc, cur) => (
        pred(obj[cur]) ? {...acc, [cur]: obj[cur]} : acc
    ), {});
}

/**
 * Returns key of value that matches pred.
 * @param {object} obj
 * @param {function(val): boolean} pred
 * @returns {key}
 **/
export function findObjKey(obj, pred) {
    return Object.keys(obj).find(key => pred(obj[key]));
}

/**
 * Returns the value that matches pred.
 * @param {object} obj
 * @param {function(val): boolean} pred
 * @returns {val}
 **/
export function findObjVal(obj, pred) {
    const foundKey = Object.keys(obj).find(key => pred(obj[key]));
    return foundKey ? obj[foundKey] : undefined;
}
