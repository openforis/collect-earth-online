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
